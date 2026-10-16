-- Cloudflare D1 Database Schema for RoBeats Newsroom
-- Execute with: wrangler d1 execute robeats-d1 --file=./schema.sql

-- 1. Posts Table
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

-- 2. Songs Table (with difficulty-specific cover arts)
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

-- 3. Users & Accounts Table
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

-- 4. Discord Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
  category TEXT PRIMARY KEY,
  url TEXT,
  template TEXT
);

-- 5. RoBeats Player Ranks Table
CREATE TABLE IF NOT EXISTS ranks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  iconUrl TEXT,
  color TEXT,
  description TEXT
);

-- 6. Song Elements Table
CREATE TABLE IF NOT EXISTS elements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  imageUrl TEXT
);
