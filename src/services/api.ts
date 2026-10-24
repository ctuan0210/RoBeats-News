import { Article, Song, ElementConfig, RankConfig, DiscordWebhooksConfig, Comment } from '../types';
import { safeJson } from '../utils/safeJson';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('robeats_token') || localStorage.getItem('robeats_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchNewsArticles(): Promise<Article[]> {
  const res = await fetch('/api/news');
  if (!res.ok) throw new Error('Failed to fetch articles');
  return safeJson(res, []);
}

export async function fetchArticleById(id: string): Promise<Article> {
  const res = await fetch(`/api/news/${id}`);
  if (!res.ok) throw new Error('Failed to fetch article');
  return safeJson(res, null as any);
}

export async function saveArticle(article: Partial<Article>, id?: string): Promise<Article> {
  const url = id ? `/api/news/${id}` : '/api/news';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(article),
  });
  if (!res.ok) {
    const err = await safeJson(res, {});
    throw new Error(err?.error || 'Failed to save article');
  }
  return safeJson(res, null as any);
}

export async function deleteArticle(id: string): Promise<void> {
  const res = await fetch(`/api/news/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete article');
}

export async function publishToDiscord(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/news/${id}/publish-webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
  });
  const data = await safeJson(res, {});
  if (!res.ok) throw new Error(data?.error || 'Failed to trigger Discord webhook');
  return data;
}

export async function addComment(postId: string, content: string): Promise<Comment> {
  const res = await fetch(`/api/news/${postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const err = await safeJson(res, {});
    throw new Error(err?.error || 'Failed to post comment');
  }
  return safeJson(res, null as any);
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const res = await fetch(`/api/news/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete comment');
}

export async function fetchSongsList(): Promise<Song[]> {
  const res = await fetch('/api/songs');
  if (!res.ok) throw new Error('Failed to fetch songs');
  return safeJson(res, []);
}

export async function saveSong(song: Partial<Song>, id?: string): Promise<Song> {
  const url = id ? `/api/songs/${id}` : '/api/songs';
  const method = id ? 'PUT' : 'POST';
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(song),
  });
  if (!res.ok) throw new Error('Failed to save song');
  return safeJson(res, null as any);
}

export async function deleteSong(id: string): Promise<void> {
  const res = await fetch(`/api/songs/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to delete song');
}

export async function fetchElementsList(): Promise<ElementConfig[]> {
  const res = await fetch('/api/elements');
  if (!res.ok) throw new Error('Failed to fetch elements');
  return safeJson(res, []);
}

export async function updateElementsList(elements: ElementConfig[]): Promise<void> {
  const res = await fetch('/api/elements', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(elements),
  });
  if (!res.ok) throw new Error('Failed to update elements');
}

export async function fetchRanksList(): Promise<RankConfig[]> {
  const res = await fetch('/api/ranks');
  if (!res.ok) throw new Error('Failed to fetch ranks');
  return safeJson(res, []);
}

export async function updateRanksList(ranks: RankConfig[]): Promise<void> {
  const res = await fetch('/api/admin/ranks', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(ranks),
  });
  if (!res.ok) throw new Error('Failed to update ranks');
}

export async function fetchDiscordWebhooks(): Promise<DiscordWebhooksConfig> {
  const res = await fetch('/api/admin/webhooks', {
    headers: getAuthHeader(),
  });
  if (!res.ok) throw new Error('Failed to fetch webhooks');
  return safeJson(res, {} as any);
}

export async function updateDiscordWebhooks(config: DiscordWebhooksConfig): Promise<void> {
  const res = await fetch('/api/admin/webhooks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update webhooks');
}

export async function generateAiImage(prompt: string, aspectRatio = '16:9'): Promise<{ imageUrl: string }> {
  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    },
    body: JSON.stringify({ prompt, aspectRatio }),
  });
  if (!res.ok) throw new Error('Failed to generate image');
  return safeJson(res, { imageUrl: '' });
}
