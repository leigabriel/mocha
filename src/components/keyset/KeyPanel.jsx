import { CLIPS, CLIP_IDS } from '../../tagbuilder/animation.js';
import { FONTS } from '../../tagbuilder/constants.js';
import {
  BACKDROPS,
  CHARM_STYLES,
  CLASPS,
  LIGHTING_IDS,
  MATERIALS,
  METALS,
  SET_LIMITS as L,
  SILHOUETTES,
  TEXT_MODES,
  TEXT_ROTATIONS,
} from '../../keyset/constants.js';
import { FORMAT_INFO } from '../../keyset/exporters.js';
import { styleInfo } from '../../keyset/design.js';
import { Seg, Section } from '../panel/ui.jsx';
import { ColorField, FileButton, SelectField, Slider, inputClass } from '../tagbuilder/controls.jsx';

function TextField({ id, label, value, onChange, max, placeholder }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-soft block text-[11px] uppercase tracking-wider">{label}</label>
      <input id={id} type="text" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function Options({ label, value, options, onChange, cols = 3 }) {
  return (
    <div className="space-y-1">
      <div className="text-soft text-[11px] uppercase tracking-wider">{label}</div>
      <div className={`grid gap-1 ${cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3'}`} role="group" aria-label={label}>
        {options.map((o) => (
          <Seg key={o.id} pressed={value === o.id} onClick={() => onChange(o.id)} className="min-h-[32px] px-1 text-[11px] uppercase">{o.label}</Seg>
        ))}
      </div>
    </div>
  );
}

function Hardware({ p }) {
  const d = p.design;
  return (
    <Section title="01 Clasp & scene">
      <Options label="Clasp" value={d.clasp} options={CLASPS} cols={2} onChange={(clasp) => p.updateGlobal({ clasp })} />
      <Options label="Metal" value={d.metal} options={Object.entries(METALS).map(([id, m]) => ({ id, label: m.label }))} cols={4} onChange={(metal) => p.updateGlobal({ metal })} />
      {d.clasp === 'glass' && <ColorField id="ks-tint" label="Glass tint" value={d.glassTint} onChange={(glassTint) => p.updateGlobal({ glassTint })} />}
      <Options label="Backdrop" value={d.backdrop} options={Object.entries(BACKDROPS).map(([id, b]) => ({ id, label: b.label }))} cols={3} onChange={(backdrop) => p.updateGlobal({ backdrop })} />
      <Options label="Lighting" value={d.lighting} options={LIGHTING_IDS.map((id) => ({ id, label: id }))} onChange={(lighting) => p.updateGlobal({ lighting })} />
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={p.generate}>Generate</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.resetDesign}>Reference</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.frontView}>Front</button>
      </div>
    </Section>
  );
}

function Charms({ p }) {
  return (
    <Section title="02 Charms" hint={`${p.design.charms.length} / ${L.maxCharms}`}>
      <ul className="space-y-1" aria-label="Charms">
        {p.design.charms.map((c, i) => (
          <li key={c.id} className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={c.id === p.selectedId}
              onClick={() => p.setSelectedId(c.id === p.selectedId ? null : c.id)}
              className={`seg flex min-h-[34px] flex-1 items-center gap-2 px-2 text-left text-[11px] uppercase ${c.id === p.selectedId ? '!bg-white' : ''}`}
            >
              <span className="inline-block h-3 w-3 shrink-0 border border-white/70" style={{ background: c.color }} aria-hidden="true"></span>
              <span className="truncate">{i + 1}. {styleInfo(c.style).label}{c.title ? ` · ${c.title}` : ''}</span>
            </button>
            <button type="button" aria-label={`Move ${styleInfo(c.style).label} left`} disabled={i === 0} onClick={() => p.moveCharm(c.id, -1)} className="hud-btn-subtle min-h-[34px] w-8 text-xs">↑</button>
            <button type="button" aria-label={`Move ${styleInfo(c.style).label} right`} disabled={i === p.design.charms.length - 1} onClick={() => p.moveCharm(c.id, 1)} className="hud-btn-subtle min-h-[34px] w-8 text-xs">↓</button>
          </li>
        ))}
      </ul>
      <div className="text-soft text-[11px] uppercase tracking-wider">Add a charm</div>
      <div className="grid grid-cols-3 gap-1">
        {CHARM_STYLES.map((s) => (
          <button key={s.id} type="button" onClick={() => p.addCharm(s.id)} className="hud-btn-subtle min-h-[32px] px-1 text-[11px] uppercase">+ {s.label}</button>
        ))}
      </div>
    </Section>
  );
}

function CharmEditor({ p, c }) {
  const set = (patch) => p.updateCharm(c.id, patch);
  const vertical = c.style === 'bar' || c.style === 'ribbed';
  return (
    <Section title={`03 Edit: ${styleInfo(c.style).label}`}>
      <Options label="Style" value={c.style} options={CHARM_STYLES} onChange={(style) => set({ style, w: styleInfo(style).w, h: styleInfo(style).h, d: styleInfo(style).d })} />
      {c.style === 'silhouette' && (
        <>
          <Options label="Shape" value={c.silhouette} options={SILHOUETTES.filter((s) => s.id !== 'upload')} onChange={(silhouette) => set({ silhouette })} />
          <div className="grid grid-cols-2 gap-1.5">
            <FileButton id="ks-svg" label={c.svg ? 'Replace SVG shape' : 'Upload SVG shape'} accept=".svg,image/svg+xml" onFile={(f) => p.uploadSvg(c.id, f)} />
            <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" disabled={!c.svg} onClick={() => set({ silhouette: 'cat', svg: '' })}>Remove SVG</button>
          </div>
        </>
      )}
      <Slider id="ks-w" label="Width" value={Math.round(c.w)} min={L.w[0]} max={L.w[1]} unit=" mm" onChange={(w) => set({ w })} />
      <Slider id="ks-h" label="Height" value={Math.round(c.h)} min={L.h[0]} max={L.h[1]} unit=" mm" onChange={(h) => set({ h })} />
      <Slider id="ks-d" label="Thickness" value={c.d} min={L.d[0]} max={L.d[1]} step={0.2} unit=" mm" onChange={(d) => set({ d })} />
      {c.style !== 'silhouette' && c.style !== 'circle' && <Slider id="ks-r" label="Corner radius" value={Math.round(c.r)} min={L.r[0]} max={L.r[1]} unit=" mm" onChange={(r) => set({ r })} />}
      <Options label="Material" value={c.material} options={MATERIALS} onChange={(material) => set({ material })} />
      <ColorField id="ks-color" label={c.material === 'glass' || c.material === 'frost' ? 'Tint' : 'Colour'} value={c.color} onChange={(color) => set({ color })} />
      {c.style !== 'silhouette' && (
        <>
          <Slider id="ks-ribs" label="Ribs" value={c.ribs} min={L.ribs[0]} max={L.ribs[1]} onChange={(ribs) => set({ ribs })} />
          <Seg pressed={c.ruler} onClick={() => set({ ruler: !c.ruler })} className="min-h-[32px] w-full text-[11px] uppercase">{vertical || c.style === 'motel' ? 'Ruler & crosshair' : 'Ring marking'} {c.ruler ? 'on' : 'off'}</Seg>
          <TextField id="ks-title" label="Title" value={c.title} max={L.textLength} onChange={(title) => set({ title })} />
          <TextField id="ks-sub" label="Small line" value={c.sub} max={L.textLength} onChange={(sub) => set({ sub })} />
          <TextField id="ks-num" label="Number" value={c.num} max={8} placeholder="01" onChange={(num) => set({ num })} />
          <SelectField id="ks-font" label="Font" value={c.font} onChange={(font) => set({ font })} options={FONTS} />
          <Options label="Text" value={c.textMode} options={TEXT_MODES} onChange={(textMode) => set({ textMode })} />
          <Options label="Text direction" value={c.textRotate} options={TEXT_ROTATIONS} cols={4} onChange={(textRotate) => set({ textRotate })} />
          <ColorField id="ks-tcolor" label="Text colour" value={c.textColor} onChange={(textColor) => set({ textColor })} />
          {c.textMode === 'raised' && (
            <>
              <Options label="Text material" value={c.textMaterial} options={MATERIALS} onChange={(textMaterial) => set({ textMaterial })} />
              <Slider id="ks-tdepth" label="Text height" value={c.textDepth} min={L.textDepth[0]} max={L.textDepth[1]} step={0.1} unit=" mm" onChange={(textDepth) => set({ textDepth })} />
            </>
          )}
          <Slider id="ks-tsize" label="Text size" value={c.textSize} min={L.textSize[0]} max={L.textSize[1]} unit="%" onChange={(textSize) => set({ textSize })} />
        </>
      )}
      <Slider id="ks-chain" label="Chain links" value={c.chain} min={L.chain[0]} max={L.chain[1]} onChange={(chain) => set({ chain })} />
      <Slider id="ks-yaw" label="Turn" value={Math.round(c.yaw)} min={-45} max={45} unit="°" onChange={(yaw) => set({ yaw })} />
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={() => p.duplicateCharm(c.id)}>Duplicate</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={() => p.removeCharm(c.id)}>Remove</button>
      </div>
    </Section>
  );
}

function Motion({ p }) {
  return (
    <Section title="04 Animation" hint={p.animation === 'off' ? 'off' : CLIPS[p.animation].label}>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Preview animation">
        <Seg pressed={p.animation === 'off'} onClick={() => p.setAnimation('off')} className="min-h-[34px] text-[11px] uppercase">Off</Seg>
        {CLIP_IDS.map((id) => (
          <Seg key={id} pressed={p.animation === id} onClick={() => p.setAnimation(id)} className="min-h-[34px] text-[11px] uppercase">{CLIPS[id].label}</Seg>
        ))}
      </div>
    </Section>
  );
}

function Download({ p }) {
  return (
    <Section title="05 Download" hint={`${p.stats.triangles.toLocaleString()} tris`}>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Image scale">
        {[1, 2, 3, 4].map((n) => (
          <Seg key={n} pressed={p.imageScale === n} onClick={() => p.setImageScale(n)} className="min-h-[32px] text-[11px]">{n}×</Seg>
        ))}
      </div>
      <Seg pressed={p.transparent} onClick={() => p.setTransparent(!p.transparent)} className="min-h-[32px] w-full text-[11px] uppercase">PNG transparent background {p.transparent ? 'on' : 'off'}</Seg>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={p.busy} onClick={() => p.renderImage('png')} className="hud-btn min-h-[40px] text-[11px] font-bold uppercase">PNG image</button>
        <button type="button" disabled={p.busy} onClick={() => p.renderImage('jpeg')} className="hud-btn min-h-[40px] text-[11px] font-bold uppercase">JPG image</button>
      </div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Animation to embed in the 3D model">
        {[['none', 'Still'], ...CLIP_IDS.map((id) => [id, CLIPS[id].label]), ['both', 'All']].map(([id, label]) => (
          <Seg key={id} pressed={p.exportAnim === id} onClick={() => p.setExportAnim(id)} className="min-h-[32px] px-0 text-[10px] uppercase">{label}</Seg>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {['gltf', 'glb'].map((id) => (
          <button key={id} type="button" disabled={p.busy} onClick={() => p.handleExport(id)} title={FORMAT_INFO[id].note} className="hud-btn min-h-[40px] text-[11px] font-bold uppercase">{FORMAT_INFO[id].label}{id === 'gltf' ? ' ★' : ''}</button>
        ))}
      </div>
      <div className="text-soft text-[11px] uppercase tracking-wider">Blender render quality</div>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Blender render quality">
        {[['draft', 'Draft'], ['high', 'High'], ['ultra', 'Ultra']].map(([id, label]) => (
          <Seg key={id} pressed={p.quality === id} onClick={() => p.setQuality(id)} className="min-h-[32px] text-[11px] uppercase">{label}</Seg>
        ))}
      </div>
      <button type="button" disabled={p.busy} onClick={() => p.handleExport('blend')} title={FORMAT_INFO.blend.note} className="hud-btn min-h-[40px] w-full text-[11px] font-bold uppercase">Blender scene (.py, Cycles)</button>
      <p className="text-soft font-mono text-[11px]">Blender: open the file in the Scripting tab and run it, or <span className="normal-case">blender -b -P file.py -- out.png</span> (add <span className="normal-case">--anim</span> for the turntable). Built in {p.stats.ms} ms.</p>
    </Section>
  );
}

export default function KeyPanel({ p }) {
  return (
    <aside aria-label="Keychain Set controls" className="z-40 flex h-[48dvh] w-full shrink-0 flex-col border-t border-white/30 bg-brand text-white md:order-first md:h-full md:w-[400px] md:border-r md:border-t-0 lg:w-[460px]">
      <header className="flex items-center justify-between gap-2 border-b border-white/30 p-3 md:p-4">
        <h1 className="font-pixel flex items-center gap-2.5 text-xs tracking-wider">
          <span className="inline-block h-2.5 w-2.5 bg-white" aria-hidden="true"></span>
          <span>MOCHA // KEYCHAIN SET</span>
        </h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Hardware p={p} />
        <Charms p={p} />
        {p.selected ? <CharmEditor p={p} c={p.selected} /> : null}
        <Motion p={p} />
        <Download p={p} />
      </div>
    </aside>
  );
}
