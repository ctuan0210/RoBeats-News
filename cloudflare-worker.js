/**
 * Cloudflare Worker with D1 Database Binding
 *
 * This Worker connects directly to your Cloudflare D1 database ('DB' binding)
 * to serve posts, songs, accounts, webhooks, ranks, and elements with edge-speed SQLite queries.
 *
 * Deployment:
 * 1. Ensure wrangler is installed: npm install -g wrangler
 * 2. Login to Cloudflare: wrangler login
 * 3. Create D1 database: wrangler d1 create robeats-d1
 * 4. Add the database_id to wrangler.toml:
 *    [[d1_databases]]
 *    binding = "DB"
 *    database_name = "robeats-d1"
 *    database_id = "<YOUR_DATABASE_ID>"
 * 5. Initialize tables: wrangler d1 execute robeats-d1 --file=./schema.sql
 * 6. Deploy worker: wrangler deploy
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Standard CORS Headers for edge API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    };

    const error = (msg, status = 500) => {
      return json({ error: msg }, status);
    };

    try {
      if (!env.DB) {
        return error('D1 database binding "DB" is missing in wrangler.toml', 500);
      }

      // ----------------------------------------------------
      // 1. Health check & table initialization
      // ----------------------------------------------------
      if (path === '/api/d1/init' && method === 'POST') {
        await env.DB.exec(`
          CREATE TABLE IF NOT EXISTS posts (
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
          );

          CREATE TABLE IF NOT EXISTS songs (
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
          );

          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'player',
            permissions TEXT,
            avatar TEXT,
            bio TEXT,
            createdAt TEXT
          );

          CREATE TABLE IF NOT EXISTS webhooks (
            category TEXT PRIMARY KEY,
            url TEXT,
            template TEXT
          );

          CREATE TABLE IF NOT EXISTS ranks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            iconUrl TEXT,
            color TEXT,
            description TEXT
          );

          CREATE TABLE IF NOT EXISTS elements (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            color TEXT,
            imageUrl TEXT
          );
        `);
        return json({ success: true, message: 'All D1 tables initialized successfully!' });
      }

      // ----------------------------------------------------
      // 2. Posts Endpoints (GET, POST, PUT, DELETE)
      // ----------------------------------------------------
      if (path === '/api/news' || path === '/api/posts') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare(
            'SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 100'
          ).all();
          const posts = results.map(r => ({
            ...r,
            author: typeof r.author === 'string' ? JSON.parse(r.author || '{}') : r.author,
            songs: typeof r.songs === 'string' ? JSON.parse(r.songs || '[]') : r.songs,
            tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags,
            comments: typeof r.comments === 'string' ? JSON.parse(r.comments || '[]') : (r.comments || []),
            reactions: typeof r.reactions === 'string' ? JSON.parse(r.reactions || '{}') : (r.reactions || {}),
          }));
          return json(posts);
        }

        if (method === 'POST') {
          const body = await request.json();
          const id = body.id || 'post_' + Date.now();
          const now = new Date().toISOString();
          const post = {
            id,
            title: body.title || 'Untitled Post',
            category: body.category || 'Updates',
            content: body.content || '',
            author: JSON.stringify(body.author || { name: 'Admin', role: 'admin' }),
            coverImage: body.coverImage || '',
            songs: JSON.stringify(body.songs || []),
            tags: JSON.stringify(body.tags || []),
            publishedAt: body.publishedAt || now,
            updatedAt: now,
            comments: JSON.stringify(body.comments || []),
            reactions: JSON.stringify(body.reactions || {}),
          };

          await env.DB.prepare(`
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
              reactions = excluded.reactions
          `).bind(
            post.id, post.title, post.category, post.content, post.author,
            post.coverImage, post.songs, post.tags, post.publishedAt, post.updatedAt,
            post.comments, post.reactions
          ).run();

          return json({ success: true, id }, 201);
        }
      }

      // Single Post delete
      if ((path.startsWith('/api/news/') || path.startsWith('/api/posts/')) && method === 'DELETE') {
        const id = path.split('/').pop();
        await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
        return json({ success: true, id });
      }

      // ----------------------------------------------------
      // 3. Songs Endpoints (with cover art per difficulty)
      // ----------------------------------------------------
      if (path === '/api/songs') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM songs ORDER BY dateAdded DESC').all();
          const songs = results.map(r => ({
            ...r,
            difficulty: typeof r.difficulty === 'string' ? JSON.parse(r.difficulty || '{}') : r.difficulty,
            isCustom: Boolean(r.isCustom),
          }));
          return json(songs);
        }

        if (method === 'POST') {
          const body = await request.json();
          const id = body.id || 'custom_' + Date.now();
          await env.DB.prepare(`
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
              bpm = excluded.bpm
          `).bind(
            id,
            body.title || 'Untitled',
            body.artist || 'Unknown',
            body.mapper || '',
            body.coverArt || '',
            body.coverArtEasy || body.coverArt || '',
            body.coverArtNormal || body.coverArt || '',
            body.coverArtHard || body.coverArt || '',
            JSON.stringify(body.difficulty || { easy: '-', normal: '1', hard: '-' }),
            body.element || 'Standard',
            body.duration || '2:30',
            body.bpm || '120',
            body.dateAdded || new Date().toLocaleDateString('en-US'),
            body.isCustom ? 1 : 0
          ).run();
          return json({ success: true, id }, 201);
        }
      }

      // Update Song (Cover Art per difficulty)
      if (path.startsWith('/api/songs/') && method === 'PUT') {
        const id = path.replace('/api/songs/', '');
        const body = await request.json();
        
        await env.DB.prepare(`
          UPDATE songs 
          SET title = COALESCE(?, title),
              artist = COALESCE(?, artist),
              mapper = COALESCE(?, mapper),
              coverArt = COALESCE(?, coverArt),
              coverArtEasy = COALESCE(?, coverArtEasy),
              coverArtNormal = COALESCE(?, coverArtNormal),
              coverArtHard = COALESCE(?, coverArtHard),
              element = COALESCE(?, element),
              duration = COALESCE(?, duration),
              bpm = COALESCE(?, bpm)
          WHERE id = ?
        `).bind(
          body.title || null,
          body.artist || null,
          body.mapper || null,
          body.coverArt || null,
          body.coverArtEasy || null,
          body.coverArtNormal || null,
          body.coverArtHard || null,
          body.element || null,
          body.duration || null,
          body.bpm || null,
          id
        ).run();

        return json({ success: true, id });
      }

      // Delete Song
      if (path.startsWith('/api/songs/') && method === 'DELETE') {
        const id = path.replace('/api/songs/', '');
        await env.DB.prepare('DELETE FROM songs WHERE id = ?').bind(id).run();
        return json({ success: true, id });
      }

      // ----------------------------------------------------
      // 4. Users & Accounts Endpoints
      // ----------------------------------------------------
      if (path === '/api/users' || path === '/api/admin/users') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT id, username, role, permissions, avatar, bio, createdAt FROM users').all();
          const users = results.map(r => ({
            ...r,
            permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions || '{}') : (r.permissions || {}),
          }));
          return json(users);
        }

        if (method === 'POST') {
          const body = await request.json();
          const id = body.id || 'usr_' + Date.now();
          await env.DB.prepare(`
            INSERT INTO users (id, username, passwordHash, role, permissions, avatar, bio, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              username = excluded.username,
              passwordHash = excluded.passwordHash,
              role = excluded.role,
              permissions = excluded.permissions,
              avatar = excluded.avatar,
              bio = excluded.bio
          `).bind(
            id,
            body.username,
            body.passwordHash || '',
            body.role || 'player',
            JSON.stringify(body.permissions || {}),
            body.avatar || '',
            body.bio || '',
            body.createdAt || new Date().toISOString()
          ).run();
          return json({ success: true, id }, 201);
        }
      }

      // ----------------------------------------------------
      // 5. Custom D1 SQL query execution (Admin Console)
      // ----------------------------------------------------
      if (path === '/api/d1/query' && method === 'POST') {
        const body = await request.json();
        const sql = body.sql;
        if (!sql) return error('SQL query is required', 400);

        const isSelect = sql.trim().toLowerCase().startsWith('select') || sql.trim().toLowerCase().startsWith('pragma');
        if (isSelect) {
          const { results } = await env.DB.prepare(sql).all();
          return json({ success: true, results, count: results.length });
        } else {
          const res = await env.DB.prepare(sql).run();
          return json({ success: true, meta: res.meta });
        }
      }

      // ----------------------------------------------------
      // 6. Generic Table Record CRUD (/api/d1/records/:table)
      // ----------------------------------------------------
      if (path.startsWith('/api/d1/records/')) {
        const parts = path.replace('/api/d1/records/', '').split('/');
        const table = parts[0].toLowerCase();
        const id = parts[1];
        const allowedTables = ['posts', 'songs', 'users', 'webhooks', 'ranks', 'elements'];

        if (!allowedTables.includes(table)) {
          return error(`Invalid table "${table}". Allowed: ${allowedTables.join(', ')}`, 400);
        }

        const idCol = table === 'webhooks' ? 'category' : 'id';

        if (method === 'GET') {
          const { results } = await env.DB.prepare(`SELECT * FROM ${table} LIMIT 100`).all();
          return json({ success: true, count: results.length, records: results });
        }

        if (method === 'POST') {
          const body = await request.json();
          const keys = Object.keys(body);
          const cols = keys.map(k => `"${k}"`).join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const vals = keys.map(k => typeof body[k] === 'object' ? JSON.stringify(body[k]) : body[k]);
          await env.DB.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).bind(...vals).run();
          return json({ success: true, message: `Inserted into ${table}` }, 201);
        }

        if (method === 'PUT' && id) {
          const body = await request.json();
          const keys = Object.keys(body).filter(k => k !== idCol);
          const setClause = keys.map(k => `"${k}" = ?`).join(', ');
          const vals = keys.map(k => typeof body[k] === 'object' ? JSON.stringify(body[k]) : body[k]);
          vals.push(id);
          await env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE ${idCol} = ?`).bind(...vals).run();
          return json({ success: true, message: `Updated record in ${table}` });
        }

        if (method === 'DELETE' && id) {
          await env.DB.prepare(`DELETE FROM ${table} WHERE ${idCol} = ?`).bind(id).run();
          return json({ success: true, message: `Deleted record from ${table}` });
        }
      }

      return error('Not Found', 404);
    } catch (err) {
      return error(err.message, 500);
    }
  },
};

