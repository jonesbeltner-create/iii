export type PanelId = 'library' | 'browser' | 'companion';

export interface AppCard {
  id: string;
  title: string;
  description: string;
  emoji: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface GameItem {
  id: number;
  name: string;
  cover: string;
  url: string;
  author?: string;
}

export type BrowserContent =
  | { kind: 'url'; url: string }
  | { kind: 'game'; html: string; title: string; displayUrl: string };

export const APP_CARDS: AppCard[] = [
  {
    id: 'chess',
    title: 'Chess',
    description: 'Play live matches and puzzles against players worldwide.',
    emoji: '♟️',
    url: 'https://www.chess.com',
  },
  {
    id: 'wikipedia',
    title: 'Wikipedia',
    description: 'The free encyclopedia at your fingertips for any topic.',
    emoji: '📚',
    url: 'https://www.wikipedia.org',
  },
  {
    id: 'google-images',
    title: 'Google Images',
    description: 'Search millions of photos, diagrams and illustrations.',
    emoji: '🖼️',
    url: 'https://images.google.com',
  },
];

export const GAMES_BASE = 'https://cdn.jsdelivr.net/npm/gn-math.github.io-main@1.0.5';
export const GAMES_HTML_URL = `${GAMES_BASE}/html-main`;
export const GAMES_ZONES_URL = `${GAMES_BASE}/zones.json`;
export const GAMES_COVER_URL = 'https://cdn.jsdelivr.net/gh/gn-math/covers@main';

export function parseZones(zones: unknown[]): GameItem[] {
  return zones
    .filter((z): z is Record<string, unknown> => typeof z === 'object' && z !== null)
    .filter((z) => {
      const id = z.id;
      return typeof id === 'number' && id >= 0;
    })
    .map((z) => ({
      id: z.id as number,
      name: (z.name as string) || 'Unknown',
      cover: (z.cover as string)?.replace('{COVER_URL}', GAMES_COVER_URL) || '',
      url: (z.url as string)?.replace('{HTML_URL}', GAMES_HTML_URL) || '',
      author: z.author as string | undefined,
    }));
}

export function proxyUrl(target: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL as string;
  return `${base}/functions/v1/proxy?url=${encodeURIComponent(target)}`;
}
