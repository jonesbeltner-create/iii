import { useState } from 'react';
import TopNav from '@/components/TopNav';
import LibraryHub from '@/panels/LibraryHub';
import WebBrowser from '@/panels/WebBrowser';
import AiCompanion from '@/panels/AiCompanion';
import type { PanelId } from '@/data';

export default function App() {
  const [activePanel, setActivePanel] = useState<PanelId>('library');
  const [browserUrl, setBrowserUrl] = useState('');

  const launchUrl = (url: string) => {
    setBrowserUrl(url);
    setActivePanel('browser');
  };

  const launchGame = (htmlUrl: string) => {
    setBrowserUrl(htmlUrl);
    setActivePanel('browser');
  };

  return (
    <div className="flex h-full flex-col bg-surface-base">
      <TopNav active={activePanel} onChange={setActivePanel} />

      <main className="mx-auto w-full max-w-7xl flex-1 overflow-hidden px-4 py-6 sm:px-6">
        <div className={activePanel === 'library' ? 'h-full overflow-y-auto' : 'hidden'}>
          <LibraryHub onLaunch={launchUrl} onLaunchGame={launchGame} />
        </div>
        <div className={activePanel === 'browser' ? 'h-full' : 'hidden'}>
          <WebBrowser url={browserUrl} onNavigate={setBrowserUrl} />
        </div>
        <div className={activePanel === 'companion' ? 'h-full' : 'hidden'}>
          <AiCompanion />
        </div>
      </main>
    </div>
  );
}
