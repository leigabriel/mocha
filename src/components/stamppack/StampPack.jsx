import { useState } from 'react';
import Toast from '../Toast.jsx';
import { useStampPack } from '../../hooks/useStampPack.js';
import PackPanel from './PackPanel.jsx';

/** Stamp Pack tab: turns uploaded pictures into a bagged postage-stamp collection. */
export default function StampPack({ active }) {
  const { containerRef, api: p } = useStampPack(active);
  const [over, setOver] = useState(false);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={p.toast} />
      <main
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes('Files')) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          p.addFiles(e.dataTransfer.files);
        }}
      >
        <div
          ref={containerRef}
          tabIndex={0}
          role="application"
          aria-label={`3D preview of a stamp pack with ${p.design.stamps.length} stamp${p.design.stamps.length === 1 ? '' : 's'}`}
          aria-describedby="sp-help"
          className="h-full w-full touch-none"
        ></div>
        <p id="sp-help" className="sr-only">Drag to orbit, scroll to zoom, click a stamp or the header card to select it. Drop pictures onto the view to add stamps.</p>
        <p aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[calc(100%-1.5rem)] bg-black/60 px-2 py-1 text-[11px] uppercase tracking-wider text-white md:block">
          Drop pictures here · Click a stamp to edit · Drag to orbit
        </p>
        {over ? (
          <div className="pointer-events-none absolute inset-3 flex items-center justify-center border-2 border-dashed border-white bg-brand/70 text-sm font-bold uppercase tracking-widest text-white">
            Drop pictures to add stamps
          </div>
        ) : null}
      </main>
      <PackPanel p={p} />
    </div>
  );
}
