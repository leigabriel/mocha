import { useState } from 'react';
import Icon from './icons.jsx';
import { childrenOf } from '../../studio/doc.js';

function Node({ o, depth, doc, selection, store, renaming, setRenaming }) {
  const [open, setOpen] = useState(true);
  const kids = childrenOf(doc, o.id);
  const sel = selection.includes(o.id);
  const active = selection[selection.length - 1] === o.id;
  const iconName = o.type === 'group' ? 'group' : o.type;
  return (
    <>
      <div
        className={`st-row ${active ? 'active' : sel ? 'sel' : ''}`}
        style={{ paddingLeft: 4 + depth * 14 }}
        onClick={(e) => {
          if (o.locked) return;
          if (e.shiftKey || e.ctrlKey || e.metaKey) store.toggleSelect(o.id);
          else store.select([o.id]);
        }}
        onDoubleClick={() => setRenaming(o.id)}
      >
        <button type="button" className="st-mini" aria-label={open ? 'Collapse' : 'Expand'} style={{ visibility: kids.length ? 'visible' : 'hidden' }} onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} />
        </button>
        <Icon name={iconName} size={14} />
        <span className="st-name">
          {renaming === o.id ? (
            <input
              autoFocus
              defaultValue={o.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { store.update(o.id, { name: e.target.value }); setRenaming(null); }}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setRenaming(null); }}
            />
          ) : o.name}
        </span>
        <button type="button" className={`st-mini ${o.locked ? '' : 'off'}`} title={o.locked ? 'Unlock' : 'Lock'} aria-label={o.locked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); store.update(o.id, { locked: !o.locked }); }}>
          <Icon name={o.locked ? 'lock' : 'unlock'} size={13} />
        </button>
        <button type="button" className={`st-mini ${o.visible ? '' : 'off'}`} title={o.visible ? 'Hide' : 'Show'} aria-label={o.visible ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); store.update(o.id, { visible: !o.visible }); }}>
          <Icon name={o.visible ? 'eye' : 'eyeOff'} size={13} />
        </button>
      </div>
      {open && kids.map((c) => <Node key={c.id} o={c} depth={depth + 1} {...{ doc, selection, store, renaming, setRenaming }} />)}
    </>
  );
}

export default function Outliner({ s, store }) {
  const [renaming, setRenaming] = useState(null);
  const roots = s.doc.objects.filter((o) => !o.parent);
  return (
    <section className="st-outliner" aria-label="Outliner">
      <div className="st-ph"><Icon name="hierarchy" size={14} /> Outliner <span className="st-spacer" style={{ color: 'var(--st-dim)', fontWeight: 400 }}>{s.doc.objects.length} objects</span></div>
      <div className="st-tree">
        {roots.length ? roots.map((o) => <Node key={o.id} o={o} depth={0} doc={s.doc} selection={s.selection} store={store} renaming={renaming} setRenaming={setRenaming} />) : (
          <div className="st-empty">Nothing here yet.<br />Press <b>Shift+A</b> or use <b>Add</b> to create something.</div>
        )}
      </div>
    </section>
  );
}
