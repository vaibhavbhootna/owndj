import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  ArrowLeft,
  Users,
  Music,
  ExternalLink,
  Copy,
  Check,
  PowerOff,
  Trash2,
  Tv,
  Headphones,
  Search,
  Sparkles,
  Calendar,
  AlertTriangle,
  Key,
  X,
} from 'lucide-react';
import { Session } from '../../types';
import { api } from '../../services/api';

interface EventsManagerProps {
  onBackToHome: () => void;
  onOpenDjDeck: (roomCode: string, hostToken?: string) => void;
  onJoinAsGuest: (roomCode: string) => void;
  onOpenProjector: (roomCode: string) => void;
}

export const EventsManager: React.FC<EventsManagerProps> = ({
  onBackToHome,
  onOpenDjDeck,
  onJoinAsGuest,
  onOpenProjector,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'RUNNING' | 'CLOSED' | 'ALL'>('RUNNING');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [copiedPasscode, setCopiedPasscode] = useState<string | null>(null);

  // New Event Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [customRoomCode, setCustomRoomCode] = useState('');
  const [customDjPasscode, setCustomDjPasscode] = useState('1234');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Enter DJ Passcode Modal State
  const [passcodeModalRoomCode, setPasscodeModalRoomCode] = useState<string | null>(null);
  const [inputPasscode, setInputPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isVerifyingPasscode, setIsVerifyingPasscode] = useState(false);

  // Closing / Deleting state
  const [processingCode, setProcessingCode] = useState<string | null>(null);

  const handleCopyPasscode = (passcode: string, id: string) => {
    navigator.clipboard.writeText(passcode);
    setCopiedPasscode(id);
    setTimeout(() => setCopiedPasscode(null), 2000);
  };

  const handleVerifyPasscodeAndOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcodeModalRoomCode || !inputPasscode.trim()) return;
    setIsVerifyingPasscode(true);
    setPasscodeError(null);
    try {
      const sess = await api.djLogin(passcodeModalRoomCode, inputPasscode.trim());
      const token = sess.hostToken || inputPasscode.trim();
      localStorage.setItem(`owndj_host_${passcodeModalRoomCode}`, token);
      const targetCode = passcodeModalRoomCode;
      setPasscodeModalRoomCode(null);
      setInputPasscode('');
      onOpenDjDeck(targetCode, token);
    } catch (err: any) {
      setPasscodeError(err.message || 'Invalid DJ passcode');
    } finally {
      setIsVerifyingPasscode(false);
    }
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllSessions(false);
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    setIsSubmitting(true);
    setCreateError(null);

    try {
      const created = await api.createSession(
        newSessionName.trim(),
        customRoomCode.trim() ? customRoomCode.trim() : undefined,
        customDjPasscode.trim() ? customDjPasscode.trim() : undefined
      );
      if (created.hostToken) {
        localStorage.setItem(`owndj_host_${created.roomCode}`, created.hostToken);
      }
      setIsCreateOpen(false);
      setNewSessionName('');
      setCustomRoomCode('');
      setCustomDjPasscode('1234');
      // Open the DJ deck directly for the created session
      onOpenDjDeck(created.roomCode, created.hostToken);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create event. Custom room code might already be taken.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSession = async (roomCode: string, name: string) => {
    if (!window.confirm(`Are you sure you want to CLOSE "${name}" (${roomCode})? This will end the session for all guests.`)) {
      return;
    }

    setProcessingCode(roomCode);
    try {
      const hostToken = localStorage.getItem(`owndj_host_${roomCode}`) || undefined;
      await api.closeSession(roomCode, hostToken);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to close session');
    } finally {
      setProcessingCode(null);
    }
  };

  const handleDeleteSession = async (roomCode: string, name: string) => {
    if (!window.confirm(`Permanently delete "${name}" (${roomCode})? All queue requests and playback history will be removed.`)) {
      return;
    }

    setProcessingCode(roomCode);
    try {
      const hostToken = localStorage.getItem(`owndj_host_${roomCode}`) || undefined;
      await api.deleteSession(roomCode, hostToken);
      localStorage.removeItem(`owndj_host_${roomCode}`);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete session');
    } finally {
      setProcessingCode(null);
    }
  };

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Tab filter
      const isRunning = s.status !== 'ENDED';
      if (filterTab === 'RUNNING' && !isRunning) return false;
      if (filterTab === 'CLOSED' && isRunning) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesCode = s.roomCode.toLowerCase().includes(q);
        const matchesVenue = (s.venue || '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesVenue;
      }
      return true;
    });
  }, [sessions, filterTab, searchQuery]);

  const runningCount = sessions.filter((s) => s.status !== 'ENDED').length;
  const closedCount = sessions.filter((s) => s.status === 'ENDED').length;

  return (
    <div className="min-h-screen bg-dj-bg text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-dj-border/80 bg-dj-surface/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHome}
            className="p-2 rounded-xl bg-dj-card border border-dj-border hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Return to Home"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-dj-cyan to-dj-magenta flex items-center justify-center text-black font-black text-xs shadow-lg shadow-cyan-500/20">
              <Radio className="w-4 h-4 text-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Event Manager
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Manage, jump into, or close running events and virtual DJ rooms
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-dj-card border border-dj-border hover:bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-dj-cyan' : ''}`} />
          </button>

          <button
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-dj-cyan to-dj-blue hover:opacity-95 text-black font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Event</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Controls Bar: Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-dj-surface/60 border border-dj-border/70 rounded-2xl p-2.5">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-dj-card/80 rounded-xl border border-dj-border/50 text-xs font-bold">
            <button
              onClick={() => setFilterTab('RUNNING')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'RUNNING'
                  ? 'bg-dj-cyan text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Running Events</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterTab === 'RUNNING' ? 'bg-black/20 text-black' : 'bg-dj-surface text-slate-300'
              }`}>
                {runningCount}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('CLOSED')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'CLOSED'
                  ? 'bg-slate-200 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Past / Closed</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                filterTab === 'CLOSED' ? 'bg-black/20 text-black' : 'bg-dj-surface text-slate-300'
              }`}>
                {closedCount}
              </span>
            </button>

            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                filterTab === 'ALL'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>All Events</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-dj-surface text-slate-300">
                {sessions.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, room code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dj-card border border-dj-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-dj-cyan transition-colors"
            />
          </div>
        </div>

        {/* Sessions List / Grid */}
        {isLoading && sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-dj-cyan mb-3" />
            <p className="text-sm font-medium">Loading events...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-dj-surface/40 border border-dj-border border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-dj-cyan/10 border border-dj-cyan/20 flex items-center justify-center text-dj-cyan mb-3">
              <Radio className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {filterTab === 'RUNNING'
                ? 'No running events found'
                : filterTab === 'CLOSED'
                ? 'No past events found'
                : 'No events match your search'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-5">
              {filterTab === 'RUNNING'
                ? 'There are currently no active or open DJ sessions. Create one with an optional custom room code to get started!'
                : 'Try adjusting your search query or create a new live session.'}
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-dj-cyan hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map((sess) => {
              const isEnded = sess.status === 'ENDED';
              const isLive = sess.status === 'ACTIVE';
              const isPaused = sess.status === 'PAUSED';
              const isReady = sess.status === 'CREATED';
              const isCurrentAction = processingCode === sess.roomCode;
              const hasHostToken = !!localStorage.getItem(`owndj_host_${sess.roomCode}`);

              return (
                <div
                  key={sess.id || sess.roomCode}
                  className={`bg-dj-surface border rounded-3xl p-5 shadow-lg flex flex-col justify-between transition-all hover:border-slate-600 ${
                    isLive
                      ? 'border-emerald-500/40 shadow-emerald-500/5'
                      : isEnded
                      ? 'border-dj-border opacity-75 bg-dj-surface/60'
                      : 'border-dj-border'
                  }`}
                >
                  {/* Top Bar: Room Code & Status Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400 uppercase">ROOM:</span>
                        <div className="flex items-center gap-1.5 bg-dj-card border border-dj-border px-2.5 py-1 rounded-xl">
                          <span className="font-mono font-black text-base text-dj-cyan tracking-wider">
                            {sess.roomCode}
                          </span>
                          <button
                            onClick={() => handleCopyCode(sess.roomCode)}
                            className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                            title="Copy Room Code"
                          >
                            {copiedCode === sess.roomCode ? (
                              <Check className="w-3.5 h-3.5 text-dj-green" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          isLive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : isPaused
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isReady
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                        {sess.status}
                      </span>
                    </div>

                    {/* Event Name & Metadata */}
                    <h3 className="text-lg font-bold text-white tracking-tight mb-1 truncate" title={sess.name}>
                      {sess.name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2 text-xs text-slate-400 mb-4">
                      {sess.eventType && (
                        <span className="px-2 py-0.5 rounded-md bg-dj-card border border-dj-border text-[10px] font-semibold text-slate-300">
                          {sess.eventType}
                        </span>
                      )}
                      {sess.djPasscode && (
                        <button
                          type="button"
                          onClick={() => handleCopyPasscode(sess.djPasscode!, sess.roomCode)}
                          className="px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 transition-all"
                          title="Click to copy DJ Passcode"
                        >
                          <Key className="w-2.5 h-2.5 text-amber-400" />
                          <span>PIN: {sess.djPasscode}</span>
                          {copiedPasscode === sess.roomCode ? (
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-amber-400/60" />
                          )}
                        </button>
                      )}
                      {sess.venue && (
                        <span className="truncate max-w-[130px] text-slate-400">
                          📍 {sess.venue}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sess.guestCount} {sess.guestCount === 1 ? 'guest' : 'guests'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  <div className="space-y-2 pt-3 border-t border-dj-border/60">
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Open DJ Deck */}
                      <button
                        onClick={() => {
                          const token = localStorage.getItem(`owndj_host_${sess.roomCode}`) || undefined;
                          if (!token) {
                            setPasscodeModalRoomCode(sess.roomCode);
                            setInputPasscode(sess.djPasscode || '');
                            setPasscodeError(null);
                          } else {
                            onOpenDjDeck(sess.roomCode, token);
                          }
                        }}
                        className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                          hasHostToken
                            ? 'bg-dj-cyan/20 border border-dj-cyan/50 text-dj-cyan hover:bg-dj-cyan hover:text-black'
                            : 'bg-dj-card border border-dj-border text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                        title={hasHostToken ? 'You are host on this device' : 'Enter DJ Deck (Enter Passcode)'}
                      >
                        <Headphones className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{hasHostToken ? 'Host DJ' : 'DJ Deck'}</span>
                      </button>

                      {/* Join as Guest */}
                      <button
                        onClick={() => onJoinAsGuest(sess.roomCode)}
                        disabled={isEnded}
                        className="py-2 px-2 rounded-xl bg-dj-card border border-dj-border hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-40"
                        title="Join Party as Guest"
                      >
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Guest</span>
                      </button>

                      {/* Projector View */}
                      <button
                        onClick={() => onOpenProjector(sess.roomCode)}
                        className="py-2 px-2 rounded-xl bg-dj-card border border-dj-border hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all"
                        title="Open Projector Screen"
                      >
                        <Tv className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Screen</span>
                      </button>
                    </div>

                    {/* Secondary Row: Close Session or Delete */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {!isEnded && (
                        <button
                          onClick={() => handleCloseSession(sess.roomCode, sess.name)}
                          disabled={isCurrentAction}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          title="Close/End this event"
                        >
                          <PowerOff className="w-3.5 h-3.5" />
                          <span>End Event</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteSession(sess.roomCode, sess.name)}
                        disabled={isCurrentAction}
                        className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
                          isEnded
                            ? 'flex-1 bg-slate-800 border-slate-700 text-slate-400 hover:bg-rose-900/40 hover:text-rose-300 hover:border-rose-500/50'
                            : 'bg-dj-card border-dj-border text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
                        }`}
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isEnded && <span>Delete</span>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Event Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dj-surface border border-dj-border w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
            <h3 className="text-xl font-black text-white mb-1">Create Live Event</h3>
            <p className="text-xs text-slate-400 mb-5">
              Set your event title and choose an optional custom room code for your guests.
            </p>

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Event / Session Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g. Saturday Night Glow Party"
                  className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-dj-cyan"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Custom Room Code (Optional)</span>
                  <span className="text-[10px] text-dj-cyan font-normal">3-16 Alphanumeric</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={customRoomCode}
                  onChange={(e) => setCustomRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="e.g. MYPARTY, DISCO, VIP2026"
                  className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase tracking-wider placeholder-slate-500 focus:outline-none focus:border-dj-cyan"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave blank to auto-generate a random 6-character room code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5 text-amber-400" /> DJ Passcode (for phone login)</span>
                  <span className="text-[10px] text-amber-400 font-normal">Security PIN</span>
                </label>
                <input
                  type="text"
                  maxLength={16}
                  value={customDjPasscode}
                  onChange={(e) => setCustomDjPasscode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="e.g. 1234"
                  className="w-full bg-dj-card border border-amber-500/40 rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Passcode for the DJ to access the deck from their smartphone.
                </p>
              </div>

              {createError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-dj-card border border-dj-border text-slate-300 hover:text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newSessionName.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-dj-cyan to-dj-blue hover:opacity-95 text-black font-bold text-xs shadow-md shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Launch DJ Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter DJ Passcode Modal */}
      {passcodeModalRoomCode && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-dj-surface border border-dj-border w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setPasscodeModalRoomCode(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
              <Key className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-black text-white">DJ Deck Access</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Enter the DJ Passcode for room <strong className="text-dj-cyan font-mono">{passcodeModalRoomCode}</strong> to unlock host control.
            </p>

            {passcodeError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{passcodeError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPasscodeAndOpen} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  DJ Passcode
                </label>
                <input
                  type="password"
                  required
                  maxLength={32}
                  value={inputPasscode}
                  onChange={(e) => setInputPasscode(e.target.value)}
                  placeholder="e.g. 1234"
                  className="w-full bg-dj-card border border-dj-border rounded-xl px-4 py-2.5 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasscodeModalRoomCode(null)}
                  className="flex-1 py-2.5 rounded-xl bg-dj-card border border-dj-border text-slate-300 hover:text-white font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingPasscode || !inputPasscode.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {isVerifyingPasscode ? 'Verifying...' : 'Unlock Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
