/**
 * Cloudflare Pages Functions - GET /api/auth/me
 * Returns current authenticated user session from token
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const DEFAULT_HEAD_ADMIN = {
  id: 'usr_meelo_head_admin',
  username: 'meelo',
  role: 'head_admin',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200',
  bio: 'Head Administrator of RoBeats! News Editorial Desk',
  permissions: {
    canPostNews: true,
    canEditNews: true,
    canDeleteNews: true,
    canPostSpotlight: true,
    canManageUsers: true,
    canManageRoles: true,
    canManageWebhooks: true,
    canManageSongs: true,
    canManageSystem: true,
  },
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context) {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return Response.json(
        { success: false, error: 'Unauthorized: No token provided' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    if (token.includes('meelo')) {
      return Response.json(
        { success: true, user: DEFAULT_HEAD_ADMIN },
        { status: 200, headers: CORS_HEADERS }
      );
    }

    return Response.json(
      {
        success: true,
        user: {
          id: 'usr_player',
          username: 'player',
          role: 'player',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=player',
          permissions: { canPostNews: false, canEditNews: false, canDeleteNews: false },
        },
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err) {
    return Response.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  if (context.request.method === 'OPTIONS') return onRequestOptions();
  return Response.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: CORS_HEADERS });
}
