import { useRef, useEffect, useState } from 'react';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './studio.css';
import Icon from './icons.jsx';
import MenuBar from './MenuBar.jsx';
import Outliner from './Outliner.jsx';
import Properties from './Properties.jsx';
import Timeline from './Timeline.jsx';
import { useStudio } from '../../hooks/useStudio.js';
import { PRIMITIVES, LIGHTS, SHADING, TOOLS } from '../../studio/constants.js';
import { TEMPLATES } from '../../studio/templates.js';
import { LIBRARY, LIBRARY_GROUPS } from '../../studio/library.js';

const TOOL_INFO = {
  select: { label: 'Select', key: 'Q', icon: 'select' },
  move: { label: 'Move', key: 'G', icon: 'move' },
  rotate: { label: 'Rotate', key: 'R', icon: 'rotate' },
  scale: { label: 'Scale', key: 'S', icon: 'scale' },
};

const lightColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.72;
};

const SHORTCUTS = [
  ['Q / G / R / S', 'Select / Move / Rotate / Scale'], ['Shift A', 'Add menu'], ['Shift D', 'Duplicate'], ['X / Delete', 'Delete'],
  ['Ctrl Z / Ctrl Shift Z', 'Undo / Redo'], ['Ctrl G / Ctrl Shift G', 'Group / Ungroup'], ['F', 'Frame selection'], ['H', 'Hide selection'],
  ['1 / 3 / 7 / 0', 'Front / Right / Top / Perspective'], ['I', 'Insert keyframe'], ['Space', 'Play / Pause'], ['Ctrl S', 'Save project'],
  ['Ctrl A', 'Select all'], ['Esc', 'Deselect'], ['Shift click', 'Add to selection'], ['Drag a field label', 'Scrub the number'],
];

function QuickAdd({ ui }) {
  return (
    <div className="st-pop" style={{ position: 'fixed', left: 70, top: 100, width: 250, maxWidth: 'calc(100vw - 80px)' }} role="menu" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" role="menuitem" className="st-item" onClick={() => { ui.setAddMenu(false); ui.setDialog('library'); }}><Icon name="shapes" size={15} />Prebuilt models…</button>
      <div className="st-sep" />
      <div className="st-label">Add</div>
      <div className="st-grid2" style={{ padding: 4 }}>
        {PRIMITIVES.filter((p) => p.id !== 'svg').map((p) => <button key={p.id} type="button" role="menuitem" className="st-item" onClick={() => ui.addObject(p.id)}><Icon name={p.id} size={15} />{p.label}</button>)}
        {LIGHTS.map((l) => <button key={l.id} type="button" role="menuitem" className="st-item" onClick={() => ui.addObject(`light:${l.id}`)}><Icon name={`light:${l.id}`} size={15} />{l.label.replace(' light', '')}</button>)}
        <button type="button" role="menuitem" className="st-item" onClick={() => ui.addObject('camera')}><Icon name="camera" size={15} />Camera</button>
      </div>
    </div>
  );
}

function ToolBar({ s, store, ui }) {
  return (
    <nav className="st-tools" aria-label="Tools" style={{ position: 'relative' }}>
      {TOOLS.map((t) => (
        <button key={t} type="button" className="st-tool" aria-pressed={s.tool === t} title={`${TOOL_INFO[t].label} (${TOOL_INFO[t].key})`} aria-label={TOOL_INFO[t].label} onClick={() => store.setTool(t)}>
          <Icon name={TOOL_INFO[t].icon} size={19} />
        </button>
      ))}
      <div className="st-tool-sep" />
      <button type="button" className="st-tool" aria-pressed={ui.addMenu} title="Add object (Shift A)" aria-label="Add object" onClick={() => ui.setAddMenu(!ui.addMenu)}><Icon name="add" size={19} /></button>
      <button type="button" className="st-tool" title="Duplicate (Shift D)" aria-label="Duplicate" disabled={!s.selection.length} onClick={() => store.duplicate()}><Icon name="copy" size={18} /></button>
      <button type="button" className="st-tool" title="Group (Ctrl G)" aria-label="Group" disabled={!s.selection.length} onClick={() => store.group()}><Icon name="group" size={18} /></button>
      <button type="button" className="st-tool" title="Delete (X)" aria-label="Delete" disabled={!s.selection.length} onClick={() => store.remove()}><Icon name="trash" size={18} /></button>
      <div className="st-tool-sep" />
      <button type="button" className="st-tool" title="Prebuilt models" aria-label="Prebuilt models" onClick={() => ui.setDialog('library')}><Icon name="shapes" size={18} /></button>
      <button type="button" className="st-tool" title="Frame selected (F)" aria-label="Frame selected" onClick={ui.frame}><Icon name="frame" size={18} /></button>
      {ui.addMenu ? <QuickAdd ui={ui} /> : null}
    </nav>
  );
}

function Header({ s, store }) {
  return (
    <div className="st-header" role="toolbar" aria-label="View options">
      <button type="button" className="st-btn" aria-pressed={s.snap} onClick={() => store.setView({ snap: !s.snap })} title="Snap to grid"><Icon name="magnet" size={14} /> Snap</button>
      <button type="button" className="st-btn" aria-pressed={s.space === 'local'} onClick={() => store.setView({ space: s.space === 'local' ? 'world' : 'local' })} title="Transform space">{s.space === 'local' ? 'Local' : 'Global'}</button>
      <span className="st-div" />
      {SHADING.map((m) => <button key={m.id} type="button" className="st-btn" aria-pressed={s.shading === m.id} onClick={() => store.setView({ shading: m.id })}>{m.label}</button>)}
      <button type="button" className="st-btn" onClick={() => store.updateWorld({ grid: !s.doc.world.grid })} aria-pressed={s.doc.world.grid}><Icon name="grid" size={14} /> Grid</button>
      <span className="st-vp-title">{s.shading === 'material' ? 'Perspective' : s.shading === 'solid' ? 'Solid' : 'Wireframe'} · {s.doc.name}</span>
    </div>
  );
}

export default function StudioApp({ onExit }) {
  const [containerRef, ui] = useStudio();
  const { state: s, store } = ui;
  const svgInput = useRef(null);
  const svgTarget = useRef(null);
  const projectInput = useRef(null);
  const [panel, setPanel] = useState('props');
  const [libGroup, setLibGroup] = useState('all');

  useEffect(() => {
    const prev = document.title;
    document.title = 'Mocha 3D Studio';
    return () => { document.title = prev; };
  }, []);

  const pickSvg = (id) => {
    svgTarget.current = id;
    svgInput.current?.click();
  };
  const active = s.doc.objects.find((o) => o.id === s.selection[s.selection.length - 1]);
  const tris = s.doc.objects.length;

  return (
    <div className="st-root" data-theme={ui.theme}>
      <MenuBar ui={ui} s={s} store={store} onExit={onExit} pickProject={() => projectInput.current?.click()} pickSvg={pickSvg} />
      <div className="st-body">
        <ToolBar s={s} store={store} ui={ui} />
        <div className="st-center">
          <Header s={s} store={store} />
          <div className="st-viewport" tabIndex={0} role="application" aria-label="3D viewport">
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
          </div>
          <Timeline s={s} store={store} />
        </div>
        <aside className="st-right" aria-label="Scene panels" data-panel={panel}>
          <div className="st-seg" role="group" aria-label="Panel">
            <button type="button" aria-pressed={panel === 'outliner'} onClick={() => setPanel('outliner')}>Outliner</button>
            <button type="button" aria-pressed={panel === 'props'} onClick={() => setPanel('props')}>Properties</button>
          </div>
          <Outliner s={s} store={store} />
          <Properties s={s} store={store} uploadSvg={() => pickSvg(active?.id ?? null)} />
        </aside>
      </div>
      <footer className="st-status">
        <span><b>{tris}</b> objects</span>
        <span><b>{s.selection.length}</b> selected</span>
        <span className="hide-m">Tool: <b>{TOOL_INFO[s.tool].label}</b></span>
        <span className="hide-m">Click select · Drag orbit · Right-drag pan · Scroll zoom · Shift+A add · G/R/S transform</span>
        <span className="st-end">{ui.busy ? 'Working…' : 'Saved in this browser'}</span>
      </footer>

      <input ref={svgInput} type="file" accept=".svg,image/svg+xml" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) ui.uploadSvg(f, svgTarget.current); }} />
      <input ref={projectInput} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) ui.openProject(f); }} />

      {ui.dialog === 'templates' && (
        <div className="st-modal-bg" onPointerDown={() => ui.setDialog(null)}>
          <div className="st-modal" role="dialog" aria-label="Start a scene" onPointerDown={(e) => e.stopPropagation()}>
            <h2>Start a 3D scene</h2>
            <p>Pick a template, or begin with an empty scene. You can add shapes, lights and cameras, edit materials, animate and export to GLB, glTF, OBJ, STL, PNG or Blender.</p>
            <div className="st-cards">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" className="st-card-btn" onClick={() => ui.useTemplate(t.id)}>
                  <span className="ic"><Icon name={t.id === 'empty' ? 'add' : t.id === 'starter' ? 'box' : t.id === 'keychain' ? 'ring' : 'sphere'} size={20} /></span>
                  <strong>{t.label}</strong><span>{t.note}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button type="button" className="st-btn" onClick={() => ui.setDialog(null)} style={{ background: 'var(--st-field)' }}>Continue current scene</button>
              <button type="button" className="st-btn" onClick={() => ui.setDialog('library')} style={{ background: 'var(--st-field)' }}><Icon name="shapes" size={14} /> Prebuilt models</button>
              <button type="button" className="st-btn" onClick={() => ui.setDialog('keys')} style={{ background: 'var(--st-field)' }}><Icon name="keyboard" size={14} /> Shortcuts</button>
            </div>
          </div>
        </div>
      )}
      {ui.dialog === 'library' && (
        <div className="st-modal-bg" onPointerDown={() => ui.setDialog(null)}>
          <div className="st-modal" role="dialog" aria-label="Prebuilt models" onPointerDown={(e) => e.stopPropagation()}>
            <div className="st-modal-top">
              <div>
                <h2>Prebuilt models</h2>
                <p>Click one to drop it into the scene. Every part stays editable, so recolour it, move it or change its shape.</p>
              </div>
              <button type="button" className="st-mini" aria-label="Close" onClick={() => ui.setDialog(null)}><Icon name="close" size={18} /></button>
            </div>
            <div className="st-pills" role="group" aria-label="Category">
              {[{ id: 'all', label: 'All' }, ...LIBRARY_GROUPS].map((g) => <button key={g.id} type="button" className="st-pill" aria-pressed={libGroup === g.id} onClick={() => setLibGroup(g.id)}>{g.label}</button>)}
            </div>
            <div className="st-cards">
              {LIBRARY.filter((m) => libGroup === 'all' || m.group === libGroup).map((m) => (
                <button key={m.id} type="button" className="st-card-btn" onClick={() => { if (ui.addModel(m.id)) { ui.setDialog(null); setTimeout(ui.frame, 50); } }}>
                  <span className="ic" style={{ background: m.color, color: lightColor(m.color) ? '#1c1e24' : '#fff' }}><Icon name={m.icon} size={22} /></span>
                  <strong>{m.label}</strong>
                  <span>{LIBRARY_GROUPS.find((g) => g.id === m.group)?.label} · {m.build().length} parts</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {ui.dialog === 'keys' && (
        <div className="st-modal-bg" onPointerDown={() => ui.setDialog(null)}>
          <div className="st-modal" role="dialog" aria-label="Keyboard shortcuts" onPointerDown={(e) => e.stopPropagation()}>
            <h2>Keyboard shortcuts</h2>
            <p>The same keys as Blender, where it makes sense.</p>
            <div className="st-keys">{SHORTCUTS.map(([k, d]) => <div key={k}><span>{d}</span><span className="st-kbd">{k}</span></div>)}</div>
            <div style={{ marginTop: 14 }}><button type="button" className="st-btn" onClick={() => ui.setDialog(null)} style={{ background: 'var(--st-field)' }}>Close</button></div>
          </div>
        </div>
      )}
      <div className="st-toast" style={{ opacity: ui.toast.visible ? 1 : 0 }} role="status">{ui.toast.text}</div>
    </div>
  );
}
