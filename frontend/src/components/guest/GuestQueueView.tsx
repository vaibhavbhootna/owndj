import React from 'react';
import { SongRequest, Guest } from '../../types';
import { ThumbsUp, Clock, Music, Trash2, Radio } from 'lucide-react';

interface GuestQueueViewProps {
  queue: SongRequest[];
  guest: Guest | null;
  onVote: (requestId: string) => void;
  onCancelRequest: (requestId: string) => void;
}

export const GuestQueueView: React.FC<GuestQueueViewProps> = ({
  queue,
  guest,
  onVote,
  onCancelRequest,
}) => {
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  const playingTrack = queue.find((r) => r.status === 'PLAYING');
  const upcomingQueue = queue.filter((r) => r.status !== 'PLAYING');

  return (
    <div className="space-y-4">
      {/* Current Playing Banner */}
      {playingTrack && (
        <div className="glass-panel p-4 rounded-2xl border border-dj-green/40 bg-dj-green/5 glow-green relative overflow-hidden">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-dj-green mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> NOW PLAYING ON DECK
          </div>
          <div className="flex items-center gap-3">
            <img
              src={playingTrack.song.thumbnailUrl}
              alt={playingTrack.song.title}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-dj-green/40"
            />
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm text-white truncate">{playingTrack.song.title}</h4>
              <p className="text-xs text-slate-300 truncate">{playingTrack.song.channelTitle}</p>
              <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                <span>Requested by <strong className="text-dj-cyan">{playingTrack.guestNickname}</strong></span>
                <span>•</span>
                <span>{playingTrack.requestedDurationSeconds}s segment</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Queue Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider font-mono">
          Upcoming Queue ({upcomingQueue.length})
        </h3>
      </div>

      {upcomingQueue.length === 0 ? (
        <div className="text-center py-10 glass-card rounded-2xl p-6 border border-dj-border text-slate-400">
          <Music className="w-10 h-10 mx-auto text-slate-600 mb-2 stroke-[1.2]" />
          <p className="text-sm font-semibold">No songs in queue yet</p>
          <p className="text-xs text-slate-500 mt-1">Be the first to search and request a track!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingQueue.map((item, index) => {
            const isMyRequest = guest && item.guestId === guest.id;
            const isPending = item.status === 'PENDING';

            return (
              <div
                key={item.id}
                className={`glass-card p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isMyRequest
                    ? 'border-dj-cyan/60 bg-dj-cyan/5'
                    : 'border-dj-border hover:border-slate-600'
                }`}
              >
                {/* Position */}
                <div className="w-5 text-center font-mono text-xs font-bold text-slate-500">
                  #{index + 1}
                </div>

                {/* Thumbnail */}
                <img
                  src={item.song.thumbnailUrl}
                  alt={item.song.title}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-700"
                />

                {/* Track Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white truncate">{item.song.title}</h4>
                    {isMyRequest && (
                      <span className="px-1.5 py-0.5 rounded bg-dj-cyan/20 text-dj-cyan text-[10px] font-bold">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{item.song.channelTitle}</p>

                  <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-300">{item.guestNickname}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(item.requestedStartSeconds)} ({item.requestedDurationSeconds}s)
                    </span>
                    <span>•</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold uppercase text-[10px] ${
                        item.status === 'APPROVED'
                          ? 'text-dj-green'
                          : item.status === 'PENDING'
                          ? 'text-dj-amber'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Upvote & Cancel Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onVote(item.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold transition-all active:scale-95 ${
                      item.userVoted
                        ? 'bg-dj-cyan text-black border-dj-cyan glow-cyan'
                        : 'bg-dj-card hover:bg-slate-700 text-slate-300 border-dj-border'
                    }`}
                    title="Upvote song"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{item.votes}</span>
                  </button>

                  {/* Cancel Request if own pending request */}
                  {isMyRequest && isPending && (
                    <button
                      onClick={() => onCancelRequest(item.id)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Cancel your request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
