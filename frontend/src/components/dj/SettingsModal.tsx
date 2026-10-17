import React, { useState } from 'react';
import { SessionSettings } from '../../types';
import { X, Sliders, Check, Clock, ShieldAlert, Vote, Repeat } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SessionSettings;
  onSave: (newSettings: SessionSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [form, setForm] = useState<SessionSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-dj-cyan" />
            <h3 className="font-bold text-lg text-white">DJ Session Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Default Playback Duration */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-dj-cyan" /> Default Song Segment Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 0].map((dur) => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => setForm({ ...form, defaultSongDurationSeconds: dur })}
                  className={`py-2.5 rounded-xl font-mono text-xs font-bold border transition-all ${form.defaultSongDurationSeconds === dur
                      ? 'bg-dj-cyan text-black border-dj-cyan glow-cyan'
                      : 'bg-dj-card text-slate-300 border-dj-border hover:border-slate-500'
                    }`}
                >
                  {dur === 0 ? 'FULL' : `${dur}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Transition Duration */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-dj-magenta" /> Sequential Fade Transition Length
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[0, 3, 5, 8, 10].map((trans) => (
                <button
                  type="button"
                  key={trans}
                  onClick={() => setForm({ ...form, defaultTransitionDurationSeconds: trans })}
                  className={`py-2 rounded-xl font-mono text-xs font-bold border transition-all ${form.defaultTransitionDurationSeconds === trans
                      ? 'bg-dj-magenta text-white border-dj-magenta glow-magenta'
                      : 'bg-dj-card text-slate-300 border-dj-border hover:border-slate-500'
                    }`}
                >
                  {trans === 0 ? 'CUT' : `${trans}s`}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Fades active YouTube volume down, stops track, loads next track, seeks to requested moment, then fades volume up.
            </p>
          </div>

          {/* Request Moderation Mode */}
          <div className="pt-2 border-t border-dj-border">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
              Request Approval Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, autoApproveRequests: true })}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${form.autoApproveRequests
                    ? 'bg-dj-green/15 border-dj-green text-dj-green glow-green'
                    : 'bg-dj-card border-dj-border text-slate-400 hover:border-slate-600'
                  }`}
              >
                <span className="font-bold text-sm text-white">Auto-Approve</span>
                <span className="text-[11px] opacity-80">Songs join queue immediately</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, autoApproveRequests: false })}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${!form.autoApproveRequests
                    ? 'bg-dj-amber/15 border-dj-amber text-dj-amber'
                    : 'bg-dj-card border-dj-border text-slate-400 hover:border-slate-600'
                  }`}
              >
                <span className="font-bold text-sm text-white">Manual Moderation</span>
                <span className="text-[11px] opacity-80">DJ approves or rejects each song</span>
              </button>
            </div>
          </div>

          {/* Limit settings */}
          <div className="space-y-4 pt-2 border-t border-dj-border">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Max Pending Requests per Guest</span>
                <span className="text-xs text-slate-400">Prevents request spamming</span>
              </div>
              <select
                value={form.maxPendingRequestsPerGuest}
                onChange={(e) => setForm({ ...form, maxPendingRequestsPerGuest: parseInt(e.target.value, 10) })}
                className="bg-dj-card border border-dj-border rounded-xl px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-dj-cyan"
              >
                <option value={1}>1 request</option>
                <option value={2}>2 requests</option>
                <option value={3}>3 requests</option>
                <option value={5}>5 requests</option>
                <option value={10}>10 requests</option>
              </select>
            </div>

            {/* Toggle Toggles */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Allow Guest Voting</span>
                <span className="text-xs text-slate-400">Guests can upvote queued songs</span>
              </div>
              <input
                type="checkbox"
                checked={form.allowGuestVoting}
                onChange={(e) => setForm({ ...form, allowGuestVoting: e.target.checked })}
                className="w-5 h-5 rounded accent-dj-cyan cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Allow Custom Timestamps</span>
                <span className="text-xs text-slate-400">Guests can pick starting position</span>
              </div>
              <input
                type="checkbox"
                checked={form.allowCustomTimestamps}
                onChange={(e) => setForm({ ...form, allowCustomTimestamps: e.target.checked })}
                className="w-5 h-5 rounded accent-dj-cyan cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">Allow Repeated Songs</span>
                <span className="text-xs text-slate-400">Allow songs already played or in queue</span>
              </div>
              <input
                type="checkbox"
                checked={form.allowRepeatedSongs}
                onChange={(e) => setForm({ ...form, allowRepeatedSongs: e.target.checked })}
                className="w-5 h-5 rounded accent-dj-cyan cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white block">DJ Overrides Duration</span>
                <span className="text-xs text-slate-400">Force host's default duration on all requests</span>
              </div>
              <input
                type="checkbox"
                checked={form.djDeterminesDuration}
                onChange={(e) => setForm({ ...form, djDeterminesDuration: e.target.checked })}
                className="w-5 h-5 rounded accent-dj-cyan cursor-pointer"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-dj-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-dj-cyan text-black font-bold text-sm glow-cyan hover:bg-cyan-400 active:scale-95 transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
