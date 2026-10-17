import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlaybackState, PlayerState, SongRequest } from '../../types';
import { api } from '../../services/api';
import { AlertCircle, Volume2, VolumeX, Play } from 'lucide-react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YouTubePlayerControllerProps {
  roomCode: string;
  hostToken: string;
  playbackState: PlaybackState;
  transitionDurationSeconds: number;
  onStateUpdate: (state: PlaybackState) => void;
  onPositionUpdate: (pos: number) => void;
}

export const YouTubePlayerController: React.FC<YouTubePlayerControllerProps> = ({
  roomCode,
  hostToken,
  playbackState,
  transitionDurationSeconds,
  onStateUpdate,
  onPositionUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);
  const transitionTimerRef = useRef<any>(null);
  const timePollerRef = useRef<any>(null);
  const currentTrackIdRef = useRef<string | null>(null);

  const [playerStatus, setPlayerStatus] = useState<PlayerState>('IDLE');
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);

  // Initialize YouTube IFrame Player
  useEffect(() => {
    let checkInterval: any = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;

      if (!playerRef.current && containerRef.current) {
        playerRef.current = new window.YT.Player(containerRef.current, {
          height: '100%',
          width: '100%',
          videoId: '',
          playerVars: {
            autoplay: 0,
            controls: 1, // Official YouTube player controls
            modestbranding: 1,
            rel: 0,
            fs: 1,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onReady: handlePlayerReady,
            onStateChange: handlePlayerStateChange,
            onError: handlePlayerError,
          },
        });
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timePollerRef.current) clearInterval(timePollerRef.current);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, []);

  const handlePlayerReady = () => {
    setPlayerStatus('READY');
    setPlayerError(null);
  };

  const handlePlayerStateChange = (event: any) => {
    if (!window.YT) return;

    switch (event.data) {
      case window.YT.PlayerState.PLAYING:
        setPlayerStatus('PLAYING');
        setAutoplayBlocked(false);
        setPlayerError(null);
        break;
      case window.YT.PlayerState.PAUSED:
        if (!isTransitioningRef.current) {
          setPlayerStatus('PAUSED');
        }
        break;
      case window.YT.PlayerState.BUFFERING:
        setPlayerStatus('LOADING');
        break;
      case window.YT.PlayerState.ENDED:
        // YouTube video reached absolute end before configured duration
        handleEndpointReached();
        break;
      default:
        break;
    }
  };

  const handlePlayerError = async (event: any) => {
    const errorCode = event.data;
    let message = 'Playback error occurred.';
    if (errorCode === 100) message = 'Video not found or removed.';
    if (errorCode === 101 || errorCode === 150) message = 'Playback restricted or embedding disallowed by owner.';

    console.warn(`[YouTubePlayer] Error code ${errorCode}: ${message}`);
    setPlayerError(message);
    setPlayerStatus('ERROR');

    // Auto-advance safely to prevent permanently stalling the queue
    try {
      const nextState = await api.reportPlayerError(
        roomCode,
        hostToken,
        playbackState.currentTrack?.id,
        errorCode,
        message
      );
      onStateUpdate(nextState);
    } catch (e) {
      console.error('Failed to report player error:', e);
    }
  };

  // High-frequency playback monitor (checks player current time against expected segment endpoint)
  useEffect(() => {
    if (timePollerRef.current) clearInterval(timePollerRef.current);

    if (playbackState.status === 'PLAYING' && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      timePollerRef.current = setInterval(() => {
        if (!playerRef.current || isTransitioningRef.current) return;

        try {
          const currentTime = playerRef.current.getCurrentTime();
          onPositionUpdate(currentTime);

          const track = playbackState.currentTrack;
          if (track) {
            const expectedEnd = track.requestedEndSeconds;
            // Check if segment endpoint reached
            if (currentTime >= expectedEnd - 0.25) {
              handleEndpointReached();
            }
          }
        } catch (e) {
          // player might be destroying or switching
        }
      }, 150);
    }

    return () => {
      if (timePollerRef.current) clearInterval(timePollerRef.current);
    };
  }, [playbackState.status, playbackState.currentTrack]);

  // Sequential Transition Execution
  const handleEndpointReached = useCallback(async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    setPlayerStatus('TRANSITIONING');

    const fadeMs = Math.max(500, (transitionDurationSeconds || 3) * 1000);
    const fadeSteps = 10;
    const stepInterval = Math.floor(fadeMs / 2 / fadeSteps);

    // Step 1: Smooth fade out volume where supported
    if (playerRef.current && typeof playerRef.current.getVolume === 'function') {
      const startVol = playerRef.current.getVolume();
      for (let i = fadeSteps; i >= 0; i--) {
        await new Promise((r) => setTimeout(r, stepInterval));
        if (playerRef.current?.setVolume) {
          playerRef.current.setVolume(Math.floor((startVol * i) / fadeSteps));
        }
      }
      playerRef.current.stopVideo();
    }

    try {
      // Step 2: Request backend to complete segment and give next track
      const nextState = await api.completeSegment(
        roomCode,
        hostToken,
        playbackState.currentTrack?.id,
        playbackState.transitionId
      );

      onStateUpdate(nextState);
    } catch (e) {
      console.error('Failed to complete segment:', e);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [roomCode, hostToken, playbackState, transitionDurationSeconds, onStateUpdate]);

  // Track playback state changes (load & play new tracks)
  useEffect(() => {
    const currentTrack = playbackState.currentTrack;
    if (!currentTrack || !playerRef.current || typeof playerRef.current.loadVideoById !== 'function') {
      return;
    }

    const isNewTrack = currentTrack.id !== currentTrackIdRef.current;
    if (isNewTrack) {
      currentTrackIdRef.current = currentTrack.id;
      setPlayerError(null);

      const videoId = currentTrack.song.youtubeVideoId;
      const startSeconds = currentTrack.requestedStartSeconds || 0;

      // Load new video sequentially and fade in
      playerRef.current.loadVideoById({
        videoId,
        startSeconds,
      });

      // Sequential fade-in
      const fadeMs = Math.max(500, (transitionDurationSeconds || 3) * 1000);
      const fadeSteps = 10;
      const stepInterval = Math.floor(fadeMs / 2 / fadeSteps);

      playerRef.current.setVolume(0);
      playerRef.current.playVideo();

      let step = 0;
      const fadeInInterval = setInterval(() => {
        step++;
        if (playerRef.current?.setVolume) {
          playerRef.current.setVolume(Math.floor((volume * step) / fadeSteps));
        }
        if (step >= fadeSteps) {
          clearInterval(fadeInInterval);
        }
      }, stepInterval);
    } else {
      // Play/Pause sync
      if (playbackState.status === 'PLAYING' && playerStatus !== 'PLAYING') {
        playerRef.current.playVideo();
      } else if (playbackState.status === 'PAUSED' && playerStatus !== 'PAUSED') {
        playerRef.current.pauseVideo();
      }
    }
  }, [playbackState.currentTrack?.id, playbackState.status]);

  // Volume control
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleManualPlayRecovery = () => {
    setAutoplayBlocked(false);
    if (playerRef.current?.playVideo) {
      playerRef.current.playVideo();
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden glass-panel border border-dj-border flex flex-col">
      {/* Autoplay block prompt banner */}
      {autoplayBlocked && (
        <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-dj-cyan/20 border-2 border-dj-cyan flex items-center justify-center mb-4 animate-bounce">
            <Play className="w-8 h-8 text-dj-cyan fill-dj-cyan ml-1" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Browser Autoplay Restricted</h3>
          <p className="text-sm text-slate-300 max-w-sm mb-6">
            Click below to initialize the audio engine and start playback for your live session.
          </p>
          <button
            onClick={handleManualPlayRecovery}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-dj-cyan to-dj-magenta text-black font-bold text-sm tracking-wide shadow-lg glow-cyan hover:scale-105 transition-all"
          >
            Start DJ Audio Engine
          </button>
        </div>
      )}

      {/* Error state overlay */}
      {playerError && (
        <div className="absolute top-4 left-4 right-4 z-20 bg-red-950/80 border border-red-500/40 rounded-xl p-3 flex items-center gap-3 text-red-200 text-xs">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Playback Notice: </span>
            {playerError} Skipping to next track automatically...
          </div>
        </div>
      )}

      {/* Active Transition indicator */}
      {playerStatus === 'TRANSITIONING' && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-dj-magenta/30 border border-dj-magenta text-dj-magenta text-xs font-semibold flex items-center gap-2 glow-magenta animate-pulse">
          <div className="w-2 h-2 rounded-full bg-dj-magenta animate-ping" />
          Sequential Transition Active
        </div>
      )}

      {/* Official YouTube IFrame Player Container */}
      <div className="flex-1 w-full min-h-[220px] bg-black">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {/* DJ Player HUD Footer Controls */}
      <div className="p-3 bg-dj-surface/90 border-t border-dj-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-lg bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-dj-cyan" />}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
            className="w-24 h-1.5 bg-dj-border rounded-lg cursor-pointer"
          />
          <span className="text-xs text-slate-400 font-mono w-8">{isMuted ? 0 : volume}%</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">STATUS:</span>
          <span
            className={`px-2 py-0.5 rounded font-bold uppercase ${playerStatus === 'PLAYING'
                ? 'bg-dj-green/20 text-dj-green border border-dj-green/40'
                : playerStatus === 'TRANSITIONING'
                  ? 'bg-dj-magenta/20 text-dj-magenta border border-dj-magenta/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
          >
            {playerStatus}
          </span>
        </div>
      </div>
    </div>
  );
};
