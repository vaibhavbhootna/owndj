import React, { useState, useEffect, useRef } from 'react';
import { EventDJTrack, SongSearchResult } from '../../types';
import { api } from '../../services/api';
import { UniversalSearchModal } from './UniversalSearchModal';
import { ImportPlaylistModal } from './ImportPlaylistModal';
import {
  ListMusic,
  Plus,
  Play,
  Trash2,
  Shuffle,
  Star,
  Clock,
  Sliders,
  Download,
  Upload,
  BookOpen,
  Save,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Search,
  X,
  Volume2,
  Youtube,
  ArrowUp,
  ArrowDown,
  Target,
} from 'lucide-react';

interface DJDeckManagerProps {
  roomCode: string;
  hostToken: string;
  deck: EventDJTrack[];
  onDeckUpdated: () => void;
  onOpenLibrary: () => void;
  currentTrackId?: string;
  currentPosition?: number;
  onSeek?: (seconds: number) => void;
  defaultSongDurationSeconds?: number;
  onUpdateDefaultSwitchTime?: (seconds: number) => void;
}

export const DJDeckManager: React.FC<DJDeckManagerProps> = ({
  roomCode,
  hostToken,
  deck,
  onDeckUpdated,
  onOpenLibrary,
  currentTrackId,
  currentPosition = 0,
  onSeek,
  defaultSongDurationSeconds = 60,
  onUpdateDefaultSwitchTime,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUniversalSearchOpen, setIsUniversalSearchOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeCueEditId, setActiveCueEditId] = useState<string | null>(null);
  const [cueStartTime, setCueStartTime] = useState<number>(0);
  const [cueDuration, setCueDuration] = useState<number>(60);
  const [bulkDurationSuccess, setBulkDurationSuccess] = useState<string | null>(null);

  // Playlist Scroll and Auto-Follow references
  const playingTrackRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScrollToPlaying, setAutoScrollToPlaying] = useState(true);

  // Auto-scroll to currently playing track in playlist
  useEffect(() => {
    if (autoScrollToPlaying && currentTrackId && playingTrackRef.current) {
      playingTrackRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTrackId, autoScrollToPlaying]);

  const scrollToPlayingTrack = () => {
    if (playingTrackRef.current) {
      playingTrackRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  };

  const currentPlayingIndex = deck.findIndex(
    (t) => t.playbackStatus === 'PLAYING' || currentTrackId === t.id
  );

  // Search songs for adding to deck
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await api.searchSongs(searchQuery.trim());
      setSearchResults(results);
    } catch (err) {
      console.warn('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddTrack = async (song: SongSearchResult) => {
    try {
      await api.addDeckTrack(roomCode, hostToken, {
        title: song.title,
        artist: song.channelTitle,
        sourceType: song.sourceType || 'YOUTUBE',
        sourceIdentifier: song.videoId,
        durationSeconds: song.durationSeconds,
        startSeconds: 0,
        transitionType: 'CROSSFADE',
        transitionDurationSeconds: 5,
        isFavorite: false,
      });
      onDeckUpdated();
      setIsAddModalOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.warn('Failed to add track to deck:', err);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    try {
      await api.removeDeckTrack(roomCode, trackId, hostToken);
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to remove track:', err);
    }
  };

  const handleToggleFavorite = async (track: EventDJTrack) => {
    try {
      await api.updateDeckTrack(roomCode, track.id, hostToken, {
        isFavorite: !track.isFavorite,
      });
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to toggle favorite:', err);
    }
  };

  const handleSaveCuePoint = async (trackId: string) => {
    try {
      await api.updateDeckTrack(roomCode, trackId, hostToken, {
        startSeconds: cueStartTime,
        durationSeconds: cueDuration,
      });
      setActiveCueEditId(null);
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to update cue point:', err);
    }
  };

  const handleApplySwitchTimeToAll = async (durationSecs: number) => {
    try {
      await api.setDeckDurationAll(roomCode, hostToken, durationSecs);
      onUpdateDefaultSwitchTime?.(durationSecs);
      setBulkDurationSuccess(`Applied ${durationSecs === 0 ? 'Full Song' : `${durationSecs}s`} switch time to all tracks!`);
      setTimeout(() => setBulkDurationSuccess(null), 3000);
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to apply duration to all tracks:', err);
    }
  };

  const handleMoveTrack = async (index: number, direction: 'UP' | 'DOWN') => {
    const newIndex = direction === 'UP' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= deck.length) return;

    const copy = [...deck];
    const [moved] = copy.splice(index, 1);
    copy.splice(newIndex, 0, moved);

    try {
      await api.reorderDeck(roomCode, hostToken, copy.map((t) => t.id));
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to reorder deck:', err);
    }
  };

  const handleShuffleDeck = async () => {
    try {
      await api.shuffleDeck(roomCode, hostToken);
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to shuffle deck:', err);
    }
  };

  const handlePlayNow = async (trackId: string) => {
    try {
      await api.playDeckTrackNow(roomCode, trackId, hostToken);
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to play track now:', err);
    }
  };

  const handleSaveAsMasterSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveSetName.trim()) return;
    try {
      await api.saveDeckAsPlaylist(roomCode, hostToken, saveSetName.trim());
      setIsSavingSet(false);
      setSaveSetName('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.warn('Failed to save set:', err);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const totalRuntimeSeconds = deck.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const unplayedCount = deck.filter((t) => t.playbackStatus === 'UNPLAYED').length;

  return (
    <div className="flex flex-col h-full bg-dj-surface rounded-2xl border border-dj-border overflow-hidden">
      {/* Header & Controls Toolbar */}
      <div className="p-4 border-b border-dj-border bg-dj-card/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-dj-cyan/10 border border-dj-cyan/30 text-dj-cyan">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              DJ Deck
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-dj-cyan/20 text-dj-cyan border border-dj-cyan/30">
                Default Source
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {deck.length} tracks • Total: {formatTime(totalRuntimeSeconds)} • {unplayedCount} unplayed
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Universal Search */}
          <button
            onClick={() => setIsUniversalSearchOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-600/30 border border-purple-500/50 text-purple-200 font-bold text-xs flex items-center gap-1.5 hover:bg-purple-600 hover:text-white transition-all shadow-md"
            title="Search across this Deck, DJ Library, Local MP3s, and YouTube"
          >
            <Search className="w-3.5 h-3.5 text-purple-300" /> Universal Search
          </button>

          {/* Import YouTube Playlist or CSV */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:border-red-500 hover:text-white transition-all"
            title="Import YouTube Playlist or CSV with YouTube URLs"
          >
            <Youtube className="w-3.5 h-3.5 text-red-400" /> Import YouTube / CSV
          </button>

          {/* Add Track */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-dj-cyan text-black font-bold text-xs flex items-center gap-1.5 glow-cyan hover:scale-105 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Add Song
          </button>

          {/* Load from Library */}
          <button
            onClick={onOpenLibrary}
            className="px-3 py-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-300 font-semibold text-xs flex items-center gap-1.5 hover:border-dj-cyan hover:text-white transition-all"
            title="Browse & load pre-made DJ Sets"
          >
            <BookOpen className="w-4 h-4 text-dj-cyan" /> DJ Library
          </button>

          {/* Shuffle */}
          <button
            onClick={handleShuffleDeck}
            disabled={unplayedCount <= 1}
            className="p-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-400 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40"
            title="Shuffle unplayed tracks"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Save as Reusable Set */}
          <button
            onClick={() => setIsSavingSet(true)}
            disabled={deck.length === 0}
            className="p-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-400 hover:text-dj-emerald hover:border-dj-emerald transition-colors disabled:opacity-40"
            title="Save current deck to DJ Library as a reusable set"
          >
            <Save className="w-4 h-4" />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="p-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-400 hover:text-white transition-colors"
              title="Export Playlist"
            >
              <Download className="w-4 h-4" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dj-surface border border-dj-border rounded-xl shadow-2xl py-1.5 z-30">
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase border-b border-dj-border">
                  Export DJ Deck
                </div>
                <a
                  href={api.getExportDeckUrl(roomCode, 'CSV')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  📄 CSV Spreadsheet
                </a>
                <a
                  href={api.getExportDeckUrl(roomCode, 'M3U8')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  🎵 M3U8 Playlist
                </a>
                <a
                  href={api.getExportDeckUrl(roomCode, 'JSON')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  💾 JSON Backup
                </a>
                <a
                  href={api.getExportDeckUrl(roomCode, 'TEXT')}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  🖨️ Printable Set List
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="px-4 py-2 bg-dj-emerald/20 border-b border-dj-emerald text-dj-emerald text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" /> Successfully saved deck into DJ Library!
        </div>
      )}

      {bulkDurationSuccess && (
        <div className="px-4 py-2 bg-dj-cyan/20 border-b border-dj-cyan text-dj-cyan text-xs font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> {bulkDurationSuccess}
        </div>
      )}

      {/* Default Switch Time Toolbar */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-dj-border flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Sliders className="w-3.5 h-3.5 text-dj-cyan" />
            <span>Switch Song in:</span>
          </div>
          <div className="flex items-center gap-1">
            {[30, 45, 60, 90, 120, 0].map((sec) => {
              const isSelected = defaultSongDurationSeconds === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => onUpdateDefaultSwitchTime?.(sec)}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold transition-all ${
                    isSelected
                      ? 'bg-dj-cyan text-black glow-cyan'
                      : 'bg-dj-card hover:bg-slate-700 text-slate-300 border border-dj-border'
                  }`}
                  title={sec === 0 ? 'Play full song without early cut' : `Auto-transition song after ${sec} seconds`}
                >
                  {sec === 0 ? 'Full' : `${sec}s`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulk Apply & Quick Scroll Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {currentPlayingIndex !== -1 && (
            <button
              type="button"
              onClick={scrollToPlayingTrack}
              className="px-2.5 py-1 rounded-lg bg-dj-cyan/20 border border-dj-cyan/40 text-dj-cyan hover:bg-dj-cyan hover:text-black text-[11px] font-bold flex items-center gap-1 transition-all glow-cyan"
              title="Scroll directly to the currently playing song in the playlist"
            >
              <Target className="w-3.5 h-3.5 animate-pulse" />
              <span>Scroll to Playing (#{currentPlayingIndex + 1})</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => listContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Scroll to Top of playlist"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                listContainerRef.current?.scrollTo({
                  top: listContainerRef.current.scrollHeight,
                  behavior: 'smooth',
                })
              }
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Scroll to Bottom of playlist"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoScrollToPlaying(!autoScrollToPlaying)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
              autoScrollToPlaying
                ? 'bg-dj-green/15 text-dj-green border-dj-green/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title="Automatically scroll playlist as songs change"
          >
            Auto-Follow: {autoScrollToPlaying ? 'ON' : 'OFF'}
          </button>

          {/* Bulk Apply to all tracks in deck */}
          <button
            type="button"
            onClick={() => handleApplySwitchTimeToAll(defaultSongDurationSeconds || 60)}
            disabled={deck.length === 0}
            className="px-2.5 py-1 rounded-lg bg-dj-magenta/20 hover:bg-dj-magenta text-dj-magenta hover:text-white border border-dj-magenta/40 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow disabled:opacity-40"
            title="Update all tracks currently in this deck to use this switch duration"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Apply {defaultSongDurationSeconds === 0 ? 'Full Song' : `${defaultSongDurationSeconds}s`} to All
          </button>
        </div>
      </div>

      {/* Playlist Tracks List with proper min-h-0 and internal scrollbar */}
      <div
        ref={listContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 scroll-smooth"
      >
        {deck.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ListMusic className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
            <h4 className="font-bold text-slate-300 text-sm">DJ Deck is Empty</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Add songs from YouTube or load a curated set from your DJ Library. The deck plays automatically whenever no guest requests are waiting!
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-dj-cyan text-black font-bold text-xs"
              >
                + Add Song
              </button>
              <button
                onClick={onOpenLibrary}
                className="px-4 py-2 rounded-xl bg-dj-card border border-dj-border text-slate-300 font-bold text-xs hover:border-dj-cyan"
              >
                Load DJ Set
              </button>
            </div>
          </div>
        ) : (
          deck.map((track, idx) => {
            const isPlaying = track.playbackStatus === 'PLAYING' || currentTrackId === track.id;
            const isPlayed = track.playbackStatus === 'PLAYED';

            return (
              <div
                ref={isPlaying ? playingTrackRef : undefined}
                key={track.id}
                className={`p-3 rounded-xl border transition-all flex flex-col gap-2 group relative ${
                  isPlaying
                    ? 'bg-dj-cyan/15 border-dj-cyan glow-cyan'
                    : isPlayed
                    ? 'bg-dj-card/30 border-dj-border/40 opacity-70'
                    : 'bg-dj-card/70 border-dj-border hover:border-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Track Number & Reorder arrows */}
                  <div className="flex flex-col items-center justify-center text-slate-500 w-6">
                    <button
                      onClick={() => handleMoveTrack(idx, 'UP')}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-white disabled:opacity-20"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {idx + 1}
                    </span>
                    <button
                      onClick={() => handleMoveTrack(idx, 'DOWN')}
                      disabled={idx === deck.length - 1}
                      className="p-0.5 hover:text-white disabled:opacity-20"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Track Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white truncate">{track.title}</h4>
                      {track.isFavorite && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="truncate">{track.artist}</span>
                      <span>•</span>
                      <span className="font-mono text-dj-cyan">{formatTime(track.durationSeconds)}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {track.sourceType}
                      </span>
                      {track.startSeconds > 0 && (
                        <span className="font-mono text-[10px] text-dj-magenta bg-dj-magenta/10 px-1.5 py-0.2 rounded border border-dj-magenta/30">
                          Start: {formatTime(track.startSeconds)}
                        </span>
                      )}
                      {track.durationSeconds > 0 && (
                        <span className="font-mono text-[10px] text-dj-cyan bg-dj-cyan/10 px-1.5 py-0.2 rounded border border-dj-cyan/30">
                          Switch: {track.durationSeconds}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isPlaying && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-dj-cyan text-black animate-pulse flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> PLAYING
                    </span>
                  )}
                  {isPlayed && (
                    <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-800">
                      PLAYED
                    </span>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {/* Favorite Toggle */}
                    <button
                      onClick={() => handleToggleFavorite(track)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 transition-colors"
                      title="Toggle Favorite"
                    >
                      <Star
                        className={`w-4 h-4 ${track.isFavorite ? 'text-amber-400 fill-amber-400' : ''}`}
                      />
                    </button>

                    {/* Cue Point & Switch Duration Edit */}
                    <button
                      onClick={() => {
                        if (activeCueEditId === track.id) {
                          setActiveCueEditId(null);
                        } else {
                          setActiveCueEditId(track.id);
                          setCueStartTime(track.startSeconds || 0);
                          setCueDuration(track.durationSeconds || defaultSongDurationSeconds || 60);
                        }
                      }}
                      className={`p-1.5 rounded-lg transition-colors ${
                        activeCueEditId === track.id
                          ? 'bg-dj-magenta text-black shadow'
                          : 'text-slate-500 hover:text-dj-magenta'
                      }`}
                      title="Set Cue Points & Switch Duration"
                    >
                      <Clock className="w-4 h-4" />
                    </button>

                    {/* Play Now Override */}
                    {!isPlaying && (
                      <button
                        onClick={() => handlePlayNow(track.id)}
                        className="p-1.5 rounded-lg bg-dj-cyan/20 text-dj-cyan hover:bg-dj-cyan hover:text-black transition-all"
                        title="Play Track Immediately (Override)"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}

                    {/* Remove Track */}
                    <button
                      onClick={() => handleRemoveTrack(track.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove from Deck"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mini Interactive Timeline Scrub Bar when playing */}
                {isPlaying && (
                  <div className="mt-1 pt-2 border-t border-dj-cyan/20 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 text-dj-cyan font-bold">
                        <Volume2 className="w-3.5 h-3.5 animate-pulse text-dj-cyan" />
                        <span>Scrub: {formatTime(currentPosition)}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-400">{formatTime(track.durationSeconds || 180)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-sans">Click bar to seek</span>
                    </div>

                    <div
                      onClick={(e) => {
                        if (!onSeek) return;
                        const total = track.durationSeconds || 180;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        const seekSec = Math.floor(clickRatio * total);
                        onSeek(seekSec);
                      }}
                      className="relative w-full h-2.5 bg-slate-950 rounded-full cursor-pointer overflow-hidden border border-slate-700 hover:border-dj-cyan transition-all"
                      title="Click or drag to scrub playing track"
                    >
                      <div
                        className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-dj-cyan to-dj-magenta rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(0, (currentPosition / (track.durationSeconds || 180)) * 100))}%`,
                        }}
                      />
                      {track.startSeconds > 0 && (
                        <div
                          className="absolute top-0 bottom-0 w-1 bg-dj-green shadow z-10"
                          style={{
                            left: `${Math.min(100, Math.max(0, (track.startSeconds / (track.durationSeconds || 180)) * 100))}%`,
                          }}
                          title={`Cue Start: ${formatTime(track.startSeconds)}`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Cue & Switch Duration Editor */}
                {activeCueEditId === track.id && (
                  <div className="mt-1 pt-2.5 border-t border-dj-magenta/30 bg-black/50 rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-dj-magenta flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Cue & Switch Editor
                        </span>
                        {isPlaying && currentPosition > 0 && (
                          <button
                            type="button"
                            onClick={() => setCueStartTime(Math.floor(currentPosition))}
                            className="px-2 py-0.5 rounded bg-dj-cyan/20 border border-dj-cyan/40 text-dj-cyan text-[11px] font-semibold hover:bg-dj-cyan hover:text-black transition-all"
                            title="Set Start Cue to current playing position"
                          >
                            🎯 Set Start to Playhead ({formatTime(currentPosition)})
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-slate-400">Play Segment:</span>
                        <span className="text-dj-magenta font-bold">{formatTime(cueStartTime)}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-dj-cyan font-bold">{formatTime(cueStartTime + (cueDuration > 0 ? cueDuration : 60))}</span>
                      </div>
                    </div>

                    {/* Visual Timeline Scrub & Cue Selector in Editor */}
                    <div className="flex flex-col gap-1 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span>Click timeline to scrub & set cue point:</span>
                        <span className="text-dj-magenta font-semibold">Start: {formatTime(cueStartTime)} ({cueStartTime}s)</span>
                      </div>
                      <div
                        onClick={(e) => {
                          const total = track.durationSeconds || 180;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          const targetSec = Math.floor(ratio * total);
                          setCueStartTime(targetSec);
                          if (onSeek) onSeek(targetSec);
                        }}
                        className="relative w-full h-3 bg-slate-900 rounded-full cursor-pointer overflow-hidden border border-slate-700 hover:border-dj-magenta transition-all"
                        title="Click to scrub to this second and set as Start Cue"
                      >
                        {/* Cue Segment preview */}
                        <div
                          className="absolute top-0 bottom-0 bg-dj-magenta/30 border-x border-dj-magenta"
                          style={{
                            left: `${Math.min(100, Math.max(0, (cueStartTime / (track.durationSeconds || 180)) * 100))}%`,
                            width: `${Math.min(100 - (cueStartTime / (track.durationSeconds || 180)) * 100, Math.max(2, (cueDuration / (track.durationSeconds || 180)) * 100))}%`,
                          }}
                        />
                        {/* Current playhead indicator */}
                        {isPlaying && (
                          <div
                            className="absolute top-0 bottom-0 w-1.5 bg-dj-cyan z-10 rounded-full shadow"
                            style={{
                              left: `${Math.min(100, Math.max(0, (currentPosition / (track.durationSeconds || 180)) * 100))}%`,
                            }}
                            title={`Playhead: ${formatTime(currentPosition)}`}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Start Time input */}
                      <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700">
                        <span className="text-[11px] text-slate-400 font-semibold">Start:</span>
                        <input
                          type="number"
                          min="0"
                          max={track.durationSeconds || 3600}
                          value={cueStartTime}
                          onChange={(e) => setCueStartTime(Math.max(0, parseInt(e.target.value, 10) || 0))}
                          className="w-16 bg-slate-950 text-white font-mono text-xs text-center rounded px-1.5 py-0.5 border border-slate-700"
                        />
                        <span className="text-[11px] text-slate-400 font-mono">s</span>
                      </div>

                      {/* Switch / Duration presets */}
                      <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-700">
                        <span className="text-[11px] text-slate-400 font-semibold">Switch in:</span>
                        <div className="flex items-center gap-1">
                          {[30, 45, 60, 90, 120].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setCueDuration(sec)}
                              className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                                cueDuration === sec
                                  ? 'bg-dj-magenta text-white shadow'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                          <input
                            type="number"
                            min="5"
                            value={cueDuration}
                            onChange={(e) => setCueDuration(Math.max(5, parseInt(e.target.value, 10) || 60))}
                            className="w-14 bg-slate-950 text-white font-mono text-xs text-center rounded px-1.5 py-0.5 border border-slate-700"
                          />
                          <span className="text-[11px] text-slate-400 font-mono">s</span>
                        </div>
                      </div>

                      {/* Audition & Action buttons */}
                      <div className="flex items-center gap-2 ml-auto">
                        {onSeek && (
                          <button
                            type="button"
                            onClick={() => onSeek(cueStartTime)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                            title="Seek YouTube player to start cue"
                          >
                            <Play className="w-3 h-3 fill-current" /> Audition Start
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleSaveCuePoint(track.id)}
                          className="px-3 py-1 rounded-lg bg-dj-magenta text-black text-xs font-bold flex items-center gap-1 hover:scale-105 transition-all shadow-md"
                        >
                          <Check className="w-3.5 h-3.5" /> Save Cue
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCueEditId(null)}
                          className="p-1 rounded-lg text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Song Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dj-surface border border-dj-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-dj-border flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-dj-cyan" /> Add Song to DJ Deck
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearch} className="p-4 border-b border-dj-border bg-dj-card/40 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search song title, artist, or YouTube URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-dj-card border border-dj-border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dj-cyan"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-dj-cyan text-black font-bold text-sm rounded-xl disabled:opacity-50"
              >
                {searching ? '...' : 'Search'}
              </button>
            </form>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {searchResults.map((song) => (
                <div
                  key={song.videoId}
                  className="p-2.5 rounded-xl bg-dj-card border border-dj-border hover:border-dj-cyan flex items-center justify-between gap-3 group transition-all"
                >
                  <img
                    src={song.thumbnailUrl}
                    alt={song.title}
                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-white truncate">{song.title}</h5>
                    <p className="text-[11px] text-slate-400 truncate">{song.channelTitle}</p>
                    <span className="text-[10px] font-mono text-dj-cyan font-semibold">
                      {formatTime(song.durationSeconds)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddTrack(song)}
                    className="px-3 py-1.5 bg-dj-cyan text-black font-bold text-xs rounded-xl hover:scale-105 transition-all shadow-md"
                  >
                    + Add
                  </button>
                </div>
              ))}
              {searchResults.length === 0 && !searching && (
                <p className="text-center text-xs text-slate-500 py-8">
                  Type a song or artist name to search and add to your live DJ Deck.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Deck as Reusable Set Modal */}
      {isSavingSet && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dj-surface border border-dj-border rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <h3 className="font-bold text-white text-base mb-2 flex items-center gap-2">
              <Save className="w-5 h-5 text-dj-emerald" /> Save as Reusable DJ Set
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Save this playlist into your permanent DJ Library so you can reuse it in future events and parties!
            </p>
            <form onSubmit={handleSaveAsMasterSet} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Playlist / Set Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Warm-up Sunset, Bollywood Dance 2026"
                  value={saveSetName}
                  onChange={(e) => setSaveSetName(e.target.value)}
                  className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-sm text-white focus:outline-none focus:border-dj-emerald"
                  autoFocus
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSavingSet(false)}
                  className="px-3 py-1.5 rounded-xl border border-dj-border text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-dj-emerald text-black font-bold text-xs shadow-md"
                >
                  Save to Library
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Search Modal */}
      <UniversalSearchModal
        isOpen={isUniversalSearchOpen}
        onClose={() => setIsUniversalSearchOpen(false)}
        roomCode={roomCode}
        hostToken={hostToken}
        onDeckUpdated={onDeckUpdated}
      />

      {/* Import Playlist Modal */}
      <ImportPlaylistModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        roomCode={roomCode}
        hostToken={hostToken}
        onDeckUpdated={onDeckUpdated}
      />
    </div>
  );
};
