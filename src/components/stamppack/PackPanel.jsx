import { CLIPS, CLIP_IDS } from '../../stamppack/animation.js';
import { ACCEPT, BACKDROPS, HEADER_FONTS, LOOKS, PACK_LIMITS as L, STAMP_SHAPES } from '../../stamppack/constants.js';
import { FORMAT_INFO } from '../../stamppack/exporters.js';
import { Seg, Section } from '../panel/ui.jsx';
import { ColorField, FileButton, Slider, inputClass } from '../tagbuilder/controls.jsx';

function TextField({ id, label, value, onChange, max, placeholder }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-soft block text-[11px] uppercase tracking-wider">{label}</label>
      <input id={id} type="text" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
  );
}

function Images({ p }) {
  const byId = new Map(p.images.map((i) => [i.id, i]));
  return (
    <Section title="01 Pictures" hint={`${p.design.stamps.length} / ${L.maxStamps}`}>
      <label htmlFor="pack-upload" className="hud-btn flex min-h-[44px] cursor-pointer items-center justify-center px-2 text-center text-[11px] font-bold uppercase tracking-wider">
        + Upload pictures (JPG, PNG, WebP, GIF, AVIF, BMP, SVG)
        <input
          id="pack-upload"
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = '';
            p.addFiles(files);
          }}
        />
      </label>
      <p className="text-soft font-mono text-[11px]">You can also drop files onto the 3D view. Pictures stay in your browser.</p>
      <ul className="grid grid-cols-4 gap-1.5" aria-label="Stamps">
        {p.design.stamps.map((s, i) => {
          const img = byId.get(s.imageId);
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={s.id === p.selectedId}
                aria-label={`Stamp ${i + 1}${img ? `: ${img.name}` : ''}`}
                onClick={() => p.setSelectedId(s.id === p.selectedId ? null : s.id)}
                className={`seg flex aspect-square w-full items-center justify-center overflow-hidden p-0.5 ${s.id === p.selectedId ? '!bg-white' : ''}`}
              >
                {img ? <img src={img.thumb} alt="" className="max-h-full max-w-full object-cover" /> : <span className="text-[11px]">empty</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={p.shuffle} disabled={!p.design.stamps.length}>Shuffle</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.loadSamples}>Samples</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.clearStamps} disabled={!p.design.stamps.length}>Clear</button>
      </div>
    </Section>
  );
}

function StampEditor({ p, s }) {
  const set = (patch) => p.updateStamp(s.id, patch);
  const inkUsed = s.look === 'halftone' || s.look === 'duotone' || s.caption;
  return (
    <Section title="02 Selected stamp">
      <div className="grid grid-cols-5 gap-1" role="group" aria-label="Stamp shape">
        {STAMP_SHAPES.map((sh) => (
          <Seg key={sh.id} pressed={s.shape === sh.id} onClick={() => set({ shape: sh.id })} className="min-h-[32px] px-0 text-[11px]">{sh.label}</Seg>
        ))}
      </div>
      <Slider id="st-scale" label="Size" value={Math.round(s.scale * 100)} min={L.scale[0] * 100} max={L.scale[1] * 100} unit="%" onChange={(v) => set({ scale: v / 100 })} />
      <Slider id="st-rot" label="Rotation" value={Math.round(s.rot)} min={-180} max={180} unit="°" onChange={(rot) => set({ rot })} />
      <Slider id="st-x" label="Left / right" value={Math.round(s.x)} min={-74} max={74} unit=" mm" onChange={(x) => set({ x })} />
      <Slider id="st-y" label="Up / down" value={Math.round(s.y)} min={-88} max={62} unit=" mm" onChange={(y) => set({ y })} />
      <Slider id="st-border" label="White border" value={s.border} min={L.border[0]} max={L.border[1]} step={0.2} unit=" mm" onChange={(border) => set({ border })} />
      <Slider id="st-pitch" label="Perforation size" value={s.pitch} min={L.pitch[0]} max={L.pitch[1]} step={0.1} unit=" mm" onChange={(pitch) => set({ pitch })} />
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Print look">
        {LOOKS.map((l) => (
          <Seg key={l.id} pressed={s.look === l.id} onClick={() => set({ look: l.id })} className="min-h-[32px] px-0 text-[11px]">{l.label}</Seg>
        ))}
      </div>
      <ColorField id="st-ink" label="Ink colour" value={s.ink} onChange={(ink) => set({ ink })} disabled={!inkUsed} />
      <Slider id="st-zoom" label="Zoom picture" value={s.zoom} min={L.zoom[0]} max={L.zoom[1]} step={0.05} unit="×" onChange={(zoom) => set({ zoom })} />
      <Slider id="st-px" label="Move picture left / right" value={s.panX} min={-1} max={1} step={0.05} onChange={(panX) => set({ panX })} />
      <Slider id="st-py" label="Move picture up / down" value={s.panY} min={-1} max={1} step={0.05} onChange={(panY) => set({ panY })} />
      <TextField id="st-cap" label={s.shape === 'wedge' ? 'Caption (not on wedge)' : 'Caption'} value={s.caption} max={L.captionLength} placeholder="e.g. MADE IN U.S.A" onChange={(caption) => set({ caption })} />
      <FileButton id="st-replace" label="Replace picture" accept={ACCEPT} onFile={(f) => p.replaceImage(f, s.id)} />
      <div className="grid grid-cols-4 gap-1.5">
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={() => p.reorder(s.id, 'front')}>Front</button>
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={() => p.reorder(s.id, 'back')}>Back</button>
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={() => p.duplicateStamp(s.id)}>Copy</button>
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={() => p.removeStamp(s.id)}>Delete</button>
      </div>
    </Section>
  );
}

function Header({ p }) {
  const c = p.design.card;
  const set = p.updateCard;
  return (
    <Section title="03 Header card" defaultOpen>
      <Seg pressed={c.show} onClick={() => set({ show: !c.show })} className="min-h-[32px] w-full text-[11px] uppercase">Header card {c.show ? 'on' : 'off'}</Seg>
      <TextField id="hc-1" label="Line 1" value={c.line1} max={L.lineLength} onChange={(line1) => set({ line1 })} />
      <TextField id="hc-2" label="Line 2" value={c.line2} max={L.lineLength} onChange={(line2) => set({ line2 })} />
      <TextField id="hc-3" label="Line 3" value={c.line3} max={L.lineLength} onChange={(line3) => set({ line3 })} />
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Header font">
        {HEADER_FONTS.map((f) => (
          <Seg key={f.id} pressed={c.font === f.id} onClick={() => set({ font: f.id })} className="min-h-[32px] text-[11px]">{f.label}</Seg>
        ))}
      </div>
      <ColorField id="hc-ink" label="Text colour" value={c.ink} onChange={(ink) => set({ ink })} />
      <ColorField id="hc-paper" label="Card colour" value={c.paper} onChange={(paper) => set({ paper })} />
      <Seg pressed={c.hole} onClick={() => set({ hole: !c.hole })} className="min-h-[32px] w-full text-[11px] uppercase">Hanging hole {c.hole ? 'on' : 'off'}</Seg>
      <div className="grid grid-cols-2 gap-1.5">
        <FileButton id="hc-logo" label={c.logoId ? 'Replace logo' : 'Upload logo'} accept={ACCEPT} onFile={(f) => p.setCardImage('logo', f)} />
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" disabled={!c.logoId} onClick={() => p.setCardImage('logo', null)}>Remove logo</button>
        <FileButton id="hc-icon" label={c.iconId ? 'Replace icon' : 'Upload icon'} accept={ACCEPT} onFile={(f) => p.setCardImage('icon', f)} />
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" disabled={!c.iconId} onClick={() => p.setCardImage('icon', null)}>Remove icon</button>
      </div>
    </Section>
  );
}

function Pack({ p }) {
  const d = p.design;
  return (
    <Section title="04 Pack & backdrop" defaultOpen={false}>
      <Seg pressed={d.bag} onClick={() => p.updateGlobal({ bag: !d.bag })} className="min-h-[32px] w-full text-[11px] uppercase">Clear bag {d.bag ? 'on' : 'off'}</Seg>
      <ColorField id="pk-paper" label="Stamp paper" value={d.paper} onChange={(paper) => p.updateGlobal({ paper })} />
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Backdrop">
        {Object.entries(BACKDROPS).map(([id, v]) => (
          <Seg key={id} pressed={d.backdrop === id} onClick={() => p.updateGlobal({ backdrop: id })} className="min-h-[32px] text-[11px]">{v.label}</Seg>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.resetView}>Reset view</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={p.topView}>Top view</button>
      </div>
    </Section>
  );
}

function Motion({ p }) {
  return (
    <Section title="05 Animation" hint={p.animation === 'off' ? 'off' : CLIPS[p.animation].label}>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Preview animation">
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
    <Section title="06 Download" hint={`${p.stats.triangles.toLocaleString()} tris`}>
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
        {[['none', 'Still'], ...CLIP_IDS.map((id) => [id, CLIPS[id].label]), ['both', 'Both']].map(([id, label]) => (
          <Seg key={id} pressed={p.exportAnim === id} onClick={() => p.setExportAnim(id)} className="min-h-[32px] px-0 text-[11px] uppercase">{label}</Seg>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(FORMAT_INFO).map(([id, f]) => (
          <button key={id} type="button" disabled={p.busy} onClick={() => p.handleExport(id)} title={f.note} className="hud-btn min-h-[40px] text-[11px] font-bold uppercase">{f.label} 3D model</button>
        ))}
      </div>
      <p className="text-soft font-mono text-[11px]">The 3D model carries the chosen loop. Images are saved at the current view and backdrop. Built in {p.stats.ms} ms.</p>
    </Section>
  );
}

export default function PackPanel({ p }) {
  return (
    <aside aria-label="Stamp Pack controls" className="z-40 flex h-[48dvh] w-full shrink-0 flex-col border-t border-white/30 bg-brand text-white md:order-first md:h-full md:w-[400px] md:border-r md:border-t-0 lg:w-[460px]">
      <header className="flex items-center justify-between gap-2 border-b border-white/30 p-3 md:p-4">
        <h1 className="font-pixel flex items-center gap-2.5 text-xs tracking-wider">
          <span className="inline-block h-2.5 w-2.5 bg-white" aria-hidden="true"></span>
          <span>MOCHA // STAMP PACK</span>
        </h1>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Images p={p} />
        {p.selected ? <StampEditor p={p} s={p.selected} /> : null}
        <Header p={p} />
        <Pack p={p} />
        <Motion p={p} />
        <Download p={p} />
      </div>
    </aside>
  );
}
