import React, { useState, useEffect, useCallback } from 'react';
import { Session, Guest, SongRequest, PlaybackState } from './types';
import { api } from './services/api';
import { wsService } from './services/websocket';
import { DjDashboard } from './components/dj/DjDashboard';
import { GuestHome } from './components/guest/GuestHome';
import { ProjectorScreen } from './components/projector/ProjectorScreen';
import { EventsManager } from './components/events/EventsManager';
import {
  Radio,
  Music,
  Users,
  Sparkles,
  ArrowRight,
  Headphones,
  Sliders,
  Check,
  AlertCircle,
  Tv,
  Key,
  Smartphone,
  X,
} from 'lucide-react';

export const App: React.FC = () => {
  // Navigation State
  const [view, setView] = useState<'landing' | 'dj' | 'guest' | 'projector' | 'events'>('landing');

  // Session & Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [hostToken, setHostToken] = useState<string>('');
  const [guest, setGuest] = useState<Guest | null>(null);
  const [queue, setQueue] = useState<SongRequest[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    status: 'IDLE',
    currentTrack: null,
    currentPositionSeconds: 0,
    volume: 100,
    autoAdvance: true,
  });

  // Landing form states
  const [partyName, setPartyName] = useState('Saturday Live Session');
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [createDjPasscode, setCreateDjPasscode] = useState('1234');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [guestNickname, setGuestNickname] = useState('');
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isJoiningSession, setIsJoiningSession] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);

  // DJ Remote Phone Login Modal State
  const [isDjLoginOpen, setIsDjLoginOpen] = useState(false);
  const [djLoginRoomCode, setDjLoginRoomCode] = useState('');
  const [djLoginPasscode, setDjLoginPasscode] = useState('');
  const [isDjLoggingIn, setIsDjLoggingIn] = useState(false);
  const [djLoginError, setDjLoginError] = useState<string | null>(null);

  const handleDjLogin = async (roomCode: string, passcode: string) => {
    setIsDjLoggingIn(true);
    setDjLoginError(null);
    try {
      const code = roomCode.trim().toUpperCase();
      const sess = await api.djLogin(code, passcode.trim());
      setSession(sess);
      const token = sess.hostToken || passcode.trim();
      setHostToken(token);
      localStorage.setItem(`owndj_host_${code}`, token);

      const [q, qr] = await Promise.all([
        api.getQueue(code),
        api.getQrCode(code, getEffectiveOrigin()),
      ]);
      setQueue(q);
      setQrDataUrl(qr.qrCodeDataUrl);

      setIsDjLoginOpen(false);
      setView('dj');
      window.history.pushState({}, '', `/dj/${code}`);
    } catch (err: any) {
      setDjLoginError(err.message || 'Invalid DJ passcode. Please check with the event manager.');
      setIsDjLoginOpen(true);
    } finally {
      setIsDjLoggingIn(false);
    }
  };

  // Check URL pathname for direct joins like /join/:roomCode, /dj/:roomCode, /projector/:roomCode, or /events
  useEffect(() => {
    const path = window.location.pathname;
    const eventsMatch = path.match(/^\/events/i);
    const joinMatch = path.match(/^\/(?:join|party)\/([a-zA-Z0-9_-]+)/i);
    const djMatch = path.match(/^\/dj\/([a-zA-Z0-9_-]+)/i);
    const projectorMatch = path.match(/^\/projector\/([a-zA-Z0-9_-]+)/i);

    if (eventsMatch) {
      setView('events');
    } else if (projectorMatch && projectorMatch[1]) {
      setJoinRoomCode(projectorMatch[1].toUpperCase());
      setView('projector');
    } else if (joinMatch && joinMatch[1]) {
      setJoinRoomCode(joinMatch[1].toUpperCase());
    } else if (djMatch && djMatch[1]) {
      const code = djMatch[1].toUpperCase();
      const searchParams = new URLSearchParams(window.location.search);
      const urlPasscode = searchParams.get('passcode');
      const savedToken = localStorage.getItem(`owndj_host_${code}`);

      if (urlPasscode) {
        handleDjLogin(code, urlPasscode);
      } else if (savedToken) {
        setJoinRoomCode(code);
        setHostToken(savedToken);
        loadSessionAsHost(code, savedToken);
      } else {
        setDjLoginRoomCode(code);
        setIsDjLoginOpen(true);
      }
    }
  }, []);

  // WebSocket Subscription
  useEffect(() => {
    if (!session) return;

    wsService.connect(session.roomCode);

    const unsubTrack = wsService.subscribe('CURRENT_TRACK_CHANGED', (event) => {
      setPlaybackState((prev) => ({
        ...prev,
        ...event.payload,
      }));
      refreshQueue(session.roomCode);
    });

    const unsubQueue = wsService.subscribe('QUEUE_UPDATED', (event) => {
      if (Array.isArray(event.payload)) {
        setQueue(event.payload);
      } else {
        refreshQueue(session.roomCode);
      }
    });

    const unsubGuests = wsService.subscribe('GUEST_JOINED', (event) => {
      setSession((prev) => (prev ? { ...prev, guestCount: Number(event.payload) || prev.guestCount + 1 } : prev));
    });

    const unsubSettings = wsService.subscribe('SETTINGS_UPDATED', (event) => {
      setSession((prev) => (prev ? { ...prev, settings: event.payload } : prev));
    });

    const unsubStatus = wsService.subscribe('PLAYBACK_STATUS_CHANGED', (event) => {
      setPlaybackState((prev) => ({
        ...prev,
        status: event.payload.status,
      }));
    });

    return () => {
      unsubTrack();
      unsubQueue();
      unsubGuests();
      unsubSettings();
      unsubStatus();
      wsService.disconnect();
    };
  }, [session?.roomCode]);

  const refreshQueue = useCallback(async (roomCode: string) => {
    try {
      const q = await api.getQueue(roomCode, guest?.id);
      setQueue(q);
    } catch (e) {
      console.warn('Failed to refresh queue:', e);
    }
  }, [guest?.id]);

  const getEffectiveOrigin = () => {
    const saved = localStorage.getItem('owndj_tunnel_url');
    if (saved && saved.trim()) return saved.trim();
    if (!window.location.origin.includes('localhost') && !window.location.origin.includes('127.0.0.1')) {
      return window.location.origin;
    }
    return undefined;
  };

  const loadSessionAsHost = async (roomCode: string, token: string) => {
    try {
      const sess = await api.getSession(roomCode, token);
      setSession(sess);
      setHostToken(token);
      setView('dj');

      // Fetch initial queue and QR
      const [q, qr] = await Promise.all([
        api.getQueue(roomCode),
        api.getQrCode(roomCode, getEffectiveOrigin()),
      ]);
      setQueue(q);
      setQrDataUrl(qr.qrCodeDataUrl);
    } catch (err: any) {
      setLandingError(err.message || 'Failed to reconnect as DJ');
    }
  };

  // Host Action: Create Session
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    setIsCreatingSession(true);
    setLandingError(null);

    try {
      const newSession = await api.createSession(
        partyName.trim(),
        customCodeInput.trim() ? customCodeInput.trim() : undefined,
        createDjPasscode.trim() ? createDjPasscode.trim() : undefined
      );
      setSession(newSession);
      const token = newSession.hostToken || '';
      setHostToken(token);
      localStorage.setItem(`owndj_host_${newSession.roomCode}`, token);

      const [q, qr] = await Promise.all([
        api.getQueue(newSession.roomCode),
        api.getQrCode(newSession.roomCode, getEffectiveOrigin()),
      ]);
      setQueue(q);
      setQrDataUrl(qr.qrCodeDataUrl);

      // Update URL to /dj/{roomCode}
      window.history.pushState({}, '', `/dj/${newSession.roomCode}`);
      setView('dj');
    } catch (err: any) {
      setLandingError(err.message || 'Failed to create session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleOpenDjFromManager = async (roomCode: string, token?: string) => {
    const effectiveToken = token || localStorage.getItem(`owndj_host_${roomCode}`) || '';
    if (!effectiveToken) {
      setDjLoginRoomCode(roomCode);
      setDjLoginPasscode('');
      setDjLoginError(null);
      setIsDjLoginOpen(true);
      return;
    }
    setJoinRoomCode(roomCode);
    setHostToken(effectiveToken);
    window.history.pushState({}, '', `/dj/${roomCode}`);
    await loadSessionAsHost(roomCode, effectiveToken);
  };

  // Guest Action: Join Session
  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomCode.trim() || !guestNickname.trim()) return;

    setIsJoiningSession(true);
    setLandingError(null);

    try {
      const code = joinRoomCode.trim().toUpperCase();
      const guestInfo = await api.joinSession(code, guestNickname.trim());
      const sess = await api.getSession(code);

      setGuest(guestInfo);
      setSession(sess);

      const q = await api.getQueue(code, guestInfo.id);
      setQueue(q);

      window.history.pushState({}, '', `/join/${code}`);
      setView('guest');
    } catch (err: any) {
      setLandingError(err.message || 'Failed to join party. Check the room code.');
    } finally {
      setIsJoiningSession(false);
    }
  };

  const handleEndSession = async () => {
    if (!session || !hostToken) return;
    if (confirm('Are you sure you want to end this DJ session for all guests?')) {
      try {
        await api.updateStatus(session.roomCode, hostToken, 'ENDED');
        localStorage.removeItem(`owndj_host_${session.roomCode}`);
        setSession(null);
        setView('landing');
        window.history.pushState({}, '', '/');
      } catch (err: any) {
        alert(err.message || 'Failed to end session');
      }
    }
  };

  const handleVote = async (requestId: string) => {
    if (!guest) return;
    try {
      await api.voteRequest(requestId, guest.guestToken);
      if (session) refreshQueue(session.roomCode);
    } catch (err) {
      console.warn('Failed to vote:', err);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!guest) return;
    try {
      await api.removeRequest(requestId, undefined, guest.guestToken);
      if (session) refreshQueue(session.roomCode);
    } catch (err) {
      console.warn('Failed to cancel request:', err);
    }
  };

  // Render Projector View
  if (view === 'projector') {
    return (
      <ProjectorScreen
        roomCode={joinRoomCode}
        hostToken={hostToken}
        onBack={() => {
          setView('landing');
          window.history.pushState({}, '', '/');
        }}
      />
    );
  }

  // Render DJ Dashboard
  if (view === 'dj' && session) {
    return (
      <DjDashboard
        session={session}
        hostToken={hostToken}
        queue={queue}
        playbackState={playbackState}
        qrDataUrl={qrDataUrl}
        onRefreshSession={() => api.getSession(session.roomCode, hostToken).then(setSession)}
        onRefreshQueue={() => refreshQueue(session.roomCode)}
        onUpdatePlaybackState={setPlaybackState}
        onUpdateQrDataUrl={setQrDataUrl}
        onNavigateToEvents={() => {
          setView('events');
          window.history.pushState({}, '', '/events');
        }}
        onEndSession={handleEndSession}
      />
    );
  }

  // Render Events Manager View
  if (view === 'events') {
    return (
      <EventsManager
        onBackToHome={() => {
          setView('landing');
          window.history.pushState({}, '', '/');
        }}
        onOpenDjDeck={(code, token) => handleOpenDjFromManager(code, token)}
        onJoinAsGuest={(code) => {
          setJoinRoomCode(code);
          setView('landing');
          window.history.pushState({}, '', `/join/${code}`);
        }}
        onOpenProjector={(code) => {
          setJoinRoomCode(code);
          setView('projector');
          window.history.pushState({}, '', `/projector/${code}`);
        }}
      />
    );
  }

  // Render Guest View
  if (view === 'guest' && session && guest) {
    return (
      <GuestHome
        session={session}
        guest={guest}
        queue={queue}
        onRefreshQueue={() => refreshQueue(session.roomCode)}
        onVote={handleVote}
        onCancelRequest={handleCancelRequest}
      />
    );
  }

  // Landing & Join Page
  return (
    <div className="min-h-screen bg-dj-bg text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-dj-cyan selection:text-black">
      {/* Dynamic Background Neon Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-dj-cyan/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-dj-magenta/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Bar */}
      <header className="px-6 py-6 max-w-6xl mx-auto w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-dj-cyan to-dj-magenta flex items-center justify-center text-black font-black text-lg glow-cyan shadow-lg">
            DJ
          </div>
          <span className="font-black text-2xl tracking-tighter text-white">OwnDJ</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setDjLoginRoomCode(joinRoomCode || '');
              setDjLoginPasscode('');
              setDjLoginError(null);
              setIsDjLoginOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs font-bold text-amber-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
            title="Log in to DJ Dashboard with Room Code & Passcode"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>DJ Phone Login</span>
          </button>
          <button
            onClick={() => {
              setView('events');
              window.history.pushState({}, '', '/events');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-dj-surface hover:bg-slate-800 border border-dj-border hover:border-dj-cyan/60 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-2 transition-all shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-dj-cyan animate-pulse" />
            <span>Active Events</span>
          </button>
          <span className="hidden sm:inline px-3 py-1 rounded-full bg-dj-surface border border-dj-border text-xs font-mono text-slate-400">
            v1.0 • Official YouTube API
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center z-10">
        <div className="text-center max-w-2xl mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-dj-cyan/15 border border-dj-cyan/40 text-dj-cyan text-xs font-mono font-bold mb-6 glow-cyan">
            <Sparkles className="w-3.5 h-3.5" /> SMART SONG MOMENTS & REAL-TIME JUKEBOX
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            Virtual DJ for Live Crowds & YouTube Requests.
          </h1>
          <p className="text-base sm:text-lg text-slate-300 mt-4 leading-relaxed">
            Host sets the beats, guests scan the QR code to search YouTube, pick exact timestamps or chorus moments, and enjoy automated transitions.
          </p>
        </div>

        {/* Error Alert */}
        {landingError && (
          <div className="w-full max-w-xl mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center gap-3 text-red-200 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span>{landingError}</span>
          </div>
        )}

        {/* Dual Actions Card (Host DJ vs Join Guest) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Host DJ Box */}
          <div className="glass-panel p-8 rounded-3xl border border-dj-border shadow-2xl flex flex-col justify-between relative group hover:border-dj-cyan/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-dj-cyan/20 border border-dj-cyan/40 flex items-center justify-center text-dj-cyan">
                <Headphones className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Host a DJ Session</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Control the live music deck, adjust segment lengths, approve or reorder guest requests, and stream via YouTube.
              </p>

              <form onSubmit={handleCreateSession} className="space-y-3.5 pt-2">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Party / Session Name
                  </label>
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="e.g. Roof Party 2026"
                    className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-dj-cyan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Room Code
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={customCodeInput}
                      onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                      placeholder="Auto"
                      className="w-full bg-dj-card border border-dj-border rounded-xl px-3 py-2.5 text-xs text-white font-mono uppercase tracking-wider focus:outline-none focus:border-dj-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      <span>DJ PIN</span>
                    </label>
                    <input
                      type="text"
                      maxLength={16}
                      value={createDjPasscode}
                      onChange={(e) => setCreateDjPasscode(e.target.value.replace(/\s+/g, ''))}
                      placeholder="1234"
                      className="w-full bg-dj-card border border-amber-500/40 rounded-xl px-3 py-2.5 text-xs text-white font-mono tracking-wider focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isCreatingSession}
                  className="w-full py-3.5 rounded-2xl bg-dj-cyan hover:bg-cyan-400 text-black font-extrabold text-sm tracking-wide shadow-lg glow-cyan flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 mt-2"
                >
                  {isCreatingSession ? 'Setting up deck...' : 'Launch DJ Session'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Join as Guest Box */}
          <div className="glass-panel p-8 rounded-3xl border border-dj-border shadow-2xl flex flex-col justify-between relative group hover:border-dj-magenta/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-dj-magenta/20 border border-dj-magenta/40 flex items-center justify-center text-dj-magenta">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Join as Guest</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your party's room code to search YouTube, request song moments, and vote for the next track. No app download needed.
              </p>

              <form onSubmit={handleJoinSession} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Room Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={joinRoomCode}
                    onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 8N7D7C"
                    className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-3 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-dj-magenta"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                    Your Nickname
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={guestNickname}
                    onChange={(e) => setGuestNickname(e.target.value)}
                    placeholder="e.g. Alex"
                    className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-dj-magenta"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isJoiningSession}
                  className="w-full py-3.5 rounded-2xl bg-dj-magenta hover:bg-pink-600 text-white font-extrabold text-sm tracking-wide shadow-lg glow-magenta flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isJoiningSession ? 'Joining party...' : 'Join Party Queue'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!joinRoomCode.trim()) {
                        setLandingError('Please enter a room code first to open the Projector Screen.');
                        return;
                      }
                      const code = joinRoomCode.trim().toUpperCase();
                      window.history.pushState({}, '', `/projector/${code}`);
                      setView('projector');
                    }}
                    className="inline-flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-dj-cyan transition-colors"
                  >
                    <Tv className="w-4 h-4" />
                    Open Projector Screen for this Room
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDjLoginRoomCode(joinRoomCode.trim().toUpperCase());
                      setDjLoginPasscode('');
                      setDjLoginError(null);
                      setIsDjLoginOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400/90 hover:text-amber-300 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Are you the DJ? Enter Passcode to Login
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 max-w-6xl mx-auto w-full text-center text-xs font-mono text-slate-500 z-10">
        Virtual DJ Web App • Strictly compliant with YouTube Developer Policies (Single active official IFrame player, zero audio extraction).
      </footer>

      {/* DJ Remote Phone Login Modal */}
      {isDjLoginOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dj-surface border border-dj-border w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setIsDjLoginOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white">DJ Remote Phone Login</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Enter the Room Code and DJ Passcode to control the live deck, volume, transitions, and queue remotely from your smartphone.
            </p>

            {djLoginError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{djLoginError}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDjLogin(djLoginRoomCode, djLoginPasscode);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Room Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={djLoginRoomCode}
                  onChange={(e) => setDjLoginRoomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. MYPARTY"
                  className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>DJ Passcode</span>
                  <span className="text-[10px] text-amber-400 font-normal">Created by Event Manager</span>
                </label>
                <input
                  type="password"
                  required
                  maxLength={32}
                  value={djLoginPasscode}
                  onChange={(e) => setDjLoginPasscode(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDjLoginOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-dj-card border border-dj-border text-slate-300 hover:text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDjLoggingIn || !djLoginRoomCode.trim() || !djLoginPasscode.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isDjLoggingIn ? 'Authenticating...' : 'Enter DJ Deck'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
