import React from 'react';
import { PlaybackState, SongRequest } from '../../types';
import { Play, Pause, SkipForward, RotateCcw, Radio, Sparkles, User } from 'lucide-react';

interface NowPlayingDeckProps {
  playbackState: PlaybackState;
  currentPosition: number;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onRestartSegment: () => void;
  onToggleAutoAdvance: () => void;
}

export const NowPlayingDeck: React.FC<NowPlayingDeckProps> = ({
  playbackState,
  currentPosition,
  onPlay,
  onPause,
  onSkip,
  onRestartSegment,
  onToggleAutoAdvance,
}) => {
  const track = playbackState.currentTrack;
  const isPlaying = playbackState.status === 'PLAYING';

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  const startSec = track ? track.requestedStartSeconds : 0;
  const endSec = track ? track.requestedEndSeconds : 60;
  const segmentDuration = Math.max(1, endSec - startSec);
  const elapsedInSegment = Math.max(0, Math.min(segmentDuration, currentPosition - startSec));
  const progressPercent = Math.min(100, Math.max(0, (elapsedInSegment / segmentDuration) * 100));

  return (
    <div className="glass-panel p-6 rounded-3xl border border-dj-border relative overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Background neon ambient flare */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-dj-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-dj-magenta/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Deck Info */}
      <div className="flex items-center justify-between pb-4 border-b border-dj-border/60 z-10">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-full bg-dj-cyan/20 border border-dj-cyan text-dj-cyan text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 glow-cyan">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            DECK A • ON AIR
          </div>
          {track?.guestNickname && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-dj-card border border-dj-border text-slate-300 text-xs">
              <User className="w-3.5 h-3.5 text-dj-cyan" />
              <span>Requested by <strong className="text-white">{track.guestNickname}</strong></span>
            </div>
          )}
        </div>

        {/* Equalizer Visualizer */}
        <div className="flex items-end gap-1 h-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className={`w-1 bg-gradient-to-t from-dj-cyan to-dj-magenta rounded-full ${isPlaying ? 'eq-bar' : 'h-1.5 opacity-30'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Main Track Visuals & Turntable */}
      <div className="py-6 flex flex-col md:flex-row items-center gap-6 z-10">
        {/* Animated Vinyl Record */}
        <div className="relative w-36 h-36 flex-shrink-0 group">
          <div
            className={`w-full h-full rounded-full vinyl-grooves border-4 border-slate-800 shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''
              }`}
          >
            {/* Center Label with Thumbnail */}
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dj-cyan/60 relative">
              {track?.song.thumbnailUrl ? (
                <img
                  src={track.song.thumbnailUrl}
                  alt={track.song.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-[10px] text-dj-cyan font-bold">
                  OWN DJ
                </div>
              )}
              {/* Center spindle hole */}
              <div className="absolute inset-0 m-auto w-3 h-3 bg-slate-950 rounded-full border border-slate-700" />
            </div>
          </div>
        </div>

        {/* Track Title and Artist Details */}
        <div className="flex-1 text-center md:text-left min-w-0">
          <h2 className="text-2xl font-black text-white tracking-tight truncate leading-tight drop-shadow-sm">
            {track ? track.song.title : 'Queue is Empty'}
          </h2>
          <p className="text-sm font-medium text-dj-cyan truncate mt-1">
            {track?.song.channelTitle || 'Add tracks from YouTube to start the session'}
          </p>

          {/* Segment Details Pills */}
          {track && (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-3 font-mono text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-300">
                SEGMENT: <strong className="text-dj-cyan">{formatTime(startSec)} → {formatTime(endSec)}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-300">
                LENGTH: <strong className="text-white">{segmentDuration}s</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-400">
                TOTAL: {formatTime(track.song.durationSeconds)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress & Scrub Bar */}
      <div className="space-y-2 z-10">
        <div className="relative w-full h-3 bg-dj-card rounded-full overflow-hidden border border-dj-border/80">
          {/* Active progress fill */}
          <div
            className="h-full bg-gradient-to-r from-dj-cyan via-purple-500 to-dj-magenta transition-all duration-150 rounded-full glow-cyan"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span>{formatTime(currentPosition)}</span>
          <span className="text-dj-magenta font-semibold">
            -{formatTime(Math.max(0, endSec - currentPosition))} remaining in segment
          </span>
          <span>{formatTime(endSec)}</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="pt-6 border-t border-dj-border/60 flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          {/* Restart Segment */}
          <button
            onClick={onRestartSegment}
            disabled={!track}
            className="p-3 rounded-2xl bg-dj-card hover:bg-slate-800 text-slate-300 hover:text-white border border-dj-border transition-all active:scale-95 disabled:opacity-40"
            title="Restart current segment"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Main Big Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={!track && playbackState.status === 'IDLE'}
            className={`px-8 py-3.5 rounded-2xl font-bold flex items-center gap-3 tracking-wide transition-all shadow-lg active:scale-95 ${isPlaying
                ? 'bg-dj-magenta text-white glow-magenta hover:bg-pink-600'
                : 'bg-dj-cyan text-black glow-cyan hover:bg-cyan-400'
              }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Skip Song */}
          <button
            onClick={onSkip}
            disabled={!track}
            className="p-3 rounded-2xl bg-dj-card hover:bg-slate-800 text-slate-300 hover:text-white border border-dj-border transition-all active:scale-95 disabled:opacity-40"
            title="Skip to next song in queue"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Advance Queue Toggle */}
        <button
          onClick={onToggleAutoAdvance}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${playbackState.autoAdvance
              ? 'bg-dj-green/15 text-dj-green border-dj-green/40 glow-green'
              : 'bg-dj-card text-slate-400 border-dj-border'
            }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${playbackState.autoAdvance ? 'bg-dj-green animate-pulse' : 'bg-slate-600'
              }`}
          />
          AUTO-ADVANCE: {playbackState.autoAdvance ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};
