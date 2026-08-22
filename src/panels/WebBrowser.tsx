import { useEffect, useRef, useState } from 'react';
import { ArrowRight, RotateCw, Globe, ShieldAlert, Loader2 } from 'lucide-react';
import { normalizeUrl } from '@/lib/url';
import { proxyUrl } from '@/data';

interface WebBrowserProps {
  url: string;
  onNavigate: (url: string) => void;
}

export default function WebBrowser({ url, onNavigate }: WebBrowserProps) {
  const [draft, setDraft] = useState(url);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const proxied = url ? proxyUrl(url) : '';

  useEffect(() => {
    setDraft(url);
  }, [url]);

  useEffect(() => {
    if (!proxied) return;

    const iframe = iframeRef.current;
    if (!iframe) {
      setError('The page frame is unavailable');
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    fetch(proxied, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Page returned ${response.status}`);
        return response.text();
      })
      .then((fetchedHTMLString) => {
        if (!iframe.contentWindow) throw new Error('The page frame is unavailable');

        // Production keeps the fetched response inside the iframe document.
        // Writing the HTML avoids displaying the response as raw source text.
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(fetchedHTMLString);
        iframe.contentWindow.document.close();
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : 'Could not load this page');
        setLoading(false);
      });

    return () => controller.abort();
  }, [proxied, reloadKey, url]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = normalizeUrl(draft);
    if (!next) return;
    if (next === url) {
      setReloadKey((key) => key + 1);
    } else {
      onNavigate(next);
    }
  };

  return (
    <div className="flex h-full animate-fade-in flex-col">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-surface-pane p-2"
      >
        <button
          type="button"
          onClick={() => setReloadKey((key) => key + 1)}
          disabled={!url}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-surface-elevated hover:text-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="Reload"
        >
          <RotateCw className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface-base px-3">
          <Globe className="h-4 w-4 flex-shrink-0 text-slate-500" />
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Enter a URL, e.g. wikipedia.org"
            className="h-10 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            spellCheck={false}
          />
          {loading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-400" />}
        </div>

        <button
          type="submit"
          className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-600 active:bg-blue-700"
        >
          Go
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="relative mt-3 flex-1 overflow-hidden rounded-xl border border-slate-700/60 bg-surface-pane">
        {proxied ? (
          <>
            <iframe
              ref={iframeRef}
              key={reloadKey}
              title="Web viewer"
              className="h-full w-full bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
            {error && (
              <div className="absolute inset-x-4 top-4 rounded-lg border border-red-400/40 bg-slate-900/95 px-4 py-3 text-sm text-red-200">
                Unable to load this page: {error}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
              <Globe className="h-8 w-8 text-slate-500" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">No page loaded</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Type an address above and press Go, or launch an app from the Library Hub.
            </p>
          </div>
        )}
      </div>

      {url && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldAlert className="h-3.5 w-3.5" />
          Pages load through the proxy bypass. Some sites may still restrict embedding.
        </p>
      )}
    </div>
  );
}
