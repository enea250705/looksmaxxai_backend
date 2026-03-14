import type { FaceAnalysis, RateFaceRequestBody } from './types';
import { buildFaceAnalysisPrompt, parseAnalysisResponse } from './prompt';

const MODEL = 'gemini-2.0-flash';
const MAX_TOKENS = 4096;

/**
 * Google Gemini API – free tier, no credit card, vision support.
 * Get key: https://aistudio.google.com/apikey
 */
export async function analyzeFaceGemini(
  apiKey: string,
  body: RateFaceRequestBody
): Promise<FaceAnalysis> {
  const raw = body?.imageBase64;
  if (!raw || typeof raw !== 'string') {
    throw new Error('Missing or invalid imageBase64 in request body');
  }
  const base64 = raw.replace(/^data:image\/\w+;base64,/, '');
  const prompt = buildFaceAnalysisPrompt(body);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64,
              },
            },
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
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text) {
    throw new Error('Gemini returned empty response');
  }
  const responseText = parseAnalysisResponse(text);
  try {
    return JSON.parse(responseText) as FaceAnalysis;
  } catch (e) {
    console.error('Gemini JSON parse error', e);
    console.error('Raw response:', responseText.slice(0, 500));
    throw new Error('Gemini returned invalid JSON');
  }
}
