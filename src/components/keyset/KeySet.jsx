import Toast from '../Toast.jsx';
import { useKeySet } from '../../hooks/useKeySet.js';
import KeyPanel from './KeyPanel.jsx';

/** Keychain Set tab: a glass-and-chrome clasp with a fan of customisable charms. */
export default function KeySet({ active }) {
  const { containerRef, api: p } = useKeySet(active);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={p.toast} />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          ref={containerRef}
          tabIndex={0}
          role="application"
          aria-label={`3D preview of a keychain set with ${p.design.charms.length} charm${p.design.charms.length === 1 ? '' : 's'}`}
          aria-describedby="ks-help"
          className="h-full w-full touch-none"
        ></div>
        <p id="ks-help" className="sr-only">Drag to orbit, scroll to zoom, click a charm to edit it.</p>
        <p aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[calc(100%-1.5rem)] bg-black/60 px-2 py-1 text-[11px] uppercase tracking-wider text-white md:block">
          Click a charm to edit · Drag to orbit · Scroll to zoom
        </p>
      </main>
      <KeyPanel p={p} />
    </div>
  );
}
