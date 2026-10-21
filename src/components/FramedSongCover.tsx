import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';
import { DifficultyFramesConfig, DEFAULT_DIFFICULTY_FRAMES, hasDifficulty, Song, SongEntry } from '../types';
import { fetchDifficultyFrames } from '../services/fandomService';

interface FramedSongCoverProps {
  coverArt?: string;
  difficulty?: 'easy' | 'normal' | 'hard' | 'E' | 'N' | 'H' | string;
  frames?: DifficultyFramesConfig | null;
  className?: string;
  imageClassName?: string;
  alt?: string;
  fallbackIconSize?: number;
  showDifficultyBadge?: boolean;
  onClick?: () => void;
  title?: string;
  children?: React.ReactNode;
  hasEasyDifficulty?: boolean;
  song?: Song | SongEntry | null;
  songDifficulty?: any;
}

export const FramedSongCover: React.FC<FramedSongCoverProps> = ({
  coverArt,
  difficulty = 'normal',
  frames: providedFrames,
  className = 'w-16 h-16 rounded-xl',
  imageClassName = 'w-full h-full object-cover',
  alt = 'Song Cover',
  fallbackIconSize = 20,
  showDifficultyBadge = false,
  onClick,
  title,
  children,
  hasEasyDifficulty,
  song,
  songDifficulty,
}) => {
  const [internalFrames, setInternalFrames] = useState<DifficultyFramesConfig>(
    providedFrames || DEFAULT_DIFFICULTY_FRAMES
  );
  const [imgError, setImgError] = useState(false);
  const [frameError, setFrameError] = useState(false);

  useEffect(() => {
    if (providedFrames) {
      setInternalFrames(providedFrames);
    } else {
      fetchDifficultyFrames().then(setInternalFrames).catch(() => {});
    }
  }, [providedFrames]);

  // Check if easy difficulty is actually available for this song
  const easyAvailable = (() => {
    if (hasEasyDifficulty !== undefined) return hasEasyDifficulty;
    if (song?.difficulty) return hasDifficulty(song.difficulty.easy);
    if (songDifficulty) return hasDifficulty(songDifficulty.easy);
    return true;
  })();

  const hardAvailable = (() => {
    if (song?.difficulty) return hasDifficulty(song.difficulty.hard);
    if (songDifficulty) return hasDifficulty(songDifficulty.hard);
    return true;
  })();

  // Normalize difficulty tier
  const normalizedDiff = (() => {
    if (!difficulty) return 'normal';
    const d = difficulty.toLowerCase().trim();
    if (d === 'e' || d.startsWith('easy')) {
      // If song doesn't have easy difficulty, fallback to normal
      return easyAvailable ? 'easy' : 'normal';
    }
    if (d === 'h' || d.startsWith('hard')) {
      return hardAvailable ? 'hard' : 'normal';
    }
    return 'normal';
  })();

  // Resolve frame overlay URL:
  // Any song that doesn't have "Easy difficulty" will NOT include easy difficulty frame!
  const activeFrameUrl = (() => {
    if (normalizedDiff === 'easy') {
      if (!easyAvailable) return '';
      return internalFrames.easy?.trim() || '';
    }
    if (normalizedDiff === 'hard') {
      if (!hardAvailable) return '';
      return internalFrames.hard?.trim() || '';
    }
    // Normal difficulty has nothing frame
    return internalFrames.normal?.trim() || '';
  })();

  const cleanCover = (coverArt || '').trim();

  return (
    <div
      onClick={onClick}
      title={title}
      className={`relative aspect-square overflow-hidden bg-zinc-950 border border-zinc-800/90 flex items-center justify-center select-none ${className} ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* 1. Base Song Cover Art (Single image per song) */}
      {cleanCover && !imgError ? (
        <img
          src={cleanCover}
          alt={alt}
          className={`${imageClassName} transition-transform duration-300`}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/60 p-1 text-center">
          <Music style={{ width: fallbackIconSize, height: fallbackIconSize }} className="opacity-40" />
          <span className="text-[9px] font-mono mt-0.5 text-zinc-500">No Art</span>
        </div>
      )}

      {/* 2. Difficulty Frame Overlay (Easy frame, Hard frame, Normal has nothing frame) */}
      {activeFrameUrl && !frameError && (
        <img
          src={activeFrameUrl}
          alt={`${normalizedDiff} difficulty frame`}
          className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
          onError={() => setFrameError(true)}
        />
      )}

      {/* 3. Optional mini difficulty tag */}
      {showDifficultyBadge && (
        <span
          className={`absolute bottom-1 right-1 z-20 px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
            normalizedDiff === 'easy' && easyAvailable
              ? 'bg-emerald-500 text-black shadow-sm'
              : normalizedDiff === 'hard' && hardAvailable
              ? 'bg-rose-500 text-white shadow-sm'
              : 'bg-blue-500 text-white shadow-sm'
          }`}
        >
          {normalizedDiff === 'easy' && easyAvailable ? 'EZ' : normalizedDiff === 'hard' && hardAvailable ? 'HD' : 'NM'}
        </span>
      )}

      {/* 4. Custom child overlays (e.g. rank icons, badges) */}
      {children}
    </div>
  );
};
