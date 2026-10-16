export type NewsCategory = 
  | 'All'
  | 'Daily mission'
  | 'Weekly mission'
  | 'Weekly Leaderboard'
  | 'New song'
  | 'Updates'
  | 'Song List';

export interface SongDifficulty {
  easy: string;
  normal: string;
  hard: string;
}

export interface SongEntry {
  id: string;
  uniqueKey?: string;
  title: string;
  artist: string;
  mapper?: string;
  coverArt: string;
  coverArtEasy?: string;
  coverArtNormal?: string;
  coverArtHard?: string;
  difficulty: SongDifficulty;
  chosenDifficulty?: 'easy' | 'normal' | 'hard' | 'E' | 'N' | 'H';
  missionRank?: RoBeatsRank;
  noMisses?: boolean;
  isNoMisses?: boolean;
  requiredScore?: string;
  element: string;
  elementIcon?: string;
  duration?: string;
  bpm?: string;
  dateAdded?: string;
  isCustom?: boolean;
}

export type RoBeatsRank = 'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner';

export interface RankConfig {
  id: string;
  name: RoBeatsRank;
  iconUrl: string;
  color: string;
  description?: string;
}

export interface WebhookTemplateConfig {
  titleTemplate?: string;
  bodyTemplate?: string;
  footerTemplate?: string;
}

export interface WebhookCategoryConfig {
  url: string;
  template?: WebhookTemplateConfig;
}

export interface PostComment {
  id: string;
  postId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  userId?: string;
  content: string;
  createdAt: string;
}

export interface ElementConfig {
  name: string;
  color: string;
  hexColor: string;
  secondaryHexColor?: string;
  imageUrl: string;
}

export interface Author {
  name: string;
  role: string;
  avatar?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  summary?: string;
  category: Exclude<NewsCategory, 'All'>;
  author: Author;
  publishedAt: string;
  updatedAt?: string;
  readTime: string;
  coverImage?: string;
  coverImageCaption?: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  status: 'published' | 'draft';
  tags: string[];
  views: number;
  missionRank?: RoBeatsRank;
  songs?: SongEntry[];
  comments?: PostComment[];
}

export type ImageSize = '1K' | '2K' | '4K';
export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

export type ChatRole = 'editor' | 'reporter' | 'copyeditor' | 'breaking';
export type TaskComplexity = 'complex' | 'general' | 'fast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canChangePasswords: boolean;
  canEditProfiles: boolean;
  canManageRoles: boolean;
  canPublishNews: boolean;
  canDeleteContent: boolean;
  canAccessAdminPanel: boolean;
}

export type UserRole = 'player' | 'robeatsdev' | 'staff' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  bio?: string;
  roBeatsRank?: string;
  preferredNoteSpeed?: string;
  role: UserRole;
  permissions?: UserPermissions;
  createdAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
}
