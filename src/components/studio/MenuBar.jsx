import { useEffect, useRef, useState } from 'react';
import Icon from './icons.jsx';
import { PRIMITIVES, LIGHTS } from '../../studio/constants.js';
import { FORMAT_INFO } from '../../studio/exporters.js';
import { TEMPLATES } from '../../studio/templates.js';

function Menu({ id, label, open, setOpen, children }) {
  return (
    <div className={`st-menu ${open === id ? 'open' : ''}`}>
      <button type="button" aria-haspopup="menu" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)} onMouseEnter={() => open && setOpen(id)}>{label}</button>
      {open === id && <div className="st-pop" role="menu" onClick={() => setOpen(null)}>{children}</div>}
    </div>
  );
}

const Item = ({ icon, children, kbd, ...rest }) => (
  <button type="button" role="menuitem" className="st-item" {...rest}>
    {icon ? <Icon name={icon} size={14} /> : <span style={{ width: 14 }} />}
    {children}
    {kbd ? <kbd>{kbd}</kbd> : null}
  </button>
);

export default function MenuBar({ ui, s, store, onExit, pickProject, pickSvg }) {
  const [open, setOpen] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, []);
  const has = s.selection.length > 0;
  return (
    <header className="st-menubar" ref={ref}>
      <button type="button" className="st-brand st-btn" onClick={onExit} title="Back to Mocha" aria-label="Back to Mocha">
        <Icon name="back" size={14} /> MOCHA 3D
      </button>
      <Menu id="file" label="File" open={open} setOpen={setOpen}>
        <Item icon="add" onClick={() => ui.setDialog('templates')}>New from template…</Item>
        <Item icon="folderOpen" onClick={pickProject}>Open project…</Item>
        <Item icon="save" kbd="Ctrl S" onClick={() => ui.exportAs('json')}>Save project</Item>
        <div className="st-sep" />
        <div className="st-label">Export model</div>
        {['glb', 'gltf', 'obj', 'stl'].map((f) => <Item key={f} icon="download" onClick={() => ui.exportAs(f)} title={FORMAT_INFO[f].note}>{FORMAT_INFO[f].label}</Item>)}
        <div className="st-sep" />
        <Item icon="back" onClick={onExit}>Back to Mocha</Item>
      </Menu>
      <Menu id="edit" label="Edit" open={open} setOpen={setOpen}>
        <Item icon="undo" kbd="Ctrl Z" disabled={!s.canUndo} onClick={store.undo}>Undo</Item>
        <Item icon="redo" kbd="Ctrl Shift Z" disabled={!s.canRedo} onClick={store.redo}>Redo</Item>
        <div className="st-sep" />
        <Item icon="copy" kbd="Shift D" disabled={!has} onClick={() => store.duplicate()}>Duplicate</Item>
        <Item icon="group" kbd="Ctrl G" disabled={!has} onClick={() => store.group()}>Group</Item>
        <Item icon="group" kbd="Ctrl Shift G" disabled={!has} onClick={() => s.selection.forEach((id) => store.ungroup(id))}>Ungroup</Item>
        <Item icon="trash" kbd="X" disabled={!has} onClick={() => store.remove()}>Delete</Item>
        <div className="st-sep" />
        <Item kbd="Ctrl A" onClick={store.selectAll}>Select all</Item>
        <Item kbd="Esc" onClick={store.clearSelection}>Deselect</Item>
      </Menu>
      <Menu id="add" label="Add" open={open} setOpen={setOpen}>
        {['Mesh', 'Shape'].map((g) => (
          <div key={g}>
            <div className="st-label">{g}</div>
            {PRIMITIVES.filter((p) => p.group === g).map((p) => <Item key={p.id} icon={p.id} onClick={() => (p.id === 'svg' ? pickSvg(null) : ui.addObject(p.id))}>{p.label}</Item>)}
          </div>
        ))}
        <div className="st-label">Light</div>
        {LIGHTS.map((l) => <Item key={l.id} icon={`light:${l.id}`} onClick={() => ui.addObject(`light:${l.id}`)}>{l.label}</Item>)}
        <div className="st-label">Other</div>
        <Item icon="camera" onClick={() => ui.addObject('camera')}>Camera</Item>
        <Item icon="group" onClick={() => ui.addObject('group')}>Empty group</Item>
      </Menu>
      <Menu id="view" label="View" open={open} setOpen={setOpen}>
        <Item icon="frame" kbd="F" onClick={ui.frame}>Frame selected</Item>
        <Item kbd="1" onClick={() => ui.setView('front')}>Front</Item>
        <Item kbd="3" onClick={() => ui.setView('right')}>Right</Item>
        <Item kbd="7" onClick={() => ui.setView('top')}>Top</Item>
        <Item kbd="0" onClick={() => ui.setView('iso')}>Perspective</Item>
        <div className="st-sep" />
        <Item icon="grid" onClick={() => store.updateWorld({ grid: !s.doc.world.grid })}>{s.doc.world.grid ? 'Hide grid' : 'Show grid'}</Item>
      </Menu>
      <Menu id="render" label="Render" open={open} setOpen={setOpen}>
        <Item icon="image" onClick={() => ui.renderImage('png')}>Image (PNG)</Item>
        <Item icon="image" onClick={() => ui.renderImage('jpeg')}>Image (JPG)</Item>
        <Item icon="camera" disabled={!s.doc.objects.some((o) => o.type === 'camera')} onClick={() => ui.renderImage('png', true)}>Image from camera</Item>
        <div className="st-sep" />
        <Item icon="code" onClick={() => ui.exportAs('blend')} title={FORMAT_INFO.blend.note}>Blender scene (.py)</Item>
        <div className="st-label">Blender quality</div>
        {[['draft', 'Draft'], ['high', 'High'], ['ultra', 'Ultra']].map(([id, l]) => (
          <button key={id} type="button" role="menuitemradio" aria-checked={ui.quality === id} className="st-item" onClick={(e) => { e.stopPropagation(); ui.setQuality(id); }}>
            <span style={{ width: 14 }}>{ui.quality === id ? '•' : ''}</span>{l}
          </button>
        ))}
      </Menu>
      <Menu id="help" label="Help" open={open} setOpen={setOpen}>
        <Item icon="keyboard" onClick={() => ui.setDialog('keys')}>Keyboard shortcuts</Item>
        <Item icon="rocket" onClick={() => ui.setDialog('templates')}>Templates</Item>
      </Menu>
      <span style={{ flex: 1 }} />
      <span style={{ color: 'var(--st-dim)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.doc.name}</span>
      <button type="button" className="st-btn" disabled={!s.canUndo} onClick={store.undo} aria-label="Undo"><Icon name="undo" size={15} /></button>
      <button type="button" className="st-btn" disabled={!s.canRedo} onClick={store.redo} aria-label="Redo"><Icon name="redo" size={15} /></button>
      <span className="hide-m" style={{ display: 'none' }}>{TEMPLATES.length}</span>
    </header>
  );
}
