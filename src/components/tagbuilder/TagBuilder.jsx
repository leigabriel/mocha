import Toast from '../Toast.jsx';
import { useTagBuilder } from '../../hooks/useTagBuilder.js';
import TagPanel from './TagPanel.jsx';

/** Tag Builder tab: procedural, editable keychain model with multi-format export. */
export default function TagBuilder({ active }) {
  const { containerRef, api: b } = useTagBuilder(active);
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={b.toast} />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          ref={containerRef}
          tabIndex={0}
          role="application"
          aria-label={`3D preview of a keychain with ${b.design.tags.length} tag${b.design.tags.length === 1 ? '' : 's'}`}
          aria-describedby="tb-help"
          className="h-full w-full touch-none"
        ></div>
        <p id="tb-help" className="sr-only">
          Drag to orbit, scroll to zoom, click a tag to select it. Edit it in the controls, then download the model.
        </p>
        <p aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[calc(100%-1.5rem)] bg-black/60 px-2 py-1 text-[11px] uppercase tracking-wider text-white md:block">
          Click a tag to edit · Drag to orbit · Scroll to zoom
        </p>
      </main>
      <TagPanel b={b} />
    </div>
  );
}
