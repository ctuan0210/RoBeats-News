import React, { useState, useEffect } from 'react';
import { X, Music, Disc, Image as ImageIcon, Check, Edit3, Loader2 } from 'lucide-react';
import { SongEntry, ElementConfig } from '../types';
import { fetchElementsList, adminEditSong } from '../services/fandomService';
import { getElementData } from '../constants/elements';
import { useAuth } from '../context/AuthContext';

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
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  // Admin Cover Art Edit state
  const [isEditingCover, setIsEditingCover] = useState(false);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [isSavingCover, setIsSavingCover] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setCurrentSong(initialSong);
    if (initialSong) {
      setCoverUrlInput(initialSong.coverArtNormal || initialSong.coverArt || '');
    }
  }, [initialSong]);

  useEffect(() => {
    fetchElementsList().then(setElements).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentSong?.chosenDifficulty) {
      const cd = currentSong.chosenDifficulty.toUpperCase();
      if (cd.startsWith('E')) setSelectedDifficulty('easy');
      else if (cd.startsWith('H')) setSelectedDifficulty('hard');
      else setSelectedDifficulty('normal');
    } else {
      setSelectedDifficulty('normal');
    }
  }, [currentSong]);

  if (!currentSong) return null;

  const song = currentSong;
  const elementData = getElementData(song.element, elements);

  const activeCover = 
    selectedDifficulty === 'easy' 
      ? (song.coverArtEasy || song.coverArt)
      : selectedDifficulty === 'hard'
      ? (song.coverArtHard || song.coverArt)
      : (song.coverArtNormal || song.coverArt);

  const handleSaveCover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !song) return;

    setIsSavingCover(true);
    setStatusMsg(null);

    try {
      const trimmedUrl = coverUrlInput.trim();
      const updates = {
        coverArt: trimmedUrl,
        coverArtNormal: trimmedUrl,
        coverArtEasy: trimmedUrl,
        coverArtHard: trimmedUrl,
      };

      const updated = await adminEditSong(song.id, updates);
      setCurrentSong(updated);
      setIsEditingCover(false);
      setStatusMsg({ type: 'success', text: 'Cover Art URL updated successfully!' });
      if (onSongUpdated) onSongUpdated(updated);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update Cover Art URL' });
    } finally {
      setIsSavingCover(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div 
        className="w-full max-w-lg bg-[#0F131C] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#131926]">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Song Details</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div className={`px-5 py-2 text-xs font-medium ${
            statusMsg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border-b border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-b border-rose-500/30'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Cover & Main Info Section */}
          <div className="flex gap-4 items-start">
            {/* Cover Art Preview */}
            <div className="shrink-0 relative group">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-lg">
                <img
                  src={activeCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80'}
                  alt={song.title}
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80';
                  }}
                />
              </div>

              {isAdmin && !isEditingCover && (
                <button
                  onClick={() => setIsEditingCover(true)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl flex flex-col items-center justify-center text-cyan-300 text-[10px] font-bold gap-1 transition-opacity cursor-pointer backdrop-blur-xs"
                  title="Click to change song cover art URL"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Change Art</span>
                </button>
              )}
            </div>

            {/* Song Meta */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
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
              <div className="flex items-center gap-2 pt-1">
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
              </div>
            </div>
          </div>

          {/* Admin Cover Art Editor Panel */}
          {isAdmin && isEditingCover && (
            <form onSubmit={handleSaveCover} className="p-3 bg-zinc-900/80 rounded-xl border border-cyan-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Change Song Cover Art URL (Admin)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingCover(false)}
                  className="text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div>
                <input
                  type="url"
                  required
                  value={coverUrlInput}
                  onChange={e => setCoverUrlInput(e.target.value)}
                  placeholder="https://... direct cover image URL"
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingCover(false)}
                  className="px-3 py-1 rounded-lg text-zinc-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCover}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  <span>Save Cover URL</span>
                </button>
              </div>
            </form>
          )}

          {/* BPM & Duration */}
          {(song.bpm || song.duration) && (
            <div className="flex items-center gap-4 text-xs text-zinc-400 font-mono-numbers pt-1">
              {song.bpm && <span>BPM: <strong className="text-zinc-200">{song.bpm}</strong></span>}
              {song.duration && <span>Length: <strong className="text-zinc-200">{song.duration}</strong></span>}
            </div>
          )}

          {/* Difficulty Tab Selector */}
          <div className="pt-2">
            <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Song difficulties
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedDifficulty('easy')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer ${
                  selectedDifficulty === 'easy'
                    ? 'bg-emerald-500/20 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className="block text-[9px] uppercase font-bold text-emerald-400">Easy</span>
                <span className="text-base font-black text-emerald-300 font-mono-numbers">
                  {song.difficulty?.easy || '-'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDifficulty('normal')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer ${
                  selectedDifficulty === 'normal'
                    ? 'bg-blue-500/20 border-blue-500/60 ring-1 ring-blue-500/30'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className="block text-[9px] uppercase font-bold text-blue-400">Normal</span>
                <span className="text-base font-black text-blue-300 font-mono-numbers">
                  {song.difficulty?.normal || '-'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDifficulty('hard')}
                className={`p-2.5 rounded-xl border text-center cursor-pointer ${
                  selectedDifficulty === 'hard'
                    ? 'bg-rose-500/20 border-rose-500/60 ring-1 ring-rose-500/30'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                }`}
              >
                <span className="block text-[9px] uppercase font-bold text-rose-400">Hard</span>
                <span className="text-base font-black text-rose-300 font-mono-numbers">
                  {song.difficulty?.hard || '-'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#131926] flex items-center justify-between">
          {isAdmin && (
            <button
              onClick={() => setIsEditingCover(true)}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 font-semibold cursor-pointer"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Change Cover URL</span>
            </button>
          )}
          <div className="ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
