import path from 'path';
import fs from 'fs';

// Load .env from backend folder (same folder as package.json), regardless of cwd
const backendDir = path.resolve(__dirname, '..');
const envPath = path.join(backendDir, '.env');
if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf-8');
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1); // strip BOM
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key) process.env[key] = value;
  }
}

import express from 'express';
import cors from 'cors';
import { analyzeFace } from './claude';
import { analyzeFaceGemini } from './gemini';
import { analyzeFaceGroq } from './groq';

const app = express();
const PORT = process.env.PORT ?? 3000;
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY ?? '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY ?? '').trim();
const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY ?? '').trim();

// Prefer free vision APIs first: Gemini → Groq → Anthropic
const ACTIVE_PROVIDER = GEMINI_API_KEY ? 'Gemini' : GROQ_API_KEY ? 'Groq' : ANTHROPIC_API_KEY ? 'Anthropic' : null;

// Log which keys were loaded (so you can see why a provider was chosen)
console.log('Env from:', envPath);
console.log('Keys: GEMINI=' + (GEMINI_API_KEY ? 'set' : '-') + ' GROQ=' + (GROQ_API_KEY ? 'set' : '-') + ' ANTHROPIC=' + (ANTHROPIC_API_KEY ? 'set' : '-'));
if (!ACTIVE_PROVIDER) {
  console.warn('No API key found. Set one in .env: GEMINI_API_KEY (free) | GROQ_API_KEY (free) | ANTHROPIC_API_KEY');
}

app.use(cors());
app.use(express.json({ limit: '15mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'looksmaxxai-backend', provider: ACTIVE_PROVIDER ?? 'none' });
});

app.post('/rate-face', async (req, res) => {
  if (!ACTIVE_PROVIDER) {
    return res.status(503).json({
      error: 'Set GEMINI_API_KEY (free), GROQ_API_KEY (free), or ANTHROPIC_API_KEY in .env',
    });
  }

  const { imageBase64, age, gender, goal } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({
      error: 'Missing or invalid imageBase64 (string required)',
    });
  }

  const body = { imageBase64, age, gender, goal };

  const isQuotaError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err);
    return /429|quota|RESOURCE_EXHAUSTED|rate limit/i.test(msg);
  };

  let lastError: unknown = null;

  if (GEMINI_API_KEY) {
    try {
      const analysis = await analyzeFaceGemini(GEMINI_API_KEY, body);
      return res.json(analysis);
    } catch (e) {
      lastError = e;
      if (!isQuotaError(e)) {
        console.error('rate-face error (Gemini)', e instanceof Error ? e.message : e);
        return res.status(500).json({ error: e instanceof Error ? e.message : 'Analysis failed' });
      }
      console.warn('Gemini quota exceeded, trying fallback...');
    }
  }

  if (GROQ_API_KEY) {
    try {
      const analysis = await analyzeFaceGroq(GROQ_API_KEY, body);
      return res.json(analysis);
    } catch (e) {
      lastError = e;
      if (!isQuotaError(e)) {
        console.error('rate-face error (Groq)', e instanceof Error ? e.message : e);
        return res.status(500).json({ error: e instanceof Error ? e.message : 'Analysis failed' });
      }
      console.warn('Groq quota exceeded, trying fallback...');
    }
  }

  if (ANTHROPIC_API_KEY) {
    try {
      const analysis = await analyzeFace(ANTHROPIC_API_KEY, body);
      return res.json(analysis);
    } catch (e) {
      lastError = e;
      console.error('rate-face error (Anthropic)', e instanceof Error ? e.message : e);
      return res.status(500).json({ error: e instanceof Error ? e.message : 'Analysis failed' });
    }
  }

  const msg = lastError instanceof Error ? lastError.message : 'Analysis failed';
  console.error('rate-face error', msg);
  const hint = !GROQ_API_KEY && !ANTHROPIC_API_KEY
    ? ' Add GROQ_API_KEY or ANTHROPIC_API_KEY in .env for fallback when Gemini quota is exceeded.'
    : '';
  res.status(503).json({
    error: `Quota exceeded.${hint} Retry later or add another API key.`,
  });
});

app.listen(PORT, () => {
  console.log(`LooksMaxx AI backend listening on http://localhost:${PORT}`);
  if (ACTIVE_PROVIDER) {
    console.log(`Using provider: ${ACTIVE_PROVIDER}`);
  } else {
    console.warn('WARNING: Set GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY in .env to enable /rate-face.');
  }
});
