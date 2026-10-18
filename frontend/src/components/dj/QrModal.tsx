import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check, Globe, RefreshCw, ExternalLink, AlertTriangle, Key, Smartphone, Users } from 'lucide-react';
import { api } from '../../services/api';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  qrCodeDataUrl: string;
  djPasscode?: string;
  onQrCodeUpdated?: (dataUrl: string) => void;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  qrCodeDataUrl,
  djPasscode,
  onQrCodeUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'GUEST' | 'DJ_REMOTE'>('GUEST');
  const [copied, setCopied] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [currentQr, setCurrentQr] = useState(qrCodeDataUrl);
  const [djQr, setDjQr] = useState<string>('');
  const [customOrigin, setCustomOrigin] = useState(() => localStorage.getItem('owndj_tunnel_url') || '');
  const [inputUrl, setInputUrl] = useState(() => localStorage.getItem('owndj_tunnel_url') || '');
  const [showConfig, setShowConfig] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const effectivePasscode = djPasscode || '1234';

  const effectiveOrigin = customOrigin.trim()
    ? customOrigin.trim().replace(/\/$/, '')
    : window.location.origin;

  const joinUrl = `${effectiveOrigin}/join/${roomCode}`;
  const djRemoteUrl = `${effectiveOrigin}/dj/${roomCode}?passcode=${effectivePasscode}`;
  const isLocalhost = effectiveOrigin.includes('localhost') || effectiveOrigin.includes('127.0.0.1');

  useEffect(() => {
    setCurrentQr(qrCodeDataUrl);
  }, [qrCodeDataUrl]);

  useEffect(() => {
    const saved = localStorage.getItem('owndj_tunnel_url') || '';
    setCustomOrigin(saved);
    setInputUrl(saved);
  }, [isOpen]);

  // Load DJ Remote QR code when modal opens or origin changes
  useEffect(() => {
    if (!isOpen || !roomCode) return;
    api.getQrCode(roomCode, effectiveOrigin, 'dj', effectivePasscode)
      .then((res) => setDjQr(res.qrCodeDataUrl))
      .catch((err) => console.warn('Failed to load DJ Remote QR:', err));
  }, [isOpen, roomCode, effectiveOrigin, effectivePasscode]);

  if (!isOpen) return null;

  const currentDisplayUrl = activeTab === 'GUEST' ? joinUrl : djRemoteUrl;
  const currentDisplayQr = activeTab === 'GUEST' ? currentQr : (djQr || currentQr);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentDisplayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPasscode = () => {
    navigator.clipboard.writeText(effectivePasscode);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  const handleApplyCustomUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanUrl = inputUrl.trim().replace(/\/$/, '');
    setIsUpdating(true);
    setStatusMessage(null);

    try {
      if (cleanUrl) {
        localStorage.setItem('owndj_tunnel_url', cleanUrl);
        setCustomOrigin(cleanUrl);
        const [resGuest, resDj] = await Promise.all([
          api.getQrCode(roomCode, cleanUrl, 'join'),
          api.getQrCode(roomCode, cleanUrl, 'dj', effectivePasscode),
        ]);
        setCurrentQr(resGuest.qrCodeDataUrl);
        setDjQr(resDj.qrCodeDataUrl);
        onQrCodeUpdated?.(resGuest.qrCodeDataUrl);
        setStatusMessage('QR codes updated to public tunnel!');
      } else {
        localStorage.removeItem('owndj_tunnel_url');
        setCustomOrigin('');
        const [resGuest, resDj] = await Promise.all([
          api.getQrCode(roomCode, undefined, 'join'),
          api.getQrCode(roomCode, undefined, 'dj', effectivePasscode),
        ]);
        setCurrentQr(resGuest.qrCodeDataUrl);
        setDjQr(resDj.qrCodeDataUrl);
        onQrCodeUpdated?.(resGuest.qrCodeDataUrl);
        setStatusMessage('Reset to default URL.');
      }
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setStatusMessage('Failed to update QR code.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = async () => {
    setInputUrl('');
    localStorage.removeItem('owndj_tunnel_url');
    setCustomOrigin('');
    setIsUpdating(true);
    try {
      const [resGuest, resDj] = await Promise.all([
        api.getQrCode(roomCode, undefined, 'join'),
        api.getQrCode(roomCode, undefined, 'dj', effectivePasscode),
      ]);
      setCurrentQr(resGuest.qrCodeDataUrl);
      setDjQr(resDj.qrCodeDataUrl);
      onQrCodeUpdated?.(resGuest.qrCodeDataUrl);
      setStatusMessage('Reset to default.');
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (err) {
      setStatusMessage('Failed to reset.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab Selection: Guest QR vs DJ Remote QR */}
        <div className="w-full flex items-center bg-black/50 p-1 rounded-2xl border border-dj-border mb-4 mt-1">
          <button
            onClick={() => setActiveTab('GUEST')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'GUEST'
                ? 'bg-dj-cyan text-black shadow-md glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Guest Requests QR</span>
          </button>
          <button
            onClick={() => setActiveTab('DJ_REMOTE')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'DJ_REMOTE'
                ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>DJ Phone Remote</span>
          </button>
        </div>

        {activeTab === 'GUEST' ? (
          <div>
            <h3 className="text-xl font-black text-white">Guest Request QR</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Guests scan with their phone camera to browse music and submit requests instantly.
            </p>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-black text-amber-300 flex items-center justify-center gap-2">
              <Key className="w-5 h-5 text-amber-400" />
              DJ Mobile Remote Pass
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              Scan with your smartphone camera to control the deck, queue, and transitions from the dance floor!
            </p>
          </div>
        )}

        {/* Localhost Warning Notice */}
        {isLocalhost && !customOrigin && (
          <div className="mt-3 w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-left flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200/90 leading-relaxed">
              <span className="font-bold text-amber-300">Using Localhost:</span> Mobile phones cannot reach <code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">localhost</code>.
              Run <code className="bg-black/40 px-1 py-0.5 rounded text-[11px] text-amber-300">cloudflared tunnel --url http://localhost:5173</code> and paste your <code className="bg-black/40 px-1 py-0.5 rounded text-[11px]">.trycloudflare.com</code> URL below!
            </div>
          </div>
        )}

        {/* Active Tunnel Badge */}
        {customOrigin && (
          <div className="mt-3 w-full bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-1.5 truncate">
              <Globe className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span className="font-mono truncate">{customOrigin}</span>
            </span>
            <button
              onClick={handleReset}
              className="text-[10px] uppercase font-bold text-slate-400 hover:text-rose-400 shrink-0 ml-2"
              title="Reset to localhost"
            >
              Reset
            </button>
          </div>
        )}

        {/* QR Code Container */}
        <div className={`my-4 p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 ${
          activeTab === 'DJ_REMOTE' ? 'border-amber-400' : 'border-dj-border'
        }`}>
          {currentDisplayQr ? (
            <img src={currentDisplayQr} alt="Room QR Code" className="w-52 h-52 object-contain" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-slate-900 font-mono text-xs">
              Generating QR Code...
            </div>
          )}
        </div>

        {/* Room & Passcode Callout */}
        <div className="w-full grid grid-cols-2 gap-2 mb-3">
          <div className="bg-dj-card border border-dj-border rounded-2xl p-2.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">ROOM CODE</span>
            <span className="text-xl font-black text-dj-cyan tracking-wider font-mono select-all">
              {roomCode}
            </span>
          </div>

          <div
            onClick={handleCopyPasscode}
            className="bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-2xl p-2.5 cursor-pointer transition-all flex flex-col justify-center items-center"
            title="Click to copy DJ Passcode"
          >
            <span className="text-[10px] font-mono uppercase text-amber-300 block mb-0.5 flex items-center gap-1">
              <Key className="w-3 h-3" /> DJ PASSCODE
            </span>
            <span className="text-xl font-black text-white tracking-widest font-mono flex items-center gap-1">
              {effectivePasscode}
              {copiedPasscode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400/60" />}
            </span>
          </div>
        </div>

        {/* Copy Shareable Link */}
        <div className="w-full flex items-center gap-2 mb-3">
          <input
            type="text"
            readOnly
            value={currentDisplayUrl}
            className="flex-1 bg-dj-card border border-dj-border rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
              copied
                ? 'bg-dj-green text-black border-dj-green glow-green'
                : 'bg-dj-card hover:bg-slate-700 text-white border-dj-border'
            }`}
            title="Copy link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Public Tunnel / Cloudflare URL Toggle */}
        <div className="w-full border-t border-dj-border/60 pt-3">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs font-semibold text-slate-400 hover:text-dj-cyan flex items-center justify-center gap-1.5 w-full transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {showConfig ? 'Hide Public Tunnel Settings' : 'Set Cloudflare / Public Tunnel URL'}
          </button>

          {showConfig && (
            <form onSubmit={handleApplyCustomUrl} className="mt-3 space-y-2 text-left">
              <label className="block text-[11px] font-mono font-bold text-slate-300 uppercase">
                Cloudflare Tunnel URL (e.g. trycloudflare.com)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://xyz.trycloudflare.com"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="flex-1 bg-dj-card border border-dj-border rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-dj-cyan"
                />
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-3 py-2 rounded-xl bg-dj-cyan hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                >
                  {isUpdating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Paste your <code className="text-slate-400">https://*.trycloudflare.com</code> link here to instantly re-encode the QR code and link for guests without restarting Docker!
              </p>
            </form>
          )}

          {statusMessage && (
            <p className="text-xs text-dj-cyan font-medium mt-2 animate-fadeIn">
              {statusMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
