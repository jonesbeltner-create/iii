import axios from 'axios';
import type { IncomingMessage, ServerResponse } from 'node:http';

const BLOCKED_RESPONSE_HEADERS = ['x-frame-options', 'content-security-policy'];

type ProxyResponse = ServerResponse & {
  send?: (body: string) => void;
};

function sendMarkup(res: ProxyResponse, markup: string): void {
  if (typeof res.send === 'function') {
    res.send(markup);
  } else {
    res.end(markup);
  }
}

/**
 * Resolve the game's npm archive to its GitHub Pages file layout. The
 * jsDelivr package name contains the release version, which must not become
 * part of the GitHub Pages path.
 */
function rewriteJsDelivrTarget(target: string): string {
  const gameArchive = target.match(
    /^https?:\/\/cdn\.jsdelivr\.net\/npm\/gn-math\.github\.io-main@[^/]+(\/.*)?$/i,
  );
  if (gameArchive) {
    const packagePath = gameArchive[1] ?? '/';

    // The npm package is a release bundle assembled from these two public
    // repositories. github.io is not a valid raw asset host, so point each
    // package subdirectory at the repository that actually owns its files.
    if (packagePath === '/zones.json') {
      return 'https://raw.githubusercontent.com/gn-math/assets/main/zones.json';
    }
    if (packagePath.startsWith('/html-main/')) {
      return `https://raw.githubusercontent.com/gn-math/html/main/${packagePath.slice('/html-main/'.length)}`;
    }
  }

  const githubAsset = target.match(
    /^https?:\/\/cdn\.jsdelivr\.net\/gh\/([^/]+)\/([^/@]+)@[^/]+(?:\/(.*))?$/i,
  );
  if (!githubAsset) return target;

  const [, owner, repository, filePath] = githubAsset;
  return `https://raw.githubusercontent.com/${owner}/${repository}/${filePath ?? ''}`;
}

export default async function proxyHandler(
  req: IncomingMessage,
  res: ProxyResponse,
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
    targetUrl = new URL(rewriteJsDelivrTarget(target));
    if (!['http:', 'https:'].includes(targetUrl.protocol)) throw new Error('Unsupported protocol');
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'A valid http or https URL is required' }));
    return;
  }

  try {
    const requestOptions = {
      responseType: 'text' as const,
      responseEncoding: 'utf8' as const,
      timeout: 8000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    };

    let upstream = await axios.get<string>(targetUrl.toString(), requestOptions);

    // Some sites block datacenter IPs even when the request has browser
    // headers. Retry those responses through a second server-side relay.
    if (upstream.status >= 400) {
      const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl.toString())}`;
      upstream = await axios.get<string>(fallbackUrl, requestOptions);
    }

    // Copy only safe upstream metadata. In particular, remove the policies
    // that would prevent the returned document from being rendered in our
    // same-origin iframe.
    const sanitizedHeaders = { ...upstream.headers };
    for (const header of BLOCKED_RESPONSE_HEADERS) {
      delete sanitizedHeaders[header];
    }

    // Always return a document response to the client. If the upstream did
    // not provide a content type, explicitly make it an HTML document.
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    for (const [name, value] of Object.entries(sanitizedHeaders)) {
      if (name === 'content-type' || name === 'content-length' || BLOCKED_RESPONSE_HEADERS.includes(name)) continue;
      if (typeof value === 'string') res.setHeader(name, value);
    }
    sendMarkup(res, upstream.data);
  } catch {
    // A blocked, unavailable, or timed-out upstream should not take down the
    // API process. Return a clean server error instead of a misleading 404.
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    sendMarkup(res, 'Unable to load the requested page.');
  }
}
