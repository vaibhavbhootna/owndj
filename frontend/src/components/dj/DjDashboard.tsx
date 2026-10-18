import React, { useState, useEffect, useCallback } from 'react';
import { Session, SessionSettings, SongRequest, PlaybackState, EventDJTrack } from '../../types';
import { NowPlayingDeck } from './NowPlayingDeck';
import { DJDeckManager } from './DJDeckManager';
import { GuestRequestsTab } from './GuestRequestsTab';
import { NowPlayingHistoryTab } from './NowPlayingHistoryTab';
import { DJLibraryModal } from './DJLibraryModal';
import { EventSettingsModal } from './EventSettingsModal';
import { ProjectorControlModal } from './ProjectorControlModal';
import { YouTubePlayerController } from '../player/YouTubePlayerController';
import { QrModal } from './QrModal';
import { ProjectorScreen } from '../projector/ProjectorScreen';
import { api } from '../../services/api';
import { wsService } from '../../services/websocket';
import {
  Sliders,
  QrCode,
  Users,
  Radio,
  LogOut,
  Sparkles,
  Music,
  Tv,
  BookOpen,
  Calendar,
  ListMusic,
  History,
  Key,
  Copy,
  Check,
  ExternalLink,
  Maximize2,
  Minimize2,
  MonitorPlay,
  Play,
  Flame,
} from 'lucide-react';

interface DjDashboardProps {
  session: Session;
  hostToken: string;
  queue: SongRequest[];
  playbackState: PlaybackState;
  qrDataUrl: string;
  onRefreshSession: () => void;
  onRefreshQueue: () => void;
  onUpdatePlaybackState: (state: PlaybackState) => void;
  onUpdateQrDataUrl?: (url: string) => void;
  onNavigateToEvents?: () => void;
  onEndSession: () => void;
}

export const DjDashboard: React.FC<DjDashboardProps> = ({
  session,
  hostToken,
  queue,
  playbackState,
  qrDataUrl,
  onRefreshSession,
  onRefreshQueue,
  onUpdatePlaybackState,
  onUpdateQrDataUrl,
  onNavigateToEvents,
  onEndSession,
}) => {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'DECK' | 'REQUESTS' | 'HISTORY' | 'SCREEN'>('DECK');

  // Presentation Screen & DJ Passcode state
  const [showPiPPresentation, setShowPiPPresentation] = useState(false);
  const [isPiPExpanded, setIsPiPExpanded] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  // Modals
  const [isEventSettingsOpen, setIsEventSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'PLAYBACK' | 'REQUESTS' | 'BRANDING' | 'MOBILE'>('PLAYBACK');
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isProjectorModalOpen, setIsProjectorModalOpen] = useState(false);

  // Guest Request Auto-Transition Countdown
  const [requestCountdown, setRequestCountdown] = useState<number | null>(null);
  const [dismissedRequestId, setDismissedRequestId] = useState<string | null>(null);

  const handleCopyPasscode = () => {
    if (!session.djPasscode) return;
    navigator.clipboard.writeText(session.djPasscode);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  // Active DJ Deck state
  const [deck, setDeck] = useState<EventDJTrack[]>([]);
  const [guestRequestsPaused, setGuestRequestsPaused] = useState<boolean>(
    session.guestRequestsPaused || false
  );

  const fetchDeck = useCallback(async () => {
    try {
      const data = await api.getDeck(session.roomCode);
      setDeck(data);
    } catch (err) {
      console.warn('Failed to load DJ Deck:', err);
    }
  }, [session.roomCode]);

  useEffect(() => {
    fetchDeck();

    const unsubDeck = wsService.subscribe('DJ_DECK_UPDATED', (event) => {
      if (Array.isArray(event.payload)) {
        setDeck(event.payload);
      } else {
        fetchDeck();
      }
    });

    return () => {
      unsubDeck();
    };
  }, [session.roomCode, fetchDeck]);

  // Playback transport actions
  const handlePlay = async () => {
    try {
      const state = await api.resumePlayback(session.roomCode, hostToken);
      onUpdatePlaybackState(state);
    } catch (e) {
      console.error('Failed to play track:', e);
    }
  };

  const handlePause = async () => {
    try {
      const state = await api.pausePlayback(session.roomCode, hostToken);
      onUpdatePlaybackState(state);
    } catch (e) {
      console.error('Failed to pause track:', e);
    }
  };

  const handleSkip = useCallback(async () => {
    try {
      const state = await api.skipTrack(session.roomCode, hostToken);
      onUpdatePlaybackState(state);
    } catch (e) {
      console.error('Failed to skip track:', e);
    }
  }, [session.roomCode, hostToken, onUpdatePlaybackState]);

  // Playable guest requests (approved or auto-approved pending)
  const playableRequests = queue.filter(
    (r) => r.status === 'APPROVED' || (session.settings.autoApproveRequests && r.status === 'PENDING')
  );
  const activeIncomingRequest = playableRequests.length > 0 ? playableRequests[0] : null;

  const isPlayingDeck =
    playbackState.status === 'PLAYING' &&
    (playbackState.playlistSource === 'DJ_DECK' || playbackState.playlistSource === 'DJ_LIBRARY_SINGLE');

  // Trigger countdown when a request arrives while DJ deck is playing
  useEffect(() => {
    const delaySec = session.settings.requestTransitionDelaySeconds ?? 15;
    // If feature disabled (-1) or no playable request or not playing DJ deck
    if (delaySec < 0 || !activeIncomingRequest || !isPlayingDeck) {
      if (requestCountdown !== null) setRequestCountdown(null);
      return;
    }

    // If user already dismissed this specific request to let current song finish
    if (dismissedRequestId === activeIncomingRequest.id) {
      return;
    }

    // If delay is 0, transition immediately
    if (delaySec === 0) {
      handleSkip();
      return;
    }

    // Start countdown if not already running
    if (requestCountdown === null) {
      setRequestCountdown(delaySec);
    }
  }, [
    activeIncomingRequest,
    isPlayingDeck,
    session.settings.requestTransitionDelaySeconds,
    dismissedRequestId,
    requestCountdown,
    handleSkip,
  ]);

  // Countdown tick
  useEffect(() => {
    if (requestCountdown === null) return;

    if (requestCountdown <= 0) {
      setRequestCountdown(null);
      handleSkip();
      return;
    }

    const timer = setInterval(() => {
      setRequestCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [requestCountdown, handleSkip]);

  const handleDismissRequestTransition = () => {
    if (activeIncomingRequest) {
      setDismissedRequestId(activeIncomingRequest.id);
    }
    setRequestCountdown(null);
  };

  const handleImmediateRequestTransition = () => {
    setRequestCountdown(null);
    handleSkip();
  };

  const handleRestartSegment = () => {
    if (playbackState.currentTrack) {
      setCurrentPosition(playbackState.currentTrack.requestedStartSeconds);
      setSeekTarget(playbackState.currentTrack.requestedStartSeconds);
    }
  };

  const handleSeek = (pos: number) => {
    setSeekTarget(pos);
  };

  const handleSetStartTime = async (startSeconds: number) => {
    if (!playbackState.currentTrack) return;
    const currentTrack = playbackState.currentTrack;
    const updatedTrack = {
      ...currentTrack,
      requestedStartSeconds: startSeconds,
    };
    onUpdatePlaybackState({
      ...playbackState,
      currentTrack: updatedTrack,
    });
    setSeekTarget(startSeconds);

    if (playbackState.djDeckTrackId) {
      try {
        await api.updateDeckTrack(session.roomCode, playbackState.djDeckTrackId, hostToken, {
          startSeconds,
        });
        fetchDeck();
      } catch (err) {
        console.warn('Failed to persist start cue to deck track:', err);
      }
    }
  };

  const handleSetEndTime = async (endSeconds: number) => {
    if (!playbackState.currentTrack) return;
    const currentTrack = playbackState.currentTrack;
    const updatedTrack = {
      ...currentTrack,
      requestedEndSeconds: endSeconds,
    };
    onUpdatePlaybackState({
      ...playbackState,
      currentTrack: updatedTrack,
    });

    if (playbackState.djDeckTrackId) {
      const startSec = currentTrack.requestedStartSeconds || 0;
      const durationSecs = Math.max(5, Math.floor(endSeconds - startSec));
      try {
        await api.updateDeckTrack(session.roomCode, playbackState.djDeckTrackId, hostToken, {
          durationSeconds: durationSecs,
        });
        fetchDeck();
      } catch (err) {
        console.warn('Failed to persist duration to deck track:', err);
      }
    }
  };

  const handleUpdateDefaultSwitchTime = async (seconds: number) => {
    try {
      const newSettings = {
        ...session.settings,
        defaultSongDurationSeconds: seconds,
      };
      await api.updateSettings(session.roomCode, hostToken, newSettings);
      onRefreshSession();

      if (playbackState.currentTrack) {
        const startSec = playbackState.currentTrack.requestedStartSeconds || 0;
        const totalDuration = playbackState.currentTrack.song?.durationSeconds || 180;
        const newEndSec = seconds > 0 ? startSec + seconds : totalDuration;
        const updatedTrack = {
          ...playbackState.currentTrack,
          requestedEndSeconds: newEndSec,
        };
        onUpdatePlaybackState({
          ...playbackState,
          currentTrack: updatedTrack,
        });
      }
    } catch (err) {
      console.error('Failed to update default song switch time:', err);
    }
  };

  const handleToggleAutoAdvance = async () => {
    try {
      const newSettings = {
        ...session.settings,
        autoAdvance: !session.settings.autoAdvance,
      };
      await api.updateSettings(session.roomCode, hostToken, newSettings);
      onRefreshSession();
    } catch (e) {
      console.error('Failed to toggle auto advance:', e);
    }
  };

  const handleSaveSettings = async (newSettings: SessionSettings) => {
    try {
      await api.updateSettings(session.roomCode, hostToken, newSettings);
      onRefreshSession();
    } catch (e) {
      console.error('Failed to update settings:', e);
    }
  };

  const handleTogglePauseRequests = async (paused: boolean) => {
    setGuestRequestsPaused(paused);
    try {
      await api.updateEventDetails(session.roomCode, hostToken, {
        guestRequestsPaused: paused,
      });
      onRefreshSession();
    } catch (e) {
      console.error('Failed to update guest requests pause state:', e);
    }
  };

  return (
    <div className="min-h-screen bg-dj-bg text-slate-100 flex flex-col">
      {/* Top Professional DJ Header */}
      <header className="bg-dj-surface/90 border-b border-dj-border px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-dj-cyan to-dj-magenta flex items-center justify-center text-black font-black text-base shadow-lg glow-cyan">
            DJ
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black text-white tracking-tight">{session.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-dj-green/15 border border-dj-green/40 text-dj-green text-[11px] font-mono font-bold flex items-center gap-1.5 glow-green">
                <span className="w-2 h-2 rounded-full bg-dj-green animate-pulse" />
                LIVE
              </span>
              {session.eventType && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700">
                  {session.eventType}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs font-mono text-slate-400">
                ROOM: <strong className="text-dj-cyan font-extrabold tracking-widest">{session.roomCode}</strong>
              </p>
              {session.djPasscode && (
                <button
                  type="button"
                  onClick={handleCopyPasscode}
                  className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold flex items-center gap-1 transition-all"
                  title="DJ Mobile Phone Passcode. Click to copy."
                >
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>PIN: <strong className="text-white tracking-wider">{session.djPasscode}</strong></span>
                  {copiedPasscode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-400/60" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Guest Count */}
          <div className="px-3 py-1.5 rounded-xl bg-dj-card border border-dj-border flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Users className="w-3.5 h-3.5 text-dj-cyan" />
            <span>{session.guestCount} {session.guestCount === 1 ? 'Guest' : 'Guests'}</span>
          </div>

          {/* TV Presentation Screen Toggle (Floating PiP view) */}
          <button
            onClick={() => setShowPiPPresentation((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              showPiPPresentation
                ? 'bg-dj-cyan text-black border-dj-cyan shadow-cyan glow-cyan'
                : 'bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border-dj-border'
            }`}
            title="Toggle Live Presentation TV Screen preview (Picture-in-Picture)"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">TV Preview</span>
          </button>

          {/* Projector Controls Modal Trigger */}
          <button
            onClick={() => setIsProjectorModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-black font-bold text-xs border border-purple-500/50 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Configure Projector Scenes & Announcements"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Projector Mode</span>
          </button>

          {/* Events Hub Button */}
          {onNavigateToEvents && (
            <button
              onClick={onNavigateToEvents}
              className="px-3 py-1.5 rounded-xl bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border border-dj-border font-bold text-xs flex items-center gap-1.5 transition-all"
              title="View all running events & sessions"
            >
              <Radio className="w-3.5 h-3.5 text-dj-cyan" />
              <span className="hidden sm:inline">Events Hub</span>
            </button>
          )}

          {/* Reusable DJ Library Modal Trigger */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border border-dj-border font-bold text-xs flex items-center gap-1.5 transition-all"
            title="Browse & load pre-made DJ Sets"
          >
            <BookOpen className="w-3.5 h-3.5 text-dj-cyan" />
            <span>DJ Sets</span>
          </button>

          {/* QR Code Share Modal Trigger */}
          <button
            onClick={() => setIsQrOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-dj-cyan/20 hover:bg-dj-cyan text-dj-cyan hover:text-black font-bold text-xs border border-dj-cyan/60 flex items-center gap-1.5 transition-all glow-cyan active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Share QR</span>
          </button>

          {/* Unified Event & DJ Settings Trigger */}
          <button
            onClick={() => {
              setSettingsInitialTab('PLAYBACK');
              setIsEventSettingsOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border border-dj-border font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Event & DJ Settings (Playback mixing, guest requests, visual branding, remote PIN)"
          >
            <Sliders className="w-3.5 h-3.5 text-dj-cyan" />
            <span className="hidden md:inline">Settings</span>
          </button>

          {/* End Session Button */}
          <button
            onClick={onEndSession}
            className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-500/40 transition-colors"
            title="End session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main DJ Mixing Dashboard View */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Deck & Player Hardware (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Guest Request Arrival Countdown Transition Banner */}
          {requestCountdown !== null && activeIncomingRequest && (
            <div className="relative overflow-hidden rounded-2xl border-2 border-dj-magenta/80 bg-gradient-to-r from-dj-magenta/25 via-purple-950/60 to-black p-4 shadow-2xl backdrop-blur-xl animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-dj-magenta/20 border border-dj-magenta/50 flex items-center justify-center text-dj-magenta flex-shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-dj-magenta text-white font-mono text-[10px] font-black uppercase tracking-wider">
                        Guest Request Ready
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        Switching in <strong className="text-dj-cyan font-extrabold text-sm">{requestCountdown}s</strong>
                      </span>
                    </div>
                    <h4 className="font-extrabold text-white text-sm truncate mt-0.5">
                      {activeIncomingRequest.song.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">
                      Requested by <span className="text-dj-cyan font-semibold">{activeIncomingRequest.guestNickname}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleImmediateRequestTransition}
                    className="px-3.5 py-1.5 rounded-xl bg-dj-cyan hover:bg-cyan-300 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-md glow-cyan transition-all active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Switch Now</span>
                  </button>
                  <button
                    onClick={handleDismissRequestTransition}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition-all active:scale-95"
                    title="Let current DJ song finish before playing this request"
                  >
                    <span>Let Song Finish</span>
                  </button>
                </div>
              </div>

              {/* Countdown Progress Bar */}
              <div className="mt-3 w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-dj-cyan to-dj-magenta transition-all duration-1000 ease-linear rounded-full"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (requestCountdown / (session.settings.requestTransitionDelaySeconds || 15)) * 100
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Deck Transport Panel */}
          <NowPlayingDeck
            playbackState={playbackState}
            currentPosition={currentPosition}
            defaultSongDurationSeconds={session.settings.defaultSongDurationSeconds ?? 60}
            onPlay={handlePlay}
            onPause={handlePause}
            onSkip={handleSkip}
            onRestartSegment={handleRestartSegment}
            onToggleAutoAdvance={handleToggleAutoAdvance}
            onSetStartTime={handleSetStartTime}
            onSetEndTime={handleSetEndTime}
            onUpdateDefaultSwitchTime={handleUpdateDefaultSwitchTime}
            onOpenSettings={(tab) => {
              setSettingsInitialTab(tab || 'PLAYBACK');
              setIsEventSettingsOpen(true);
            }}
            onSeek={handleSeek}
          />

          {/* Player Controller Engine */}
          <div className="h-64 sm:h-72">
            <YouTubePlayerController
              roomCode={session.roomCode}
              hostToken={hostToken}
              playbackState={playbackState}
              transitionDurationSeconds={session.settings.defaultTransitionDurationSeconds || 3}
              seekToSeconds={seekTarget}
              onSeekCompleted={() => setSeekTarget(null)}
              onStateUpdate={onUpdatePlaybackState}
              onPositionUpdate={(pos) => setCurrentPosition(pos)}
            />
          </div>
        </div>

        {/* Right Column: 4 Tabbed Workspaces (6 cols) */}
        <div className="lg:col-span-6 flex flex-col h-[calc(100vh-125px)] min-h-[620px] lg:sticky lg:top-24">
          {/* 4 Workspace Tabs Navigation */}
          <div className="flex items-center gap-1.5 mb-3 bg-dj-card/40 p-1.5 rounded-2xl border border-dj-border flex-shrink-0">
            <button
              onClick={() => setActiveTab('DECK')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'DECK'
                  ? 'bg-dj-cyan text-black shadow-md glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>Deck ({deck.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'REQUESTS'
                  ? 'bg-dj-magenta text-white shadow-md glow-magenta'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Requests ({queue.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab('SCREEN')}
              className={`flex-1 py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'SCREEN'
                  ? 'bg-gradient-to-r from-dj-cyan via-purple-600 to-dj-magenta text-white shadow-md glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
              title="Show Presentation Screen on DJ dashboard"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>TV Screen</span>
            </button>
          </div>

          {/* Active Tab Workspace View */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {activeTab === 'DECK' && (
              <DJDeckManager
                roomCode={session.roomCode}
                hostToken={hostToken}
                deck={deck}
                onDeckUpdated={fetchDeck}
                onOpenLibrary={() => setIsLibraryOpen(true)}
                currentTrackId={playbackState.djDeckTrackId}
                currentPosition={currentPosition}
                onSeek={handleSeek}
                defaultSongDurationSeconds={session.settings.defaultSongDurationSeconds ?? 60}
                onUpdateDefaultSwitchTime={handleUpdateDefaultSwitchTime}
              />
            )}

            {activeTab === 'REQUESTS' && (
              <GuestRequestsTab
                roomCode={session.roomCode}
                hostToken={hostToken}
                requests={queue}
                onRequestsUpdated={onRefreshQueue}
                guestRequestsPaused={guestRequestsPaused}
                onTogglePauseRequests={handleTogglePauseRequests}
                currentTrackId={playbackState.currentTrack?.id}
              />
            )}

            {activeTab === 'HISTORY' && (
              <NowPlayingHistoryTab
                roomCode={session.roomCode}
                playbackState={playbackState}
              />
            )}

            {activeTab === 'SCREEN' && (
              <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-dj-border shadow-2xl relative flex flex-col bg-black">
                <div className="p-2.5 bg-dj-card/90 border-b border-dj-border flex items-center justify-between text-xs font-semibold px-4">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Tv className="w-4 h-4 text-dj-cyan" />
                    <span>Presentation Screen Preview (Crowd Projector View)</span>
                  </div>
                  <a
                    href={`/projector/${session.roomCode}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-dj-cyan hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    <span>Full Tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden relative">
                  <ProjectorScreen roomCode={session.roomCode} isEmbedded={true} hostToken={hostToken} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Picture-in-Picture TV Presentation Screen */}
      {showPiPPresentation && (
        <div
          className={`fixed z-40 transition-all duration-300 shadow-2xl rounded-2xl border-2 border-dj-cyan/70 overflow-hidden bg-black flex flex-col backdrop-blur-xl ${
            isPiPExpanded
              ? 'bottom-6 right-6 w-[640px] h-[390px] max-w-[95vw] max-h-[70vh]'
              : 'bottom-6 right-6 w-[380px] h-[230px] max-w-[90vw]'
          }`}
        >
          {/* PiP Header */}
          <div className="px-3 py-2 bg-slate-900/95 border-b border-white/10 flex items-center justify-between text-xs select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-dj-cyan" /> Presentation Screen
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsPiPExpanded(!isPiPExpanded)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isPiPExpanded ? 'Standard PiP size' : 'Expand preview'}
              >
                {isPiPExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <a
                href={`/projector/${session.roomCode}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Open in new browser tab / second screen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setShowPiPPresentation(false)}
                className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors ml-1"
                title="Close PiP preview"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Embedded Live Projector Screen */}
          <div className="flex-1 min-h-0 relative overflow-hidden bg-[#05050c]">
            <ProjectorScreen roomCode={session.roomCode} isEmbedded={true} hostToken={hostToken} />
          </div>
        </div>
      )}

      {/* Unified Event & DJ Settings Modal */}
      <EventSettingsModal
        isOpen={isEventSettingsOpen}
        onClose={() => setIsEventSettingsOpen(false)}
        session={session}
        hostToken={hostToken}
        initialTab={settingsInitialTab}
        onSessionUpdated={(updated) => {
          onRefreshSession();
        }}
        onSettingsUpdated={(newSettings) => {
          onRefreshSession();
        }}
      />

      {/* Reusable DJ Sets Modal */}
      <DJLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        roomCode={session.roomCode}
        hostToken={hostToken}
        onPlaylistLoaded={fetchDeck}
      />

      {/* Projector Scenes & Announcements Control Modal */}
      <ProjectorControlModal
        isOpen={isProjectorModalOpen}
        onClose={() => setIsProjectorModalOpen(false)}
        session={session}
        hostToken={hostToken}
      />

      {/* QR Code Share Modal */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        roomCode={session.roomCode}
        qrCodeDataUrl={qrDataUrl}
        djPasscode={session.djPasscode}
        onQrCodeUpdated={onUpdateQrDataUrl}
      />
    </div>
  );
};
