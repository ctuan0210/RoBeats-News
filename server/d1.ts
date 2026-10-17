import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const D1_CONFIG_FILE = path.join(DATA_DIR, 'd1-config.json');

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
  workerUrl?: string;
  enabled: boolean;
}

export function readD1Config(): D1Config {
  try {
    if (fs.existsSync(D1_CONFIG_FILE)) {
      const data = fs.readFileSync(D1_CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        accountId: parsed.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '',
        databaseId: parsed.databaseId || process.env.CLOUDFLARE_DATABASE_ID || '',
        apiToken: parsed.apiToken || process.env.CLOUDFLARE_API_TOKEN || '',
        workerUrl: parsed.workerUrl || process.env.CLOUDFLARE_WORKER_URL || '',
        enabled: parsed.enabled !== undefined ? Boolean(parsed.enabled) : (process.env.CLOUDFLARE_D1_ENABLED === 'true'),
      };
    }
  } catch (err) {
    console.error('Error reading d1-config.json:', err);
  }

  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    workerUrl: process.env.CLOUDFLARE_WORKER_URL || '',
    enabled: process.env.CLOUDFLARE_D1_ENABLED === 'true',
  };
}

export function writeD1Config(config: Partial<D1Config>): D1Config {
  const current = readD1Config();
  const updated: D1Config = {
    accountId: config.accountId !== undefined ? config.accountId.trim() : current.accountId,
    databaseId: config.databaseId !== undefined ? config.databaseId.trim() : current.databaseId,
    apiToken: config.apiToken !== undefined ? config.apiToken.trim() : current.apiToken,
    workerUrl: config.workerUrl !== undefined ? config.workerUrl.trim() : (current.workerUrl || ''),
    enabled: config.enabled !== undefined ? Boolean(config.enabled) : current.enabled,
  };

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(D1_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing d1-config.json:', err);
  }

  return updated;
}

export function isD1Ready(config?: D1Config): boolean {
  const cfg = config || readD1Config();
  if (!cfg.enabled) return false;
  if (cfg.workerUrl && cfg.workerUrl.trim().length > 0) return true;
  return Boolean(cfg.accountId && cfg.databaseId && cfg.apiToken);
}

/**
 * Executes a SQL query against the Cloudflare D1 REST API or deployed Cloudflare Worker.
 */
export async function executeD1Query(
  sql: string,
  params: any[] = [],
  customConfig?: D1Config
): Promise<{ success: boolean; results?: any[]; meta?: any; error?: string }> {
  const cfg = customConfig || readD1Config();

  // Route via deployed Cloudflare Worker if workerUrl is provided
  if (cfg.workerUrl && cfg.workerUrl.trim().length > 0) {
    let cleanWorker = cfg.workerUrl.trim().replace(/\/+$/, '');
    cleanWorker = cleanWorker.replace(/\/api\/d1\/query\/?$/, '');
    cleanWorker = cleanWorker.replace(/\/d1\/query\/?$/, '');
    cleanWorker = cleanWorker.replace(/\/query\/?$/, '');
    cleanWorker = cleanWorker.replace(/\/api\/?$/, '');

    const endpoint = `${cleanWorker}/api/d1/query`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params }),
    });

    const body: any = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      throw new Error(body.error || `Cloudflare Worker error (${response.status}) at ${endpoint}`);
    }

    return {
      success: true,
      results: body.results || [],
      meta: body.meta || {},
    };
  }

  // Direct Cloudflare D1 REST API route
  if (!cfg.accountId || !cfg.databaseId || !cfg.apiToken) {
    const missing: string[] = [];
    if (!cfg.accountId) missing.push('Account ID (run `wrangler whoami` in your terminal)');
    if (!cfg.databaseId) missing.push('Database ID (UUID)');
    if (!cfg.apiToken) missing.push('Cloudflare API Token');
    throw new Error(`Cloudflare D1 credentials incomplete. Missing: ${missing.join(', ')}. Alternatively, you can use your deployed Cloudflare Worker URL.`);
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`;

  const payload: Record<string, any> = { sql };
  if (params && params.length > 0) {
    payload.params = params;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cfg.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body: any = await response.json().catch(() => ({}));

  if (!response.ok || !body.success) {
    const errorDetails = (body.errors && body.errors.length > 0)
      ? body.errors.map((e: any) => `${e.message} (code ${e.code})`).join('; ')
      : response.statusText || 'Unknown Cloudflare API error';
    throw new Error(`Cloudflare D1 API error (${response.status}): ${errorDetails}`);
  }

  // D1 returns an array of result objects in body.result
  const firstResult = (body.result && body.result.length > 0) ? body.result[0] : { results: [], meta: {} };
  return {
    success: true,
    results: firstResult.results || [],
    meta: firstResult.meta || {},
  };
}

/**
 * Initializes all tables in Cloudflare D1 database.
 */
export async function initD1Tables(): Promise<{ success: boolean; message: string }> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT,
      author TEXT NOT NULL,
      coverImage TEXT,
      songs TEXT,
      tags TEXT,
      publishedAt TEXT NOT NULL,
      updatedAt TEXT,
      comments TEXT,
      reactions TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      mapper TEXT,
      coverArt TEXT,
      coverArtEasy TEXT,
      coverArtNormal TEXT,
      coverArtHard TEXT,
      difficulty TEXT,
      element TEXT,
      duration TEXT,
      bpm TEXT,
      dateAdded TEXT,
      isCustom INTEGER DEFAULT 0
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      permissions TEXT,
      avatar TEXT,
      bio TEXT,
      createdAt TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS webhooks (
      category TEXT PRIMARY KEY,
      url TEXT,
      template TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS ranks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      iconUrl TEXT,
      color TEXT,
      description TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS elements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      imageUrl TEXT
    );`
  ];

  for (const stmt of statements) {
    await executeD1Query(stmt);
  }

  return { success: true, message: 'All 6 D1 tables (posts, songs, users, webhooks, ranks, elements) initialized successfully!' };
}

/**
 * Tests connection to Cloudflare D1 by running SELECT 1
 */
export async function testD1Connection(customConfig?: D1Config): Promise<{ success: boolean; message: string; databaseName?: string }> {
  const cfg = customConfig || readD1Config();
  const hasWorker = Boolean(cfg.workerUrl && cfg.workerUrl.trim().length > 0);
  const hasDirectCreds = Boolean(cfg.accountId && cfg.databaseId && cfg.apiToken);

  if (!hasWorker && !hasDirectCreds) {
    const missing: string[] = [];
    if (!cfg.accountId) missing.push('Account ID (run `wrangler whoami` in your terminal)');
    if (!cfg.databaseId) missing.push('Database ID');
    if (!cfg.apiToken) missing.push('Cloudflare API Token (from dash.cloudflare.com/profile/api-tokens)');
    return {
      success: false,
      message: `Incomplete credentials: Missing ${missing.join(', ')}. Or provide your deployed Cloudflare Worker URL.`,
    };
  }

  try {
    const res = await executeD1Query('SELECT 1 as connected, datetime(\'now\') as current_time;', [], cfg);
    return {
      success: true,
      message: `Connection successfully verified with Cloudflare D1! Database responded at: ${res.results?.[0]?.current_time || 'OK'}`,
    };
  } catch (err: any) {
    if (hasWorker && cfg.workerUrl) {
      try {
        let rootUrl = cfg.workerUrl.trim().replace(/\/+$/, '');
        rootUrl = rootUrl.replace(/\/api\/d1\/query\/?$/, '').replace(/\/api\/?$/, '');
        const pingRes = await fetch(rootUrl);
        const pingData: any = await pingRes.json().catch(() => ({}));
        if (pingRes.ok && pingData.status === 'online') {
          return {
            success: false,
            message: `Worker is reachable and online, but D1 database query failed: ${err.message}. Please initialize the tables using the button below.`,
          };
        }
      } catch (_) {}
    }
    return {
      success: false,
      message: err.message || 'Failed to connect to Cloudflare D1',
    };
  }
}

/**
 * Sync a single post into Cloudflare D1
 */
export async function syncPostToD1(post: any) {
  if (!isD1Ready()) return;
  try {
    const sql = `
      INSERT INTO posts (id, title, category, content, author, coverImage, songs, tags, publishedAt, updatedAt, comments, reactions)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        category = excluded.category,
        content = excluded.content,
        author = excluded.author,
        coverImage = excluded.coverImage,
        songs = excluded.songs,
        tags = excluded.tags,
        updatedAt = excluded.updatedAt,
        comments = excluded.comments,
        reactions = excluded.reactions;
    `;
    await executeD1Query(sql, [
      post.id,
      post.title,
      post.category,
      post.content || '',
      typeof post.author === 'object' ? JSON.stringify(post.author) : String(post.author || ''),
      post.coverImage || '',
      JSON.stringify(post.songs || []),
      JSON.stringify(post.tags || []),
      post.publishedAt || new Date().toISOString(),
      post.updatedAt || new Date().toISOString(),
      JSON.stringify(post.comments || []),
      JSON.stringify(post.reactions || {}),
    ]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to auto-sync post:', err.message);
  }
}

/**
 * Delete a post from Cloudflare D1
 */
export async function deletePostFromD1(id: string) {
  if (!isD1Ready()) return;
  try {
    await executeD1Query('DELETE FROM posts WHERE id = ?;', [id]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to delete post from D1:', err.message);
  }
}

/**
 * Sync a song into Cloudflare D1 (including cover art per difficulty)
 */
export async function syncSongToD1(song: any) {
  if (!isD1Ready()) return;
  try {
    const sql = `
      INSERT INTO songs (id, title, artist, mapper, coverArt, coverArtEasy, coverArtNormal, coverArtHard, difficulty, element, duration, bpm, dateAdded, isCustom)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        artist = excluded.artist,
        mapper = excluded.mapper,
        coverArt = excluded.coverArt,
        coverArtEasy = excluded.coverArtEasy,
        coverArtNormal = excluded.coverArtNormal,
        coverArtHard = excluded.coverArtHard,
        difficulty = excluded.difficulty,
        element = excluded.element,
        duration = excluded.duration,
        bpm = excluded.bpm;
    `;
    await executeD1Query(sql, [
      song.id,
      song.title,
      song.artist,
      song.mapper || '',
      song.coverArt || '',
      song.coverArtEasy || '',
      song.coverArtNormal || '',
      song.coverArtHard || '',
      typeof song.difficulty === 'object' ? JSON.stringify(song.difficulty) : String(song.difficulty || '{}'),
      song.element || 'Standard',
      song.duration || '',
      song.bpm || '',
      song.dateAdded || new Date().toLocaleDateString('en-US'),
      song.isCustom ? 1 : 0,
    ]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to auto-sync song:', err.message);
  }
}

/**
 * Delete a song from Cloudflare D1
 */
export async function deleteSongFromD1(id: string) {
  if (!isD1Ready()) return;
  try {
    await executeD1Query('DELETE FROM songs WHERE id = ?;', [id]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to delete song from D1:', err.message);
  }
}

/**
 * Sync a user into Cloudflare D1
 */
export async function syncUserToD1(user: any) {
  if (!isD1Ready()) return;
  try {
    const sql = `
      INSERT INTO users (id, username, passwordHash, role, permissions, avatar, bio, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        passwordHash = excluded.passwordHash,
        role = excluded.role,
        permissions = excluded.permissions,
        avatar = excluded.avatar,
        bio = excluded.bio;
    `;
    await executeD1Query(sql, [
      user.id,
      user.username,
      user.passwordHash,
      user.role || 'user',
      typeof user.permissions === 'object' ? JSON.stringify(user.permissions) : String(user.permissions || '{}'),
      user.avatar || '',
      user.bio || '',
      user.createdAt || new Date().toISOString(),
    ]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to auto-sync user:', err.message);
  }
}

/**
 * Delete a user from Cloudflare D1
 */
export async function deleteUserFromD1(id: string) {
  if (!isD1Ready()) return;
  try {
    await executeD1Query('DELETE FROM users WHERE id = ?;', [id]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to delete user from D1:', err.message);
  }
}

/**
 * Fetch posts from Cloudflare D1 with schema mapping
 */
export async function fetchPostsFromD1(): Promise<any[] | null> {
  if (!isD1Ready()) return null;
  try {
    const res = await executeD1Query('SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 200;');
    if (!res.results) return null;
    return res.results.map((r: any) => ({
      ...r,
      author: typeof r.author === 'string' ? JSON.parse(r.author || '{}') : r.author,
      songs: typeof r.songs === 'string' ? JSON.parse(r.songs || '[]') : r.songs,
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags,
      comments: typeof r.comments === 'string' ? JSON.parse(r.comments || '[]') : (r.comments || []),
      reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {}),
    }));
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to query posts from D1, falling back to local file:', err.message);
    return null;
  }
}

/**
 * Fetch songs from Cloudflare D1
 */
export async function fetchSongsFromD1(): Promise<any[] | null> {
  if (!isD1Ready()) return null;
  try {
    const res = await executeD1Query('SELECT * FROM songs ORDER BY dateAdded DESC LIMIT 500;');
    if (!res.results) return null;
    return res.results.map((r: any) => ({
      ...r,
      difficulty: typeof r.difficulty === 'string' ? JSON.parse(r.difficulty || '{}') : r.difficulty,
      isCustom: Boolean(r.isCustom),
    }));
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to query songs from D1, falling back to local file:', err.message);
    return null;
  }
}

/**
 * Full Migration: Migrate all local JSON data into Cloudflare D1
 */
export async function syncLocalDataToD1(
  articles: any[],
  songs: any[],
  users: any[],
  webhooks: any,
  ranks: any[],
  elements: any[]
): Promise<{ success: boolean; counts: Record<string, number> }> {
  await initD1Tables();

  const counts = { posts: 0, songs: 0, users: 0, webhooks: 0, ranks: 0, elements: 0 };

  // 1. Sync posts
  for (const post of articles) {
    await syncPostToD1(post);
    counts.posts++;
  }

  // 2. Sync songs
  for (const song of songs) {
    await syncSongToD1(song);
    counts.songs++;
  }

  // 3. Sync users
  for (const user of users) {
    await syncUserToD1(user);
    counts.users++;
  }

  // 4. Sync webhooks
  if (webhooks && typeof webhooks === 'object') {
    for (const [cat, val] of Object.entries(webhooks)) {
      const url = typeof val === 'string' ? val : (val as any).url || '';
      const tmpl = typeof val === 'object' && (val as any).template ? JSON.stringify((val as any).template) : '';
      await executeD1Query(`
        INSERT INTO webhooks (category, url, template)
        VALUES (?, ?, ?)
        ON CONFLICT(category) DO UPDATE SET url = excluded.url, template = excluded.template;
      `, [cat, url, tmpl]);
      counts.webhooks++;
    }
  }

  // 5. Sync ranks
  for (const rank of ranks) {
    await executeD1Query(`
      INSERT INTO ranks (id, name, iconUrl, color, description)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, iconUrl = excluded.iconUrl, color = excluded.color, description = excluded.description;
    `, [rank.id, rank.name, rank.iconUrl || '', rank.color || '', rank.description || '']);
    counts.ranks++;
  }

  // 6. Sync elements
  for (const el of elements) {
    await executeD1Query(`
      INSERT INTO elements (id, name, color, imageUrl)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, imageUrl = excluded.imageUrl;
    `, [el.id, el.name, el.color || '', el.imageUrl || '']);
    counts.elements++;
  }

  return { success: true, counts };
}

/**
 * Fetch all users from Cloudflare D1
 */
export async function fetchUsersFromD1(): Promise<any[] | null> {
  if (!isD1Ready()) return null;
  try {
    const res = await executeD1Query('SELECT * FROM users ORDER BY createdAt DESC LIMIT 500;');
    if (!res.results) return null;
    return res.results.map((r: any) => ({
      ...r,
      permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '{}') : (r.permissions || {}),
    }));
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to query users from D1:', err.message);
    return null;
  }
}

/**
 * Fetch ranks from Cloudflare D1
 */
export async function fetchRanksFromD1(): Promise<any[] | null> {
  if (!isD1Ready()) return null;
  try {
    const res = await executeD1Query('SELECT * FROM ranks ORDER BY id ASC;');
    return res.results || null;
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to query ranks from D1:', err.message);
    return null;
  }
}

/**
 * Fetch elements from Cloudflare D1
 */
export async function fetchElementsFromD1(): Promise<any[] | null> {
  if (!isD1Ready()) return null;
  try {
    const res = await executeD1Query('SELECT * FROM elements ORDER BY id ASC;');
    return res.results || null;
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to query elements from D1:', err.message);
    return null;
  }
}

/**
 * Fetch webhooks from Cloudflare D1
 */
export async function fetchWebhooksFromD1(): Promise<Record<string, any> | null> {
  if (!isD1Ready()) return null;
  try {
    const res = await executeD1Query('SELECT * FROM webhooks;');
    if (!res.results) return null;
    const map: Record<string, any> = {};
    for (const r of res.results) {
      map[r.category] = {
        url: r.url || '',
        template: typeof r.template === 'string' && r.template ? JSON.parse(r.template) : (r.template || {}),
      };
    }
    return map;
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to query webhooks from D1:', err.message);
    return null;
  }
}

/**
 * Sync rank to D1
 */
export async function syncRankToD1(rank: any) {
  if (!isD1Ready()) return;
  try {
    await executeD1Query(`
      INSERT INTO ranks (id, name, iconUrl, color, description)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, iconUrl = excluded.iconUrl, color = excluded.color, description = excluded.description;
    `, [rank.id, rank.name, rank.iconUrl || '', rank.color || '', rank.description || '']);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to sync rank:', err.message);
  }
}

/**
 * Sync element to D1
 */
export async function syncElementToD1(el: any) {
  if (!isD1Ready()) return;
  try {
    await executeD1Query(`
      INSERT INTO elements (id, name, color, imageUrl)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, color = excluded.color, imageUrl = excluded.imageUrl;
    `, [el.id, el.name, el.color || '', el.imageUrl || '']);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to sync element:', err.message);
  }
}

/**
 * Sync webhook to D1
 */
export async function syncWebhookToD1(category: string, url: string, template: any) {
  if (!isD1Ready()) return;
  try {
    const tmpl = typeof template === 'object' ? JSON.stringify(template) : String(template || '');
    await executeD1Query(`
      INSERT INTO webhooks (category, url, template)
      VALUES (?, ?, ?)
      ON CONFLICT(category) DO UPDATE SET url = excluded.url, template = excluded.template;
    `, [category, url || '', tmpl]);
  } catch (err: any) {
    console.warn('[Cloudflare D1] Failed to sync webhook:', err.message);
  }
}

const ALLOWED_D1_TABLES = ['posts', 'songs', 'users', 'webhooks', 'ranks', 'elements'];

export function isAllowedTable(table: string): boolean {
  return ALLOWED_D1_TABLES.includes(table.toLowerCase().trim());
}

/**
 * Fetch raw records from a specific D1 table
 */
export async function fetchD1Records(table: string, limit = 100): Promise<any[]> {
  const cleanTable = table.toLowerCase().trim();
  if (!isAllowedTable(cleanTable)) {
    throw new Error(`Invalid table name '${table}'. Allowed: ${ALLOWED_D1_TABLES.join(', ')}`);
  }
  const res = await executeD1Query(`SELECT * FROM ${cleanTable} LIMIT ?;`, [limit]);
  return res.results || [];
}

/**
 * Insert a manual record into a D1 table
 */
export async function insertD1Record(table: string, record: Record<string, any>) {
  const cleanTable = table.toLowerCase().trim();
  if (!isAllowedTable(cleanTable)) {
    throw new Error(`Invalid table name '${table}'. Allowed: ${ALLOWED_D1_TABLES.join(', ')}`);
  }

  const keys = Object.keys(record);
  if (keys.length === 0) {
    throw new Error('Record object cannot be empty');
  }

  const columns = keys.map(k => `"${k}"`).join(', ');
  const placeholders = keys.map(() => '?').join(', ');
  const values = keys.map(k => {
    const val = record[k];
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return val;
  });

  const sql = `INSERT INTO ${cleanTable} (${columns}) VALUES (${placeholders});`;
  return await executeD1Query(sql, values);
}

/**
 * Update a manual record in a D1 table
 */
export async function updateD1Record(table: string, id: string, record: Record<string, any>) {
  const cleanTable = table.toLowerCase().trim();
  if (!isAllowedTable(cleanTable)) {
    throw new Error(`Invalid table name '${table}'. Allowed: ${ALLOWED_D1_TABLES.join(', ')}`);
  }

  const idCol = cleanTable === 'webhooks' ? 'category' : 'id';
  const keys = Object.keys(record).filter(k => k !== idCol);
  if (keys.length === 0) {
    throw new Error('No fields provided to update');
  }

  const setClauses = keys.map(k => `"${k}" = ?`).join(', ');
  const values = keys.map(k => {
    const val = record[k];
    if (typeof val === 'object' && val !== null) {
      return JSON.stringify(val);
    }
    return val;
  });
  values.push(id);

  const sql = `UPDATE ${cleanTable} SET ${setClauses} WHERE ${idCol} = ?;`;
  return await executeD1Query(sql, values);
}

/**
 * Delete a manual record from a D1 table
 */
export async function deleteD1Record(table: string, id: string) {
  const cleanTable = table.toLowerCase().trim();
  if (!isAllowedTable(cleanTable)) {
    throw new Error(`Invalid table name '${table}'. Allowed: ${ALLOWED_D1_TABLES.join(', ')}`);
  }

  const idCol = cleanTable === 'webhooks' ? 'category' : 'id';
  const sql = `DELETE FROM ${cleanTable} WHERE ${idCol} = ?;`;
  return await executeD1Query(sql, [id]);
}
