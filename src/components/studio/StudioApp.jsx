import { useRef, useEffect } from 'react';
import './studio.css';
import Icon from './icons.jsx';
import MenuBar from './MenuBar.jsx';
import Outliner from './Outliner.jsx';
import Properties from './Properties.jsx';
import Timeline from './Timeline.jsx';
import { useStudio } from '../../hooks/useStudio.js';
import { PRIMITIVES, LIGHTS, SHADING, TOOLS } from '../../studio/constants.js';
import { TEMPLATES } from '../../studio/templates.js';

const TOOL_INFO = {
  select: { label: 'Select', key: 'Q', icon: 'select' },
  move: { label: 'Move', key: 'G', icon: 'move' },
  rotate: { label: 'Rotate', key: 'R', icon: 'rotate' },
  scale: { label: 'Scale', key: 'S', icon: 'scale' },
};

const SHORTCUTS = [
  ['Q / G / R / S', 'Select / Move / Rotate / Scale'], ['Shift A', 'Add menu'], ['Shift D', 'Duplicate'], ['X / Delete', 'Delete'],
  ['Ctrl Z / Ctrl Shift Z', 'Undo / Redo'], ['Ctrl G / Ctrl Shift G', 'Group / Ungroup'], ['F', 'Frame selection'], ['H', 'Hide selection'],
  ['1 / 3 / 7 / 0', 'Front / Right / Top / Perspective'], ['I', 'Insert keyframe'], ['Space', 'Play / Pause'], ['Ctrl S', 'Save project'],
  ['Ctrl A', 'Select all'], ['Esc', 'Deselect'], ['Shift click', 'Add to selection'], ['Drag a field label', 'Scrub the number'],
];

function QuickAdd({ ui }) {
  return (
    <div className="st-pop" style={{ left: 54, top: 8, position: 'absolute', width: 240 }} role="menu" onPointerDown={(e) => e.stopPropagation()}>
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
      <div style={{ height: 1, background: 'var(--st-line)', margin: '4px 2px' }} />
      <button type="button" className="st-tool" aria-pressed={ui.addMenu} title="Add object (Shift A)" aria-label="Add object" onClick={() => ui.setAddMenu(!ui.addMenu)}><Icon name="add" size={19} /></button>
      <button type="button" className="st-tool" title="Duplicate (Shift D)" aria-label="Duplicate" disabled={!s.selection.length} onClick={() => store.duplicate()}><Icon name="copy" size={18} /></button>
      <button type="button" className="st-tool" title="Group (Ctrl G)" aria-label="Group" disabled={!s.selection.length} onClick={() => store.group()}><Icon name="group" size={18} /></button>
      <button type="button" className="st-tool" title="Delete (X)" aria-label="Delete" disabled={!s.selection.length} onClick={() => store.remove()}><Icon name="trash" size={18} /></button>
      <div style={{ height: 1, background: 'var(--st-line)', margin: '4px 2px' }} />
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
      <span style={{ flex: 1 }} />
      <button type="button" className="st-btn" onClick={() => store.updateWorld({ grid: !s.doc.world.grid })} aria-pressed={s.doc.world.grid}><Icon name="grid" size={14} /> Grid</button>
    </div>
  );
}

export default function StudioApp({ onExit }) {
  const [containerRef, ui] = useStudio();
  const { state: s, store } = ui;
  const svgInput = useRef(null);
  const svgTarget = useRef(null);
  const projectInput = useRef(null);

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
    <div className="st-root">
      <MenuBar ui={ui} s={s} store={store} onExit={onExit} pickProject={() => projectInput.current?.click()} pickSvg={pickSvg} />
      <div className="st-body">
        <ToolBar s={s} store={store} ui={ui} />
        <div className="st-center">
          <Header s={s} store={store} />
          <div className="st-viewport" tabIndex={0} role="application" aria-label="3D viewport">
            <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
            <div className="st-vp-title">{s.shading === 'material' ? 'Perspective' : s.shading === 'solid' ? 'Solid' : 'Wireframe'} · {s.doc.name}</div>
            <div className="st-vp-hint">Click to select · Drag to orbit · Right-drag to pan · Scroll to zoom · Shift+A to add</div>
          </div>
          <Timeline s={s} store={store} />
        </div>
        <aside className="st-right" aria-label="Scene panels">
          <Outliner s={s} store={store} />
          <Properties s={s} store={store} uploadSvg={() => pickSvg(active?.id ?? null)} />
        </aside>
      </div>
      <footer className="st-status">
        <span><b>{tris}</b> objects</span>
        <span><b>{s.selection.length}</b> selected</span>
        <span className="hide-m">Tool: <b>{TOOL_INFO[s.tool].label}</b></span>
        <span className="hide-m">G move · R rotate · S scale · Shift+A add · Shift+D duplicate · F frame · Ctrl+Z undo</span>
        <span style={{ marginLeft: 'auto' }}>{ui.busy ? 'Working…' : 'Saved in this browser'}</span>
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
                <button key={t.id} type="button" className="st-card" onClick={() => ui.useTemplate(t.id)}>
                  <span className="ic"><Icon name={t.id === 'empty' ? 'add' : t.id === 'starter' ? 'box' : t.id === 'keychain' ? 'ring' : 'sphere'} size={20} /></span>
                  <strong>{t.label}</strong><span>{t.note}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
              <button type="button" className="st-btn" onClick={() => ui.setDialog(null)} style={{ background: 'var(--st-field)' }}>Continue current scene</button>
              <button type="button" className="st-btn" onClick={() => ui.setDialog('keys')} style={{ background: 'var(--st-field)' }}><Icon name="keyboard" size={14} /> Shortcuts</button>
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
