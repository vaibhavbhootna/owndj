import React from 'react';
import { SongRequest } from '../../types';
import {
  Check,
  X,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ThumbsUp,
  Clock,
  AlertTriangle,
  Music,
} from 'lucide-react';

interface QueueManagerProps {
  queue: SongRequest[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onRemove: (requestId: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onMoveToTop: (index: number) => void;
}

export const QueueManager: React.FC<QueueManagerProps> = ({
  queue,
  onApprove,
  onReject,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
}) => {
  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  // Separate currently playing from upcoming queue
  const upcomingQueue = queue.filter((r) => r.status !== 'PLAYING');

  return (
    <div className="glass-panel rounded-3xl border border-dj-border p-5 flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-dj-border">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-dj-cyan" />
          <h3 className="font-bold text-lg text-white">Session Queue</h3>
          <span className="px-2.5 py-0.5 rounded-full bg-dj-cyan/20 border border-dj-cyan/40 text-dj-cyan text-xs font-mono font-bold">
            {upcomingQueue.length} UPCOMING
          </span>
        </div>
      </div>

      {upcomingQueue.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-slate-500">
          <Music className="w-12 h-12 stroke-[1.2] mb-3 text-slate-600" />
          <p className="font-semibold text-slate-400">Queue is currently empty</p>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Guests can scan the QR code to request songs from YouTube in real time.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-4">
          {upcomingQueue.map((item, index) => {
            const isPending = item.status === 'PENDING';
            return (
              <div
                key={item.id}
                className={`group glass-card rounded-2xl p-3 border transition-all duration-200 flex items-center justify-between gap-3 ${isPending
                    ? 'border-dj-amber/40 bg-dj-amber/5'
                    : 'border-dj-border hover:border-slate-600 hover:bg-slate-800/40'
                  }`}
              >
                {/* Index / Queue Position Badge */}
                <div className="w-6 text-center text-xs font-mono font-bold text-slate-500 group-hover:text-dj-cyan">
                  #{index + 1}
                </div>

                {/* Track Thumbnail */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative bg-black border border-slate-700">
                  <img
                    src={item.song.thumbnailUrl || 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'}
                    alt={item.song.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 right-0 px-1 py-0.5 bg-black/80 rounded-tl text-[9px] font-mono text-slate-300">
                    {item.requestedDurationSeconds}s
                  </div>
                </div>

                {/* Song & Guest Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white truncate">{item.song.title}</h4>
                    {item.isDuplicate && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold flex items-center gap-1 flex-shrink-0">
                        <AlertTriangle className="w-2.5 h-2.5" /> REPEAT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{item.song.channelTitle}</p>

                  <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-slate-400">
                    <span className="text-slate-300">
                      by <strong className="text-dj-cyan">{item.guestNickname}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatTime(item.requestedStartSeconds)} → {formatTime(item.requestedEndSeconds)}
                    </span>
                    {item.votes > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-dj-green font-bold">
                          <ThumbsUp className="w-3 h-3" /> {item.votes}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action Moderation & Reorder Controls */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Approval Actions for Pending */}
                  {isPending ? (
                    <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-dj-amber/40">
                      <button
                        onClick={() => onApprove(item.id)}
                        className="p-1.5 rounded-lg bg-dj-green/20 hover:bg-dj-green text-dj-green hover:text-black transition-colors"
                        title="Approve song request"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onReject(item.id)}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white transition-colors"
                        title="Reject song request"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Reorder Buttons */}
                      <button
                        onClick={() => onMoveToTop(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-dj-cyan hover:bg-dj-card disabled:opacity-20 transition-colors"
                        title="Move to top of queue"
                      >
                        <ChevronsUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onMoveUp(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dj-card disabled:opacity-20 transition-colors"
                        title="Move up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onMoveDown(index)}
                        disabled={index === upcomingQueue.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dj-card disabled:opacity-20 transition-colors"
                        title="Move down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  {/* Remove Request Button */}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
