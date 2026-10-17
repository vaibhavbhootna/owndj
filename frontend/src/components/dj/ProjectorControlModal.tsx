import React, { useState, useEffect } from 'react';
import { ProjectionPreset, Session, VisualTemplate } from '../../types';
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
  Image as ImageIcon,
  Upload,
  Bookmark,
  Trash2,
  Play,
  Eye,
  Sliders,
  Palette,
  QrCode,
  Volume2,
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
  const [activeTab, setActiveTab] = useState<'MOMENTS' | 'CUSTOM_STUDIO' | 'PRESETS'>('MOMENTS');
  const [activePreset, setActivePreset] = useState<ProjectionPreset>(
    session.activeVisualPreset || 'NOW_PLAYING'
  );

  // Custom Screen form state
  const [customTitle, setCustomTitle] = useState(
    session.customScreenTitle || 'Time for Cake Cutting! 🎂'
  );
  const [customSubtitle, setCustomSubtitle] = useState(
    session.customScreenSubtitle || 'Gather around the celebration table and get ready to sing along!'
  );
  const [customTag, setCustomTag] = useState(
    session.customScreenTag || '🎂 CAKE CUTTING MOMENT'
  );
  const [customImageUrl, setCustomImageUrl] = useState(
    session.customScreenImageUrl ||
      'https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=1920&auto=format&fit=crop'
  );
  const [customTicker, setCustomTicker] = useState(
    session.tickerText ||
      '🎂 CAKE CUTTING TIME! Gather around the cake table • Make a wish and let us celebrate! • OwnDJ Live'
  );
  const [customLayout, setCustomLayout] = useState<'SPLIT' | 'BACKGROUND' | 'CENTER'>(
    (session.customScreenLayout as any) || 'SPLIT'
  );
  const [showQr, setShowQr] = useState(session.customScreenShowQr !== false);
  const [showNowPlaying, setShowNowPlaying] = useState(session.customScreenShowNowPlaying !== false);

  // State for templates & uploads
  const [savedTemplates, setSavedTemplates] = useState<VisualTemplate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Quick ticker announcement
  const [quickTickerText, setQuickTickerText] = useState('');
  const [tickerSuccess, setTickerSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadTemplates();
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      const templates = await api.listVisualTemplates();
      setSavedTemplates(templates);
    } catch (err) {
      console.warn('Failed to load visual templates:', err);
    }
  };

  if (!isOpen) return null;

  const presets: { id: ProjectionPreset; title: string; subtitle: string; icon: string }[] = [
    {
      id: 'CUSTOM_SCREEN',
      title: 'Custom Screen',
      subtitle: 'Show your custom image, celebratory moment, and announcement ticker',
      icon: '✨',
    },
    {
      id: 'NOW_PLAYING',
      title: 'Now Playing',
      subtitle: 'Turntable vinyl animation, song title, artist & requester dedication',
      icon: '🎵',
    },
    {
      id: 'WELCOME',
      title: 'Welcome Screen',
      subtitle: 'Large event greeting, celebrant names & song request QR code',
      icon: '🌟',
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
      subtitle: 'Ambient event branding when music is paused',
      icon: '⏸️',
    },
  ];

  // Curated celebration themes for instant image selection
  const quickThemes = [
    {
      name: '🎂 Cake Cutting',
      tag: '🎂 CAKE CUTTING TIME',
      title: 'Time for Cake Cutting! 🎂',
      subtitle: 'Gather around the celebration table and make a wish!',
      ticker: '🎂 CAKE CUTTING TIME! Gather around the cake table • Make a wish and let us celebrate! • OwnDJ Live',
      image: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?q=80&w=1920&auto=format&fit=crop',
    },
    {
      name: '💍 Ring Ceremony',
      tag: '💍 RING CEREMONY',
      title: 'Exchange of Rings 💍',
      subtitle: 'Two souls, two hearts, one eternal promise of love and togetherness.',
      ticker: '💍 RING CEREMONY: Celebrating eternal love and the beautiful journey ahead • Cheers to the couple! • OwnDJ',
      image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1920&auto=format&fit=crop',
    },
    {
      name: '💒 Wedding Dance',
      tag: '💒 JUST MARRIED',
      title: 'Celebrating Our Wedding 💒',
      subtitle: 'Thank you for joining us on our special day! Dance, feast, and make memories!',
      ticker: '💒 JUST MARRIED: Celebrating love, laughter, and happily ever after • Request your favorite dance songs now!',
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1920&auto=format&fit=crop',
    },
    {
      name: '🥂 Champagne Toast',
      tag: '🥂 SPECIAL TOAST',
      title: 'Raise Your Glasses! 🥂',
      subtitle: 'Here is to good times, great music, and unforgettable memories together!',
      ticker: '🥂 CHEERS TO TONIGHT: Raise your glasses for a special toast! • Keep the drinks flowing and the music bumping!',
      image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1920&auto=format&fit=crop',
    },
    {
      name: '🔥 Dance Floor Open',
      tag: '🔥 DANCE FLOOR LIVE',
      title: 'The Dance Floor is OPEN! 🔥',
      subtitle: 'Put on your dancing shoes and get on the floor! Send your requests now!',
      ticker: '🔥 DANCE FLOOR IS LIVE: DJ is taking requests • Scan the QR code to get your song in line • Let us party!',
      image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1920&auto=format&fit=crop',
    },
  ];

  const applyTheme = (theme: typeof quickThemes[0]) => {
    setCustomTitle(theme.title);
    setCustomSubtitle(theme.subtitle);
    setCustomTag(theme.tag);
    setCustomImageUrl(theme.image);
    setCustomTicker(theme.ticker);
  };

  const handleSwitchPreset = async (preset: ProjectionPreset) => {
    setActivePreset(preset);
    try {
      await api.switchProjectorPreset(session.roomCode, hostToken, preset);
      showStatus(`Preset switched to ${preset.replace('_', ' ')}`);
    } catch (err) {
      console.warn('Failed to switch preset:', err);
    }
  };

  const handleActivateTemplate = async (template: VisualTemplate) => {
    try {
      await api.activateVisualTemplate(session.roomCode, hostToken, template.id);
      setActivePreset('CUSTOM_SCREEN');
      showStatus(`Activated moment '${template.templateName}' on projector!`);
    } catch (err) {
      console.warn('Failed to activate template:', err);
    }
  };

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this celebration moment template?')) return;
    try {
      await api.deleteVisualTemplate(id);
      setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
      showStatus('Celebration moment deleted');
    } catch (err) {
      console.warn('Failed to delete template:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const asset = await api.uploadVisualAsset(file, hostToken);
      const url = `/api/media/visuals/${asset.storageKey}`;
      setCustomImageUrl(url);
      showStatus('Custom image uploaded successfully!');
    } catch (err) {
      alert('Failed to upload image. Please try a JPG or PNG under 20MB.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleProjectCustomScreenNow = async () => {
    try {
      await api.updateProjectorCustomScreen(session.roomCode, hostToken, {
        customScreenTitle: customTitle,
        customScreenSubtitle: customSubtitle,
        customScreenTag: customTag,
        customScreenImageUrl: customImageUrl,
        customScreenLayout: customLayout,
        customScreenShowQr: showQr,
        customScreenShowNowPlaying: showNowPlaying,
        activateImmediately: true,
      });

      // Also update ticker text
      if (customTicker.trim()) {
        await api.sendProjectorAnnouncement(session.roomCode, hostToken, customTicker.trim());
      }

      setActivePreset('CUSTOM_SCREEN');
      showStatus('✨ Custom screen & celebration ticker projected live!');
    } catch (err) {
      alert('Failed to project custom screen.');
    }
  };

  const handleSaveAsTemplate = async () => {
    const name = templateName.trim() || customTitle;
    if (!name) {
      alert('Please enter a name for this celebration moment.');
      return;
    }

    try {
      const saved = await api.createVisualTemplate({
        templateName: name,
        eventType: session.eventType || 'PARTY',
        bannerTitle: customTitle,
        greetingMessage: customSubtitle,
        tickerText: customTicker,
        themePreset: 'CUSTOM_SCREEN',
        bgType: 'IMAGE',
        bgMediaUrl: customImageUrl,
        bgOpacity: 0.85,
        showQrCode: showQr,
        showNowPlaying: showNowPlaying,
        primaryColor: session.themeColor || '#06b6d4',
        accentColor: '#ec4899',
      });
      setSavedTemplates((prev) => [saved, ...prev]);
      setTemplateName('');
      showStatus(`Saved '${saved.templateName}' to celebration moments library!`);
    } catch (err) {
      alert('Failed to save celebration moment.');
    }
  };

  const handleSendQuickTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTickerText.trim()) return;
    try {
      await api.sendProjectorAnnouncement(session.roomCode, hostToken, quickTickerText.trim());
      setTickerSuccess(true);
      setTimeout(() => setTickerSuccess(false), 3000);
      setQuickTickerText('');
    } catch (err) {
      console.warn('Failed to send announcement:', err);
    }
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const projectorUrl = `${window.location.origin}/projector/${session.roomCode}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-dj-cyan to-dj-magenta text-black font-black">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Projector & TV Studio</h3>
                <span className="px-2 py-0.5 rounded-full bg-dj-cyan/20 border border-dj-cyan/40 text-[10px] font-mono text-dj-cyan uppercase font-bold">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Trigger celebration moments, show custom photo screens, and broadcast announcement tickers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation & Status Alert */}
        <div className="px-5 pt-3 pb-2 border-b border-dj-border/60 bg-dj-card/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('MOMENTS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'MOMENTS'
                  ? 'bg-dj-magenta text-white shadow-md glow-magenta'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Celebration Moments (Cake, Rings, Wedding)
            </button>
            <button
              onClick={() => setActiveTab('CUSTOM_STUDIO')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'CUSTOM_STUDIO'
                  ? 'bg-dj-cyan text-black shadow-md glow-cyan font-black'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Custom Image & Text Designer
            </button>
            <button
              onClick={() => setActiveTab('PRESETS')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'PRESETS'
                  ? 'bg-white/20 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Standard Scenes ({presets.length})
            </button>
          </div>

          <a
            href={`/projector/${session.roomCode}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5 text-dj-cyan" /> Launch Projector Window
          </a>
        </div>

        {/* Feedback Alert Bar */}
        {statusMessage && (
          <div className="px-5 py-2 bg-dj-emerald/15 border-b border-dj-emerald/30 text-dj-emerald text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: CELEBRATION MOMENTS */}
          {activeTab === 'MOMENTS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Instant Celebration Moments & Announcements
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    1-click triggers for Cake Cutting, Ring Ceremony, Wedding First Dance, Champagne Toast, and custom moments
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('CUSTOM_STUDIO')}
                  className="px-3 py-1.5 rounded-xl bg-dj-cyan/20 border border-dj-cyan/40 text-dj-cyan font-bold text-xs hover:bg-dj-cyan hover:text-black transition-all flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" /> + New Custom Moment
                </button>
              </div>

              {/* Grid of Moments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedTemplates.map((template) => {
                  return (
                    <div
                      key={template.id}
                      className="group p-3.5 rounded-2xl bg-dj-card border border-dj-border hover:border-dj-cyan/60 transition-all flex flex-col justify-between relative overflow-hidden"
                    >
                      {/* Thumbnail Background Preview */}
                      <div className="h-32 rounded-xl overflow-hidden relative mb-3 border border-slate-800">
                        {template.bgMediaUrl ? (
                          <img
                            src={template.bgMediaUrl}
                            alt={template.templateName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-tr from-dj-cyan/20 to-dj-magenta/20 flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-mono font-bold text-amber-300">
                          {template.eventType || 'MOMENT'}
                        </span>
                      </div>

                      <div className="space-y-1 mb-3">
                        <h5 className="font-extrabold text-sm text-white group-hover:text-dj-cyan transition-colors">
                          {template.bannerTitle}
                        </h5>
                        <p className="text-xs text-slate-400 line-clamp-1">{template.greetingMessage}</p>
                        <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-slate-300 truncate">
                          📢 {template.tickerText || 'Celebration announcement'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-dj-border/50">
                        <button
                          onClick={() => handleActivateTemplate(template)}
                          className="flex-1 py-2 rounded-xl bg-gradient-to-r from-dj-cyan to-dj-magenta text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-[1.02] transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" /> Project Live Now
                        </button>
                        <button
                          onClick={(e) => handleDeleteTemplate(template.id, e)}
                          title="Delete moment"
                          className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM IMAGE & TEXT DESIGNER */}
          {activeTab === 'CUSTOM_STUDIO' && (
            <div className="space-y-6 animate-fade-in">
              {/* Quick Pick Themes */}
              <div>
                <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                  Quick Celebration Themes (One-Click Setup)
                </label>
                <div className="flex flex-wrap gap-2">
                  {quickThemes.map((th) => (
                    <button
                      key={th.name}
                      type="button"
                      onClick={() => applyTheme(th)}
                      className="px-3 py-1.5 rounded-xl bg-dj-card border border-dj-border hover:border-dj-cyan text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                    >
                      <span>{th.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Inputs */}
                <div className="space-y-4">
                  {/* Image Source Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase">
                      Background / Hero Image
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        placeholder="Paste image URL (JPG, PNG, WebP)..."
                        className="flex-1 px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan font-mono"
                      />
                      <label className="px-3 py-2 rounded-xl bg-dj-cyan/20 border border-dj-cyan/40 text-dj-cyan font-bold text-xs hover:bg-dj-cyan hover:text-black transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Moment Tag / Badge */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Event Tag / Badge
                    </label>
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      placeholder="e.g. 🎂 CAKE CUTTING MOMENT"
                      className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan"
                    />
                  </div>

                  {/* Headline Title */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Screen Title / Headline
                    </label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Time for Cake Cutting! 🎂"
                      className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white font-bold focus:outline-none focus:border-dj-cyan"
                    />
                  </div>

                  {/* Subtitle / Dedication Message */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1">
                      Subtitle / Dedication Message
                    </label>
                    <textarea
                      rows={2}
                      value={customSubtitle}
                      onChange={(e) => setCustomSubtitle(e.target.value)}
                      placeholder="e.g. Gather around the celebration table and get ready to sing along!"
                      className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan"
                    />
                  </div>

                  {/* Ticker Announcement Text */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-dj-magenta" /> Scrolling Bottom Ticker Text
                    </label>
                    <input
                      type="text"
                      value={customTicker}
                      onChange={(e) => setCustomTicker(e.target.value)}
                      placeholder="e.g. 🎂 Cake cutting in 5 minutes! Gather around the cake table!"
                      className="w-full px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-magenta font-mono"
                    />
                  </div>

                  {/* Layout Choice */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5">
                      Display Layout on Projector
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'SPLIT', label: 'Side-by-Side', desc: 'Hero Card + Text' },
                        { id: 'BACKGROUND', label: 'Full Backdrop', desc: 'Cover Screen' },
                        { id: 'CENTER', label: 'Centerpiece', desc: 'Framed Photo' },
                      ].map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setCustomLayout(l.id as any)}
                          className={`p-2.5 rounded-xl border text-center transition-all ${
                            customLayout === l.id
                              ? 'bg-dj-cyan/20 border-dj-cyan text-white glow-cyan'
                              : 'bg-dj-card border-dj-border text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="block text-xs font-bold">{l.label}</span>
                          <span className="text-[10px] text-slate-500">{l.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={showQr}
                        onChange={(e) => setShowQr(e.target.checked)}
                        className="rounded border-slate-700 text-dj-cyan focus:ring-0"
                      />
                      <span>Show Request QR</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={showNowPlaying}
                        onChange={(e) => setShowNowPlaying(e.target.checked)}
                        className="rounded border-slate-700 text-dj-cyan focus:ring-0"
                      />
                      <span>Show Now Playing Pill</span>
                    </label>
                  </div>
                </div>

                {/* Right: Live 16:9 Safe-Area Preview Panel */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-dj-cyan" /> 16:9 Projector Live Preview
                    </label>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-700 bg-[#05050c] shadow-2xl flex flex-col justify-between p-4 select-none">
                      {/* Blurred Background Simulation */}
                      {customImageUrl && (
                        <div className="absolute inset-0 pointer-events-none z-0">
                          <img
                            src={customImageUrl}
                            alt="Preview"
                            className="w-full h-full object-cover filter blur-[2px] brightness-[0.25]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/70" />
                        </div>
                      )}

                      {/* Header */}
                      <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded-full bg-dj-cyan/20 text-dj-cyan font-bold">
                          LIVE • {session.roomCode}
                        </span>
                        <span className="font-bold text-white truncate max-w-[150px]">{session.name}</span>
                      </div>

                      {/* Body based on layout */}
                      <div className="relative z-10 my-auto">
                        {customLayout === 'SPLIT' && (
                          <div className="flex items-center gap-3">
                            <div className="w-28 h-20 rounded-xl overflow-hidden border border-white/30 flex-shrink-0 shadow-lg">
                              <img src={customImageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="space-y-1 text-left min-w-0">
                              <span className="text-[9px] font-mono font-bold text-amber-300 uppercase block">
                                {customTag}
                              </span>
                              <h5 className="font-black text-xs text-white leading-tight truncate">{customTitle}</h5>
                              <p className="text-[10px] text-slate-300 line-clamp-2 leading-tight">
                                {customSubtitle}
                              </p>
                            </div>
                          </div>
                        )}

                        {customLayout === 'BACKGROUND' && (
                          <div className="text-center p-3 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md space-y-1">
                            <span className="text-[9px] font-mono font-bold text-amber-300 uppercase">
                              ✨ {customTag} ✨
                            </span>
                            <h5 className="font-black text-sm text-white">{customTitle}</h5>
                            <p className="text-[10px] text-slate-200 line-clamp-1">{customSubtitle}</p>
                          </div>
                        )}

                        {customLayout === 'CENTER' && (
                          <div className="text-center space-y-1">
                            <span className="text-[9px] font-mono font-bold text-dj-cyan uppercase">{customTag}</span>
                            <h5 className="font-black text-xs text-white">{customTitle}</h5>
                            <div className="w-24 h-16 mx-auto rounded-lg overflow-hidden border border-white/30 shadow-md">
                              <img src={customImageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <p className="text-[9px] text-slate-300 line-clamp-1">{customSubtitle}</p>
                          </div>
                        )}
                      </div>

                      {/* Bottom Simulated Ticker */}
                      <div className="relative z-10 px-2.5 py-1 rounded-md bg-black/70 border border-white/10 text-[9px] font-mono text-slate-300 flex items-center gap-1.5 overflow-hidden">
                        <span className="text-dj-magenta font-bold">📢 TICKER:</span>
                        <span className="truncate">{customTicker || 'Announcement text...'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleProjectCustomScreenNow}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-dj-cyan via-pink-500 to-amber-400 text-black font-black text-sm tracking-wide shadow-xl hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 fill-black" /> Project on Big Screen Now
                    </button>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Template name (e.g. My Cake Cutting)..."
                        className="flex-1 px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-cyan"
                      />
                      <button
                        type="button"
                        onClick={handleSaveAsTemplate}
                        className="px-4 py-2 rounded-xl bg-dj-card border border-dj-border hover:border-slate-400 text-white font-bold text-xs flex items-center gap-1.5 transition-all flex-shrink-0"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" /> Save Moment
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STANDARD SCENES */}
          {activeTab === 'PRESETS' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((p) => {
                  const isActive = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSwitchPreset(p.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        isActive
                          ? 'bg-dj-cyan/20 border-dj-cyan text-white glow-cyan'
                          : 'bg-dj-card border-dj-border text-slate-400 hover:border-slate-500 hover:text-white'
                      }`}
                    >
                      <span className="text-2xl flex-shrink-0">{p.icon}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-white">{p.title}</h4>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded-full bg-dj-cyan text-black font-mono text-[9px] font-bold">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{p.subtitle}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom: Quick Live Ticker Broadcast Bar */}
        <div className="p-4 border-t border-dj-border bg-black/60 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-dj-magenta animate-ping" />
            <span className="text-xs font-mono font-bold uppercase text-dj-magenta">
              Broadcast Flash Ticker:
            </span>
          </div>

          <form onSubmit={handleSendQuickTicker} className="flex-1 flex gap-2 w-full">
            <input
              type="text"
              placeholder="Type urgent announcement (e.g. Cake cutting starting now! • Bar closing soon!)..."
              value={quickTickerText}
              onChange={(e) => setQuickTickerText(e.target.value)}
              className="flex-1 px-3 py-2 bg-dj-card border border-dj-border rounded-xl text-xs text-white focus:outline-none focus:border-dj-magenta"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-dj-magenta text-black font-extrabold text-xs flex items-center gap-1.5 hover:scale-105 transition-all shadow-md flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Broadcast Now
            </button>
          </form>

          {tickerSuccess && (
            <span className="text-xs text-dj-emerald font-bold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Broadcasted!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
