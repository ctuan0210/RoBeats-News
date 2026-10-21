import React, { useState, useEffect } from 'react';
import { X, Music, Disc, Image as ImageIcon, Check, Edit3, Loader2 } from 'lucide-react';
import { SongEntry, ElementConfig, DifficultyFramesConfig, DEFAULT_DIFFICULTY_FRAMES, hasDifficulty } from '../types';
import { fetchElementsList, adminEditSong, fetchDifficultyFrames } from '../services/fandomService';
import { getElementData } from '../constants/elements';
import { useAuth } from '../context/AuthContext';
import { FramedSongCover } from './FramedSongCover';

interface SongDetailsModalProps {
  song: SongEntry | null;
  onClose: () => void;
  onSongUpdated?: (updated: SongEntry) => void;
}

export const SongDetailsModal: React.FC<SongDetailsModalProps> = ({ song: initialSong, onClose, onSongUpdated }) => {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const [currentSong, setCurrentSong] = useState<SongEntry | null>(initialSong);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [frames, setFrames] = useState<DifficultyFramesConfig>(DEFAULT_DIFFICULTY_FRAMES);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  // Admin Single Cover Art Edit state
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCurrentSong(initialSong);
    if (initialSong) {
      setCoverUrlInput(initialSong.coverArt || initialSong.coverArtNormal || '');
    }
  }, [initialSong]);

  useEffect(() => {
    fetchElementsList().then(setElements).catch(() => {});
    fetchDifficultyFrames().then(setFrames).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentSong) {
      const hasE = hasDifficulty(currentSong.difficulty?.easy);
      const hasN = hasDifficulty(currentSong.difficulty?.normal);
      const hasH = hasDifficulty(currentSong.difficulty?.hard);
      const cd = (currentSong.chosenDifficulty || '').toUpperCase();

      if (cd.startsWith('E') && hasE) {
        setSelectedDifficulty('easy');
      } else if (cd.startsWith('H') && hasH) {
        setSelectedDifficulty('hard');
      } else if (hasN) {
        setSelectedDifficulty('normal');
      } else if (hasH) {
        setSelectedDifficulty('hard');
      } else if (hasE) {
        setSelectedDifficulty('easy');
      } else {
        setSelectedDifficulty('normal');
      }
    }
  }, [currentSong]);

  if (!currentSong) return null;

  const song = currentSong;
  const elementData = getElementData(song.element || '', elements);
  const singleCover = (song.coverArt || song.coverArtNormal || '').trim();
  const hasEasy = hasDifficulty(song.difficulty?.easy);
  const hasNormal = hasDifficulty(song.difficulty?.normal);
  const hasHard = hasDifficulty(song.difficulty?.hard);
  const availableDiffCount = (hasEasy ? 1 : 0) + (hasNormal ? 1 : 0) + (hasHard ? 1 : 0);
  const gridColsClass = availableDiffCount === 1 ? 'grid-cols-1 max-w-xs mx-auto' : availableDiffCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !song) return;

    setIsSavingCover(true);
    setStatusMsg(null);

    try {
      const trimmedUrl = coverUrlInput.trim();
      const updates: Partial<SongEntry> = {
        coverArt: trimmedUrl,
        coverArtNormal: trimmedUrl,
        coverArtEasy: trimmedUrl,
        coverArtHard: trimmedUrl,
      };

      const updated = await adminEditSong(song.id, updates);
      setCurrentSong(updated);
      setIsEditingCover(false);
      setStatusMsg({ type: 'success', text: 'Song cover art updated successfully!' });
      if (onSongUpdated) onSongUpdated(updated);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update Cover Art URL' });
    } finally {
      setIsSavingCover(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-[#0F131C] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#131926]">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Song Details & Difficulty Frames</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`px-5 py-2.5 text-xs font-medium flex items-center gap-2 ${
            statusMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
          }`}>
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Main Hero & Info */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-zinc-950/60 p-4 rounded-xl border border-zinc-800/80">
            {/* Framed Cover Art Preview */}
            <div className="shrink-0 relative group self-center sm:self-auto">
              <FramedSongCover
                coverArt={singleCover}
                difficulty={selectedDifficulty}
                frames={frames}
                song={song}
                hasEasyDifficulty={hasEasy}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl shadow-lg"
                showDifficultyBadge
              />

              {isAdmin && !isEditingCover && (
                <button
                  onClick={() => setIsEditingCover(true)}
                  className="absolute inset-0 z-30 bg-black/65 opacity-0 group-hover:opacity-100 rounded-xl flex flex-col items-center justify-center text-cyan-300 text-[10px] font-bold gap-1 transition-opacity cursor-pointer backdrop-blur-xs"
                  title="Change single cover art image URL"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Change Art</span>
                </button>
              )}
            </div>

            {/* Song Meta */}
            <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
              <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight truncate">{song.title}</h3>
                {song.isCustom && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium">{song.artist}</p>
              
              {/* Mapper */}
              <p className="text-xs text-zinc-400">
                <span className="text-zinc-500 font-semibold">Mapper(s): </span>
                <strong className="text-zinc-200">{song.mapper || 'Official RoBeats'}</strong>
              </p>

              {/* Linked Element Image & Name */}
              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${elementData.bg} ${elementData.border}`}>
                  {elementData.imageUrl ? (
                    <img 
                      src={elementData.imageUrl} 
                      alt={elementData.name} 
                      className="w-3.5 h-3.5 object-contain"
                      onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <Disc className={`w-3.5 h-3.5 ${elementData.text}`} />
                  )}
                  <span className={`text-xs font-bold ${elementData.text}`}>
                    {elementData.name}
                  </span>
                </div>

                {(song.bpm || song.duration) && (
                  <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono-numbers">
                    {song.bpm && <span>{song.bpm} BPM</span>}
                    {song.duration && <span>{song.duration}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin Cover Art Editor Form (Single image link for song) */}
          {isAdmin && isEditingCover && (
            <form onSubmit={handleSaveCover} className="p-4 bg-zinc-950/90 rounded-xl border border-cyan-500/40 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Edit Song Cover Art Image Link (1 Cover Art)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingCover(false)}
                  className="text-zinc-400 hover:text-white text-xs cursor-pointer px-2 py-1"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">
                  Cover Art Image URL
                </label>
                <input
                  type="url"
                  required
                  value={coverUrlInput}
                  onChange={e => setCoverUrlInput(e.target.value)}
                  placeholder="https://... direct image link for song cover"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Each song has 1 cover art. Difficulty frames (Easy frame, Hard frame, Normal nothing frame) are automatically applied over it.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-1 border-t border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsEditingCover(false)}
                  className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCover}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isSavingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Cover Art Link</span>
                </button>
              </div>
            </form>
          )}

          {/* Difficulty Frame Previews */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Difficulty Cover Art Frame Overlays</span>
              </label>
              <span className="text-[10px] text-zinc-500">
                Click difficulty to preview framed cover
              </span>
            </div>

            <div className={`grid ${gridColsClass} gap-2.5`}>
              {/* Easy Preview (Easy Frame) - ONLY shown if song has Easy difficulty */}
              {hasEasy && (
                <div 
                  onClick={() => setSelectedDifficulty('easy')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    selectedDifficulty === 'easy'
                      ? 'bg-emerald-950/40 border-emerald-500/80 ring-2 ring-emerald-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <FramedSongCover
                    coverArt={singleCover}
                    difficulty="easy"
                    frames={frames}
                    song={song}
                    hasEasyDifficulty={hasEasy}
                    className="w-full aspect-square rounded-lg shadow-sm"
                    showDifficultyBadge
                  />
                  <div className="text-center w-full">
                    <div className="text-[11px] font-bold text-emerald-400">Easy (Easy Frame)</div>
                    <div className="text-xs font-mono font-bold text-zinc-200">LV {song.difficulty?.easy}</div>
                  </div>
                </div>
              )}

              {/* Normal Preview (Nothing Frame) */}
              {hasNormal && (
                <div 
                  onClick={() => setSelectedDifficulty('normal')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    selectedDifficulty === 'normal'
                      ? 'bg-blue-950/40 border-blue-500/80 ring-2 ring-blue-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <FramedSongCover
                    coverArt={singleCover}
                    difficulty="normal"
                    frames={frames}
                    song={song}
                    className="w-full aspect-square rounded-lg shadow-sm"
                    showDifficultyBadge
                  />
                  <div className="text-center w-full">
                    <div className="text-[11px] font-bold text-blue-400">Normal (No Frame)</div>
                    <div className="text-xs font-mono font-bold text-zinc-200">LV {song.difficulty?.normal}</div>
                  </div>
                </div>
              )}

              {/* Hard Preview (Hard Frame) */}
              {hasHard && (
                <div 
                  onClick={() => setSelectedDifficulty('hard')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    selectedDifficulty === 'hard'
                      ? 'bg-rose-950/40 border-rose-500/80 ring-2 ring-rose-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <FramedSongCover
                    coverArt={singleCover}
                    difficulty="hard"
                    frames={frames}
                    song={song}
                    className="w-full aspect-square rounded-lg shadow-sm"
                    showDifficultyBadge
                  />
                  <div className="text-center w-full">
                    <div className="text-[11px] font-bold text-rose-400">Hard (Hard Frame)</div>
                    <div className="text-xs font-mono font-bold text-zinc-200">LV {song.difficulty?.hard}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Note when Easy difficulty is absent */}
            {!hasEasy && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-zinc-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-zinc-600 shrink-0" />
                <span>
                  This song does not have an <strong>Easy difficulty</strong> (marked <code className="text-zinc-200 font-mono font-bold">-</code>). Easy difficulty frame is excluded.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#131926] flex items-center justify-between">
          {isAdmin && !isEditingCover && (
            <button
              onClick={() => setIsEditingCover(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Change Song Cover URL</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
