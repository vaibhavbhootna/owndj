import React, { useState, useEffect } from 'react';
import { EventPlaybackHistory, PlaybackState } from '../../types';
import { api } from '../../services/api';
import {
  History,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Music,
  Users,
  Disc,
} from 'lucide-react';

interface NowPlayingHistoryTabProps {
  roomCode: string;
  playbackState: PlaybackState;
}

export const NowPlayingHistoryTab: React.FC<NowPlayingHistoryTabProps> = ({
  roomCode,
  playbackState,
}) => {
  const [history, setHistory] = useState<EventPlaybackHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getEventHistory(roomCode);
      setHistory(data);
    } catch (err) {
      console.warn('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [roomCode, playbackState.currentTrack?.id]);

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-dj-surface rounded-2xl border border-dj-border overflow-hidden">
      {/* Header & Controls Toolbar */}
      <div className="p-4 border-b border-dj-border bg-dj-card/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Now Playing & Event History</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Combined chronological record of all tracks played from both DJ Deck and Guest Requests
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="p-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-400 hover:text-white transition-colors"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="px-3 py-1.5 rounded-xl bg-dj-card border border-dj-border text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:text-white transition-colors"
              title="Export History"
            >
              <Download className="w-4 h-4" /> Export History
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-dj-surface border border-dj-border rounded-xl shadow-2xl py-1.5 z-30">
                <div className="px-3 py-1 text-[10px] font-mono font-bold text-slate-400 uppercase border-b border-dj-border">
                  Export Event History
                </div>
                <a
                  href={api.getExportHistoryUrl(roomCode, 'CSV')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  📄 CSV Spreadsheet
                </a>
                <a
                  href={api.getExportHistoryUrl(roomCode, 'JSON')}
                  download
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  💾 JSON Backup
                </a>
                <a
                  href={api.getExportHistoryUrl(roomCode, 'TEXT')}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setExportMenuOpen(false)}
                  className="block px-3 py-1.5 text-xs text-slate-300 hover:bg-dj-card hover:text-white"
                >
                  🖨️ Printable History Log
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Currently Playing Spotlight Card */}
      {playbackState.currentTrack && (
        <div className="p-4 border-b border-dj-border bg-gradient-to-r from-dj-card via-black/40 to-dj-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-dj-cyan/20 border border-dj-cyan/40 flex items-center justify-center flex-shrink-0 animate-spin-slow">
            <Disc className="w-6 h-6 text-dj-cyan" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-dj-cyan text-black uppercase">
                Now Live
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.2 rounded-full uppercase border ${
                  playbackState.playlistSource === 'DJ_DECK'
                    ? 'bg-dj-cyan/20 text-dj-cyan border-dj-cyan/30'
                    : 'bg-dj-magenta/20 text-dj-magenta border-dj-magenta/30'
                }`}
              >
                {playbackState.playlistSource === 'DJ_DECK' ? 'Source: DJ Deck' : 'Source: Guest Request'}
              </span>
            </div>
            <h4 className="font-extrabold text-sm text-white truncate mt-1">
              {playbackState.currentTrack.song.title}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {playbackState.currentTrack.song.channelTitle || playbackState.currentTrack.song.artist}
              {playbackState.currentTrack.guestNickname && playbackState.playlistSource !== 'DJ_DECK' && (
                <span className="text-dj-magenta ml-2">Requested by @{playbackState.currentTrack.guestNickname}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* History Log Table */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <History className="w-12 h-12 text-slate-600 mb-3 stroke-1" />
            <h4 className="font-bold text-slate-300 text-sm">No History Recorded Yet</h4>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              As songs play and transition from either the DJ Deck or Guest Requests, they will appear chronologically here with start time and outcome.
            </p>
          </div>
        ) : (
          history.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-3 rounded-xl bg-dj-card/60 border border-dj-border hover:border-slate-600 transition-all flex items-center justify-between gap-3 text-xs"
            >
              {/* Order index */}
              <span className="font-mono text-slate-500 w-5 text-center">{idx + 1}</span>

              {/* Title & Artist */}
              <div className="flex-1 min-w-0">
                <h5 className="font-bold text-white truncate">{item.trackTitle}</h5>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {item.artist}
                  {item.requesterNickname && (
                    <span className="text-dj-magenta ml-1.5 font-semibold">
                      (Req by @{item.requesterNickname})
                    </span>
                  )}
                </p>
              </div>

              {/* Source Badge */}
              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  item.playlistSource === 'DJ_DECK'
                    ? 'bg-dj-cyan/15 text-dj-cyan border-dj-cyan/30'
                    : 'bg-dj-magenta/15 text-dj-magenta border-dj-magenta/30'
                }`}
              >
                {item.playlistSource === 'DJ_DECK' ? 'DJ Deck' : 'Guest'}
              </span>

              {/* Duration Played */}
              <span className="font-mono text-slate-400 text-[11px]">
                {formatTime(item.playedDurationSeconds)}
              </span>

              {/* Outcome Badge */}
              <div className="flex items-center gap-1">
                {item.outcome === 'COMPLETED' ? (
                  <span className="text-dj-emerald flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </span>
                ) : item.outcome === 'SKIPPED' ? (
                  <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                    <AlertTriangle className="w-3.5 h-3.5" /> Skipped
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center gap-1 font-mono text-[11px]">
                    <XCircle className="w-3.5 h-3.5" /> Error
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
