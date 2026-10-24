import React, { useRef, useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Music, 
  Trash2, 
  Edit3,
  Shield, 
  Crown, 
  X,
  Disc,
  Sparkles,
  Bell,
  Sun,
  CornerDownRight,
  ExternalLink,
  Star,
  Trophy,
  Copy,
  Check,
  Smile
} from 'lucide-react';
import { CountdownBadge } from './CountdownTimer';
import { FramedSongCover } from './FramedSongCover';
import { safeJson } from '../utils/safeJson';
import { UserAvatar } from './UserAvatar';
import { NewsArticle, SongEntry, ElementConfig, RankConfig, hasDifficulty } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchElementsList, fetchRanksList } from '../services/fandomService';
import { getElementData } from '../constants/elements';

const REACTION_EMOJIS = [
  { emoji: '🔥', label: 'Hype' },
  { emoji: '👍', label: 'Like' },
  { emoji: '🎵', label: 'Jam' },
  { emoji: '💖', label: 'Love' },
  { emoji: '⚡', label: 'GG' },
];

interface PostCardProps {
  post: NewsArticle;
  activeCategory?: string;
  onDelete?: (id: string) => Promise<void> | void;
  onEdit?: (post: NewsArticle) => void;
  onSongClick?: (song: SongEntry) => void;
  onOpenAccount?: (tab?: 'login' | 'signup') => void;
  onUserClick?: (author: any) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  activeCategory = 'All',
  onDelete,
  onEdit,
  onSongClick,
  onOpenAccount,
  onUserClick,
}) => {
  const { user, isAuthenticated } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [ranks, setRanks] = useState<RankConfig[]>([]);

  // Post Reactions State
  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions || {});
  const [userReactions, setUserReactions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`robeats_post_reactions_${post.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Sync post reactions prop
  useEffect(() => {
    if (post.reactions) {
      setReactions(post.reactions);
    }
  }, [post.reactions]);

  const handleToggleReaction = async (emoji: string) => {
    const hasReacted = userReactions.includes(emoji);
    const nextUserReactions = hasReacted
      ? userReactions.filter(e => e !== emoji)
      : [...userReactions, emoji];

    // Optimistic count update
    const currentCount = reactions[emoji] || 0;
    const nextReactions = {
      ...reactions,
      [emoji]: Math.max(0, currentCount + (hasReacted ? -1 : 1))
    };
    if (nextReactions[emoji] === 0) delete nextReactions[emoji];

    setUserReactions(nextUserReactions);
    setReactions(nextReactions);
    try {
      localStorage.setItem(`robeats_post_reactions_${post.id}`, JSON.stringify(nextUserReactions));
    } catch {}

    try {
      const res = await fetch(`/api/news/${post.id}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (res.ok) {
        const data = await safeJson(res, null);
        if (data && data.reactions) setReactions(data.reactions);
      }
    } catch (err) {
      console.error('Failed to update reaction', err);
    }
  };

  useEffect(() => {
    fetchElementsList().then(setElements).catch(() => {});
    fetchRanksList().then(res => {
      if (Array.isArray(res)) setRanks(res);
    }).catch(() => {});
  }, []);

  const songs: SongEntry[] = post.songs || [];
  const hasSongs = songs.length > 0;

  // Check scroll position to enable/disable arrow buttons
  const updateScrollState = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [songs.length]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const amount = 220;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'auto',
    });
  };

  const handleExecuteDelete = async () => {
    if (!onDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(post.id);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };


  // Format post publication date
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(post.publishedAt || Date.now()));

  // Check if current user is Staff or Admin to edit post
  const canEdit = isAuthenticated && user && (
    user.role === 'admin' || 
    user.role === 'staff' || 
    user.permissions?.canPublishNews
  );

  const canDelete = isAuthenticated && user && (
    user.role === 'admin' || 
    user.role === 'staff' || 
    user.permissions?.canDeleteContent
  );

  // Hyperlink and formatting renderer for patch notes / updates / descriptions
  const renderFormattedContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      // Matches [anchor](https://...) OR raw https://... / http://...
      const combinedRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/g;
      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = combinedRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          elements.push(line.substring(lastIndex, match.index));
        }

        if (match[1] && match[2]) {
          const linkText = match[1];
          const linkUrl = match[2];
          elements.push(
            <a
              key={`link-${lineIdx}-${match.index}`}
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium hover:underline inline-flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>{linkText}</span>
              <ExternalLink className="w-2.5 h-2.5 inline-block shrink-0" />
            </a>
          );
        } else if (match[3]) {
          const rawUrl = match[3];
          elements.push(
            <a
              key={`url-${lineIdx}-${match.index}`}
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 font-medium hover:underline inline-flex items-center gap-0.5 break-all transition-colors cursor-pointer"
            >
              <span>{rawUrl}</span>
              <ExternalLink className="w-2.5 h-2.5 inline-block shrink-0" />
            </a>
          );
        }

        lastIndex = combinedRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        elements.push(line.substring(lastIndex));
      }

      return (
        <React.Fragment key={`line-${lineIdx}`}>
          {elements.length > 0 ? elements : (line || '\u00A0')}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // Dynamic card styling based on category when viewed in "All" feed
  const isAllView = activeCategory === 'All';
  // Dynamic card styling based on category
  const cardCategoryStyle = 
    post.category === 'Daily mission'
      ? 'bg-[#140e26] border-purple-500/50 shadow-lg shadow-purple-950/30'
      : post.category === 'Weekly mission'
      ? 'bg-[#241307] border-orange-500/50 shadow-lg shadow-orange-950/30'
      : post.category === 'Weekly Leaderboard'
      ? 'bg-[#201605] border-amber-500/50 shadow-lg shadow-amber-950/30'
      : post.category === 'New song'
      ? 'bg-[#09142b] border-blue-500/50 shadow-lg shadow-blue-950/30'
      : post.category === 'Updates'
      ? 'bg-[#0a1a14] border-emerald-500/50 shadow-lg shadow-emerald-950/30'
      : 'bg-[#111622] border-zinc-800 shadow-md shadow-black/40';

  return (
    <article className={`w-full border rounded-xl p-3 sm:p-4 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl ${cardCategoryStyle} animate-post-entrance`}>
      {/* Category Tag Header when in 'All' Category */}
      {isAllView && (
        <div className="mb-2.5 pb-2 border-b border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {post.category === 'Daily mission' && (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-950/80 text-purple-200 border border-purple-500/60 flex items-center gap-1.5 shadow-sm">
                  <Sun className="w-3 h-3 text-purple-300" />
                  <span>Daily mission</span>
                </span>
                <CountdownBadge type="daily" compact />
              </>
            )}
            {post.category === 'Weekly mission' && (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-950/80 text-orange-200 border border-orange-500/60 flex items-center gap-1.5 shadow-sm">
                  <Calendar className="w-3 h-3 text-orange-300" />
                  <span>Weekly mission</span>
                </span>
                <CountdownBadge type="weekly" compact />
              </>
            )}
            {post.category === 'Weekly Leaderboard' && (
              <>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/80 text-amber-200 border border-amber-500/60 flex items-center gap-1.5 shadow-sm">
                  <Trophy className="w-3 h-3 text-amber-300" />
                  <span>Weekly Leaderboard</span>
                </span>
                <CountdownBadge type="leaderboard" compact />
              </>
            )}
            {post.category === 'New song' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-950/80 text-blue-200 border border-blue-500/60 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3 h-3 text-blue-300" />
                <span>New song</span>
              </span>
            )}
            {post.category === 'Updates' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-200 border border-emerald-500/60 flex items-center gap-1.5 shadow-sm">
                <Bell className="w-3 h-3 text-emerald-300" />
                <span>Updates</span>
              </span>
            )}
            {/* Date moved next to Tag */}
            <span className="flex items-center gap-1 text-zinc-400 text-[10px] font-mono-numbers bg-zinc-900/80 px-2 py-0.5 rounded-full border border-zinc-800">
              <Calendar className="w-2.5 h-2.5 text-zinc-400" />
              <span>{formattedDate}</span>
            </span>
          </div>
        </div>
      )}

      {/* Post Top Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80 text-xs">
        {/* Author & Badge Info */}
        <button
          type="button"
          onClick={() => onUserClick?.(post.author)}
          className="flex items-center gap-2 text-left group/author hover:opacity-95 transition-opacity cursor-pointer p-0.5 rounded-lg hover:bg-zinc-800/40"
          title={`View @${post.author?.name || 'author'}'s profile`}
        >
          <div className="relative">
            <UserAvatar
              src={post.author?.avatar}
              alt={post.author?.name || 'Author'}
              frameId={post.author?.equippedAvatarFrame}
              size="sm"
            />
            {post.author?.role?.toLowerCase() === 'admin' && (
              <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-amber-500 text-zinc-950 rounded-full z-20" title="Administrator">
                <Crown className="w-2 h-2" />
              </span>
            )}
            {post.author?.role?.toLowerCase() === 'staff' && (
              <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-emerald-500 text-zinc-950 rounded-full z-20" title="RoBeats Staff">
                <Shield className="w-2 h-2" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-semibold text-zinc-100 text-xs leading-none">
              <span className="group-hover/author:text-cyan-300 transition-colors underline decoration-transparent group-hover/author:decoration-cyan-400 underline-offset-2">
                {post.author?.name || 'RoBeats Staff'}
              </span>
              <span className={`text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full border ${
                post.author?.role?.toLowerCase() === 'admin'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}>
                {post.author?.role || 'Staff'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono-numbers mt-1 leading-none">
              <Calendar className="w-2.5 h-2.5 text-cyan-400/80" />
              <span>{formattedDate}</span>
              <span className="text-zinc-600">·</span>
              {post.category === 'Weekly mission' ? (
                <span className="inline-flex items-center gap-1 text-orange-400 font-semibold">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>Weekly missions</span>
                </span>
              ) : post.category === 'Daily mission' ? (
                <span className="inline-flex items-center gap-1 text-purple-400 font-semibold">
                  <Sun className="w-2.5 h-2.5" />
                  <span>Daily missions</span>
                </span>
              ) : post.category === 'Weekly Leaderboard' ? (
                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                  <Trophy className="w-2.5 h-2.5" />
                  <span>Weekly Leaderboard</span>
                </span>
              ) : post.category === 'New song' ? (
                <span className="inline-flex items-center gap-1 text-blue-400 font-semibold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>New song</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <Bell className="w-2.5 h-2.5" />
                  <span>{post.category || 'Updates'}</span>
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Action Controls: Edit Post & Delete Post (Staff & Admin) */}
        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1.5">
            {/* Edit Post Button (Admin and Staff) */}
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(post)}
                className="px-2.5 py-1 rounded-lg text-zinc-300 hover:text-cyan-300 bg-zinc-900/90 hover:bg-cyan-500/15 border border-zinc-800 hover:border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Edit this post (Admin & Staff)"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Edit</span>
              </button>
            )}

            {/* Delete Post Button */}
            {canDelete && onDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg text-xs">
                  <span className="text-rose-300 text-[10px] font-semibold">Delete forever?</span>
                  <button
                    onClick={handleExecuteDelete}
                    disabled={isDeleting}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="p-0.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
                    title="Cancel deletion"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  title="Delete post forever"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Post Title */}
      {post.title && (
        <div className="pt-2 pb-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {post.title}
            </h2>
            {post.category === 'Daily mission' && (
              <CountdownBadge type="daily" compact />
            )}
            {post.category === 'Weekly mission' && (
              <CountdownBadge type="weekly" compact />
            )}
            {post.category === 'Weekly Leaderboard' && (
              <CountdownBadge type="leaderboard" compact />
            )}
            {post.category === 'New song' && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                New Song Release
              </span>
            )}
            {post.category === 'Updates' && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                Patch Notes
              </span>
            )}
          </div>
        </div>
      )}

      {/* Post Content / Patch Notes / Announcements with Hyperlink Support */}
      {post.content && (
        <div className="pt-1 pb-2">
          {post.category === 'Updates' ? (
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-sky-500/20 text-xs text-zinc-300 leading-relaxed">
              {renderFormattedContent(post.content)}
            </div>
          ) : (
            <div className="text-xs text-zinc-300 leading-relaxed">
              {renderFormattedContent(post.content)}
            </div>
          )}
        </div>
      )}

      {/* Optional Cover Banner for Updates */}
      {post.category === 'Updates' && post.coverImage && (
        <div className="my-2 rounded-xl overflow-hidden max-h-60 border border-zinc-800">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Songs Showcase: Shows ONLY song with chosen difficulty */}
      {hasSongs && (
        <div className="mt-2.5">
          {/* Header of Songs Showcase with Arrow Navigation */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Music className="w-3 h-3" />
              </div>
              <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">
                Songs ({songs.length})
              </span>
            </div>

            {/* Mobile swipe indicator */}
            {songs.length > 1 && (
              <span className="sm:hidden text-[10px] text-zinc-500 font-medium tracking-tight">
                Swipe songs →
              </span>
            )}

            {/* Left and Right Arrow Navigation Buttons (Desktop only; Mobile swipes) */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                className={`w-6 h-6 rounded-lg border cursor-pointer flex items-center justify-center ${
                  canScrollLeft
                    ? 'bg-zinc-800 hover:bg-cyan-500/20 text-zinc-200 hover:text-cyan-300 border-zinc-700'
                    : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50'
                }`}
                title="Scroll left"
                aria-label="Scroll left"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                className={`w-6 h-6 rounded-lg border cursor-pointer flex items-center justify-center ${
                  canScrollRight
                    ? 'bg-zinc-800 hover:bg-cyan-500/20 text-zinc-200 hover:text-cyan-300 border-zinc-700'
                    : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed opacity-50'
                }`}
                title="Scroll right"
                aria-label="Scroll right"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Horizontal Scrollable Carousel Container (Touch-swipeable on mobile) */}
          <div className="relative">
            <div
              ref={scrollContainerRef}
              className="flex items-stretch gap-2.5 overflow-x-auto scrollbar-none snap-x snap-mandatory py-1 px-0.5 touch-pan-x overscroll-x-contain"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {songs.map((song, index) => {
                const elData = getElementData(song.element || '', elements);
                const missionRankName = song.missionRank || post.missionRank;
                const rankObj = missionRankName ? ranks.find(r => r.name.toLowerCase() === missionRankName.toLowerCase()) : null;
                
                // Determine available difficulties
                const hasE = hasDifficulty(song.difficulty?.easy);
                const hasN = hasDifficulty(song.difficulty?.normal);
                const hasH = hasDifficulty(song.difficulty?.hard);

                // Determine chosen difficulty: 'E', 'N', or 'H'
                const rawChosen = (song.chosenDifficulty || 'N').toUpperCase();
                let diffLetter = rawChosen.startsWith('E') ? 'E' : rawChosen.startsWith('H') ? 'H' : 'N';
                if (diffLetter === 'E' && !hasE) {
                  diffLetter = hasN ? 'N' : hasH ? 'H' : 'N';
                } else if (diffLetter === 'H' && !hasH) {
                  diffLetter = hasN ? 'N' : hasE ? 'E' : 'N';
                }

                const diffNumber = 
                  diffLetter === 'E' 
                    ? (song.difficulty?.easy || '-')
                    : diffLetter === 'H'
                    ? (song.difficulty?.hard || '-')
                    : (song.difficulty?.normal || '-');

                // Artwork corresponding to chosen difficulty
                const displayCover = 
                  diffLetter === 'E'
                    ? (song.coverArtEasy || song.coverArt)
                    : diffLetter === 'H'
                    ? (song.coverArtHard || song.coverArt)
                    : (song.coverArtNormal || song.coverArt);

                const diffFullText = diffLetter === 'E' ? 'Easy' : diffLetter === 'H' ? 'Hard' : 'Normal';

                return (
                  <div
                    key={song.uniqueKey || `${post.id || 'p'}_${song.id || 's'}_${index}`}
                    onClick={() => onSongClick && onSongClick(song)}
                    className="snap-start shrink-0 w-[150px] sm:w-[160px] bg-[#0E121A] border border-zinc-800 hover:border-cyan-500/50 hover:bg-[#111724] rounded-lg p-2 flex flex-col justify-between group/song cursor-pointer transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-950/20"
                    title={`"${song.title}" by "${song.artist}" - ${diffFullText} ${diffNumber}`}
                  >
                    <div>
                      {/* Cover Art with Difficulty Frame */}
                      <FramedSongCover
                        coverArt={song.coverArt || song.coverArtNormal || song.coverArtEasy || song.coverArtHard || ''}
                        difficulty={diffLetter}
                        song={song}
                        hasEasyDifficulty={hasE}
                        className="w-full aspect-square rounded-md overflow-hidden bg-zinc-950 border border-zinc-800 mb-1.5"
                        imageClassName="w-full h-full object-cover group-hover/song:scale-105 transition-transform duration-300 ease-out"
                        showDifficultyBadge={false}
                      >
                        {/* Top-Left Rank Icon on Cover Art (Daily & Weekly missions) */}
                        {(post.category === 'Daily mission' || post.category === 'Weekly mission') && missionRankName && (
                          <div 
                            className="absolute top-1 left-1 p-1 rounded bg-zinc-950/85 border border-zinc-700/80 flex items-center justify-center leading-none shadow-md z-20"
                            title={`${missionRankName} Missions`}
                          >
                            {rankObj?.iconUrl ? (
                              <img 
                                src={rankObj.iconUrl} 
                                alt={missionRankName} 
                                className="w-3.5 h-3.5 object-contain shrink-0" 
                                onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            )}
                          </div>
                        )}

                        {/* Linked Element Badge with Image and Color (ONLY icon image without text, +25% bigger) */}
                        {elData && (
                          <div 
                            className={`absolute top-1 right-1 p-1.5 rounded-md flex items-center justify-center border leading-none shadow-md z-20 ${elData.bg} ${elData.border}`}
                            title={elData.name}
                          >
                            {elData.imageUrl ? (
                              <img 
                                src={elData.imageUrl} 
                                alt={elData.name} 
                                className="w-[18px] h-[18px] object-contain shrink-0" 
                                onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <Disc className={`w-[18px] h-[18px] ${elData.text}`} />
                            )}
                          </div>
                        )}

                        {/* 'No misses' Tag on Cover Art ONLY if this chosen song is marked No misses */}
                        {Boolean(song.noMisses || song.isNoMisses) && (
                          <div 
                            className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-rose-600/90 text-white font-black text-[9px] uppercase tracking-wider text-center shadow-md border border-rose-400/60 backdrop-blur-xs flex items-center justify-center gap-1 z-20"
                            title="Challenge: No misses"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            <span className="truncate">No misses</span>
                          </div>
                        )}

                        {/* 'Score required' Tag on Cover Art for Weekly mission */}
                        {Boolean(song.requiredScore) && (
                          <div 
                            className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-amber-600/95 text-white font-black text-[9px] uppercase tracking-wider text-center shadow-md border border-amber-400/70 backdrop-blur-xs flex items-center justify-center gap-1 z-20"
                            title={`Score Required: ${song.requiredScore}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            <span className="truncate">Score: {song.requiredScore}</span>
                          </div>
                        )}
                      </FramedSongCover>

                      {/* Song Name & Artist */}
                      <div className="space-y-0.5 mb-1.5">
                        <h4 className="text-xs font-bold text-white group-hover/song:text-cyan-300 truncate leading-tight" title={`"${song.title}" by "${song.artist}" - ${diffFullText} ${diffNumber}`}>
                          "{song.title}"
                        </h4>
                        <p className="text-[10px] text-zinc-400 truncate leading-tight" title={song.artist}>
                          by "{song.artist}"
                        </p>
                      </div>
                    </div>

                    {/* ONLY SHOW CHOSEN DIFFICULTY & ROBEATS RANK */}
                    <div className="pt-1.5 border-t border-zinc-800 flex items-center justify-between gap-1">
                      <span className="text-[10px] font-mono text-zinc-400 font-medium">
                        Difficulty
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {/* RoBeats Rank badge next to difficulty */}
                        {song.missionRank && (
                          <div 
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] font-bold shadow-xs"
                            title={`${song.missionRank} Rank`}
                          >
                            {rankObj?.iconUrl ? (
                              <img 
                                src={rankObj.iconUrl} 
                                alt={song.missionRank} 
                                className="w-3.5 h-3.5 object-contain shrink-0" 
                                onError={e => { (e.target as HTMLElement).style.display = 'none'; }}
                              />
                            ) : (
                              <span 
                                className="w-2 h-2 rounded-full shrink-0" 
                                style={{ backgroundColor: rankObj?.color || '#F59E0B' }} 
                              />
                            )}
                            <span style={{ color: rankObj?.color || '#e4e4e7' }}>
                              {song.missionRank}
                            </span>
                          </div>
                        )}

                        {/* 'No misses' badge next to difficulty */}
                        {(song.noMisses || song.isNoMisses) && (
                          <div 
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/90 border border-rose-500/50 text-[10px] font-bold text-rose-300 shadow-xs"
                            title="No misses challenge"
                          >
                            <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
                            <span>No misses</span>
                          </div>
                        )}

                        {/* 'Score required' badge next to difficulty */}
                        {Boolean(song.requiredScore) && (
                          <div 
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-[10px] font-bold text-amber-300 shadow-xs"
                            title={`Score required: ${song.requiredScore}`}
                          >
                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span>Score: {song.requiredScore}</span>
                          </div>
                        )}

                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          diffLetter === 'E'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : diffLetter === 'H'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {diffFullText} {diffNumber}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* POST REACTIONS BAR */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Reaction Buttons Row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {REACTION_EMOJIS.map(({ emoji, label }) => {
            const count = reactions[emoji] || 0;
            const hasReacted = userReactions.includes(emoji);

            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleToggleReaction(emoji)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  hasReacted
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50 shadow-xs shadow-cyan-500/20 scale-105'
                    : count > 0
                    ? 'bg-zinc-900/90 text-zinc-300 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800'
                    : 'bg-zinc-900/40 text-zinc-500 border border-zinc-850 hover:text-zinc-300 hover:border-zinc-700'
                }`}
                title={`React with ${label}`}
              >
                <span className="text-sm leading-none">{emoji}</span>
                {count > 0 && <span className="font-mono text-[11px] font-bold">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Quick Reaction Button with Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-cyan-300 text-xs font-medium cursor-pointer transition-colors"
            title="Add Reaction"
          >
            <Smile className="w-3.5 h-3.5 text-cyan-400" />
            <span>React</span>
          </button>

          {showReactionPicker && (
            <div className="absolute bottom-full right-0 mb-2 p-1.5 bg-[#121722] border border-zinc-700 rounded-2xl shadow-xl flex items-center gap-1 z-30 animate-scale-in">
              {REACTION_EMOJIS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleToggleReaction(emoji);
                    setShowReactionPicker(false);
                  }}
                  className="w-8 h-8 rounded-xl hover:bg-zinc-800 flex items-center justify-center text-lg hover:scale-125 transition-transform cursor-pointer"
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
