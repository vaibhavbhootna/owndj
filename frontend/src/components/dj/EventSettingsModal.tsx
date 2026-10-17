import React, { useState } from 'react';
import { Session } from '../../types';
import { api } from '../../services/api';
import {
  Calendar,
  Sparkles,
  MapPin,
  Clock,
  Palette,
  AlignLeft,
  X,
  Check,
  Tag,
} from 'lucide-react';

interface EventSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  hostToken: string;
  onSessionUpdated: (updated: Session) => void;
}

export const EventSettingsModal: React.FC<EventSettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  hostToken,
  onSessionUpdated,
}) => {
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
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateEventDetails(session.roomCode, hostToken, {
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
      });
      onSessionUpdated(updated);
      onClose();
    } catch (err) {
      console.warn('Failed to update event details:', err);
    } finally {
      setSaving(false);
    }
  };

  const presetColors = ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#f97316', '#3b82f6'];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-dj-cyan/10 border border-dj-cyan/30 text-dj-cyan">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Event Setup & Branding</h3>
              <p className="text-xs text-slate-400">Configure theme, venue, and visual banner text</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Event Name */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-sm text-white focus:outline-none focus:border-dj-cyan"
              required
            />
          </div>

          {/* Event Type & Theme Color */}
          <div className="grid grid-cols-2 gap-3">
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
                <Palette className="w-3.5 h-3.5 text-dj-magenta" /> Theme Color
              </label>
              <div className="flex items-center gap-1.5 mt-1">
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
              Projector Banner Greeting
            </label>
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="e.g. 🎉 HAPPY BIRTHDAY RAHUL! 🎉"
              className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-sm text-white focus:outline-none focus:border-dj-cyan font-bold"
            />
            <p className="text-[10px] text-slate-500 mt-0.5">
              Prominently displayed on the TV/Projector welcome and banner screen.
            </p>
          </div>

          {/* Venue & Date */}
          <div className="grid grid-cols-2 gap-3">
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

          {/* Request Cooldown */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Guest Request Cooldown
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="120"
                step="15"
                value={requestCooldown}
                onChange={(e) => setRequestCooldown(parseInt(e.target.value, 10))}
                className="flex-1 accent-dj-cyan"
              />
              <span className="font-mono text-xs text-dj-cyan font-bold w-12 text-right">
                {requestCooldown}s
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1">
              <AlignLeft className="w-3.5 h-3.5 text-slate-400" /> Notes / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Special instructions or program schedule..."
              className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-dj-border text-slate-400 hover:text-white text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-dj-cyan to-dj-magenta text-black font-extrabold text-xs shadow-lg glow-cyan flex items-center gap-1.5"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
