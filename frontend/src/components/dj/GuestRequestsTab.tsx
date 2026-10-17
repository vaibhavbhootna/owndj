import React, { useState } from 'react';
import { SongRequest, RequestStatus } from '../../types';
import { api } from '../../services/api';
import {
  Users,
  CheckCircle,
  XCircle,
  Trash2,
  ArrowUp,
  Download,
  PauseCircle,
  PlayCircle,
  Clock,
  ThumbsUp,
  Flame,
  Radio,
} from 'lucide-react';

interface GuestRequestsTabProps {
  roomCode: string;
  hostToken: string;
  requests: SongRequest[];
  onRequestsUpdated: () => void;
  guestRequestsPaused: boolean;
  onTogglePauseRequests: (paused: boolean) => void;
  currentTrackId?: string;
}

export const GuestRequestsTab: React.FC<GuestRequestsTabProps> = ({
  roomCode,
  hostToken,
  requests,
  onRequestsUpdated,
  guestRequestsPaused,
  onTogglePauseRequests,
  currentTrackId,
}) => {
  const [filter, setFilter] = useState<'ALL' | RequestStatus>('ALL');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const handleApprove = async (requestId: string) => {
    try {
      await api.approveRequest(requestId, hostToken);
      onRequestsUpdated();
    } catch (err) {
      console.warn('Failed to approve request:', err);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.rejectRequest(requestId, hostToken);
      onRequestsUpdated();
    } catch (err) {
      console.warn('Failed to reject request:', err);
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      await api.removeRequest(requestId, hostToken);
      onRequestsUpdated();
    } catch (err) {
      console.warn('Failed to delete request:', err);
    }
  };

  const handleMoveToTop = async (requestId: string) => {
    try {
      await api.moveToTop(roomCode, hostToken, requestId);
      onRequestsUpdated();
    } catch (err) {
      console.warn('Failed to prioritize request:', err);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === 'ALL') return true;
    return r.status === filter;
  });

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className="flex flex-col h-full bg-dj-surface rounded-2xl border border-dj-border overflow-hidden">
      {/* Header & Controls Toolbar */}
      <div className="p-4 border-b border-dj-border bg-dj-card/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-dj-magenta/10 border border-dj-magenta/30 text-dj-magenta">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              Guest Requests
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-dj-magenta/20 text-dj-magenta border border-dj-magenta/30">
                Priority Source
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {requests.length} total • {pendingCount} pending • {approvedCount} queued
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume Guest Requests */}
          <button
            onClick={() => onTogglePauseRequests(!guestRequestsPaused)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
              guestRequestsPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'bg-dj-card border border-dj-border text-slate-300 hover:text-white'
            }`}
            title="Temporarily pause guest requests in playback sequence"
          >
            {guestRequestsPaused ? (
              <>
                <PlayCircle className="w-4 h-4 text-amber-400" /> Requests Paused
              </>
            ) : (
              <>
                <PauseCircle className="w-4 h-4 text-slate-400" /> Pause Requests
              </>
            )}
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="p-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-400 hover:text-white transition-colors"
              title="Export Requests"
            >
              <Download className="w-4 h-4" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dj-surface border border-dj-border rounded-xl shadow-2xl py-1.5 z-30">
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase border-b border-dj-border">
                  Export Guest Requests
                </div>
                <a
                  href={api.getExportRequestsUrl(roomCode, 'CSV', 'ALL')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  📄 CSV (All Requests)
                </a>
                <a
                  href={api.getExportRequestsUrl(roomCode, 'CSV', 'PLAYED')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  ✅ CSV (Played Only)
                </a>
                <a
                  href={api.getExportRequestsUrl(roomCode, 'JSON', 'ALL')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  💾 JSON Backup
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-2 border-b border-dj-border/60 bg-black/20 flex gap-1.5 overflow-x-auto">
        {(['ALL', 'PENDING', 'APPROVED', 'PLAYED', 'REJECTED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              filter === tab
                ? 'bg-dj-magenta text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-dj-card'
            }`}
          >
            {tab}
            <span className="ml-1.5 text-[10px] opacity-70">
              ({tab === 'ALL' ? requests.length : requests.filter((r) => r.status === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredRequests.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Users className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
            <h4 className="font-bold text-slate-300 text-sm">No Guest Requests Found</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              {filter === 'ALL'
                ? 'Guests can scan the event QR code to submit song requests with custom start times!'
                : `No requests with status '${filter}'`}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPlaying = req.status === 'PLAYING' || currentTrackId === req.id;

            return (
              <div
                key={req.id}
                className={`p-3 rounded-xl border transition-all flex items-center gap-3 relative group ${
                  isPlaying
                    ? 'bg-dj-magenta/15 border-dj-magenta glow-magenta'
                    : req.status === 'APPROVED'
                    ? 'bg-dj-card/80 border-slate-700'
                    : req.status === 'REJECTED'
                    ? 'bg-dj-card/20 border-red-950/40 opacity-60'
                    : 'bg-dj-card/50 border-dj-border'
                }`}
              >
                {/* Thumbnail */}
                <img
                  src={req.song.thumbnailUrl}
                  alt={req.song.title}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                />

                {/* Song Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white truncate">{req.song.title}</h4>
                    {req.votes > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-dj-magenta/20 text-dj-magenta flex items-center gap-0.5 border border-dj-magenta/30">
                        <ThumbsUp className="w-2.5 h-2.5" /> {req.votes}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="text-dj-cyan font-semibold">@{req.guestNickname}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">
                      {formatTime(req.requestedStartSeconds)} → {formatTime(req.requestedEndSeconds)} ({req.requestedDurationSeconds}s)
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                      req.status === 'PLAYING'
                        ? 'bg-dj-magenta text-white animate-pulse'
                        : req.status === 'APPROVED'
                        ? 'bg-dj-emerald/20 text-dj-emerald border border-dj-emerald/40'
                        : req.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : req.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {req.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="p-1.5 rounded-lg text-dj-emerald hover:bg-dj-emerald/20 transition-colors"
                        title="Approve Request"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(req.id)}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Reject Request"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => handleMoveToTop(req.id)}
                      className="p-1.5 rounded-lg text-dj-cyan hover:bg-dj-cyan/20 transition-colors"
                      title="Move to Top (Urgent / VIP)"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(req.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                    title="Remove Request"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
