import React, { useState } from 'react';
import { ProjectionPreset, Session } from '../../types';
import { api } from '../../services/api';
import {
  Tv,
  Sparkles,
  ExternalLink,
  Send,
  Check,
  Disc,
  Radio,
  Clock,
  Layers,
  X,
} from 'lucide-react';

interface ProjectorControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  hostToken: string;
}

export const ProjectorControlModal: React.FC<ProjectorControlModalProps> = ({
  isOpen,
  onClose,
  session,
  hostToken,
}) => {
  const [activePreset, setActivePreset] = useState<ProjectionPreset>(
    session.activeVisualPreset || 'NOW_PLAYING'
  );
  const [tickerMessage, setTickerMessage] = useState('');
  const [announcementSuccess, setAnnouncementSuccess] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!isOpen) return null;

  const presets: { id: ProjectionPreset; title: string; subtitle: string; icon: string }[] = [
    {
      id: 'WELCOME',
      title: 'Welcome Screen',
      subtitle: 'Large event greeting, celebrant names & request QR code',
      icon: '🌟',
    },
    {
      id: 'NOW_PLAYING',
      title: 'Now Playing',
      subtitle: 'Turntable vinyl animation, song title, artist & requester',
      icon: '🎵',
    },
    {
      id: 'PARTY_VISUALS',
      title: 'Party Visuals',
      subtitle: 'Hypnotic animated cyber-visuals with minimalist track badge',
      icon: '⚡',
    },
    {
      id: 'GUEST_REQUEST',
      title: 'Request Spotlight',
      subtitle: 'Highlight upcoming guest request dedication & requester',
      icon: '📢',
    },
    {
      id: 'STANDBY',
      title: 'Standby / Intermission',
      subtitle: 'Elegant event branding when music is paused',
      icon: '⏸️',
    },
  ];

  const handleSwitchPreset = async (preset: ProjectionPreset) => {
    setActivePreset(preset);
    setSwitching(true);
    try {
      await api.switchProjectorPreset(session.roomCode, hostToken, preset);
    } catch (err) {
      console.warn('Failed to switch projector preset:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerMessage.trim()) return;
    try {
      await api.sendProjectorAnnouncement(session.roomCode, hostToken, tickerMessage.trim());
      setAnnouncementSuccess(true);
      setTimeout(() => setAnnouncementSuccess(false), 3000);
      setTickerMessage('');
    } catch (err) {
      console.warn('Failed to send announcement:', err);
    }
  };

  const projectorUrl = `${window.location.origin}/projector/${session.roomCode}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Projector & TV Visuals Control</h3>
              <p className="text-xs text-slate-400">
                Switch live scenes on the projection screen without interrupting music
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Launch Projector Link */}
          <div className="p-3 bg-dj-card rounded-2xl border border-dj-border flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                Dedicated Display Output
              </span>
              <span className="text-xs font-mono text-dj-cyan font-semibold truncate block">
                {projectorUrl}
              </span>
            </div>
            <a
              href={`/projector/${session.roomCode}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-dj-cyan text-black font-bold text-xs flex items-center gap-1.5 shadow-md hover:scale-105 transition-all whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Projector Screen
            </a>
          </div>

          {/* Preset Scene Switcher */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-dj-cyan" /> 5 Projection Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((p) => {
                const isActive = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSwitchPreset(p.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-dj-cyan/20 border-dj-cyan text-white glow-cyan'
                        : 'bg-dj-card border-dj-border text-slate-400 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{p.icon}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-white">{p.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{p.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Ticker Announcement */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-dj-magenta" /> Send Live Ticker Announcement
            </label>
            <form onSubmit={handleSendAnnouncement} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Cake cutting in 5 minutes! • Dinner buffet open!"
                value={tickerMessage}
                onChange={(e) => setTickerMessage(e.target.value)}
                className="flex-1 px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-magenta"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-dj-magenta text-black font-bold text-xs flex items-center gap-1 hover:scale-105 transition-all shadow-md"
              >
                <Send className="w-3.5 h-3.5" /> Broadcast
              </button>
            </form>
            {announcementSuccess && (
              <p className="text-xs text-dj-emerald font-semibold mt-1 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Broadcast sent to projector screen!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
