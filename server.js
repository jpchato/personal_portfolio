// FF Quotes API — Node + Express + SQLite (better-sqlite3)
// --------------------------------------------------------
// Drop this file in your portfolio repo root as `server.js`.
// Requires: npm i express better-sqlite3 dotenv cors
// Start:    node server.js   (or)   npm run dev (see package.json suggestion below)
//
// Env vars (create a .env file next to this file):
//   PORT=5173
//   API_TOKEN=replace-with-a-strong-random-string
//
// Endpoints:
//   GET  /api/health                        -> { ok: true }
//   GET  /api/quotes                        -> list quotes (supports filters/pagination)
//   GET  /api/quotes/random                 -> one random quote (supports filters)
//   POST /api/quotes   (Authorization: Bearer <API_TOKEN>) -> add a quote
//
// Quote fields:
//   id (int), text (string, required), game (string), character (string),
//   source (string, e.g., scene/quest), tags (JSON array, default []), created_at (ISO string)

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const app = express()
app.use(cors())
app.use(express.json({ limit: '256kb' }))

// --- DB setup ---------------------------------------------------------------
const DATA_DIR = path.resolve('./data')
const DB_PATH = path.join(DATA_DIR, 'quotes.db')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS quotes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    text        TEXT    NOT NULL,
    game        TEXT,
    character   TEXT,
    source      TEXT,
    tags        TEXT    NOT NULL DEFAULT '[]', -- JSON array as string
    created_at  TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_quotes_game       ON quotes(game);
  CREATE INDEX IF NOT EXISTS idx_quotes_character  ON quotes(character);
`)

// --- Helpers ---------------------------------------------------------------
function nowISO() {
  return new Date().toISOString()
}

function parseTags(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!process.env.API_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured: API_TOKEN not set' })
  }
  if (token !== process.env.API_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' })
  }
  next()
}

// --- Routes ----------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: nowISO(), db: fs.existsSync(DB_PATH) })
})

// GET /api/quotes?game=FFIX&character=Zidane&tag=funny&limit=20&offset=0
app.get('/api/quotes', (req, res) => {
  const { game, character, tag, q, limit = '20', offset = '0' } = req.query
  const lim = Math.min(Math.max(parseInt(String(limit)) || 20, 1), 100)
  const off = Math.max(parseInt(String(offset)) || 0, 0)

  const where = []
  const params = {}
  if (game) { where.push('game = @game'); params.game = String(game) }
  if (character) { where.push('character = @character'); params.character = String(character) }
  if (tag) { where.push("json_extract(tags_json.value, '$') = @tag") }
  if (q) { where.push('(text LIKE @q OR character LIKE @q OR game LIKE @q)'); params.q = `%${String(q)}%` }

  // Build base query; handle tag filter using JSON1 (via CROSS JOIN)
  let base = 'FROM quotes'
  if (tag) base += ` CROSS JOIN json_each(quotes.tags) AS tags_json` // better-sqlite3 has JSON1
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const total = db.prepare(`SELECT COUNT(*) AS c ${base} ${whereSql}`).get({ ...params, tag: String(tag || '') })?.c || 0
  const rows = db.prepare(`
    SELECT id, text, game, character, source, tags, created_at
    ${base}
    ${whereSql}
    ORDER BY id DESC
    LIMIT @lim OFFSET @off
  `).all({ ...params, tag: String(tag || ''), lim, off })

  // Normalize tags to arrays
  const data = rows.map(r => ({ ...r, tags: parseTags(r.tags) }))
  res.json({ ok: true, total, limit: lim, offset: off, data })
})

// GET /api/quotes/random?game=FFX&character=Tidus
app.get('/api/quotes/random', (req, res) => {
  const { game, character, tag } = req.query
  const where = []
  const params = {}
  if (game) { where.push('game = @game'); params.game = String(game) }
  if (character) { where.push('character = @character'); params.character = String(character) }
  let base = 'FROM quotes'
  if (tag) base += ` CROSS JOIN json_each(quotes.tags) AS tags_json`
  if (tag) where.push("json_extract(tags_json.value, '$') = @tag")
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const row = db.prepare(`
    SELECT id, text, game, character, source, tags, created_at
    ${base}
    ${whereSql}
    ORDER BY RANDOM()
    LIMIT 1
  `).get({ ...params, tag: String(tag || '') })

  if (!row) return res.status(404).json({ ok: false, error: 'No quotes found' })
  res.json({ ok: true, data: { ...row, tags: parseTags(row.tags) } })
})

// POST /api/quotes  (JSON body)
// { text: "...", game: "FFX", character: "Tidus", source: "Chapter 1", tags: ["serious","motivational"] }
app.post('/api/quotes', requireAuth, (req, res) => {
  const { text, game = null, character = null, source = null, tags = [] } = req.body || {}
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'Field "text" is required' })
  }
  const created_at = nowISO()
  const tagsStr = JSON.stringify(Array.isArray(tags) ? tags : [])

  const stmt = db.prepare(`
    INSERT INTO quotes (text, game, character, source, tags, created_at)
    VALUES (@text, @game, @character, @source, @tags, @created_at)
  `)
  const info = stmt.run({ text: text.trim(), game, character, source, tags: tagsStr, created_at })

  res.status(201).json({ ok: true, id: info.lastInsertRowid })
})

// --- Static hosting integration (optional) -------------------------------
// If your portfolio is a static site built with plain HTML/JS/CSS, you can serve it from here as well.
// Uncomment and point to your build/public directory. Example:
// import serveStatic from 'serve-static'
// app.use('/', serveStatic('public'))

// --- Start server ---------------------------------------------------------
const PORT = Number(process.env.PORT || 5173)
app.listen(PORT, () => {
  const tokenPreview = process.env.API_TOKEN ? process.env.API_TOKEN.slice(0, 6) + '…' : 'NOT SET'
  console.log(`[FF Quotes API] listening on http://localhost:${PORT}`)
  console.log(`[FF Quotes API] DB at ${DB_PATH}`)
  console.log(`[FF Quotes API] API_TOKEN prefix: ${tokenPreview}`)
})

// --- Suggested package.json (create this beside server.js) ---------------
// {
//   "name": "ff-quotes-api",
//   "type": "module",
//   "private": true,
//   "scripts": {
//     "dev": "node server.js"
//   },
//   "dependencies": {
//     "better-sqlite3": "^9.6.0",
//     "cors": "^2.8.5",
//     "dotenv": "^16.4.5",
//     "express": "^4.19.2"
//   }
// }
