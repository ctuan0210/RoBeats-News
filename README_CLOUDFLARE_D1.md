# Cloudflare D1 Database Integration & Setup Guide

This guide explains how to connect and deploy the RoBeats Newsroom application with **Cloudflare D1 Database**.

---

## 1. Prerequisites
- A Cloudflare account ([dash.cloudflare.com](https://dash.cloudflare.com))
- Node.js & npm installed locally
- Cloudflare Wrangler CLI:
  ```bash
  npm install -g wrangler
  ```

---

## 2. Cloudflare D1 Setup Steps

### Step 1: Authenticate with Cloudflare
```bash
wrangler login
```

### Step 2: Create your D1 Database
Create the database named `robeats-d1`:
```bash
wrangler d1 create robeats-d1
```
Output will display your database binding configuration:
```toml
[[d1_databases]]
binding = "DB"
database_name = "robeats-d1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Step 3: Configure `wrangler.toml`
Paste the `database_id` generated from Step 2 into your `wrangler.toml`:
```toml
name = "robeats-d1-api"
main = "cloudflare-worker.js"
compatibility_date = "2024-04-01"

[[d1_databases]]
binding = "DB"
database_name = "robeats-d1"
database_id = "YOUR_DATABASE_ID_HERE"
```

### Step 4: Initialize Database Tables via Direct CLI `--command`

You can execute the table creation SQL directly in your terminal using `--command` without needing any file:

#### Option A: All-in-One Command (creates all 6 tables in a single run)
```bash
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, content TEXT, author TEXT NOT NULL, coverImage TEXT, songs TEXT, tags TEXT, publishedAt TEXT NOT NULL, updatedAt TEXT, comments TEXT, reactions TEXT); CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, mapper TEXT, coverArt TEXT, coverArtEasy TEXT, coverArtNormal TEXT, coverArtHard TEXT, difficulty TEXT, element TEXT, duration TEXT, bpm TEXT, dateAdded TEXT, isCustom INTEGER DEFAULT 0); CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', permissions TEXT, avatar TEXT, bio TEXT, createdAt TEXT); CREATE TABLE IF NOT EXISTS webhooks (category TEXT PRIMARY KEY, url TEXT, template TEXT); CREATE TABLE IF NOT EXISTS ranks (id TEXT PRIMARY KEY, name TEXT NOT NULL, iconUrl TEXT, color TEXT, description TEXT); CREATE TABLE IF NOT EXISTS elements (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, imageUrl TEXT);"
```

#### Option B: Run Table-by-Table
```bash
# 1. Posts table
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, category TEXT NOT NULL, content TEXT, author TEXT NOT NULL, coverImage TEXT, songs TEXT, tags TEXT, publishedAt TEXT NOT NULL, updatedAt TEXT, comments TEXT, reactions TEXT);"

# 2. Songs table (with coverArt per difficulty: Easy, Normal, Hard)
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS songs (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, mapper TEXT, coverArt TEXT, coverArtEasy TEXT, coverArtNormal TEXT, coverArtHard TEXT, difficulty TEXT, element TEXT, duration TEXT, bpm TEXT, dateAdded TEXT, isCustom INTEGER DEFAULT 0);"

# 3. Users table
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, passwordHash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'player', permissions TEXT, avatar TEXT, bio TEXT, createdAt TEXT);"

# 4. Webhooks table
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS webhooks (category TEXT PRIMARY KEY, url TEXT, template TEXT);"

# 5. Ranks table
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS ranks (id TEXT PRIMARY KEY, name TEXT NOT NULL, iconUrl TEXT, color TEXT, description TEXT);"

# 6. Elements table
wrangler d1 execute robeats-d1 --command="CREATE TABLE IF NOT EXISTS elements (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT, imageUrl TEXT);"
```

### Step 5: Deploy the Cloudflare Worker
```bash
wrangler deploy
```
Your Worker API is now live at: `https://robeats-d1-api.<your-subdomain>.workers.dev`

---

## 3. Connecting the Web App to Cloudflare D1

### Method A: Direct Admin Panel Configuration (Instant Auto-Save)
1. Open the RoBeats Web App.
2. Sign in with an Administrator account (`meelo`).
3. Click the **Admin Panel** button in the header.
4. Click on the **Cloudflare D1** tab.
5. Enter:
   - **Account ID**: Found in Cloudflare Dashboard under Overview (right sidebar).
   - **Database ID**: The UUID of your `robeats-d1` database.
   - **Cloudflare API Token**: Created at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) with **D1:Edit** permissions.
6. Toggle **Enable Cloudflare D1 Integration** to ON.
7. Click **Test Connection** to verify live communication.
8. Click **One-Click Sync Local Data to D1** to populate all existing posts, songs, accounts, and ranks.

### Method B: Environment Variables
You can also set these environment variables in `.env`:
```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_DATABASE_ID=your_d1_database_id
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_D1_ENABLED=true
```

---

## 4. API Endpoints & Request Examples

### 1. Posts API
- **Fetch all posts**: `GET /api/news`
  ```bash
  curl https://robeats-d1-api.workers.dev/api/news
  ```
- **Create / Upsert post**: `POST /api/news`
  ```bash
  curl -X POST https://robeats-d1-api.workers.dev/api/news \
    -H "Content-Type: application/json" \
    -d '{
      "id": "post_101",
      "title": "New Song Release!",
      "category": "New song",
      "content": "Check out the newest track in RoBeats!",
      "author": { "name": "Meelo", "role": "admin" },
      "coverImage": "https://example.com/cover.png",
      "songs": []
    }'
  ```

### 2. Songs API (with difficulty-specific cover arts)
- **Fetch songs**: `GET /api/songs`
- **Add custom song**: `POST /api/songs`
  ```bash
  curl -X POST https://robeats-d1-api.workers.dev/api/songs \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Galaxy Collapse",
      "artist": "Kurokotei",
      "mapper": "RoBeats Team",
      "coverArt": "https://example.com/default.png",
      "coverArtEasy": "https://example.com/easy.png",
      "coverArtNormal": "https://example.com/normal.png",
      "coverArtHard": "https://example.com/hard.png",
      "difficulty": { "easy": "12", "normal": "22", "hard": "33" },
      "element": "Void",
      "duration": "2:45",
      "bpm": "240"
    }'
  ```

### 3. Direct SQL Console
- `POST /api/d1/query`
  ```bash
  curl -X POST https://robeats-d1-api.workers.dev/api/d1/query \
    -H "Content-Type: application/json" \
    -d '{ "sql": "SELECT count(*) as total_posts FROM posts;" }'
  ```
