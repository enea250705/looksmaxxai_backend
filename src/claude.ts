import type { FaceAnalysis, RateFaceRequestBody } from './types';
import { buildFaceAnalysisPrompt, parseAnalysisResponse } from './prompt';

const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 4096;

export async function analyzeFace(
  apiKey: string,
  body: RateFaceRequestBody
): Promise<FaceAnalysis> {
  const raw = body?.imageBase64;
  if (!raw || typeof raw !== 'string') {
    throw new Error('Missing or invalid imageBase64 in request body');
  }
  const base64 = raw.replace(/^data:image\/\w+;base64,/, '');
  const prompt = buildFaceAnalysisPrompt(body);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const json = (await response.json()) as {
    content?: Array<{ text?: string; content?: string }>;
  };
  const text =
    json?.content?.[0]?.text ??
    json?.content?.[0]?.content ??
    '';
  const responseText = parseAnalysisResponse(text);

  try {
    return JSON.parse(responseText) as FaceAnalysis;
  } catch (e) {
    console.error('Claude JSON parse error', e);
    console.error('Raw response:', responseText.slice(0, 500));
    throw new Error('Claude returned invalid JSON');
  }
}
