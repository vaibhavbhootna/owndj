import React, { useState } from 'react';
import { api } from '../../services/api';
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
  const [importMode, setImportMode] = useState<'PLAYLIST_URL' | 'CSV_URLS'>('PLAYLIST_URL');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleImportPlaylistUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playlistUrl.trim()) return;

    setIsImporting(true);
    setError(null);
    setSuccessCount(null);

    try {
      const imported = await api.importYouTubePlaylist(
        roomCode,
        hostToken,
        playlistUrl.trim(),
        replaceExisting
      );
      setSuccessCount(imported.length);
      onDeckUpdated();
      setTimeout(() => {
        onClose();
        setPlaylistUrl('');
        setSuccessCount(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to import YouTube playlist. Check the URL and privacy settings.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) return;

    setIsImporting(true);
    setError(null);
    setSuccessCount(null);

    try {
      const imported = await api.importYouTubeCsv(
        roomCode,
        hostToken,
        csvContent.trim(),
        replaceExisting
      );
      setSuccessCount(imported.length);
      onDeckUpdated();
      setTimeout(() => {
        onClose();
        setCsvContent('');
        setSuccessCount(null);
      }, 1800);
    } catch (err: any) {
      setError(err.message || 'Failed to import CSV tracks. Ensure lines contain valid YouTube URLs.');
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

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500">
              <Youtube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Import to DJ Deck</h3>
              <p className="text-xs text-slate-400">
                Load a YouTube Playlist or CSV of YouTube URLs into your event deck
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
        <div className="px-5 pt-3 pb-2 border-b border-dj-border/60 bg-dj-card/40 flex items-center gap-2">
          <button
            onClick={() => {
              setImportMode('PLAYLIST_URL');
              setError(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              importMode === 'CSV_URLS'
                ? 'bg-dj-cyan text-black font-extrabold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV of YouTube URLs
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Error / Success Feedback */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3 bg-dj-emerald/15 border border-dj-emerald/40 rounded-xl text-xs text-dj-emerald font-bold flex items-center gap-2 animate-fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Successfully imported {successCount} tracks into your DJ Deck!</span>
            </div>
          )}

          {/* Mode 1: YouTube Playlist URL */}
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

          {/* Mode 2: CSV of YouTube URLs */}
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
                  <p className="font-bold text-slate-300">Accepted CSV Formats:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                    <li>One YouTube URL per line (titles automatically fetched from YouTube)</li>
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
                className="w-full py-3 rounded-2xl bg-dj-cyan hover:bg-cyan-400 text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 glow-cyan"
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
