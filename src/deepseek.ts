import type { FaceAnalysis, RateFaceRequestBody } from './types';
import { buildFaceAnalysisPrompt, parseAnalysisResponse } from './prompt';

const MAX_TOKENS = 4096;

/**
 * DeepSeek: OpenAI-compatible chat/completions with image in message content.
 * Official endpoint: https://api.deepseek.com/chat/completions (no /v1).
 */
export async function analyzeFaceDeepSeek(
  apiKey: string,
  body: RateFaceRequestBody
): Promise<FaceAnalysis> {
  const raw = body?.imageBase64;
  if (!raw || typeof raw !== 'string') {
    throw new Error('Missing or invalid imageBase64 in request body');
  }
  const base64 = raw.replace(/^data:image\/\w+;base64,/, '');
  const prompt = buildFaceAnalysisPrompt(body);

  // 1) Official endpoint (no /v1): https://api.deepseek.com/chat/completions
  const chatRes = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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

  if (!chatRes.ok) {
    const errText = await chatRes.text();
    throw new Error(`DeepSeek API error ${chatRes.status}: ${errText}`);
  }

  const chatJson = (await chatRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = chatJson.choices?.[0]?.message?.content ?? '';
  if (!text) {
    throw new Error('DeepSeek returned empty response');
  }
  const responseText = parseAnalysisResponse(text);
  try {
    return JSON.parse(responseText) as FaceAnalysis;
  } catch (e) {
    console.error('DeepSeek JSON parse error', e);
    console.error('Raw response:', responseText.slice(0, 500));
    throw new Error('DeepSeek returned invalid JSON');
  }
}
