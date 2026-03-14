/**
 * Cloudflare Worker: same API as Node backend (GET /health, POST /rate-face).
 * Uses Gemini only. Set GEMINI_API_KEY in Worker secrets/vars.
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const MAX_TOKENS = 4096;

function buildPrompt(ctx) {
  return `You are a brutally honest but constructive looksmaxxing analyst. Analyze the SINGLE HUMAN FACE in the attached image.

User context:
- Age: ${ctx.age ?? 'unknown'}
- Gender: ${ctx.gender ?? 'unknown'}
- Goal: ${ctx.goal ?? 'general maxxing'}

Return STRICT JSON ONLY. No markdown, no code fences, no extra text. Valid JSON that parses with JSON.parse().

Use this exact structure (all keys required):

{
  "overall": {
    "psl_score": <number 1.0-10.0, realistic for average person usually 2.5-7.5>,
    "tier_label": "<e.g. Low-Tier Normie | High-Tier Normie | Chad Lite | Elite>",
    "potential_score": <number 1.0-10.0, realistic maxxing potential>
  },
  "regions": {
    "eyes": {
      "score": <number>,
      "canthal_tilt": { "label": "positive"|"neutral"|"negative", "degrees": <number> },
      "hooding": "<string>",
      "spacing": "<string>",
      "notes": ["<savage short line>", ...]
    },
    "midface": { "score": <number>, "ratio": "<string>", "projection": "<string>", "compactness": "<string>", "notes": ["<string>", ...] },
    "lower_third": { "score": <number>, "jaw_angle_degrees": <number>, "chin_projection": "<string>", "mandible_definition": "<string>", "notes": ["<string>", ...] },
    "cheekbones": { "score": <number>, "projection": "<string>", "notes": ["<string>", ...] },
    "symmetry": { "score": <number>, "overall": "<string>", "notes": ["<string>", ...] },
    "skin": { "score": <number>, "issues": ["<string>", ...], "notes": ["<string>", ...] },
    "hair": { "score": <number>, "hairline": "<string>", "density": "<string>", "notes": ["<string>", ...] },
    "dimorphism": { "score": <number>, "label": "<string>", "notes": ["<string>", ...] }
  },
  "summary": {
    "brutal_summary": ["<3-6 savage short lines>"],
    "maxxing_suggestions": ["<5-10 practical suggestions>"]
  }
}

Rules:
- Be realistic and slightly harsh. Do not hand out 9s and 10s casually.
- Use looksmaxxing slang but no slurs or harassment.
- Output ONLY the JSON object.`;
}

function parseAnalysisResponse(raw) {
  let text = raw.trim();
  const codeMatch = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/m);
  if (codeMatch) text = codeMatch[1].trim();
  return text;
}

function corsHeaders(origin) {
  const o = origin || '*';
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(body, status = 200, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

async function rateFace(request, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      { error: 'Set GEMINI_API_KEY in Worker Variables/Secrets' },
      503,
      request.headers.get('Origin')
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      { error: 'Invalid JSON body' },
      400,
      request.headers.get('Origin')
    );
  }

  const imageBase64 = body?.imageBase64;
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return jsonResponse(
      { error: 'Missing or invalid imageBase64 (string required)' },
      400,
      request.headers.get('Origin')
    );
  }

  const base64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const prompt = buildPrompt({
    imageBase64,
    age: body.age,
    gender: body.gender,
    goal: body.goal,
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inline_data: { mime_type: 'image/jpeg', data: base64 } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: MAX_TOKENS,
        temperature: 0.5,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return jsonResponse(
      { error: `Gemini API error ${res.status}: ${errText.slice(0, 200)}` },
      502,
      request.headers.get('Origin')
    );
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    return jsonResponse(
      { error: 'Gemini returned empty response' },
      502,
      request.headers.get('Origin')
    );
  }

  const parsed = parseAnalysisResponse(text);
  let analysis;
  try {
    analysis = JSON.parse(parsed);
  } catch {
    return jsonResponse(
      { error: 'Gemini returned invalid JSON' },
      502,
      request.headers.get('Origin')
    );
  }

  return jsonResponse(analysis, 200, request.headers.get('Origin'));
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const isHealth = path === '/health' && request.method === 'GET';
    const isRateFace = path === '/rate-face' && request.method === 'POST';

    if (isHealth) {
      return jsonResponse({
        ok: true,
        service: 'looksmaxxai-backend',
        provider: env.GEMINI_API_KEY ? 'Gemini' : 'none',
      }, 200, origin);
    }

    if (isRateFace) {
      return rateFace(request, env);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
