import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Plus, 
  Trash2, 
  Shuffle, 
  Search, 
  Music, 
  Check, 
  Calendar,
  Shield,
  Crown,
  AlertCircle,
  Sun,
  Disc,
  Bell,
  ExternalLink,
  GripVertical,
  ArrowUp,
  ArrowDown,
  ShoppingBag,
  Star,
  Zap,
  Award,
  Activity,
  Trophy,
  Copy,
  Image as ImageIcon
} from 'lucide-react';
import { NewsArticle, SongEntry, ElementConfig, RankConfig, RoBeatsRank, hasDifficulty } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchSongList, fetchElementsList, fetchRanksList } from '../services/fandomService';
import { getElementData } from '../constants/elements';
import { SongDetailsModal } from './SongDetailsModal';
import { FramedSongCover } from './FramedSongCover';
import { safeJson } from '../utils/safeJson';

export type PostCategoryType = 'Daily mission' | 'Weekly mission' | 'Weekly Leaderboard' | 'New song' | 'Updates';

export interface NewSongDraft {
  id: string;
  title: string;
  artist: string;
  mapper: string;
  bpm?: string;
  duration?: string;
  easyLevel: string;
  normalLevel: string;
  hardLevel: string;
  featuredDifficulty: 'E' | 'N' | 'H';
  coverArt: string;
  coverArtEasy?: string;
  coverArtNormal?: string;
  coverArtHard?: string;
  element: string;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: NewsArticle) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { user, token } = useAuth();

  // Category State: 'Daily mission' | 'Weekly mission' | 'Weekly Leaderboard' | 'New song' | 'Updates'
  const [category, setCategory] = useState<PostCategoryType>('Daily mission');
  const [missionRank, setMissionRank] = useState<RoBeatsRank>('Star');
  const [shopMapper, setShopMapper] = useState('Official RoBeats');
  const [customTitle, setCustomTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [selectedSongs, setSelectedSongs] = useState<SongEntry[]>([]);
  
  // Elements & Ranks configuration
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [ranks, setRanks] = useState<RankConfig[]>([]);

  // Mini-form state for "New song" category posts
  const [newSongDrafts, setNewSongDrafts] = useState<NewSongDraft[]>([
    {
      id: 'draft-1',
      title: '',
      artist: '',
      mapper: 'Official RoBeats',
      bpm: '',
      duration: '',
      easyLevel: '1',
      normalLevel: '5',
      hardLevel: '10',
      featuredDifficulty: 'N',
      coverArt: '',
      coverArtEasy: '',
      coverArtNormal: '',
      coverArtHard: '',
      element: 'Flow',
    }
  ]);

  // Drag and drop indices
  const [draggedSongIdx, setDraggedSongIdx] = useState<number | null>(null);
  const [draggedDraftIdx, setDraggedDraftIdx] = useState<number | null>(null);

  // Song Picker State (for Mission & Shop posts)
  const [allAvailableSongs, setAllAvailableSongs] = useState<SongEntry[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongEntry | null>(null);
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectCategory = (newCat: PostCategoryType) => {
    setCategory(newCat);
    if (newCat === 'Weekly mission') {
      setSelectedSongs(prev => {
        const sliced = prev.slice(0, 2);
        return sliced.map((s, i) => ({
          ...s,
          missionRank: i === 0 ? 'Star' as RoBeatsRank : 'Pro' as RoBeatsRank,
        }));
      });
    }
  };

  // Derived Title based on Category
  const autoTitle = 
    category === 'Weekly mission' 
      ? 'Weekly missions' 
      : category === 'Weekly Leaderboard'
      ? 'Weekly Leaderboard'
      : category === 'Daily mission' 
      ? 'Daily missions' 
      : category === 'Updates' 
      ? 'RoBeats Game Update' 
      : 'New Song Release';

  // Load Song List, Elements, and Ranks from server database on open
  useEffect(() => {
    if (isOpen) {
      setIsLoadingSongs(true);
      Promise.all([
        fetchSongList(),
        fetchElementsList(),
        fetchRanksList().catch(() => [])
      ])
        .then(([songs, elList, rankList]) => {
          setAllAvailableSongs(songs);
          setElements(elList);
          if (Array.isArray(rankList) && rankList.length > 0) {
            setRanks(rankList);
          }
          // Set default element if available
          if (elList && elList.length > 0) {
            setNewSongDrafts(prev => prev.map(d => d.element ? d : { ...d, element: elList[0].name }));
          }
        })
        .catch((err: any) => {
          console.error('Failed to load data for post creator', err);
        })
        .finally(() => {
          setIsLoadingSongs(false);
        });
    }
  }, [isOpen]);

  // Filter songs for the song picker modal
  const filteredPickerSongs = useMemo(() => {
    if (!songSearchQuery.trim()) return allAvailableSongs.slice(0, 50);
    const q = songSearchQuery.toLowerCase();
    return allAvailableSongs.filter(s => 
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.mapper && s.mapper.toLowerCase().includes(q)) ||
      (s.element && s.element.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [allAvailableSongs, songSearchQuery]);

  // Mini-form handlers for New Song posts
  const handleAddNewSongDraft = () => {
    const defaultEl = elements[0]?.name || 'Flow';
    setNewSongDrafts(prev => [
      ...prev,
      {
        id: `draft-${Date.now()}-${prev.length + 1}`,
        title: '',
        artist: '',
        mapper: 'Official RoBeats',
        bpm: '',
        duration: '',
        easyLevel: '1',
        normalLevel: '5',
        hardLevel: '10',
        featuredDifficulty: 'N',
        coverArt: '',
        coverArtEasy: '',
        coverArtNormal: '',
        coverArtHard: '',
        element: defaultEl,
      }
    ]);
  };

  const handleUpdateNewSongDraft = (id: string, updates: Partial<NewSongDraft>) => {
    setNewSongDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleRemoveNewSongDraft = (id: string) => {
    setNewSongDrafts(prev => prev.filter(d => d.id !== id));
  };

  // Add song to selected list - allows adding MULTIPLE copies of the same song (e.g. "Dimension")
  const handleAddSong = (song: SongEntry) => {
    if (category === 'Weekly mission' && selectedSongs.length >= 2) {
      setErrorMessage('Weekly Missions can add only 2 songs.');
      return;
    }
    if (category === 'Weekly Leaderboard' && selectedSongs.length >= 8) {
      setErrorMessage('Weekly Leaderboard can add only 8 songs.');
      return;
    }
    setErrorMessage(null);
    const instanceKey = `${song.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newIdx = selectedSongs.length;
    let initialRank: RoBeatsRank | undefined = undefined;
    if (category === 'Weekly mission') {
      initialRank = newIdx === 0 ? 'Star' : 'Pro';
    }
    setSelectedSongs(prev => [
      ...prev,
      {
        ...song,
        uniqueKey: instanceKey,
        chosenDifficulty: 'N',
        missionRank: initialRank,
      }
    ]);
  };

  const handleSetSongDifficulty = (uniqueKeyOrId: string, diff: 'E' | 'N' | 'H') => {
    setSelectedSongs(prev =>
      prev.map(s => {
        if ((s.uniqueKey || s.id) !== uniqueKeyOrId) return s;
        if (diff === 'E' && !hasDifficulty(s.difficulty?.easy)) return s;
        if (diff === 'H' && !hasDifficulty(s.difficulty?.hard)) return s;
        if (diff === 'N' && !hasDifficulty(s.difficulty?.normal)) return s;
        return { ...s, chosenDifficulty: diff };
      })
    );
  };

  const handleSetSongRank = (uniqueKeyOrId: string, rank?: RoBeatsRank) => {
    setSelectedSongs(prev => {
      const idx = prev.findIndex(s => (s.uniqueKey || s.id) === uniqueKeyOrId);
      if (category === 'Weekly mission') {
        if (idx === 0) return prev.map((s, i) => i === 0 ? { ...s, missionRank: 'Star' as RoBeatsRank } : s);
        if (idx === 1) return prev.map((s, i) => i === 1 ? { ...s, missionRank: 'Pro' as RoBeatsRank } : s);
      }
      return prev.map((s, i) => {
        if (i !== idx) return s;
        return {
          ...s,
          missionRank: s.missionRank === rank ? undefined : rank,
        };
      });
    });
  };

  const handleToggleSongNoMisses = (uniqueKeyOrId: string) => {
    setSelectedSongs(prev =>
      prev.map(s => {
        if ((s.uniqueKey || s.id) !== uniqueKeyOrId) return s;
        const current = Boolean(s.noMisses || s.isNoMisses);
        return {
          ...s,
          noMisses: !current,
          isNoMisses: !current,
        };
      })
    );
  };

  const handleSetSongRequiredScore = (uniqueKeyOrId: string, score: string) => {
    setSelectedSongs(prev =>
      prev.map(s => ((s.uniqueKey || s.id) === uniqueKeyOrId ? { ...s, requiredScore: score } : s))
    );
  };

  const handleRemoveSong = (uniqueKeyOrId: string) => {
    setSelectedSongs(prev => {
      const filtered = prev.filter(s => (s.uniqueKey || s.id) !== uniqueKeyOrId);
      if (category === 'Weekly mission') {
        return filtered.map((s, i) => {
          if (i === 0) return { ...s, missionRank: 'Star' as RoBeatsRank };
          if (i === 1) return { ...s, missionRank: 'Pro' as RoBeatsRank };
          return s;
        });
      }
      return filtered;
    });
  };

  // Reorder functions
  const handleMoveSong = (index: number, direction: 'up' | 'down') => {
    setSelectedSongs(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const item = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = item;
      if (category === 'Weekly mission') {
        return copy.map((s, i) => ({
          ...s,
          missionRank: i === 0 ? 'Star' as RoBeatsRank : 'Pro' as RoBeatsRank,
        }));
      }
      return copy;
    });
  };

  const handleMoveDraft = (index: number, direction: 'up' | 'down') => {
    setNewSongDrafts(prev => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const item = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = item;
      return copy;
    });
  };

  // Drag and drop handlers
  const handleSongDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSongIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSongDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSongDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSongIdx === null || draggedSongIdx === targetIndex) return;
    setSelectedSongs(prev => {
      const list = [...prev];
      const [moved] = list.splice(draggedSongIdx, 1);
      list.splice(targetIndex, 0, moved);
      if (category === 'Weekly mission') {
        return list.map((s, i) => ({
          ...s,
          missionRank: i === 0 ? 'Star' as RoBeatsRank : 'Pro' as RoBeatsRank,
        }));
      }
      return list;
    });
    setDraggedSongIdx(null);
  };

  const handleDraftDragStart = (e: React.DragEvent, index: number) => {
    setDraggedDraftIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDraftDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedDraftIdx === null || draggedDraftIdx === targetIndex) return;
    setNewSongDrafts(prev => {
      const list = [...prev];
      const [moved] = list.splice(draggedDraftIdx, 1);
      list.splice(targetIndex, 0, moved);
      return list;
    });
    setDraggedDraftIdx(null);
  };

  // Submit new post
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (category === 'New song') {
      if (newSongDrafts.length === 0) {
        setErrorMessage('Please add at least 1 song for the new song release');
        return;
      }
      for (let i = 0; i < newSongDrafts.length; i++) {
        const s = newSongDrafts[i];
        if (!s.title.trim() || !s.artist.trim()) {
          setErrorMessage(`Please enter Song Title and Artist for Song #${i + 1}`);
          return;
        }
      }
    } else if (category === 'Updates') {
      // Updates posts do NOT require adding featured songs
      if (!customTitle.trim() && !content.trim()) {
        setErrorMessage('Please provide update details or a title for the update post.');
        return;
      }
    } else {
      if (selectedSongs.length === 0) {
        setErrorMessage('Please select at least 1 song for the post.');
        return;
      }
      if (category === 'Weekly mission' && selectedSongs.length > 2) {
        setErrorMessage('Weekly Mission post can add only 2 songs.');
        return;
      }
      if (category === 'Weekly Leaderboard' && selectedSongs.length > 8) {
        setErrorMessage('Weekly Leaderboard post can add only 8 songs.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let finalSongs: SongEntry[] = [];
      let finalCover: string | undefined = undefined;

      if (category === 'New song') {
        finalSongs = newSongDrafts.map((s, idx) => {
          const diffTier = s.featuredDifficulty || 'N';
          const easyCover = (s.coverArtEasy || s.coverArt || '').trim();
          const normalCover = (s.coverArtNormal || s.coverArt || '').trim();
          const hardCover = (s.coverArtHard || s.coverArt || '').trim();
          const primaryCover = normalCover || easyCover || hardCover;

          return {
            id: `newsong_${Date.now()}_${idx}`,
            uniqueKey: s.id,
            title: s.title.trim(),
            artist: s.artist.trim(),
            mapper: s.mapper.trim() || 'Official RoBeats',
            bpm: s.bpm?.trim() || '',
            duration: s.duration?.trim() || '',
            coverArt: primaryCover,
            coverArtEasy: easyCover || primaryCover,
            coverArtNormal: normalCover || primaryCover,
            coverArtHard: hardCover || primaryCover,
            difficulty: {
              easy: s.easyLevel.trim() || '-',
              normal: s.normalLevel.trim() || '-',
              hard: s.hardLevel.trim() || '-',
            },
            chosenDifficulty: diffTier,
            element: s.element || 'Flow',
            isCustom: true,
          };
        });
        finalCover = finalSongs[0]?.coverArt || undefined;
      } else {
        // Daily or Weekly mission or Weekly Leaderboard
        finalSongs = selectedSongs.map((s, idx) => ({
          ...s,
          missionRank: category === 'Weekly mission'
            ? (idx === 0 ? 'Star' as RoBeatsRank : 'Pro' as RoBeatsRank)
            : (category === 'Daily mission' ? s.missionRank : undefined),
          noMisses: category === 'Daily mission' ? (Boolean(s.noMisses || s.isNoMisses) || undefined) : undefined,
          isNoMisses: category === 'Daily mission' ? (Boolean(s.noMisses || s.isNoMisses) || undefined) : undefined,
          requiredScore: category === 'Weekly mission' ? (String(s.requiredScore ?? '').trim() || undefined) : undefined,
        }));
        finalCover = coverImageUrl.trim() || selectedSongs[0]?.coverArt || undefined;
      }

      let finalTitle = customTitle.trim();
      if (!finalTitle) {
        if (category === 'Weekly mission') finalTitle = 'Weekly missions';
        else if (category === 'Weekly Leaderboard') finalTitle = 'Weekly Leaderboard';
        else if (category === 'Daily mission') finalTitle = 'Daily missions';
        else if (category === 'New song') {
          if (finalSongs.length === 1) {
            finalTitle = `New Song: "${finalSongs[0].title}" by ${finalSongs[0].artist}`;
          } else {
            finalTitle = `New Songs: ${finalSongs.map(s => `"${s.title}"`).join(', ')}`;
          }
        } else if (category === 'Updates') {
          finalTitle = 'RoBeats Game Update';
        }
      }

      const payload = {
        title: finalTitle,
        category,
        content: content.trim(),
        songs: finalSongs,
        tags: [
          category, 
          'RoBeats', 
          ...(category === 'New song' 
            ? ['New Songs', 'Release'] 
            : category === 'Updates' 
            ? ['Patch Notes', 'Updates'] 
            : ['Missions'])
        ],
        coverImage: finalCover || undefined,
      };

      const res = await fetch('/api/news', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await safeJson(res, {});
        throw new Error(errorData?.error || 'Failed to create post');
      }

      const createdPost = await safeJson(res, null);
      if (createdPost) {
        onPostCreated(createdPost);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating post');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80">
      <div 
        className="w-full max-w-2xl bg-[#0D111A] border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Create New Post</h3>
                {user?.role === 'admin' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <Crown className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <Shield className="w-3 h-3" /> Staff
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2">
              Post Type & Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {/* Daily mission button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Daily mission')}
                className={`p-3 rounded-xl border text-left cursor-pointer flex flex-col justify-between transition-all ${
                  category === 'Daily mission'
                    ? 'bg-purple-500/15 border-purple-400 ring-1 ring-purple-500/50 shadow-sm shadow-purple-500/10'
                    : 'bg-zinc-900/60 border-purple-500/30 hover:border-purple-400/60 text-purple-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Sun className={`w-4 h-4 ${category === 'Daily mission' ? 'text-purple-300' : 'text-purple-400/70'}`} />
                  {category === 'Daily mission' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${category === 'Daily mission' ? 'text-white' : 'text-zinc-200'}`}>
                    Daily mission
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                    Today rotation
                  </span>
                </div>
              </button>

              {/* Weekly mission button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Weekly mission')}
                className={`p-3 rounded-xl border text-left cursor-pointer flex flex-col justify-between transition-all ${
                  category === 'Weekly mission'
                    ? 'bg-orange-500/15 border-orange-400 ring-1 ring-orange-500/50 shadow-sm shadow-orange-500/10'
                    : 'bg-zinc-900/60 border-orange-500/30 hover:border-orange-400/60 text-orange-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Calendar className={`w-4 h-4 ${category === 'Weekly mission' ? 'text-orange-300' : 'text-orange-400/70'}`} />
                  {category === 'Weekly mission' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${category === 'Weekly mission' ? 'text-white' : 'text-zinc-200'}`}>
                    Weekly mission
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                    Week rotation
                  </span>
                </div>
              </button>

              {/* Weekly Leaderboard button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Weekly Leaderboard')}
                className={`p-3 rounded-xl border text-left cursor-pointer flex flex-col justify-between transition-all ${
                  category === 'Weekly Leaderboard'
                    ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-500/50 shadow-sm shadow-amber-500/10'
                    : 'bg-zinc-900/60 border-amber-500/30 hover:border-amber-400/60 text-amber-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Trophy className={`w-4 h-4 ${category === 'Weekly Leaderboard' ? 'text-amber-300' : 'text-amber-400/70'}`} />
                  {category === 'Weekly Leaderboard' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${category === 'Weekly Leaderboard' ? 'text-white' : 'text-zinc-200'}`}>
                    Weekly Leaderboard
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                    Leaderboard stats
                  </span>
                </div>
              </button>

              {/* New song button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('New song')}
                className={`p-3 rounded-xl border text-left cursor-pointer flex flex-col justify-between transition-all ${
                  category === 'New song'
                    ? 'bg-blue-500/15 border-blue-400 ring-1 ring-blue-500/50 shadow-sm shadow-blue-500/10'
                    : 'bg-zinc-900/60 border-blue-500/30 hover:border-blue-400/60 text-blue-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Sparkles className={`w-4 h-4 ${category === 'New song' ? 'text-blue-300' : 'text-blue-400/70'}`} />
                  {category === 'New song' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${category === 'New song' ? 'text-white' : 'text-zinc-200'}`}>
                    New song
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                    Song release
                  </span>
                </div>
              </button>

              {/* Updates button */}
              <button
                type="button"
                onClick={() => handleSelectCategory('Updates')}
                className={`p-3 rounded-xl border text-left cursor-pointer flex flex-col justify-between transition-all ${
                  category === 'Updates'
                    ? 'bg-emerald-500/15 border-emerald-400 ring-1 ring-emerald-500/50 shadow-sm shadow-emerald-500/10'
                    : 'bg-zinc-900/60 border-emerald-500/30 hover:border-emerald-400/60 text-emerald-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Bell className={`w-4 h-4 ${category === 'Updates' ? 'text-emerald-300' : 'text-emerald-400/70'}`} />
                  {category === 'Updates' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
                <div>
                  <span className={`text-xs font-bold block ${category === 'Updates' ? 'text-white' : 'text-zinc-200'}`}>
                    Updates
                  </span>
                  <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                    Patch & notes
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder={
                category === 'New song'
                  ? 'Laur - Alteregoism'
                  : category === 'Updates'
                  ? 'RoBeats Update: Version 2.5'
                  : category === 'Weekly Leaderboard'
                  ? 'Weekly Leaderboard (leave blank for default)'
                  : category === 'Weekly mission'
                  ? 'Weekly missions (leave blank for default)'
                  : 'Daily missions (leave blank for default)'
              }
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Description / Content / Patch Notes Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                {category === 'Updates' ? 'Details' : 'Description'}
              </label>
              {category === 'Updates' && (
                <button
                  type="button"
                  onClick={() => {
                    setContent(prev => prev + (prev.endsWith('\n') || !prev ? '' : '\n') + '[Link Description](https://example.com)');
                  }}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium cursor-pointer"
                  title="Insert a markdown hyperlink into the patch notes"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Insert Hyperlink</span>
                </button>
              )}
            </div>
            <textarea
              rows={category === 'Updates' ? 4 : 2}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={
                category === 'Updates'
                  ? '• New Song List added\n• Audio sync improvements\n• Bug fixes for mobile controls\n• Join Discord: [Official Discord](https://discord.gg/robeats)'
                  : category === 'New song'
                  ? 'Check out the new high-speed challenge Alteregoism by Laur now available in RoBeats!'
                  : 'Enter mission notes and objectives...'
              }
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Cover Image / Banner URL (for Updates or custom post) */}
          {category === 'Updates' && (
            <div>
              <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1.5">
                Cover Banner Image URL (Optional)
              </label>
              <input
                type="text"
                value={coverImageUrl}
                onChange={e => setCoverImageUrl(e.target.value)}
                placeholder="https://... image banner URL"
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* NEW SONG: Mini-Form for Song Releases */}
          {category === 'New song' ? (
            <div className="pt-2 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                    New Songs ({newSongDrafts.length})
                  </label>
                  <p className="text-[11px] text-zinc-400">
                    Add new song release details, edit difficulty levels (Easy, Normal, Hard), set cover art URL & element
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewSongDraft}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add Another Song</span>
                </button>
              </div>

              <div className="space-y-3">
                {newSongDrafts.map((draft, idx) => {
                  return (
                    <div
                      key={draft.id}
                      draggable
                      onDragStart={e => handleDraftDragStart(e, idx)}
                      onDragOver={handleSongDragOver}
                      onDrop={e => handleDraftDrop(e, idx)}
                      className="p-4 bg-[#111622] border border-zinc-800 rounded-xl space-y-3.5 relative hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 p-0.5" title="Drag to reorder">
                            <GripVertical className="w-4 h-4" />
                          </span>
                          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white">
                            Song #{idx + 1} {draft.title ? `• "${draft.title}"` : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Move up / down buttons */}
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveDraft(idx, 'up')}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < newSongDrafts.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveDraft(idx, 'down')}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {newSongDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveNewSongDraft(draft.id)}
                              className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer transition-colors ml-1"
                              title="Remove this song"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Song title, Artist & Mapper */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Song Title <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={draft.title}
                            onChange={e => handleUpdateNewSongDraft(draft.id, { title: e.target.value })}
                            placeholder="Song title"
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Artist <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={draft.artist}
                            onChange={e => handleUpdateNewSongDraft(draft.id, { artist: e.target.value })}
                            placeholder="Artist name"
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Mapper(s)
                          </label>
                          <input
                            type="text"
                            value={draft.mapper}
                            onChange={e => handleUpdateNewSongDraft(draft.id, { mapper: e.target.value })}
                            placeholder="Official RoBeats or Mapper"
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Song BPM & Duration */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            BPM
                          </label>
                          <input
                            type="text"
                            value={draft.bpm || ''}
                            onChange={e => handleUpdateNewSongDraft(draft.id, { bpm: e.target.value })}
                            placeholder="e.g. 175"
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={draft.duration || ''}
                            onChange={e => handleUpdateNewSongDraft(draft.id, { duration: e.target.value })}
                            placeholder="e.g. 2:14"
                            className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>

                      {/* 3 Difficulty levels editable per difficulty (Easy : 1, Normal: 5, Hard: 10) */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">
                          Song Difficulties
                        </label>
                        <div className="grid grid-cols-3 gap-2.5">
                          {/* Easy Level */}
                          <div className="p-2 bg-zinc-900/90 border border-emerald-500/30 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-emerald-400 block uppercase">Easy ("-" if none)</span>
                            <input
                              type="text"
                              value={draft.easyLevel}
                              onChange={e => {
                                const val = e.target.value;
                                const updates: Partial<NewSongDraft> = { easyLevel: val };
                                if (!hasDifficulty(val) && draft.featuredDifficulty === 'E') {
                                  updates.featuredDifficulty = 'N';
                                }
                                handleUpdateNewSongDraft(draft.id, updates);
                              }}
                              placeholder="1 or -"
                              className="w-full px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-300 font-mono font-bold focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Normal Level */}
                          <div className="p-2 bg-zinc-900/90 border border-blue-500/30 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-blue-400 block uppercase">Normal ("-" if none)</span>
                            <input
                              type="text"
                              value={draft.normalLevel}
                              onChange={e => handleUpdateNewSongDraft(draft.id, { normalLevel: e.target.value })}
                              placeholder="5 or -"
                              className="w-full px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-blue-300 font-mono font-bold focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Hard Level - Red globally */}
                          <div className="p-2 bg-zinc-900/90 border border-red-500/30 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-red-400 block uppercase">Hard ("-" if none)</span>
                            <input
                              type="text"
                              value={draft.hardLevel}
                              onChange={e => handleUpdateNewSongDraft(draft.id, { hardLevel: e.target.value })}
                              placeholder="10 or -"
                              className="w-full px-2 py-1 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-red-300 font-mono font-bold focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>

                        {/* Featured Difficulty in Feed */}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[10px] text-zinc-400 font-medium">Spotlight in Feed:</span>
                          {(['E', 'N', 'H'] as const).map(diff => {
                            const isAvailable = diff === 'E' ? hasDifficulty(draft.easyLevel) : diff === 'H' ? hasDifficulty(draft.hardLevel) : hasDifficulty(draft.normalLevel);
                            if (!isAvailable) return null;

                            return (
                              <button
                                key={diff}
                                type="button"
                                onClick={() => handleUpdateNewSongDraft(draft.id, { featuredDifficulty: diff })}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                  draft.featuredDifficulty === diff
                                    ? diff === 'E'
                                      ? 'bg-emerald-500 text-zinc-950'
                                      : diff === 'H'
                                      ? 'bg-red-500 text-white'
                                      : 'bg-blue-500 text-white'
                                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
                                }`}
                              >
                                {diff === 'E' ? 'Easy' : diff === 'H' ? 'Hard' : 'Normal'}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Song Cover Art (1 Image Link) & Difficulty Frame Overlays */}
                      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
                            <ImageIcon className="w-3 h-3 text-cyan-400" />
                            <span>Song Cover Art (1 Image Link)</span>
                          </label>
                          <span className="text-[9px] font-mono text-zinc-500">
                            Per song 1 cover art
                          </span>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={draft.coverArt || draft.coverArtNormal || ''}
                            onChange={e => handleUpdateNewSongDraft(draft.id, { 
                              coverArt: e.target.value,
                              coverArtNormal: e.target.value,
                              coverArtEasy: e.target.value,
                              coverArtHard: e.target.value,
                            })}
                            placeholder="https://... cover art direct image link"
                            className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                          />
                          <p className="text-[10px] text-zinc-500 mt-1">
                            Difficulty frames (Easy frame, Hard frame, Normal nothing frame) are applied over this cover art.
                          </p>
                        </div>

                        {/* Difficulty Frame Previews */}
                        {(() => {
                          const draftHasEasy = hasDifficulty(draft.easyLevel);
                          const draftHasNormal = hasDifficulty(draft.normalLevel);
                          const draftHasHard = hasDifficulty(draft.hardLevel);
                          const draftCount = (draftHasEasy ? 1 : 0) + (draftHasNormal ? 1 : 0) + (draftHasHard ? 1 : 0);
                          const draftCols = draftCount === 1 ? 'grid-cols-1 max-w-xs mx-auto' : draftCount === 2 ? 'grid-cols-2' : 'grid-cols-3';

                          return (
                            <div className="pt-2 border-t border-zinc-800/70 space-y-1.5">
                              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                                Cover art preview
                              </span>
                              <div className={`grid ${draftCols} gap-2`}>
                                {/* Easy - only shown if draft has Easy difficulty */}
                                {draftHasEasy && (
                                  <div className="p-1.5 bg-zinc-900/60 rounded-lg border border-zinc-800 flex flex-col items-center gap-1">
                                    <FramedSongCover
                                      coverArt={draft.coverArt || draft.coverArtNormal || ''}
                                      difficulty="easy"
                                      hasEasyDifficulty={draftHasEasy}
                                      className="w-12 h-12 rounded shadow"
                                      showDifficultyBadge
                                    />
                                    <span className="text-[9px] font-semibold text-emerald-400">Easy Frame</span>
                                  </div>
                                )}
                                {draftHasNormal && (
                                  <div className="p-1.5 bg-zinc-900/60 rounded-lg border border-zinc-800 flex flex-col items-center gap-1">
                                    <FramedSongCover
                                      coverArt={draft.coverArt || draft.coverArtNormal || ''}
                                      difficulty="normal"
                                      className="w-12 h-12 rounded shadow"
                                      showDifficultyBadge
                                    />
                                    <span className="text-[9px] font-semibold text-blue-400">Nothing Frame</span>
                                  </div>
                                )}
                                {draftHasHard && (
                                  <div className="p-1.5 bg-zinc-900/60 rounded-lg border border-zinc-800 flex flex-col items-center gap-1">
                                    <FramedSongCover
                                      coverArt={draft.coverArt || draft.coverArtNormal || ''}
                                      difficulty="hard"
                                      className="w-12 h-12 rounded shadow"
                                      showDifficultyBadge
                                    />
                                    <span className="text-[9px] font-semibold text-rose-400">Hard Frame</span>
                                  </div>
                                )}
                              </div>
                              {!draftHasEasy && (
                                <p className="text-[10px] text-zinc-500 italic">
                                  Easy is marked "-" &rarr; Easy difficulty frame is excluded for this song.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Elements: Manual choose from available added elements */}
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-300 mb-1.5">
                          Song element:
                        </label>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                          {elements.map(el => {
                            const isSelected = draft.element.toLowerCase() === el.name.toLowerCase();
                            const elData = getElementData(el.name, elements);
                            return (
                              <button
                                key={el.name}
                                type="button"
                                onClick={() => handleUpdateNewSongDraft(draft.id, { element: el.name })}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? `${elData.bg} ${elData.border} ${elData.text} font-bold ring-1 ring-cyan-400/50`
                                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                }`}
                              >
                                {el.imageUrl ? (
                                  <img src={el.imageUrl} alt={el.name} className="w-3.5 h-3.5 object-contain" />
                                ) : (
                                  <Disc className="w-3.5 h-3.5" />
                                )}
                                <span>{el.name}</span>
                                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* MISSION POSTS: Featured Songs from Song List */
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                      Featured Songs ({selectedSongs.length}
                      {category === 'Weekly mission' ? '/2' : category === 'Weekly Leaderboard' ? '/8' : ''})
                    </label>
                    {((category === 'Weekly mission' && selectedSongs.length >= 2) || (category === 'Weekly Leaderboard' && selectedSongs.length >= 8)) && (
                      <span className="text-[10px] font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 uppercase tracking-wider font-mono">
                        Limit Reached ({category === 'Weekly mission' ? '2/2' : '8/8'} Songs)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {category === 'Weekly mission'
                      ? 'Add only 2 songs for Weekly Missions'
                      : category === 'Weekly Leaderboard'
                      ? 'Add only 8 songs for Weekly Leaderboard'
                      : category === 'Daily mission'
                      ? 'Add all songs in daily missions'
                      : 'Add songs to rotation. Drag & drop to arrange sequence.'}
                  </p>
                </div>

                {/* Action Buttons for Songs */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSongPicker(!showSongPicker)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{showSongPicker ? 'Hide Picker' : 'Browse Songs'}</span>
                  </button>
                </div>
              </div>

              {/* Embedded Song Picker Drawer */}
              {showSongPicker && (
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl mb-4 space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={songSearchQuery}
                      onChange={e => setSongSearchQuery(e.target.value)}
                      placeholder="Search Song List by name, artist, or element..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                    {filteredPickerSongs.map(song => {
                      const addedCount = selectedSongs.filter(s => s.id === song.id).length;
                      const elData = getElementData(song.element || '', elements);
                      const displayCover = song.coverArtNormal || song.coverArtEasy || song.coverArtHard || song.coverArt;
                      const isMax = (category === 'Weekly mission' && selectedSongs.length >= 2) || (category === 'Weekly Leaderboard' && selectedSongs.length >= 8);

                      return (
                        <div
                          key={song.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800 text-zinc-300"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FramedSongCover
                              coverArt={song.coverArt || song.coverArtNormal || song.coverArtEasy || song.coverArtHard || ''}
                              difficulty="normal"
                              song={song}
                              className="w-7 h-7 rounded shrink-0 shadow"
                            />
                            <div className="truncate">
                              <span className="text-xs font-semibold text-white block truncate">{song.title}</span>
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                                <span>{song.artist}</span>
                                <span>·</span>
                                <span className={elData.text}>{elData.name}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Element mini badge */}
                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] ${elData.bg} ${elData.border}`}>
                              {elData.imageUrl && (
                                <img src={elData.imageUrl} alt={elData.name} className="w-2.5 h-2.5 object-contain" />
                              )}
                              <span className={`font-bold ${elData.text}`}>{elData.name}</span>
                            </div>

                            <span className="text-[10px] font-mono text-zinc-400">
                              {song.difficulty?.normal || '-'}/{song.difficulty?.hard || '-'}
                            </span>

                            {addedCount > 0 && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                                x{addedCount}
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAddSong(song)}
                              disabled={isMax}
                              className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                isMax
                                  ? 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-800'
                                  : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer'
                              }`}
                              title={
                                category === 'Weekly mission' && selectedSongs.length >= 2
                                  ? 'Weekly Missions can add only 2 songs'
                                  : category === 'Weekly Leaderboard' && selectedSongs.length >= 8
                                  ? 'Weekly Leaderboard can add only 8 songs'
                                  : 'Add to post rotation (can add multiple)'
                              }
                            >
                              <Plus className="w-3 h-3" />
                              <span>{isMax ? 'Max' : 'Add'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Songs Preview List with Drag & Drop Ordering */}
              {selectedSongs.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  No songs selected yet
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedSongs.map((song, idx) => {
                  const elData = getElementData(song.element || '', elements);
                  const chosen = song.chosenDifficulty || 'N';
                  const songKey = song.uniqueKey || `${song.id}-${idx}`;
                  const displayCover = 
                    chosen === 'E' 
                      ? (song.coverArtEasy || song.coverArt)
                      : chosen === 'H'
                      ? (song.coverArtHard || song.coverArt)
                      : (song.coverArtNormal || song.coverArt);

                  return (
                    <div
                      key={songKey}
                      draggable
                      onDragStart={e => handleSongDragStart(e, idx)}
                      onDragOver={handleSongDragOver}
                      onDrop={e => handleSongDrop(e, idx)}
                      className="p-3 bg-[#121620] border border-zinc-800 rounded-xl space-y-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 p-0.5 shrink-0" title="Drag to reorder">
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <FramedSongCover
                            coverArt={song.coverArt || song.coverArtNormal || song.coverArtEasy || song.coverArtHard || ''}
                            difficulty={chosen}
                            song={song}
                            className="w-10 h-10 rounded-lg shadow shrink-0"
                            onClick={() => setSelectedSongDetail(song)}
                            title="Click to view song details & difficulty frames"
                          >
                            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-cyan-500 text-zinc-950 font-bold text-[9px] flex items-center justify-center z-20">
                              {idx + 1}
                            </span>
                          </FramedSongCover>
                          <div 
                            onClick={() => setSelectedSongDetail(song)}
                            className="min-w-0 cursor-pointer"
                            title="Click to view song details & difficulty frames"
                          >
                            <h5 className="text-xs font-bold text-white truncate hover:text-cyan-400 transition-colors">{song.title}</h5>
                            <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveSong(idx, 'up')}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                          )}
                          {idx < selectedSongs.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveSong(idx, 'down')}
                              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSong(songKey)}
                            className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 cursor-pointer ml-1"
                            title="Remove song"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Chosen Difficulty Level Selector */}
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-semibold">Featured Level:</span>
                          {(['E', 'N', 'H'] as const).map(diff => {
                            const isChosen = chosen === diff;
                            const hasThisDiff = 
                              diff === 'E' 
                                ? hasDifficulty(song.difficulty?.easy) 
                                : diff === 'N' 
                                ? hasDifficulty(song.difficulty?.normal) 
                                : hasDifficulty(song.difficulty?.hard);
                            const diffVal = 
                              diff === 'E' 
                                ? song.difficulty?.easy 
                                : diff === 'N' 
                                ? song.difficulty?.normal 
                                : song.difficulty?.hard;

                            return (
                              <button
                                key={diff}
                                type="button"
                                disabled={!hasThisDiff}
                                onClick={() => handleSetSongDifficulty(songKey, diff)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                                  !hasThisDiff
                                    ? 'bg-zinc-900/60 text-zinc-600 border border-zinc-850 cursor-not-allowed opacity-50'
                                    : isChosen
                                    ? diff === 'E'
                                      ? 'bg-emerald-500 text-zinc-950 cursor-pointer'
                                      : diff === 'N'
                                      ? 'bg-blue-500 text-white cursor-pointer'
                                      : 'bg-red-500 text-white cursor-pointer'
                                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 cursor-pointer'
                                }`}
                                title={!hasThisDiff ? `Song does not have ${diff === 'E' ? 'Easy' : diff === 'N' ? 'Normal' : 'Hard'} difficulty (-)` : undefined}
                              >
                                {diff} {diffVal || '-'}
                              </button>
                            );
                          })}
                        </div>

                        {/* Element badge */}
                        <div className={`px-1.5 py-0.2 rounded border text-[9px] font-bold ${elData.bg} ${elData.border} ${elData.text}`}>
                          {elData.name}
                        </div>
                      </div>

                      {/* RoBeats Rank Selector per song (Daily & Weekly missions) */}
                      {(category === 'Daily mission' || category === 'Weekly mission') && (
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400" />
                            <span>Rank:</span>
                            {category === 'Weekly mission' && (
                              <span className="text-[9px] font-mono text-amber-300 ml-1">
                                ({idx === 0 ? 'Song 1 locked to Star' : 'Song 2 locked to Pro'})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {(category === 'Weekly mission'
                              ? (idx === 0 ? ['Star'] : ['Pro'])
                              : ['Star', 'Pro', 'Amateur', 'Novice', 'Beginner']
                            ).map((rName) => {
                              const rankConfig = ranks.find(r => r.name.toLowerCase() === rName.toLowerCase());
                              const isRankSelected = song.missionRank === rName;
                              return (
                                <button
                                  key={rName}
                                  type="button"
                                  onClick={() => handleSetSongRank(songKey, rName as RoBeatsRank)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                                    isRankSelected
                                      ? 'bg-zinc-800 text-white ring-1 ring-cyan-400'
                                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                                  }`}
                                  title={category === 'Weekly mission' ? `Rank is locked to ${rName} for Weekly mission` : `Set rank to ${rName}`}
                                >
                                  {rankConfig?.iconUrl ? (
                                    <img src={rankConfig.iconUrl} alt={rName} className="w-2.5 h-2.5 object-contain" />
                                  ) : (
                                    <span 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: rankConfig?.color || '#F59E0B' }} 
                                    />
                                  )}
                                  <span style={{ color: isRankSelected ? (rankConfig?.color || '#fff') : undefined }}>
                                    {rName}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Song Tag Modifier: 'No misses' - ONLY for Daily mission category */}
                      {category === 'Daily mission' && (
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                            <Zap className="w-3 h-3 text-rose-400" />
                            <span>Challenge:</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleSongNoMisses(songKey)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                              song.noMisses || song.isNoMisses
                                ? 'bg-rose-500/25 border-rose-500/70 text-rose-200 ring-1 ring-rose-500/40 shadow-xs'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                            }`}
                            title="Mark this song as 'No misses' (shows tag badge on cover art)"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${song.noMisses || song.isNoMisses ? 'bg-rose-400 animate-pulse' : 'bg-zinc-600'}`} />
                            <span>No misses</span>
                            {(song.noMisses || song.isNoMisses) && <Check className="w-3 h-3 text-rose-400" />}
                          </button>
                        </div>
                      )}

                      {/* Song Tag Modifier: 'Score required' - ONLY for Weekly mission category */}
                      {category === 'Weekly mission' && (
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 shrink-0">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span>Challenge:</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-500 font-medium">Score required:</span>
                            <input
                              type="text"
                              value={song.requiredScore || ''}
                              onChange={(e) => handleSetSongRequiredScore(songKey, e.target.value)}
                              placeholder="e.g. 500,000"
                              className="w-28 sm:w-36 bg-zinc-900 border border-zinc-700/80 rounded px-2 py-0.5 text-xs text-amber-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Posting as <strong className="text-zinc-200">@{user?.username}</strong> ({user?.role})
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white cursor-pointer text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting || 
                  (category === 'New song' 
                    ? newSongDrafts.length === 0 
                    : category === 'Updates' 
                    ? (!customTitle.trim() && !content.trim()) 
                    : selectedSongs.length === 0)
                }
                className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Song Details Modal for editing 3 covers */}
      {selectedSongDetail && (
        <SongDetailsModal
          song={selectedSongDetail}
          onClose={() => setSelectedSongDetail(null)}
          onSongUpdated={(updated) => {
            setSelectedSongDetail(updated);
            setSelectedSongs(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
          }}
        />
      )}
    </div>
  );
};
