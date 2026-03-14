# LooksMaxx AI Backend

Rate-face API: app sends a base64 image + optional context; backend returns detailed PSL analysis (overall score, regions, brutal summary, maxxing suggestions). Supports **free** and paid vision APIs.

## Setup

1. **Install dependencies**
   ```bash
   cd backend && npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set **one** of (first set wins):

   | Variable | Free? | Get key |
   |----------|-------|---------|
   | `GEMINI_API_KEY` | Yes, no card | [Google AI Studio](https://aistudio.google.com/apikey) |
   | `GROQ_API_KEY` | Yes, no card | [Groq Console](https://console.groq.com) |
   | `ANTHROPIC_API_KEY` | Trial / paid | [Anthropic Console](https://console.anthropic.com) |

   Optional: `PORT` (default 3000).

3. **Run**
   - Development: `npm run dev`
   - Production: `npm run build && npm start`

## Endpoints

- `GET /health` – returns `{ ok: true }`
- `POST /rate-face` – body: `{ imageBase64: string, age?: string, gender?: string, goal?: string }`  
  Returns the full `FaceAnalysis` JSON (overall score, regions, summary).

## App configuration

- **Local (same machine):** App uses `http://localhost:3000` by default (see `app.json` → `extra.API_URL`).
- **Phone/emulator:** Use your computer’s LAN IP, e.g. `http://192.168.1.100:3000`. Override via `app.config.js` and `EXPO_PUBLIC_API_URL`, or set `extra.API_URL` in `app.json` before building.
- **Production:** Deploy this backend (e.g. Railway, Render, Fly.io) and set the app’s `API_URL` to your deployed URL.

## Deploy on Render

1. New **Web Service** → connect repo `looksmaxxai_backend`.
2. **Root Directory:** leave **empty** (must be blank so `dist/` and `run.js` are at project root).
3. **Build Command:** `npm install && npm run build`
4. **Start Command:** `node run.js` (or `npm start`)
5. **Environment:** add `GEMINI_API_KEY` (or `GROQ_API_KEY` / `ANTHROPIC_API_KEY`). Optionally `PORT`.
6. Deploy. Your API URL will be like `https://looksmaxxai-backend.onrender.com`.

- **If you use Root Directory `src`:** set Start Command to `node run.js` (this uses `src/run.js`, which loads `../dist/index.js`).
- **If Root Directory is empty:** set Start Command to `node run.js` (uses root `run.js`).

---

## Deploy on Railway (recommended alternative)

1. Go to [railway.app](https://railway.app) → **Start a New Project** → **Deploy from GitHub repo**.
2. Select **looksmaxxai_backend** (or connect the repo).
3. Railway detects Node and uses **Build:** `npm install && npm run build`, **Start:** `npm start` (or `node run.js`). No Root Directory to worry about.
4. **Variables:** add `GEMINI_API_KEY` (or `GROQ_API_KEY` / `ANTHROPIC_API_KEY`). Optionally `PORT`.
5. Deploy. Your API URL is shown in the service (e.g. `https://xxx.up.railway.app`). Set the app’s `EXPO_PUBLIC_API_URL` to this URL.

---

## Deploy with Docker (Railway, Fly.io, any host)

The repo includes a **Dockerfile**. Use it on any platform that runs Docker:

- **Railway:** Same as above; if you add a Dockerfile, Railway can use it instead of Nixpacks.
- **Fly.io:** Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/), then:
  ```bash
  cd backend
  fly launch   # create app, follow prompts
  fly secrets set GEMINI_API_KEY=your_key_here
  fly deploy
  ```
  Your URL: `https://<app-name>.fly.dev`.
- **Other (e.g. VPS, Cloud Run):** Build and run:
  ```bash
  docker build -t looksmaxxai-backend .
  docker run -p 3000:3000 -e GEMINI_API_KEY=your_key looksmaxxai-backend
  ```

---

## Other options

- **Vercel:** Use the [Vercel Node server](https://vercel.com/docs/functions/serverless-functions/runtimes#node.js) or a single serverless function that proxies to your logic; requires a small adapter.
- **DigitalOcean App Platform:** Connect the GitHub repo, set build/start to `npm run build` and `npm start`, add env vars.
- **Koyeb / Cyclic:** Connect repo, set build and start commands, add env vars (same as Railway).

---

## Deploy on Cloudflare (Worker, not Pages)

Cloudflare **Pages** expects static files, so the Node backend is not suitable for Pages. Use a **Worker** instead.

1. In this repo there is a **`worker/`** folder with a Cloudflare Worker that implements the same API (Gemini only).
2. From your machine:
   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY   # paste your key
   npx wrangler deploy
   ```
3. Your API URL will be like `https://looksmaxxai-backend.<subdomain>.workers.dev`. Set the app’s `EXPO_PUBLIC_API_URL` to this URL.

See **`worker/README.md`** for details. Do **not** deploy the backend repo as Cloudflare **Pages**; use the Worker from the `worker` folder.
