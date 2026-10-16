import React, { useState, useEffect } from 'react';
import { Timer, Clock } from 'lucide-react';

export interface RoBeatsCountdowns {
  daily: {
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  weekly: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    formatted: string;
  };
  timeGmt8: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function calculateCountdowns(): RoBeatsCountdowns {
  // GMT-8 fixed time offset: UTC - 8 hours
  const nowMs = Date.now();
  const gmt8Ms = nowMs - 8 * 3600 * 1000;
  const gmt8Date = new Date(gmt8Ms);

  const hoursPassed = gmt8Date.getUTCHours();
  const minutesPassed = gmt8Date.getUTCMinutes();
  const secondsPassed = gmt8Date.getUTCSeconds();

  // Current RoBeats! Time (GMT-8) clock string
  const clockString = `${pad(hoursPassed)}:${pad(minutesPassed)}:${pad(secondsPassed)}`;

  // 1. Daily countdown: remaining time until tomorrow 00:00:00 GMT-8
  const secondsPassedToday = hoursPassed * 3600 + minutesPassed * 60 + secondsPassed;
  let dailySecondsRemaining = 86400 - secondsPassedToday;
  if (dailySecondsRemaining <= 0) dailySecondsRemaining = 86400;

  const dailyH = Math.floor(dailySecondsRemaining / 3600);
  const dailyM = Math.floor((dailySecondsRemaining % 3600) / 60);
  const dailyS = dailySecondsRemaining % 60;
  const dailyFormatted = `${pad(dailyH)}:${pad(dailyM)}:${pad(dailyS)}`;

  // 2. Weekly countdown: remaining time until next Monday 00:00:00 GMT-8
  const dayOfWeek = gmt8Date.getUTCDay(); // 0 is Sunday, 1 is Monday...
  let daysUntilMonday = (8 - dayOfWeek) % 7;
  if (daysUntilMonday === 0) daysUntilMonday = 7;

  const totalWeeklySeconds = (daysUntilMonday - 1) * 86400 + dailySecondsRemaining;
  const weeklyDays = Math.floor(totalWeeklySeconds / 86400);
  const weeklyHours = Math.floor((totalWeeklySeconds % 86400) / 3600);
  const weeklyMinutes = Math.floor((totalWeeklySeconds % 3600) / 60);
  const weeklySeconds = totalWeeklySeconds % 60;
  const weeklyFormatted = `${weeklyDays}d ${pad(weeklyHours)}h ${pad(weeklyMinutes)}m ${pad(weeklySeconds)}s`;

  return {
    daily: {
      hours: dailyH,
      minutes: dailyM,
      seconds: dailyS,
      formatted: dailyFormatted,
    },
    weekly: {
      days: weeklyDays,
      hours: weeklyHours,
      minutes: weeklyMinutes,
      seconds: weeklySeconds,
      formatted: weeklyFormatted,
    },
    timeGmt8: clockString,
  };
}

export function useRoBeatsCountdowns(): RoBeatsCountdowns {
  const [countdowns, setCountdowns] = useState<RoBeatsCountdowns>(() => calculateCountdowns());

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdowns(calculateCountdowns());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return countdowns;
}

interface CountdownBadgeProps {
  type: 'daily' | 'weekly' | 'leaderboard';
  compact?: boolean;
  className?: string;
}

export const CountdownBadge: React.FC<CountdownBadgeProps> = ({
  type,
  compact = false,
  className = '',
}) => {
  const countdowns = useRoBeatsCountdowns();

  if (type === 'daily') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/35 text-purple-200 text-xs font-mono shadow-xs ${className}`}
        title="Time remaining until next daily mission rotation (RoBeats! Time GMT-8)"
      >
        <Timer className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
        <span className="font-bold tracking-tight">{countdowns.daily.formatted}</span>
        {!compact && (
          <span className="text-[10px] text-purple-300/80 font-sans font-medium uppercase tracking-wider">
            left
          </span>
        )}
      </div>
    );
  }

  if (type === 'weekly') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-500/35 text-orange-200 text-xs font-mono shadow-xs ${className}`}
        title="Time remaining until next weekly mission rotation (RoBeats! Time GMT-8)"
      >
        <Timer className="w-3.5 h-3.5 text-orange-400 animate-pulse shrink-0" />
        <span className="font-bold tracking-tight">{countdowns.weekly.formatted}</span>
        {!compact && (
          <span className="text-[10px] text-orange-300/80 font-sans font-medium uppercase tracking-wider">
            left
          </span>
        )}
      </div>
    );
  }

  // leaderboard
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-200 text-xs font-mono shadow-xs ${className}`}
      title="Time remaining until weekly leaderboard rotation (RoBeats! Time GMT-8)"
    >
      <Timer className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
      <span className="font-bold tracking-tight">{countdowns.weekly.formatted}</span>
      {!compact && (
        <span className="text-[10px] text-amber-300/80 font-sans font-medium uppercase tracking-wider">
          left
        </span>
      )}
    </div>
  );
};
