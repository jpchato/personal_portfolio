# Personal Portfolio

## Overview
This is the personal portfolio of **Jesse Peña**, showcasing projects, professional experience, and a custom **Final Fantasy Quotes** experience powered by a database and API.

---
## What’s inside
- **Home & Projects** — static pages built with HTML/CSS/JS.
- **Final Fantasy Quotes Page** — lets visitors roll a random quote or browse by game, character, tag, and text search.
- **FF Quotes API** — a Node/Express service that serves quotes from a serverless SQLite database (Turso / libSQL).

---
## Architecture (high level)
- **Frontend (static site):**
  - Hosted on **GitHub Pages** at `https://jpchato.github.io/personal_portfolio/`.
  - The quotes page (`pages/ff-quotes.html`) calls the API from the browser.
- **Backend (API):**
  - Node.js + Express, deployed as a **Render Web Service**.
  - Live base URL: `https://personal-portfolio-1jm1.onrender.com` (see `/api/*` routes below).
- **Database (persistence):**
  - **Turso** (serverless SQLite via **libSQL**). The API connects with `@libsql/client`.

### Data model
Table: `quotes`
```
id          INTEGER PRIMARY KEY AUTOINCREMENT
text        TEXT    NOT NULL
game        TEXT
character   TEXT
source      TEXT
tags        TEXT    NOT NULL DEFAULT '[]'   -- JSON array, stored as string
created_at  TEXT    NOT NULL                -- ISO timestamp
```

### How the API queries work
- **Filtering** supports `game`, `character`, `tag`, and full‑text **q** (LIKE on `text`, `character`, `game`).
- **Tag filter** uses SQLite/SQL JSON functions (via libSQL) to match values inside the `tags` JSON array.
- **Random** uses `ORDER BY RANDOM() LIMIT 1` with any filters you pass.
- **Pagination** via `limit` (1–100) and `offset`.

### Security & hardening
- **Writes protected**: `POST /api/quotes` requires `Authorization: Bearer <API_TOKEN>`.
- **Rate limiting**: production limits write attempts (default **20 requests / 10 minutes per token/IP**). Exceeding returns HTTP `429`.
- **CORS**: explicitly allows your dev and production origins only.
- **Proxy trust**: Express trusts the hosting proxy so client IPs are accurate.

---
## Technologies
- **Frontend:** HTML, CSS, vanilla JS (with a light FF‑menu vibe).
- **Backend:** Node.js + Express.
- **Database:** Turso (libSQL / serverless SQLite) via `@libsql/client`.
- **Hosting:** GitHub Pages (frontend) + Render (API).

---
## Local development
### Prerequisites
- Node 18+ and npm

### Setup
1) Clone and enter the repo:
```sh
git clone https://github.com/jpchato/personal_portfolio.git
cd personal_portfolio
```

2) Create `.env` in the repo root:
```env
PORT=5173
API_TOKEN=replace-with-a-strong-secret
TURSO_DB_URL=libsql://<your-db>.turso.io
TURSO_DB_TOKEN=<your-turso-token>
```

3) Install and run the API locally:
```sh
npm install
npm run dev
# API: http://localhost:5173
```

4) Serve the static site locally (any static server works). For example:
```sh
# Python
python -m http.server 5500
# Site: http://localhost:5500
```

> The quotes page autodetects dev vs prod and points to the right API base.

### Seeding quotes (Turso / libSQL)
If you have seed files, use the provided script:
```sh
# seeds/quotes.json and/or seeds/extra-quotes.json
npm run seed:libsql -- seeds/quotes.json
npm run seed:libsql -- seeds/extra-quotes.json
```
Common sanity checks:
```sh
curl http://localhost:5173/api/health
curl http://localhost:5173/api/quotes?limit=5
curl http://localhost:5173/api/quotes/random
```

---
## API
Base URL (prod): `https://personal-portfolio-1jm1.onrender.com/api`

### Endpoints
- `GET /health` — health check
- `GET /quotes` — list with filters & pagination
  - query params: `game`, `character`, `tag`, `q`, `limit`, `offset`
- `GET /quotes/random` — one random quote (supports same filters)
- `POST /quotes` — add quote (requires `Authorization: Bearer <API_TOKEN>`)
  - body: `{ text, game?, character?, source?, tags?[] }`

### Examples
```sh
# list
curl "https://personal-portfolio-1jm1.onrender.com/api/quotes?limit=3"

# random with filter
curl "https://personal-portfolio-1jm1.onrender.com/api/quotes/random?game=FFXVI"

# add quote (authorized)
TOKEN=your-strong-secret
curl -X POST "https://personal-portfolio-1jm1.onrender.com/api/quotes" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "text": "A smile better suits a hero.",
    "game": "FFXIV",
    "character": "Haurchefant Greystone",
    "source": "The Vault",
    "tags": ["ff14","heavensward"]
  }'
```

---
## Deployment notes
### Frontend (GitHub Pages)
- Deploys from the repository `gh-pages` or main branch per your Pages settings.
- The quotes page points to the live API when not on `localhost`.

### API (Render Web Service)
- **Build:** `npm install`
- **Start:** `node server.js`
- **Health check path:** `/api/health`
- **Environment variables:**
  - `NODE_ENV=production`
  - `API_TOKEN=<your secret>`
  - `TURSO_DB_URL=libsql://<your-db>.turso.io`
  - `TURSO_DB_TOKEN=<your token>`

If you add dependencies or change build behavior, push to Git. Render automatically **redeploys** on new commits (or click **Manual Deploy → Clear build cache & deploy** for a fresh install).

---
## Acknowledgments
This portfolio and the FF Quotes system were built with **ChatGPT (GPT‑5 Thinking)** as a key facilitator for:
- Architectural design (frontend ↔ API ↔ Turso), environment setup, and CORS strategy.
- Implementing the **Node/Express API**, database schema, and query logic (filters, random, pagination).
- Integrating **Turso / libSQL** and preparing seeding scripts.
- Adding **rate limiting** and production‑safe defaults.
- Deploying to **Render** and wiring the static site to the live API.

---
## License
MIT License.
