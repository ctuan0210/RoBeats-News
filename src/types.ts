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
  email?: string;
  role: UserRole;
  permissions: UserPermissions;
  avatar?: string;
  bio?: string;
  roBeatsRank?: string;
  preferredNoteSpeed?: string;
  createdAt: string;
  [key: string]: any;
}

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
