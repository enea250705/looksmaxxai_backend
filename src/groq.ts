import type { FaceAnalysis, RateFaceRequestBody } from './types';
import { buildFaceAnalysisPrompt, parseAnalysisResponse } from './prompt';

const MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const MAX_TOKENS = 4096;

/**
 * Groq API – free tier, Llama 4 vision. Get key: https://console.groq.com
 * OpenAI-compatible; supports image_url in messages.
 */
export async function analyzeFaceGroq(
  apiKey: string,
  body: RateFaceRequestBody
): Promise<FaceAnalysis> {
  const raw = body?.imageBase64;
  if (!raw || typeof raw !== 'string') {
    throw new Error('Missing or invalid imageBase64 in request body');
  }
  const base64 = raw.replace(/^data:image\/\w+;base64,/, '');
  const prompt = buildFaceAnalysisPrompt(body);

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const chatJson = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = chatJson.choices?.[0]?.message?.content ?? '';
  if (!text) {
    throw new Error('Groq returned empty response');
  }
  const responseText = parseAnalysisResponse(text);
  try {
    return JSON.parse(responseText) as FaceAnalysis;
  } catch (e) {
    console.error('Groq JSON parse error', e);
    console.error('Raw response:', responseText.slice(0, 500));
    throw new Error('Groq returned invalid JSON');
  }
}
