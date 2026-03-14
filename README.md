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
