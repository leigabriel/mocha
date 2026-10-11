import Toast from '../Toast.jsx';
import { useStickers } from '../../hooks/useStickers.js';
import { GROUPS } from '../../stickers/library.js';
import { BACKGROUNDS } from '../../stickers/stage.js';
import { FONTS } from '../../stickers/fonts.js';
import { BORDER_MODES, CUSTOM_DECOS, CUSTOM_ICONS, CUSTOM_SHAPES, CUSTOM_TEMPLATES, FINISHES, ROLES, ROLE_LABELS } from '../../stickers/styles.js';
import { PIXEL_NAMES } from '../../stickers/shapes.js';
import { Seg, Section } from '../panel/ui.jsx';
import { ColorField, FileButton, SelectField, Slider, inputClass } from '../tagbuilder/controls.jsx';

const opts = (list) => list.map((id) => ({ id, label: id.replace(/_/g, ' ') }));

function Library({ p }) {
  const groups = [{ id: 'all', label: 'All' }, ...(p.customs.length ? [{ id: 'mine', label: 'Mine' }] : []), ...GROUPS];
  const shown = p.defs.filter((d) => p.group === 'all' || d.group === p.group);
  return (
    <Section title="01 Sticker library" hint={`${p.defs.length} stickers`}>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Sticker group">
        {groups.map((g) => (
          <Seg key={g.id} pressed={p.group === g.id} onClick={() => p.setGroup(g.id)} className="min-h-[28px] px-2 text-[10px] uppercase">{g.label}</Seg>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Stickers">
        {shown.map((d) => (
          <button
            key={d.id}
            type="button"
            aria-pressed={p.id === d.id && p.view === 'single'}
            aria-label={d.name}
            title={d.name}
            onClick={() => p.select(d.id)}
            className="seg flex aspect-square min-h-0 items-center justify-center overflow-hidden bg-black/35 p-1.5"
          >
            {p.thumbs[d.id] ? <img src={p.thumbs[d.id]} alt="" draggable={false} className="max-h-full max-w-full object-contain" /> : <span className="text-[10px] opacity-60">…</span>}
          </button>
        ))}
      </div>
      <p className="text-soft text-[12px]">{p.current.name} — free to use, edit and export.</p>
    </Section>
  );
}

function PackStyle({ p }) {
  const s = p.style;
  return (
    <Section title="02 My pack style" hint={s.name}>
      <label htmlFor="st-name" className="text-soft block text-[11px] uppercase tracking-wider">Pack name</label>
      <input id="st-name" className={inputClass} value={s.name} maxLength={40} onChange={(e) => p.patchStyle({ name: e.target.value })} />
      <div className="text-soft text-[11px] uppercase tracking-wider">Start from</div>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Style presets">
        {Object.entries(p.presets).map(([k, v]) => (
          <button key={k} type="button" onClick={() => p.applyPreset(k)} className="seg flex min-h-[34px] flex-col items-stretch gap-1 px-1.5 py-1 text-[10px] uppercase">
            <span className="flex h-2.5 overflow-hidden">
              {ROLES.map((r) => <span key={r} className="flex-1" style={{ background: v.palette[r] }} />)}
            </span>
            {v.name}
          </button>
        ))}
      </div>
      {ROLES.map((r) => (
        <ColorField key={r} id={`st-${r}`} label={ROLE_LABELS[r]} value={s.palette[r]} onChange={(v) => p.setPalette(r, v)} />
      ))}
      <SelectField id="st-font" label="Headline font" value={s.font} onChange={(v) => p.patchStyle({ font: v })} options={Object.entries(FONTS).map(([id, f]) => ({ id, label: f.label }))} />
      <div className="text-soft text-[11px] uppercase tracking-wider">Cut border</div>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Border style">
        {Object.entries(BORDER_MODES).map(([k, v]) => (
          <Seg key={k} pressed={s.border.mode === k} onClick={() => p.setBorder({ mode: k })} className="min-h-[30px] text-[11px] uppercase">{v.label}</Seg>
        ))}
      </div>
      <Slider id="st-bw" label="Border width" value={s.border.width} min={0} max={0.8} step={0.05} unit=" cm" disabled={s.border.mode === 'none'} onChange={(v) => p.setBorder({ width: v })} />
      <ColorField id="st-bc" label="Border colour" value={s.border.color} disabled={s.border.mode === 'none'} onChange={(v) => p.setBorder({ color: v })} />
      <div className="text-soft text-[11px] uppercase tracking-wider">Finish</div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Finish">
        {Object.entries(FINISHES).map(([k, v]) => (
          <Seg key={k} pressed={s.finish === k} onClick={() => p.patchStyle({ finish: k })} title={v.note} className="min-h-[30px] px-0 text-[10px] uppercase">{v.label}</Seg>
        ))}
      </div>
      <Slider id="st-th" label="Thickness" value={s.thickness} min={0.02} max={0.3} step={0.01} unit=" cm" onChange={(v) => p.patchStyle({ thickness: v })} />
      <Slider id="st-soft" label="Corner softness" value={s.softness} min={0} max={3} step={1} onChange={(v) => p.patchStyle({ softness: v })} />
      <Slider id="st-grain" label="Paper grain" value={s.grain} min={0} max={0.6} step={0.05} onChange={(v) => p.patchStyle({ grain: v })} />
      <div className="flex items-center justify-between gap-2">
        <Seg pressed={s.cord} onClick={() => p.patchStyle({ cord: !s.cord })} className="min-h-[30px] flex-1 text-[11px] uppercase">Hang cord on tags</Seg>
        <input aria-label="Cord colour" type="color" value={s.cordColor} onChange={(e) => p.patchStyle({ cordColor: e.target.value })} className="h-7 w-10 cursor-pointer border border-white/60 bg-transparent p-0" />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={p.saveStyle}>Save style</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.resetStyle}>Reset</button>
      </div>
      {p.saved.length > 0 && (
        <ul className="space-y-1" aria-label="Saved styles">
          {p.saved.map((x) => (
            <li key={x.name} className="flex items-center gap-1.5">
              <button type="button" onClick={() => p.loadStyle(x.name)} className="seg flex min-h-[30px] flex-1 items-center gap-2 px-2 text-left text-[11px] uppercase">
                <span className="flex h-2.5 w-10 overflow-hidden">{ROLES.map((r) => <span key={r} className="flex-1" style={{ background: x.palette[r] }} />)}</span>
                <span className="truncate">{x.name}</span>
              </button>
              <button type="button" aria-label={`Delete style ${x.name}`} onClick={() => p.deleteStyle(x.name)} className="hud-btn-subtle min-h-[30px] px-2 text-[11px]">×</button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Mine({ p }) {
  const c = p.customRecord;
  const roleOptions = ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r] }));
  return (
    <Section title="03 My stickers" hint={`${p.customs.length} made`}>
      <button type="button" className="hud-btn min-h-[36px] w-full text-[11px] uppercase" onClick={() => p.addCustom()}>+ New sticker</button>
      {!c ? (
        <p className="text-soft text-[12px]">Make your own die-cut: pick a silhouette and artwork type, type your words, and it joins your pack. Select one of yours in the library to edit it.</p>
      ) : (
        <div className="space-y-2.5">
          <div>
            <label htmlFor="cs-name" className="text-soft block text-[11px] uppercase tracking-wider">Name</label>
            <input id="cs-name" className={inputClass} value={c.name} maxLength={40} onChange={(e) => p.updateCustom({ name: e.target.value })} />
          </div>
          <SelectField id="cs-shape" label="Die-cut shape" value={c.shape} onChange={(v) => p.updateCustom({ shape: v })} options={opts(CUSTOM_SHAPES)} />
          {c.shape === 'pixel' && <SelectField id="cs-pixel" label="Pixel art" value={c.pixel} onChange={(v) => p.updateCustom({ pixel: v })} options={opts(PIXEL_NAMES)} />}
          <SelectField id="cs-tpl" label="Artwork" value={c.tpl} onChange={(v) => p.updateCustom({ tpl: v })} options={opts(CUSTOM_TEMPLATES)} />
          <Slider id="cs-w" label="Width" value={c.w} min={2.5} max={14} step={0.5} unit=" cm" onChange={(v) => p.updateCustom({ w: v })} />
          <Slider id="cs-h" label="Height" value={c.h} min={2.5} max={14} step={0.5} unit=" cm" onChange={(v) => p.updateCustom({ h: v })} />
          <div>
            <label htmlFor="cs-title" className="text-soft block text-[11px] uppercase tracking-wider">Text (one line per row)</label>
            <textarea id="cs-title" rows={3} className={inputClass} value={c.title} maxLength={60} onChange={(e) => p.updateCustom({ title: e.target.value })} />
          </div>
          <div>
            <label htmlFor="cs-sub" className="text-soft block text-[11px] uppercase tracking-wider">Small print</label>
            <input id="cs-sub" className={inputClass} value={c.sub} maxLength={60} onChange={(e) => p.updateCustom({ sub: e.target.value })} />
          </div>
          <SelectField id="cs-icon" label="Pictogram" value={c.icon} onChange={(v) => p.updateCustom({ icon: v })} options={opts(CUSTOM_ICONS)} />
          <div className="grid grid-cols-2 gap-2">
            <SelectField id="cs-bg" label="Background" value={c.bg} onChange={(v) => p.updateCustom({ bg: v })} options={roleOptions} />
            <SelectField id="cs-fg" label="Text colour" value={c.fg} onChange={(v) => p.updateCustom({ fg: v })} options={roleOptions} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SelectField id="cs-deco" label="Pattern" value={c.deco} onChange={(v) => p.updateCustom({ deco: v })} options={opts(CUSTOM_DECOS)} />
            <SelectField id="cs-code" label="Code" value={c.code} onChange={(v) => p.updateCustom({ code: v })} options={opts(['none', 'qr', 'bar'])} />
          </div>
          <Seg pressed={c.cord} onClick={() => p.updateCustom({ cord: !c.cord })} className="min-h-[30px] w-full text-[11px] uppercase">Hang cord (needs a tag, fob or loop shape)</Seg>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" className="hud-btn-subtle min-h-[32px] text-[11px] uppercase" onClick={p.duplicateCustom}>Duplicate</button>
            <button type="button" className="hud-btn-subtle min-h-[32px] text-[11px] uppercase" onClick={p.deleteCustom}>Delete</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function Scene({ p }) {
  return (
    <Section title="04 View">
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="View">
        <Seg pressed={p.view === 'single'} onClick={() => p.setView('single')} className="min-h-[32px] text-[11px] uppercase">One sticker</Seg>
        <Seg pressed={p.view === 'sheet'} onClick={() => p.setView('sheet')} className="min-h-[32px] text-[11px] uppercase">Whole sheet</Seg>
      </div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Background">
        {Object.entries(BACKGROUNDS).map(([k, v]) => (
          <Seg key={k} pressed={p.bg === k} onClick={() => p.setBg(k)} className="min-h-[30px] px-0 text-[10px] uppercase">{v.label}</Seg>
        ))}
      </div>
      <Seg pressed={p.spin} onClick={() => p.setSpin(!p.spin)} className="min-h-[30px] w-full text-[11px] uppercase">Gentle sway</Seg>
    </Section>
  );
}

function Download({ p }) {
  const models = ['glb', 'gltf', 'obj', 'stl'];
  const flats = ['png', 'svg'];
  return (
    <Section title="05 Download" hint={p.current.name}>
      <div className="text-soft text-[11px] uppercase tracking-wider">3D model</div>
      <div className="grid grid-cols-4 gap-1.5">
        {models.map((f) => (
          <button key={f} type="button" disabled={p.busy} onClick={() => p.exportOne(f)} title={p.formats[f].note} className="hud-btn min-h-[38px] px-0 text-[11px] font-bold uppercase">{p.formats[f].label}</button>
        ))}
      </div>
      <div className="text-soft text-[11px] uppercase tracking-wider">Flat artwork</div>
      <div className="grid grid-cols-4 gap-1.5">
        {flats.map((f) => (
          <button key={f} type="button" disabled={p.busy} onClick={() => p.exportOne(f, 3)} title={p.formats[f].note} className="hud-btn min-h-[38px] px-0 text-[11px] font-bold uppercase">{p.formats[f].label}</button>
        ))}
        <button type="button" disabled={p.busy} onClick={() => p.renderImage('image/png')} title="Screenshot of the 3D view" className="hud-btn-subtle min-h-[38px] px-0 text-[11px] uppercase">3D PNG</button>
        <button type="button" disabled={p.busy} onClick={() => p.renderImage('image/jpeg')} title="Screenshot of the 3D view" className="hud-btn-subtle min-h-[38px] px-0 text-[11px] uppercase">3D JPG</button>
      </div>
      <div className="text-soft text-[11px] uppercase tracking-wider">Whole pack ({p.defs.length})</div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={p.busy} onClick={() => p.exportSheetPNG('#000000')} className="hud-btn-subtle min-h-[34px] text-[11px] uppercase">Sheet PNG</button>
        <button type="button" disabled={p.busy} onClick={() => p.exportSheetPNG(null)} className="hud-btn-subtle min-h-[34px] text-[11px] uppercase">Sheet (clear)</button>
        <button type="button" disabled={p.busy} onClick={p.exportSheetModel} className="hud-btn-subtle min-h-[34px] text-[11px] uppercase">Sheet GLB</button>
        <button type="button" disabled={p.busy} onClick={p.exportZip} className="hud-btn-subtle min-h-[34px] text-[11px] uppercase">PNG zip</button>
        <button type="button" disabled={p.busy} onClick={p.exportPack} className="hud-btn-subtle min-h-[34px] text-[11px] uppercase">Save pack file</button>
        <FileButton id="st-import" label="Load pack file" accept=".json,application/json" onFile={p.importPack} />
      </div>
      <p className="text-soft font-mono text-[11px]">
        Models are in metres (a 7 cm sticker is 0.07 units). SVG carries a magenta CutContour path for print-and-cut machines.
      </p>
    </Section>
  );
}

/** Stickers tab: free built-in die-cut sticker designs as 3D models, plus your own pack style. */
export default function Stickers() {
  const [containerRef, p] = useStickers();
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={p.toast} />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div ref={containerRef} tabIndex={0} role="application" aria-label={`3D sticker preview: ${p.current.name}`} className="h-full w-full touch-none"></div>
        <p aria-hidden="true" className="pointer-events-none absolute left-3 top-3 hidden bg-black/60 px-2 py-1 text-[11px] uppercase tracking-wider text-white md:block">Drag to orbit · Scroll to zoom</p>
      </main>
      <aside aria-label="Sticker controls" className="z-40 flex h-[52dvh] w-full shrink-0 flex-col border-t border-white/30 bg-brand text-white md:order-first md:h-full md:w-[360px] md:border-r md:border-t-0">
        <header className="flex items-center justify-between gap-2 border-b border-white/30 p-3 md:p-4">
          <h1 className="font-pixel flex items-center gap-2.5 text-xs tracking-wider">
            <span className="inline-block h-2.5 w-2.5 bg-white" aria-hidden="true"></span>
            <span>MOCHA // STICKERS</span>
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Library p={p} />
          <PackStyle p={p} />
          <Mine p={p} />
          <Scene p={p} />
          <Download p={p} />
        </div>
      </aside>
    </div>
  );
}
