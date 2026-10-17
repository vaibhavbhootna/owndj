import React, { useState, useEffect } from 'react';
import { PlaybackState, ProjectionPreset, Session } from '../../types';
import { api } from '../../services/api';
import { wsService } from '../../services/websocket';
import {
  Disc,
  Music,
  Sparkles,
  Users,
  Radio,
  QrCode,
  Heart,
  Volume2,
  X,
} from 'lucide-react';

interface ProjectorScreenProps {
  roomCode: string;
  onBack?: () => void;
}

export const ProjectorScreen: React.FC<ProjectorScreenProps> = ({ roomCode, onBack }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activePreset, setActivePreset] = useState<ProjectionPreset>('NOW_PLAYING');
  const [tickerMessage, setTickerMessage] = useState<string>('');
  const [announcementBanner, setAnnouncementBanner] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    status: 'IDLE',
    currentTrack: null,
    currentPositionSeconds: 0,
    volume: 100,
    autoAdvance: true,
  });

  // Fetch initial data
  useEffect(() => {
    if (!roomCode) return;

    api.getSession(roomCode)
      .then((s) => {
        setSession(s);
        if (s.activeVisualPreset) setActivePreset(s.activeVisualPreset);
        if (s.tickerText) setTickerMessage(s.tickerText);
      })
      .catch((err) => console.warn('Failed to load session for projector:', err));

    api.getQrCode(roomCode)
      .then((qr) => setQrDataUrl(qr.qrCodeDataUrl))
      .catch((err) => console.warn('Failed to load QR for projector:', err));

    // Connect WebSocket
    wsService.connect(roomCode);

    const unsubTrack = wsService.subscribe('CURRENT_TRACK_CHANGED', (event) => {
      setPlaybackState((prev) => ({ ...prev, ...event.payload }));
      if (event.payload.activeVisualPreset) {
        setActivePreset(event.payload.activeVisualPreset);
      }
    });

    const unsubPreset = wsService.subscribe('VISUAL_PRESET_CHANGED', (event) => {
      if (event.payload.preset) setActivePreset(event.payload.preset);
      if (event.payload.tickerText) setTickerMessage(event.payload.tickerText);
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeVisualPreset: event.payload.preset || prev.activeVisualPreset,
          tickerText: event.payload.tickerText ?? prev.tickerText,
          bannerText: event.payload.bannerText ?? prev.bannerText,
          themeColor: event.payload.themeColor || prev.themeColor,
          customScreenTitle: event.payload.customScreenTitle ?? prev.customScreenTitle,
          customScreenSubtitle: event.payload.customScreenSubtitle ?? prev.customScreenSubtitle,
          customScreenImageUrl: event.payload.customScreenImageUrl ?? prev.customScreenImageUrl,
          customScreenTag: event.payload.customScreenTag ?? prev.customScreenTag,
          customScreenLayout: event.payload.customScreenLayout ?? prev.customScreenLayout,
          customScreenShowQr: event.payload.customScreenShowQr ?? prev.customScreenShowQr,
          customScreenShowNowPlaying: event.payload.customScreenShowNowPlaying ?? prev.customScreenShowNowPlaying,
        };
      });
    });

    const unsubAnnouncement = wsService.subscribe('PROJECTION_ANNOUNCEMENT', (event) => {
      if (event.payload.announcement) {
        setAnnouncementBanner(event.payload.announcement);
        setTickerMessage(event.payload.announcement);
        setTimeout(() => setAnnouncementBanner(null), 12000);
      }
    });

    return () => {
      unsubTrack();
      unsubPreset();
      unsubAnnouncement();
      wsService.disconnect();
    };
  }, [roomCode]);

  const themeColor = session?.themeColor || '#06b6d4';
  const bannerTitle = session?.bannerText || session?.name || 'VIRTUAL DJ LIVE';
  const track = playbackState.currentTrack;

  return (
    <div className="fixed inset-0 bg-[#05050c] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Dynamic Animated Ambient Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full blur-[140px] animate-pulse"
          style={{ backgroundColor: themeColor }}
        />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full blur-[140px] bg-dj-magenta opacity-40 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[180px] bg-purple-900/20" />
      </div>

      {/* Pop-up Special Announcement Banner */}
      {announcementBanner && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 px-8 py-4 rounded-3xl bg-gradient-to-r from-dj-magenta via-purple-600 to-dj-cyan text-white font-extrabold text-2xl shadow-2xl border-2 border-white/60 animate-bounce flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-yellow-300 animate-spin" />
          <span>{announcementBanner}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="relative z-10 px-10 py-6 flex items-center justify-between border-b border-white/10 backdrop-blur-md bg-black/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-dj-cyan/20 border border-dj-cyan/40">
            <Radio className="w-4 h-4 text-dj-cyan animate-pulse" />
            <span className="font-mono text-xs font-bold tracking-wider text-dj-cyan uppercase">
              LIVE SESSION • {roomCode}
            </span>
          </div>
          {session?.venue && (
            <span className="text-sm font-semibold text-slate-300">📍 {session.venue}</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <h2 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
              {session?.name || 'Virtual DJ Event'}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {session?.eventDate || 'Tonight'}
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              title="Exit Projector Mode"
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Scene Body (Changes based on active preset) */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-8 max-w-7xl mx-auto w-full">
        {/* PRESET 1: WELCOME SCREEN */}
        {activePreset === 'WELCOME' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-12 w-full animate-fade-in">
            <div className="flex-1 space-y-6 text-left">
              <span className="px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-dj-cyan/20 text-dj-cyan border border-dj-cyan/40 inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Welcome to the Celebration
              </span>
              <h1 className="text-6xl md:text-7xl font-black leading-tight tracking-tight text-white drop-shadow-lg">
                {bannerTitle}
              </h1>
              <p className="text-xl text-slate-300 max-w-xl leading-relaxed">
                {session?.description ||
                  'The DJ is live! Scan the QR code with your smartphone to browse music and request your favorite tracks!'}
              </p>
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-sm font-mono text-slate-400">
                  <span className="w-3 h-3 rounded-full bg-dj-emerald animate-ping" />
                  Live Guest Request System Active
                </div>
              </div>
            </div>

            {/* Giant Join QR Code */}
            {qrDataUrl && (
              <div className="flex flex-col items-center bg-black/60 p-6 rounded-3xl border-2 border-dj-cyan shadow-2xl backdrop-blur-xl glow-cyan">
                <img src={qrDataUrl} alt="Scan to join" className="w-64 h-64 rounded-2xl bg-white p-2" />
                <span className="mt-4 font-mono font-bold text-sm text-dj-cyan tracking-wider">
                  ROOM: {roomCode}
                </span>
                <span className="text-xs text-slate-400 mt-1">Scan to Request Songs</span>
              </div>
            )}
          </div>
        )}

        {/* PRESET 2: NOW PLAYING SCREEN */}
        {activePreset === 'NOW_PLAYING' && (
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 w-full animate-fade-in">
            {/* Spinning Vinyl Turntable Animation */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <div className="w-72 h-72 md:w-96 md:h-96 rounded-full bg-black border-4 border-slate-700 shadow-2xl flex items-center justify-center relative overflow-hidden animate-spin-slow">
                {/* Vinyl Grooves */}
                <div className="absolute inset-4 rounded-full border border-slate-800" />
                <div className="absolute inset-8 rounded-full border border-slate-800" />
                <div className="absolute inset-14 rounded-full border border-slate-800" />
                <div className="absolute inset-20 rounded-full border border-slate-800" />

                {/* Center Record Label Artwork */}
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-white/20 relative z-10">
                  {track?.song.thumbnailUrl ? (
                    <img
                      src={track.song.thumbnailUrl}
                      alt={track.song.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-dj-cyan to-dj-magenta flex items-center justify-center">
                      <Disc className="w-16 h-16 text-black" />
                    </div>
                  )}
                </div>
              </div>

              {/* Tonearm Simulation */}
              <div className="absolute -top-4 -right-4 w-24 h-24 pointer-events-none">
                <div className="w-3 h-32 bg-slate-400 origin-top rotate-45 rounded-full shadow-lg border border-slate-600" />
              </div>
            </div>

            {/* Song Info & Requester Spotlight */}
            <div className="flex-1 space-y-5 text-left">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-dj-cyan text-black flex items-center gap-1.5 shadow-md">
                  <Volume2 className="w-3.5 h-3.5" /> Now Playing
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {playbackState.playlistSource === 'DJ_DECK' ? 'DJ Deck Selection' : 'Crowd Request'}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white leading-tight drop-shadow-md">
                {track ? track.song.title : 'Ready for Next Song'}
              </h1>

              <h3 className="text-2xl md:text-3xl font-bold text-dj-cyan">
                {track?.song.channelTitle || track?.song.artist || 'Virtual DJ Session'}
              </h3>

              {/* Dedication / Requester Card */}
              {track?.guestNickname && playbackState.playlistSource !== 'DJ_DECK' && (
                <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-dj-magenta/20 border border-dj-magenta/50 text-white backdrop-blur-md">
                  <div className="w-9 h-9 rounded-full bg-dj-magenta text-black flex items-center justify-center font-bold text-sm">
                    {track.guestNickname.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-dj-magenta font-bold uppercase block">
                      Crowd Request
                    </span>
                    <span className="text-base font-extrabold text-white">
                      Requested by @{track.guestNickname}
                    </span>
                  </div>
                </div>
              )}

              {/* Animated Equalizer Waves */}
              <div className="flex items-end gap-1.5 h-12 pt-2">
                {[...Array(24)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-full bg-gradient-to-t from-dj-cyan to-dj-magenta animate-pulse"
                    style={{
                      height: `${Math.max(15, (Math.sin(i * 0.8) * 0.5 + 0.5) * 100)}%`,
                      animationDuration: `${0.4 + (i % 5) * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Corner Request QR */}
            {qrDataUrl && (
              <div className="hidden xl:flex flex-col items-center bg-black/50 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <img src={qrDataUrl} alt="QR" className="w-28 h-28 rounded-xl bg-white p-1" />
                <span className="mt-2 font-mono text-[11px] text-dj-cyan font-bold">Request Songs</span>
              </div>
            )}
          </div>
        )}

        {/* PRESET 3: PARTY VISUALS */}
        {activePreset === 'PARTY_VISUALS' && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
            {/* Hypnotic Pulsing Rings */}
            <div className="relative w-80 h-80 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-dj-cyan/30 animate-ping" />
              <div className="absolute inset-8 rounded-full border-4 border-dj-magenta/40 animate-pulse" />
              <div className="w-48 h-48 rounded-full bg-gradient-to-tr from-dj-cyan via-purple-600 to-dj-magenta flex items-center justify-center shadow-2xl glow-cyan animate-spin-slow">
                <Disc className="w-24 h-24 text-black" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-dj-cyan via-white to-dj-magenta">
                {bannerTitle}
              </h2>
              {track && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 border border-white/20 backdrop-blur-md">
                  <Volume2 className="w-4 h-4 text-dj-cyan" />
                  <span className="font-bold text-sm text-white">{track.song.title}</span>
                  <span className="text-xs text-slate-400">• {track.song.channelTitle}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PRESET 4: GUEST REQUEST SPOTLIGHT */}
        {activePreset === 'GUEST_REQUEST' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-2xl animate-fade-in">
            <span className="px-5 py-2 rounded-full text-sm font-mono font-bold uppercase tracking-widest bg-dj-magenta text-black shadow-lg glow-magenta animate-bounce">
              🎵 REQUEST SPOTLIGHT 🎵
            </span>
            <h1 className="text-5xl md:text-6xl font-black text-white">
              {track ? track.song.title : 'Upcoming Guest Request'}
            </h1>
            <p className="text-2xl font-bold text-dj-cyan">
              {track ? track.song.channelTitle || track.song.artist : 'Join the queue!'}
            </p>
            {track?.guestNickname && (
              <div className="px-8 py-4 rounded-3xl bg-black/60 border-2 border-dj-magenta shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-mono uppercase text-slate-400 block">Requested with love by</span>
                <span className="text-3xl font-black text-dj-magenta">@{track.guestNickname}</span>
              </div>
            )}
          </div>
        )}

        {/* PRESET 5: STANDBY / INTERMISSION */}
        {activePreset === 'STANDBY' && (
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-slate-700 flex items-center justify-center text-dj-cyan shadow-xl">
              <Music className="w-12 h-12" />
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-white">{bannerTitle}</h1>
            <p className="text-xl text-slate-400 max-w-md">
              Music is on standby. Scan the code to submit requests for the next set!
            </p>
            {qrDataUrl && (
              <div className="bg-white p-3 rounded-2xl shadow-2xl">
                <img src={qrDataUrl} alt="QR" className="w-48 h-48" />
              </div>
            )}
          </div>
        )}

        {/* PRESET 6: CUSTOM CELEBRATION MOMENT (Cake Cutting, Ring Ceremony, Wedding, etc.) */}
        {activePreset === 'CUSTOM_SCREEN' && (
          <div className="w-full h-full flex items-center justify-center animate-fade-in relative z-10 py-4">
            {/* Background Custom Image Backdrop (with gentle ambient dark overlay) */}
            {session?.customScreenImageUrl && (
              <div className="absolute -inset-16 pointer-events-none overflow-hidden z-0">
                <img
                  src={session.customScreenImageUrl}
                  alt="Celebration Background"
                  className="w-full h-full object-cover filter blur-[2px] brightness-[0.25] scale-105 transition-all duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050c] via-black/40 to-[#05050c]/70" />
              </div>
            )}

            {/* Layout Mode 1: SPLIT (Side-by-side with hero photo) */}
            {(!session?.customScreenLayout || session.customScreenLayout === 'SPLIT') && (
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 w-full max-w-6xl mx-auto px-4">
                {/* Left: Custom Hero Image / Photo */}
                <div className="flex-1 max-w-lg w-full flex items-center justify-center">
                  <div className="relative group rounded-3xl p-1.5 bg-gradient-to-tr from-dj-cyan via-pink-500 to-amber-400 shadow-2xl glow-cyan w-full">
                    {session?.customScreenImageUrl ? (
                      <img
                        src={session.customScreenImageUrl}
                        alt="Celebration Visual"
                        className="w-full h-72 md:h-96 object-cover rounded-2xl shadow-2xl"
                      />
                    ) : (
                      <div className="w-full h-72 md:h-96 rounded-2xl bg-slate-900/90 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <Sparkles className="w-16 h-16 text-yellow-400 mb-3 animate-spin" />
                        <span className="text-white font-bold text-lg">Custom Celebration Visual</span>
                        <span className="text-xs text-slate-400 mt-1">Upload an image or pick a celebration moment</span>
                      </div>
                    )}
                    {/* Floating Celebration Badge */}
                    <div className="absolute -bottom-3 -right-3 px-4 py-1.5 rounded-full bg-dj-magenta text-black font-black text-xs uppercase shadow-xl tracking-wider flex items-center gap-1.5 glow-magenta">
                      <Sparkles className="w-3.5 h-3.5" />
                      {session?.customScreenTag || 'CELEBRATION MOMENT'}
                    </div>
                  </div>
                </div>

                {/* Right: Headlines, Subtitle, & Live Request QR */}
                <div className="flex-1 space-y-6 text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-amber-300 font-mono text-xs font-bold uppercase tracking-widest shadow-md">
                    <span>✨</span>
                    <span>{session?.customScreenTag || 'SPECIAL MOMENT'}</span>
                  </div>

                  <h1 className="text-5xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">
                    {session?.customScreenTitle || 'Time for Celebration! 🎂'}
                  </h1>

                  <p className="text-xl md:text-2xl text-slate-200 font-medium leading-relaxed drop-shadow-md">
                    {session?.customScreenSubtitle || 'Join in the celebration and make unforgettable memories together!'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    {session?.customScreenShowQr !== false && qrDataUrl && (
                      <div className="flex items-center gap-3 bg-black/60 p-3 rounded-2xl border border-white/20 backdrop-blur-md shadow-xl">
                        <img src={qrDataUrl} alt="QR" className="w-16 h-16 rounded-xl bg-white p-1" />
                        <div>
                          <span className="text-[10px] font-mono uppercase text-dj-cyan font-bold block">
                            Live Requests
                          </span>
                          <span className="text-xs font-extrabold text-white">Scan to Request Songs</span>
                        </div>
                      </div>
                    )}

                    {session?.customScreenShowNowPlaying !== false && track && (
                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/60 border border-white/20 backdrop-blur-md shadow-xl">
                        <Volume2 className="w-4 h-4 text-dj-cyan animate-pulse" />
                        <div className="text-left">
                          <span className="text-[10px] font-mono uppercase text-slate-400 block">Playing Now</span>
                          <span className="text-xs font-bold text-white truncate max-w-[200px] block">{track.song.title}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Layout Mode 2: BACKGROUND (Full-bleed hero backdrop with centered card) */}
            {session?.customScreenLayout === 'BACKGROUND' && (
              <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-4xl mx-auto p-10 rounded-3xl bg-black/65 border-2 border-white/20 backdrop-blur-xl shadow-2xl space-y-6">
                <span className="px-5 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-gradient-to-r from-amber-400 to-pink-500 text-black shadow-lg">
                  ✨ {session?.customScreenTag || 'CELEBRATION'} ✨
                </span>
                <h1 className="text-5xl md:text-7xl font-black text-white leading-tight">
                  {session?.customScreenTitle || 'Celebrating Together'}
                </h1>
                <p className="text-2xl text-slate-200 max-w-2xl leading-relaxed">
                  {session?.customScreenSubtitle || 'Dance, cheer, and celebrate this memorable occasion!'}
                </p>
                {session?.customScreenShowQr !== false && qrDataUrl && (
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <img src={qrDataUrl} alt="QR" className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-xl" />
                    <div className="text-left">
                      <span className="text-xs font-mono uppercase text-dj-cyan font-bold block">Keep the party going</span>
                      <span className="text-sm font-bold text-white">Scan to Request Songs</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Layout Mode 3: CENTER (Framed Centerpiece Photo) */}
            {session?.customScreenLayout === 'CENTER' && (
              <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6">
                <span className="px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-widest bg-dj-cyan/20 text-dj-cyan border border-dj-cyan/40">
                  🎉 {session?.customScreenTag || 'MOMENT OF CELEBRATION'}
                </span>
                <h1 className="text-4xl md:text-6xl font-black text-white">
                  {session?.customScreenTitle || 'Time for Cake Cutting! 🎂'}
                </h1>
                {session?.customScreenImageUrl && (
                  <div className="w-80 h-56 md:w-96 md:h-64 rounded-3xl overflow-hidden border-4 border-white/30 shadow-2xl glow-cyan">
                    <img
                      src={session.customScreenImageUrl}
                      alt="Celebration"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p className="text-xl text-slate-300 max-w-xl">
                  {session?.customScreenSubtitle || 'Join in the celebration and make unforgettable memories!'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Live Ticker Marquee */}
      <footer className="relative z-10 px-8 py-4 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center gap-4 overflow-hidden">
        <div className="px-3 py-1 rounded-lg bg-dj-magenta/20 border border-dj-magenta/40 text-dj-magenta font-mono text-xs font-bold uppercase tracking-wider flex-shrink-0 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> LIVE
        </div>

        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee font-bold text-sm tracking-wide text-slate-200">
            {tickerMessage ||
              'Scan the QR code with your camera to request your favorite songs • Live Virtual DJ Powered • Enjoy the Party!'}
          </div>
        </div>
      </footer>
    </div>
  );
};
