import React, { useState } from 'react';
import { api } from '../../services/api';
import { ResolveSongItem, SongSearchResult } from '../../types';
import {
  Upload,
  Youtube,
  FileSpreadsheet,
  Check,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  CheckSquare,
  Music,
  ExternalLink,
  Library,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  hostToken: string;
  onDeckUpdated: () => void;
}

export const ImportPlaylistModal: React.FC<ImportPlaylistModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  hostToken,
  onDeckUpdated,
}) => {
  const [importMode, setImportMode] = useState<'SMART_RESOLVER' | 'PLAYLIST_URL' | 'CSV_URLS'>('SMART_RESOLVER');

  // Smart Resolver State
  const [resolverInput, setResolverInput] = useState('');
  const [resolverStep, setResolverStep] = useState<'INPUT' | 'REVIEW'>('INPUT');
  const [autoSelectFirst, setAutoSelectFirst] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvedItems, setResolvedItems] = useState<ResolveSongItem[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [saveToLibraryMode, setSaveToLibraryMode] = useState(false);
  const [librarySetName, setLibrarySetName] = useState('');

  // Playlist URL state
  const [playlistUrl, setPlaylistUrl] = useState('');

  // CSV state
  const [csvContent, setCsvContent] = useState('');

  // Common state
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ----------------------------------------------------
  // SMART RESOLVER HANDLERS
  // ----------------------------------------------------
  const handleResolveBatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!resolverInput.trim()) return;

    setIsResolving(true);
    setError(null);
    setSuccessMessage(null);

    const lines = resolverInput
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    if (lines.length === 0) {
      setError('Please provide at least one song title, search query, or YouTube URL.');
      setIsResolving(false);
      return;
    }

    try {
      const results = await api.resolveSongBatch(lines, autoSelectFirst);
      setResolvedItems(results);

      // Select all items that have a selectedMatch by default
      const initialSelected = new Set<string>();
      results.forEach((item) => {
        if (item.selectedMatch) {
          initialSelected.add(item.id);
        }
      });
      setSelectedItemIds(initialSelected);
      setResolverStep('REVIEW');
    } catch (err: any) {
      setError(err.message || 'Failed to resolve songs. Please check your query list.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSelectCandidate = (itemId: string, candidate: SongSearchResult) => {
    setResolvedItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            selectedMatch: candidate,
            status: 'AUTO_RESOLVED',
            confidence: 'HIGH',
            userSelected: true,
            notes: 'User selected match',
          };
        }
        return item;
      })
    );
    setSelectedItemIds((prev) => new Set(prev).add(itemId));
    setExpandedItemId(null);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set<string>();
    resolvedItems.forEach((item) => {
      if (item.selectedMatch) all.add(item.id);
    });
    setSelectedItemIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedItemIds(new Set());
  };

  const handleAutoResolveAll = () => {
    setResolvedItems((prev) =>
      prev.map((item) => {
        if (!item.selectedMatch && item.candidates.length > 0) {
          return {
            ...item,
            selectedMatch: item.candidates[0],
            status: 'AUTO_RESOLVED',
            confidence: 'MEDIUM',
            notes: 'Auto-picked #1 match',
          };
        }
        return item;
      })
    );
    const all = new Set<string>();
    resolvedItems.forEach((item) => {
      if (item.selectedMatch || item.candidates.length > 0) all.add(item.id);
    });
    setSelectedItemIds(all);
  };

  const handleImportResolvedTracks = async () => {
    const tracksToImport = resolvedItems
      .filter((item) => selectedItemIds.has(item.id) && item.selectedMatch)
      .map((item) => ({
        title: item.selectedMatch!.title,
        artist: item.selectedMatch!.channelTitle,
        videoId: item.selectedMatch!.videoId,
        durationSeconds: item.selectedMatch!.durationSeconds,
        startSeconds: 0,
        notes: item.originalInput,
      }));

    if (tracksToImport.length === 0) {
      setError('Please select at least one resolved song to import.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      if (saveToLibraryMode && librarySetName.trim()) {
        await api.importResolvedIntoLibrary(librarySetName.trim(), tracksToImport);
        setSuccessMessage(`Saved ${tracksToImport.length} tracks to DJ Library set "${librarySetName.trim()}"!`);
      } else {
        await api.importResolvedTracks(roomCode, hostToken, tracksToImport, replaceExisting);
        setSuccessMessage(`Imported ${tracksToImport.length} resolved tracks to your DJ Deck!`);
        onDeckUpdated();
      }

      setTimeout(() => {
        onClose();
        resetResolverState();
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Failed to import tracks into deck.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetResolverState = () => {
    setResolverStep('INPUT');
    setResolvedItems([]);
    setSelectedItemIds(new Set());
    setExpandedItemId(null);
    setPreviewVideoId(null);
    setSuccessMessage(null);
    setError(null);
  };

  const handlePasteSampleList = () => {
    setResolverInput(
      `https://www.youtube.com/results?search_query=Its+The+Time+To+Disco+official\n` +
      `Dua Lipa - Levitating (Official Music Video)\n` +
      `https://youtu.be/4NRXx6U8ABQ\n` +
      `https://www.youtube.com/results?search_query=Gallan+Goodiyaan+Dil+Dhadakne+Do\n` +
      `Queen – Bohemian Rhapsody (Official Video)`
    );
  };

  // ----------------------------------------------------
  // PLAYLIST URL & CSV HANDLERS
  // ----------------------------------------------------
  const handleImportPlaylistUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;

    setIsImporting(true);
    setError(null);

    try {
      const imported = await api.importYouTubePlaylist(
        roomCode,
        hostToken,
        playlistUrl.trim(),
        replaceExisting
      );
      setSuccessMessage(`Successfully imported ${imported.length} tracks from playlist!`);
      onDeckUpdated();
      setTimeout(() => {
        onClose();
        setPlaylistUrl('');
        setSuccessMessage(null);
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Failed to import YouTube playlist. Check URL or privacy.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setIsImporting(true);
    setError(null);

    try {
      const imported = await api.importYouTubeCsv(
        roomCode,
        hostToken,
        csvContent.trim(),
        replaceExisting
      );
      setSuccessMessage(`Successfully imported ${imported.length} tracks from CSV!`);
      onDeckUpdated();
      setTimeout(() => {
        onClose();
        setCsvContent('');
        setSuccessMessage(null);
      }, 1600);
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV tracks.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
      }
    };
    reader.readAsText(file);
  };

  // Summary counts
  const selectedCount = selectedItemIds.size;
  const autoResolvedCount = resolvedItems.filter((i) => i.status === 'AUTO_RESOLVED').length;
  const needsSelectionCount = resolvedItems.filter((i) => i.status === 'NEEDS_SELECTION').length;
  const totalDurationSeconds = resolvedItems
    .filter((i) => selectedItemIds.has(i.id) && i.selectedMatch)
    .reduce((acc, curr) => acc + (curr.selectedMatch?.durationSeconds || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between bg-gradient-to-r from-dj-card via-dj-surface to-dj-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-red-500/30 text-red-400">
              <Sparkles className="w-5 h-5 text-dj-cyan animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                Import & Resolve Tracks
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-dj-cyan/15 text-dj-cyan border border-dj-cyan/30">
                  Smart DJ Tools
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Resolve YouTube search query URLs, song names, playlists or bulk track lists
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 pt-3 pb-2 border-b border-dj-border/60 bg-dj-card/40 flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => {
              setImportMode('SMART_RESOLVER');
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              importMode === 'SMART_RESOLVER'
                ? 'bg-gradient-to-r from-dj-cyan to-blue-500 text-black font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Smart Song List & Search URLs
          </button>
          <button
            onClick={() => {
              setImportMode('PLAYLIST_URL');
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              importMode === 'PLAYLIST_URL'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Youtube className="w-3.5 h-3.5" /> YouTube Playlist URL
          </button>
          <button
            onClick={() => {
              setImportMode('CSV_URLS');
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              importMode === 'CSV_URLS'
                ? 'bg-slate-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV / Raw URLs
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Error / Success Feedback */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-dj-emerald/15 border border-dj-emerald/40 rounded-xl text-xs text-dj-emerald font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 1: SMART SONG RESOLVER & LIST                             */}
          {/* ============================================================== */}
          {importMode === 'SMART_RESOLVER' && (
            <div className="space-y-4">
              {resolverStep === 'INPUT' ? (
                /* Step 1: Input list */
                <form onSubmit={handleResolveBatch} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-dj-cyan" />
                      Paste Search URLs, Song Titles, or Video Links
                    </label>
                    <button
                      type="button"
                      onClick={handlePasteSampleList}
                      className="text-[11px] font-bold text-dj-cyan hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Paste Example List
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={7}
                      required
                      value={resolverInput}
                      onChange={(e) => setResolverInput(e.target.value)}
                      placeholder={`Paste YouTube search URLs or song names (one per line):\nhttps://www.youtube.com/results?search_query=Its+The+Time+To+Disco+official\nDua Lipa - Levitating (Official Music Video)\nhttps://youtu.be/4NRXx6U8ABQ\nQueen - Bohemian Rhapsody`}
                      className="w-full px-3.5 py-3 bg-dj-card border border-dj-border rounded-2xl text-xs text-white focus:outline-none focus:border-dj-cyan font-mono leading-relaxed"
                    />
                  </div>

                  {/* Feature description pills */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-[11px] text-slate-400">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-dj-cyan" /> How the Smart Resolver Works:
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                      <li className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-dj-cyan flex-shrink-0" />
                        <span>Resolves <code className="text-dj-cyan">results?search_query=...</code> directly</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-dj-cyan flex-shrink-0" />
                        <span>Auto-selects #1 match or lets you choose</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-dj-cyan flex-shrink-0" />
                        <span>Supports plain song titles & artists</span>
                      </li>
                      <li className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-dj-cyan flex-shrink-0" />
                        <span>Fetches accurate titles, thumbnails & durations</span>
                      </li>
                    </ul>
                  </div>

                  {/* Auto-resolve toggle */}
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 bg-dj-card p-3 rounded-xl border border-dj-border">
                    <input
                      type="checkbox"
                      checked={autoSelectFirst}
                      onChange={(e) => setAutoSelectFirst(e.target.checked)}
                      className="rounded border-slate-700 text-dj-cyan focus:ring-0"
                    />
                    <div>
                      <span className="font-bold text-white block">Auto-select #1 Best Result</span>
                      <span className="text-[10px] text-slate-400">
                        Automatically picks top match for high confidence queries. You can review and switch to other candidates anytime.
                      </span>
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={isResolving || !resolverInput.trim()}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-dj-cyan to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isResolving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-black" /> Searching & Resolving Songs...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" /> Resolve Songs & Review Results
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step 2: Interactive Review & Selection */
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="p-3 rounded-2xl bg-dj-card border border-dj-border flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {resolvedItems.length} Tracks Detected
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-dj-emerald/15 text-dj-emerald border border-dj-emerald/30">
                        {selectedCount} Selected
                      </span>
                      {needsSelectionCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {needsSelectionCount} Needs Choice
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">
                        ~{formatDuration(totalDurationSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={handleAutoResolveAll}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
                      >
                        Auto-Pick #1
                      </button>
                      <button
                        type="button"
                        onClick={selectedCount === resolvedItems.length ? handleDeselectAll : handleSelectAll}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[11px] font-bold transition-colors"
                      >
                        {selectedCount === resolvedItems.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResolverStep('INPUT')}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-dj-cyan text-[11px] font-bold transition-colors"
                      >
                        Edit Input
                      </button>
                    </div>
                  </div>

                  {/* List of Resolved Items */}
                  <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                    {resolvedItems.map((item, index) => {
                      const isSelected = selectedItemIds.has(item.id);
                      const isExpanded = expandedItemId === item.id;
                      const hasMatch = !!item.selectedMatch;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border transition-all overflow-hidden ${
                            isSelected
                              ? 'bg-dj-card border-dj-cyan/40 shadow-lg'
                              : 'bg-dj-card/60 border-dj-border opacity-70'
                          }`}
                        >
                          {/* Main Row */}
                          <div className="p-3 flex items-start gap-3">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleItemSelection(item.id)}
                              className="mt-1 text-slate-400 hover:text-white"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-dj-cyan" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-600" />
                              )}
                            </button>

                            {/* Thumbnail */}
                            <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-black flex-shrink-0 border border-white/10">
                              {hasMatch ? (
                                <img
                                  src={item.selectedMatch!.thumbnailUrl}
                                  alt={item.selectedMatch!.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                  <Music className="w-5 h-5" />
                                </div>
                              )}
                              {hasMatch && (
                                <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white">
                                  {formatDuration(item.selectedMatch!.durationSeconds)}
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                                <span className="text-[10px] font-mono text-slate-500">#{index + 1}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                                  {item.inputType === 'SEARCH_URL'
                                    ? 'YouTube Search URL'
                                    : item.inputType === 'DIRECT_VIDEO'
                                    ? 'Direct Video'
                                    : 'Song Title'}
                                </span>

                                {item.status === 'AUTO_RESOLVED' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-dj-emerald/15 text-dj-emerald border border-dj-emerald/30 flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Auto-Resolved
                                  </span>
                                )}
                                {item.status === 'NEEDS_SELECTION' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-0.5">
                                    <AlertCircle className="w-2.5 h-2.5" /> Select Match
                                  </span>
                                )}
                                {item.status === 'NO_MATCH' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                                    No Match
                                  </span>
                                )}
                              </div>

                              {hasMatch ? (
                                <>
                                  <h4 className="text-xs font-bold text-white truncate" title={item.selectedMatch!.title}>
                                    {item.selectedMatch!.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-400 truncate">
                                    {item.selectedMatch!.channelTitle}
                                  </p>
                                </>
                              ) : (
                                <p className="text-xs text-red-300 font-bold truncate">
                                  No YouTube match found for: "{item.parsedQuery}"
                                </p>
                              )}

                              <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5" title={item.originalInput}>
                                Query: {item.parsedQuery}
                              </p>
                            </div>

                            {/* Candidate chooser button */}
                            {item.candidates.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all flex-shrink-0 ${
                                  isExpanded
                                    ? 'bg-dj-cyan text-black'
                                    : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                                }`}
                              >
                                <span>{item.candidates.length} Matches</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          {/* Candidate Drawer */}
                          {isExpanded && item.candidates.length > 0 && (
                            <div className="p-3 bg-black/60 border-t border-dj-border/60 space-y-2">
                              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
                                <span>Select best match from YouTube results:</span>
                                <span className="text-[10px] text-slate-500">Click to assign</span>
                              </div>

                              <div className="grid grid-cols-1 gap-1.5">
                                {item.candidates.map((cand, cIdx) => {
                                  const isCandSelected = item.selectedMatch?.videoId === cand.videoId;
                                  return (
                                    <div
                                      key={cand.videoId}
                                      onClick={() => handleSelectCandidate(item.id, cand)}
                                      className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                                        isCandSelected
                                          ? 'bg-dj-cyan/15 border-dj-cyan text-white shadow-md'
                                          : 'bg-dj-card/40 border-white/5 hover:bg-white/5 text-slate-300'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="relative w-12 h-9 rounded-lg overflow-hidden bg-black flex-shrink-0">
                                          <img
                                            src={cand.thumbnailUrl}
                                            alt={cand.title}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <h5 className="text-[11px] font-bold truncate">{cand.title}</h5>
                                            {cIdx === 0 && (
                                              <span className="text-[8px] font-extrabold px-1 rounded bg-dj-cyan/20 text-dj-cyan">
                                                #1 Best Match
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-slate-400 truncate">
                                            {cand.channelTitle} • {formatDuration(cand.durationSeconds)}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewVideoId(previewVideoId === cand.videoId ? null : cand.videoId);
                                          }}
                                          className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white"
                                          title="Preview on YouTube"
                                        >
                                          <Play className="w-3 h-3" />
                                        </button>
                                        {isCandSelected ? (
                                          <span className="text-[10px] font-extrabold text-dj-cyan flex items-center gap-0.5">
                                            <Check className="w-3 h-3" /> Selected
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-400 hover:text-white">
                                            Pick
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Audio Preview Frame */}
                  {previewVideoId && (
                    <div className="p-2.5 rounded-2xl bg-black/80 border border-dj-cyan/40 flex items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs text-dj-cyan font-bold">
                        <Volume2 className="w-4 h-4 animate-pulse" />
                        <span>Previewing Video ({previewVideoId})</span>
                      </div>
                      <iframe
                        src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1`}
                        title="Preview"
                        className="w-40 h-10 rounded-lg"
                        allow="autoplay"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviewVideoId(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Destination Options */}
                  <div className="p-3 rounded-2xl bg-dj-card border border-dj-border space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={replaceExisting}
                          onChange={(e) => setReplaceExisting(e.target.checked)}
                          className="rounded border-slate-700 text-dj-cyan focus:ring-0"
                        />
                        <span>Replace current DJ Deck (if unchecked, appends to end)</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setSaveToLibraryMode(!saveToLibraryMode)}
                        className={`text-xs font-bold flex items-center gap-1 transition-colors ${
                          saveToLibraryMode ? 'text-dj-cyan' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Library className="w-3.5 h-3.5" />
                        {saveToLibraryMode ? 'Saving to Library' : 'Save to Library Set instead'}
                      </button>
                    </div>

                    {saveToLibraryMode && (
                      <div className="pt-2 border-t border-white/5">
                        <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                          DJ Library Set Name
                        </label>
                        <input
                          type="text"
                          value={librarySetName}
                          onChange={(e) => setLibrarySetName(e.target.value)}
                          placeholder="e.g. Disco Classics & Party Anthems"
                          className="w-full px-3 py-2 bg-black/40 border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan"
                        />
                      </div>
                    )}
                  </div>

                  {/* Import CTA Button */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResolverStep('INPUT')}
                      className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleImportResolvedTracks}
                      disabled={isImporting || selectedCount === 0}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-dj-cyan to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-black" /> Importing Tracks...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-black" />
                          {saveToLibraryMode
                            ? `Save ${selectedCount} Tracks to DJ Library`
                            : `Add ${selectedCount} Tracks to DJ Deck`}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: YOUTUBE PLAYLIST URL                                   */}
          {/* ============================================================== */}
          {importMode === 'PLAYLIST_URL' && (
            <form onSubmit={handleImportPlaylistUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  YouTube Playlist URL or Playlist ID
                </label>
                <input
                  type="text"
                  required
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  placeholder="e.g. https://www.youtube.com/playlist?list=PLrEnWoR732-BHrPp_pm8..."
                  className="w-full px-3.5 py-2.5 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-red-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports public or unlisted YouTube playlists up to 50 tracks.
                </p>
              </div>

              {/* Replace toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 bg-dj-card p-3 rounded-xl border border-dj-border">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-700 text-red-500 focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Replace current DJ Deck</span>
                  <span className="text-[10px] text-slate-400">
                    If unchecked, imported tracks will be appended to the end of your current deck.
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isImporting || !playlistUrl.trim()}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Fetching Playlist Tracks...
                  </>
                ) : (
                  <>
                    <Youtube className="w-4 h-4" /> Import YouTube Playlist
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CSV OF YOUTUBE URLS                                    */}
          {/* ============================================================== */}
          {importMode === 'CSV_URLS' && (
            <form onSubmit={handleImportCsv} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Paste CSV Content or Upload .csv File
                  </label>
                  <label className="text-xs text-dj-cyan font-bold hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Choose .csv file
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <textarea
                  rows={6}
                  required
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder={`https://www.youtube.com/watch?v=F57P9C4SAW4\nhttps://youtu.be/4NRXx6U8ABQ\nTitle, Artist, https://www.youtube.com/watch?v=TUVcZfQe-Kw`}
                  className="w-full px-3.5 py-2.5 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan font-mono"
                />
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-slate-400 space-y-1">
                  <p className="font-bold text-slate-300">Accepted Formats:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                    <li>One YouTube URL per line (video links or search URLs)</li>
                    <li>Spreadsheet CSV with columns: <code className="text-dj-cyan">Title, Artist, YouTube URL</code></li>
                    <li>Shortlinks like <code className="text-dj-cyan">https://youtu.be/...</code> or video IDs</li>
                  </ul>
                </div>
              </div>

              {/* Replace toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 bg-dj-card p-3 rounded-xl border border-dj-border">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-slate-700 text-dj-cyan focus:ring-0"
                />
                <div>
                  <span className="font-bold text-white block">Replace current DJ Deck</span>
                  <span className="text-[10px] text-slate-400">
                    If unchecked, imported CSV tracks will be appended to the end of your current deck.
                  </span>
                </div>
              </label>

              <button
                type="submit"
                disabled={isImporting || !csvContent.trim()}
                className="w-full py-3 rounded-2xl bg-dj-cyan hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Resolving & Importing Tracks...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Import CSV to DJ Deck
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
