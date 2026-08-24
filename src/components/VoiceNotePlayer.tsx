'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface VoiceNotePlayerProps {
  url: string;
  /** 'user' = mensaje entrante (fondo claro), 'agent' = mensaje saliente (fondo oscuro/brand) */
  variant?: 'user' | 'agent' | 'bot';
}

export function VoiceNotePlayer({ url, variant = 'user' }: VoiceNotePlayerProps) {
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
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Paleta según variante
  const isAgent = variant === 'agent';
  const isBot = variant === 'bot';

  // Botón play: naranja siempre, pero fondo del track y texto cambian
  const trackBg = isAgent
    ? 'bg-white/20'
    : isBot
    ? 'bg-white/20'
    : 'bg-zinc-400/30';

  const timeColor = isAgent
    ? 'text-white/60'
    : isBot
    ? 'text-white/60'
    : 'text-[#6F6F6F] dark:text-zinc-400';

  const downloadColor = isAgent
    ? 'text-white/70 hover:text-white'
    : isBot
    ? 'text-white/70 hover:text-white'
    : 'text-[#F36A2D]';

  const wrapperBg = isAgent
    ? 'bg-white/5'
    : isBot
    ? 'bg-white/5'
    : 'bg-white/5 dark:bg-white/10';

  return (
    <div className={`flex flex-col gap-1.5 w-full max-w-[260px] ${wrapperBg} p-3 rounded-2xl border border-white/10 group`}>
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F36A2D] text-white hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="ml-0.5" fill="currentColor" />}
        </button>
        
        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onClick={(e) => e.stopPropagation()}
            className={`w-full h-1.5 ${trackBg} rounded-full appearance-none cursor-pointer accent-[#F36A2D]`}
          />
          <div className={`flex justify-between text-[10px] font-medium ${timeColor}`}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <a 
          href={url} 
          target="_blank" 
          download 
          onClick={(e) => e.stopPropagation()}
          className={`flex items-center gap-1 text-[10px] font-bold ${downloadColor} opacity-0 group-hover:opacity-100 transition-opacity`}
        >
          <Download size={12} /> Descargar
        </a>
      </div>
    </div>
  );
}
