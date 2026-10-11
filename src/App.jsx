import { lazy, Suspense, useEffect, useState } from 'react';
import Toast from './components/Toast.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import Viewport from './components/Viewport.jsx';
import TagBuilder from './components/tagbuilder/TagBuilder.jsx';
import StampPack from './components/stamppack/StampPack.jsx';
import KeySet from './components/keyset/KeySet.jsx';
import Animals from './components/animals/Animals.jsx';
import Stickers from './components/stickers/Stickers.jsx';
import Icon from './components/studio/icons.jsx';
import { Seg } from './components/panel/ui.jsx';
import { useKeychainStudio } from './hooks/useKeychainStudio.js';

const MODES = [
  { id: 'emoji', label: 'Emoji Charms' },
  { id: 'tag', label: 'Tag Builder' },
  { id: 'stamp', label: 'Stamp Pack' },
  { id: 'set', label: 'Keychain Set' },
  { id: 'animals', label: 'Animals' },
  { id: 'stickers', label: 'Stickers' },
];

const StudioApp = lazy(() => import('./components/studio/StudioApp.jsx'));
const inStudio = () => typeof window !== 'undefined' && window.location.hash.startsWith('#/studio');

const initialMode = () => (typeof window !== 'undefined' && window.location.hash.startsWith('#t=') ? 'tag' : 'emoji');

function EmojiStudio() {
  const studio = useKeychainStudio();
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={studio.toast} />
      <Viewport containerRef={studio.containerRef} branches={studio.branches} onKeyDown={studio.handleViewportKeyDown} />
      <LeftPanel {...studio} />
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(initialMode);
  const [studio, setStudio] = useState(inStudio);

  useEffect(() => {
    const nav = document.querySelector('nav[aria-label="Studio mode"]');
    const el = nav?.querySelector('[aria-pressed="true"]');
    if (nav && el) nav.scrollTo({ left: el.offsetLeft - (nav.clientWidth - el.offsetWidth) / 2, behavior: 'auto' });
  }, [mode]);

  useEffect(() => {
    const onHash = () => setStudio(inStudio());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const exitStudio = () => {
    if (window.history.length > 1 && inStudio()) window.history.back();
    else window.location.hash = '';
    setStudio(false);
  };

  if (studio) {
    return (
      <Suspense fallback={<div className="grid h-dvh w-screen place-items-center bg-[#1d1d1d] text-sm text-white/70">Loading 3D Studio…</div>}>
        <StudioApp onExit={exitStudio} />
      </Suspense>
    );
  }

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-brand">
      <nav aria-label="Studio mode" className="z-50 flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/30 bg-brand px-3 py-1.5 text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MODES.map((m) => (
          <Seg key={m.id} pressed={mode === m.id} onClick={() => setMode(m.id)} className="min-h-[34px] shrink-0 whitespace-nowrap px-3 text-[11px] font-bold uppercase tracking-wider">
            {m.label}
          </Seg>
        ))}
        <a href="#/studio" className="ml-auto inline-flex min-h-[34px] shrink-0 items-center gap-1.5 rounded-md bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-brand">
          <Icon name="cube" size={14} /> <span className="hidden sm:inline">3D Studio</span><span className="sr-only sm:hidden">3D Studio</span>
        </a>
      </nav>
      <div className="min-h-0 flex-1">
        {mode === 'emoji' ? <EmojiStudio /> : mode === 'tag' ? <TagBuilder active /> : mode === 'stamp' ? <StampPack active /> : mode === 'set' ? <KeySet active /> : mode === 'animals' ? <Animals /> : <Stickers />}
      </div>
    </div>
  );
}
