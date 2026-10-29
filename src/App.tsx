import React, { useState, useEffect, useMemo } from 'react';
import { NewsCategory, NewsArticle, SongEntry } from './types';
import { Header } from './components/Header';
import { AccountModal } from './components/AccountModal';
import { AdminPanel } from './components/AdminPanel';
import { SongList } from './components/SongList';
import { PostCard } from './components/PostCard';
import { CreatePostModal } from './components/CreatePostModal';
import { EditPostModal } from './components/EditPostModal';
import { SongDetailsModal } from './components/SongDetailsModal';
import { UserProfileModal } from './components/UserProfileModal';
import { StreakModal } from './components/StreakModal';
import { useAuth } from './context/AuthContext';
import { 
  PlusCircle, 
  Sparkles, 
  Music, 
  Loader2, 
  Calendar,
  Layers,
  Shield,
  Crown
} from 'lucide-react';
import { CountdownBadge } from './components/CountdownTimer';
import { safeJson } from './utils/safeJson';
import { DEFAULT_SEED_ARTICLES } from './constants/seedArticles';

export default function App() {
  const { user, token, isAuthenticated } = useAuth();

  // Navigation & Category State
  const [currentCategory, setCurrentCategory] = useState<NewsCategory>('All');

  // Posts State
  const [posts, setPosts] = useState<NewsArticle[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'login' | 'signup' | 'profile'>('login');

  // Streak Modal State
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  // Admin Panel State
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  // Create Post Modal State (Only Staff & Admin)
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);

  // Edit Post Modal State (Staff & Admin)
  const [editingPost, setEditingPost] = useState<NewsArticle | null>(null);

  // Song Details Modal State
  const [selectedSongDetail, setSelectedSongDetail] = useState<SongEntry | null>(null);

  // User Profile Modal State
  const [viewingUserProfile, setViewingUserProfile] = useState<any>(null);

  // Check if current user is Staff or Admin
  const canUserPost = isAuthenticated && user && (
    user.role === 'staff' || 
    user.role === 'admin' || 
    user.permissions?.canPublishNews
  );

  // Fetch posts from backend with resilient fallback
  const fetchPosts = async () => {
    try {
      setIsLoadingPosts(true);
      let loadedPosts: NewsArticle[] | null = null;

      try {
        const res = await fetch('/api/news');
        if (res.ok) {
          const data = await safeJson<NewsArticle[] | null>(res, null);
          if (Array.isArray(data) && data.length > 0) {
            loadedPosts = data;
          }
        }
      } catch (err) {
        console.warn('News fetch error, using fallback seed articles', err);
      }

      if (!loadedPosts || loadedPosts.length === 0) {
        loadedPosts = DEFAULT_SEED_ARTICLES;
      }

      setPosts(loadedPosts);
    } catch (err) {
      console.error('Failed to fetch posts', err);
      setPosts(DEFAULT_SEED_ARTICLES);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleOpenAccount = (tab: 'login' | 'signup' | 'profile' = 'login') => {
    setAccountModalTab(tab);
    setIsAccountModalOpen(true);
  };

  const handlePostCreated = (newPost: NewsArticle) => {
    setPosts(prev => [newPost, ...prev]);
    if (currentCategory !== 'All' && currentCategory !== 'Song List' && newPost.category !== currentCategory) {
      setCurrentCategory(newPost.category);
    }
  };

  const handlePostUpdated = (updatedPost: NewsArticle) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handleDeletePost = async (id: string) => {
    try {
      const localRes = await fetch(`/api/news/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (localRes.ok) {
        setPosts(prev => prev.filter(p => p.id !== id));
      } else {
        // Even if local had 404, still update state if deleted
        setPosts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete post', err);
    }
  };

  const handleSongClick = (song: SongEntry) => {
    setSelectedSongDetail(song);
  };

  // Filter posts by category and search
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Category filter
      if (currentCategory !== 'All') {
        if (post.category.toLowerCase() !== currentCategory.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [posts, currentCategory]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 
        Top Header:
        Date, RoBeats News, category filters, Account trigger, Admin trigger,
        and the Post button accessible ONLY to Staff and Admin accounts.
      */}
      <Header
        currentCategory={currentCategory}
        onSelectCategory={setCurrentCategory}
        onOpenAccount={handleOpenAccount}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
        onOpenCreatePost={() => setIsCreatePostModalOpen(true)}
        onOpenStreak={() => setIsStreakModalOpen(true)}
      />

      {/* Main Content Area */}
      {currentCategory === 'Song List' ? (
        <main className="flex-1">
          {user?.role === 'admin' ? (
            <SongList onOpenAccount={handleOpenAccount} />
          ) : (
            <div className="max-w-md mx-auto my-16 p-8 bg-[#111622] border border-amber-500/30 rounded-2xl text-center">
              <h2 className="text-lg font-bold text-white mb-2">Administrator Access Required</h2>
              <p className="text-xs text-zinc-400 mb-5">
                The RoBeats Song List database and editing tools are strictly restricted to Admin accounts.
              </p>
              <button
                onClick={() => setCurrentCategory('All')}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
              >
                Return to News Feed
              </button>
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
          {/* Feed Title & Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-800/80">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {currentCategory === 'All' ? 'RoBeats Feed' : currentCategory}
                </h1>
                {currentCategory === 'Daily mission' && (
                  <CountdownBadge type="daily" />
                )}
                {currentCategory === 'Weekly mission' && (
                  <CountdownBadge type="weekly" />
                )}
                {currentCategory === 'Weekly Leaderboard' && (
                  <CountdownBadge type="leaderboard" />
                )}
              </div>
            </div>

            {/* Post button for Staff and Admin only */}
            {canUserPost && (
              <button
                onClick={() => setIsCreatePostModalOpen(true)}
                className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs shadow-md shadow-emerald-500/20 cursor-pointer shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New Post</span>
              </button>
            )}
          </div>

          {/* Posts List */}
          {isLoadingPosts ? (
            <div className="py-20 flex flex-col items-center justify-center text-zinc-400 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 px-4 bg-[#111622]/60 border border-zinc-800/80 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Music className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No posts found</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  No posts available in {currentCategory === 'All' ? 'the feed' : currentCategory} yet.
                </p>
              </div>

              {canUserPost ? (
                <button
                  onClick={() => setIsCreatePostModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create the first post</span>
                </button>
              ) : (
                <p className="text-[11px] text-zinc-500">
                  Staff and Admins can publish new posts for players.
                </p>
              )}
            </div>
          ) : (
            <div key={currentCategory} className="space-y-4 animate-post-entrance">
              {filteredPosts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  activeCategory={currentCategory}
                  onDelete={handleDeletePost}
                  onEdit={(p) => setEditingPost(p)}
                  onSongClick={handleSongClick}
                  onOpenAccount={handleOpenAccount}
                  onUserClick={(author) => setViewingUserProfile(author)}
                />
              ))}
            </div>
          )}
        </main>
      )}

      {/* Post Creator Modal - ONLY for Staff & Admin */}
      <CreatePostModal
        isOpen={isCreatePostModalOpen}
        onClose={() => setIsCreatePostModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* Account System Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        initialTab={accountModalTab}
        onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
      />

      {/* Admin Panel Modal - Strictly for Admin role */}
      {isAdminPanelOpen && user?.role === 'admin' && (
        <AdminPanel
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          onOpenAccount={handleOpenAccount}
        />
      )}

      {/* Edit Post Modal - Staff & Admin */}
      <EditPostModal
        post={editingPost}
        isOpen={Boolean(editingPost)}
        onClose={() => setEditingPost(null)}
        onPostUpdated={handlePostUpdated}
      />

      {/* Song Details Modal */}
      {selectedSongDetail && (
        <SongDetailsModal
          song={selectedSongDetail}
          onClose={() => setSelectedSongDetail(null)}
        />
      )}

      {/* User Public Profile Modal */}
      {viewingUserProfile && (
        <UserProfileModal
          user={viewingUserProfile}
          isOpen={Boolean(viewingUserProfile)}
          onClose={() => setViewingUserProfile(null)}
          onEditOwnProfile={() => {
            setViewingUserProfile(null);
            handleOpenAccount('profile');
          }}
        />
      )}

      {/* Daily Streak & Avatar Frame Rewards Modal */}
      <StreakModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        onOpenAccount={handleOpenAccount}
      />

      {/* Modern Minimal Dark Footer */}
      <footer className="border-t border-zinc-900 bg-[#0B0E14] py-8 text-zinc-500 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="font-semibold text-zinc-300">
            RoBeats! News
          </div>
          <div>
            © 2026 RoBeats! News
          </div>
        </div>
      </footer>
    </div>
  );
}
