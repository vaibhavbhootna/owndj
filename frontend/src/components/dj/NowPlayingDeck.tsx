import React, { useState, useEffect } from 'react';
import { PlaybackState, SongRequest } from '../../types';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Radio,
  Sparkles,
  User,
  Clock,
  Scissors,
  Check,
  ChevronRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface NowPlayingDeckProps {
  playbackState: PlaybackState;
  currentPosition: number;
  defaultSongDurationSeconds?: number;
  onPlay: () => void;
  onPause: () => void;
  onSkip: () => void;
  onRestartSegment: () => void;
  onToggleAutoAdvance: () => void;
  onSetStartTime?: (startSeconds: number) => void;
  onSetEndTime?: (endSeconds: number) => void;
  onUpdateDefaultSwitchTime?: (seconds: number) => void;
  onOpenSettings?: (tab?: 'PLAYBACK' | 'REQUESTS' | 'BRANDING' | 'MOBILE') => void;
  onSeek?: (seconds: number) => void;
}

export const NowPlayingDeck: React.FC<NowPlayingDeckProps> = ({
  playbackState,
  currentPosition,
  defaultSongDurationSeconds = 60,
  onPlay,
  onPause,
  onSkip,
  onRestartSegment,
  onToggleAutoAdvance,
  onSetStartTime,
  onSetEndTime,
  onUpdateDefaultSwitchTime,
  onOpenSettings,
  onSeek,
}) => {
  const track = playbackState.currentTrack;
  const isPlaying = playbackState.status === 'PLAYING';
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  const totalDuration = track?.song?.durationSeconds || 180;
  const startSec = track ? track.requestedStartSeconds : 0;
  const endSec = track
    ? (track.requestedEndSeconds || startSec + (defaultSongDurationSeconds > 0 ? defaultSongDurationSeconds : 60))
    : 60;
  const segmentDuration = Math.max(1, endSec - startSec);
  const elapsedInSegment = Math.max(0, Math.min(segmentDuration, currentPosition - startSec));
  const progressPercent = Math.min(100, Math.max(0, (elapsedInSegment / segmentDuration) * 100));

  // Global Timeline percentage for full track bar
  const totalTrackPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (currentPosition / totalDuration) * 100)) : 0;
  const startMarkerPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (startSec / totalDuration) * 100)) : 0;
  const endMarkerPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (endSec / totalDuration) * 100)) : 100;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Shortcut Actions
  const handleMarkStart = () => {
    if (!track) return;
    const newStart = Math.max(0, Math.floor(currentPosition));
    onSetStartTime?.(newStart);
    showToast(`🟢 Start Time marked at ${formatTime(newStart)}`);
  };

  const handleMarkEnd = () => {
    if (!track) return;
    const newEnd = Math.max(startSec + 5, Math.floor(currentPosition));
    onSetEndTime?.(newEnd);
    showToast(`🔴 End Time marked at ${formatTime(newEnd)} (Duration: ${newEnd - startSec}s)`);
  };

  const handleAuditionCue = () => {
    if (!track) return;
    onSeek?.(startSec);
    if (!isPlaying) onPlay();
    showToast(`▶️ Auditioning from Cue In (${formatTime(startSec)})`);
  };

  const handleResetToFull = () => {
    if (!track) return;
    onSetStartTime?.(0);
    onSetEndTime?.(totalDuration);
    showToast(`Full track mode enabled (${formatTime(totalDuration)})`);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!track || totalDuration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSecond = Math.floor(ratio * totalDuration);
    onSeek?.(targetSecond);
  };

  // Keyboard Shortcuts (I, O, Space, N, R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === 'i' || e.key === 'I' || e.key === '[') {
        e.preventDefault();
        handleMarkStart();
      } else if (e.key === 'o' || e.key === 'O' || e.key === ']') {
        e.preventDefault();
        handleMarkEnd();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) onPause();
        else onPlay();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRestartSegment();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [track, currentPosition, isPlaying, startSec, endSec, totalDuration]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-dj-border relative overflow-hidden flex flex-col justify-between shadow-2xl">
      {/* Background neon ambient flare */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-dj-cyan/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-dj-magenta/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Deck Info */}
      <div className="flex items-center justify-between pb-3.5 border-b border-dj-border/60 z-10">
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
      <div className="py-5 flex flex-col md:flex-row items-center gap-6 z-10">
        {/* Animated Vinyl Record */}
        <div className="relative w-32 h-32 flex-shrink-0 group">
          <div
            className={`w-full h-full rounded-full vinyl-grooves border-4 border-slate-800 shadow-2xl flex items-center justify-center ${isPlaying ? 'animate-spin-slow' : ''
              }`}
          >
            {/* Center Label with Thumbnail */}
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-dj-cyan/60 relative">
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
              <div className="absolute inset-0 m-auto w-2.5 h-2.5 bg-slate-950 rounded-full border border-slate-700" />
            </div>
          </div>
        </div>

        {/* Track Title and Artist Details */}
        <div className="flex-1 text-center md:text-left min-w-0">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate leading-tight drop-shadow-sm">
            {track ? track.song.title : 'Queue is Empty'}
          </h2>
          <p className="text-sm font-medium text-dj-cyan truncate mt-0.5">
            {track?.song.channelTitle || 'Add tracks from YouTube to start the session'}
          </p>

          {/* Segment Details Pills */}
          {track && (
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2.5 font-mono text-xs">
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-300">
                START: <strong className="text-emerald-400">{formatTime(startSec)}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-300">
                END: <strong className="text-rose-400">{formatTime(endSec)}</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-300">
                LENGTH: <strong className="text-white">{segmentDuration}s</strong>
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-dj-card border border-dj-border text-slate-400">
                FULL: {formatTime(totalDuration)}
              </span>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => onOpenSettings('PLAYBACK')}
                  className="px-2.5 py-0.5 rounded-md bg-dj-magenta/15 hover:bg-dj-magenta/25 border border-dj-magenta/40 text-dj-magenta hover:text-white flex items-center gap-1 transition-all active:scale-95"
                  title="Configure Song Switch Time & Transitions in Event Settings"
                >
                  <Clock className="w-3 h-3" />
                  <span>SWITCH: <strong className="text-white">{defaultSongDurationSeconds === 0 ? 'FULL' : `${defaultSongDurationSeconds}s`}</strong></span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cue Points Shortcut Bar (Play song & shortcut buttons to select start and end time) */}
      <div className="my-2 p-3 bg-dj-card/70 border border-dj-border rounded-2xl z-10 flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400 flex items-center gap-1.5 font-bold uppercase text-[11px]">
            <Scissors className="w-3.5 h-3.5 text-dj-cyan" />
            Live Cue Shortcuts:
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-black border border-slate-700 text-slate-300">I</kbd> for Start, <kbd className="px-1.5 py-0.5 rounded bg-black border border-slate-700 text-slate-300">O</kbd> for End
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Mark Start Button */}
          <button
            onClick={handleMarkStart}
            disabled={!track}
            className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            title="Mark current playing time as start cue point (Shortcut: I or [)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Set Start [I]</span>
            <span className="font-mono text-[10px] opacity-80">({formatTime(currentPosition)})</span>
          </button>

          {/* Mark End Button */}
          <button
            onClick={handleMarkEnd}
            disabled={!track}
            className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            title="Mark current playing time as end cue point (Shortcut: O or ])"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            <span>Set End [O]</span>
            <span className="font-mono text-[10px] opacity-80">({formatTime(currentPosition)})</span>
          </button>

          {/* Audition In-to-Out */}
          <button
            onClick={handleAuditionCue}
            disabled={!track}
            className="py-2 px-3 rounded-xl bg-dj-cyan/15 hover:bg-dj-cyan/25 border border-dj-cyan/40 text-dj-cyan font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            title="Replay from marked Start point"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Audition Cue</span>
          </button>

          {/* Reset to Full Song */}
          <button
            onClick={handleResetToFull}
            disabled={!track}
            className="py-2 px-3 rounded-xl bg-dj-surface hover:bg-slate-700 border border-dj-border text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-40"
            title="Remove cues and play full song"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Full Song</span>
          </button>
        </div>

        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div className="py-1 px-3 rounded-lg bg-black/80 border border-dj-cyan/50 text-dj-cyan text-xs font-mono font-medium text-center animate-fadeIn">
            {toastMessage}
          </div>
        )}
      </div>

      {/* Progress & Scrub Bar with Visual Cue In/Out markers */}
      <div className="space-y-1.5 z-10 pt-2">
        <div
          onClick={handleTimelineClick}
          className="relative w-full h-4 bg-slate-900 rounded-full cursor-pointer border border-dj-border/90 group"
          title="Click to seek to any position in the song"
        >
          {/* Marked Cue Segment span */}
          <div
            className="absolute top-0 bottom-0 bg-dj-cyan/25 border-l-2 border-r-2 border-l-emerald-400 border-r-rose-400 rounded-sm pointer-events-none"
            style={{
              left: `${startMarkerPercent}%`,
              width: `${Math.max(0, endMarkerPercent - startMarkerPercent)}%`,
            }}
          />

          {/* Active playhead progress fill */}
          <div
            className="h-full bg-gradient-to-r from-dj-cyan via-purple-500 to-dj-magenta rounded-full glow-cyan pointer-events-none transition-all duration-150"
            style={{ width: `${totalTrackPercent}%` }}
          />

          {/* Current playhead knob on hover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg border-2 border-dj-cyan pointer-events-none transition-all"
            style={{ left: `calc(${totalTrackPercent}% - 7px)` }}
          />
        </div>

        <div className="flex justify-between items-center text-xs font-mono text-slate-400">
          <span className="text-emerald-400 font-bold">
            [{formatTime(startSec)}]
          </span>
          <span className="text-white font-semibold">
            {formatTime(currentPosition)}
            <span className="text-slate-500 ml-1">
              (-{formatTime(Math.max(0, endSec - currentPosition))} in cut)
            </span>
          </span>
          <span className="text-rose-400 font-bold">
            [{formatTime(endSec)}]
          </span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="pt-4 border-t border-dj-border/60 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2.5">
          {/* Restart Segment */}
          <button
            onClick={onRestartSegment}
            disabled={!track}
            className="p-3 rounded-2xl bg-dj-card hover:bg-slate-800 text-slate-300 hover:text-white border border-dj-border transition-all active:scale-95 disabled:opacity-40"
            title="Restart current segment (Shortcut: R)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {/* Main Big Play / Pause */}
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={!track && playbackState.status === 'IDLE'}
            className={`px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2.5 tracking-wide transition-all shadow-lg active:scale-95 ${
              isPlaying
                ? 'bg-dj-magenta text-white glow-magenta hover:bg-pink-600'
                : 'bg-dj-cyan text-black glow-cyan hover:bg-cyan-400'
            }`}
            title="Toggle Play / Pause (Shortcut: Space)"
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
            title="Skip to next song (Shortcut: N)"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Advance Queue Toggle */}
        <button
          onClick={onToggleAutoAdvance}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all border ${
            playbackState.autoAdvance
              ? 'bg-dj-green/15 text-dj-green border-dj-green/40 glow-green'
              : 'bg-dj-card text-slate-400 border-dj-border'
          }`}
          title="When ON, automatically transitions to next song when segment finishes"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              playbackState.autoAdvance ? 'bg-dj-green animate-pulse' : 'bg-slate-600'
            }`}
          />
          AUTO-ADVANCE: {playbackState.autoAdvance ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
};
