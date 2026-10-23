export type UserRole = 'admin' | 'staff' | 'editor' | 'player' | 'robeatsdev';

export interface UserPermissions {
  canPublishNews: boolean;
  canEditAllNews?: boolean;
  canManageSongs?: boolean;
  canManageUsers: boolean;
  canManageWebhooks?: boolean;
  canManageRanks?: boolean;
  canDeleteContent?: boolean;
  canChangePasswords?: boolean;
  canEditProfiles?: boolean;
  canManageRoles?: boolean;
  canAccessAdminPanel?: boolean;
  [key: string]: any;
}

export interface User {
  id: string;
  username: string;
  displayName?: string;
  robloxUsername?: string;
  email?: string;
  role: UserRole;
  permissions: UserPermissions;
  avatar?: string;
  bio?: string;
  roBeatsRank?: string;
  preferredNoteSpeed?: string;
  createdAt: string;
  currentStreak?: number;
  bestStreak?: number;
  lastCheckInDate?: string;
  unlockedFrames?: string[];
  equippedAvatarFrame?: string;
  [key: string]: any;
}

export interface AvatarFrameReward {
  id: string;
  name: string;
  requiredDays: number;
  description: string;
  cssBorder: string;
  glowColor: string;
  badgeText: string;
  previewGradient: string;
  ringClass: string;
}

export const AVATAR_FRAME_REWARDS: AvatarFrameReward[] = [
  {
    id: 'frame_novice',
    name: 'Cyan Pulse Frame',
    requiredDays: 1,
    description: 'Reward for Day 1 Streak Check-in!',
    cssBorder: 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)] ring-1 ring-cyan-300',
    glowColor: '#22D3EE',
    badgeText: 'Day 1',
    previewGradient: 'from-cyan-500/20 via-blue-500/20 to-teal-500/20',
    ringClass: 'ring-2 ring-cyan-400 shadow-sm shadow-cyan-400/50'
  },
  {
    id: 'frame_electro',
    name: 'Electric Violet Frame',
    requiredDays: 3,
    description: 'Reward for 3-Day streak dedication!',
    cssBorder: 'border-2 border-purple-400 ring-2 ring-fuchsia-400 shadow-[0_0_16px_rgba(168,85,247,0.7)] animate-pulse',
    glowColor: '#A855F7',
    badgeText: 'Day 3',
    previewGradient: 'from-purple-500/25 via-fuchsia-500/20 to-pink-500/20',
    ringClass: 'ring-2 ring-purple-400 shadow-md shadow-purple-500/60'
  },
  {
    id: 'frame_gold',
    name: 'Golden Maestro Frame',
    requiredDays: 7,
    description: 'Prestigious 7-Day streak frame radiating golden notes!',
    cssBorder: 'border-2 border-amber-300 ring-2 ring-yellow-400 shadow-[0_0_18px_rgba(245,158,11,0.8)]',
    glowColor: '#F59E0B',
    badgeText: 'Day 7',
    previewGradient: 'from-amber-500/30 via-yellow-500/25 to-orange-500/20',
    ringClass: 'ring-2 ring-amber-400 shadow-lg shadow-amber-400/60'
  },
  {
    id: 'frame_overdrive',
    name: 'Cyber Overdrive Frame',
    requiredDays: 14,
    description: 'High-tier 14-Day streak holographic matrix cyber frame!',
    cssBorder: 'border-2 border-emerald-400 ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(16,185,129,0.8)]',
    glowColor: '#10B981',
    badgeText: 'Day 14',
    previewGradient: 'from-emerald-500/30 via-teal-500/25 to-cyan-500/20',
    ringClass: 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/60'
  },
  {
    id: 'frame_cosmic',
    name: 'Cosmic Legend Frame',
    requiredDays: 30,
    description: 'Mythical 30-Day streak champion frame glowing with astral power!',
    cssBorder: 'border-2 border-rose-400 ring-2 ring-indigo-400 shadow-[0_0_24px_rgba(244,63,94,0.9)] animate-pulse',
    glowColor: '#F43F5E',
    badgeText: 'Day 30',
    previewGradient: 'from-rose-500/35 via-purple-500/30 to-indigo-500/25',
    ringClass: 'ring-2 ring-rose-400 shadow-xl shadow-rose-500/70'
  }
];

export interface AuthSession {
  user: User;
  token: string;
}

export type RoBeatsRank = 'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner';

export interface RankConfig {
  id: string;
  name: RoBeatsRank;
  iconUrl: string;
  color: string;
  description?: string;
}

export const DEFAULT_ROBEATS_RANKS: RankConfig[] = [
  { id: 'star', name: 'Star', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/star.svg', color: '#F59E0B', description: 'Elite RoBeats master rhythm players' },
  { id: 'pro', name: 'Pro', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/zap.svg', color: '#A855F7', description: 'High tier competitive rhythm champions' },
  { id: 'amateur', name: 'Amateur', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/award.svg', color: '#3B82F6', description: 'Skilled rhythm players clearing advanced charts' },
  { id: 'novice', name: 'Novice', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/activity.svg', color: '#10B981', description: 'Intermediate rhythm players learning higher speeds' },
  { id: 'beginner', name: 'Beginner', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/disc.svg', color: '#64748B', description: 'Starting rhythm players beginning their journey' },
];

export interface ElementConfig {
  name: string;
  color: string;
  hexColor?: string;
  secondaryHexColor?: string;
  imageUrl?: string;
}

export interface DifficultyFramesConfig {
  easy: string;
  normal: string;
  hard: string;
}

export const DEFAULT_DIFFICULTY_FRAMES: DifficultyFramesConfig = {
  easy: '/frames/easy-frame.svg',
  normal: '',
  hard: '/frames/hard-frame.svg',
};

export interface SongDifficulty {
  easy?: string;
  normal?: string;
  hard?: string;
  [key: string]: any;
}

/**
 * Check if a difficulty level is present and valid for a song.
 * Any difficulty marked by admin as '-' or left empty/none means the song does not have this difficulty.
 */
export function hasDifficulty(val: any): boolean {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  return s !== '' && s !== '-' && s !== '0' && s.toLowerCase() !== 'none' && s.toLowerCase() !== 'n/a';
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  mapper?: string;
  coverArt?: string;
  coverArtEasy?: string;
  coverArtNormal?: string;
  coverArtHard?: string;
  difficulty?: SongDifficulty | any;
  element?: string;
  duration?: string;
  bpm?: string;
  dateAdded?: string;
  isCustom?: boolean;
  uniqueKey?: string;
  missionRank?: string;
  chosenDifficulty?: string;
  noMisses?: boolean;
  isNoMisses?: boolean;
  requiredScore?: number | string;
  [key: string]: any;
}

export type SongEntry = Song;

export interface Comment {
  id: string;
  userId?: string;
  authorName?: string;
  authorRole?: string;
  authorAvatar?: string;
  author?: {
    id: string;
    username: string;
    avatar?: string;
    role?: string;
  };
  content: string;
  createdAt: string;
  [key: string]: any;
}

export type PostComment = Comment;

export type NewsCategory = 'All' | 'Daily mission' | 'Weekly mission' | 'New song' | 'Updates' | string;

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  summary?: string;
  category: NewsCategory;
  author: {
    name: string;
    role: string;
    avatar?: string;
    equippedAvatarFrame?: string;
    [key: string]: any;
  };
  publishedAt: string;
  updatedAt?: string;
  readTime?: string;
  coverImage?: string;
  coverImageCaption?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  missionRank?: string;
  status?: 'draft' | 'published' | string;
  tags?: string[];
  views?: number;
  songs?: Song[];
  comments?: Comment[];
  reactions?: Record<string, number>;
  userReactions?: Record<string, string[]>;
  [key: string]: any;
}

export type NewsArticle = Article;

export interface WebhookTemplateConfig {
  titleTemplate?: string;
  bodyTemplate?: string;
  footerTemplate?: string;
}

export interface WebhookCategoryConfig {
  url: string;
  template?: WebhookTemplateConfig;
}

export type DiscordWebhooksConfig = Record<string, string | WebhookCategoryConfig>;

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  modelUsed?: string;
  [key: string]: any;
}

export type ChatRole = 'editor' | 'reporter' | 'copyeditor' | 'breaking';
export type TaskComplexity = 'complex' | 'general' | 'fast';
export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '16:9' | '4:3' | '9:16' | '3:2' | '2:3';
