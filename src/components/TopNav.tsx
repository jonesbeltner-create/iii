import { LayoutGrid, Globe, Bot, Boxes } from 'lucide-react';
import type { PanelId } from '@/data';

interface NavItem {
  id: PanelId;
  label: string;
  icon: typeof LayoutGrid;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'library', label: 'Library Hub', icon: LayoutGrid },
  { id: 'browser', label: 'Web Browser', icon: Globe },
  { id: 'companion', label: 'AI Companion', icon: Bot },
];

interface TopNavProps {
  active: PanelId;
  onChange: (panel: PanelId) => void;
}

export default function TopNav({ active, onChange }: TopNavProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-700/60 bg-surface-base/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30">
            <Boxes className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">Nexus Hub</span>
        </div>

        <nav className="flex items-center gap-1 rounded-xl bg-surface-pane p-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 sm:px-4 ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:bg-surface-elevated hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
