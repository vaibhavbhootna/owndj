import React, { useState } from 'react';
import { Session, SessionSettings } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Sparkles,
  Sliders,
  Clock,
  Repeat,
  Users,
  Tag,
  Palette,
  MapPin,
  Calendar,
  AlignLeft,
  Key,
  Copy,
  Check,
  RefreshCw,
  Radio,
  Vote,
  ShieldAlert,
  Flame,
  CheckCircle2,
} from 'lucide-react';

interface EventSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  hostToken: string;
  onSessionUpdated: (updated: Session) => void;
  onSettingsUpdated?: (settings: SessionSettings) => void;
  initialTab?: 'PLAYBACK' | 'REQUESTS' | 'BRANDING' | 'MOBILE';
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  hostToken,
  onSessionUpdated,
  onSettingsUpdated,
  initialTab = 'PLAYBACK',
}) => {
  const [activeTab, setActiveTab] = useState<'PLAYBACK' | 'REQUESTS' | 'BRANDING' | 'MOBILE'>(initialTab);

  // Event Details State
  const [name, setName] = useState(session.name || '');
  const [eventType, setEventType] = useState(session.eventType || 'PARTY');
  const [venue, setVenue] = useState(session.venue || '');
  const [eventDate, setEventDate] = useState(session.eventDate || '');
  const [startTime, setStartTime] = useState(session.startTime || '');
  const [endTime, setEndTime] = useState(session.endTime || '');
  const [description, setDescription] = useState(session.description || '');
  const [themeColor, setThemeColor] = useState(session.themeColor || '#06b6d4');
  const [bannerText, setBannerText] = useState(session.bannerText || 'Welcome to the Party!');
  const [requestCooldown, setRequestCooldown] = useState(session.requestCooldownSeconds || 30);
  const [djPasscode, setDjPasscode] = useState(session.djPasscode || '1234');

  // Playback & Mixing Settings State
  const [settingsForm, setSettingsForm] = useState<SessionSettings>({
    ...session.settings,
    defaultSongDurationSeconds: session.settings.defaultSongDurationSeconds ?? 60,
    requestTransitionDelaySeconds: session.settings.requestTransitionDelaySeconds ?? 15,
    defaultTransitionDurationSeconds: session.settings.defaultTransitionDurationSeconds ?? 3,
    autoApproveRequests: session.settings.autoApproveRequests ?? true,
    maxPendingRequestsPerGuest: session.settings.maxPendingRequestsPerGuest ?? 3,
    allowGuestVoting: session.settings.allowGuestVoting ?? true,
    allowCustomTimestamps: session.settings.allowCustomTimestamps ?? true,
    allowFullSongs: session.settings.allowFullSongs ?? false,
    allowRepeatedSongs: session.settings.allowRepeatedSongs ?? false,
    autoAdvance: session.settings.autoAdvance ?? true,
  });

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const generateRandomPin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setDjPasscode(pin);
  };

  const savedTunnel = localStorage.getItem('owndj_tunnel_url');
  const origin = savedTunnel && savedTunnel.trim() ? savedTunnel.trim().replace(/\/$/, '') : window.location.origin;
  const remoteLoginUrl = `${origin}/dj/${session.roomCode}?passcode=${djPasscode.trim()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      // 1. Update Session Settings (audio, mixing, request rules)
      await api.updateSettings(session.roomCode, hostToken, settingsForm);
      onSettingsUpdated?.(settingsForm);

      // 2. Update Event Details (name, venue, theme, branding, passcode)
      const updatedSession = await api.updateEventDetails(session.roomCode, hostToken, {
        name,
        eventType,
        venue,
        eventDate,
        startTime,
        endTime,
        description,
        themeColor,
        bannerText,
        requestCooldownSeconds: requestCooldown,
        djPasscode: djPasscode.trim(),
      });
      onSessionUpdated(updatedSession);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.warn('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const presetColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#f97316', '#3b82f6'];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dj-border flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-dj-cyan/20 to-dj-magenta/20 border border-dj-cyan/40 text-dj-cyan">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">Event & DJ Settings</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-dj-card border border-dj-border text-dj-cyan font-bold">
                  {session.roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure playback mixing, guest requests, visual branding, and phone remote
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-dj-border bg-black/40 px-3 pt-2 gap-1.5 overflow-x-auto select-none">
          <button
            type="button"
            onClick={() => setActiveTab('PLAYBACK')}
            className={`px-3.5 py-2 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'PLAYBACK'
                ? 'border-dj-cyan text-dj-cyan bg-dj-card/80'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-dj-card/40'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>Playback & Mixing</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`px-3.5 py-2 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'REQUESTS'
                ? 'border-dj-magenta text-dj-magenta bg-dj-card/80'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-dj-card/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Requests & Moderation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('BRANDING')}
            className={`px-3.5 py-2 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'BRANDING'
                ? 'border-purple-400 text-purple-300 bg-dj-card/80'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-dj-card/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Event & Visuals</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MOBILE')}
            className={`px-3.5 py-2 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'MOBILE'
                ? 'border-amber-400 text-amber-300 bg-dj-card/80'
                : 'border-transparent text-slate-400 hover:text-white hover:bg-dj-card/40'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>DJ Mobile Remote</span>
          </button>
        </div>

        {/* Tab Form Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: PLAYBACK & MIXING */}
          {activeTab === 'PLAYBACK' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Default Song Switch Time */}
              <div className="bg-dj-card/40 border border-dj-border/80 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-dj-cyan" />
                  Default Song Switch Time (Segment Length)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[30, 45, 60, 90, 120, 180, 0].map((dur) => (
                    <button
                      type="button"
                      key={dur}
                      onClick={() => setSettingsForm({ ...settingsForm, defaultSongDurationSeconds: dur })}
                      className={`py-2 rounded-xl font-mono text-xs font-bold border transition-all ${
                        settingsForm.defaultSongDurationSeconds === dur
                          ? 'bg-dj-cyan text-black border-dj-cyan glow-cyan shadow-sm font-black'
                          : 'bg-dj-surface text-slate-300 border-dj-border hover:border-slate-500'
                      }`}
                    >
                      {dur === 0 ? 'FULL' : `${dur}s`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Tracks automatically transition after this duration (e.g. switch every 60s or 90s for high-energy sets).
                </p>
              </div>

              {/* Guest Request Arrival Switch Time (10-15s Countdown) */}
              <div className="bg-dj-card/40 border border-dj-magenta/40 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-dj-magenta uppercase flex items-center gap-2">
                    <Flame className="w-4 h-4 text-dj-magenta" />
                    Guest Request Arrival Transition Delay
                  </label>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-dj-magenta/20 text-dj-magenta font-bold">
                    {settingsForm.requestTransitionDelaySeconds === 0
                      ? 'Immediate'
                      : `${settingsForm.requestTransitionDelaySeconds ?? 15}s delay`}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { val: 0, label: 'Instant' },
                    { val: 10, label: '10s (Fast)' },
                    { val: 15, label: '15s (Std)' },
                    { val: 20, label: '20s' },
                    { val: 30, label: '30s' },
                    { val: -1, label: 'Full Song' },
                  ].map(({ val, label }) => {
                    const isSelected =
                      (val === -1 && settingsForm.requestTransitionDelaySeconds === -1) ||
                      settingsForm.requestTransitionDelaySeconds === val;
                    return (
                      <button
                        type="button"
                        key={val}
                        onClick={() =>
                          setSettingsForm({
                            ...settingsForm,
                            requestTransitionDelaySeconds: val,
                          })
                        }
                        className={`py-2 px-1 rounded-xl font-mono text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-dj-magenta text-white border-dj-magenta glow-magenta shadow-sm font-black'
                            : 'bg-dj-surface text-slate-300 border-dj-border hover:border-slate-500'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">
                  When the DJ Deck is playing and a guest request arrives, automatically transition to it within 10-15 seconds. If &quot;Full Song&quot; is selected, the current track finishes before playing the request.
                </p>
              </div>

              {/* Crossfade Transition Length */}
              <div className="bg-dj-card/40 border border-dj-border/80 rounded-2xl p-4 space-y-2">
                <label className="block text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-purple-400" />
                  Sequential Volume Fade Transition
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 3, 5, 8, 10].map((trans) => (
                    <button
                      type="button"
                      key={trans}
                      onClick={() =>
                        setSettingsForm({ ...settingsForm, defaultTransitionDurationSeconds: trans })
                      }
                      className={`py-2 rounded-xl font-mono text-xs font-bold border transition-all ${
                        settingsForm.defaultTransitionDurationSeconds === trans
                          ? 'bg-purple-500 text-white border-purple-400 shadow-sm font-black'
                          : 'bg-dj-surface text-slate-300 border-dj-border hover:border-slate-500'
                      }`}
                    >
                      {trans === 0 ? 'CUT' : `${trans}s`}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  Smooth volume crossfade length between songs.
                </p>
              </div>

              {/* Continuous Auto-Advance */}
              <div className="bg-dj-card/40 border border-dj-border/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white block">Continuous Auto-Advance</span>
                  <span className="text-xs text-slate-400">
                    Automatically plays the next song when current track cut finishes
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettingsForm({ ...settingsForm, autoAdvance: !settingsForm.autoAdvance })
                  }
                  className={`w-12 h-6 rounded-full p-0.5 transition-colors ${
                    settingsForm.autoAdvance ? 'bg-dj-cyan' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-black transition-transform ${
                      settingsForm.autoAdvance ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: REQUESTS & MODERATION */}
          {activeTab === 'REQUESTS' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Approval Mode */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                  Request Moderation Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, autoApproveRequests: true })}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      settingsForm.autoApproveRequests
                        ? 'bg-dj-green/15 border-dj-green text-dj-green glow-green'
                        : 'bg-dj-card border-dj-border text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-sm text-white">Auto-Approve</span>
                    <span className="text-[11px] opacity-80">Guest requests join the queue immediately</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, autoApproveRequests: false })}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      !settingsForm.autoApproveRequests
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-dj-card border-dj-border text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold text-sm text-white">Manual Moderation</span>
                    <span className="text-[11px] opacity-80">DJ approves or rejects each song before play</span>
                  </button>
                </div>
              </div>

              {/* Request Limits & Cooldown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-dj-card/40 border border-dj-border/80 rounded-2xl p-3.5 space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase block">
                    Max Pending Per Guest
                  </label>
                  <select
                    value={settingsForm.maxPendingRequestsPerGuest}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        maxPendingRequestsPerGuest: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-dj-surface border border-dj-border rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-dj-cyan"
                  >
                    <option value={1}>1 pending request</option>
                    <option value={2}>2 pending requests</option>
                    <option value={3}>3 pending requests (Recommended)</option>
                    <option value={5}>5 pending requests</option>
                    <option value={10}>10 pending requests</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>

                <div className="bg-dj-card/40 border border-dj-border/80 rounded-2xl p-3.5 space-y-1.5">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center justify-between">
                    <span>Submission Cooldown</span>
                    <span className="text-dj-cyan font-mono">{requestCooldown}s</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="15"
                    value={requestCooldown}
                    onChange={(e) => setRequestCooldown(parseInt(e.target.value, 10))}
                    className="w-full accent-dj-cyan mt-2"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-dj-card/30 border border-dj-border/60">
                  <div>
                    <span className="text-xs font-bold text-white block">Guest Crowd Voting</span>
                    <span className="text-[11px] text-slate-400">Guests can upvote queued songs to boost ranking</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.allowGuestVoting}
                    onChange={(e) => setSettingsForm({ ...settingsForm, allowGuestVoting: e.target.checked })}
                    className="w-4 h-4 accent-dj-cyan rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-dj-card/30 border border-dj-border/60">
                  <div>
                    <span className="text-xs font-bold text-white block">Custom Song Timestamps</span>
                    <span className="text-[11px] text-slate-400">Guests can request a specific cue/moment in song</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.allowCustomTimestamps}
                    onChange={(e) => setSettingsForm({ ...settingsForm, allowCustomTimestamps: e.target.checked })}
                    className="w-4 h-4 accent-dj-cyan rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-dj-card/30 border border-dj-border/60">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow Repeated Songs</span>
                    <span className="text-[11px] text-slate-400">Permit guests to request songs already played tonight</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsForm.allowRepeatedSongs}
                    onChange={(e) => setSettingsForm({ ...settingsForm, allowRepeatedSongs: e.target.checked })}
                    className="w-4 h-4 accent-dj-cyan rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BRANDING & VISUALS */}
          {activeTab === 'BRANDING' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Event Name */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Event Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-sm text-white focus:outline-none focus:border-dj-cyan font-semibold"
                  required
                />
              </div>

              {/* Event Type & Theme Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-dj-cyan" /> Event Type
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan"
                  >
                    <option value="PARTY">🎉 Party / Club Night</option>
                    <option value="BIRTHDAY">🎂 Birthday Celebration</option>
                    <option value="WEDDING">💍 Wedding Reception</option>
                    <option value="ANNIVERSARY">🥂 Anniversary</option>
                    <option value="BOLLYWOOD">💃 Bollywood Dance</option>
                    <option value="CORPORATE">💼 Corporate Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-dj-magenta" /> Visual Accent Color
                  </label>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setThemeColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          themeColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Banner Text (Projector Header) */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                  Projector Screen Banner Greeting
                </label>
                <input
                  type="text"
                  value={bannerText}
                  onChange={(e) => setBannerText(e.target.value)}
                  placeholder="e.g. 🎉 WELCOME TO RAHUL & PRIYA'S SANGEET NIGHT 🎉"
                  className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-sm text-white focus:outline-none focus:border-dj-cyan font-bold"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Displayed on the presentation screen crowd banner.
                </p>
              </div>

              {/* Venue & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Venue / Location
                  </label>
                  <input
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Grand Ballroom, Rooftop"
                    className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date
                  </label>
                  <input
                    type="text"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="Saturday, Nov 14"
                    className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Description / Host Notes */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
                  <AlignLeft className="w-3.5 h-3.5 text-slate-400" /> Host Notes & Schedule
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Special timeline or instructions..."
                  className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DJ MOBILE REMOTE PIN */}
          {activeTab === 'MOBILE' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-gradient-to-br from-amber-500/10 via-dj-card/60 to-black border border-amber-500/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-400" /> DJ Phone Remote Access PIN
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Allows the DJ to manage the live event remotely from a smartphone while keeping host credentials private.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={generateRandomPin}
                    className="text-xs font-mono text-dj-cyan hover:underline flex items-center gap-1 bg-dj-surface px-2.5 py-1 rounded-lg border border-dj-border"
                  >
                    <RefreshCw className="w-3 h-3" /> New PIN
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={djPasscode}
                    onChange={(e) => setDjPasscode(e.target.value.replace(/\s+/g, ''))}
                    placeholder="1234"
                    className="w-36 px-4 py-2.5 bg-black/70 border-2 border-amber-500/60 rounded-xl text-lg font-mono text-center text-white font-black tracking-widest focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(djPasscode);
                      setCopiedPin(true);
                      setTimeout(() => setCopiedPin(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-dj-surface border border-dj-border text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    {copiedPin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPin ? 'Copied' : 'Copy PIN'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-amber-500/20">
                  <label className="text-[11px] font-mono font-bold text-slate-400 uppercase block mb-1">
                    Direct Mobile DJ Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={remoteLoginUrl}
                      className="flex-1 px-3 py-2 bg-black/40 border border-dj-border rounded-xl text-xs font-mono text-slate-300 truncate"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(remoteLoginUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        copiedLink
                          ? 'bg-emerald-500 text-black'
                          : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/40'
                      }`}
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy Remote Link'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-dj-border flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              {saveSuccess && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-dj-border text-slate-400 hover:text-white text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-dj-cyan via-purple-600 to-dj-magenta text-white font-black text-xs shadow-lg glow-cyan flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
