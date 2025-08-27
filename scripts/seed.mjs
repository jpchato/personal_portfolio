import fs from 'fs'
import path from 'path'
import 'dotenv/config'
import Database from 'better-sqlite3'

const DATA_DIR = path.resolve('./data')
const DB_PATH = path.join(DATA_DIR, 'quotes.db')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.exec(`
  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    game TEXT,
    character TEXT,
    source TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_quotes_game ON quotes(game);
  CREATE INDEX IF NOT EXISTS idx_quotes_character ON quotes(character);
`)

function nowISO(){ return new Date().toISOString() }

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/seed.mjs seeds/quotes.json')
  process.exit(1)
}
const raw = fs.readFileSync(file, 'utf8')
const items = JSON.parse(raw)

const insert = db.prepare(`
  INSERT INTO quotes (text, game, character, source, tags, created_at)
  VALUES (@text, @game, @character, @source, @tags, @created_at)
`)
const selectDup = db.prepare(`SELECT 1 FROM quotes WHERE text = ? AND IFNULL(game,'') = IFNULL(?, '')`)

let added = 0, skipped = 0
db.transaction(() => {
  for (const q of items) {
    const exists = selectDup.get(q.text, q.game || null)
    if (exists) { skipped++; continue }
    insert.run({
      text: q.text.trim(),
      game: q.game || null,
      character: q.character || null,
      source: q.source || null,
      tags: JSON.stringify(Array.isArray(q.tags) ? q.tags : []),
      created_at: nowISO()
    })
    added++
  }
})()

console.log(`Seed complete: added=${added}, skipped=${skipped}`)
