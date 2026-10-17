import React, { useState, useEffect } from 'react';
import { UniversalSearchResponse, LibraryTrackMatch, EventDJTrack, SongSearchResult } from '../../types';
import { api } from '../../services/api';
import {
  Search,
  ListMusic,
  BookOpen,
  Music,
  Youtube,
  Play,
  Plus,
  Check,
  X,
  Volume2,
  Clock,
  Sparkles,
} from 'lucide-react';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  hostToken: string;
  onDeckUpdated: () => void;
}

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  hostToken,
  onDeckUpdated,
}) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<UniversalSearchResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DECK' | 'LIBRARY' | 'LOCAL' | 'YOUTUBE'>('ALL');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const performSearch = async (searchQ: string) => {
    setIsSearching(true);
    try {
      const data = await api.universalSearch(roomCode, searchQ);
      setResults(data);
    } catch (err) {
      console.warn('Universal search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!isOpen) return null;

  const handleAddTrack = async (
    title: string,
    artist: string,
    sourceType: 'YOUTUBE' | 'LOCAL_MP3',
    sourceIdentifier: string,
    durationSeconds: number,
    trackKey: string
  ) => {
    try {
      await api.addDeckTrack(roomCode, hostToken, {
        title,
        artist,
        sourceType,
        sourceIdentifier,
        durationSeconds,
        startSeconds: 0,
        transitionType: 'CROSSFADE',
        transitionDurationSeconds: 5,
        isFavorite: false,
      });
      setAddedIds((prev) => new Set(prev).add(trackKey));
      onDeckUpdated();
    } catch (err) {
      console.warn('Failed to add track from universal search:', err);
    }
  };

  const handlePlayNow = async (
    title: string,
    artist: string,
    sourceType: 'YOUTUBE' | 'LOCAL_MP3',
    sourceIdentifier: string,
    durationSeconds: number
  ) => {
    try {
      // First add to deck
      const added = await api.addDeckTrack(roomCode, hostToken, {
        title,
        artist,
        sourceType,
        sourceIdentifier,
        durationSeconds,
        startSeconds: 0,
        transitionType: 'CROSSFADE',
        transitionDurationSeconds: 5,
        isFavorite: false,
      });
      // Then trigger play now
      await api.playDeckTrackNow(roomCode, added.id, hostToken);
      onDeckUpdated();
      onClose();
    } catch (err) {
      console.warn('Failed to play now:', err);
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const deckMatches = results?.eventDeckMatches || [];
  const libraryMatches = results?.librarySetMatches || [];
  const localMatches = results?.localMusicMatches || [];
  const youtubeMatches = results?.youTubeMatches || [];
  const total = results?.totalMatches || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header with Search Bar */}
        <div className="p-4 border-b border-dj-border bg-dj-card/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-dj-cyan/10 border border-dj-cyan/30 text-dj-cyan">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Universal Track Search</h3>
                <p className="text-xs text-slate-400">
                  Search across Active Event Deck, Saved DJ Sets, Local Music & YouTube
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

          {/* Search Input Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by song title, artist, playlist name, or YouTube keyword..."
              className="w-full pl-10 pr-10 py-3 bg-dj-card border border-dj-border rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dj-cyan shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Source Tabs */}
          {results && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-dj-cyan text-black'
                    : 'bg-dj-card border border-dj-border text-slate-400 hover:text-white'
                }`}
              >
                All Sources ({total})
              </button>
              <button
                onClick={() => setActiveFilter('DECK')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilter === 'DECK'
                    ? 'bg-blue-600 text-white'
                    : 'bg-dj-card border border-dj-border text-slate-400 hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" /> In Active Deck ({deckMatches.length})
              </button>
              <button
                onClick={() => setActiveFilter('LIBRARY')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilter === 'LIBRARY'
                    ? 'bg-purple-600 text-white'
                    : 'bg-dj-card border border-dj-border text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> In Saved Sets ({libraryMatches.length})
              </button>
              <button
                onClick={() => setActiveFilter('LOCAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilter === 'LOCAL'
                    ? 'bg-amber-600 text-white'
                    : 'bg-dj-card border border-dj-border text-slate-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" /> Local MP3s ({localMatches.length})
              </button>
              <button
                onClick={() => setActiveFilter('YOUTUBE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeFilter === 'YOUTUBE'
                    ? 'bg-red-600 text-white'
                    : 'bg-dj-card border border-dj-border text-slate-400 hover:text-white'
                }`}
              >
                <Youtube className="w-3.5 h-3.5" /> YouTube ({youtubeMatches.length})
              </button>
            </div>
          )}
        </div>

        {/* Results Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {isSearching && (
            <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-dj-cyan border-t-transparent animate-spin mb-3" />
              <p className="text-xs font-mono">Searching across all decks and libraries...</p>
            </div>
          )}

          {!isSearching && !results && (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Search className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
              <h4 className="font-bold text-slate-300 text-sm">Universal Search Ready</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Type any song, artist, genre, or keyword to instantly search through your active deck, saved library sets, local MP3s, and YouTube.
              </p>
            </div>
          )}

          {!isSearching && results && total === 0 && (
            <div className="p-12 text-center text-slate-500">
              <p className="font-bold text-slate-300 text-sm">No matches found for "{results.query}"</p>
              <p className="text-xs text-slate-500 mt-1">Try another keyword or search query.</p>
            </div>
          )}

          {/* 1. In Active Event Deck */}
          {(activeFilter === 'ALL' || activeFilter === 'DECK') && deckMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                <ListMusic className="w-4 h-4" /> In Active Event Deck ({deckMatches.length})
              </div>
              <div className="space-y-1.5">
                {deckMatches.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-500">#{t.sortOrder + 1}</span>
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white truncate">{t.title}</h5>
                        <p className="text-[11px] text-slate-400 truncate">{t.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">
                        {t.playbackStatus}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {formatTime(t.durationSeconds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. In Saved DJ Sets (DJ Library) */}
          {(activeFilter === 'ALL' || activeFilter === 'LIBRARY') && libraryMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-400 uppercase tracking-wider">
                <BookOpen className="w-4 h-4" /> In Saved DJ Library Sets ({libraryMatches.length})
              </div>
              <div className="space-y-1.5">
                {libraryMatches.map((t) => {
                  const key = `lib_${t.trackId}`;
                  const isAdded = addedIds.has(key);
                  return (
                    <div
                      key={t.trackId}
                      className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3 hover:border-purple-400/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-white truncate">{t.title}</h5>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300">
                            Set: {t.playlistName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.artist}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-slate-400 mr-2">
                          {formatTime(t.durationSeconds)}
                        </span>
                        <button
                          onClick={() =>
                            handleAddTrack(
                              t.title,
                              t.artist,
                              t.sourceType,
                              t.sourceIdentifier,
                              t.durationSeconds,
                              key
                            )
                          }
                          disabled={isAdded}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {isAdded ? 'Added' : 'Add to Deck'}
                        </button>
                        <button
                          onClick={() =>
                            handlePlayNow(
                              t.title,
                              t.artist,
                              t.sourceType,
                              t.sourceIdentifier,
                              t.durationSeconds
                            )
                          }
                          className="p-1.5 rounded-lg bg-dj-cyan/20 hover:bg-dj-cyan text-dj-cyan hover:text-black transition-all"
                          title="Play Immediately"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. In Local Music Library */}
          {(activeFilter === 'ALL' || activeFilter === 'LOCAL') && localMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                <Music className="w-4 h-4" /> Local MP3 Library ({localMatches.length})
              </div>
              <div className="space-y-1.5">
                {localMatches.map((t) => {
                  const key = `local_${t.id}`;
                  const isAdded = addedIds.has(key);
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-3 hover:border-amber-400/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-xs text-white truncate">{t.title}</h5>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                            MP3
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{t.artist || t.channelTitle || 'Music Library'}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-slate-400 mr-2">
                          {formatTime(t.durationSeconds)}
                        </span>
                        <button
                          onClick={() =>
                            handleAddTrack(
                              t.title,
                              t.artist || t.channelTitle || '',
                              t.youtubeVideoId ? 'YOUTUBE' : 'LOCAL_MP3',
                              t.youtubeVideoId || t.id,
                              t.durationSeconds,
                              key
                            )
                          }
                          disabled={isAdded}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {isAdded ? 'Added' : 'Add to Deck'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. In YouTube Discovery */}
          {(activeFilter === 'ALL' || activeFilter === 'YOUTUBE') && youtubeMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                <Youtube className="w-4 h-4" /> YouTube Discovery ({youtubeMatches.length})
              </div>
              <div className="space-y-1.5">
                {youtubeMatches.map((t) => {
                  const key = `yt_${t.videoId}`;
                  const isAdded = addedIds.has(key);
                  return (
                    <div
                      key={t.videoId}
                      className="p-3 rounded-xl bg-dj-card border border-dj-border flex items-center justify-between gap-3 hover:border-slate-500 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <img
                          src={t.thumbnailUrl}
                          alt=""
                          className="w-12 h-9 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                        />
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-white truncate">{t.title}</h5>
                          <p className="text-[11px] text-slate-400 truncate">{t.channelTitle}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-slate-400 mr-2">
                          {formatTime(t.durationSeconds)}
                        </span>
                        <button
                          onClick={() =>
                            handleAddTrack(
                              t.title,
                              t.channelTitle,
                              'YOUTUBE',
                              t.videoId,
                              t.durationSeconds,
                              key
                            )
                          }
                          disabled={isAdded}
                          className="px-2.5 py-1.5 rounded-lg bg-dj-cyan/20 hover:bg-dj-cyan text-dj-cyan hover:text-black border border-dj-cyan/40 text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                        >
                          {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          {isAdded ? 'Added' : 'Add to Deck'}
                        </button>
                        <button
                          onClick={() =>
                            handlePlayNow(
                              t.title,
                              t.channelTitle,
                              'YOUTUBE',
                              t.videoId,
                              t.durationSeconds
                            )
                          }
                          className="p-1.5 rounded-lg bg-dj-magenta/20 hover:bg-dj-magenta text-dj-magenta hover:text-black transition-all"
                          title="Play Immediately"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
