import React, { useState, useEffect } from 'react';
import { User, Shield, PlusCircle, Clock, Music, Flame } from 'lucide-react';
import { NewsCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  currentCategory: NewsCategory;
  onSelectCategory: (cat: NewsCategory) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onOpenAccount: (tab?: 'login' | 'signup' | 'profile') => void;
  onOpenAdminPanel?: () => void;
  onOpenCreatePost?: () => void;
  onOpenStreak?: () => void;
}

const CATEGORIES: NewsCategory[] = [
  'All',
  'Daily mission',
  'Weekly mission',
  'Weekly Leaderboard',
  'New song',
  'Updates',
];

const getCategoryBorderColor = (cat: NewsCategory, isActive: boolean) => {
  switch (cat) {
    case 'All':
      return isActive
        ? 'bg-sky-500/20 text-sky-200 border-sky-400 shadow-sm shadow-sky-500/20 ring-1 ring-sky-400/50'
        : 'border-sky-500/40 text-sky-300/80 hover:text-sky-200 hover:bg-sky-500/10 hover:border-sky-400';
    case 'Daily mission':
      return isActive
        ? 'bg-purple-500/20 text-purple-200 border-purple-400 shadow-sm shadow-purple-500/20 ring-1 ring-purple-400/50'
        : 'border-purple-500/40 text-purple-300/80 hover:text-purple-200 hover:bg-purple-500/10 hover:border-purple-400';
    case 'Weekly mission':
      return isActive
        ? 'bg-orange-500/20 text-orange-200 border-orange-400 shadow-sm shadow-orange-500/20 ring-1 ring-orange-400/50'
        : 'border-orange-500/40 text-orange-300/80 hover:text-orange-200 hover:bg-orange-500/10 hover:border-orange-400';
    case 'Weekly Leaderboard':
      return isActive
        ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/50'
        : 'border-amber-500/40 text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10 hover:border-amber-400';
    case 'New song':
      return isActive
        ? 'bg-blue-500/20 text-blue-200 border-blue-400 shadow-sm shadow-blue-500/20 ring-1 ring-blue-400/50'
        : 'border-blue-500/40 text-blue-300/80 hover:text-blue-200 hover:bg-blue-500/10 hover:border-blue-400';
    case 'Updates':
      return isActive
        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400 shadow-sm shadow-emerald-500/20 ring-1 ring-emerald-400/50'
        : 'border-emerald-500/40 text-emerald-300/80 hover:text-emerald-200 hover:bg-emerald-500/10 hover:border-emerald-400';
    default:
      return isActive
        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400'
        : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800';
  }
};

export const Header: React.FC<HeaderProps> = ({
  currentCategory,
  onSelectCategory,
  onOpenAccount,
  onOpenAdminPanel,
  onOpenCreatePost,
  onOpenStreak,
}) => {
  const { user, isAuthenticated } = useAuth();

  const weekdayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
  }).format(new Date());

  const monthDayYearFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  // Real-time GMT-8 clock calculation (updates every second)
  const [timeGmt8, setTimeGmt8] = useState<string>(() => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt8Date = new Date(utc - 8 * 3600000);
    return gmt8Date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const gmt8Date = new Date(utc - 8 * 3600000);
      setTimeGmt8(
        gmt8Date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-zinc-800/80 bg-[#0B0E14]/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Top date bar + Account trigger: Guaranteed SAME LINE with Date and Hello "user" on mobile & desktop */}
        <div className="pt-2 sm:pt-2.5 pb-1 flex flex-row items-center justify-between gap-1.5 sm:gap-2 text-xs text-zinc-400 font-mono-numbers w-full flex-nowrap">
          {/* Left: Date + Hello "user" */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs truncate min-w-0">
            <span className="shrink-0 text-zinc-400">
              <span className="hidden sm:inline">{weekdayFormatted}, </span>
              <span>{monthDayYearFormatted}</span>
            </span>
            <span className="text-zinc-600 shrink-0">·</span>
            <span className="font-sans font-medium text-cyan-300 truncate">
              Hello <span className="font-bold text-white">"{user?.displayName || user?.username || 'user'}"</span>!
            </span>
          </div>

          {/* Right: Merged Account button + Staff/Admin actions on same line */}
          <div className="flex items-center gap-1 sm:gap-1.5 font-sans shrink-0">
            {/* Button that ONLY Staff and Admin can use to post */}
            {isAuthenticated && user && (user.role === 'staff' || user.role === 'admin' || user.permissions?.canPublishNews) && (
              <button
                onClick={onOpenCreatePost}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-xs shadow-emerald-500/10 shrink-0"
                title="Create a new post (Staff & Admin only)"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Post</span>
              </button>
            )}

            {/* Song List (Admin) - ONLY visible to Admin role, placed next to Admin Panel */}
            {isAuthenticated && user?.role === 'admin' && (
              <button
                onClick={() => onSelectCategory('Song List')}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold cursor-pointer shadow-xs transition-all border shrink-0 ${
                  currentCategory === 'Song List'
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400 shadow-amber-500/20 ring-1 ring-amber-400/50'
                    : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                }`}
                title="RoBeats Song Database & Chart Editor (Admin only)"
              >
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Song List</span>
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-200 font-mono hidden sm:inline">
                  Admin
                </span>
              </button>
            )}

            {/* Admin Panel button - ONLY visible to Admin role */}
            {isAuthenticated && user?.role === 'admin' && (
              <button
                onClick={onOpenAdminPanel}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] sm:text-xs font-semibold cursor-pointer shadow-xs shadow-indigo-500/10 shrink-0"
                title="Open Administration Panel (Admin Only)"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Admin Panel</span>
              </button>
            )}

            {/* Daily Streak Check-in button */}
            <button
              onClick={onOpenStreak}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs shadow-orange-500/10 shrink-0"
              title="Daily Streak & Avatar Frame Rewards"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
              <span className="font-mono">
                {user?.currentStreak ? `${user.currentStreak}d` : 'Streak'}
              </span>
            </button>

            {/* Merged Account Button: Same line with Date and Hello "user" */}
            {isAuthenticated && user ? (
              <button
                onClick={() => onOpenAccount('profile')}
                className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 text-zinc-200 border border-zinc-800 hover:border-cyan-500/40 text-[11px] sm:text-xs transition-all cursor-pointer group shrink-0"
                title="Account Profile"
              >
                <UserAvatar
                  src={user.avatar}
                  frameId={user.equippedAvatarFrame}
                  size="xs"
                />
                <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate max-w-[80px] sm:max-w-none">
                  {user.displayName || user.username}
                </span>
              </button>
            ) : (
              <button
                onClick={() => onOpenAccount('login')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-[11px] sm:text-xs font-semibold transition-all cursor-pointer shadow-xs shadow-cyan-500/10 shrink-0 active:scale-95"
                title="Account (Log In / Sign Up)"
              >
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Brand Header: RoBeats! News on Left, RoBeats! Time Clock on Right (Guaranteed SAME LINE for mobile web user) */}
        <div className="py-2.5 sm:py-3 flex flex-row items-center justify-between gap-2">
          <h1 
            onClick={() => onSelectCategory('All')}
            className="text-xl sm:text-3xl font-black tracking-tight text-white cursor-pointer text-left inline-block bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            RoBeats! News
          </h1>

          {/* Real-time Clock RoBeats! Time aligned to the Right (Always same line with title) */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 shadow-sm text-xs font-mono-numbers shrink-0">
            <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
            <span className="font-semibold text-zinc-100 text-[11px] sm:text-xs">{timeGmt8}</span>
            <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider font-mono whitespace-nowrap">
              RoBeats! Time
            </span>
          </div>
        </div>

        {/* Categories Bar: Always visible, horizontally scrollable chips */}
        <div className="border-t border-zinc-800/80 py-2.5 flex items-center">
          <nav className="flex items-center gap-1.5 overflow-x-auto w-full py-0.5 scrollbar-none text-xs">
            {CATEGORIES.map(category => {
              const isActive = currentCategory === category;
              const borderStyle = getCategoryBorderColor(category, isActive);

              return (
                <button
                  key={category}
                  onClick={() => onSelectCategory(category)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap cursor-pointer flex items-center gap-1.5 border transition-all ${borderStyle}`}
                >
                  <span>{category}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
