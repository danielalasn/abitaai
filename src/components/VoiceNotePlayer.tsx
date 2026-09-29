'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const NUM_BARS = 50;

interface VoiceNotePlayerProps {
  url: string;
  /** 'user' = entrante | 'agent' = agente | 'bot' = bot naranja */
  variant?: 'user' | 'agent' | 'bot';
  avatarUrl?: string | null;
  transcript?: string;
}

export function VoiceNotePlayer({ url, variant = 'user', avatarUrl, transcript }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [showTranscript, setShowTranscript] = useState(false);

  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const overlayRef  = useRef<HTMLDivElement>(null);   // capa naranja — DOM directo
  const timeRef     = useRef<HTMLSpanElement>(null);  // tiempo actual — DOM directo
  const rafRef      = useRef<number | null>(null);

  // ── rAF: actualiza DOM directo, sin re-render de React ───────────
  const fmt = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRaf = () => {
    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const dur = audio.duration || 1;
        // Se suma 0.08s para compensar la latencia del buffer de hardware del navegador
        const ct  = Math.min(audio.currentTime + 0.08, dur);
        const pct = (ct / dur) * 100;

        // Recorte pixel-perfect sobre el propio elemento — sin depender del contenedor
        if (overlayRef.current) {
          overlayRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
        }
        if (timeRef.current) {
          timeRef.current.textContent = fmt(ct);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // ── Decodifica audio y extrae amplitudes ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function buildWaveform() {
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const decoded = await ctx.decodeAudioData(buf);
        ctx.close();
        if (cancelled) return;
        const data = decoded.getChannelData(0);
        const block = Math.floor(data.length / NUM_BARS);
        const bars: number[] = [];
        for (let i = 0; i < NUM_BARS; i++) {
          let sum = 0;
          for (let j = 0; j < block; j++) sum += Math.abs(data[i * block + j]);
          bars.push(sum / block);
        }
        const max = Math.max(...bars, 0.001);
        setWaveform(bars.map(v => v / max));
      } catch { /* CORS u otro error — fallback a barras vacías */ }
    }
    buildWaveform();
    return () => { cancelled = true; };
  }, [url]);

  // ── Audio events ──────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => setDuration(audio.duration);
    const onEnd  = () => {
      setIsPlaying(false);
      stopRaf();
      if (overlayRef.current) overlayRef.current.style.clipPath = 'inset(0 100% 0 0)';
      if (timeRef.current) timeRef.current.textContent = '0:00';
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      stopRaf();
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); stopRaf(); }
    else           { audio.play(); startRaf(); }
    setIsPlaying(p => !p);
  };

  // Seek al hacer click en el waveform
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !waveformRef.current) return;
    const rect  = waveformRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * (audio.duration || 0);
    // Actualizar visualmente de inmediato
    const pct = ratio * 100;
    if (overlayRef.current) overlayRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (timeRef.current) timeRef.current.textContent = fmt(audio.currentTime);
  };

  // ── Color tokens ──────────────────────────────────────────────────
  let timeColor: string;
  let barPlayedColor: string;
  let barUnplayedColor: string;

  if (variant === 'bot') {
    timeColor        = 'text-white/70';
    barPlayedColor   = '#ffffff';
    barUnplayedColor = 'rgba(255,255,255,0.30)';
  } else if (variant === 'agent') {
    timeColor        = 'text-white/70 dark:text-[#1A1714]/70';
    barPlayedColor   = '#ffffff';
    barUnplayedColor = 'rgba(255,255,255,0.25)';
  } else {
    timeColor        = 'text-[#6F6F6F] dark:text-zinc-400';
    barPlayedColor   = '#F36A2D';
    barUnplayedColor = 'rgba(110,110,110,0.35)';
  }

  const cleanTranscript = transcript?.replace(/Mensaje de voz \(\d+:\d+\)/g, '').trim();

  // Barras SVG-style como divs — altura mínima 3px, máxima 24px
  const renderBars = (color: string) =>
    (waveform.length > 0 ? waveform : Array.from({ length: NUM_BARS }, () => 0.3 + Math.random() * 0.4))
      .map((amp, i) => (
        <div
          key={i}
          style={{
            width: 2,
            minWidth: 2,
            height: Math.max(3, Math.round(amp * 22)),
            borderRadius: 2,
            backgroundColor: color,
          }}
        />
      ));

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center gap-2 w-full">
        <audio ref={audioRef} src={url} preload="metadata" />

        {/* Botón play */}
        <button
          onClick={togglePlay}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[#F36A2D] text-white hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} className="ml-0.5" fill="currentColor" />}
        </button>

        {/* Avatar */}
        {avatarUrl && variant !== 'user' && (
          <div className="shrink-0 w-7 h-7 rounded-full overflow-hidden border border-white/20">
            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Waveform */}
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            className="relative w-full overflow-hidden cursor-pointer select-none"
            style={{ height: 26 }}
          >
            {/* Base: sin reproducir */}
            <div className="absolute inset-0 flex items-center justify-between w-full">
              {renderBars(barUnplayedColor)}
            </div>
            {/* Overlay: reproducido — clip-path sobre sí mismo */}
            <div
              ref={overlayRef}
              className="absolute inset-0 flex items-center justify-between w-full"
              style={{ clipPath: 'inset(0 100% 0 0)' }}
            >
              {renderBars(barPlayedColor)}
            </div>
          </div>

          {/* Tiempos */}
          <div className={`flex justify-between text-[9px] font-semibold tabular-nums ${timeColor}`}>
            <span ref={timeRef}>0:00</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      {/* Transcripción */}
      {cleanTranscript && cleanTranscript !== 'Mensaje de voz' && (
        <>
          {showTranscript && (
            <div className={`mt-2 mb-1 w-full text-xs leading-relaxed p-2 rounded-xl border ${variant === 'user' ? 'bg-zinc-100 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300' : 'bg-black/10 border-white/10 text-white/90'}`}>
              <div className="font-bold text-[9px] uppercase tracking-wider mb-1 opacity-60">Transcripción:</div>
              {cleanTranscript}
            </div>
          )}
          {/* Botón flotante abajo a la izquierda (alineado con la hora) */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowTranscript(!showTranscript); }}
            className={`absolute bottom-[5px] left-3 text-[9px] font-bold underline underline-offset-2 ${variant === 'user' ? 'text-[#F36A2D]' : 'text-white/80'} hover:opacity-80 transition-opacity z-10`}
          >
            {showTranscript ? 'Ocultar' : 'Transcribir'}
          </button>
        </>
      )}
    </div>
  );
}
