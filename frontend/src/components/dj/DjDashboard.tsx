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
import { SettingsModal } from './SettingsModal';
import { QrModal } from './QrModal';
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
  onEndSession,
}) => {
  const [currentPosition, setCurrentPosition] = useState(0);
  const [activeTab, setActiveTab] = useState<'DECK' | 'REQUESTS' | 'HISTORY'>('DECK');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEventSettingsOpen, setIsEventSettingsOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isProjectorModalOpen, setIsProjectorModalOpen] = useState(false);

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

  const handleSkip = async () => {
    try {
      const state = await api.skipTrack(session.roomCode, hostToken);
      onUpdatePlaybackState(state);
    } catch (e) {
      console.error('Failed to skip track:', e);
    }
  };

  const handleRestartSegment = () => {
    if (playbackState.currentTrack) {
      setCurrentPosition(playbackState.currentTrack.requestedStartSeconds);
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
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              ROOM CODE: <strong className="text-dj-cyan font-extrabold tracking-widest">{session.roomCode}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Guest Count */}
          <div className="px-3 py-1.5 rounded-xl bg-dj-card border border-dj-border flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Users className="w-3.5 h-3.5 text-dj-cyan" />
            <span>{session.guestCount} {session.guestCount === 1 ? 'Guest' : 'Guests'}</span>
          </div>

          {/* Projector Controls Modal Trigger */}
          <button
            onClick={() => setIsProjectorModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-black font-bold text-xs border border-purple-500/50 flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Configure Projector Scenes & Announcements"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Projector Mode</span>
          </button>

          {/* Reusable DJ Library Modal Trigger */}
          <button
            onClick={() => setIsLibraryOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border border-dj-border font-bold text-xs flex items-center gap-1.5 transition-all"
            title="Browse & load pre-made DJ Sets"
          >
            <BookOpen className="w-3.5 h-3.5 text-dj-cyan" />
            <span>DJ Sets</span>
          </button>

          {/* Event Setup Branding Trigger */}
          <button
            onClick={() => setIsEventSettingsOpen(true)}
            className="p-2 rounded-xl bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border border-dj-border transition-colors"
            title="Event Setup & Visual Branding"
          >
            <Calendar className="w-4 h-4 text-dj-magenta" />
          </button>

          {/* QR Code Share Modal Trigger */}
          <button
            onClick={() => setIsQrOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-dj-cyan/20 hover:bg-dj-cyan text-dj-cyan hover:text-black font-bold text-xs border border-dj-cyan/60 flex items-center gap-1.5 transition-all glow-cyan active:scale-95"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Share QR</span>
          </button>

          {/* Audio Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-dj-card hover:bg-slate-700 text-slate-300 hover:text-white border border-dj-border transition-colors"
            title="Session Audio Settings"
          >
            <Sliders className="w-4 h-4" />
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
          {/* Deck Transport Panel */}
          <NowPlayingDeck
            playbackState={playbackState}
            currentPosition={currentPosition}
            onPlay={handlePlay}
            onPause={handlePause}
            onSkip={handleSkip}
            onRestartSegment={handleRestartSegment}
            onToggleAutoAdvance={handleToggleAutoAdvance}
          />

          {/* Player Controller Engine */}
          <div className="h-64 sm:h-72">
            <YouTubePlayerController
              roomCode={session.roomCode}
              hostToken={hostToken}
              playbackState={playbackState}
              transitionDurationSeconds={session.settings.defaultTransitionDurationSeconds || 3}
              onStateUpdate={onUpdatePlaybackState}
              onPositionUpdate={(pos) => setCurrentPosition(pos)}
            />
          </div>
        </div>

        {/* Right Column: 3 Tabbed Workspaces (6 cols) */}
        <div className="lg:col-span-6 flex flex-col min-h-[560px]">
          {/* 3 Workspace Tabs Navigation */}
          <div className="flex items-center gap-2 mb-3 bg-dj-card/40 p-1.5 rounded-2xl border border-dj-border">
            <button
              onClick={() => setActiveTab('DECK')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'DECK'
                  ? 'bg-dj-cyan text-black shadow-md glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>DJ Deck ({deck.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('REQUESTS')}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
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
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-dj-card'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>
          </div>

          {/* Active Tab Workspace View */}
          <div className="flex-1">
            {activeTab === 'DECK' && (
              <DJDeckManager
                roomCode={session.roomCode}
                hostToken={hostToken}
                deck={deck}
                onDeckUpdated={fetchDeck}
                onOpenLibrary={() => setIsLibraryOpen(true)}
                currentTrackId={playbackState.djDeckTrackId}
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
          </div>
        </div>
      </main>

      {/* Audio Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={session.settings}
        onSave={handleSaveSettings}
      />

      {/* Event Details & Branding Modal */}
      <EventSettingsModal
        isOpen={isEventSettingsOpen}
        onClose={() => setIsEventSettingsOpen(false)}
        session={session}
        hostToken={hostToken}
        onSessionUpdated={(updated) => {
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
      />
    </div>
  );
};
