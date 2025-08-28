// FF Quotes API — Node + Express + Turso (libsql)
// --------------------------------------------------------
// Drop this file in your repo root as `server.js`.
// Switches from local SQLite (better-sqlite3) to serverless SQLite via Turso.
//
// Install deps:
//   npm i express cors dotenv @libsql/client
// Remove old native dep (optional):
//   npm uninstall better-sqlite3
//
// .env (both local and on your host):
//   PORT=5173                     # local dev only; hosts set this automatically
//   API_TOKEN=change-me-please    # for POST /api/quotes
//   TURSO_DB_URL=libsql://<your-db>.turso.io
//   TURSO_DB_TOKEN=<token>

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@libsql/client'
import rateLimit from 'express-rate-limit'

const app = express()
app.set('trust proxy', 1) // ensure correct client IPs behind Render/other proxies
app.use(express.json({ limit: '256kb' }))
const IS_PROD = process.env.NODE_ENV === 'production'

// --- CORS: allow your dev + prod origins ----------------------------------
const allowed = new Set([
  'http://localhost:5500',              // your local static server
  'http://127.0.0.1:5500',
  'http://localhost:5173',              // if you serve static via node
  'https://jpchato.github.io',          // GitHub Pages root
  // 'https://<your-custom-domain>'      // add later if you have one
])
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.has(origin)) return cb(null, true)
    return cb(new Error('Not allowed by CORS: ' + origin))
  },
}))

// --- Rate limiting ----------------------------------------------------------
// Limit write attempts (including unauthorized ones) to protect the API
const postLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,           // 10 minutes
  max: IS_PROD ? 20 : 0,              // disable in dev; 20 per 10 min in prod
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests, please slow down.' },
  handler: (req, res) => {
    if (!IS_PROD) console.warn('Rate limit hit:', req.ip, req.path)
    res.status(429).json({ ok: false, error: 'Too many requests' })
  },
  // Bucket by Authorization token if present, else by IP
  keyGenerator: (req) => (req.headers.authorization || req.ip)
})

// --- DB client (Turso/libSQL) ---------------------------------------------
if (!process.env.TURSO_DB_URL || !process.env.TURSO_DB_TOKEN) {
  console.warn('[FF Quotes API] Missing TURSO_DB_URL or TURSO_DB_TOKEN in env')
}
const db = createClient({
  url: process.env.TURSO_DB_URL,
  authToken: process.env.TURSO_DB_TOKEN,
})

// Ensure schema exists
await db.execute(`
  CREATE TABLE IF NOT EXISTS quotes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    text        TEXT    NOT NULL,
    game        TEXT,
    character   TEXT,
    source      TEXT,
    tags        TEXT    NOT NULL DEFAULT '[]',
    created_at  TEXT    NOT NULL
  );
`)
await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotes_game      ON quotes(game);`)
await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotes_character ON quotes(character);`)

// --- Helpers ---------------------------------------------------------------
function nowISO() { return new Date().toISOString() }
function parseTags(v) { if (!v) return []; try { return JSON.parse(v) } catch { return [] } }
function like(s) { return `%${String(s)}%` }

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
app.get('/api/health', async (_req, res) => {
  try {
    await db.execute('SELECT 1 as ok')
    res.json({ ok: true, time: nowISO(), db: true })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// GET /api/quotes?game=FFIX&character=Zidane&tag=funny&q=help&limit=20&offset=0
app.get('/api/quotes', async (req, res) => {
  try {
    const { game, character, tag, q, limit = '20', offset = '0' } = req.query
    const lim = Math.min(Math.max(parseInt(String(limit)) || 20, 1), 100)
    const off = Math.max(parseInt(String(offset)) || 0, 0)

    let base = 'FROM quotes'
    const where = []
    const args = []

    if (game)      { where.push('game = ?');           args.push(String(game)) }
    if (character) { where.push('character = ?');      args.push(String(character)) }
    if (tag)       { base += ' CROSS JOIN json_each(quotes.tags) AS je'; where.push('je.value = ?'); args.push(String(tag)) }
    if (q)         { where.push('(text LIKE ? OR character LIKE ? OR game LIKE ?)'); args.push(like(q), like(q), like(q)) }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const totalRes = await db.execute({ sql: `SELECT COUNT(*) AS c ${base} ${whereSql}`, args })
    const total = Number(totalRes.rows?.[0]?.c || 0)

    const rowsRes = await db.execute({
      sql: `SELECT id, text, game, character, source, tags, created_at
            ${base}
            ${whereSql}
            ORDER BY id DESC
            LIMIT ? OFFSET ?`,
      args: [...args, lim, off],
    })

    const data = (rowsRes.rows || []).map(r => ({ ...r, tags: parseTags(r.tags) }))
    res.json({ ok: true, total, limit: lim, offset: off, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// GET /api/quotes/random?game=FFX&character=Tidus&tag=motivational
app.get('/api/quotes/random', async (req, res) => {
  try {
    const { game, character, tag } = req.query

    let base = 'FROM quotes'
    const where = []
    const args = []

    if (game)      { where.push('game = ?');      args.push(String(game)) }
    if (character) { where.push('character = ?'); args.push(String(character)) }
    if (tag)       { base += ' CROSS JOIN json_each(quotes.tags) AS je'; where.push('je.value = ?'); args.push(String(tag)) }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const r = await db.execute({
      sql: `SELECT id, text, game, character, source, tags, created_at
            ${base}
            ${whereSql}
            ORDER BY RANDOM()
            LIMIT 1`,
      args,
    })

    const row = r.rows?.[0]
    if (!row) return res.status(404).json({ ok: false, error: 'No quotes found' })

    res.json({ ok: true, data: { ...row, tags: parseTags(row.tags) } })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// POST /api/quotes  (auth required)
app.post('/api/quotes', postLimiter, requireAuth, async (req, res) => {
  try {
    const { text, game = null, character = null, source = null, tags = [] } = req.body || {}
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ ok: false, error: 'Field "text" is required' })
    }
    const created_at = nowISO()
    const tagsStr = JSON.stringify(Array.isArray(tags) ? tags : [])

    const result = await db.execute({
      sql: `INSERT INTO quotes (text, game, character, source, tags, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [text.trim(), game, character, source, tagsStr, created_at],
    })

    const id = Number(result.lastInsertRowid || 0)
    res.status(201).json({ ok: true, id })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) })
  }
})

// --- Start server ---------------------------------------------------------
const PORT = Number(process.env.PORT || 5173)
app.listen(PORT, () => {
  const tokenPreview = process.env.API_TOKEN ? process.env.API_TOKEN.slice(0, 6) + '…' : 'NOT SET'
  console.log(`[FF Quotes API] listening on http://localhost:${PORT}`)
  console.log(`[FF Quotes API] TURSO_DB_URL: ${process.env.TURSO_DB_URL ? 'set' : 'MISSING'}`)
  console.log(`[FF Quotes API] API_TOKEN prefix: ${tokenPreview}`)
})
