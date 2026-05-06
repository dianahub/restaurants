/**
 * Vercel Function — POST /api/chat
 *
 * Proxies chat messages to Claude, keeping ANTHROPIC_API_KEY server-side.
 * Body: { systemPrompt: string, messages: Array<{role, content}> }
 * Response: { text: string }
 *
 * Env: ANTHROPIC_API_KEY (set in Vercel dashboard)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type MessageRole = 'user' | 'assistant';
interface Message {
  role: MessageRole;
  content: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { systemPrompt, messages } = req.body as {
    systemPrompt?: string;
    messages?: Message[];
  };

  if (!systemPrompt || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Missing systemPrompt or messages' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return res.status(200).json({ text });
  } catch (err) {
    console.error('[chat] Claude API error:', err);
    return res.status(500).json({ error: 'AI service unavailable' });
  }
}
