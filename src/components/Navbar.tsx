import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Newspaper, Music, Shield, LogIn, LogOut, User, Flame, Disc, Radio } from 'lucide-react';

export const Navbar: React.FC<{
  activeNav: string;
  setActiveNav: (nav: string) => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onOpenEditor: () => void;
}> = ({ activeNav, setActiveNav, onOpenAdmin, onOpenAuth, onOpenEditor }) => {
  const { user, logout, isStaff, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => setActiveNav('all')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>RoBeats!</span>
              <span className="text-cyan-400 font-semibold">News</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-800/40 font-mono">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block">Daily Missions, Song Charts & Edge Database</p>
          </div>
        </div>

        {/* Navigation Categories */}
        <nav className="hidden md:flex items-center gap-1 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setActiveNav('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeNav === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All News
          </button>
          <button
            onClick={() => setActiveNav('Daily mission')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeNav === 'Daily mission'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Daily Missions
          </button>
          <button
            onClick={() => setActiveNav('Weekly mission')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeNav === 'Weekly mission'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Weekly Missions
          </button>
          <button
            onClick={() => setActiveNav('songs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeNav === 'songs'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5 text-cyan-400" />
            Song Charts
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isStaff && (
            <button
              onClick={onOpenEditor}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs rounded-lg shadow-sm transition"
            >
              + Post News
            </button>
          )}

          {isAdmin && (
            <button
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-semibold rounded-lg transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/40 flex items-center justify-center text-xs font-bold uppercase">
                  {user.username[0]}
                </div>
                <div className="hidden lg:block text-left">
                  <span className="text-xs font-medium text-zinc-200 block leading-none">{user.username}</span>
                  <span className="text-[10px] text-zinc-500 font-mono uppercase">{user.role}</span>
                </div>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium rounded-lg border border-zinc-700 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
