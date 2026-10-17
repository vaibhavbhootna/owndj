import React, { useState, useEffect } from 'react';
import { DJPlaylist, DJPlaylistTrack } from '../../types';
import { api } from '../../services/api';
import {
  BookOpen,
  Plus,
  Play,
  Copy,
  Trash2,
  X,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Music,
  Check,
} from 'lucide-react';

interface DJLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  hostToken: string;
  onPlaylistLoaded: () => void;
}

export const DJLibraryModal: React.FC<DJLibraryModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  hostToken,
  onPlaylistLoaded,
}) => {
  const [playlists, setPlaylists] = useState<DJPlaylist[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [expandedTracks, setExpandedTracks] = useState<Record<string, DJPlaylistTrack[]>>({});
  const [loading, setLoading] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingIntoEventId, setLoadingIntoEventId] = useState<string | null>(null);

  const fetchPlaylists = async () => {
    setLoading(true);
    try {
      const data = await api.listPlaylists(selectedEventType === 'ALL' ? undefined : selectedEventType);
      setPlaylists(data);
    } catch (err) {
      console.warn('Failed to load DJ Sets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlaylists();
    }
  }, [isOpen, selectedEventType]);

  const handleToggleExpand = async (playlistId: string) => {
    if (expandedPlaylistId === playlistId) {
      setExpandedPlaylistId(null);
      return;
    }

    setExpandedPlaylistId(playlistId);
    if (!expandedTracks[playlistId]) {
      setLoadingTracks(true);
      try {
        const full = await api.getPlaylist(playlistId);
        setExpandedTracks((prev) => ({ ...prev, [playlistId]: full.tracks || [] }));
      } catch (err) {
        console.warn('Failed to fetch playlist tracks:', err);
      } finally {
        setLoadingTracks(false);
      }
    }
  };

  const handleLoadIntoEvent = async (playlistId: string, replaceExisting: boolean) => {
    setLoadingIntoEventId(playlistId);
    try {
      await api.loadPlaylistIntoDeck(roomCode, hostToken, playlistId, replaceExisting);
      onPlaylistLoaded();
      onClose();
    } catch (err) {
      console.warn('Failed to load playlist into event deck:', err);
    } finally {
      setLoadingIntoEventId(null);
    }
  };

  const handleDuplicate = async (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.duplicatePlaylist(playlistId);
      fetchPlaylists();
    } catch (err) {
      console.warn('Failed to duplicate playlist:', err);
    }
  };

  const handleDelete = async (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this reusable DJ Set?')) return;
    try {
      await api.deletePlaylist(playlistId);
      fetchPlaylists();
    } catch (err) {
      console.warn('Failed to delete playlist:', err);
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-dj-cyan/10 border border-dj-cyan/30 text-dj-cyan">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">DJ Library & Reusable Sets</h3>
              <p className="text-xs text-slate-400">
                Pre-built master sets you can copy into any event without altering original sets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-4 py-2.5 border-b border-dj-border/60 bg-black/20 flex gap-2 overflow-x-auto">
          {['ALL', 'PARTY', 'WEDDING', 'BIRTHDAY', 'ANNIVERSARY', 'BOLLYWOOD', 'CORPORATE'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEventType(type)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedEventType === type
                  ? 'bg-dj-cyan text-black shadow-md glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {playlists.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-1" />
              <h4 className="font-bold text-slate-300 text-sm">No Reusable Sets Found</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                You can save any live event deck into your permanent DJ Library by clicking the save icon on the DJ Deck tab!
              </p>
            </div>
          ) : (
            playlists.map((set) => {
              const isExpanded = expandedPlaylistId === set.id;
              const tracks = expandedTracks[set.id] || [];

              return (
                <div
                  key={set.id}
                  className="bg-dj-card/60 border border-dj-border rounded-2xl overflow-hidden hover:border-slate-500 transition-all"
                >
                  <div
                    onClick={() => handleToggleExpand(set.id)}
                    className="p-4 cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-800 text-dj-cyan flex-shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm truncate">{set.name}</h4>
                          {set.eventType && (
                            <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                              {set.eventType}
                            </span>
                          )}
                        </div>
                        {set.description && (
                          <p className="text-xs text-slate-400 truncate mt-0.5">{set.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-1">
                          <span>{set.trackCount} tracks</span>
                          <span>•</span>
                          <span className="text-dj-cyan">{formatTime(set.estimatedDurationSeconds)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadIntoEvent(set.id, true);
                        }}
                        disabled={loadingIntoEventId === set.id}
                        className="px-3 py-1.5 rounded-xl bg-dj-cyan text-black font-bold text-xs flex items-center gap-1 hover:scale-105 transition-all shadow-md"
                        title="Load into current event deck (replaces existing)"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Load into Event
                      </button>

                      <button
                        onClick={(e) => handleDuplicate(set.id, e)}
                        className="p-1.5 rounded-xl bg-dj-surface border border-dj-border text-slate-400 hover:text-white"
                        title="Duplicate Set"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={(e) => handleDelete(set.id, e)}
                        className="p-1.5 rounded-xl bg-dj-surface border border-dj-border text-slate-400 hover:text-red-400"
                        title="Delete Set"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tracks List */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-dj-border/40 bg-black/30 space-y-1.5">
                      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase mb-2">
                        Tracks in Set ({tracks.length})
                      </div>
                      {loadingTracks ? (
                        <p className="text-xs text-slate-500 py-3 text-center">Loading tracks...</p>
                      ) : (
                        tracks.map((t, idx) => (
                          <div
                            key={t.id || idx}
                            className="p-2 rounded-xl bg-dj-surface/80 border border-dj-border/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-mono text-slate-500 w-4">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-white truncate block">{t.title}</span>
                              <span className="text-[11px] text-slate-400 truncate block">{t.artist}</span>
                            </div>
                            <span className="font-mono text-dj-cyan text-[11px]">
                              {formatTime(t.durationSeconds)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
