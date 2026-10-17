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
  MessageSquare,
  ChevronDown,
  Send,
  User as UserIcon,
  Sparkles,
  Bell,
  Sun,
  Lock,
  CornerDownRight,
  ExternalLink,
  Star,
  Trophy,
  Copy,
  Check
} from 'lucide-react';
import { CountdownBadge } from './CountdownTimer';
import { NewsArticle, SongEntry, ElementConfig, RankConfig, PostComment } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchElementsList, fetchRanksList } from '../services/fandomService';
import { getElementData } from '../constants/elements';

interface PostCardProps {
  post: NewsArticle;
  activeCategory?: string;
  onDelete?: (id: string) => Promise<void> | void;
  onEdit?: (post: NewsArticle) => void;
  onSongClick?: (song: SongEntry) => void;
  onOpenAccount?: (tab?: 'login' | 'signup') => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  activeCategory = 'All',
  onDelete,
  onEdit,
  onSongClick,
  onOpenAccount,
}) => {
  const { user, isAuthenticated, token } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [elements, setElements] = useState<ElementConfig[]>([]);
  const [ranks, setRanks] = useState<RankConfig[]>([]);

  // Comments state
  const [comments, setComments] = useState<PostComment[]>(post.comments || []);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    fetchElementsList().then(setElements).catch(() => {});
    fetchRanksList().then(res => {
      if (Array.isArray(res)) setRanks(res);
    }).catch(() => {});
  }, []);

  // Update comments if post.comments updates
  useEffect(() => {
    if (post.comments) {
      setComments(post.comments);
    }
  }, [post.comments]);

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

  // Submit comment handler (Strictly for registered users)
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;
    if (!isAuthenticated || !token) {
      setCommentError('Please sign in with a registered account to post a comment.');
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)news/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: commentContent.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to submit comment');
      }

      const newC = await res.json();
      setComments(prev => [...prev, newC]);
      setCommentContent('');
    } catch (err: any) {
      setCommentError(err.message || 'Error posting comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch(`[https://robeats-d1-api.anh6052018.workers.dev/api/](https://robeats-d1-api.anh6052018.workers.dev/api/)news/${post.id}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
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
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src={post.author?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
              alt={post.author?.name || 'Author'}
              className="w-7 h-7 rounded-full object-cover border border-zinc-700"
            />
            {post.author?.role?.toLowerCase() === 'admin' && (
              <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-amber-500 text-zinc-950 rounded-full" title="Administrator">
                <Crown className="w-2 h-2" />
              </span>
            )}
            {post.author?.role?.toLowerCase() === 'staff' && (
              <span className="absolute -bottom-0.5 -right-0.5 p-0.5 bg-emerald-500 text-zinc-950 rounded-full" title="RoBeats Staff">
                <Shield className="w-2 h-2" />
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-semibold text-zinc-100 text-xs leading-none">
              <span>{post.author?.name || 'RoBeats Staff'}</span>
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
              ) : post.category === 'Updates' ? (
                <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                  <Bell className="w-2.5 h-2.5" />
                  <span>Updates</span>
                </span>
              ) : (
                <span className="text-rose-400 font-medium">{post.category}</span>
              )}
            </div>
          </div>
        </div>

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
                const elData = getElementData(song.element, elements);
                const missionRankName = song.missionRank || post.missionRank;
                const rankObj = missionRankName ? ranks.find(r => r.name.toLowerCase() === missionRankName.toLowerCase()) : null;
                
                // Determine chosen difficulty: 'E', 'N', or 'H'
                const rawChosen = (song.chosenDifficulty || 'N').toUpperCase();
                const diffLetter = rawChosen.startsWith('E') ? 'E' : rawChosen.startsWith('H') ? 'H' : 'N';
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
                      {/* Cover Art */}
                      <div className="relative aspect-square w-full rounded-md overflow-hidden bg-zinc-950 border border-zinc-800 mb-1.5">
                        {displayCover ? (
                          <img
                            src={displayCover}
                            alt={song.title}
                            className="w-full h-full object-cover group-hover/song:scale-105 transition-transform duration-300 ease-out"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                            <Music className="w-6 h-6 opacity-40 mb-1" />
                            <span className="text-[9px]">No Art</span>
                          </div>
                        )}

                        {/* Top-Left Rank Icon on Cover Art (Daily & Weekly missions) */}
                        {(post.category === 'Daily mission' || post.category === 'Weekly mission') && missionRankName && (
                          <div 
                            className="absolute top-1 left-1 p-1 rounded bg-zinc-950/85 border border-zinc-700/80 flex items-center justify-center leading-none shadow-md z-10"
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
                            className={`absolute top-1 right-1 p-1.5 rounded-md flex items-center justify-center border leading-none shadow-md ${elData.bg} ${elData.border}`}
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
                            className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-rose-600/90 text-white font-black text-[9px] uppercase tracking-wider text-center shadow-md border border-rose-400/60 backdrop-blur-xs flex items-center justify-center gap-1 z-10"
                            title="Challenge: No misses"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            <span className="truncate">No misses</span>
                          </div>
                        )}

                        {/* 'Score required' Tag on Cover Art for Weekly mission */}
                        {Boolean(song.requiredScore) && (
                          <div 
                            className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-amber-600/95 text-white font-black text-[9px] uppercase tracking-wider text-center shadow-md border border-amber-400/70 backdrop-blur-xs flex items-center justify-center gap-1 z-10"
                            title={`Score Required: ${song.requiredScore}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                            <span className="truncate">Score: {song.requiredScore}</span>
                          </div>
                        )}
                      </div>

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

      {/* COMMENTS SECTION (Everyone can comment) */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-cyan-300 font-medium cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Comments ({comments.length})</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCommentsOpen ? 'rotate-180' : ''}`} />
        </button>

        {isCommentsOpen && (
          <div className="mt-3 space-y-3 pt-2 border-t border-zinc-800/40 animate-fade-in">
            {/* Comments List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-zinc-500 text-xs py-2 italic text-center sm:text-left">
                  No comments yet. Be the first to share your score or comment!
                </p>
              ) : (
                comments.map(c => {
                  const isAuthorOrStaff = isAuthenticated && user && (
                    user.role === 'admin' || 
                    user.role === 'staff' || 
                    user.id === c.userId
                  );

                  return (
                    <div key={c.id} className="p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-800/80 flex items-start justify-between gap-2 text-xs">
                      <div className="flex items-start gap-2 min-w-0">
                        {c.authorAvatar ? (
                          <img src={c.authorAvatar} alt={c.authorName} className="w-6 h-6 rounded-full object-cover shrink-0 border border-zinc-700" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {c.authorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-200">{c.authorName}</span>
                            {c.authorRole === 'admin' && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Admin
                              </span>
                            )}
                            {c.authorRole === 'staff' && (
                              <span className="text-[8px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Staff
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500">
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-zinc-300 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                            {c.content}
                          </p>
                        </div>
                      </div>

                      {isAuthorOrStaff && (
                        <button
                          type="button"
                          onClick={() => handleDeleteComment(c.id)}
                          className="p-1 rounded text-zinc-500 hover:text-rose-400 cursor-pointer shrink-0"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form: Strictly for Registered Accounts */}
            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="space-y-2 pt-1">
                {commentError && (
                  <div className="text-rose-400 text-[11px]">{commentError}</div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commentContent}
                    onChange={e => setCommentContent(e.target.value)}
                    placeholder={`Comment as @${user?.username}...`}
                    className="flex-1 px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !commentContent.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2 text-zinc-400 text-center sm:text-left">
                  <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span>Only registered accounts can comment on posts.</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenAccount?.('login')}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAccount?.('signup')}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Sign up
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
