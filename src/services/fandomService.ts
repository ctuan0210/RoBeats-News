import { SongEntry, ElementConfig, RankConfig } from '../types';
import { buildDefaultElements } from '../constants/elements';

// In-memory cache for fast local access
let cachedSongs: SongEntry[] | null = null;
let cachedElements: ElementConfig[] | null = null;
let cachedRanks: RankConfig[] | null = null;

function getAuthToken(): string | null {
  try {
    return localStorage.getItem('robeats_auth_token');
  } catch {
    return null;
  }
}

/**
 * Fetches all songs directly from the server's local persistent database.
 * Completely disconnected from external Fandom wiki scraping.
 */
export async function fetchSongList(forceRefresh: boolean = false): Promise<SongEntry[]> {
  if (!forceRefresh && cachedSongs && cachedSongs.length > 0) {
    return cachedSongs;
  }

  try {
    const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api/songs](https://robeats-d1-api.anh6052018.workers.dev/api/songs)');
    if (!res.ok) {
      throw new Error(`Failed to load songs: HTTP ${res.status}`);
    }
    const data: SongEntry[] = await res.json();
    cachedSongs = data;
    return data;
  } catch (err) {
    console.error('Error fetching songs from server database', err);
    if (cachedSongs && cachedSongs.length > 0) {
      return cachedSongs;
    }
    return DEFAULT_SEED_SONGS;
  }
}

/**
 * Admin action: Add a song entry to local database
 */
export async function adminAddSong(song: Omit<SongEntry, 'id'>): Promise<SongEntry> {
  const token = getAuthToken();
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/songs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(song),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to add song');
  }

  const created: SongEntry = await res.json();
  if (cachedSongs) {
    cachedSongs = [created, ...cachedSongs];
  }
  return created;
}

/**
 * Admin action: Edit an existing song in local database
 */
export async function adminEditSong(songId: string, updates: Partial<SongEntry>): Promise<SongEntry> {
  const token = getAuthToken();
  const res = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to edit song');
  }

  const updated: SongEntry = await res.json();
  if (cachedSongs) {
    cachedSongs = cachedSongs.map(s => s.id === songId ? updated : s);
  }
  return updated;
}

/**
 * Admin action: Delete a song from local database
 */
export async function adminDeleteSong(songId: string): Promise<void> {
  const token = getAuthToken();
  const res = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete song');
  }

  if (cachedSongs) {
    cachedSongs = cachedSongs.filter(s => s.id !== songId);
  }
}

/**
 * Admin action: Reset overrides (no-op since database is authoritative)
 */
export function adminResetOverrides() {
  // Database is server authoritative
}

/**
 * Elements API: Fetch all configured element types and their image URLs
 */
export async function fetchElementsList(): Promise<ElementConfig[]> {
  try {
    const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/elements');
    if (!res.ok) throw new Error('Failed to fetch elements');
    const data: ElementConfig[] = await res.json();
    cachedElements = data;
    return data;
  } catch (err) {
    console.error('Error fetching elements', err);
    if (!cachedElements) {
      cachedElements = buildDefaultElements();
    }
    return cachedElements;
  }
}

/**
 * Elements API: Update element image URLs (Admin only)
 */
export async function updateElementsList(elements: ElementConfig[]): Promise<ElementConfig[]> {
  const token = getAuthToken();
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/elements', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(elements),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update elements');
  }

  const result = await res.json();
  cachedElements = result.elements || elements;
  return (cachedElements || elements);
}

/**
 * Discord Webhook API: Fetch current webhook configurations (Admin only)
 */
export async function fetchDiscordWebhooks(): Promise<Record<string, string>> {
  const token = getAuthToken();
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/webhooks', {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch webhooks');
  }

  return res.json();
}

/**
 * Discord Webhook API: Save webhook configurations (Admin only)
 */
export async function updateDiscordWebhooks(config: Record<string, any>): Promise<Record<string, any>> {
  const token = getAuthToken();
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update webhooks');
  }

  const data = await res.json();
  return data.webhooks || config;
}

/**
 * Discord Webhook API: Send test notification (Admin only)
 */
export async function testDiscordWebhook(category: string, webhookUrl?: string): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/webhooks/test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ category, webhookUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to test webhook');
  }

  return res.json();
}

/**
 * Fetch Daily Mission Webhook Template definition and live sample
 */
export async function fetchDailyMissionTemplate(): Promise<{
  rawTemplate: string;
  defaultTitleTemplate: string;
  defaultBodyTemplate: string;
  defaultFooterTemplate: string;
  sampleFormatted: string;
}> {
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/webhooks/daily-mission-template');
  if (!res.ok) {
    throw new Error('Failed to load Daily Mission template');
  }
  return res.json();
}

/**
 * Fetch formatted Discord Webhook template for a specific post
 */
export async function fetchPostDiscordTemplate(postId: string): Promise<{
  rawTemplate: string;
  formattedDiscordText: string;
  starSongs: string;
  proSongs: string;
  amateurSongs: string;
  noviceSongs: string;
  beginnerSongs: string;
  posterName: string;
  postDate: string;
}> {
  const res = await fetch(`/api/news/${postId}/discord-template`);
  if (!res.ok) {
    throw new Error('Failed to load post Discord template');
  }
  return res.json();
}

/**
 * Manual Discord Webhook publishing for an article (Staff and Admin only)
 */
export async function publishNewsToDiscordWebhook(postId: string, updatedPayload?: any): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  const res = await fetch(`/api/news/${postId}/publish-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updatedPayload || {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to publish to Discord webhook');
  }

  return res.json();
}

/**
 * Client-side fallback generator for Daily Mission Discord WebHook format
 */
export function generateDailyMissionDiscordText(post: any): string {
  const buckets: Record<'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner', Array<any>> = {
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
    const difficultyText = diffLetter === 'E' ? 'Easy' : diffLetter === 'H' ? 'Hard' : 'Normal';
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
        rank = post.missionRank || 'Beginner';
      }
    }

    const cleanLevel = diffVal !== '-' ? diffVal : '1';
    const songItem = {
      level: cleanLevel,
      title: song.title || 'Unknown Song',
      artist: song.artist || 'Unknown Artist',
      element: song.element || 'Standard',
      isNoMisses,
      difficultyText,
    };

    if (rank && buckets[rank as keyof typeof buckets]) {
      buckets[rank as keyof typeof buckets].push(songItem);
    } else {
      buckets.Beginner.push(songItem);
    }
  }

  const formatList = (items: Array<any>, _rankType: 'Star' | 'Pro' | 'Amateur' | 'Novice' | 'Beginner') => {
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
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return [
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
}

/**
 * Fetch all RoBeats ranks (Star, Pro, Amateur, Novice, Beginner)
 */
export async function fetchRanksList(forceRefresh: boolean = false): Promise<RankConfig[]> {
  if (!forceRefresh && cachedRanks && cachedRanks.length > 0) {
    return cachedRanks;
  }

  try {
    const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/ranks');
    if (!res.ok) throw new Error('Failed to fetch ranks');
    const ranks = await res.json();
    cachedRanks = ranks;
    return ranks;
  } catch (err) {
    console.error('Failed to load ranks:', err);
    return [
      { id: 'star', name: 'Star', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/star.svg', color: '#F59E0B', description: 'Elite RoBeats master rhythm players' },
      { id: 'pro', name: 'Pro', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/zap.svg', color: '#A855F7', description: 'High tier competitive rhythm champions' },
      { id: 'amateur', name: 'Amateur', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/award.svg', color: '#3B82F6', description: 'Skilled rhythm players clearing advanced charts' },
      { id: 'novice', name: 'Novice', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/activity.svg', color: '#10B981', description: 'Intermediate rhythm players learning higher speeds' },
      { id: 'beginner', name: 'Beginner', iconUrl: 'https://raw.githubusercontent.com/feathericons/feather/master/icons/disc.svg', color: '#64748B', description: 'Starting rhythm players beginning their journey' },
    ];
  }
}

/**
 * Update a specific rank's configuration (Admin only)
 */
export async function updateRankConfig(id: string, updates: Partial<RankConfig>): Promise<RankConfig> {
  const token = getAuthToken();
  const res = await fetch(`/api/admin/ranks/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update rank');
  }

  const result = await res.json();
  if (result.ranks) cachedRanks = result.ranks;
  return result.rank;
}

/**
 * Batch update ranks (Admin only)
 */
export async function updateAllRanks(ranks: RankConfig[]): Promise<RankConfig[]> {
  const token = getAuthToken();
  const res = await fetch('[https://robeats-d1-api.anh6052018.workers.dev/api](https://robeats-d1-api.anh6052018.workers.dev/api)/admin/ranks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ ranks }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update ranks');
  }

  const result = await res.json();
  const finalRanks: RankConfig[] = Array.isArray(result) ? result : (result.ranks || ranks);
  cachedRanks = finalRanks;
  return finalRanks;
}

export const DEFAULT_SEED_SONGS: SongEntry[] = [
  {
    id: 'seed_1',
    title: 'Monday Night Monsters',
    artist: 'FinnMK',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/f/f6/Mondaynightnormal.png/revision/latest/scale-to-width-down/100?cb=20200703131704',
    difficulty: { easy: '1', normal: '1', hard: '14' },
    element: 'Flow',
    duration: '2:14',
    bpm: '100',
  },
  {
    id: 'seed_2',
    title: 'Daily Life',
    artist: 'FinnMK',
    coverArt: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    coverArtEasy: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    coverArtNormal: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    coverArtHard: 'https://static.wikia.nocookie.net/robeats/images/0/04/Daily_life.png/revision/latest/scale-to-width-down/100?cb=20210628193437',
    difficulty: { easy: '-', normal: '2', hard: '17' },
    element: 'Chill',
    duration: '2:02',
    bpm: '106',
  }
];
