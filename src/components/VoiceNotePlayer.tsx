'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceNotePlayerProps {
  url: string;
  /** 'user' = entrante (bubble claro/oscuro según dark mode)
   *  'agent' = saliente agente (light: #1A1714 bg / dark: #EDE9E0 bg)
   *  'bot'   = saliente bot  (siempre naranja #F36A2D) */
  variant?: 'user' | 'agent' | 'bot';
  avatarUrl?: string | null;
}

export function VoiceNotePlayer({ url, variant = 'user', avatarUrl }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', () => setIsPlaying(false));
    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ── Color tokens por variante ─────────────────────────────────────
  // agent: light mode → fondo oscuro (#1A1714) → texto blanco
  //        dark mode  → fondo claro (#EDE9E0) → texto oscuro
  // bot:   fondo naranja siempre → texto blanco
  // user:  fondo claro en light / oscuro en dark → texto adaptado

  let trackBg: string;
  let timeColor: string;

  if (variant === 'bot') {
    trackBg = 'bg-white/25';
    timeColor = 'text-white/70';
  } else if (variant === 'agent') {
    // light: sobre #1A1714 (oscuro) → blanco. dark: sobre #EDE9E0 (claro) → gris oscuro
    trackBg = 'bg-white/20 dark:bg-black/15';
    timeColor = 'text-white/70 dark:text-[#1A1714]/70';
  } else {
    // user
    trackBg = 'bg-zinc-400/30';
    timeColor = 'text-[#6F6F6F] dark:text-zinc-400';
  }

  return (
    // Sin background propio: vive directamente sobre el bubble del mensaje
    <div className="flex items-center gap-2.5 w-full min-w-[200px] max-w-[240px]">
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Botón play — siempre naranja */}
      <button
        onClick={togglePlay}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#F36A2D] text-white hover:scale-105 transition-transform"
      >
        {isPlaying
          ? <Pause size={15} fill="currentColor" />
          : <Play size={15} className="ml-0.5" fill="currentColor" />
        }
      </button>

      {/* Avatar (opcional, solo para emisor) */}
      {avatarUrl && variant !== 'user' && (
        <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden ml-[-4px] border border-white/20">
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Track + tiempos */}
      <div className="flex-1 flex flex-col gap-0.5">
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          onClick={(e) => e.stopPropagation()}
          className={`w-full h-1 ${trackBg} rounded-full appearance-none cursor-pointer accent-[#F36A2D]`}
        />
        <div className={`flex justify-between text-[9px] font-semibold tabular-nums ${timeColor}`}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
