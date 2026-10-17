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
  Save,
  Edit3,
  Bell,
  ExternalLink,
  GripVertical,
  ShoppingBag,
  Star,
  Zap,
  Trophy,
  Send
} from 'lucide-react';
import { NewsArticle, SongEntry, ElementConfig, RankConfig, RoBeatsRank } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchSongList, fetchElementsList, fetchRanksList, publishNewsToDiscordWebhook } from '../services/fandomService';
import { getElementData } from '../constants/elements';

export type PostCategoryType = 'Daily mission' | 'Weekly mission' | 'Weekly Leaderboard' | 'New song' | 'Updates';

interface EditPostModalProps {
  post: NewsArticle | null;
  isOpen: boolean;
  onClose: () => void;
  onPostUpdated: (post: NewsArticle) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  post,
  isOpen,
  onClose,
  onPostUpdated,
}) => {
  const { user, token } = useAuth();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [category, setCategory] = useState<PostCategoryType>('Daily mission');
  const [missionRank, setMissionRank] = useState<RoBeatsRank>('Star');
  const [selectedSongs, setSelectedSongs] = useState<SongEntry[]>([]);
  
  // Elements & Ranks configuration
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [ranks, setRanks] = useState<RankConfig[]>([]);

  // Song Picker State
  const [allAvailableSongs, setAllAvailableSongs] = useState<SongEntry[]>([]);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  
  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Manual Discord Webhook publishing state
  const [isPublishingWebhook, setIsPublishingWebhook] = useState(false);
  const [webhookFeedback, setWebhookFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Drag and drop indices
  const [draggedSongIdx, setDraggedSongIdx] = useState<number | null>(null);

  // Initialize form when post changes
  useEffect(() => {
    if (post && isOpen) {
      setTitle(post.title || '');
      setContent(post.content || '');
      setCoverImage(post.coverImage || '');
      const validCategory: PostCategoryType = 
        post.category === 'Weekly mission' || post.category === 'Weekly Leaderboard' || post.category === 'New song' || post.category === 'Updates'
          ? post.category
          : 'Daily mission';
      setCategory(validCategory);
      setMissionRank(post.missionRank || 'Star');
      setSelectedSongs(
        (post.songs || []).map((s, idx) => {
          let rank = s.missionRank;
          if (validCategory === 'Weekly mission') {
            if (idx === 0) rank = 'Star';
            else if (idx === 1) rank = 'Pro';
          }
          return {
            ...s,
            mapper: s.mapper || 'Official RoBeats',
            uniqueKey: s.uniqueKey || `${s.id}_${idx}_${Date.now()}`,
            chosenDifficulty: s.chosenDifficulty || 'N',
            missionRank: rank,
            noMisses: Boolean(s.noMisses || s.isNoMisses),
            isNoMisses: Boolean(s.noMisses || s.isNoMisses),
            requiredScore: s.requiredScore || '',
          };
        })
      );
      setErrorMessage(null);
      setWebhookFeedback(null);

      // Load database
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
        })
        .catch(err => {
          console.error('Failed to load data for editor', err);
        })
        .finally(() => {
          setIsLoadingSongs(false);
        });
    }
  }, [post, isOpen]);

  // Filter songs for song picker
  const filteredPickerSongs = useMemo(() => {
    if (!songSearchQuery.trim()) return allAvailableSongs.slice(0, 50);
    const q = songSearchQuery.toLowerCase();
    return allAvailableSongs.filter(s => 
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.element.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [allAvailableSongs, songSearchQuery]);

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
      if (newIdx === 0) initialRank = 'Star';
      else if (newIdx === 1) initialRank = 'Pro';
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

  const handleRemoveSong = (uniqueKeyOrId: string) => {
    setSelectedSongs(prev => {
      const filtered = prev.filter(s => (s.uniqueKey || s.id) !== uniqueKeyOrId);
      if (category === 'Weekly mission') {
        return filtered.map((s, i) => {
          if (i === 0) return { ...s, missionRank: 'Star' };
          if (i === 1) return { ...s, missionRank: 'Pro' };
          return s;
        });
      }
      return filtered;
    });
  };

  const handleSetSongDifficulty = (uniqueKeyOrId: string, diff: 'E' | 'N' | 'H') => {
    setSelectedSongs(prev =>
      prev.map(s => ((s.uniqueKey || s.id) === uniqueKeyOrId ? { ...s, chosenDifficulty: diff } : s))
    );
  };

  const handleUpdateSongMapper = (uniqueKeyOrId: string, mapper: string) => {
    setSelectedSongs(prev =>
      prev.map(s => ((s.uniqueKey || s.id) === uniqueKeyOrId ? { ...s, mapper } : s))
    );
  };

  const handleSetSongRank = (uniqueKeyOrId: string, rank?: RoBeatsRank) => {
    setSelectedSongs(prev => {
      const idx = prev.findIndex(s => (s.uniqueKey || s.id) === uniqueKeyOrId);
      if (category === 'Weekly mission') {
        if (idx === 0) return prev.map((s, i) => i === 0 ? { ...s, missionRank: 'Star' } : s);
        if (idx === 1) return prev.map((s, i) => i === 1 ? { ...s, missionRank: 'Pro' } : s);
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
        return list.map((s, i) => {
          if (i === 0) return { ...s, missionRank: 'Star' };
          if (i === 1) return { ...s, missionRank: 'Pro' };
          return s;
        });
      }
      return list;
    });
    setDraggedSongIdx(null);
  };

  // Submit edits
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post) return;

    if (category !== 'Updates' && selectedSongs.length === 0) {
      setErrorMessage(
        category === 'New song'
          ? 'Please include at least 1 song in the new song post'
          : category === 'Weekly Leaderboard'
          ? 'Please include at least 1 song in the weekly leaderboard post'
          : 'Please include at least 1 song in the mission post'
      );
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
    if (category === 'Updates' && !content.trim() && !title.trim() && selectedSongs.length === 0) {
      setErrorMessage('Please provide update details, title, or songs.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const finalSongs = selectedSongs.map(s => ({
        ...s,
        missionRank: (category === 'Daily mission' || category === 'Weekly mission') ? s.missionRank : undefined,
        noMisses: category === 'Daily mission' ? (Boolean(s.noMisses || s.isNoMisses) || undefined) : undefined,
        isNoMisses: category === 'Daily mission' ? (Boolean(s.noMisses || s.isNoMisses) || undefined) : undefined,
        requiredScore: category === 'Weekly mission' ? (s.requiredScore?.trim() || undefined) : undefined,
      }));

      const existingTags = post.tags || [category, 'RoBeats'];
      const updatedTags = existingTags.filter(t => t.toLowerCase() !== 'no misses' && !t.toLowerCase().includes('no miss'));

      const payload = {
        title: title.trim() || (
          category === 'Weekly mission' 
            ? 'Weekly missions' 
            : category === 'Weekly Leaderboard'
            ? 'Weekly Leaderboard'
            : category === 'Daily mission' 
            ? 'Daily missions' 
            : category === 'New song' 
            ? 'New Song Release' 
            : 'RoBeats Game Update'
        ),
        category,
        content: content.trim(),
        coverImage: coverImage.trim() || selectedSongs[0]?.coverArt || undefined,
        songs: finalSongs,
        tags: updatedTags,
      };

      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)news/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update post');
      }

      const updated = await res.json();
      onPostUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualWebhookPublish = async () => {
    if (!post?.id) return;
    if (user?.role !== 'admin' && user?.role !== 'staff') {
      setErrorMessage('Only Staff and Admins are allowed to post via Discord webhook.');
      return;
    }
    setIsPublishingWebhook(true);
    setWebhookFeedback(null);
    setErrorMessage(null);

    try {
      const finalSongs = selectedSongs.map((s, idx) => ({
        ...s,
        missionRank: category === 'Weekly mission' ? (idx === 0 ? 'Star' : 'Pro') : s.missionRank,
        noMisses: category === 'Daily mission' ? (Boolean(s.noMisses || s.isNoMisses) || undefined) : undefined,
        isNoMisses: category === 'Daily mission' ? (Boolean(s.noMisses || s.isNoMisses) || undefined) : undefined,
        requiredScore: category === 'Weekly mission' ? (s.requiredScore?.trim() || undefined) : undefined,
      }));

      const existingTags = post.tags || [category, 'RoBeats'];
      const updatedTags = existingTags.filter(t => t.toLowerCase() !== 'no misses' && !t.toLowerCase().includes('no miss'));

      const payload = {
        title: title.trim() || (
          category === 'Weekly mission' 
            ? 'Weekly missions' 
            : category === 'Weekly Leaderboard'
            ? 'Weekly Leaderboard'
            : category === 'Daily mission' 
            ? 'Daily missions' 
            : category === 'New song' 
            ? 'New Song Release' 
            : 'RoBeats Game Update'
        ),
        category,
        content: content.trim(),
        coverImage: coverImage.trim() || selectedSongs[0]?.coverArt || undefined,
        songs: finalSongs,
        tags: updatedTags,
      };

      const res = await publishNewsToDiscordWebhook(post.id, payload);
      setWebhookFeedback({ 
        success: true, 
        message: res.message || `Successfully broadcast to Discord [${category}] webhook!` 
      });
      onPostUpdated({
        ...post,
        ...payload,
      });
    } catch (err: any) {
      setWebhookFeedback({ 
        success: false, 
        message: err.message || 'Failed to publish via Discord webhook' 
      });
    } finally {
      setIsPublishingWebhook(false);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80">
      <div 
        className="w-full max-w-2xl bg-[#0D111A] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Edit Post</h3>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Post Category (Locked / Read-Only when editing an existing post) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Post Category
              </label>
              <span className="text-[11px] text-zinc-500 font-medium">
                Category cannot be changed when editing an existing post
              </span>
            </div>
            <div className="p-3 rounded-xl border bg-zinc-900/60 border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
                  category === 'Daily mission'
                    ? 'bg-purple-500/15 text-purple-200 border-purple-400'
                    : category === 'Weekly mission'
                    ? 'bg-orange-500/15 text-orange-200 border-orange-400'
                    : category === 'Weekly Leaderboard'
                    ? 'bg-amber-500/15 text-amber-200 border-amber-400'
                    : category === 'New song'
                    ? 'bg-blue-500/15 text-blue-200 border-blue-400'
                    : category === 'Updates'
                    ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {category === 'Daily mission' && <Sun className="w-3.5 h-3.5 text-purple-300" />}
                  {category === 'Weekly mission' && <Calendar className="w-3.5 h-3.5 text-orange-300" />}
                  {category === 'Weekly Leaderboard' && <Trophy className="w-3.5 h-3.5 text-amber-300" />}
                  {category === 'New song' && <Sparkles className="w-3.5 h-3.5 text-blue-300" />}
                  {category === 'Updates' && <Bell className="w-3.5 h-3.5 text-emerald-300" />}
                  <span>{category}</span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-800/80 border border-zinc-700">
                Locked
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Daily missions or custom event title"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
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
              placeholder="Enter post description, announcement details, or patch notes..."
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 leading-relaxed"
            />
          </div>

          {/* Cover Image URL - Hidden for Daily Mission and Weekly Mission */}
          {category !== 'Daily mission' && category !== 'Weekly mission' && (category === 'Updates' || coverImage) && (
            <div>
              <label className="block text-xs font-bold text-zinc-200 uppercase tracking-wider mb-1">
                Cover Banner Image URL (Optional)
              </label>
              <input
                type="text"
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
                placeholder="https://... cover image URL"
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Attached Songs with Chosen Difficulty - Hidden for Updates */}
          {category !== 'Updates' && (
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
                      : 'Select the difficulty level for each song (feed displays only chosen difficulty like "N 25")'}
                  </p>
                </div>

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

            {/* Song Picker Drawer */}
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
                    const elData = getElementData(song.element, elements);
                    const displayCover = song.coverArtNormal || song.coverArtEasy || song.coverArtHard || song.coverArt;
                    const isMax = (category === 'Weekly mission' && selectedSongs.length >= 2) || (category === 'Weekly Leaderboard' && selectedSongs.length >= 8);

                    return (
                      <div
                        key={song.id}
                        onClick={() => {
                          if (!isMax) handleAddSong(song);
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg border text-zinc-300 transition-colors ${
                          isMax 
                            ? 'hover:bg-zinc-900/40 border-transparent cursor-not-allowed opacity-75' 
                            : 'cursor-pointer hover:bg-zinc-900/80 border-transparent hover:border-cyan-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <img
                            src={displayCover}
                            alt={song.title}
                            className="w-7 h-7 rounded object-cover border border-zinc-800 shrink-0"
                            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isMax) handleAddSong(song);
                            }}
                            disabled={isMax}
                            className={`px-2.5 py-1 rounded-md font-bold text-xs flex items-center gap-1 transition-colors ${
                              isMax
                                ? 'bg-zinc-850 text-zinc-500 cursor-not-allowed border border-zinc-800'
                                : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-zinc-950 cursor-pointer'
                            }`}
                            title={
                              category === 'Weekly mission' && selectedSongs.length >= 2
                                ? 'Weekly Missions can add only 2 songs'
                                : category === 'Weekly Leaderboard' && selectedSongs.length >= 8
                                ? 'Weekly Leaderboard can add only 8 songs'
                                : 'Add to post rotation'
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

            {/* Selected Songs List with Drag & Drop Ordering & Chosen Difficulty Selector */}
            {selectedSongs.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                No songs selected yet
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedSongs.map((song, idx) => {
                  const songKey = song.uniqueKey || `${song.id}_${idx}`;
                  const elData = getElementData(song.element, elements);
                  const chosen = song.chosenDifficulty || 'N';
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
                      onDragStart={(e) => handleSongDragStart(e, idx)}
                      onDragOver={handleSongDragOver}
                      onDrop={(e) => handleSongDrop(e, idx)}
                      className="p-3 bg-[#121620] border border-zinc-800 rounded-xl space-y-2 cursor-move hover:border-cyan-500/40 transition-colors"
                      title="Drag to rearrange order"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex items-center text-zinc-600 hover:text-zinc-300 mr-0.5">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="relative shrink-0">
                            <img
                              src={displayCover}
                              alt={song.title}
                              className="w-10 h-10 rounded-lg object-cover border border-zinc-800"
                            />
                            <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-cyan-500 text-zinc-950 font-bold text-[9px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-bold text-white truncate">{song.title}</h5>
                            <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSong(songKey)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 cursor-pointer shrink-0"
                          title="Remove song"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Mapper edit input box - Hidden for Daily mission and Weekly mission */}
                      {category !== 'Daily mission' && category !== 'Weekly mission' && (
                        <div className="flex items-center gap-1.5 text-[10px] bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/60">
                          <span className="text-zinc-400 font-semibold shrink-0">Mapper(s):</span>
                          <input
                            type="text"
                            value={song.mapper || ''}
                            onChange={e => handleUpdateSongMapper(songKey, e.target.value)}
                            placeholder="Official RoBeats or Mapper Name"
                            className="w-full px-2 py-0.5 text-[10px] bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      )}

                      {/* Chosen Difficulty Level Selector */}
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-400 font-semibold">Featured Level:</span>
                          {(['E', 'N', 'H'] as const).map(diff => {
                            const isChosen = chosen === diff;
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
                                onClick={() => handleSetSongDifficulty(songKey, diff)}
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                  isChosen
                                    ? diff === 'E'
                                      ? 'bg-emerald-500 text-zinc-950'
                                      : diff === 'N'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-red-500 text-white'
                                    : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                                }`}
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

          {/* Discord Webhook Feedback Notice */}
          {webhookFeedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              webhookFeedback.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {webhookFeedback.success ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{webhookFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setWebhookFeedback(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-xs text-zinc-400">
              Editing as <strong className="text-zinc-200">@{user?.username}</strong> ({user?.role})
            </span>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Webhook Publish Button - Staff & Admin only, available while editing for all categories */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <button
                  type="button"
                  onClick={handleManualWebhookPublish}
                  disabled={isPublishingWebhook || isSubmitting}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/50 hover:border-indigo-400 font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5 transition-all shadow-sm"
                  title="Broadcast this post via Discord Webhook manually"
                >
                  <Send className={`w-3.5 h-3.5 text-indigo-400 ${isPublishingWebhook ? 'animate-pulse' : ''}`} />
                  <span>{isPublishingWebhook ? 'Publishing...' : 'Webhook Publish'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isPublishingWebhook}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white cursor-pointer font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isPublishingWebhook || (category !== 'Updates' && selectedSongs.length === 0)}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Post Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
