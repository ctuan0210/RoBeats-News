import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Trophy, 
  Sparkles, 
  Check, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Lock, 
  ShieldCheck,
  RefreshCw,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_FRAME_REWARDS, AvatarFrameReward } from '../types';
import { UserAvatar } from './UserAvatar';

interface StreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccount?: (tab?: 'login' | 'signup') => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  isOpen,
  onClose,
  onOpenAccount,
}) => {
  const { user, token, isAuthenticated, updateProfile } = useAuth();

  // Streak state from user or localStorage
  const [currentStreak, setCurrentStreak] = useState<number>(() => {
    if (user?.currentStreak) return user.currentStreak;
    try {
      return parseInt(localStorage.getItem('robeats_guest_streak') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [bestStreak, setBestStreak] = useState<number>(() => {
    if (user?.bestStreak) return user.bestStreak;
    try {
      return parseInt(localStorage.getItem('robeats_guest_best_streak') || '0', 10);
    } catch {
      return 0;
    }
  });

  const [lastCheckInDate, setLastCheckInDate] = useState<string>(() => {
    if (user?.lastCheckInDate) return user.lastCheckInDate;
    try {
      return localStorage.getItem('robeats_guest_last_checkin') || '';
    } catch {
      return '';
    }
  });

  const [unlockedFrames, setUnlockedFrames] = useState<string[]>(() => {
    if (user?.unlockedFrames && Array.isArray(user.unlockedFrames)) return user.unlockedFrames;
    try {
      const stored = localStorage.getItem('robeats_guest_frames');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [equippedFrame, setEquippedFrame] = useState<string | undefined>(user?.equippedAvatarFrame);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isEquipping, setIsEquipping] = useState<string | null>(null);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<AvatarFrameReward | null>(null);

  // Calculate GMT-8 today string
  const getGmt8Today = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const gmt8Date = new Date(utc - 8 * 3600000);
    const y = gmt8Date.getFullYear();
    const m = String(gmt8Date.getMonth() + 1).padStart(2, '0');
    const d = String(gmt8Date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getGmt8Today();
  const hasCheckedInToday = lastCheckInDate === todayStr;

  // Sync state whenever user changes
  useEffect(() => {
    if (user) {
      if (user.currentStreak !== undefined) setCurrentStreak(user.currentStreak);
      if (user.bestStreak !== undefined) setBestStreak(user.bestStreak);
      if (user.lastCheckInDate !== undefined) setLastCheckInDate(user.lastCheckInDate);
      if (user.unlockedFrames !== undefined) setUnlockedFrames(user.unlockedFrames);
      setEquippedFrame(user.equippedAvatarFrame);
    }
  }, [user]);

  if (!isOpen) return null;

  // Manual Check-in Handler
  const handleCheckIn = async () => {
    if (hasCheckedInToday || isCheckingIn) return;
    setIsCheckingIn(true);
    setCheckInMessage(null);
    setNewlyUnlocked(null);

    try {
      if (isAuthenticated && token) {
        const res = await fetch('/api/streak/check-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setCurrentStreak(data.currentStreak);
          setBestStreak(data.bestStreak);
          setLastCheckInDate(data.lastCheckInDate);
          setUnlockedFrames(data.unlockedFrames || []);
          if (data.equippedAvatarFrame) {
            setEquippedFrame(data.equippedAvatarFrame);
          }
          setCheckInMessage(`🔥 Day ${data.currentStreak} streak claimed! Check-in successful.`);
          
          // Check if milestone frame was unlocked
          if (Array.isArray(data.newlyUnlockedFrames) && data.newlyUnlockedFrames.length > 0) {
            const unlockedId = data.newlyUnlockedFrames[data.newlyUnlockedFrames.length - 1];
            const foundReward = AVATAR_FRAME_REWARDS.find(r => r.id === unlockedId);
            if (foundReward) {
              setNewlyUnlocked(foundReward);
            }
          }

          // Update user context state
          if (data.user) {
            await updateProfile({
              currentStreak: data.currentStreak,
              bestStreak: data.bestStreak,
              lastCheckInDate: data.lastCheckInDate,
              unlockedFrames: data.unlockedFrames,
              equippedAvatarFrame: data.equippedAvatarFrame,
            });
          }
        } else {
          setCheckInMessage(data.message || 'Already checked in today!');
        }
      } else {
        // Guest Local Check-in
        const now = new Date();
        const utc = now.getTime() + now.getTimezoneOffset() * 60000;
        const yesterdayDate = new Date(utc - 8 * 3600000 - 86400000);
        const yStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

        let nextStreak = 1;
        if (lastCheckInDate === yStr) {
          nextStreak = currentStreak + 1;
        }

        const nextBest = Math.max(bestStreak, nextStreak);
        const nextFrames = new Set<string>(unlockedFrames);
        const newlyAdded: string[] = [];

        if (nextStreak >= 1 && !nextFrames.has('frame_novice')) { nextFrames.add('frame_novice'); newlyAdded.push('frame_novice'); }
        if (nextStreak >= 3 && !nextFrames.has('frame_electro')) { nextFrames.add('frame_electro'); newlyAdded.push('frame_electro'); }
        if (nextStreak >= 7 && !nextFrames.has('frame_gold')) { nextFrames.add('frame_gold'); newlyAdded.push('frame_gold'); }
        if (nextStreak >= 14 && !nextFrames.has('frame_overdrive')) { nextFrames.add('frame_overdrive'); newlyAdded.push('frame_overdrive'); }
        if (nextStreak >= 30 && !nextFrames.has('frame_cosmic')) { nextFrames.add('frame_cosmic'); newlyAdded.push('frame_cosmic'); }

        const updatedFramesList = Array.from(nextFrames);
        let nextEquipped = equippedFrame;
        if (!nextEquipped && updatedFramesList.length > 0) {
          nextEquipped = updatedFramesList[0];
        }

        setCurrentStreak(nextStreak);
        setBestStreak(nextBest);
        setLastCheckInDate(todayStr);
        setUnlockedFrames(updatedFramesList);
        setEquippedFrame(nextEquipped);

        localStorage.setItem('robeats_guest_streak', nextStreak.toString());
        localStorage.setItem('robeats_guest_best_streak', nextBest.toString());
        localStorage.setItem('robeats_guest_last_checkin', todayStr);
        localStorage.setItem('robeats_guest_frames', JSON.stringify(updatedFramesList));
        if (nextEquipped) localStorage.setItem('robeats_guest_equipped_frame', nextEquipped);

        setCheckInMessage(`🔥 Day ${nextStreak} streak claimed locally!`);
        if (newlyAdded.length > 0) {
          const reward = AVATAR_FRAME_REWARDS.find(r => r.id === newlyAdded[newlyAdded.length - 1]);
          if (reward) setNewlyUnlocked(reward);
        }
      }
    } catch (err: any) {
      setCheckInMessage(err.message || 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Equip / Unequip Frame Handler
  const handleToggleEquipFrame = async (frameId: string) => {
    const isCurrentlyEquipped = equippedFrame === frameId;
    const targetFrame = isCurrentlyEquipped ? undefined : frameId;
    setIsEquipping(frameId);

    try {
      if (isAuthenticated && token) {
        const res = await fetch('/api/streak/equip-frame', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ frameId: targetFrame || null }),
        });
        const data = await res.json();
        if (data.success) {
          setEquippedFrame(data.equippedAvatarFrame);
          await updateProfile({ equippedAvatarFrame: data.equippedAvatarFrame });
        }
      } else {
        // Guest local storage
        setEquippedFrame(targetFrame);
        if (targetFrame) {
          localStorage.setItem('robeats_guest_equipped_frame', targetFrame);
        } else {
          localStorage.removeItem('robeats_guest_equipped_frame');
        }
      }
    } catch (err) {
      console.error('Failed to equip frame', err);
    } finally {
      setIsEquipping(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-[#0D111A] border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-post-entrance"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-gradient-to-r from-orange-950/40 via-[#111622] to-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-md shadow-orange-500/10">
              <Flame className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">Daily Streak & Rewards</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 uppercase">
                  RoBeats Pass
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Check in daily by manual click to maintain streak and unlock Avatar Frames!
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Main Streak Hero Card */}
          <div className="relative rounded-2xl bg-gradient-to-br from-orange-950/60 via-zinc-900 to-[#121824] border border-orange-500/30 p-5 sm:p-6 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Flame className="w-44 h-44 text-orange-400" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-300 flex items-center justify-center sm:justify-start gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Current Streak Record</span>
                </span>
                <div className="flex items-baseline justify-center sm:justify-start gap-2">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {currentStreak}
                  </span>
                  <span className="text-lg font-bold text-orange-400">
                    {currentStreak === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-zinc-400 pt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Best: <strong>{bestStreak}</strong> days</span>
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-mono text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Reset: GMT-8 Midnight</span>
                  </span>
                </div>
              </div>

              {/* Manual Check-In Button */}
              <div className="shrink-0 flex flex-col items-center">
                {hasCheckedInToday ? (
                  <div className="px-5 py-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center gap-2.5 font-bold text-xs shadow-md shadow-emerald-950">
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                    <span>Checked in today!</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    className="group relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 hover:from-orange-400 hover:to-yellow-400 text-zinc-950 font-black text-sm flex items-center gap-2.5 shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {isCheckingIn ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                    ) : (
                      <Flame className="w-4 h-4 text-zinc-950 fill-zinc-950 group-hover:animate-bounce" />
                    )}
                    <span>Claim Day {currentStreak + 1} Streak</span>
                  </button>
                )}
                <span className="text-[10px] text-zinc-400 mt-1.5 font-medium">
                  {hasCheckedInToday ? 'Come back tomorrow for next day!' : 'Click to register daily check-in'}
                </span>
              </div>
            </div>

            {/* Check-in Message Feedback */}
            {checkInMessage && (
              <div className="mt-4 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>{checkInMessage}</span>
              </div>
            )}
          </div>

          {/* Celebration Banner when newly unlocking a frame */}
          {newlyUnlocked && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-purple-950/80 to-zinc-900 border-2 border-cyan-400/80 shadow-xl shadow-cyan-500/20 flex items-center justify-between gap-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 shrink-0">
                  <Gift className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                    🎉 New Reward Unlocked!
                  </div>
                  <h4 className="text-sm font-bold text-white">{newlyUnlocked.name}</h4>
                  <p className="text-xs text-zinc-300">{newlyUnlocked.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleEquipFrame(newlyUnlocked.id)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shrink-0 cursor-pointer shadow-md shadow-cyan-500/30"
              >
                {equippedFrame === newlyUnlocked.id ? 'Equipped' : 'Equip Now'}
              </button>
            </div>
          )}

          {/* Streak Milestone Track */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Streak Milestone Path</span>
              </h4>
              <span className="text-[11px] text-zinc-500">
                {unlockedFrames.length} of {AVATAR_FRAME_REWARDS.length} Frames Unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {AVATAR_FRAME_REWARDS.map(reward => {
                const isUnlocked = currentStreak >= reward.requiredDays || unlockedFrames.includes(reward.id);
                const isEquipped = equippedFrame === reward.id;

                return (
                  <div 
                    key={reward.id}
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center justify-between gap-2.5 transition-all ${
                      isEquipped
                        ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/50 shadow-md shadow-cyan-500/10'
                        : isUnlocked
                        ? 'bg-zinc-900/80 border-zinc-700/80'
                        : 'bg-zinc-950/60 border-zinc-900 opacity-60'
                    }`}
                  >
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      isUnlocked 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {reward.badgeText}
                    </span>

                    {/* Frame Preview with User Avatar */}
                    <div className="my-1">
                      <UserAvatar
                        src={user?.avatar}
                        frameId={reward.id}
                        size="md"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-white truncate max-w-[90px]">{reward.name}</div>
                      <div className="text-[9px] text-zinc-400 font-mono">
                        {isUnlocked ? 'Unlocked' : `${reward.requiredDays}d required`}
                      </div>
                    </div>

                    {isUnlocked ? (
                      <button
                        type="button"
                        onClick={() => handleToggleEquipFrame(reward.id)}
                        disabled={isEquipping === reward.id}
                        className={`w-full py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          isEquipped
                            ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                        }`}
                      >
                        {isEquipped ? 'Equipped' : 'Equip'}
                      </button>
                    ) : (
                      <div className="w-full py-1 rounded-lg bg-zinc-900 text-zinc-600 text-[10px] font-mono flex items-center justify-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Avatar Frames Wardrobe List */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Avatar Frame Rewards Wardrobe
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Equipped avatar frames display across your posts, comments, profile, and navigation bar!
                </p>
              </div>

              {equippedFrame && (
                <button
                  type="button"
                  onClick={() => handleToggleEquipFrame(equippedFrame)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                >
                  Unequip Frame
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {AVATAR_FRAME_REWARDS.map(reward => {
                const isUnlocked = currentStreak >= reward.requiredDays || unlockedFrames.includes(reward.id);
                const isEquipped = equippedFrame === reward.id;

                return (
                  <div
                    key={reward.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                      isEquipped
                        ? 'bg-cyan-950/30 border-cyan-400/80 shadow-md shadow-cyan-500/10'
                        : isUnlocked
                        ? 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                        : 'bg-zinc-950/40 border-zinc-900/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <UserAvatar
                        src={user?.avatar}
                        frameId={reward.id}
                        size="md"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{reward.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-amber-300 font-mono">
                            {reward.badgeText}
                          </span>
                          {isEquipped && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {reward.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => handleToggleEquipFrame(reward.id)}
                          disabled={isEquipping === reward.id}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isEquipped
                              ? 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400 shadow-sm shadow-cyan-500/20'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Equipped</span>
                            </>
                          ) : (
                            <span>Equip Frame</span>
                          )}
                        </button>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-medium flex items-center gap-1.5 font-mono">
                          <Lock className="w-3 h-3" />
                          <span>Day {reward.requiredDays}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guest account notice */}
          {!isAuthenticated && (
            <div className="p-3.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-zinc-400 text-center sm:text-left">
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Sign in with an account to save streaks and avatar frames across all devices!</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAccount?.('login');
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs shrink-0 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-[#111622] flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">
            RoBeats! Daily Streaks · Claim Every 24h
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
