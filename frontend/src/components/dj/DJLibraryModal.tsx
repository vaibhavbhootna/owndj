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
  ListPlus,
  Radio,
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
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
    if (replaceExisting && !confirm('Replace current event deck with this set? (Any existing tracks in the event will be cleared)')) {
      return;
    }

    setLoadingIntoEventId(playlistId);
    try {
      await api.loadPlaylistIntoDeck(roomCode, hostToken, playlistId, replaceExisting);
      showToast(replaceExisting ? 'Loaded set into deck (replaced)' : 'Appended set to current deck!');
      onPlaylistLoaded();
      onClose();
    } catch (err) {
      console.warn('Failed to load playlist into event deck:', err);
      showToast('Failed to load set into deck');
    } finally {
      setLoadingIntoEventId(null);
    }
  };

  const handlePlaySingleTrack = async (track: DJPlaylistTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.id) return;
    setPlayingTrackId(track.id);
    try {
      await api.playSingleLibraryTrack(roomCode, track.id, hostToken);
      showToast(`▶️ Now Playing "${track.title}" from library! Will resume current deck when finished.`);
      onPlaylistLoaded();
    } catch (err) {
      console.warn('Failed to play library track:', err);
      showToast('Failed to play track');
    } finally {
      setPlayingTrackId(null);
    }
  };

  const handleAddTrackToDeck = async (track: DJPlaylistTrack, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!track.id) return;
    setAddingTrackId(track.id);
    try {
      await api.addDeckTrack(roomCode, hostToken, {
        title: track.title,
        artist: track.artist,
        album: track.album || 'Library Set',
        sourceType: track.sourceType || 'YOUTUBE',
        sourceIdentifier: track.sourceIdentifier,
        durationSeconds: track.durationSeconds,
        startSeconds: track.startSeconds || 0,
        transitionType: track.transitionType || 'CROSSFADE',
        transitionDurationSeconds: track.transitionDurationSeconds || 5,
        isFavorite: false,
      });
      showToast(`+ Added "${track.title}" to current event deck`);
      onPlaylistLoaded();
    } catch (err) {
      console.warn('Failed to add track to deck:', err);
      showToast('Failed to add track to deck');
    } finally {
      setAddingTrackId(null);
    }
  };

  const handleDuplicate = async (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.duplicatePlaylist(playlistId);
      fetchPlaylists();
      showToast('Set duplicated successfully');
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
      showToast('Set deleted');
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
      <div className="bg-dj-surface border border-dj-border w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dj-border flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-dj-cyan/10 border border-dj-cyan/30 text-dj-cyan">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">DJ Library & Pre-Saved Sets</h3>
              <p className="text-xs text-slate-400">
                Append sets to your live deck or play individual tracks without altering your existing mix
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast Feedback */}
        {toastMessage && (
          <div className="bg-gradient-to-r from-dj-cyan/20 to-purple-600/20 border-b border-dj-cyan/40 px-4 py-2 text-xs font-mono font-bold text-dj-cyan text-center animate-fadeIn">
            {toastMessage}
          </div>
        )}

        {/* Filter bar */}
        <div className="px-4 py-2.5 border-b border-dj-border/60 bg-black/20 flex gap-2 overflow-x-auto select-none">
          {['ALL', 'PARTY', 'WEDDING', 'BIRTHDAY', 'ANNIVERSARY', 'BOLLYWOOD', 'CORPORATE'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEventType(type)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all whitespace-nowrap ${
                selectedEventType === type
                  ? 'bg-dj-cyan text-black shadow-md glow-cyan font-black'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && playlists.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-dj-cyan opacity-60" />
              <p className="text-xs">Loading DJ Library sets...</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3 stroke-1" />
              <h4 className="font-bold text-slate-300 text-sm">No Pre-Saved Sets Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                Save any live deck to your permanent DJ Library using the save button on the DJ Deck tab, or import a YouTube playlist/CSV!
              </p>
            </div>
          ) : (
            playlists.map((set) => {
              const isExpanded = expandedPlaylistId === set.id;
              const tracks = expandedTracks[set.id] || [];

              return (
                <div
                  key={set.id}
                  className="bg-dj-card/60 border border-dj-border rounded-2xl overflow-hidden hover:border-slate-500 transition-all shadow-md"
                >
                  <div
                    onClick={() => handleToggleExpand(set.id)}
                    className="p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                          <span className="text-dj-cyan font-semibold">{formatTime(set.estimatedDurationSeconds)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Append to Deck & Replace Deck */}
                    <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-end flex-shrink-0">
                      {/* + Append to Current Deck */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadIntoEvent(set.id, false);
                        }}
                        disabled={loadingIntoEventId === set.id}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-dj-cyan border border-dj-cyan/40 font-bold text-xs flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-sm"
                        title="Append all tracks from this set to the end of your current deck without clearing existing songs"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                        <span>+ Append to Deck</span>
                      </button>

                      {/* Replace Deck */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadIntoEvent(set.id, true);
                        }}
                        disabled={loadingIntoEventId === set.id}
                        className="px-3 py-1.5 rounded-xl bg-dj-cyan hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all shadow-md glow-cyan"
                        title="Replace current event deck with this set"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Replace Deck</span>
                      </button>

                      {/* Duplicate */}
                      <button
                        onClick={(e) => handleDuplicate(set.id, e)}
                        className="p-1.5 rounded-xl bg-dj-surface border border-dj-border text-slate-400 hover:text-white transition-colors"
                        title="Duplicate Set"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDelete(set.id, e)}
                        className="p-1.5 rounded-xl bg-dj-surface border border-dj-border text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete Set"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Tracks List */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-dj-border/40 bg-black/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400 uppercase pt-2">
                        <span>Tracks in this Set ({tracks.length})</span>
                        <span className="text-[10px] text-slate-500 font-sans lowercase">
                          click &apos;Play Now&apos; to audition without altering deck
                        </span>
                      </div>

                      {loadingTracks ? (
                        <p className="text-xs text-slate-500 py-4 text-center">Loading set tracks...</p>
                      ) : tracks.length === 0 ? (
                        <p className="text-xs text-slate-500 py-3 text-center">No tracks in this set</p>
                      ) : (
                        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                          {tracks.map((t, idx) => (
                            <div
                              key={t.id || idx}
                              className="p-2.5 rounded-xl bg-dj-surface/90 border border-dj-border/70 flex items-center justify-between gap-3 text-xs hover:border-slate-500 transition-all"
                            >
                              <span className="font-mono text-slate-500 w-5 flex-shrink-0 text-center">{idx + 1}.</span>
                              <div className="flex-1 min-w-0">
                                <span className="font-bold text-white truncate block">{t.title}</span>
                                <span className="text-[11px] text-slate-400 truncate block">{t.artist}</span>
                              </div>

                              <span className="font-mono text-dj-cyan text-[11px] flex-shrink-0">
                                {formatTime(t.durationSeconds)}
                              </span>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {/* Play Now Without Adding */}
                                <button
                                  type="button"
                                  onClick={(e) => handlePlaySingleTrack(t, e)}
                                  disabled={playingTrackId === t.id}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black font-bold text-[11px] flex items-center gap-1 border border-emerald-500/40 hover:scale-105 active:scale-95 transition-all shadow-sm"
                                  title="Play this song now without importing whole list. Automatically returns to existing deck when finished!"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>{playingTrackId === t.id ? 'Playing...' : 'Play Now'}</span>
                                </button>

                                {/* Add Single Track to Deck */}
                                <button
                                  type="button"
                                  onClick={(e) => handleAddTrackToDeck(t, e)}
                                  disabled={addingTrackId === t.id}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[11px] flex items-center gap-1 border border-slate-700 hover:scale-105 active:scale-95 transition-all"
                                  title="Add just this song to current event deck"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>+ Deck</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
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
