import React, { useState, useEffect, useCallback } from 'react';
import { Session, Guest, SongSearchResult, SongRequest } from '../../types';
import { api } from '../../services/api';
import { RequestDialog } from './RequestDialog';
import { GuestQueueView } from './GuestQueueView';
import { Search, Music, ListMusic, Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface GuestHomeProps {
  session: Session;
  guest: Guest;
  queue: SongRequest[];
  onRefreshQueue: () => void;
  onVote: (requestId: string) => void;
  onCancelRequest: (requestId: string) => void;
}

export const GuestHome: React.FC<GuestHomeProps> = ({
  session,
  guest,
  queue,
  onRefreshQueue,
  onVote,
  onCancelRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'queue'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Initial popular search results
  useEffect(() => {
    loadSongs('');
  }, []);

  const loadSongs = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const results = await api.searchSongs(query);
      setSearchResults(results);
    } catch (err) {
      console.warn('Failed to search YouTube:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadSongs(searchQuery);
    }, 350);

    return () => clearTimeout(handler);
  }, [searchQuery, loadSongs]);

  const handleOpenRequest = (song: SongSearchResult) => {
    setSelectedSong(song);
    setIsRequestModalOpen(true);
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-dj-bg text-slate-100 flex flex-col max-w-md mx-auto relative pb-20 shadow-2xl">
      {/* Top Mobile Header */}
      <header className="sticky top-0 z-40 bg-dj-surface/90 backdrop-blur-md border-b border-dj-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-dj-cyan to-dj-magenta flex items-center justify-center text-black font-black text-sm">
            DJ
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-white leading-tight truncate max-w-[160px]">
              {session.name}
            </h1>
            <p className="text-[11px] font-mono text-slate-400">
              ROOM: <strong className="text-dj-cyan font-bold">{session.roomCode}</strong>
            </p>
          </div>
        </div>

        {/* Guest Nickname Badge */}
        <div className="px-3 py-1 rounded-full bg-dj-card border border-dj-border text-xs font-semibold text-slate-300">
          👋 {guest.nickname}
        </div>
      </header>

      {/* Tabs Switcher */}
      <div className="p-4">
        <div className="grid grid-cols-2 p-1 bg-dj-surface border border-dj-border rounded-2xl">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-2 rounded-xl text-xs font-bold font-mono uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'search'
                ? 'bg-dj-cyan text-black glow-cyan shadow'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <Search className="w-3.5 h-3.5" /> Search YouTube
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-2 rounded-xl text-xs font-bold font-mono uppercase flex items-center justify-center gap-2 transition-all ${activeTab === 'queue'
                ? 'bg-dj-magenta text-white glow-magenta shadow'
                : 'text-slate-400 hover:text-white'
              }`}
          >
            <ListMusic className="w-3.5 h-3.5" /> Queue ({queue.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Search View */}
      {activeTab === 'search' && (
        <div className="px-4 space-y-4 flex-1">
          {/* Search Input Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search YouTube songs, artists, mixes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dj-surface border border-dj-border rounded-2xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dj-cyan glow-cyan transition-all"
            />
            {isSearching && (
              <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 text-dj-cyan animate-spin" />
            )}
          </div>

          {/* Search Results List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>{searchQuery ? 'SEARCH RESULTS' : 'POPULAR PARTY TRACKS'}</span>
              <span>{searchResults.length} songs</span>
            </div>

            {searchResults.length === 0 && !isSearching ? (
              <div className="text-center py-12 glass-card rounded-2xl p-6 border border-dj-border text-slate-400">
                <Music className="w-10 h-10 mx-auto text-slate-600 mb-2 stroke-[1.2]" />
                <p className="font-semibold text-sm">No songs found</p>
                <p className="text-xs text-slate-500 mt-1">Try another search keyword or artist name.</p>
              </div>
            ) : (
              searchResults.map((song) => (
                <div
                  key={song.videoId}
                  className="glass-card p-3 rounded-2xl border border-dj-border hover:border-slate-600 transition-all flex items-center justify-between gap-3"
                >
                  <img
                    src={song.thumbnailUrl}
                    alt={song.title}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-700"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate leading-snug">{song.title}</h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{song.channelTitle}</p>
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      {formatTime(song.durationSeconds)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenRequest(song)}
                    className="px-3.5 py-2 rounded-xl bg-dj-cyan/20 border border-dj-cyan/60 hover:bg-dj-cyan text-dj-cyan hover:text-black font-bold text-xs flex items-center gap-1 active:scale-95 transition-all flex-shrink-0 glow-cyan"
                  >
                    <span>Request</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Live Queue View */}
      {activeTab === 'queue' && (
        <div className="px-4 flex-1">
          <GuestQueueView
            queue={queue}
            guest={guest}
            onVote={onVote}
            onCancelRequest={onCancelRequest}
          />
        </div>
      )}

      {/* Song Request Dialog */}
      <RequestDialog
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        song={selectedSong}
        roomCode={session.roomCode}
        guestToken={guest.guestToken}
        settings={session.settings}
        onRequestSubmitted={() => {
          onRefreshQueue();
          setActiveTab('queue');
        }}
      />
    </div>
  );
};
