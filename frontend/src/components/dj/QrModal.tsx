import React, { useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  qrCodeDataUrl: string;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  qrCodeDataUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-dj-cyan/20 border border-dj-cyan/40 flex items-center justify-center text-dj-cyan mb-3">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-black text-white">Join the Party</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Guests can scan with their phone camera to request songs instantly without any app installation.
        </p>

        {/* QR Code Container */}
        <div className="my-6 p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center border-4 border-dj-border">
          {qrCodeDataUrl ? (
            <img src={qrCodeDataUrl} alt="Room QR Code" className="w-56 h-56 object-contain" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-slate-900 font-mono text-xs">
              Generating QR Code...
            </div>
          )}
        </div>

        {/* Room Code Callout */}
        <div className="w-full bg-dj-card border border-dj-border rounded-2xl p-3 mb-4">
          <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">ROOM CODE</span>
          <span className="text-3xl font-black text-dj-cyan tracking-widest font-mono select-all">
            {roomCode}
          </span>
        </div>

        {/* Copy Shareable Link */}
        <div className="w-full flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={joinUrl}
            className="flex-1 bg-dj-card border border-dj-border rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className={`p-2.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 ${
              copied
                ? 'bg-dj-green text-black border-dj-green glow-green'
                : 'bg-dj-card hover:bg-slate-700 text-white border-dj-border'
            }`}
            title="Copy join link"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
