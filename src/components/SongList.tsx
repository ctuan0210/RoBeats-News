import React, { useState, useEffect } from 'react';
import { Song, ElementConfig, SongEntry, DifficultyFramesConfig, DEFAULT_DIFFICULTY_FRAMES, hasDifficulty } from '../types';
import { fetchSongsList, saveSong, deleteSong, fetchElementsList } from '../services/api';
import { fetchDifficultyFrames } from '../services/fandomService';
import { useAuth } from '../context/AuthContext';
import { Music, Plus, Trash2, Edit2, Search, Image as ImageIcon, Eye, Sparkles } from 'lucide-react';
import { SongDetailsModal } from './SongDetailsModal';
import { FramedSongCover } from './FramedSongCover';

export const SongList: React.FC<{ onOpenAccount?: (tab?: 'login' | 'profile' | 'signup') => void }> = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [frames, setFrames] = useState<DifficultyFramesConfig>(DEFAULT_DIFFICULTY_FRAMES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedElement, setSelectedElement] = useState<string>('all');
  const [cardDiffView, setCardDiffView] = useState<Record<string, 'easy' | 'normal' | 'hard'>>({});
  
  // Modal for add / edit
  const [editingSong, setEditingSong] = useState<Partial<Song> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalPreviewDiff, setModalPreviewDiff] = useState<'easy' | 'normal' | 'hard'>('normal');

  // Modal for viewing / editing song details and frames
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongEntry | null>(null);

  const { isStaff, isAdmin } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [songsData, elementsData, framesData] = await Promise.all([
        fetchSongsList().catch(() => []),
        fetchElementsList().catch(() => []),
        fetchDifficultyFrames().catch(() => DEFAULT_DIFFICULTY_FRAMES),
      ]);
      setSongs(songsData);
      setElements(elementsData);
      setFrames(framesData);
    } catch (err) {
      console.error('Error loading songs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong || !editingSong.title) return;

    try {
      const singleCover = (editingSong.coverArt || editingSong.coverArtNormal || editingSong.coverArtEasy || editingSong.coverArtHard || '').trim();

      const payload: Partial<Song> = {
        ...editingSong,
        title: editingSong.title.trim(),
        artist: editingSong.artist?.trim() || 'Unknown Artist',
        mapper: editingSong.mapper?.trim() || 'Official RoBeats',
        coverArt: singleCover,
        coverArtNormal: singleCover,
        coverArtEasy: singleCover,
        coverArtHard: singleCover,
      };

      await saveSong(payload, editingSong.id);
      setShowModal(false);
      setEditingSong(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save song');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this song chart from database?')) return;
    try {
      await deleteSong(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete song');
    }
  };

  const filteredSongs = songs.filter((s) => {
    const matchSearch =
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.artist.toLowerCase().includes(search.toLowerCase()) ||
      (s.mapper && s.mapper.toLowerCase().includes(search.toLowerCase()));
    const matchElement = selectedElement === 'all' || s.element?.toLowerCase() === selectedElement.toLowerCase();
    return matchSearch && matchElement;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <Music className="w-5 h-5 text-cyan-400" />
            RoBeats Song Database & Difficulty Frames
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Per song 1 cover art, with difficulty frames overlaid (Easy frame, Hard frame, Normal nothing frame).
          </p>
        </div>

        {isStaff && (
          <button
            onClick={() => {
              setEditingSong({
                title: '',
                artist: '',
                mapper: 'Official RoBeats',
                element: 'Flow',
                difficulty: { easy: '1', normal: '5', hard: '12' },
                coverArt: '',
              });
              setModalPreviewDiff('normal');
              setShowModal(true);
            }}
            className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition self-start sm:self-auto cursor-pointer shadow-md"
          >
            <Plus className="w-4 h-4" />
            Add New Song Chart
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by title, artist, or mapper..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Element Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setSelectedElement('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 cursor-pointer ${
              selectedElement === 'all'
                ? 'bg-zinc-800 text-zinc-100 border-zinc-600 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800/80'
            }`}
          >
            All Elements
          </button>
          {elements.map((el) => (
            <button
              key={el.name}
              onClick={() => setSelectedElement(el.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedElement.toLowerCase() === el.name.toLowerCase()
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-500 shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800/80'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: el.hexColor || el.color || '#94A3B8' }}
              />
              {el.name}
            </button>
          ))}
        </div>
      </div>

      {/* Songs Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Loading songs...</div>
      ) : filteredSongs.length === 0 ? (
        <div className="p-12 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-xl border border-zinc-800/80">
          No songs found matching your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSongs.map((song) => {
            const diff = typeof song.difficulty === 'object' ? song.difficulty : {};
            const hasEasy = hasDifficulty(diff.easy);
            const hasNormal = hasDifficulty(diff.normal);
            const hasHard = hasDifficulty(diff.hard);

            let curDiff = cardDiffView[song.id] || (hasNormal ? 'normal' : hasHard ? 'hard' : hasEasy ? 'easy' : 'normal');
            if (curDiff === 'easy' && !hasEasy) {
              curDiff = hasNormal ? 'normal' : hasHard ? 'hard' : 'normal';
            }
            if (curDiff === 'hard' && !hasHard) {
              curDiff = hasNormal ? 'normal' : hasEasy ? 'easy' : 'normal';
            }

            const singleCover = song.coverArt || song.coverArtNormal || song.coverArtEasy || song.coverArtHard || '';

            return (
              <div
                key={song.id}
                className="p-4 bg-zinc-900/90 rounded-2xl border border-zinc-800/80 hover:border-cyan-500/40 transition space-y-3 relative group"
              >
                <div className="flex items-start gap-3">
                  {/* Framed Cover Art Preview */}
                  <FramedSongCover
                    coverArt={singleCover}
                    difficulty={curDiff}
                    frames={frames}
                    song={song}
                    hasEasyDifficulty={hasEasy}
                    className="w-16 h-16 rounded-xl shadow-md shrink-0 cursor-pointer"
                    showDifficultyBadge
                    onClick={() => setSelectedSongDetail(song)}
                    title="Click to view details and difficulty frames"
                  />

                  <div className="flex-1 min-w-0">
                    <h3 
                      onClick={() => setSelectedSongDetail(song)}
                      className="text-sm font-bold text-zinc-100 truncate cursor-pointer hover:text-cyan-400 transition-colors"
                      title={song.title}
                    >
                      {song.title}
                    </h3>
                    <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
                    {song.mapper && (
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        <span className="text-zinc-600">Map:</span> {song.mapper}
                      </p>
                    )}
                  </div>
                </div>

                {/* Difficulty Frame View Switcher Pills */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/60">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-zinc-500 font-semibold mr-0.5">Frame:</span>
                    {hasEasy && (
                      <button
                        type="button"
                        onClick={() => setCardDiffView(prev => ({ ...prev, [song.id]: 'easy' }))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                          curDiff === 'easy'
                            ? 'bg-emerald-500 text-black font-bold shadow-sm'
                            : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                        }`}
                        title="View Easy Frame Overlay"
                      >
                        EZ {diff.easy}
                      </button>
                    )}
                    {hasNormal && (
                      <button
                        type="button"
                        onClick={() => setCardDiffView(prev => ({ ...prev, [song.id]: 'normal' }))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                          curDiff === 'normal'
                            ? 'bg-blue-500 text-white font-bold shadow-sm'
                            : 'bg-blue-950/60 text-blue-300 hover:bg-blue-900/60'
                        }`}
                        title="View Normal (Nothing Frame)"
                      >
                        NM {diff.normal}
                      </button>
                    )}
                    {hasHard && (
                      <button
                        type="button"
                        onClick={() => setCardDiffView(prev => ({ ...prev, [song.id]: 'hard' }))}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition ${
                          curDiff === 'hard'
                            ? 'bg-rose-500 text-white font-bold shadow-sm'
                            : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60'
                        }`}
                        title="View Hard Frame Overlay"
                      >
                        HD {diff.hard}
                      </button>
                    )}
                    {!hasEasy && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500 font-mono" title="No Easy difficulty for this song (-)">
                        No EZ (-)
                      </span>
                    )}
                  </div>

                  {song.element && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                      {song.element}
                    </span>
                  )}
                </div>

                {/* Bottom Controls */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setSelectedSongDetail(song)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View & Edit Details</span>
                  </button>

                  {/* Admin controls */}
                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingSong(song);
                          setModalPreviewDiff('normal');
                          setShowModal(true);
                        }}
                        className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                        title="Edit song metadata"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(song.id)}
                          className="p-1.5 rounded hover:bg-rose-950/50 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          title="Delete song"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Song Modal with Single Cover Art + 3 Difficulty Frame Previews */}
      {showModal && editingSong && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#0E131E] border border-zinc-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Music className="w-4 h-4 text-cyan-400" />
              <span>{editingSong.id ? 'Edit Song Chart & Cover Art' : 'Add New Song Chart'}</span>
            </h3>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 block mb-1 font-medium">Song Title *</label>
                <input
                  type="text"
                  required
                  value={editingSong.title || ''}
                  onChange={(e) => setEditingSong({ ...editingSong, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-cyan-500"
                  placeholder="e.g. Monday Night Monsters"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Artist *</label>
                  <input
                    type="text"
                    required
                    value={editingSong.artist || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, artist: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. FinnMK"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Mapper</label>
                  <input
                    type="text"
                    value={editingSong.mapper || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, mapper: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-cyan-500"
                    placeholder="Official RoBeats"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Element</label>
                  <select
                    value={editingSong.element || 'Flow'}
                    onChange={(e) => setEditingSong({ ...editingSong, element: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    {elements.map((el) => (
                      <option key={el.name} value={el.name}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">BPM</label>
                  <input
                    type="text"
                    value={editingSong.bpm || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, bpm: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 175"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1 font-medium">Duration</label>
                  <input
                    type="text"
                    value={editingSong.duration || ''}
                    onChange={(e) => setEditingSong({ ...editingSong, duration: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 2:14"
                  />
                </div>
              </div>

              {/* Difficulties */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400 font-medium">Difficulty Ratings</label>
                  <span className="text-[10px] text-zinc-500 font-mono">Mark "-" if song lacks difficulty</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-emerald-400 block mb-1 font-bold">Easy Level ("-" if none)</span>
                    <input
                      type="text"
                      value={(editingSong.difficulty as any)?.easy !== undefined ? (editingSong.difficulty as any)?.easy : ''}
                      onChange={(e) =>
                        setEditingSong({
                          ...editingSong,
                          difficulty: { ...(editingSong.difficulty as any), easy: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      placeholder="1 or -"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-400 block mb-1 font-bold">Normal Level ("-" if none)</span>
                    <input
                      type="text"
                      value={(editingSong.difficulty as any)?.normal !== undefined ? (editingSong.difficulty as any)?.normal : ''}
                      onChange={(e) =>
                        setEditingSong({
                          ...editingSong,
                          difficulty: { ...(editingSong.difficulty as any), normal: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                      placeholder="8 or -"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-400 block mb-1 font-bold">Hard Level ("-" if none)</span>
                    <input
                      type="text"
                      value={(editingSong.difficulty as any)?.hard !== undefined ? (editingSong.difficulty as any)?.hard : ''}
                      onChange={(e) =>
                        setEditingSong({
                          ...editingSong,
                          difficulty: { ...(editingSong.difficulty as any), hard: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-rose-500"
                      placeholder="16 or -"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Any song marked by admin with <code className="text-cyan-400 font-bold bg-zinc-900 px-1 py-0.5 rounded">-</code> does not have that difficulty. Songs without Easy difficulty will omit the Easy frame.
                </p>
              </div>

              {/* SINGLE COVER ART INPUT (PER SONG 1 COVER ART) */}
              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Song Cover Art (1 Image Link)</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Per song 1 cover art
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-zinc-300 block">
                    Cover Art Image URL
                  </label>
                  <input
                    type="url"
                    value={editingSong.coverArt || editingSong.coverArtNormal || ''}
                    onChange={(e) => setEditingSong({ 
                      ...editingSong, 
                      coverArt: e.target.value,
                      coverArtNormal: e.target.value,
                      coverArtEasy: e.target.value,
                      coverArtHard: e.target.value,
                    })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 placeholder-zinc-600 text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="https://... direct image link for song cover"
                  />
                  <p className="text-[11px] text-zinc-500">
                    The cover art will automatically be framed according to each difficulty level (Easy frame, Hard frame, Normal nothing frame).
                  </p>
                </div>

                {/* Difficulty Frame Previews */}
                {(() => {
                  const editHasEasy = hasDifficulty((editingSong.difficulty as any)?.easy);
                  const editHasNormal = hasDifficulty((editingSong.difficulty as any)?.normal);
                  const editHasHard = hasDifficulty((editingSong.difficulty as any)?.hard);
                  const editCount = (editHasEasy ? 1 : 0) + (editHasNormal ? 1 : 0) + (editHasHard ? 1 : 0);
                  const editGridCols = editCount === 1 ? 'grid-cols-1 max-w-xs mx-auto' : editCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

                  return (
                    <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Difficulty Frame Previews</span>
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          Live frame preview
                        </span>
                      </div>

                      <div className={`grid ${editGridCols} gap-2`}>
                        {/* Easy - Only shown if song has Easy difficulty */}
                        {editHasEasy && (
                          <div 
                            onClick={() => setModalPreviewDiff('easy')}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                              modalPreviewDiff === 'easy' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <FramedSongCover
                              coverArt={editingSong.coverArt || editingSong.coverArtNormal || ''}
                              difficulty="easy"
                              frames={frames}
                              hasEasyDifficulty={editHasEasy}
                              className="w-14 h-14 rounded-lg shadow"
                              showDifficultyBadge
                            />
                            <span className="text-[10px] font-bold text-emerald-400">Easy Frame</span>
                          </div>
                        )}

                        {/* Normal */}
                        {editHasNormal && (
                          <div 
                            onClick={() => setModalPreviewDiff('normal')}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                              modalPreviewDiff === 'normal' ? 'bg-blue-950/40 border-blue-500' : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <FramedSongCover
                              coverArt={editingSong.coverArt || editingSong.coverArtNormal || ''}
                              difficulty="normal"
                              frames={frames}
                              className="w-14 h-14 rounded-lg shadow"
                              showDifficultyBadge
                            />
                            <span className="text-[10px] font-bold text-blue-400">Nothing Frame</span>
                          </div>
                        )}

                        {/* Hard */}
                        {editHasHard && (
                          <div 
                            onClick={() => setModalPreviewDiff('hard')}
                            className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition ${
                              modalPreviewDiff === 'hard' ? 'bg-rose-950/40 border-rose-500' : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                            }`}
                          >
                            <FramedSongCover
                              coverArt={editingSong.coverArt || editingSong.coverArtNormal || ''}
                              difficulty="hard"
                              frames={frames}
                              className="w-14 h-14 rounded-lg shadow"
                              showDifficultyBadge
                            />
                            <span className="text-[10px] font-bold text-rose-400">Hard Frame</span>
                          </div>
                        )}
                      </div>

                      {!editHasEasy && (
                        <p className="text-[10px] text-zinc-500 italic text-center">
                          Easy is marked "-" &rarr; Easy difficulty frame is excluded for this song.
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg shadow cursor-pointer"
                >
                  Save Song Chart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Song Details Modal */}
      {selectedSongDetail && (
        <SongDetailsModal
          song={selectedSongDetail}
          onClose={() => setSelectedSongDetail(null)}
          onSongUpdated={(updated) => {
            setSelectedSongDetail(updated);
            loadData();
          }}
        />
      )}
    </div>
  );
};
