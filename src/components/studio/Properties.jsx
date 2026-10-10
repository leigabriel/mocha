import { useState } from 'react';
import Icon from './icons.jsx';
import { ColorInput, NumberField, Row, Section, Select, TextInput, Vec3 } from './fields.jsx';
import { BACKGROUNDS, EASINGS, LIMITS, MATERIAL_PRESETS, primitiveInfo } from '../../studio/constants.js';
import { subtreeIds, typeOf } from '../../studio/doc.js';
import { FONTS } from '../../tagbuilder/constants.js';

const TABS = [
  { id: 'object', icon: 'box', label: 'Object' },
  { id: 'shape', icon: 'sliders', label: 'Shape & modifiers' },
  { id: 'material', icon: 'palette', label: 'Material' },
  { id: 'anim', icon: 'key', label: 'Keyframes' },
  { id: 'world', icon: 'settings', label: 'Scene' },
];

const PARAM_LABELS = { w: 'Width', h: 'Height', d: 'Depth', radius: 'Roundness', seg: 'Segments', rTop: 'Top radius', rBottom: 'Bottom radius', tube: 'Tube', length: 'Length', detail: 'Detail', points: 'Points', outer: 'Outer', inner: 'Inner', depth: 'Thickness', bevel: 'Bevel', size: 'Size' };
const STEPS = { seg: 1, detail: 1, points: 1, bevel: 0.005, depth: 0.01, radius: 0.01, tube: 0.01 };

function ObjectTab({ o, s, store }) {
  const set = (patch, opts) => store.update(o.id, patch, opts);
  const kind = typeOf(o);
  const parents = s.doc.objects.filter((x) => x.type === 'group' && !subtreeIds(s.doc, o.id).includes(x.id));
  return (
    <>
      <Section>
        <Row label="Name"><TextInput value={o.name} onChange={(name) => set({ name })} max={LIMITS.nameLength} /></Row>
        <Row label="Parent">
          <Select value={o.parent ?? ''} onChange={(v) => store.setParent(o.id, v || null)} options={[{ id: '', label: 'None' }, ...parents.map((g) => ({ id: g.id, label: g.name }))]} />
        </Row>
        <div className="st-grid2" style={{ marginTop: 4 }}>
          <button type="button" className="st-chip" aria-pressed={o.visible} onClick={() => set({ visible: !o.visible })}><Icon name={o.visible ? 'eye' : 'eyeOff'} size={13} /> {o.visible ? 'Visible' : 'Hidden'}</button>
          <button type="button" className="st-chip" aria-pressed={o.locked} onClick={() => set({ locked: !o.locked })}><Icon name={o.locked ? 'lock' : 'unlock'} size={13} /> {o.locked ? 'Locked' : 'Unlocked'}</button>
        </div>
      </Section>
      <Section title="Position"><Vec3 value={o.pos} step={0.05} onChange={(pos, opts) => set({ pos }, opts)} /></Section>
      <Section title="Rotation"><Vec3 value={o.rot} step={1} unit="°" min={-3600} max={3600} onChange={(rot, opts) => set({ rot }, opts)} /></Section>
      {kind !== 'light' && kind !== 'camera' && (
        <Section title="Scale">
          <Vec3 value={o.scale} step={0.05} onChange={(scale, opts) => set({ scale }, opts)} />
          <button type="button" className="st-chip" style={{ marginTop: 4, width: '100%' }} onClick={() => { const v = o.scale[0]; set({ scale: [v, v, v] }); }}>Make uniform</button>
        </Section>
      )}
      {kind === 'light' && (
        <Section title="Light">
          <Row label="Colour"><ColorInput value={o.light.color} onChange={(color) => set({ light: { ...o.light, color } })} /></Row>
          <NumberField label="Intensity" value={o.light.intensity} step={1} min={0} max={5000} onChange={(intensity, opts) => set({ light: { ...o.light, intensity } }, opts)} />
          {o.type === 'light:spot' && <div style={{ marginTop: 4 }}><NumberField label="Cone" value={o.light.angle} step={1} min={5} max={90} unit="°" onChange={(angle, opts) => set({ light: { ...o.light, angle } }, opts)} /></div>}
          <button type="button" className="st-chip" style={{ marginTop: 4, width: '100%' }} aria-pressed={o.light.castShadow} onClick={() => set({ light: { ...o.light, castShadow: !o.light.castShadow } })}>Casts shadows</button>
        </Section>
      )}
      {kind === 'camera' && <p style={{ color: 'var(--st-dim)' }}>Exports use this camera. Render menu → "Image from camera" saves what it sees.</p>}
    </>
  );
}

function ShapeTab({ o, set, uploadSvg }) {
  const info = primitiveInfo(o.type);
  if (!info) return <div className="st-empty">Lights, cameras and groups have no shape settings.</div>;
  const p = o.params;
  const setP = (k, v, opts) => set({ params: { ...p, [k]: v } }, opts);
  return (
    <>
      <Section title={info.label}>
        {Object.entries(p).map(([k, v]) => {
          if (k === 'svg') return <button key={k} type="button" className="st-chip" style={{ width: '100%' }} onClick={() => uploadSvg()}>{v ? 'Replace SVG' : 'Choose SVG…'}</button>;
          if (k === 'font') return <Row key={k} label="Font"><Select value={v} onChange={(f) => setP(k, f)} options={FONTS} /></Row>;
          if (k === 'text') return <Row key={k} label="Text"><TextInput value={v} max={40} onChange={(t) => setP(k, t)} /></Row>;
          return <div key={k} style={{ marginBottom: 4 }}><NumberField label={PARAM_LABELS[k] ?? k} value={v} step={STEPS[k] ?? 0.05} min={0} max={200} onChange={(n, opts) => setP(k, n, opts)} /></div>;
        })}
      </Section>
      <Section title="Modifiers">
        {o.mods.map((m, i) => (
          <div key={i} style={{ padding: 6, marginBottom: 6, borderRadius: 6, background: '#232326' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ flex: 1 }}>{m.type === 'array' ? 'Array' : 'Mirror'}</strong>
              <button type="button" className="st-mini" aria-label="Remove modifier" onClick={() => set({ mods: o.mods.filter((_, k) => k !== i) })}><Icon name="trash" size={13} /></button>
            </div>
            {m.type === 'array' ? (
              <>
                <NumberField label="Count" value={m.count} step={1} min={1} max={LIMITS.maxArray} onChange={(count, opts) => set({ mods: o.mods.map((x, k) => (k === i ? { ...x, count } : x)) }, opts)} />
                <div style={{ marginTop: 4 }}><Vec3 value={m.offset} step={0.1} onChange={(offset, opts) => set({ mods: o.mods.map((x, k) => (k === i ? { ...x, offset } : x)) }, opts)} /></div>
              </>
            ) : (
              <div className="st-grid3">{['x', 'y', 'z'].map((a) => <button key={a} type="button" className="st-chip" aria-pressed={m.axis === a} onClick={() => set({ mods: o.mods.map((x, k) => (k === i ? { ...x, axis: a } : x)) })}>{a.toUpperCase()}</button>)}</div>
            )}
          </div>
        ))}
        <div className="st-grid2">
          <button type="button" className="st-chip" disabled={o.mods.length >= 4} onClick={() => set({ mods: [...o.mods, { type: 'array', count: 3, offset: [1.2, 0, 0] }] })}>+ Array</button>
          <button type="button" className="st-chip" disabled={o.mods.length >= 4} onClick={() => set({ mods: [...o.mods, { type: 'mirror', axis: 'x' }] })}>+ Mirror</button>
        </div>
      </Section>
    </>
  );
}

function MaterialTab({ o, set }) {
  if (!primitiveInfo(o.type)) return <div className="st-empty">Only shapes have materials.</div>;
  const m = o.material;
  const setM = (patch, opts) => set({ material: { ...m, ...patch } }, opts);
  const swatch = { plastic: '#e9eaee', clay: '#c9a98a', metal: '#b4bac2', chrome: 'linear-gradient(135deg,#fff,#5b6270 55%,#e8edf3)', glass: 'rgba(160,215,255,.55)', frosted: 'rgba(220,235,245,.6)', softtouch: '#f0b6cf', emissive: '#ffe36b' };
  return (
    <>
      <Section title="Preset">
        <div className="st-grid3">
          {MATERIAL_PRESETS.map((p) => (
            <button key={p.id} type="button" className="st-swatch" aria-pressed={m.preset === p.id} onClick={() => setM({ preset: p.id })}>
              <i style={{ background: swatch[p.id], border: '1px solid rgba(255,255,255,.25)' }} />{p.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Surface">
        <Row label="Colour"><ColorInput value={m.color} onChange={(color) => setM({ color })} /></Row>
        <div style={{ marginBottom: 4 }}><NumberField label="Roughness" value={m.roughness} step={0.01} min={0} max={1} onChange={(roughness, opts) => setM({ roughness }, opts)} /></div>
        <div style={{ marginBottom: 4 }}><NumberField label="Metalness" value={m.metalness} step={0.01} min={0} max={1} onChange={(metalness, opts) => setM({ metalness }, opts)} /></div>
        <NumberField label="Opacity" value={m.opacity} step={0.01} min={0} max={1} onChange={(opacity, opts) => setM({ opacity }, opts)} />
      </Section>
      <Section title="Glow">
        <Row label="Emission"><ColorInput value={m.emissive} onChange={(emissive) => setM({ emissive })} /></Row>
        <NumberField label="Strength" value={m.emissiveIntensity} step={0.1} min={0} max={20} onChange={(emissiveIntensity, opts) => setM({ emissiveIntensity }, opts)} />
      </Section>
    </>
  );
}

function AnimTab({ o, s, store }) {
  return (
    <Section title="Keyframes">
      <p style={{ color: 'var(--st-dim)', marginTop: 0 }}>Move the playhead on the timeline, change the object, then add a key. At least two keys make it animate.</p>
      <button type="button" className="st-chip" style={{ width: '100%', marginBottom: 6 }} onClick={() => store.addKey(o.id)}><Icon name="key" size={13} /> Add key at {s.time.toFixed(2)}s</button>
      {o.keys.length === 0 && <div className="st-empty">No keys yet.</div>}
      {o.keys.map((k, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <button type="button" className="st-chip" style={{ flex: 1, textAlign: 'left' }} onClick={() => store.setTime(k.t)}>{k.t.toFixed(2)}s</button>
          <select className="st-select" style={{ width: 90 }} value={k.ease} onKeyDown={(e) => e.stopPropagation()} onChange={(e) => store.update(o.id, { keys: o.keys.map((x, j) => (j === i ? { ...x, ease: e.target.value } : x)) })}>
            {EASINGS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
          <button type="button" className="st-mini" aria-label="Delete key" onClick={() => store.removeKey(o.id, i)}><Icon name="trash" size={13} /></button>
        </div>
      ))}
      {o.keys.length > 0 && <button type="button" className="st-chip" style={{ width: '100%', marginTop: 6 }} onClick={() => store.update(o.id, { keys: [] })}>Clear all keys</button>}
    </Section>
  );
}

function WorldTab({ s, store }) {
  const w = s.doc.world;
  return (
    <>
      <Section title="Scene">
        <Row label="Name"><TextInput value={s.doc.name} onChange={(n) => store.rename(n)} /></Row>
      </Section>
      <Section title="Background">
        <div className="st-grid3">
          {Object.entries(BACKGROUNDS).map(([id, b]) => (
            <button key={id} type="button" className="st-swatch" aria-pressed={w.bg === id} onClick={() => store.updateWorld({ bg: id })}><i style={{ background: b.color, border: '1px solid rgba(255,255,255,.3)' }} />{b.label}</button>
          ))}
        </div>
      </Section>
      <Section title="Lighting">
        <div style={{ marginBottom: 4 }}><NumberField label="Environment" value={w.env} step={0.05} min={0} max={4} onChange={(env, opts) => store.updateWorld({ env }, opts)} /></div>
        <NumberField label="Ambient" value={w.ambient} step={0.05} min={0} max={3} onChange={(ambient, opts) => store.updateWorld({ ambient }, opts)} />
      </Section>
      <Section title="View">
        <div className="st-grid2">
          <button type="button" className="st-chip" aria-pressed={w.grid} onClick={() => store.updateWorld({ grid: !w.grid })}><Icon name="grid" size={13} /> Grid</button>
          <button type="button" className="st-chip" aria-pressed={w.shadows} onClick={() => store.updateWorld({ shadows: !w.shadows })}>Shadows</button>
        </div>
      </Section>
    </>
  );
}

export default function Properties({ s, store, uploadSvg }) {
  const [tab, setTab] = useState('object');
  const o = s.doc.objects.find((x) => x.id === s.selection[s.selection.length - 1]) ?? null;
  const needsObject = tab !== 'world';
  const set = (patch, opts) => o && store.update(o.id, patch, opts);
  return (
    <section className="st-props" aria-label="Properties">
      <div className="st-tabs" role="tablist" aria-orientation="vertical">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} title={t.label} aria-label={t.label} className="st-tab" onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} />
          </button>
        ))}
      </div>
      <div className="st-panel">
        {needsObject && !o ? (
          <div className="st-empty">Select an object to edit it.<br />Click one in the 3D view or the outliner.</div>
        ) : tab === 'object' ? <ObjectTab o={o} s={s} store={store} />
          : tab === 'shape' ? <ShapeTab o={o} set={set} uploadSvg={uploadSvg} />
          : tab === 'material' ? <MaterialTab o={o} set={set} />
          : tab === 'anim' ? <AnimTab o={o} s={s} store={store} />
          : <WorldTab s={s} store={store} />}
        {s.selection.length > 1 && needsObject ? <p style={{ color: 'var(--st-dim)', marginTop: 12 }}>{s.selection.length} selected: showing the last one.</p> : null}
      </div>
    </section>
  );
}
