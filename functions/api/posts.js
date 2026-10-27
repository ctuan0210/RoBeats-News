/**
 * Cloudflare Pages Functions - GET /api/posts
 * 
 * Fetches news posts from Cloudflare D1 database or provides seed fallback.
 * Strictly returns JSON arrays with proper Content-Type and CORS headers.
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Seed fallback articles if D1 database is empty or not yet connected
const DEFAULT_SEED_POSTS = [
  {
    id: 'post_seed_1',
    title: 'RoBeats Spring Championship 2026: Official Bracket & Song Pool',
    category: 'Daily News',
    content: 'The official song pool and tournament brackets for the RoBeats Spring Championship 2026 have been announced. Competitors will face high-difficulty charts across 4 rounds.',
    author: 'meelo',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    songs: [
      {
        id: 's_seed_1',
        title: 'Freedom Dive',
        artist: 'xi',
        difficulty: 'Hard (28)',
        bpm: '222.22',
        duration: '4:21',
        element: 'Fire',
      },
    ],
    tags: ['Tournament', 'Competitive', 'Spring2026'],
    publishedAt: '2026-04-10T12:00:00Z',
    comments: [],
    reactions: { like: 12, fire: 8, heart: 5 },
  },
  {
    id: 'post_seed_2',
    title: 'New Star Shop Rotation & Difficulty 25+ Chart Updates',
    category: 'Weekly Missions',
    content: 'This week’s Star Shop rotation brings 3 brand new master difficulty songs and exclusive avatar frames. Complete weekly event missions to claim your star coins.',
    author: 'meelo',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800',
    songs: [
      {
        id: 's_seed_2',
        title: 'Galaxy Collapse',
        artist: 'Kurokotei',
        difficulty: 'Hard (32)',
        bpm: '270',
        duration: '3:45',
        element: 'Cosmic',
      },
    ],
    tags: ['StarShop', 'Rotation', 'WeeklyUpdate'],
    publishedAt: '2026-04-08T09:30:00Z',
    comments: [],
    reactions: { like: 19, fire: 15, heart: 9 },
  },
];

/**
 * Helper to safely parse JSON strings from SQLite D1 TEXT columns
 */
function safeJsonParse(val, fallback) {
  if (typeof val !== 'string') return val || fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/**
 * Handle CORS preflight OPTIONS request
 */
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Handle GET request for fetching posts
 */
export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const category = url.searchParams.get('category');

    // 1. If Cloudflare D1 binding (DB) is available, fetch from database
    if (env?.DB) {
      try {
        let query = 'SELECT * FROM posts';
        const params = [];

        if (category && category !== 'All') {
          query += ' WHERE category = ?';
          params.push(category);
        }

        query += ' ORDER BY publishedAt DESC LIMIT 100';

        const stmt = env.DB.prepare(query).bind(...params);
        const { results } = await stmt.all();

        if (Array.isArray(results) && results.length > 0) {
          // Parse stringified SQLite columns (songs, tags, comments, reactions)
          const formattedPosts = results.map(row => ({
            id: row.id,
            title: row.title,
            category: row.category,
            content: row.content || '',
            author: row.author,
            coverImage: row.coverImage || '',
            songs: safeJsonParse(row.songs, []),
            tags: safeJsonParse(row.tags, []),
            comments: safeJsonParse(row.comments, []),
            reactions: safeJsonParse(row.reactions, {}),
            publishedAt: row.publishedAt || new Date().toISOString(),
            updatedAt: row.updatedAt || undefined,
          }));

          return Response.json(formattedPosts, {
            status: 200,
            headers: CORS_HEADERS,
          });
        }
      } catch (dbError) {
        console.warn('[D1 Posts Warning] Failed to query posts from D1, using seed fallback:', dbError.message);
      }
    }

    // 2. Fallback to default seed posts if D1 has no rows or is not bound
    let filteredPosts = DEFAULT_SEED_POSTS;
    if (category && category !== 'All') {
      filteredPosts = DEFAULT_SEED_POSTS.filter(p => p.category === category);
    }

    return Response.json(filteredPosts, {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    console.error('[API Posts Error]:', err);
    return Response.json(
      {
        success: false,
        error: 'Failed to load posts from database.',
        details: err?.message || 'Unknown error',
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

/**
 * Handle POST request for creating a new post (optional D1 insertion)
 */
export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    let postData;
    try {
      postData = await request.json();
    } catch {
      return Response.json(
        { success: false, error: 'Invalid JSON request body.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!postData.title || !postData.category) {
      return Response.json(
        { success: false, error: 'Title and category are required.' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const newPost = {
      id: postData.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: postData.title,
      category: postData.category,
      content: postData.content || '',
      author: postData.author || 'Staff',
      coverImage: postData.coverImage || '',
      songs: postData.songs || [],
      tags: postData.tags || [],
      publishedAt: postData.publishedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: postData.comments || [],
      reactions: postData.reactions || {},
    };

    if (env?.DB) {
      try {
        await env.DB.prepare(`
          INSERT INTO posts (id, title, category, content, author, coverImage, songs, tags, publishedAt, updatedAt, comments, reactions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newPost.id,
          newPost.title,
          newPost.category,
          newPost.content,
          newPost.author,
          newPost.coverImage,
          JSON.stringify(newPost.songs),
          JSON.stringify(newPost.tags),
          newPost.publishedAt,
          newPost.updatedAt,
          JSON.stringify(newPost.comments),
          JSON.stringify(newPost.reactions)
        ).run();
      } catch (insertError) {
        console.warn('[D1 Insert Warning] Failed to insert into D1:', insertError.message);
      }
    }

    return Response.json(newPost, {
      status: 201,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * Catch-all handler ensuring standard JSON for any unsupported HTTP method
 */
export async function onRequest(context) {
  if (context.request.method === 'GET') {
    return onRequestGet(context);
  }
  if (context.request.method === 'POST') {
    return onRequestPost(context);
  }
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions();
  }

  return Response.json(
    {
      success: false,
      error: `Method ${context.request.method} Not Allowed.`,
    },
    {
      status: 405,
      headers: CORS_HEADERS,
    }
  );
}
