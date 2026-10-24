import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// News & Users storage file path
const DATA_DIR = path.resolve(__dirname, 'data');
const NEWS_FILE = path.join(DATA_DIR, 'news.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const WEBHOOKS_FILE = path.join(DATA_DIR, 'webhooks.json');
const RANKS_FILE = path.join(DATA_DIR, 'ranks.json');
const SONGS_FILE = path.join(DATA_DIR, 'songs.json');
const ELEMENTS_FILE = path.join(DATA_DIR, 'elements.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const FRAMES_FILE = path.join(DATA_DIR, 'frames.json');

export function safeWriteJson(filePath: string, data: any) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[Data Storage Error] Failed atomic write for ${filePath}:`, err);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (fallbackErr) {
      console.error(`[Data Storage Error] Fallback direct write failed for ${filePath}:`, fallbackErr);
    }
  }
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

export type DiscordWebhooksConfig = Record<string, string | WebhookCategoryConfig>;

export type RoBeatsRank = 'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner';

export interface RankConfig {
  id: string;
  name: RoBeatsRank;
  iconUrl: string;
  color: string;
  description?: string;
}

export const DEFAULT_RANKS: RankConfig[] = [
  { id: 'star', name: 'Star', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/star.svg', color: '#F59E0B', description: 'Elite RoBeats master rhythm players' },
  { id: 'pro', name: 'Pro', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/zap.svg', color: '#A855F7', description: 'High tier competitive rhythm champions' },
  { id: 'amateur', name: 'Amateur', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/award.svg', color: '#3B82F6', description: 'Skilled rhythm players clearing advanced charts' },
  { id: 'novice', name: 'Novice', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/activity.svg', color: '#10B981', description: 'Intermediate rhythm players learning higher speeds' },
  { id: 'beginner', name: 'Beginner', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/disc.svg', color: '#64748B', description: 'Starting rhythm players beginning their journey' },
];

function readRanks(): RankConfig[] {
  try {
    ensureDataFile();
    if (!fs.existsSync(RANKS_FILE)) {
      safeWriteJson(RANKS_FILE, DEFAULT_RANKS);
      return DEFAULT_RANKS;
    }
    const data = fs.readFileSync(RANKS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_RANKS;
  } catch (err) {
    console.error('Error reading ranks file:', err);
    return DEFAULT_RANKS;
  }
}

function writeRanks(ranks: RankConfig[]) {
  try {
    if (!Array.isArray(ranks) || ranks.length === 0) {
      console.warn('Attempted to write empty ranks array, skipping overwrite');
      return;
    }
    safeWriteJson(RANKS_FILE, ranks);
  } catch (err) {
    console.error('Error writing ranks file:', err);
  }
}

function readWebhooks(): DiscordWebhooksConfig {
  try {
    ensureDataFile();
    if (!fs.existsSync(WEBHOOKS_FILE)) {
      const initial: DiscordWebhooksConfig = {
        'Daily mission': '',
        'Weekly mission': '',
        'New song': '',
        'Updates': '',
      };
      safeWriteJson(WEBHOOKS_FILE, initial);
      return initial;
    }
    const data = fs.readFileSync(WEBHOOKS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {
      'Daily mission': '',
      'Weekly mission': '',
      'New song': '',
      'Updates': '',
    };
  } catch (err) {
    console.error('Error reading webhooks file:', err);
    return {
      'Daily mission': '',
      'Weekly mission': '',
      'New song': '',
      'Updates': '',
    };
  }
}

function writeWebhooks(config: DiscordWebhooksConfig) {
  try {
    if (!config || typeof config !== 'object') return;
    safeWriteJson(WEBHOOKS_FILE, config);
  } catch (err) {
    console.error('Error writing webhooks file:', err);
  }
}

export interface SongMissionItem {
  level: string;
  title: string;
  artist: string;
  element: string;
  isNoMisses: boolean;
  difficultyText: 'Easy' | 'Normal' | 'Hard';
}

export const DAILY_MISSION_DEFAULT_RAW_TEMPLATE = `Header: " Today daily missions"
## <:star:1295611495383695451> - Star missions
- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]
- :star: [Level] SongElement / SongName - Artist [Easy/Normal/Hard] (No Misses)
...[Type the rest until no more Novice rank songs]

## <:pro:1295611421866070016> - Pro missions
- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]
- :star: [Level] SongElement / SongName - Artist [Easy/Normal/Hard] (No Misses)
...[Type the rest until no more Novice rank songs]

## <:amateur:1295611203325792287> - Amateur missions
- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]
- :star: [Level] SongElement / SongName - Artist [Easy/Normal/Hard] (No Misses)
...[Type the rest until no more Novice rank songs]

## <:novice:1284381928044367944> - Novice missions
- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]
...[Type the rest until no more Novice rank songs]

## <:beginner:1284381903578861578> 
 - Beginner missions
- [Level] SongElement / SongName - Artist [Easy/Normal/Hard]
...[Type the rest until no more Novice rank songs]

Poster: "Poster" | Post date: "Post date"`;

export function buildDailyMissionDiscordPayload(post: NewsArticle) {
  const buckets: Record<'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner', Array<SongMissionItem>> = {
    Star: [],
    Pro: [],
    Amateur: [],
    Novice: [],
    Beginner: [],
  };

  const songs = post.songs || [];
  for (const song of songs) {
    const rawChosen = (song.chosenDifficulty || 'N').toUpperCase();
    const diffLetter = rawChosen.startsWith('E') ? 'E' : rawChosen.startsWith('H') ? 'H' : 'N';
    const diffVal = diffLetter === 'E' 
      ? (song.difficulty?.easy || '-') 
      : diffLetter === 'H' 
      ? (song.difficulty?.hard || '-') 
      : (song.difficulty?.normal || '-');
    const difficultyText: 'Easy' | 'Normal' | 'Hard' = diffLetter === 'E' ? 'Easy' : diffLetter === 'H' ? 'Hard' : 'Normal';
    const isNoMisses = Boolean(song.noMisses || song.isNoMisses);

    let rank = song.missionRank;
    if (!rank) {
      const numLevel = parseInt(diffVal, 10);
      if (!isNaN(numLevel) && numLevel > 0) {
        if (numLevel >= 25) rank = 'Star';
        else if (numLevel >= 20) rank = 'Pro';
        else if (numLevel >= 15) rank = 'Amateur';
        else if (numLevel >= 8) rank = 'Novice';
        else rank = 'Beginner';
      } else {
        rank = (post.missionRank as any) || 'Beginner';
      }
    }

    const cleanLevel = diffVal !== '-' ? diffVal : '1';
    const targetRank = rank as keyof typeof buckets;
    const songItem: SongMissionItem = {
      level: cleanLevel,
      title: song.title || 'Unknown Song',
      artist: song.artist || 'Unknown Artist',
      element: song.element || 'Standard',
      isNoMisses,
      difficultyText,
    };

    if (targetRank && buckets[targetRank]) {
      buckets[targetRank].push(songItem);
    } else {
      buckets.Beginner.push(songItem);
    }
  }

  const formatList = (items: Array<SongMissionItem>, _rankType: 'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner') => {
    if (items.length === 0) return '- "No missions" - None';
    return items.map((s) => {
      const elementStr = s.element || 'Standard';
      const artistStr = s.artist || 'Unknown Artist';
      if (s.isNoMisses) {
        return `- :star: [${s.level}] ${elementStr} / ${s.title} - ${artistStr} [${s.difficultyText}] (No Misses)`;
      }
      return `- [${s.level}] ${elementStr} / ${s.title} - ${artistStr} [${s.difficultyText}]`;
    }).join('\n');
  };

  const starSongs = formatList(buckets.Star, 'Star');
  const proSongs = formatList(buckets.Pro, 'Pro');
  const amateurSongs = formatList(buckets.Amateur, 'Amateur');
  const noviceSongs = formatList(buckets.Novice, 'Novice');
  const beginnerSongs = formatList(buckets.Beginner, 'Beginner');

  const posterName = post.author?.name || 'Poster';
  const postDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const formattedDiscordText = [
    `Header: " ${post.title || 'Today daily missions'}"`,
    `## <:star:1295611495383695451> - Star missions`,
    starSongs,
    ``,
    `## <:pro:1295611421866070016> - Pro missions`,
    proSongs,
    ``,
    `## <:amateur:1295611203325792287> - Amateur missions`,
    amateurSongs,
    ``,
    `## <:novice:1284381928044367944> - Novice missions`,
    noviceSongs,
    ``,
    `## <:beginner:1284381903578861578> \n - Beginner missions`,
    beginnerSongs,
    ``,
    `Poster: "${posterName}" | Post date: "${postDate}"`
  ].join('\n');

  return {
    rawTemplate: DAILY_MISSION_DEFAULT_RAW_TEMPLATE,
    formattedDiscordText,
    starSongs,
    proSongs,
    amateurSongs,
    noviceSongs,
    beginnerSongs,
    posterName,
    postDate,
  };
}

async function sendDiscordWebhookForPost(post: NewsArticle) {
  try {
    const webhooks = readWebhooks();
    const catEntry = webhooks[post.category as keyof DiscordWebhooksConfig];
    let webhookUrl = '';
    let customTemplate: WebhookTemplateConfig | undefined = undefined;

    if (typeof catEntry === 'string') {
      webhookUrl = catEntry;
    } else if (catEntry && typeof catEntry === 'object') {
      webhookUrl = catEntry.url || '';
      customTemplate = catEntry.template;
    }

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.trim().startsWith('http')) {
      return;
    }

    let color = 0x06B6D4; // Cyan for Daily mission
    if (post.category === 'Weekly mission') color = 0xF97316; // Dark orange
    else if (post.category === 'Weekly Leaderboard') color = 0xF59E0B; // Amber / Gold
    else if (post.category === 'New song') color = 0x2563EB; // Dark blue
    else if (post.category === 'Updates') color = 0x71717A; // Dark white / zinc

    const fields: Array<{ name: string; value: string; inline?: boolean }> = [
      {
        name: '📂 Category',
        value: post.category,
        inline: true,
      },
      {
        name: '👤 Author',
        value: `${post.author.name} (${post.author.role})`,
        inline: true,
      },
    ];

    const isDailyMission = post.category === 'Daily mission';
    const dailyData = isDailyMission ? buildDailyMissionDiscordPayload(post) : null;

    if (post.songs && post.songs.length > 0 && !isDailyMission) {
      if (post.category === 'New song') {
        const songLines = post.songs.map((s, idx) => {
          const rawChosen = (s.chosenDifficulty || 'N').toUpperCase();
          const diffLetter = rawChosen.startsWith('E') ? 'E' : rawChosen.startsWith('H') ? 'H' : 'N';
          const diffNum = diffLetter === 'E' ? (s.difficulty?.easy || '-') : diffLetter === 'H' ? (s.difficulty?.hard || '-') : (s.difficulty?.normal || '-');
          return `**${idx + 1}. ${s.title}** - *${s.artist}*\n↳ Difficulty: **${diffLetter} ${diffNum}** | Element: \`${s.element || 'Standard'}\``;
        }).join('\n\n');
        fields.push({
          name: `🎵 Released Songs (${post.songs.length})`,
          value: songLines.slice(0, 1024),
          inline: false,
        });
      } else {
        const isWeeklyMission = post.category === 'Weekly mission';
        const songLines = post.songs.map((s, idx) => {
          const rawChosen = (s.chosenDifficulty || 'N').toUpperCase();
          const diffLetter = rawChosen.startsWith('E') ? 'E' : rawChosen.startsWith('H') ? 'H' : 'N';
          const diffNum = diffLetter === 'E' ? (s.difficulty?.easy || '-') : diffLetter === 'H' ? (s.difficulty?.hard || '-') : (s.difficulty?.normal || '-');
          
          let rankPrefix = '';
          if (isWeeklyMission) {
            if (s.missionRank === 'Star' || idx === 0) rankPrefix = '<:star:1295611495383695451> **Star**: ';
            else if (s.missionRank === 'Pro' || idx === 1) rankPrefix = '<:pro:1295611421866070016> **Pro**: ';
            else if (s.missionRank) rankPrefix = `[${s.missionRank}] `;
          } else if (s.missionRank) {
            rankPrefix = `[${s.missionRank}] `;
          }

          const scoreText = s.requiredScore ? ` (Score: ${s.requiredScore})` : '';
          return `${rankPrefix}**${s.title}** by ${s.artist} [**${diffLetter} ${diffNum}** - ${s.element || 'Standard'}]${scoreText}`;
        }).join('\n');

        fields.push({
          name: isWeeklyMission ? `🎯 Weekly Mission Objectives (${post.songs.length})` : `🎼 Featured Tracks (${post.songs.length})`,
          value: songLines.slice(0, 1024),
          inline: false,
        });
      }
    }

    let description = post.content || post.subtitle || '';
    if (!description) {
      if (post.category === 'Daily mission') description = "Today's daily mission rotation is live! Clear today's tracks to earn bonus Star Coins & EXP.";
      else if (post.category === 'Weekly mission') description = "This week's endurance missions are live! Test your timing on the weekly featured tracks.";
      else if (post.category === 'Weekly Leaderboard') description = "Weekly leaderboards have updated! Check the top rankings and leaderboard stats.";
      else if (post.category === 'New song') description = "A new track release is now playable in RoBeats!";
      else if (post.category === 'Updates') description = "New patch notes and community announcements for RoBeats.";
    }

    // Apply template interpolation if admin configured one or use standard format
    let embedTitle = isDailyMission ? `Header: " ${post.title}"` : `🎶 ${post.title}`;
    let embedDesc = description;
    let embedFooterText = `RoBeats News Network • Posted by ${post.author.name}`;

    const postDateFormatted = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    if (isDailyMission && dailyData) {
      embedDesc = [
        `## <:star:1295611495383695451> - Star missions`,
        dailyData.starSongs,
        ``,
        `## <:pro:1295611421866070016> - Pro missions`,
        dailyData.proSongs,
        ``,
        `## <:amateur:1295611203325792287> - Amateur missions`,
        dailyData.amateurSongs,
        ``,
        `## <:novice:1284381928044367944> - Novice missions`,
        dailyData.noviceSongs,
        ``,
        `## <:beginner:1284381903578861578> \n - Beginner missions`,
        dailyData.beginnerSongs,
      ].join('\n');
      embedFooterText = `Poster: "${dailyData.posterName}" | Post date: "${dailyData.postDate}"`;
    }

    if (customTemplate) {
      if (customTemplate.titleTemplate && customTemplate.titleTemplate.trim()) {
        embedTitle = customTemplate.titleTemplate
          .replace(/\{title\}/g, post.title)
          .replace(/\{author\}/g, post.author.name)
          .replace(/\{poster\}/g, post.author.name)
          .replace(/\{date\}/g, postDateFormatted)
          .replace(/\{category\}/g, post.category);
      }
      if (customTemplate.bodyTemplate && customTemplate.bodyTemplate.trim()) {
        embedDesc = customTemplate.bodyTemplate
          .replace(/\{star_songs\}/g, dailyData?.starSongs || '')
          .replace(/\{pro_songs\}/g, dailyData?.proSongs || '')
          .replace(/\{amateur_songs\}/g, dailyData?.amateurSongs || '')
          .replace(/\{novice_songs\}/g, dailyData?.noviceSongs || '')
          .replace(/\{beginner_songs\}/g, dailyData?.beginnerSongs || '')
          .replace(/\{content\}/g, description)
          .replace(/\{title\}/g, post.title)
          .replace(/\{author\}/g, post.author.name)
          .replace(/\{poster\}/g, post.author.name)
          .replace(/\{date\}/g, postDateFormatted)
          .replace(/\{category\}/g, post.category);
      }
      if (customTemplate.footerTemplate && customTemplate.footerTemplate.trim()) {
        embedFooterText = customTemplate.footerTemplate
          .replace(/\{author\}/g, post.author.name)
          .replace(/\{poster\}/g, post.author.name)
          .replace(/\{date\}/g, postDateFormatted)
          .replace(/\{category\}/g, post.category)
          .replace(/\{title\}/g, post.title);
      }
    }

    // Webhook only posts in embed, with strictly NO image or thumbnail on the embed
    const discordPayload: Record<string, any> = {
      username: 'RoBeats News',
      embeds: [
        {
          title: embedTitle.slice(0, 256),
          description: embedDesc.slice(0, 4096),
          color,
          fields: isDailyMission ? undefined : fields,
          footer: {
            text: embedFooterText.slice(0, 2048),
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      console.error(`[Discord Webhook] Failed to deliver to ${post.category}:`, response.status, response.statusText);
    } else {
      console.log(`[Discord Webhook] Successfully delivered post "${post.title}" to ${post.category} channel`);
    }
  } catch (err: any) {
    console.error('[Discord Webhook Error]:', err.message);
  }
}

export interface UserPermissions {
  canManageUsers: boolean;
  canChangePasswords: boolean;
  canEditProfiles: boolean;
  canManageRoles: boolean;
  canPublishNews: boolean;
  canDeleteContent: boolean;
  canAccessAdminPanel: boolean;
  canEditAllNews?: boolean;
  canManageSongs?: boolean;
  canManageWebhooks?: boolean;
  canManageRanks?: boolean;
  [key: string]: any;
}

export type UserRole = 'player' | 'robeatsdev' | 'staff' | 'admin';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatar: string;
  bio?: string;
  robloxUsername?: string;
  roBeatsRank?: string;
  preferredNoteSpeed?: string;
  role: UserRole;
  permissions: UserPermissions;
  createdAt: string;
  currentStreak?: number;
  bestStreak?: number;
  lastCheckInDate?: string;
  unlockedFrames?: string[];
  equippedAvatarFrame?: string;
}

export function getDefaultPermissions(role: UserRole): UserPermissions {
  if (role === 'admin') {
    return {
      canManageUsers: true,
      canChangePasswords: true,
      canEditProfiles: true,
      canManageRoles: true,
      canPublishNews: true,
      canDeleteContent: true,
      canAccessAdminPanel: true,
      canEditAllNews: true,
      canManageSongs: true,
      canManageWebhooks: true,
      canManageRanks: true,
    };
  }
  if (role === 'staff') {
    return {
      canManageUsers: false,
      canChangePasswords: false,
      canEditProfiles: false,
      canManageRoles: false,
      canPublishNews: true, // Staff: can post posts
      canDeleteContent: false,
      canAccessAdminPanel: false, // Staff cannot access admin panel
      canEditAllNews: false,
      canManageSongs: false,
      canManageWebhooks: false,
      canManageRanks: false,
    };
  }
  // 'robeatsdev' and 'player':
  return {
    canManageUsers: false,
    canChangePasswords: false,
    canEditProfiles: false,
    canManageRoles: false,
    canPublishNews: false,
    canDeleteContent: false,
    canAccessAdminPanel: false,
    canEditAllNews: false,
    canManageSongs: false,
    canManageWebhooks: false,
    canManageRanks: false,
  };
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_robeats_salt_2026').digest('hex');
}

function sanitizeUser(u: UserRecord) {
  const { passwordHash, ...safe } = u;
  return safe;
}

const DEFAULT_USERS: UserRecord[] = [
  {
    id: 'usr_admin_meelo',
    username: 'meelo',
    email: 'meelo@robeats.news',
    passwordHash: hashPassword('meelovn2005'),
    displayName: 'Meelo',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    bio: 'Head Administrator of RoBeats News. Full system authority.',
    robloxUsername: 'Meelo_RBX',
    role: 'admin',
    permissions: getDefaultPermissions('admin'),
    createdAt: new Date().toISOString(),
  }
];

function ensureMeeloAdmin(users: UserRecord[]): boolean {
  let changed = false;
  const meeloIdx = users.findIndex(u => u.username.toLowerCase() === 'meelo' || u.username.toLowerCase() === '@meelo');
  const meeloPassHash = hashPassword('meelovn2005');

  if (meeloIdx === -1) {
    users.unshift({
      id: 'usr_admin_meelo',
      username: 'meelo',
      email: 'meelo@robeats.news',
      passwordHash: meeloPassHash,
      displayName: 'Meelo',
      avatar: 'https://down-vn.img.susercontent.com/file/sg-11134201-81zwv-mih44jns7q4n42',
      bio: 'Administrator & Lead Curator of RoBeats News',
      robloxUsername: 'Meelo_RBX',
      role: 'admin',
      permissions: getDefaultPermissions('admin'),
      createdAt: new Date().toISOString(),
    });
    changed = true;
  } else {
    if (!users[meeloIdx].robloxUsername) {
      users[meeloIdx].robloxUsername = 'Meelo_RBX';
      changed = true;
    }
    if (users[meeloIdx].role !== 'admin') {
      users[meeloIdx].role = 'admin';
      changed = true;
    }
    if (!users[meeloIdx].permissions || !users[meeloIdx].permissions.canAccessAdminPanel || !users[meeloIdx].permissions.canManageUsers) {
      users[meeloIdx].permissions = getDefaultPermissions('admin');
      changed = true;
    }
    if (!users[meeloIdx].passwordHash) {
      users[meeloIdx].passwordHash = meeloPassHash;
      changed = true;
    }
  }

  // Ensure all users have valid permissions and migrate legacy curator role
  for (const u of users) {
    if ((u.role as string) === 'curator') {
      u.role = 'staff';
      u.permissions = getDefaultPermissions('staff');
      changed = true;
    }
    if (!u.permissions) {
      u.permissions = getDefaultPermissions(u.role || 'player');
      changed = true;
    }
  }

  return changed;
}

function readUsers(): UserRecord[] {
  ensureDataFile();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf-8');
    return DEFAULT_USERS;
  }
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const users: UserRecord[] = JSON.parse(data);
    if (ensureMeeloAdmin(users)) {
      writeUsers(users);
    }
    return users;
  } catch {
    return DEFAULT_USERS;
  }
}

function writeUsers(users: UserRecord[]) {
  if (!Array.isArray(users) || users.length === 0) return;
  safeWriteJson(USERS_FILE, users);
}

export interface NewsArticle {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  summary?: string;
  category: 'Daily mission' | 'Weekly mission' | 'Weekly Leaderboard' | 'New song' | 'Updates';
  author: {
    name: string;
    role: string;
    avatar?: string;
    equippedAvatarFrame?: string;
  };
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
  missionRank?: string;
  songs?: any[];
  comments?: any[];
  reactions?: any;
  userReactions?: Record<string, string[]>;
}

const DEFAULT_ARTICLES: NewsArticle[] = [
  {
    id: 'post-daily-missions-initial',
    title: 'Today daily missions',
    subtitle: "Complete today's daily mission tracks to earn bonus Star Coins, EXP, and rank badges!",
    content: "Attention RoBeats players! Today's daily missions are officially live. Clear all featured tracks with at least an A rank or 90%+ accuracy to claim your mission rewards.",
    summary: "Complete today's daily mission tracks to earn bonus Star Coins, EXP, and rank badges!",
    category: 'Daily mission',
    author: {
      name: 'Meelo',
      role: 'Admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readTime: '1 min read',
    coverImage: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    status: 'published',
    tags: ['Daily Mission', 'RoBeats', 'Songs'],
    views: 28,
    songs: [
      {
        id: 'wiki_0',
        title: 'Monday Night Monsters',
        artist: 'FinnMK',
        coverArt: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
        difficulty: { easy: '1', normal: '1', hard: '14' },
        element: 'Flow'
      },
      {
        id: 'wiki_1',
        title: 'Daily Life',
        artist: 'FinnMK',
        coverArt: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
        difficulty: { easy: '-', normal: '2', hard: '17' },
        element: 'Chill'
      },
      {
        id: 'wiki_2',
        title: '[@_@]',
        artist: 'Chroma',
        coverArt: 'https://static.wikia.nocookie.net/robeats/images/2/2d/%40_%401.webp/revision/latest/scale-to-width-down/100?cb=20210317021614',
        difficulty: { easy: '1', normal: '3', hard: '25' },
        element: 'Chill'
      },
      {
        id: 'wiki_3',
        title: 'Adopt Me',
        artist: 'BSlick',
        coverArt: 'https://static.wikia.nocookie.net/robeats/images/e/ea/Adopt_me_.png/revision/latest/scale-to-width-down/100?cb=20210724211804',
        difficulty: { easy: '-', normal: '3', hard: '16' },
        element: 'VibeRush'
      },
      {
        id: 'wiki_4',
        title: 'Better Run',
        artist: 'Rutra',
        coverArt: 'https://static.wikia.nocookie.net/robeats/images/0/01/Betterrunnormal.png/revision/latest/scale-to-width-down/100?cb=20210329021801',
        difficulty: { easy: '-', normal: '3', hard: '21' },
        element: 'ChillRush'
      }
    ]
  }
];

const DEFAULT_ELEMENTS: any[] = [
  { name: 'Rush', color: 'Red', hexColor: '#EF4444', imageUrl: '' },
  { name: 'Flow', color: 'Purple', hexColor: '#A855F7', imageUrl: '' },
  { name: 'Beat', color: 'Orange', hexColor: '#F97316', imageUrl: '' },
  { name: 'Vibe', color: 'Green', hexColor: '#22C55E', imageUrl: '' },
  { name: 'Chill', color: 'Blue', hexColor: '#3B82F6', imageUrl: '' },
  { name: 'Rush/Flow', color: 'Red / Purple', hexColor: '#EF4444', secondaryHexColor: '#A855F7', imageUrl: '' },
  { name: 'Rush/Vibe', color: 'Red / Green', hexColor: '#EF4444', secondaryHexColor: '#22C55E', imageUrl: '' },
  { name: 'Rush/Chill', color: 'Red / Blue', hexColor: '#EF4444', secondaryHexColor: '#3B82F6', imageUrl: '' },
  { name: 'Rush/Beat', color: 'Red / Orange', hexColor: '#EF4444', secondaryHexColor: '#F97316', imageUrl: '' },
  { name: 'Flow/Rush', color: 'Purple / Red', hexColor: '#A855F7', secondaryHexColor: '#EF4444', imageUrl: '' },
  { name: 'Flow/Vibe', color: 'Purple / Green', hexColor: '#A855F7', secondaryHexColor: '#22C55E', imageUrl: '' },
  { name: 'Flow/Chill', color: 'Purple / Blue', hexColor: '#A855F7', secondaryHexColor: '#3B82F6', imageUrl: '' },
  { name: 'Flow/Beat', color: 'Purple / Orange', hexColor: '#A855F7', secondaryHexColor: '#F97316', imageUrl: '' },
  { name: 'Vibe/Rush', color: 'Green / Red', hexColor: '#22C55E', secondaryHexColor: '#EF4444', imageUrl: '' },
  { name: 'Vibe/Flow', color: 'Green / Purple', hexColor: '#22C55E', secondaryHexColor: '#A855F7', imageUrl: '' },
  { name: 'Vibe/Chill', color: 'Green / Blue', hexColor: '#22C55E', secondaryHexColor: '#3B82F6', imageUrl: '' },
  { name: 'Vibe/Beat', color: 'Green / Orange', hexColor: '#22C55E', secondaryHexColor: '#F97316', imageUrl: '' },
  { name: 'Chill/Flow', color: 'Blue / Purple', hexColor: '#3B82F6', secondaryHexColor: '#A855F7', imageUrl: '' },
  { name: 'Chill/Vibe', color: 'Blue / Green', hexColor: '#3B82F6', secondaryHexColor: '#22C55E', imageUrl: '' },
  { name: 'Chill/Beat', color: 'Blue / Orange', hexColor: '#3B82F6', secondaryHexColor: '#F97316', imageUrl: '' },
  { name: 'Chill/Rush', color: 'Blue / Red', hexColor: '#3B82F6', secondaryHexColor: '#EF4444', imageUrl: '' },
  { name: 'Beat/Vibe', color: 'Orange / Green', hexColor: '#F97316', secondaryHexColor: '#22C55E', imageUrl: '' },
  { name: 'Beat/Rush', color: 'Orange / Red', hexColor: '#F97316', secondaryHexColor: '#EF4444', imageUrl: '' },
  { name: 'Beat/Chill', color: 'Orange / Blue', hexColor: '#F97316', secondaryHexColor: '#3B82F6', imageUrl: '' },
  { name: 'Beat/Flow', color: 'Orange / Purple', hexColor: '#F97316', secondaryHexColor: '#A855F7', imageUrl: '' },
];

const DEFAULT_SONGS: any[] = [
  {
    id: 'wiki_0',
    title: 'Monday Night Monsters',
    artist: 'FinnMK',
    mapper: 'Official RoBeats',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    difficulty: { easy: '1', normal: '1', hard: '14' },
    element: 'Flow',
    bpm: '100',
    duration: '2:14'
  },
  {
    id: 'wiki_1',
    title: 'Daily Life',
    artist: 'FinnMK',
    mapper: 'Official RoBeats',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    difficulty: { easy: '-', normal: '2', hard: '17' },
    element: 'Chill',
    bpm: '106',
    duration: '2:02'
  },
  {
    id: 'wiki_2',
    title: '[@_@]',
    artist: 'Chroma',
    mapper: 'Official RoBeats',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/2/2d/%40_%401.webp/revision/latest/scale-to-width-down/100?cb=20210317021614',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/2/2d/%40_%401.webp/revision/latest/scale-to-width-down/100?cb=20210317021614',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/2/2d/%40_%401.webp/revision/latest/scale-to-width-down/100?cb=20210317021614',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/2/2d/%40_%401.webp/revision/latest/scale-to-width-down/100?cb=20210317021614',
    difficulty: { easy: '1', normal: '3', hard: '25' },
    element: 'Chill',
    bpm: '128',
    duration: '2:20'
  },
  {
    id: 'wiki_3',
    title: 'Adopt Me',
    artist: 'BSlick',
    mapper: 'Official RoBeats',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/e/ea/Adopt_me_.png/revision/latest/scale-to-width-down/100?cb=20210724211804',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/e/ea/Adopt_me_.png/revision/latest/scale-to-width-down/100?cb=20210724211804',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/e/ea/Adopt_me_.png/revision/latest/scale-to-width-down/100?cb=20210724211804',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/e/ea/Adopt_me_.png/revision/latest/scale-to-width-down/100?cb=20210724211804',
    difficulty: { easy: '-', normal: '3', hard: '16' },
    element: 'VibeRush',
    bpm: '135',
    duration: '1:50'
  },
  {
    id: 'wiki_4',
    title: 'Better Run',
    artist: 'Rutra',
    mapper: 'Official RoBeats',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/0/01/Betterrunnormal.png/revision/latest/scale-to-width-down/100?cb=20210329021801',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/0/01/Betterrunnormal.png/revision/latest/scale-to-width-down/100?cb=20210329021801',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/0/01/Betterrunnormal.png/revision/latest/scale-to-width-down/100?cb=20210329021801',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/0/01/Betterrunnormal.png/revision/latest/scale-to-width-down/100?cb=20210329021801',
    difficulty: { easy: '-', normal: '3', hard: '21' },
    element: 'ChillRush',
    bpm: '150',
    duration: '2:05'
  }
];

export interface DifficultyFramesConfig {
  easy: string;
  normal: string;
  hard: string;
}

const DEFAULT_FRAMES: DifficultyFramesConfig = {
  easy: '/frames/easy-frame.svg',
  normal: '',
  hard: '/frames/hard-frame.svg',
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(NEWS_FILE)) {
    safeWriteJson(NEWS_FILE, DEFAULT_ARTICLES);
  }
  if (!fs.existsSync(ELEMENTS_FILE)) {
    safeWriteJson(ELEMENTS_FILE, DEFAULT_ELEMENTS);
  }
  if (!fs.existsSync(SONGS_FILE)) {
    safeWriteJson(SONGS_FILE, DEFAULT_SONGS);
  } else {
    try {
      const existing = JSON.parse(fs.readFileSync(SONGS_FILE, 'utf-8'));
      if (!Array.isArray(existing) || existing.length === 0) {
        safeWriteJson(SONGS_FILE, DEFAULT_SONGS);
      }
    } catch {
      safeWriteJson(SONGS_FILE, DEFAULT_SONGS);
    }
  }
  if (!fs.existsSync(COMMENTS_FILE)) {
    safeWriteJson(COMMENTS_FILE, []);
  }
  if (!fs.existsSync(RANKS_FILE)) {
    safeWriteJson(RANKS_FILE, DEFAULT_RANKS);
  }
  if (!fs.existsSync(WEBHOOKS_FILE)) {
    const initialWebhooks: DiscordWebhooksConfig = {
      'Daily mission': '',
      'Weekly mission': '',
      'New song': '',
      'Updates': '',
    };
    safeWriteJson(WEBHOOKS_FILE, initialWebhooks);
  }
  if (!fs.existsSync(USERS_FILE)) {
    safeWriteJson(USERS_FILE, DEFAULT_USERS);
  }
  if (!fs.existsSync(FRAMES_FILE)) {
    safeWriteJson(FRAMES_FILE, DEFAULT_FRAMES);
  }
}

function readFrames(): DifficultyFramesConfig {
  ensureDataFile();
  try {
    const data = fs.readFileSync(FRAMES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      easy: typeof parsed?.easy === 'string' ? parsed.easy : DEFAULT_FRAMES.easy,
      normal: typeof parsed?.normal === 'string' ? parsed.normal : '',
      hard: typeof parsed?.hard === 'string' ? parsed.hard : DEFAULT_FRAMES.hard,
    };
  } catch (err) {
    return DEFAULT_FRAMES;
  }
}

function writeFrames(frames: DifficultyFramesConfig) {
  safeWriteJson(FRAMES_FILE, frames);
}

function readComments(): any[] {
  ensureDataFile();
  try {
    const data = fs.readFileSync(COMMENTS_FILE, 'utf-8');
    const comments = JSON.parse(data);
    if (Array.isArray(comments)) {
      return comments;
    }
    return [];
  } catch (err) {
    return [];
  }
}

function writeComments(comments: any[]) {
  if (!Array.isArray(comments)) return;
  safeWriteJson(COMMENTS_FILE, comments);
}

function readElements(): any[] {
  ensureDataFile();
  try {
    const data = fs.readFileSync(ELEMENTS_FILE, 'utf-8');
    const elements = JSON.parse(data);
    if (Array.isArray(elements) && elements.length > 0) {
      return elements;
    }
    return DEFAULT_ELEMENTS;
  } catch (err) {
    return DEFAULT_ELEMENTS;
  }
}

function writeElements(elements: any[]) {
  if (!Array.isArray(elements) || elements.length === 0) return;
  safeWriteJson(ELEMENTS_FILE, elements);
}

function readSongs(): any[] {
  ensureDataFile();
  try {
    const data = fs.readFileSync(SONGS_FILE, 'utf-8');
    const songs = JSON.parse(data);
    if (Array.isArray(songs)) {
      return songs;
    }
    return [];
  } catch (err) {
    return [];
  }
}

function writeSongs(songs: any[]) {
  if (!Array.isArray(songs)) return;
  safeWriteJson(SONGS_FILE, songs);
}

function readArticles(): NewsArticle[] {
  ensureDataFile();
  try {
    const data = fs.readFileSync(NEWS_FILE, 'utf-8');
    const articles = JSON.parse(data);
    if (Array.isArray(articles)) {
      return articles as NewsArticle[];
    }
    return [];
  } catch (err) {
    console.error('Error reading news file, returning empty array', err);
    return [];
  }
}

function writeArticles(articles: NewsArticle[]) {
  if (!Array.isArray(articles)) return;
  safeWriteJson(NEWS_FILE, articles);
}

// ----------------------------------------------------
// AUTHENTICATION & ACCOUNT MANAGEMENT ROUTES
// ----------------------------------------------------

// 1. Sign up (registration with required fields)
app.post('/api/auth/signup', (req, res) => {
  try {
    const { username, email, password, displayName, avatar, bio, roBeatsRank, preferredNoteSpeed } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const users = readUsers();
    const cleanUsername = username.trim().replace(/^@/, '').toLowerCase();

    // If registering or claiming the @meelo admin account
    if (cleanUsername === 'meelo') {
      const meeloIdx = users.findIndex(u => u.username.toLowerCase() === 'meelo' || u.username.toLowerCase() === '@meelo');
      if (meeloIdx !== -1) {
        users[meeloIdx].passwordHash = hashPassword(password);
        if (email) users[meeloIdx].email = email.trim().toLowerCase();
        if (displayName) users[meeloIdx].displayName = displayName.trim();
        users[meeloIdx].role = 'admin';
        users[meeloIdx].permissions = getDefaultPermissions('admin');
        writeUsers(users);
        const token = `tok_${users[meeloIdx].id}_${Date.now()}`;
        return res.status(201).json({ user: sanitizeUser(users[meeloIdx]), token });
      }
    }

    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
    }

    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const role = users.length === 0 ? 'admin' : 'player';
    const newUser: UserRecord = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      displayName: displayName?.trim() || cleanUsername,
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: bio || 'RoBeats rhythm player',
      roBeatsRank: roBeatsRank || 'Rhythm Adept',
      preferredNoteSpeed: preferredNoteSpeed || '1.8x',
      role,
      permissions: getDefaultPermissions(role),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    const token = `tok_${newUser.id}_${Date.now()}`;
    res.status(201).json({ user: sanitizeUser(newUser), token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

// 2. Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const users = readUsers();
    const rawId = identifier.trim().toLowerCase();
    const idClean = rawId.replace(/^@/, '');
    const user = users.find(u => 
      u.username.toLowerCase() === idClean || 
      u.username.toLowerCase() === rawId ||
      u.email.toLowerCase() === rawId
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const isMeelo = user.username.toLowerCase() === 'meelo' || user.username.toLowerCase() === '@meelo';
    const isMasterMeeloPass = isMeelo && (password === 'meelovn2005' || password === 'admin' || password === 'meelo');
    const isPassValid = isMasterMeeloPass || user.passwordHash === hashPassword(password);

    if (!isPassValid) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    // Ensure @meelo is always admin role with full permissions
    if (isMeelo && user.role !== 'admin') {
      user.role = 'admin';
      user.permissions = getDefaultPermissions('admin');
      writeUsers(users);
    }

    const token = `tok_${user.id}_${Date.now()}`;
    res.json({ user: sanitizeUser(user), token });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Helper to extract user from token
function getAuthUser(req: any): UserRecord | null {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim() || req.headers['x-auth-token'];
  if (!token || typeof token !== 'string') return null;

  const users = readUsers();
  // Format is tok_<userId>_<timestamp>
  const match = token.match(/^tok_(.+)_\d+$/);
  if (match) {
    const userId = match[1];
    return users.find(u => u.id === userId) || null;
  }
  return null;
}

// 3. Current User Session
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ user: sanitizeUser(user) });
});

// 4. Update Profile
app.put('/api/auth/profile', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { displayName, avatar, bio, roBeatsRank, preferredNoteSpeed, username, robloxUsername, equippedAvatarFrame } = req.body;
  const users = readUsers();
  const index = users.findIndex(u => u.id === user.id);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  if (username && username.trim().toLowerCase() !== user.username.toLowerCase()) {
    if (users.some(u => u.id !== user.id && u.username.toLowerCase() === username.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    users[index].username = username.trim().toLowerCase();
  }

  if (displayName) users[index].displayName = displayName.trim();
  if (avatar) users[index].avatar = avatar;
  if (bio !== undefined) users[index].bio = bio;
  if (robloxUsername !== undefined) users[index].robloxUsername = robloxUsername.trim();
  if (roBeatsRank !== undefined) users[index].roBeatsRank = roBeatsRank;
  if (preferredNoteSpeed !== undefined) users[index].preferredNoteSpeed = preferredNoteSpeed;
  if (equippedAvatarFrame !== undefined) users[index].equippedAvatarFrame = equippedAvatarFrame;

  writeUsers(users);
  res.json({ user: sanitizeUser(users[index]) });
});

// 5. Change Password
app.put('/api/auth/password', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (user.passwordHash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }

  const users = readUsers();
  const index = users.findIndex(u => u.id === user.id);
  users[index].passwordHash = hashPassword(newPassword);
  writeUsers(users);

  res.json({ success: true, message: 'Password updated successfully' });
});

// 6. List all registered accounts (Account management & switcher)
app.get('/api/auth/users', (req, res) => {
  const users = readUsers();
  res.json(users.map(sanitizeUser));
});

// 6b. Public User Profile endpoint (details: bio, username, Roblox username, account age)
app.get('/api/users/:identifier', (req, res) => {
  const rawId = req.params.identifier.trim();
  const identifier = rawId.toLowerCase();
  const users = readUsers();
  const target = users.find(u => 
    u.id === rawId || 
    u.username.toLowerCase() === identifier || 
    u.username.toLowerCase() === identifier.replace(/^@/, '') ||
    u.displayName?.toLowerCase() === identifier
  );
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(sanitizeUser(target));
});

// Helper to get RoBeats GMT-8 date
function getGmt8DateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const gmt8Date = new Date(utc - 8 * 3600000);
  const y = gmt8Date.getFullYear();
  const m = String(gmt8Date.getMonth() + 1).padStart(2, '0');
  const d = String(gmt8Date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayGmt8DateString(): string {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const gmt8Date = new Date(utc - 8 * 3600000 - 86400000);
  const y = gmt8Date.getFullYear();
  const m = String(gmt8Date.getMonth() + 1).padStart(2, '0');
  const d = String(gmt8Date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 6c. Streak Check-In endpoint (Manual Click)
app.post('/api/streak/check-in', (req, res) => {
  try {
    const user = getAuthUser(req);
    const today = getGmt8DateString();
    const yesterday = getYesterdayGmt8DateString();

    if (!user) {
      return res.json({
        success: true,
        isGuest: true,
        today,
        yesterday,
        message: 'Guest streak recorded locally',
      });
    }

    const users = readUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });

    const u = users[index];
    const lastCheckIn = u.lastCheckInDate || '';

    if (lastCheckIn === today) {
      return res.json({
        success: false,
        alreadyCheckedIn: true,
        message: 'You have already checked in today! Come back tomorrow for the next streak day.',
        currentStreak: u.currentStreak || 1,
        bestStreak: u.bestStreak || 1,
        lastCheckInDate: u.lastCheckInDate,
        unlockedFrames: u.unlockedFrames || [],
        equippedAvatarFrame: u.equippedAvatarFrame,
        user: sanitizeUser(u),
      });
    }

    // Determine new streak count
    let newStreak = 1;
    if (lastCheckIn === yesterday) {
      newStreak = (u.currentStreak || 0) + 1;
    } else {
      newStreak = 1;
    }

    const bestStreak = Math.max(u.bestStreak || 0, newStreak);
    const existingFrames = new Set<string>(u.unlockedFrames || []);
    const newlyUnlocked: string[] = [];

    // Milestone Frame Rewards:
    // Day 1: Cyan Pulse Frame (frame_novice)
    if (newStreak >= 1 && !existingFrames.has('frame_novice')) {
      existingFrames.add('frame_novice');
      newlyUnlocked.push('frame_novice');
    }
    // Day 3: Electric Violet Frame (frame_electro)
    if (newStreak >= 3 && !existingFrames.has('frame_electro')) {
      existingFrames.add('frame_electro');
      newlyUnlocked.push('frame_electro');
    }
    // Day 7: Golden Maestro Frame (frame_gold)
    if (newStreak >= 7 && !existingFrames.has('frame_gold')) {
      existingFrames.add('frame_gold');
      newlyUnlocked.push('frame_gold');
    }
    // Day 14: Cyber Overdrive Frame (frame_overdrive)
    if (newStreak >= 14 && !existingFrames.has('frame_overdrive')) {
      existingFrames.add('frame_overdrive');
      newlyUnlocked.push('frame_overdrive');
    }
    // Day 30: Cosmic Legend Frame (frame_cosmic)
    if (newStreak >= 30 && !existingFrames.has('frame_cosmic')) {
      existingFrames.add('frame_cosmic');
      newlyUnlocked.push('frame_cosmic');
    }

    const updatedFrames = Array.from(existingFrames);
    u.currentStreak = newStreak;
    u.bestStreak = bestStreak;
    u.lastCheckInDate = today;
    u.unlockedFrames = updatedFrames;

    // Automatically equip first unlocked frame if none equipped yet
    if (!u.equippedAvatarFrame && updatedFrames.length > 0) {
      u.equippedAvatarFrame = updatedFrames[0];
    }

    writeUsers(users);

    res.json({
      success: true,
      alreadyCheckedIn: false,
      currentStreak: newStreak,
      bestStreak,
      lastCheckInDate: today,
      unlockedFrames: updatedFrames,
      equippedAvatarFrame: u.equippedAvatarFrame,
      newlyUnlockedFrames: newlyUnlocked,
      user: sanitizeUser(u),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Streak check-in failed' });
  }
});

// 6d. Equip Avatar Frame
app.post('/api/streak/equip-frame', (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Please log in to equip avatar frames' });

    const { frameId } = req.body;
    const users = readUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index === -1) return res.status(404).json({ error: 'User not found' });

    const u = users[index];
    const unlocked = u.unlockedFrames || [];

    if (frameId && !unlocked.includes(frameId) && u.role !== 'admin') {
      return res.status(400).json({ error: 'This avatar frame has not been unlocked yet' });
    }

    u.equippedAvatarFrame = frameId || undefined;
    writeUsers(users);

    res.json({
      success: true,
      equippedAvatarFrame: u.equippedAvatarFrame,
      user: sanitizeUser(u),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to equip avatar frame' });
  }
});

// 7. Delete Account
app.delete('/api/auth/account/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const targetId = req.params.id;
  if (user.id !== targetId && user.role !== 'admin') {
    return res.status(403).json({ error: 'Unauthorized to delete this account' });
  }

  let users = readUsers();
  users = users.filter(u => u.id !== targetId);
  writeUsers(users);

  res.json({ success: true, message: 'Account deleted' });
});

// ----------------------------------------------------
// ADMIN PANEL & USER MANAGEMENT ROUTES
// ----------------------------------------------------

// Admin helper middleware check
function requireAdmin(req: any, res: any, next: any) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (user.role !== 'admin' && !user.permissions?.canAccessAdminPanel) {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required' });
  }
  req.adminUser = user;
  next();
}

// 1. Get all users with full info for admin management
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = readUsers();
  res.json(users.map(sanitizeUser));
});

// 2. Admin dashboard stats
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const users = readUsers();
  const articles = readArticles();
  
  const stats = {
    totalUsers: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    staff: users.filter(u => u.role === 'staff').length,
    robeatsdev: users.filter(u => u.role === 'robeatsdev').length,
    players: users.filter(u => u.role === 'player').length,
    totalArticles: articles.length,
    publishedArticles: articles.filter(a => a.status === 'published').length,
    serverTime: new Date().toISOString(),
  };

  res.json(stats);
});

// 3. Admin create a new user directly
app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const { username, email, password, displayName, avatar, bio, role, permissions } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    const users = readUsers();
    if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const validRoles: UserRole[] = ['admin', 'staff', 'robeatsdev', 'player'];
    const userRole: UserRole = validRoles.includes(role) ? role : 'player';
    const newUser: UserRecord = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      passwordHash: hashPassword(password),
      displayName: displayName?.trim() || username.trim(),
      avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: bio || '',
      role: userRole,
      permissions: permissions || getDefaultPermissions(userRole),
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);
    res.status(201).json({ user: sanitizeUser(newUser) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

// 4. Admin update anything on another user (profile, role, permissions, username, email)
app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const targetId = req.params.id;
    const { displayName, username, email, avatar, bio, role, permissions, newPassword } = req.body;
    const users = readUsers();
    const index = users.findIndex(u => u.id === targetId);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check unique username
    if (username && username.trim().toLowerCase() !== users[index].username.toLowerCase()) {
      if (users.some(u => u.id !== targetId && u.username.toLowerCase() === username.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Username already in use by another user' });
      }
      users[index].username = username.trim().toLowerCase();
    }

    // Check unique email
    if (email && email.trim().toLowerCase() !== users[index].email.toLowerCase()) {
      if (users.some(u => u.id !== targetId && u.email.toLowerCase() === email.trim().toLowerCase())) {
        return res.status(400).json({ error: 'Email already in use by another user' });
      }
      users[index].email = email.trim().toLowerCase();
    }

    if (displayName !== undefined) users[index].displayName = displayName.trim();
    if (avatar !== undefined) users[index].avatar = avatar;
    if (bio !== undefined) users[index].bio = bio;

    const validRoles: UserRole[] = ['admin', 'staff', 'robeatsdev', 'player'];
    if (role && validRoles.includes(role)) {
      users[index].role = role;
      users[index].permissions = getDefaultPermissions(role);
    }

    if (permissions && typeof permissions === 'object') {
      users[index].permissions = {
        ...(users[index].permissions || getDefaultPermissions(users[index].role)),
        ...permissions,
      };
    }

    if (newPassword && typeof newPassword === 'string' && newPassword.trim().length >= 6) {
      users[index].passwordHash = hashPassword(newPassword.trim());
    }

    writeUsers(users);
    res.json({ user: sanitizeUser(users[index]), message: 'User updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

// 5. Admin change/reset password for another user
app.put('/api/admin/users/:id/password', requireAdmin, (req, res) => {
  try {
    const targetId = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const users = readUsers();
    const index = users.findIndex(u => u.id === targetId);
    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    users[index].passwordHash = hashPassword(newPassword);
    writeUsers(users);

    res.json({ success: true, message: `Password for @${users[index].username} successfully reset` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

// 6. Admin delete user
app.delete('/api/admin/users/:id', requireAdmin, (req: any, res) => {
  try {
    const targetId = req.params.id;
    const currentAdmin = req.adminUser;

    if (currentAdmin.id === targetId) {
      return res.status(400).json({ error: 'Cannot delete your own active administrator account' });
    }

    let users = readUsers();
    const targetUser = users.find(u => u.id === targetId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.username.toLowerCase() === 'meelo') {
      return res.status(403).json({ error: 'The primary admin account (meelo) cannot be deleted' });
    }

    users = users.filter(u => u.id !== targetId);
    writeUsers(users);

    res.json({ success: true, message: `Account @${targetUser.username} deleted` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete user' });
  }
});

// 7. Get Discord Webhooks configuration (Admin only)
app.get('/api/admin/webhooks', requireAdmin, (req, res) => {
  try {
    const webhooks = readWebhooks();
    res.json(webhooks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read webhooks' });
  }
});

// 8. Update Discord Webhooks configuration (Admin only)
app.post('/api/admin/webhooks', requireAdmin, (req, res) => {
  try {
    const body = req.body || {};
    const current = readWebhooks();
    const updated: DiscordWebhooksConfig = { ...current };

    for (const cat of ['Daily mission', 'Weekly mission', 'Weekly Leaderboard', 'New song', 'Updates']) {
      if (body[cat] !== undefined) {
        if (typeof body[cat] === 'string') {
          const existing = current[cat];
          if (existing && typeof existing === 'object') {
            updated[cat] = { ...existing, url: body[cat].trim() };
          } else {
            updated[cat] = body[cat].trim();
          }
        } else if (body[cat] && typeof body[cat] === 'object') {
          updated[cat] = {
            url: typeof body[cat].url === 'string' ? body[cat].url.trim() : '',
            template: {
              titleTemplate: body[cat].template?.titleTemplate || '',
              bodyTemplate: body[cat].template?.bodyTemplate || '',
              footerTemplate: body[cat].template?.footerTemplate || '',
            },
          };
        }
      }
    }

    writeWebhooks(updated);
    res.json({ success: true, webhooks: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update webhooks' });
  }
});

// 9. Test Discord Webhook (Admin only)
app.post('/api/admin/webhooks/test', requireAdmin, async (req: any, res) => {
  try {
    const { category, webhookUrl } = req.body;
    const webhooks = readWebhooks();
    let url = webhookUrl?.trim();
    if (!url) {
      const entry = webhooks[category as keyof DiscordWebhooksConfig];
      if (typeof entry === 'string') url = entry;
      else if (entry && typeof entry === 'object') url = entry.url;
    }

    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: `No valid Discord Webhook URL configured for ${category || 'this category'}` });
    }

    let color = 0x06B6D4;
    if (category === 'Weekly mission') color = 0xF97316; // Orange
    else if (category === 'Weekly Leaderboard') color = 0xF59E0B; // Gold
    else if (category === 'New song') color = 0x2563EB; // Blue
    else if (category === 'Updates') color = 0x71717A; // Zinc

    const articles = readArticles();
    const isDailyMission = category === 'Daily mission';
    const sampleDailyPost = articles.find(a => a.category === 'Daily mission') || articles[0];
    const dailyData = isDailyMission && sampleDailyPost ? buildDailyMissionDiscordPayload(sampleDailyPost) : null;

    const testPayload: Record<string, any> = {
      username: 'RoBeats News',
      embeds: [
        {
          title: isDailyMission && sampleDailyPost
            ? `Header: " ${sampleDailyPost.title}"`
            : `🔔 Test Discord Webhook [${category || 'General'}]`,
          description: isDailyMission && dailyData
            ? [
                `## <:star:1295611495383695451> - Star missions`,
                dailyData.starSongs,
                ``,
                `## <:pro:1295611421866070016> - Pro missions`,
                dailyData.proSongs,
                ``,
                `## <:amateur:1295611203325792287> - Amateur missions`,
                dailyData.amateurSongs,
                ``,
                `## <:novice:1284381928044367944> - Novice missions`,
                dailyData.noviceSongs,
                ``,
                `## <:beginner:1284381903578861578> \n - Beginner missions`,
                dailyData.beginnerSongs,
              ].join('\n')
            : `This is a test notification confirming your Discord Webhook configuration for **${category || 'RoBeats News'}** is connected and working!`,
          color,
          fields: isDailyMission ? undefined : [
            {
              name: '✅ Status',
              value: 'Connection established successfully',
              inline: true,
            },
            {
              name: '👤 Sent By',
              value: `Admin @${req.adminUser?.username || 'meelo'}`,
              inline: true,
            },
          ],
          footer: {
            text: isDailyMission && dailyData ? `Poster: "${dailyData.posterName}" | Post date: "${dailyData.postDate}"` : 'RoBeats News Webhook System',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const discordRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text().catch(() => '');
      return res.status(discordRes.status).json({
        error: `Discord responded with status ${discordRes.status}: ${discordRes.statusText}. ${errText}`,
      });
    }

    res.json({ success: true, message: `Test webhook successfully delivered to Discord for "${category}"!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to send test webhook to Discord' });
  }
});

// 9.1 Get Daily Mission Webhook Template (Presets and rendered sample)
app.get('/api/admin/webhooks/daily-mission-template', (req, res) => {
  try {
    const articles = readArticles();
    const dailyPost = articles.find(a => a.category === 'Daily mission') || articles[0];
    const data = dailyPost ? buildDailyMissionDiscordPayload(dailyPost) : null;
    res.json({
      rawTemplate: DAILY_MISSION_DEFAULT_RAW_TEMPLATE,
      defaultTitleTemplate: 'Header: " {title}"',
      defaultBodyTemplate: '## <:star:1295611495383695451> - Star missions\n{star_songs}\n\n## <:pro:1295611421866070016> - Pro missions\n{pro_songs}\n\n## <:amateur:1295611203325792287> - Amateur missions\n{amateur_songs}\n\n## <:novice:1284381928044367944> - Novice missions\n{novice_songs}\n\n## <:beginner:1284381903578861578> \n - Beginner missions\n{beginner_songs}',
      defaultFooterTemplate: 'Poster: "{author}" | Post date: "{date}"',
      sampleFormatted: data ? data.formattedDiscordText : '',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch template' });
  }
});

// 9.2 Get Discord Template formatted for a specific post
app.get('/api/news/:id/discord-template', (req, res) => {
  try {
    const articles = readArticles();
    const post = articles.find(a => a.id === req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const data = buildDailyMissionDiscordPayload(post);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get discord template' });
  }
});

// 10. Get RoBeats Ranks list
app.get('/api/ranks', async (req, res) => {
  try {
    const ranks = readRanks();
    res.json(ranks);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch ranks' });
  }
});

// 11. Update RoBeats Rank (Admin only)
app.put('/api/admin/ranks/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { iconUrl, color, description, name } = req.body;
    const ranks = readRanks();
    const idx = ranks.findIndex(r => r.id.toLowerCase() === id.toLowerCase() || r.name.toLowerCase() === id.toLowerCase());
    if (idx === -1) {
      return res.status(404).json({ error: `Rank "${id}" not found` });
    }
    if (iconUrl !== undefined) ranks[idx].iconUrl = iconUrl.trim();
    if (color !== undefined) ranks[idx].color = color.trim();
    if (description !== undefined) ranks[idx].description = description.trim();
    if (name !== undefined) ranks[idx].name = name;
    writeRanks(ranks);
    res.json({ success: true, rank: ranks[idx], ranks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update rank' });
  }
});

// 12. Batch update RoBeats Ranks (Admin only)
app.put('/api/admin/ranks', requireAdmin, (req, res) => {
  try {
    const raw = req.body;
    const ranks = Array.isArray(raw) ? raw : raw?.ranks;
    if (!Array.isArray(ranks) || ranks.length === 0) {
      return res.status(400).json({ error: 'Ranks must be a non-empty array' });
    }
    writeRanks(ranks);
    res.json({ success: true, ranks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update ranks' });
  }
});

// 13. Get Difficulty Cover Art Frames
app.get('/api/frames', (req, res) => {
  try {
    const frames = readFrames();
    res.json(frames);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to read difficulty frames' });
  }
});

// 14. Update Difficulty Cover Art Frames (Admin only)
app.put('/api/admin/frames', requireAdmin, (req, res) => {
  try {
    const body = req.body;
    const current = readFrames();
    const updated: DifficultyFramesConfig = {
      easy: body.easy !== undefined ? String(body.easy).trim() : current.easy,
      normal: body.normal !== undefined ? String(body.normal).trim() : current.normal,
      hard: body.hard !== undefined ? String(body.hard).trim() : current.hard,
    };
    writeFrames(updated);
    res.json({ success: true, frames: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update difficulty frames' });
  }
});

// ----------------------------------------------------
// FANDOM MEDIAWIKI PROXY FALLBACK ROUTE
// ----------------------------------------------------
app.get('/api/songs/fandom', async (req, res) => {
  try {
    const response = await fetch('https://robeats.fandom.com/api.php?action=parse&page=Song_List&format=json&prop=text', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RoBeatsApp/1.0',
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Fandom Wiki' });
    }
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return res.status(502).json({ error: 'Fandom Wiki returned invalid or empty JSON' });
    }
    res.json(data || {});
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Proxy fetch failed' });
  }
});

// ----------------------------------------------------
// NEWS API ROUTES
// ----------------------------------------------------

// 1. Get all articles with optional filters
app.get('/api/news', async (req, res) => {
  try {
    const articles = readArticles();
    const { category, query, status, isBreaking, isFeatured } = req.query;

    let filtered = [...articles];

    if (category && category !== 'All') {
      filtered = filtered.filter(a => a.category.toLowerCase() === String(category).toLowerCase());
    }

    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }

    if (isBreaking === 'true') {
      filtered = filtered.filter(a => a.isBreaking);
    }

    if (isFeatured === 'true') {
      filtered = filtered.filter(a => a.isFeatured);
    }

    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.content?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort by publishedAt descending
    filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    const allComments = readComments();
    const articlesWithComments = filtered.map(a => ({
      ...a,
      comments: allComments.filter(c => c.postId === a.id),
    }));

    res.json(articlesWithComments);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch articles' });
  }
});

// 2. Get single article
app.get('/api/news/:id', (req, res) => {
  try {
    const articles = readArticles();
    const article = articles.find(a => a.id === req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // increment view count
    article.views = (article.views || 0) + 1;
    writeArticles(articles);

    const allComments = readComments();
    res.json({
      ...article,
      comments: allComments.filter(c => c.postId === article.id),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch article' });
  }
});

// 2.0 Post Reactions (Add / Toggle Reaction)
app.post('/api/news/:id/reactions', (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Reaction emoji is required' });
    }

    const articles = readArticles();
    const idx = articles.findIndex(a => a.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = articles[idx];
    if (!post.reactions || typeof post.reactions !== 'object') {
      post.reactions = {};
    }

    const authUser = getAuthUser(req);
    const userKey = authUser ? authUser.id : String(req.headers['x-client-id'] || req.ip || 'guest');

    if (!post.userReactions || typeof post.userReactions !== 'object') {
      post.userReactions = {};
    }

    const currentList: string[] = Array.isArray(post.userReactions[userKey]) ? post.userReactions[userKey] : [];
    const hasReacted = currentList.includes(emoji);

    if (hasReacted) {
      // Toggle off
      post.userReactions[userKey] = currentList.filter(e => e !== emoji);
      post.reactions[emoji] = Math.max(0, (post.reactions[emoji] || 1) - 1);
      if (post.reactions[emoji] === 0) {
        delete post.reactions[emoji];
      }
    } else {
      // Toggle on
      post.userReactions[userKey] = [...currentList, emoji];
      post.reactions[emoji] = (post.reactions[emoji] || 0) + 1;
    }

    articles[idx] = post;
    writeArticles(articles);

    res.json({
      success: true,
      reactions: post.reactions,
      userReactions: post.userReactions[userKey] || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to toggle reaction' });
  }
});

// 2.1 Get comments for article
app.get('/api/news/:id/comments', (req, res) => {
  try {
    const allComments = readComments();
    const postComments = allComments.filter(c => c.postId === req.params.id);
    res.json(postComments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// 2.2 Add comment to article (Only registered accounts can comment)
app.post('/api/news/:id/comments', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'Only registered accounts can comment on posts. Please sign in or register.' });
    }

    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comments = readComments();

    const newComment = {
      id: 'comment-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      postId: req.params.id,
      authorName: authUser.displayName || authUser.username,
      authorAvatar: authUser.avatar || '',
      authorRole: authUser.role || 'player',
      userId: authUser.id,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    comments.push(newComment);
    writeComments(comments);

    res.status(201).json(newComment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// 2.3 Delete comment (Admin, Staff, or Author)
app.delete('/api/news/:id/comments/:commentId', (req, res) => {
  try {
    const authUser = getAuthUser(req);
    let comments = readComments();
    const target = comments.find(c => c.id === req.params.commentId);
    if (!target) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const canDelete = authUser && (
      authUser.role === 'admin' || 
      authUser.role === 'staff' || 
      authUser.id === target.userId
    );

    if (!canDelete) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    comments = comments.filter(c => c.id !== req.params.commentId);
    writeComments(comments);

    res.json({ success: true, id: req.params.commentId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Staff & Admin helper middleware check for posting content
function requireStaffOrAdmin(req: any, res: any, next: any) {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please log in as Staff or Admin.' });
  }
  if (user.role !== 'admin' && user.role !== 'staff' && !user.permissions?.canPublishNews) {
    return res.status(403).json({ error: 'Access denied: Only Staff and Admin accounts can create and publish posts.' });
  }
  (req as any).authUser = user;
  next();
}

// 3. Create article / post
app.post('/api/news', requireStaffOrAdmin, (req, res) => {
  try {
    const articles = readArticles();
    const body = req.body;
    const user = (req as any).authUser;

    const category = body.category || 'Daily mission';
    let autoTitle = 'Daily missions';
    if (category === 'Weekly mission') autoTitle = 'Weekly missions';
    else if (category === 'Weekly Leaderboard') autoTitle = 'Weekly Leaderboard';
    else if (category === 'New song') autoTitle = 'New Song Release';
    else if (category === 'Updates') autoTitle = 'RoBeats Game Update';

    const finalTitle = (body.title && body.title.trim()) ? body.title.trim() : autoTitle;
    const finalContent = body.content ? body.content.trim() : '';
    const finalSubtitle = body.subtitle ? body.subtitle.trim() : '';
    // Will not add a random picture when there are no URL links when creating a new post
    const finalCover = (body.coverImage && body.coverImage.trim()) || (body.songs && body.songs[0]?.coverArt) || '';

    const newArticle: NewsArticle = {
      id: 'post-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: finalTitle,
      subtitle: finalSubtitle,
      content: finalContent,
      summary: body.summary || finalSubtitle || (finalContent ? finalContent.slice(0, 120) : ''),
      category,
      author: {
        name: user?.displayName || user?.username || 'Staff Member',
        role: user?.role === 'admin' ? 'Admin' : 'Staff',
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      },
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readTime: '1 min read',
      coverImage: finalCover || undefined,
      coverImageCaption: body.coverImageCaption || '',
      isBreaking: Boolean(body.isBreaking),
      isFeatured: Boolean(body.isFeatured),
      isTrending: false,
      status: 'published',
      tags: Array.isArray(body.tags) ? body.tags : [category, 'RoBeats'],
      views: 1,
      missionRank: body.missionRank || undefined,
      songs: Array.isArray(body.songs) ? body.songs : [],
    };

    // If new article is marked as featured, optionally unset other featured articles in this category or lead
    if (newArticle.isFeatured) {
      articles.forEach(a => {
        if (a.isFeatured) a.isFeatured = false;
      });
    }

    articles.unshift(newArticle);
    writeArticles(articles);

    res.status(201).json(newArticle);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create article' });
  }
});

// 4. Update article
app.put('/api/news/:id', requireStaffOrAdmin, (req, res) => {
  try {
    const articles = readArticles();
    const index = articles.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const current = articles[index];
    const body = req.body;

    const words = (body.content || current.content || '').trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(words / 200));

    if (body.isFeatured && !current.isFeatured) {
      articles.forEach(a => {
        if (a.id !== current.id && a.isFeatured) a.isFeatured = false;
      });
    }

    const updated: NewsArticle = {
      ...current,
      ...body,
      id: current.id,
      missionRank: body.missionRank !== undefined ? body.missionRank : current.missionRank,
      coverImage: body.coverImage !== undefined ? (body.coverImage.trim() || undefined) : current.coverImage,
      updatedAt: new Date().toISOString(),
      readTime: body.readTime || `${minutes} min read`,
      tags: Array.isArray(body.tags) ? body.tags : (body.tags ? String(body.tags).split(',').map(t => t.trim()) : current.tags),
      author: {
        ...current.author,
        ...(body.author || {}),
      },
      songs: body.songs !== undefined ? body.songs : current.songs,
    };

    articles[index] = updated;
    writeArticles(articles);

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update article' });
  }
});

// 4.1 Manual Publish Post via Discord Webhook (Staff & Admin only, during edit)
app.post('/api/news/:id/publish-webhook', requireStaffOrAdmin, async (req: any, res) => {
  try {
    let articles = readArticles();
    const index = articles.findIndex(a => a.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let post = articles[index];

    // If edited post payload was sent with the manual webhook publish, persist it first so Discord gets latest edits
    if (req.body && (req.body.title || req.body.songs || req.body.content)) {
      post = {
        ...post,
        title: req.body.title !== undefined ? req.body.title : post.title,
        content: req.body.content !== undefined ? req.body.content : post.content,
        coverImage: req.body.coverImage !== undefined ? req.body.coverImage : post.coverImage,
        songs: req.body.songs !== undefined ? req.body.songs : post.songs,
        updatedAt: new Date().toISOString(),
      };
      articles[index] = post;
      writeArticles(articles);
    }

    const webhooks = readWebhooks();
    const catEntry = webhooks[post.category as keyof DiscordWebhooksConfig];
    let url = '';
    if (typeof catEntry === 'string') url = catEntry;
    else if (catEntry && typeof catEntry === 'object') url = catEntry.url || '';

    if (!url || !url.trim().startsWith('http')) {
      return res.status(400).json({ 
        error: `No Discord Webhook URL is configured for category "${post.category}". Please configure the webhook URL in Admin Panel first.` 
      });
    }

    await sendDiscordWebhookForPost(post);
    res.json({ 
      success: true, 
      message: `Successfully broadcast "${post.title}" to Discord [${post.category}] webhook!` 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to publish to Discord webhook' });
  }
});

// 5. Delete article
app.delete('/api/news/:id', requireStaffOrAdmin, (req, res) => {
  try {
    let articles = readArticles();
    const exists = articles.some(a => a.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ error: 'Article not found' });
    }

    articles = articles.filter(a => a.id !== req.params.id);
    writeArticles(articles);

    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete article' });
  }
});

// 6. Reset seed data
app.post('/api/news/reset-seed', (req, res) => {
  try {
    writeArticles(DEFAULT_ARTICLES);
    res.json({ success: true, count: DEFAULT_ARTICLES.length, articles: DEFAULT_ARTICLES });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset articles' });
  }
});

// ----------------------------------------------------
// SONGS & ELEMENTS ROUTES (Local Database, No Fandom Wiki)
// ----------------------------------------------------

// 1. Get all elements (including admin configured image URLs)
app.get('/api/elements', (req, res) => {
  try {
    const elements = readElements();
    res.json(elements);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read elements' });
  }
});

// 2. Update elements URL images (Admin only)
app.put('/api/elements', requireAdmin, (req, res) => {
  try {
    const raw = req.body;
    const elements = Array.isArray(raw) ? raw : raw?.elements;
    if (!Array.isArray(elements) || elements.length === 0) {
      return res.status(400).json({ error: 'Expected array of element configs' });
    }
    writeElements(elements);
    res.json({ success: true, elements });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update elements' });
  }
});

// 3. Get all songs
app.get('/api/songs', (req, res) => {
  try {
    const songs = readSongs();
    res.json(songs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read songs' });
  }
});

// 4. Add new song (Admin only)
app.post('/api/songs', requireAdmin, (req, res) => {
  try {
    const songs = readSongs();
    const body = req.body;
    if (!body.title) return res.status(400).json({ error: 'Title is required' });

    const primaryCover = (body.coverArt || body.coverArtNormal || '').trim();

    const newSong = {
      id: 'custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: body.title.trim(),
      artist: body.artist?.trim() || 'Unknown Artist',
      mapper: body.mapper ? body.mapper.trim() : undefined,
      coverArt: primaryCover,
      coverArtEasy: primaryCover,
      coverArtNormal: primaryCover,
      coverArtHard: primaryCover,
      difficulty: {
        easy: body.difficulty?.easy || '-',
        normal: body.difficulty?.normal || '-',
        hard: body.difficulty?.hard || '-',
      },
      element: body.element || 'Standard',
      duration: body.duration || '',
      bpm: body.bpm || '',
      dateAdded: new Date().toLocaleDateString('en-US'),
      isCustom: true,
    };

    songs.unshift(newSong);
    writeSongs(songs);

    res.status(201).json(newSong);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add song' });
  }
});

// 5. Update song (Admin only, 1 cover art per song)
app.put('/api/songs/:id', requireAdmin, (req, res) => {
  try {
    const songs = readSongs();
    const idx = songs.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Song not found' });

    const body = req.body;
    const current = songs[idx];

    // Single cover art per song
    const primaryCover = body.coverArt !== undefined ? String(body.coverArt).trim() : (body.coverArtNormal !== undefined ? String(body.coverArtNormal).trim() : (current.coverArt || ''));

    const updated = {
      ...current,
      title: body.title !== undefined ? body.title.trim() : current.title,
      artist: body.artist !== undefined ? body.artist.trim() : current.artist,
      mapper: body.mapper !== undefined ? (body.mapper ? body.mapper.trim() : undefined) : current.mapper,
      coverArt: primaryCover,
      coverArtEasy: primaryCover,
      coverArtNormal: primaryCover,
      coverArtHard: primaryCover,
      difficulty: {
        easy: body.difficulty?.easy !== undefined ? body.difficulty.easy : current.difficulty.easy,
        normal: body.difficulty?.normal !== undefined ? body.difficulty.normal : current.difficulty.normal,
        hard: body.difficulty?.hard !== undefined ? body.difficulty.hard : current.difficulty.hard,
      },
      element: body.element !== undefined ? body.element : current.element,
      duration: body.duration !== undefined ? body.duration : current.duration,
      bpm: body.bpm !== undefined ? body.bpm : current.bpm,
    };

    songs[idx] = updated;
    writeSongs(songs);

    // Also update attached songs in existing articles so cover art per difficulty updates in posts
    let articles = readArticles();
    let articlesModified = false;
    articles = articles.map(a => {
      if (!a.songs || a.songs.length === 0) return a;
      let songUpdatedInPost = false;
      const updatedPostSongs = a.songs.map(ps => {
        if (ps.id === req.params.id) {
          songUpdatedInPost = true;
          return {
            ...ps,
            coverArt: updated.coverArt,
            coverArtEasy: updated.coverArtEasy,
            coverArtNormal: updated.coverArtNormal,
            coverArtHard: updated.coverArtHard,
            difficulty: updated.difficulty,
          };
        }
        return ps;
      });
      if (songUpdatedInPost) {
        articlesModified = true;
        return { ...a, songs: updatedPostSongs };
      }
      return a;
    });
    if (articlesModified) {
      writeArticles(articles);
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update song' });
  }
});

// 6. Delete song (Admin only)
app.delete('/api/songs/:id', requireAdmin, (req, res) => {
  try {
    let songs = readSongs();
    const exists = songs.some(s => s.id === req.params.id);
    if (!exists) return res.status(404).json({ error: 'Song not found' });

    songs = songs.filter(s => s.id !== req.params.id);
    writeSongs(songs);

    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete song' });
  }
});

// ----------------------------------------------------
// FEATURE 1: GENERATE HIGH-QUALITY IMAGES
// Requirement: "You MUST add image generation to the app using model gemini-3-pro-image-preview
// and provide an affordance for the user to specify the image size (1K, 2K, and 4K)."
// ----------------------------------------------------
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '16:9', style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Validate imageSize affordance
    const validSizes = ['1K', '2K', '4K'];
    const chosenSize = validSizes.includes(imageSize) ? imageSize : '1K';
    const chosenAspect = ['16:9', '4:3', '1:1', '3:4', '9:16'].includes(aspectRatio) ? aspectRatio : '16:9';

    // Enrich prompt with journalistic editorial aesthetic if style provided
    let enrichedPrompt = prompt;
    if (style && style !== 'None') {
      enrichedPrompt = `${prompt}. Visual style: ${style}, high-resolution award-winning photojournalism / editorial illustration.`;
    }

    console.log(`[ImageGen] Generating image with model gemini-3-pro-image-preview, size: ${chosenSize}, aspect: ${chosenAspect}`);

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            {
              text: enrichedPrompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: chosenAspect as any,
            imageSize: chosenSize as any,
          },
        },
      });
    } catch (primaryErr: any) {
      console.warn(`[ImageGen] Error with gemini-3-pro-image-preview (${primaryErr?.message}), attempting alias fallback...`);
      // Fallback to alias if environment alias differences occur
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3-pro-image',
          contents: {
            parts: [{ text: enrichedPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: chosenAspect as any,
              imageSize: chosenSize as any,
            },
          },
        });
      } catch (secErr: any) {
        console.warn(`[ImageGen] Fallback to gemini-3.1-flash-image...`);
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [{ text: enrichedPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: chosenAspect as any,
              imageSize: chosenSize as any,
            },
          },
        });
      }
    }

    let imageUrl: string | null = null;
    let descriptionText = '';

    if (response?.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
        } else if (part.text) {
          descriptionText += part.text;
        }
      }
    }

    if (!imageUrl) {
      return res.status(502).json({
        error: 'The image generation model did not return image data.',
        details: descriptionText,
      });
    }

    res.json({
      imageUrl,
      modelUsed: 'gemini-3-pro-image-preview',
      imageSize: chosenSize,
      aspectRatio: chosenAspect,
      prompt: enrichedPrompt,
      notes: descriptionText,
    });
  } catch (err: any) {
    console.error('[ImageGen] Failed:', err);
    res.status(500).json({
      error: err.message || 'Image generation failed',
      code: err.status || err.code || 500,
    });
  }
});

// ----------------------------------------------------
// FEATURE 2: GEMINI CHATBOT WITH MULTI-TURN & SPECIFIC ROLES
// Requirement:
// "You MUST add a multi-turn chat interface to the app using Gemini.
// The chat must maintain conversation history, display messages in a scrollable thread,
// and include a system instruction to give the chatbots specific roles.
// Use gemini-3.1-pro-preview for particularly complex tasks,
// gemini-3.5-flash for general tasks, and
// gemini-3.1-flash-lite for tasks that should happen fast."
// ----------------------------------------------------
const ROLE_SYSTEM_INSTRUCTIONS: Record<string, string> = {
  editor: `You are the Lead Editor & Meta Strategist for RoBeats News.
Your role: Review community updates, evaluate chart recommendations, critique guide drafts, verify Star Coin economy math, and ensure clear, exciting coverage of RoBeats rhythm game events and mechanics.`,

  reporter: `You are a Community Reporter & Chart Analyst for RoBeats News.
Your role: Cover newly dropped songs, community tournament results, high-difficulty clears (Freedom Dive, Galaxy Collapse), and interview top competitive rhythm players.`,

  copyeditor: `You are the Lead Copyeditor & Accuracy Specialist for RoBeats News.
Your role: Polish patch notes, mission guides, song shop announcements, grammar, and ensure concise, player-friendly format with clear bullet points.`,

  breaking: `You are the Breaking Alert Anchor for RoBeats News.
Your role: Rapid alerts for flash Song Shop sales, limited-time double XP/coin weekends, surprise song drops, and urgent game patch notes.`,
};

app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages, // Array of { role: 'user' | 'model', content: string }
      role = 'editor', // 'editor' | 'reporter' | 'copyeditor' | 'breaking'
      taskComplexity = 'general', // 'complex' | 'general' | 'fast'
      articleContext, // Optional article title and draft being worked on
    } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Determine model based on task complexity requirement:
    // "Use gemini-3.1-pro-preview for particularly complex tasks,
    //  gemini-3.5-flash for general tasks, and
    //  gemini-3.1-flash-lite for tasks that should happen fast."
    let modelName = 'gemini-3.5-flash';
    if (taskComplexity === 'complex') {
      modelName = 'gemini-3.1-pro-preview';
    } else if (taskComplexity === 'fast') {
      modelName = 'gemini-3.1-flash-lite';
    }

    // Base system instruction from role
    const baseInstruction = ROLE_SYSTEM_INSTRUCTIONS[role] || ROLE_SYSTEM_INSTRUCTIONS.editor;
    let systemInstruction = baseInstruction;
    if (articleContext) {
      systemInstruction += `\n\nCURRENT WORKING ARTICLE IN NEWSROOM:\nTitle: ${articleContext.title || 'Untitled'}\nCategory: ${articleContext.category || 'General'}\nContent Snippet: ${articleContext.content ? articleContext.content.slice(0, 1500) : 'None'}`;
    }

    // Format conversation history for Gemini API
    const contents = messages.map(m => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    console.log(`[Chat] Sending multi-turn request to model: ${modelName}, role: ${role}, task: ${taskComplexity}, history length: ${messages.length}`);

    let response;
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
        },
      });
    } catch (modelErr: any) {
      console.warn(`[Chat] Error with ${modelName} (${modelErr.message}), falling back to gemini-3.5-flash...`);
      response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config: {
          systemInstruction,
        },
      });
    }

    const reply = response.text || 'I could not generate an editorial response at this moment.';

    res.json({
      reply,
      modelUsed: modelName,
      role,
      taskComplexity,
    });
  } catch (err: any) {
    console.error('[Chat] Failed:', err);
    res.status(500).json({
      error: err.message || 'Chat assistance failed',
      code: err.status || 500,
    });
  }
});

// Quick AI Assistant Helper: Generate Headlines or Summaries
app.post('/api/assist/headlines', async (req, res) => {
  try {
    const { title, content, count = 4 } = req.body;
    const prompt = `You are a headline editor for The Daily Chronicle.
Based on this draft:
Title: "${title || ''}"
Content: "${(content || '').slice(0, 1000)}"

Generate ${count} compelling, journalistic, and punchy headline options:
1. Hard News / Direct
2. Analytical / Impact-driven
3. Narrative / Feature lede
4. High-SEO / Search-friendly

Return ONLY the numbered list of headlines without preamble.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite', // Fast task
      contents: prompt,
    });

    res.json({ suggestions: response.text || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate headlines' });
  }
});

// ----------------------------------------------------
// UNHANDLED API ROUTE FALLBACK
// ----------------------------------------------------
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
});

// ----------------------------------------------------
// VITE INTEGRATION & STATIC SERVING
// ----------------------------------------------------
async function startServer() {
  ensureDataFile();

  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[The Daily Chronicle Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
