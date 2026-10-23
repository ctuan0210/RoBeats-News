import React from 'react';
import { AVATAR_FRAME_REWARDS } from '../types';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  frameId?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt = 'Avatar',
  frameId,
  className = '',
  size = 'md',
}) => {
  const frame = frameId ? AVATAR_FRAME_REWARDS.find(f => f.id === frameId) : null;

  const sizeClasses = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  // Base styling for avatar image
  const imgClasses = `${sizeClasses} rounded-full object-cover shrink-0`;

  // If no frame is equipped, render default clean avatar
  if (!frame) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <img
          src={src || DEFAULT_AVATAR}
          alt={alt}
          className={`${imgClasses} border border-zinc-700/80`}
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
          }}
        />
      </div>
    );
  }

  // Equipped frame styling
  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {/* Outer Glow Halo */}
      <div 
        className="absolute inset-0 rounded-full blur-[3px] opacity-70 pointer-events-none"
        style={{ backgroundColor: frame.glowColor }}
      />
      
      {/* Avatar Image wrapped with specific Frame styling */}
      <img
        src={src || DEFAULT_AVATAR}
        alt={alt}
        className={`${imgClasses} relative z-10 ${frame.cssBorder}`}
        onError={(e) => {
          (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
        }}
      />
    </div>
  );
};
