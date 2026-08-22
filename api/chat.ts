import axios from 'axios';
import type { IncomingMessage, ServerResponse } from 'node:http';

type ChatResponse = ServerResponse & { send?: (body: string) => void };
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

function sendJson(res: ChatResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const payload = JSON.stringify(body);
  if (typeof res.send === 'function') res.send(payload);
  else res.end(payload);
}

export default async function chatHandler(req: IncomingMessage, res: ChatResponse): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      apiKey?: string;
      messages?: ChatMessage[];
    };
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const apiKey = body.apiKey?.trim() || process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
      sendJson(res, 200, {
        content: `Mock response: I received your question${latestUserMessage ? ` about “${latestUserMessage.content}”` : ''}. Add an OpenRouter API key to enable live answers.`,
        mock: true,
      });
      return;
    }

    const upstream = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      { model: 'openrouter/free', messages },
      {
        timeout: 8000,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      },
    );
    sendJson(res, 200, { content: upstream.data?.choices?.[0]?.message?.content ?? '', mock: false });
  } catch {
    sendJson(res, 200, {
      content: 'I could not reach the AI service right now. Please check your key or try again shortly.',
      mock: true,
    });
  }
}
