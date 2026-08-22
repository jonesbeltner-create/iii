import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Search, Gamepad2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { APP_CARDS, GAMES_ZONES_URL, parseZones, type GameItem } from '@/data';

interface LibraryHubProps {
  onLaunch: (url: string) => void;
  onLaunchGame: (htmlUrl: string) => void;
}

export default function LibraryHub({ onLaunch, onLaunchGame }: LibraryHubProps) {
  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch(GAMES_ZONES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load games (${res.status})`);
        return res.json();
      })
      .then((data: unknown[]) => {
        setGames(parseZones(data));
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load games');
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games.slice(0, 48);
    return games.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 96);
  }, [games, query]);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Library Hub</h1>
        <p className="mt-1.5 text-slate-400">
          Launch an app or play a game — it opens instantly in the Web Browser.
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Apps</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APP_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => onLaunch(card.url)}
              className="group relative flex flex-col items-start overflow-hidden rounded-2xl border border-slate-700/60 bg-surface-pane p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:bg-surface-elevated hover:shadow-xl hover:shadow-blue-500/10"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-base text-3xl transition-transform duration-200 group-hover:scale-110">
                {card.emoji}
              </div>
              <div className="flex w-full items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                <ArrowUpRight className="h-5 w-5 text-slate-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-400" />
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{card.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            <Gamepad2 className="h-4 w-4" />
            Games
          </h2>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-700/60 bg-surface-pane px-3 sm:max-w-xs">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search games..."
              className="h-9 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center rounded-2xl border border-slate-700/60 bg-surface-pane py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <span className="ml-3 text-sm text-slate-400">Loading game library...</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/10 px-5 py-6 text-sm text-red-300">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            Could not load the game library. {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filtered.map((game) => (
              <button
                key={game.id}
                onClick={() => onLaunchGame(game.url)}
                className="group flex flex-col overflow-hidden rounded-xl border border-slate-700/60 bg-surface-pane text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
              >
                <div className="relative aspect-square overflow-hidden bg-surface-base">
                  {game.cover ? (
                    <img
                      src={game.cover}
                      alt={game.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🎮</div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <ExternalLink className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-slate-100">{game.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
