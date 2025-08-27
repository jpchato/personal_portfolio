import 'dotenv/config'
import { createClient } from '@libsql/client'
import fs from 'fs'

const db = createClient({ url: process.env.TURSO_DB_URL, authToken: process.env.TURSO_DB_TOKEN })

await db.execute(`CREATE TABLE IF NOT EXISTS quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  game TEXT,
  character TEXT,
  source TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);`)
await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotes_game ON quotes(game);`)
await db.execute(`CREATE INDEX IF NOT EXISTS idx_quotes_character ON quotes(character);`)

const file = process.argv[2] || 'seeds/quotes.json'
const items = JSON.parse(fs.readFileSync(file, 'utf8'))
const now = new Date().toISOString()

let added = 0
for (const q of items) {
  await db.execute({
    sql: `INSERT INTO quotes (text, game, character, source, tags, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [String(q.text||'').trim(), q.game||null, q.character||null, q.source||null, JSON.stringify(q.tags||[]), now]
  })
  added++
}
console.log(`Seed complete: added=${added}`)
