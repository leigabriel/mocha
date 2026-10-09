import { useState } from 'react';
import Toast from './components/Toast.jsx';
import LeftPanel from './components/LeftPanel.jsx';
import Viewport from './components/Viewport.jsx';
import TagBuilder from './components/tagbuilder/TagBuilder.jsx';
import StampPack from './components/stamppack/StampPack.jsx';
import KeySet from './components/keyset/KeySet.jsx';
import { Seg } from './components/panel/ui.jsx';
import { useKeychainStudio } from './hooks/useKeychainStudio.js';

const MODES = [
  { id: 'emoji', label: 'Emoji Charms' },
  { id: 'tag', label: 'Tag Builder' },
  { id: 'stamp', label: 'Stamp Pack' },
  { id: 'set', label: 'Keychain Set' },
];

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

  return (
    <div className="flex h-dvh w-screen flex-col overflow-hidden bg-brand">
      <nav aria-label="Studio mode" className="z-50 flex shrink-0 items-center gap-1.5 border-b border-white/30 bg-brand px-3 py-1.5 text-white">
        {MODES.map((m) => (
          <Seg key={m.id} pressed={mode === m.id} onClick={() => setMode(m.id)} className="min-h-[30px] px-3 text-[11px] font-bold uppercase tracking-wider">
            {m.label}
          </Seg>
        ))}
      </nav>
      <div className="min-h-0 flex-1">
        {mode === 'emoji' ? <EmojiStudio /> : mode === 'tag' ? <TagBuilder active /> : mode === 'stamp' ? <StampPack active /> : <KeySet active />}
      </div>
    </div>
  );
}
