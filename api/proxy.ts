import axios from 'axios';
import type { IncomingMessage, ServerResponse } from 'node:http';

const BLOCKED_RESPONSE_HEADERS = ['x-frame-options', 'content-security-policy'];

export default async function proxyHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const target = requestUrl.searchParams.get('url');

  if (!target) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing url parameter' }));
    return;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error('Unsupported protocol');
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'A valid http or https URL is required' }));
    return;
  }

  try {
    const upstream = await axios.get<string>(targetUrl.toString(), {
      responseType: 'text',
      responseEncoding: 'utf8',
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexusHub/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    // Copy only safe upstream metadata. In particular, remove the policies
    // that would prevent the returned document from being rendered in our
    // same-origin iframe.
    const sanitizedHeaders = { ...upstream.headers };
    for (const header of BLOCKED_RESPONSE_HEADERS) {
      delete sanitizedHeaders[header];
    }

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    for (const [name, value] of Object.entries(sanitizedHeaders)) {
      if (name === 'content-type' || name === 'content-length' || BLOCKED_RESPONSE_HEADERS.includes(name)) continue;
      if (typeof value === 'string') res.setHeader(name, value);
    }
    res.end(upstream.data);
  } catch (error) {
    const status = axios.isAxiosError(error) && error.response?.status ? error.response.status : 502;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Unable to retrieve the requested page' }));
  }
}
