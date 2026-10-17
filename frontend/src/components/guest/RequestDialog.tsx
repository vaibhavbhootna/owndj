import React, { useState, useEffect } from 'react';
import { SongSearchResult, SongMoment, SessionSettings } from '../../types';
import { api } from '../../services/api';
import confetti from 'canvas-confetti';
import { X, Sparkles, Clock, Music, Check, ThumbsUp, Flame, AlertCircle } from 'lucide-react';

interface RequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  song: SongSearchResult | null;
  roomCode: string;
  guestToken: string;
  settings: SessionSettings;
  onRequestSubmitted: () => void;
}

export const RequestDialog: React.FC<RequestDialogProps> = ({
  isOpen,
  onClose,
  song,
  roomCode,
  guestToken,
  settings,
  onRequestSubmitted,
}) => {
  const [moments, setMoments] = useState<SongMoment[]>([]);
  const [selectedStart, setSelectedStart] = useState<number>(0);
  const [selectedDuration, setSelectedDuration] = useState<number>(settings.defaultSongDurationSeconds || 60);
  const [customMinutes, setCustomMinutes] = useState<number>(0);
  const [customSeconds, setCustomSeconds] = useState<number>(0);
  const [activeMomentId, setActiveMomentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (song && isOpen) {
      setSelectedStart(0);
      setCustomMinutes(0);
      setCustomSeconds(0);
      setActiveMomentId(null);
      setErrorMessage(null);
      setSelectedDuration(settings.defaultSongDurationSeconds || 60);

      // Fetch Smart Song Moments for this video
      setLoading(true);
      api.getMoments(song.videoId)
        .then((m) => {
          setMoments(m);
          // If a high-confidence moment exists (e.g. Chorus or Beat Drop), auto-select it as smart recommendation!
          const topMoment = m.find((item) => item.label.toLowerCase().includes('chorus') || item.label.toLowerCase().includes('drop'));
          if (topMoment) {
            setSelectedStart(topMoment.startSeconds);
            setActiveMomentId(topMoment.id);
            setCustomMinutes(Math.floor(topMoment.startSeconds / 60));
            setCustomSeconds(topMoment.startSeconds % 60);
          }
        })
        .catch((e) => console.warn('Failed to load moments:', e))
        .finally(() => setLoading(false));
    }
  }, [song, isOpen, settings.defaultSongDurationSeconds]);

  if (!isOpen || !song) return null;

  const formatTime = (secs: number) => {
    const s = Math.max(0, Math.floor(secs));
    const mins = Math.floor(s / 60);
    const remainder = s % 60;
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  const handleSelectMoment = (moment: SongMoment) => {
    setActiveMomentId(moment.id);
    setSelectedStart(moment.startSeconds);
    setCustomMinutes(Math.floor(moment.startSeconds / 60));
    setCustomSeconds(moment.startSeconds % 60);
  };

  const handleCustomTimeChange = (mins: number, secs: number) => {
    const totalSecs = Math.max(0, mins * 60 + secs);
    if (song.durationSeconds && totalSecs >= song.durationSeconds) return;
    setCustomMinutes(mins);
    setCustomSeconds(secs);
    setSelectedStart(totalSecs);
    setActiveMomentId(null);
  };

  const handleVoteMoment = async (momentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.voteMoment(momentId, guestToken, 1);
      setMoments((prev) => prev.map((m) => (m.id === momentId ? updated : m)));
    } catch (err) {
      console.warn('Failed to vote moment:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await api.submitRequest(roomCode, guestToken, {
        videoId: song.videoId,
        title: song.title,
        channelTitle: song.channelTitle,
        thumbnailUrl: song.thumbnailUrl,
        durationSeconds: song.durationSeconds,
        requestedStartSeconds: selectedStart,
        requestedDurationSeconds: selectedDuration,
      });

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });

      onRequestSubmitted();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit song request');
    } finally {
      setSubmitting(false);
    }
  };

  const calculatedEnd = Math.min(
    song.durationSeconds || 300,
    selectedStart + (selectedDuration > 0 ? selectedDuration : song.durationSeconds || 60)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-dj-surface border border-dj-border w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-dj-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-dj-cyan" />
            <h3 className="font-bold text-white text-base">Request Song</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-dj-card transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Song Preview Banner */}
        <div className="p-4 bg-dj-card/60 border-b border-dj-border flex items-center gap-3">
          <img
            src={song.thumbnailUrl}
            alt={song.title}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-slate-700"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm text-white truncate">{song.title}</h4>
            <p className="text-xs text-slate-400 truncate mt-0.5">{song.channelTitle}</p>
            <span className="text-[11px] font-mono text-dj-cyan font-semibold mt-1 block">
              Total Duration: {formatTime(song.durationSeconds)}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center gap-2 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Smart Song Moments Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-dj-magenta" /> Smart Song Moments
              </label>
              <span className="text-[11px] text-slate-400">Crowd & DJ picks</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Start from beginning button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStart(0);
                  setActiveMomentId(null);
                  setCustomMinutes(0);
                  setCustomSeconds(0);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${selectedStart === 0 && !activeMomentId
                    ? 'bg-dj-cyan/20 border-dj-cyan text-white glow-cyan'
                    : 'bg-dj-card border-dj-border text-slate-300 hover:border-slate-500'
                  }`}
              >
                <div className="font-bold text-xs">Beginning (0:00)</div>
                <div className="text-[10px] text-slate-400">Start from the intro</div>
              </button>

              {/* Suggested Moments List */}
              {moments.map((m) => {
                const isSelected = activeMomentId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectMoment(m)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative group flex flex-col justify-between ${isSelected
                        ? 'bg-dj-magenta/20 border-dj-magenta text-white glow-magenta'
                        : 'bg-dj-card border-dj-border text-slate-300 hover:border-slate-500'
                      }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs truncate flex items-center gap-1">
                        <Flame className="w-3 h-3 text-dj-magenta" /> {m.label}
                      </span>
                      <span className="font-mono text-[10px] text-dj-cyan font-bold">
                        {formatTime(m.startSeconds)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px] text-slate-400">
                      <span>{m.detectionMethod}</span>
                      <span
                        onClick={(e) => handleVoteMoment(m.id, e)}
                        className="flex items-center gap-1 hover:text-white"
                        title="Upvote moment"
                      >
                        <ThumbsUp className="w-2.5 h-2.5" /> {m.upvotes}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Timestamp Input */}
          {settings.allowCustomTimestamps && (
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-dj-cyan" /> Or Enter Custom Start Time (MM:SS)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-dj-card border border-dj-border rounded-xl px-3 py-2 flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinutes}
                    onChange={(e) => handleCustomTimeChange(parseInt(e.target.value, 10) || 0, customSeconds)}
                    className="w-12 bg-transparent text-center font-mono font-bold text-white focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-slate-400 font-bold">:</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSeconds}
                    onChange={(e) => handleCustomTimeChange(customMinutes, parseInt(e.target.value, 10) || 0)}
                    className="w-12 bg-transparent text-center font-mono font-bold text-white focus:outline-none"
                    placeholder="00"
                  />
                  <span className="text-xs text-slate-400 ml-auto font-mono">
                    Total: {selectedStart}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Duration Selector */}
          {!settings.djDeterminesDuration && (
            <div>
              <label className="block text-xs font-mono font-bold text-slate-300 uppercase mb-2">
                Playback Duration
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, settings.allowFullSongs ? 0 : null]
                  .filter((v): v is number => v !== null)
                  .map((dur) => (
                    <button
                      type="button"
                      key={dur}
                      onClick={() => setSelectedDuration(dur)}
                      className={`py-2 rounded-xl font-mono text-xs font-bold border transition-all ${selectedDuration === dur
                          ? 'bg-dj-cyan text-black border-dj-cyan glow-cyan'
                          : 'bg-dj-card text-slate-300 border-dj-border hover:border-slate-500'
                        }`}
                    >
                      {dur === 0 ? 'Full' : `${dur}s`}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Segment Preview Bar */}
          <div className="p-3 bg-dj-card/40 rounded-2xl border border-dj-border/60">
            <div className="flex justify-between items-center text-xs font-mono text-slate-300 mb-1.5">
              <span>Selected Segment:</span>
              <strong className="text-dj-cyan font-bold">
                {formatTime(selectedStart)} → {formatTime(calculatedEnd)} ({calculatedEnd - selectedStart}s)
              </strong>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-transparent"
                style={{ width: `${(selectedStart / (song.durationSeconds || 300)) * 100}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-dj-cyan to-dj-magenta rounded-full glow-cyan"
                style={{
                  width: `${((calculatedEnd - selectedStart) / (song.durationSeconds || 300)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Submit Request Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-dj-cyan to-dj-magenta text-black font-extrabold text-sm tracking-wide shadow-lg glow-cyan hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Join Queue with Song'}
          </button>
        </form>
      </div>
    </div>
  );
};
