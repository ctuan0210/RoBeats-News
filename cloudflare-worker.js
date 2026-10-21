/**
 * Cloudflare Worker for RoBeats Newsroom with Cloudflare D1 Database Binding
 *
 * This Worker connects directly to your Cloudflare D1 database ('DB' binding)
 * to serve posts, songs, accounts, webhooks, ranks, and elements with edge-speed SQLite queries.
 *
 * Wrangler binding:
 *   [[d1_databases]]
 *   binding = "DB"
 *   database_name = "robeats-d1"
 *   database_id = "<your-d1-database-id>"
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    let path = url.pathname.replace(/\/+$/, '');
    if (!path) path = '/';
    const method = request.method.toUpperCase();

    // Standard CORS Headers for edge API requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
      'Access-Control-Max-Age': '86400',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const json = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          ...corsHeaders,
        },
      });
    };

    const error = (msg, status = 500, details = null) => {
      return json({ success: false, error: msg, ...(details ? { details } : {}) }, status);
    };

    try {
      // 1. Root / Ping / Health Check
      if (path === '/' || path === '/health' || path === '/api' || path === '/api/health') {
        const hasDb = Boolean(env && env.DB);
        return json({
          success: true,
          status: 'online',
          message: 'RoBeats Cloudflare D1 API is running successfully!',
          databaseBinding: hasDb ? 'connected (DB)' : 'missing (check wrangler.toml binding)',
          timestamp: new Date().toISOString(),
          endpoints: [
            '/api/d1/test',
            '/api/d1/query',
            '/api/d1/init',
            '/api/d1/records/:table',
            '/api/news',
            '/api/songs',
            '/api/users',
            '/api/ranks',
            '/api/elements',
            '/api/webhooks',
          ],
        });
      }

      // Check DB binding
      if (!env || !env.DB) {
        return error('Cloudflare D1 database binding "DB" is missing in wrangler.toml or Worker settings.', 500);
      }

      // 2. Direct SQL Query Endpoint (Used by server.ts & Admin SQL Console)
      // Handles: /api/d1/query, /d1/query, /query
      if (path === '/api/d1/query' || path === '/d1/query' || path === '/query') {
        if (method !== 'POST') {
          return error('Method not allowed. Use POST with { sql: string, params?: any[] }', 405);
        }
        const body = await request.json().catch(() => ({}));
        const sql = body.sql;
        const params = Array.isArray(body.params) ? body.params : [];

        if (!sql || typeof sql !== 'string') {
          return error('Missing required "sql" parameter in request body', 400);
        }

        const trimmedSql = sql.trim();
        const isSelect = /^SELECT\b/i.test(trimmedSql) || /^PRAGMA\b/i.test(trimmedSql) || /^EXPLAIN\b/i.test(trimmedSql);

        if (isSelect) {
          const stmt = env.DB.prepare(trimmedSql);
          const bound = params.length > 0 ? stmt.bind(...params) : stmt;
          const result = await bound.all();
          return json({
            success: true,
            results: result.results || [],
            meta: result.meta || {},
          });
        } else {
          // INSERT, UPDATE, DELETE, CREATE, etc.
          // Handle multi-statement scripts if semicolon separated
          const statements = trimmedSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

          if (statements.length > 1) {
            const batch = statements.map(s => env.DB.prepare(s));
            const batchRes = await env.DB.batch(batch);
            return json({
              success: true,
              results: batchRes.map(b => b.results || []),
              meta: { statementCount: statements.length },
            });
          } else {
            const stmt = env.DB.prepare(trimmedSql);
            const bound = params.length > 0 ? stmt.bind(...params) : stmt;
            const res = await bound.run();
            return json({
              success: true,
              results: res.results || [],
              meta: res.meta || {},
            });
          }
        }
      }

      // 3. Database Connection Test Endpoint
      // Handles: /api/d1/test, /d1/test, /test
      if (path === '/api/d1/test' || path === '/d1/test' || path === '/test') {
        const testRes = await env.DB.prepare("SELECT 1 as connected, datetime('now') as current_time").first();
        return json({
          success: true,
          status: 'online',
          message: 'Connection successfully verified with Cloudflare D1!',
          currentTime: testRes?.current_time || new Date().toISOString(),
        });
      }

      // 4. Schema Initialization Endpoint
      // Handles: /api/d1/init, /d1/init, /init
      if (path === '/api/d1/init' || path === '/d1/init' || path === '/init') {
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
        return json({
          success: true,
          message: 'All 6 Cloudflare D1 tables (posts, songs, users, webhooks, ranks, elements) initialized successfully!',
        });
      }

      // 5. Generic Table Record CRUD (/api/d1/records/:table and /api/d1/records/:table/:id)
      if (path.startsWith('/api/d1/records/') || path.startsWith('/d1/records/')) {
        const cleanPrefix = path.startsWith('/api/d1/records/') ? '/api/d1/records/' : '/d1/records/';
        const sub = path.slice(cleanPrefix.length);
        const parts = sub.split('/');
        const table = (parts[0] || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
        const id = parts[1] ? decodeURIComponent(parts.slice(1).join('/')) : null;

        const allowedTables = ['posts', 'songs', 'users', 'webhooks', 'ranks', 'elements'];
        if (!allowedTables.includes(table)) {
          return error(`Invalid table "${table}". Allowed tables: ${allowedTables.join(', ')}`, 400);
        }

        if (method === 'GET') {
          if (id) {
            const keyCol = table === 'webhooks' ? 'category' : 'id';
            const row = await env.DB.prepare(`SELECT * FROM ${table} WHERE ${keyCol} = ?`).bind(id).first();
            if (!row) return error(`Record not found in ${table}`, 404);
            return json({ success: true, record: row });
          } else {
            const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
            const { results } = await env.DB.prepare(`SELECT * FROM ${table} LIMIT ?`).bind(limit).all();
            return json({ success: true, count: results.length, records: results });
          }
        }

        if (method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const cols = Object.keys(body).filter(k => /^[a-zA-Z0-9_]+$/.test(k));
          if (cols.length === 0) return error('No valid columns provided for insert', 400);

          const placeholders = cols.map(() => '?').join(', ');
          const values = cols.map(k => {
            const v = body[k];
            return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
          });

          await env.DB.prepare(
            `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
          ).bind(...values).run();

          return json({ success: true, message: `Record saved into ${table}` }, 201);
        }

        if (method === 'PUT') {
          if (!id) return error('Missing record identifier in URL path', 400);
          const body = await request.json().catch(() => ({}));
          const keyCol = table === 'webhooks' ? 'category' : 'id';
          const cols = Object.keys(body).filter(k => /^[a-zA-Z0-9_]+$/.test(k) && k !== keyCol);

          if (cols.length === 0) return error('No fields provided to update', 400);

          const setClauses = cols.map(c => `${c} = ?`).join(', ');
          const values = cols.map(k => {
            const v = body[k];
            return typeof v === 'object' && v !== null ? JSON.stringify(v) : v;
          });
          values.push(id);

          await env.DB.prepare(
            `UPDATE ${table} SET ${setClauses} WHERE ${keyCol} = ?`
          ).bind(...values).run();

          return json({ success: true, message: `Record ${id} updated in ${table}` });
        }

        if (method === 'DELETE') {
          if (!id) return error('Missing record identifier in URL path', 400);
          const keyCol = table === 'webhooks' ? 'category' : 'id';
          await env.DB.prepare(`DELETE FROM ${table} WHERE ${keyCol} = ?`).bind(id).run();
          return json({ success: true, message: `Record ${id} deleted from ${table}` });
        }
      }

      // 6. Posts / News Endpoints
      if (path === '/api/news' || path === '/api/posts' || path === '/news' || path === '/posts') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM posts ORDER BY publishedAt DESC LIMIT 100').all();
          const parsed = (results || []).map(row => {
            const p = { ...row };
            try { if (p.author && typeof p.author === 'string' && (p.author.startsWith('{') || p.author.startsWith('['))) p.author = JSON.parse(p.author); } catch {}
            try { if (p.songs && typeof p.songs === 'string') p.songs = JSON.parse(p.songs); } catch {}
            try { if (p.tags && typeof p.tags === 'string') p.tags = JSON.parse(p.tags); } catch {}
            try { if (p.comments && typeof p.comments === 'string') p.comments = JSON.parse(p.comments); } catch {}
            try { if (p.reactions && typeof p.reactions === 'string') p.reactions = JSON.parse(p.reactions); } catch {}
            return p;
          });
          return json(parsed);
        }

        if (method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const id = body.id || `post_${Date.now()}`;
          const authorStr = typeof body.author === 'object' ? JSON.stringify(body.author) : (body.author || 'Staff');
          const songsStr = typeof body.songs === 'object' ? JSON.stringify(body.songs) : (body.songs || '[]');
          const tagsStr = typeof body.tags === 'object' ? JSON.stringify(body.tags) : (body.tags || '[]');
          const commentsStr = typeof body.comments === 'object' ? JSON.stringify(body.comments) : (body.comments || '[]');
          const reactionsStr = typeof body.reactions === 'object' ? JSON.stringify(body.reactions) : (body.reactions || '{}');

          await env.DB.prepare(`
            INSERT OR REPLACE INTO posts (id, title, category, content, author, coverImage, songs, tags, publishedAt, updatedAt, comments, reactions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            body.title || 'Untitled Post',
            body.category || 'Updates',
            body.content || '',
            authorStr,
            body.coverImage || '',
            songsStr,
            tagsStr,
            body.publishedAt || new Date().toISOString(),
            body.updatedAt || new Date().toISOString(),
            commentsStr,
            reactionsStr
          ).run();

          return json({ success: true, id, message: 'Post created/updated' }, 201);
        }
      }

      // Single Post by ID
      if (path.startsWith('/api/news/') || path.startsWith('/api/posts/')) {
        const id = decodeURIComponent(path.replace(/^\/(?:api\/)?(?:news|posts)\//, ''));
        if (method === 'GET') {
          const row = await env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first();
          if (!row) return error('Post not found', 404);
          const p = { ...row };
          try { if (p.author && typeof p.author === 'string' && (p.author.startsWith('{') || p.author.startsWith('['))) p.author = JSON.parse(p.author); } catch {}
          try { if (p.songs && typeof p.songs === 'string') p.songs = JSON.parse(p.songs); } catch {}
          try { if (p.tags && typeof p.tags === 'string') p.tags = JSON.parse(p.tags); } catch {}
          try { if (p.comments && typeof p.comments === 'string') p.comments = JSON.parse(p.comments); } catch {}
          try { if (p.reactions && typeof p.reactions === 'string') p.reactions = JSON.parse(p.reactions); } catch {}
          return json(p);
        }
        if (method === 'DELETE') {
          await env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
          return json({ success: true, message: `Post ${id} deleted` });
        }
      }

      // 7. Songs Endpoints
      if (path === '/api/songs' || path === '/songs') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM songs ORDER BY dateAdded DESC').all();
          const parsed = (results || []).map(s => {
            const item = { ...s };
            try {
              if (item.difficulty && typeof item.difficulty === 'string' && item.difficulty.startsWith('{')) {
                item.difficulty = JSON.parse(item.difficulty);
              }
            } catch {}
            return item;
          });
          return json(parsed);
        }

        if (method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const id = body.id || `song_${Date.now()}`;
          const diffStr = typeof body.difficulty === 'object' ? JSON.stringify(body.difficulty) : (body.difficulty || '');
          await env.DB.prepare(`
            INSERT OR REPLACE INTO songs (id, title, artist, mapper, coverArt, coverArtEasy, coverArtNormal, coverArtHard, difficulty, element, duration, bpm, dateAdded, isCustom)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            body.title || 'Untitled Song',
            body.artist || 'Unknown Artist',
            body.mapper || '',
            body.coverArt || '',
            body.coverArtEasy || '',
            body.coverArtNormal || '',
            body.coverArtHard || '',
            diffStr,
            body.element || '',
            body.duration || '',
            body.bpm || '',
            body.dateAdded || new Date().toISOString(),
            body.isCustom ? 1 : 0
          ).run();
          return json({ success: true, id, message: 'Song saved' }, 201);
        }
      }

      // Single Song by ID
      if (path.startsWith('/api/songs/') || path.startsWith('/songs/')) {
        const id = decodeURIComponent(path.replace(/^\/(?:api\/)?songs\//, ''));
        if (method === 'DELETE') {
          await env.DB.prepare('DELETE FROM songs WHERE id = ?').bind(id).run();
          return json({ success: true, message: `Song ${id} deleted` });
        }
      }

      // 8. Users Endpoints
      if (path === '/api/users' || path === '/users' || path === '/api/admin/users') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT id, username, role, permissions, avatar, bio, createdAt FROM users').all();
          const sanitized = (results || []).map(u => {
            const user = { ...u };
            try {
              if (user.permissions && typeof user.permissions === 'string') {
                user.permissions = JSON.parse(user.permissions);
              }
            } catch {}
            return user;
          });
          return json(sanitized);
        }

        if (method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const id = body.id || `usr_${Date.now()}`;
          const permStr = typeof body.permissions === 'object' ? JSON.stringify(body.permissions) : (body.permissions || '{}');
          await env.DB.prepare(`
            INSERT OR REPLACE INTO users (id, username, passwordHash, role, permissions, avatar, bio, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            id,
            body.username,
            body.passwordHash || '',
            body.role || 'player',
            permStr,
            body.avatar || '',
            body.bio || '',
            body.createdAt || new Date().toISOString()
          ).run();
          return json({ success: true, id, message: 'User saved' }, 201);
        }
      }

      // 9. Ranks Endpoints
      if (path === '/api/ranks' || path === '/ranks') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM ranks').all();
          return json(results || []);
        }
        if (method === 'PUT' || method === 'POST') {
          const body = await request.json().catch(() => ([]));
          const list = Array.isArray(body) ? body : [body];
          for (const r of list) {
            await env.DB.prepare(`
              INSERT OR REPLACE INTO ranks (id, name, iconUrl, color, description)
              VALUES (?, ?, ?, ?, ?)
            `).bind(r.id, r.name, r.iconUrl || '', r.color || '', r.description || '').run();
          }
          return json({ success: true, message: 'Ranks updated' });
        }
      }

      // 10. Elements Endpoints
      if (path === '/api/elements' || path === '/elements') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM elements').all();
          return json(results || []);
        }
        if (method === 'PUT' || method === 'POST') {
          const body = await request.json().catch(() => ([]));
          const list = Array.isArray(body) ? body : [body];
          for (const el of list) {
            const id = el.id || el.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await env.DB.prepare(`
              INSERT OR REPLACE INTO elements (id, name, color, imageUrl)
              VALUES (?, ?, ?, ?)
            `).bind(id, el.name, el.color || el.hexColor || '', el.imageUrl || '').run();
          }
          return json({ success: true, message: 'Elements updated' });
        }
      }

      // 11. Webhooks Endpoints
      if (path === '/api/webhooks' || path === '/webhooks' || path === '/api/admin/webhooks') {
        if (method === 'GET') {
          const { results } = await env.DB.prepare('SELECT * FROM webhooks').all();
          const config = {};
          for (const row of results || []) {
            let template = null;
            try { if (row.template) template = JSON.parse(row.template); } catch {}
            config[row.category] = { url: row.url || '', ...(template ? { template } : {}) };
          }
          return json(config);
        }
        if (method === 'POST' || method === 'PUT') {
          const body = await request.json().catch(() => ({}));
          for (const [category, val] of Object.entries(body)) {
            const urlVal = typeof val === 'string' ? val : (val?.url || '');
            const templateStr = typeof val === 'object' && val?.template ? JSON.stringify(val.template) : '';
            await env.DB.prepare(`
              INSERT OR REPLACE INTO webhooks (category, url, template)
              VALUES (?, ?, ?)
            `).bind(category, urlVal, templateStr).run();
          }
          return json({ success: true, message: 'Webhooks saved' });
        }
      }

      // Catch-all 404 for unhandled paths
      return json({
        success: false,
        error: 'Not Found',
        requestedPath: path,
        method,
        hint: 'Verify the endpoint name or use /api/d1/query for direct SQL execution.',
        availableEndpoints: [
          'GET  /',
          'GET  /api/d1/test',
          'POST /api/d1/init',
          'POST /api/d1/query',
          'GET|POST|PUT|DELETE /api/d1/records/:table',
          'GET|POST /api/news',
          'GET|POST /api/songs',
          'GET|POST /api/users',
          'GET|PUT  /api/ranks',
          'GET|PUT  /api/elements',
          'GET|POST /api/webhooks',
        ],
      }, 404);
    } catch (err) {
      return error(err.message || 'Internal Cloudflare Worker error', 500, err.stack);
    }
  },
};
