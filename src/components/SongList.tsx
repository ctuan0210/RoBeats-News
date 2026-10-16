import React, { useState, useEffect, useMemo } from 'react';
import { 
  Music, 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  PlusCircle, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  SlidersHorizontal, 
  Lock, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Database, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  Disc,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SongEntry, ElementConfig } from '../types';
import { 
  fetchSongList, 
  adminAddSong, 
  adminEditSong, 
  adminDeleteSong,
  fetchElementsList
} from '../services/fandomService';
import { ALL_ELEMENT_NAMES, getElementData } from '../constants/elements';
import { SongDetailsModal } from './SongDetailsModal';

interface SongListProps {
  onOpenAccount: (tab?: 'login' | 'signup') => void;
}

export const SongList: React.FC<SongListProps> = ({ onOpenAccount }) => {
  const { user, isAuthenticated } = useAuth();

  // Role visibility check: ONLY visible to users with "Admin" role
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [elementFilter, setElementFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'normalDiff' | 'hardDiff' | 'artist'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongEntry | null>(null);
  const [viewingSong, setViewingSong] = useState<SongEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick Cover Art Modal State (Admin)
  const [coverModalSong, setCoverModalSong] = useState<SongEntry | null>(null);
  const [coverModalUrl, setCoverModalUrl] = useState('');
  const [isSavingCoverModal, setIsSavingCoverModal] = useState(false);

  // Form states for Add / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formArtist, setFormArtist] = useState('');
  const [formMapper, setFormMapper] = useState('');
  const [formCoverArt, setFormCoverArt] = useState('');
  const [formEasy, setFormEasy] = useState('-');
  const [formNormal, setFormNormal] = useState('1');
  const [formHard, setFormHard] = useState('10');
  const [formElement, setFormElement] = useState('Flow');

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadData = async (force: boolean = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [songData, elementData] = await Promise.all([
        fetchSongList(force),
        fetchElementsList()
      ]);
      setSongs(songData);
      setElements(elementData);
      if (force) {
        showNotification(`Refreshed ${songData.length} songs from database!`);
      }
    } catch {
      showNotification('Failed to load songs from local database', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Unique elements for filter
  const filterElementsList = useMemo(() => {
    return ['All', ...ALL_ELEMENT_NAMES];
  }, []);

  // Filtered & sorted songs
  const filteredSongs = useMemo(() => {
    return songs
      .filter(song => {
        const matchesQuery = 
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          song.artist.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesElement = elementFilter === 'All' || song.element.toLowerCase() === elementFilter.toLowerCase();
        return matchesQuery && matchesElement;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'name') {
          diff = a.title.localeCompare(b.title);
        } else if (sortBy === 'artist') {
          diff = a.artist.localeCompare(b.artist);
        } else if (sortBy === 'normalDiff') {
          const numA = parseInt(a.difficulty.normal) || 0;
          const numB = parseInt(b.difficulty.normal) || 0;
          diff = numA - numB;
        } else if (sortBy === 'hardDiff') {
          const numA = parseInt(a.difficulty.hard) || 0;
          const numB = parseInt(b.difficulty.hard) || 0;
          diff = numA - numB;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [songs, searchQuery, elementFilter, sortBy, sortOrder]);

  // Pagination slicing
  const totalPages = Math.ceil(filteredSongs.length / pageSize) || 1;
  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSongs.slice(start, start + pageSize);
  }, [filteredSongs, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, elementFilter, pageSize]);

  // Open edit modal
  const handleOpenEdit = (song: SongEntry) => {
    setEditingSong(song);
    setFormTitle(song.title);
    setFormArtist(song.artist);
    setFormMapper(song.mapper || '');
    setFormCoverArt(song.coverArtNormal || song.coverArt || '');
    setFormEasy(song.difficulty.easy || '-');
    setFormNormal(song.difficulty.normal || '-');
    setFormHard(song.difficulty.hard || '-');
    setFormElement(song.element || 'Flow');
  };

  // Open add modal
  const handleOpenAdd = () => {
    setIsAddModalOpen(true);
    setFormTitle('');
    setFormArtist('');
    setFormMapper('');
    setFormCoverArt('');
    setFormEasy('-');
    setFormNormal('1');
    setFormHard('10');
    setFormElement('Flow');
  };

  // Open quick cover modal
  const handleOpenCoverModal = (song: SongEntry) => {
    setCoverModalSong(song);
    setCoverModalUrl(song.coverArtNormal || song.coverArt || '');
  };

  // Save quick cover modal
  const handleSaveCoverModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverModalSong) return;
    setIsSavingCoverModal(true);

    try {
      const trimmedUrl = coverModalUrl.trim();
      const updates = {
        coverArt: trimmedUrl,
        coverArtNormal: trimmedUrl,
        coverArtEasy: trimmedUrl,
        coverArtHard: trimmedUrl,
      };

      const updated = await adminEditSong(coverModalSong.id, updates);
      setSongs(prev => prev.map(s => s.id === updated.id ? updated : s));
      if (viewingSong && viewingSong.id === updated.id) {
        setViewingSong(updated);
      }
      setCoverModalSong(null);
      showNotification(`Cover Art URL for "${updated.title}" updated successfully!`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update Cover Art URL', 'error');
    } finally {
      setIsSavingCoverModal(false);
    }
  };

  // Save edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSong) return;

    try {
      const primaryCover = formCoverArt.trim() || editingSong.coverArt;
      const updates = {
        title: formTitle.trim(),
        artist: formArtist.trim(),
        mapper: formMapper.trim() || undefined,
        coverArt: primaryCover,
        coverArtNormal: primaryCover,
        coverArtEasy: primaryCover,
        coverArtHard: primaryCover,
        difficulty: {
          easy: formEasy.trim(),
          normal: formNormal.trim(),
          hard: formHard.trim(),
        },
        element: formElement,
      };

      const updated = await adminEditSong(editingSong.id, updates);
      setSongs(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditingSong(null);
      showNotification(`Updated song "${formTitle}" successfully!`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update song', 'error');
    }
  };

  // Save new song
  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showNotification('Song title is required', 'error');
      return;
    }

    try {
      const primaryCover = formCoverArt.trim() || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80';
      const newSong = {
        title: formTitle.trim(),
        artist: formArtist.trim() || 'Unknown Artist',
        mapper: formMapper.trim() || undefined,
        coverArt: primaryCover,
        difficulty: {
          easy: formEasy.trim() || '-',
          normal: formNormal.trim() || '-',
          hard: formHard.trim() || '-',
        },
        element: formElement,
        duration: '2:30',
        bpm: '120',
      };

      const created = await adminAddSong(newSong);
      setSongs(prev => [created, ...prev]);
      setIsAddModalOpen(false);
      showNotification(`Added new song "${created.title}" successfully!`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to add song', 'error');
    }
  };

  // Delete song
  const handleDeleteSong = async (id: string) => {
    try {
      await adminDeleteSong(id);
      setSongs(prev => prev.filter(s => s.id !== id));
      setDeleteConfirmId(null);
      showNotification('Song deleted from database');
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete song', 'error');
    }
  };

  // Access check: only Admin can view and edit Song List
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-[#111622] border border-amber-500/30 rounded-2xl text-center">
        <ShieldAlert className="w-12 h-12 text-amber-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Administrator Access Required</h2>
        <p className="text-xs text-zinc-400 mb-5">
          The RoBeats Song List database and editing tools are strictly restricted to Admin accounts.
        </p>
        {!isAuthenticated && (
          <button
            onClick={() => onOpenAccount('login')}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
          >
            Log In as Admin
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Song Database</h1>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Internal songs database: <strong>{songs.length}</strong> songs stored locally (disconnected from Fandom wiki).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Song</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
          notification.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 bg-[#10141E] p-3 rounded-xl border border-zinc-800 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search songs by title or artist..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Element Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px]">Element:</span>
            <select
              value={elementFilter}
              onChange={e => setElementFilter(e.target.value)}
              className="py-1 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              {filterElementsList.map(el => (
                <option key={el} value={el}>{el}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="py-1 px-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-xs focus:outline-none focus:border-cyan-500"
            >
              <option value="name">Song Name</option>
              <option value="artist">Artist</option>
              <option value="normalDiff">Normal Diff</option>
              <option value="hardDiff">Hard Diff</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 cursor-pointer"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page size */}
          <div className="flex items-center gap-1">
            <span className="text-zinc-400 text-[11px]">Per Page:</span>
            <select
              value={pageSize}
              onChange={e => setPageSize(Number(e.target.value))}
              className="py-1 px-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-300 text-xs"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Song Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden bg-[#0A0D14]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#121622] text-zinc-400 uppercase font-mono text-[10px] tracking-wider border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3 text-center w-14">Cover</th>
                <th className="py-2.5 px-3">Title</th>
                <th className="py-2.5 px-3">Artist</th>
                <th className="py-2.5 px-3 text-center">Difficulties (E / N / H)</th>
                <th className="py-2.5 px-3">Element</th>
                <th className="py-2.5 px-3 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                    <span>Loading song database...</span>
                  </td>
                </tr>
              ) : paginatedSongs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No songs found matching query.
                  </td>
                </tr>
              ) : (
                paginatedSongs.map(song => {
                  const elData = getElementData(song.element, elements);
                  return (
                    <tr key={song.id} className="hover:bg-zinc-900/60">
                      {/* Cover */}
                      <td className="py-2 px-3 text-center">
                        <div className="relative inline-block group">
                          <div 
                            onClick={() => setViewingSong(song)}
                            className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden inline-flex items-center justify-center cursor-pointer shadow-xs"
                            title="Click to view song details & cover art"
                          >
                            <img
                              src={song.coverArtNormal || song.coverArt}
                              alt={song.title}
                              className="w-full h-full object-cover"
                              onError={e => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&auto=format&fit=crop&q=80';
                              }}
                            />
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCoverModal(song);
                              }}
                              className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center text-cyan-300 transition-opacity cursor-pointer"
                              title="Change Cover Art URL"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-2 px-3">
                        <div 
                          onClick={() => setViewingSong(song)}
                          className="font-bold text-white hover:text-cyan-300 cursor-pointer flex items-center gap-1.5"
                        >
                          <span>{song.title}</span>
                          {song.isCustom && (
                            <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                              Custom
                            </span>
                          )}
                        </div>
                        {song.mapper && (
                          <div className="text-[10px] text-zinc-500">Mapper: {song.mapper}</div>
                        )}
                      </td>

                      {/* Artist */}
                      <td className="py-2 px-3 text-zinc-400">{song.artist}</td>

                      {/* Difficulties */}
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300" title="Easy">
                            {song.difficulty?.easy || '-'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300" title="Normal">
                            {song.difficulty?.normal || '-'}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300" title="Hard">
                            {song.difficulty?.hard || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Linked Element with Image */}
                      <td className="py-2 px-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border ${elData.bg} ${elData.border}`}>
                          {elData.imageUrl ? (
                            <img
                              src={elData.imageUrl}
                              alt={elData.name}
                              className="w-3.5 h-3.5 object-contain"
                              onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          ) : (
                            <Disc className={`w-3 h-3 ${elData.text}`} />
                          )}
                          <span className={`text-[10px] font-bold ${elData.text}`}>
                            {elData.name}
                          </span>
                        </div>
                      </td>

                      {/* Admin Controls */}
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => setViewingSong(song)}
                            className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                            title="View song details & 3 covers"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenCoverModal(song)}
                            className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                            title="Change Cover Art URL"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEdit(song)}
                            className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                            title="Edit song details & difficulties"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {deleteConfirmId === song.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDeleteSong(song.id)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="p-0.5 text-zinc-400 hover:text-white text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirmId(song.id)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                              title="Delete song"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 bg-[#10141E] border-t border-zinc-800 flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredSongs.length)} of {filteredSongs.length} songs
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-zinc-300">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded border border-zinc-800 text-zinc-400 hover:text-white disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- MODAL: EDIT SONG (3 COVERS & 3 DIFFICULTIES & 25 ELEMENTS) ----------------- */}
      {(editingSong || isAddModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85">
          <div 
            className="w-full max-w-2xl bg-[#0F131C] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-[#141A26] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingSong ? `Edit Song: ${editingSong.title}` : 'Add New Song to Database'}
                </h3>
              </div>
              <button 
                onClick={() => { setEditingSong(null); setIsAddModalOpen(false); }}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={editingSong ? handleSaveEdit : handleSaveAdd} className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Basic Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Song Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="Monday Night Monsters"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Artist *</label>
                  <input
                    type="text"
                    required
                    value={formArtist}
                    onChange={e => setFormArtist(e.target.value)}
                    placeholder="FinnMK"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Mapper(s)</label>
                  <input
                    type="text"
                    value={formMapper}
                    onChange={e => setFormMapper(e.target.value)}
                    placeholder="Official RoBeats or Mapper Name"
                    className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Cover Art URL</label>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
                      {formCoverArt.trim() ? (
                        <img 
                          src={formCoverArt.trim()} 
                          alt="Cover preview" 
                          className="w-full h-full object-cover" 
                          onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                    <input
                      type="url"
                      value={formCoverArt}
                      onChange={e => setFormCoverArt(e.target.value)}
                      placeholder="https://... cover image URL"
                      className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Element Selector (Only elements name without color description) */}
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Song Element Type</label>
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const elData = getElementData(formElement, elements);
                    return (
                      <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 ${elData.bg} ${elData.border}`}>
                        {elData.imageUrl && (
                          <img src={elData.imageUrl} alt={elData.name} className="w-4 h-4 object-contain" />
                        )}
                        <span className={`font-bold ${elData.text}`}>
                          {elData.name}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                <select
                  value={formElement}
                  onChange={e => setFormElement(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <optgroup label="Single Elements (5)">
                    <option value="Rush">Rush</option>
                    <option value="Flow">Flow</option>
                    <option value="Beat">Beat</option>
                    <option value="Vibe">Vibe</option>
                    <option value="Chill">Chill</option>
                  </optgroup>
                  <optgroup label="Rush Combos (4)">
                    <option value="Rush/Flow">Rush/Flow</option>
                    <option value="Rush/Vibe">Rush/Vibe</option>
                    <option value="Rush/Chill">Rush/Chill</option>
                    <option value="Rush/Beat">Rush/Beat</option>
                  </optgroup>
                  <optgroup label="Flow Combos (4)">
                    <option value="Flow/Rush">Flow/Rush</option>
                    <option value="Flow/Vibe">Flow/Vibe</option>
                    <option value="Flow/Chill">Flow/Chill</option>
                    <option value="Flow/Beat">Flow/Beat</option>
                  </optgroup>
                  <optgroup label="Vibe Combos (4)">
                    <option value="Vibe/Rush">Vibe/Rush</option>
                    <option value="Vibe/Flow">Vibe/Flow</option>
                    <option value="Vibe/Chill">Vibe/Chill</option>
                    <option value="Vibe/Beat">Vibe/Beat</option>
                  </optgroup>
                  <optgroup label="Chill Combos (4)">
                    <option value="Chill/Flow">Chill/Flow</option>
                    <option value="Chill/Vibe">Chill/Vibe</option>
                    <option value="Chill/Beat">Chill/Beat</option>
                    <option value="Chill/Rush">Chill/Rush</option>
                  </optgroup>
                  <optgroup label="Beat Combos (4)">
                    <option value="Beat/Vibe">Beat/Vibe</option>
                    <option value="Beat/Rush">Beat/Rush</option>
                    <option value="Beat/Chill">Beat/Chill</option>
                    <option value="Beat/Flow">Beat/Flow</option>
                  </optgroup>
                </select>
              </div>

              {/* Song difficulties Section */}
              <div className="pt-2 border-t border-zinc-800 space-y-3">
                <span className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Song difficulties
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* 1. EASY */}
                  <div className="p-3 bg-zinc-950 rounded-xl border border-emerald-500/30 space-y-2">
                    <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px] block">
                      Easy Level
                    </span>
                    <div>
                      <label className="block text-zinc-400 text-[10px] mb-1">Easy Difficulty</label>
                      <input
                        type="text"
                        value={formEasy}
                        onChange={e => setFormEasy(e.target.value)}
                        placeholder="1 or -"
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* 2. NORMAL */}
                  <div className="p-3 bg-zinc-950 rounded-xl border border-blue-500/30 space-y-2">
                    <span className="font-bold text-blue-400 uppercase tracking-wider text-[11px] block">
                      Normal Level
                    </span>
                    <div>
                      <label className="block text-zinc-400 text-[10px] mb-1">Normal Difficulty</label>
                      <input
                        type="text"
                        value={formNormal}
                        onChange={e => setFormNormal(e.target.value)}
                        placeholder="8"
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-blue-300 font-mono font-bold text-xs focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* 3. HARD (Red Color) */}
                  <div className="p-3 bg-zinc-950 rounded-xl border border-rose-500/30 space-y-2">
                    <span className="font-bold text-rose-400 uppercase tracking-wider text-[11px] block">
                      Hard Level
                    </span>
                    <div>
                      <label className="block text-zinc-400 text-[10px] mb-1">Hard Difficulty</label>
                      <input
                        type="text"
                        value={formHard}
                        onChange={e => setFormHard(e.target.value)}
                        placeholder="18"
                        className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-rose-300 font-mono font-bold text-xs focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setEditingSong(null); setIsAddModalOpen(false); }}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer shadow-md shadow-cyan-600/20"
                >
                  {editingSong ? 'Save Song Changes' : 'Create Song Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL: QUICK CHANGE COVER ART (ADMIN) ----------------- */}
      {coverModalSong && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85">
          <div 
            className="w-full max-w-md bg-[#0F131C] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-3.5 bg-[#141A26] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Change Cover Art: {coverModalSong.title}
                </h3>
              </div>
              <button 
                onClick={() => setCoverModalSong(null)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCoverModal} className="p-5 space-y-4 text-xs">
              <div className="flex items-center gap-3 p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {coverModalUrl.trim() ? (
                    <img 
                      src={coverModalUrl.trim()} 
                      alt="Cover Preview" 
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white text-xs truncate">{coverModalSong.title}</h4>
                  <p className="text-zinc-400 text-[11px] truncate">{coverModalSong.artist}</p>
                  <p className="text-[10px] text-cyan-400 font-mono mt-1">Live URL Preview</p>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">
                  New Cover Art URL *
                </label>
                <input
                  type="url"
                  required
                  value={coverModalUrl}
                  onChange={e => setCoverModalUrl(e.target.value)}
                  placeholder="https://... direct image URL (PNG/JPG)"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Enter a direct image link. This will update the song's cover art across all difficulties and posts.
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCoverModalSong(null)}
                  className="px-4 py-1.5 rounded-xl text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCoverModal}
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-cyan-600/20"
                >
                  {isSavingCoverModal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Cover Art</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Song Details Modal */}
      {viewingSong && (
        <SongDetailsModal 
          song={viewingSong} 
          onClose={() => setViewingSong(null)} 
          onSongUpdated={(updated) => setSongs(prev => prev.map(s => s.id === updated.id ? updated : s))}
        />
      )}
    </div>
  );
};
