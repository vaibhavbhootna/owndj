import React, { useState, useEffect } from 'react';
import { EventDJTrack, SongSearchResult } from '../../types';
import { api } from '../../services/api';
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
} from 'lucide-react';

interface DJDeckManagerProps {
  roomCode: string;
  hostToken: string;
  deck: EventDJTrack[];
  onDeckUpdated: () => void;
  onOpenLibrary: () => void;
  currentTrackId?: string;
}

export const DJDeckManager: React.FC<DJDeckManagerProps> = ({
  roomCode,
  hostToken,
  deck,
  onDeckUpdated,
  onOpenLibrary,
  currentTrackId,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isSavingSet, setIsSavingSet] = useState(false);
  const [saveSetName, setSaveSetName] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeCueEditId, setActiveCueEditId] = useState<string | null>(null);
  const [cueStartTime, setCueStartTime] = useState<number>(0);

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
      });
      setActiveCueEditId(null);
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to update cue point:', err);
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

      {/* Playlist Tracks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
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
                key={track.id}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 group relative ${
                  isPlaying
                    ? 'bg-dj-cyan/15 border-dj-cyan glow-cyan'
                    : isPlayed
                    ? 'bg-dj-card/30 border-dj-border/40 opacity-70'
                    : 'bg-dj-card/70 border-dj-border hover:border-slate-500'
                }`}
              >
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
                        Cue: {formatTime(track.startSeconds)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cue Point Quick Editor */}
                {activeCueEditId === track.id ? (
                  <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-dj-magenta">
                    <span className="text-[10px] font-mono text-slate-400">Start:</span>
                    <input
                      type="number"
                      min="0"
                      max={track.durationSeconds}
                      value={cueStartTime}
                      onChange={(e) => setCueStartTime(parseInt(e.target.value, 10) || 0)}
                      className="w-12 bg-slate-900 text-white font-mono text-xs text-center rounded px-1 py-0.5"
                    />
                    <span className="text-[10px] text-slate-400">s</span>
                    <button
                      onClick={() => handleSaveCuePoint(track.id)}
                      className="p-1 rounded bg-dj-magenta text-black hover:scale-105"
                      title="Save Cue"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setActiveCueEditId(null)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : null}

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

                  {/* Cue Point Edit */}
                  <button
                    onClick={() => {
                      setActiveCueEditId(track.id);
                      setCueStartTime(track.startSeconds || 0);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-dj-magenta transition-colors"
                    title="Set Starting Cue Timestamp"
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
    </div>
  );
};
