import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  Shield, 
  Zap, 
  User as UserIcon, 
  Calendar, 
  Clock, 
  Copy, 
  Check, 
  ExternalLink, 
  Edit3,
  Sparkles,
  Gamepad2,
  Flame
} from 'lucide-react';
import { User, RoBeatsRank, RankConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { fetchRanksList } from '../services/fandomService';
import { UserAvatar } from './UserAvatar';

interface UserProfileModalProps {
  user: User | {
    id?: string;
    name?: string;
    username?: string;
    displayName?: string;
    robloxUsername?: string;
    avatar?: string;
    role?: string;
    bio?: string;
    createdAt?: string;
    roBeatsRank?: string;
    [key: string]: any;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onEditOwnProfile?: () => void;
}

export function formatAccountAge(createdAtStr?: string): { relative: string; exactDays: number; formattedDate: string } {
  if (!createdAtStr) return { relative: 'Recently joined', exactDays: 0, formattedDate: 'Unknown' };
  const created = new Date(createdAtStr);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  let relative = '';
  if (diffDays < 1) {
    relative = 'Joined today';
  } else if (diffDays === 1) {
    relative = '1 day old';
  } else if (diffDays < 30) {
    relative = `${diffDays} days old`;
  } else if (diffMonths < 12) {
    const remDays = diffDays % 30;
    relative = `${diffMonths} mo${diffMonths > 1 ? 's' : ''}${remDays > 0 ? ` ${remDays}d` : ''} old`;
  } else {
    const remMonths = diffMonths % 12;
    relative = `${diffYears} yr${diffYears > 1 ? 's' : ''}${remMonths > 0 ? ` ${remMonths} mo` : ''} old`;
  }

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(created);

  return { relative, exactDays: diffDays, formattedDate };
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user: initialUser,
  isOpen,
  onClose,
  onEditOwnProfile,
}) => {
  const { user: currentUser } = useAuth();
  const [profileData, setProfileData] = useState<any>(initialUser);
  const [ranks, setRanks] = useState<RankConfig[]>([]);
  const [copiedRoblox, setCopiedRoblox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRanksList().then(setRanks).catch(() => {});
  }, []);

  // When initialUser changes, fetch full profile from /api/users/:identifier to get bio, robloxUsername, createdAt
  useEffect(() => {
    if (!initialUser || !isOpen) return;

    setProfileData(initialUser);
    const identifier = initialUser.username || initialUser.name || initialUser.displayName || initialUser.id;
    if (!identifier) return;

    // Check if initialUser already has full fields
    if (initialUser.bio && initialUser.robloxUsername && initialUser.createdAt) {
      return;
    }

    setIsLoading(true);
    fetch(`/api/users/${encodeURIComponent(identifier)}`)
      .then(res => {
        if (res.ok) return res.json();
        return null;
      })
      .then(fullUser => {
        if (fullUser) {
          setProfileData((prev: any) => ({
            ...prev,
            ...fullUser,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [initialUser, isOpen]);

  if (!isOpen || !profileData) return null;

  const rawRole = (profileData.role || 'player').toLowerCase();
  const roleName = 
    rawRole === 'admin' ? 'Administrator' :
    rawRole === 'staff' ? 'RoBeats Staff' :
    rawRole === 'robeatsdev' ? 'RoBeats Developer' :
    'Rhythm Player';

  const roleColorClass = 
    rawRole === 'admin' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
    rawRole === 'staff' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
    rawRole === 'robeatsdev' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
    'bg-zinc-800 text-zinc-400 border-zinc-700/60';

  const username = profileData.username || profileData.name?.toLowerCase().replace(/\s+/g, '_') || 'player';
  const displayName = profileData.displayName || profileData.name || username;
  const avatar = profileData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const robloxUsername = profileData.robloxUsername || (username === 'meelo' ? 'Meelo_RBX' : '');
  const bio = profileData.bio || 'This rhythm player has not written a bio yet.';
  const createdAt = profileData.createdAt || '2026-10-02T15:30:00.000Z';
  const { relative: ageRelative, formattedDate: joinDate } = formatAccountAge(createdAt);

  const isSelf = currentUser && (currentUser.id === profileData.id || currentUser.username?.toLowerCase() === username.toLowerCase());

  const handleCopyRoblox = () => {
    if (!robloxUsername) return;
    navigator.clipboard.writeText(robloxUsername);
    setCopiedRoblox(true);
    setTimeout(() => setCopiedRoblox(false), 2000);
  };

  const rankObj = profileData.roBeatsRank ? ranks.find(r => r.name.toLowerCase() === profileData.roBeatsRank.toLowerCase()) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#0D111A] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-post-entrance"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-[#111622]">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">User Profile</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white cursor-pointer transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Hero Banner & Avatar */}
          <div className="relative rounded-2xl bg-gradient-to-br from-cyan-950/40 via-zinc-900 to-zinc-950 p-4 border border-zinc-800 flex flex-col items-center text-center">
            {/* Avatar with Equipped Frame & Role Crown / Badge */}
            <div className="relative mb-3">
              <UserAvatar
                src={avatar}
                alt={displayName}
                frameId={profileData.equippedAvatarFrame}
                size="xl"
              />
              {rawRole === 'admin' && (
                <span className="absolute -bottom-1 -right-1 p-1 bg-amber-500 text-zinc-950 rounded-full shadow-md z-20" title="Administrator">
                  <Crown className="w-3.5 h-3.5" />
                </span>
              )}
              {rawRole === 'staff' && (
                <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-zinc-950 rounded-full shadow-md z-20" title="Staff Member">
                  <Shield className="w-3.5 h-3.5" />
                </span>
              )}
              {rawRole === 'robeatsdev' && (
                <span className="absolute -bottom-1 -right-1 p-1 bg-purple-500 text-zinc-950 rounded-full shadow-md z-20" title="RoBeats Dev">
                  <Zap className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            {/* Display Name & Username */}
            <h3 className="text-lg font-black text-white leading-tight">{displayName}</h3>
            <p className="text-xs text-cyan-400 font-mono mt-0.5">@{username}</p>

            {/* Role, Rank & Streak Badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border ${roleColorClass}`}>
                {roleName}
              </span>

              {profileData.currentStreak && profileData.currentStreak > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-950/80 text-orange-300 border-orange-500/40 flex items-center gap-1 shadow-xs">
                  <Flame className="w-3 h-3 text-orange-400" />
                  <span>{profileData.currentStreak}d Streak</span>
                </span>
              )}

              {rankObj && (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-zinc-900 flex items-center gap-1 shadow-xs"
                  style={{ color: rankObj.color, borderColor: `${rankObj.color}40` }}
                >
                  {rankObj.iconUrl && (
                    <img src={rankObj.iconUrl} alt={rankObj.name} className="w-3 h-3 object-contain shrink-0" />
                  )}
                  <span>{rankObj.name}</span>
                </span>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-3">
            {/* 1. Roblox Username */}
            <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Roblox Username</span>
              </span>

              {robloxUsername ? (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-xs font-mono font-bold text-zinc-100 bg-zinc-900/90 px-2 py-1 rounded-lg border border-zinc-800">
                    {robloxUsername}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyRoblox}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy Roblox Username"
                    >
                      {copiedRoblox ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedRoblox ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={`https://www.roblox.com/search/users?keyword=${encodeURIComponent(robloxUsername)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-cyan-300 transition-colors"
                      title="Search on Roblox"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic pt-0.5">
                  No Roblox account linked yet.
                </p>
              )}
            </div>

            {/* 2. Account Age */}
            <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Account Age</span>
              </span>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <div>
                  <span className="text-xs font-bold text-zinc-100 block">
                    {ageRelative}
                  </span>
                  <span className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                    <Calendar className="w-3 h-3 text-zinc-500" />
                    <span>Joined {joinDate}</span>
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                  Verified Member
                </span>
              </div>
            </div>

            {/* 3. Bio */}
            <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Bio / Motto
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pt-0.5">
                {bio}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-[#111622] flex items-center justify-between">
          {isSelf && onEditOwnProfile ? (
            <button
              onClick={() => {
                onClose();
                onEditOwnProfile();
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit My Profile</span>
            </button>
          ) : (
            <span className="text-[11px] text-zinc-500 font-mono">
              RoBeats Community Member
            </span>
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs cursor-pointer transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
