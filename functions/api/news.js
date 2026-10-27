/**
 * Cloudflare Pages Functions - /api/news
 * Alias for /api/posts to ensure both endpoints return news articles
 */
export { onRequestGet, onRequestPost, onRequestOptions, onRequest } from './posts.js';
