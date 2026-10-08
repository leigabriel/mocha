import { CLIPS, CLIP_IDS } from '../../tagbuilder/animation.js';
import { BACKGROUNDS, FONTS, MATERIAL_IDS, MATERIAL_LABELS, METAL_IDS, SHAPES, TAG_LIMITS as L } from '../../tagbuilder/constants.js';
import { FORMAT_INFO } from '../../tagbuilder/exporters.js';
import { PRESETS } from '../../tagbuilder/presets.js';
import { LinkIcon, RedoIcon, UndoIcon } from '../Icons.jsx';
import { Seg, Section } from '../panel/ui.jsx';
import { ColorField, FileButton, SelectField, Slider, inputClass } from './controls.jsx';

const FORMATS = Object.keys(FORMAT_INFO);
const matOptions = MATERIAL_IDS.map((id) => ({ id, label: MATERIAL_LABELS[id] }));

function TagList({ b }) {
  const { design, selectedId } = b;
  return (
    <Section title="01 Tags" hint={`${design.tags.length} / ${L.maxTags}`}>
      <ul className="space-y-1" aria-label="Tags">
        {design.tags.map((t, i) => (
          <li key={t.id} className="flex items-center gap-1">
            <Seg
              pressed={t.id === selectedId}
              onClick={() => b.setSelectedId(t.id === selectedId ? null : t.id)}
              className="min-h-[34px] flex-1 truncate px-2 text-left text-xs"
            >
              {i + 1}. {t.svg ? 'Logo' : t.text || 'Blank'} <span className="opacity-70">· {t.shape === 'none' ? 'free cut' : t.shape}</span>
            </Seg>
            <button type="button" className="hud-btn-subtle h-[34px] w-8" aria-label={`Move tag ${i + 1} up`} disabled={i === 0} onClick={() => b.moveTag(t.id, -1)}>↑</button>
            <button type="button" className="hud-btn-subtle h-[34px] w-8" aria-label={`Move tag ${i + 1} down`} disabled={i === design.tags.length - 1} onClick={() => b.moveTag(t.id, 1)}>↓</button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={() => b.addTag()}>+ Add</button>
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" disabled={!b.selected} onClick={() => b.duplicateTag(selectedId)}>Duplicate</button>
        <button type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" disabled={!b.selected} onClick={() => b.removeTag(selectedId)}>Remove</button>
      </div>
      {!b.selected ? <p className="text-soft font-mono text-[11px]">Select a tag here, or click it in the 3D view, to edit it.</p> : null}
    </Section>
  );
}

function TagSettings({ b, t }) {
  const set = (patch) => b.updateTag(t.id, patch);
  const free = t.shape === 'none';
  const cube = t.shape === 'cube';
  return (
    <>
      <Section title="02 Tag shape">
        <div className="grid grid-cols-4 gap-1" role="group" aria-label="Tag shape">
          {SHAPES.map((s) => (
            <Seg key={s.id} pressed={t.shape === s.id} onClick={() => set({ shape: s.id })} className="min-h-[32px] text-[11px]">{s.label}</Seg>
          ))}
        </div>
        <Slider id="tag-w" label="Width" value={t.w} min={L.w[0]} max={L.w[1]} unit=" mm" onChange={(w) => set({ w })} />
        <Slider id="tag-h" label="Height" value={t.h} min={L.h[0]} max={L.h[1]} unit=" mm" onChange={(h) => set({ h })} disabled={t.shape === 'circle'} />
        <Slider id="tag-d" label="Thickness" value={t.d} min={L.d[0]} max={L.d[1]} step={0.2} unit=" mm" onChange={(d) => set({ d })} />
        <Slider id="tag-r" label="Corner radius" value={t.r} min={L.r[0]} max={L.r[1]} step={0.5} unit=" mm" onChange={(r) => set({ r })} disabled={free || cube} />
        <Slider id="tag-yaw" label="Hang angle" value={t.yaw} min={-45} max={45} unit="°" onChange={(yaw) => set({ yaw })} />
        <Seg pressed={t.hole} onClick={() => set({ hole: !t.hole })} className="min-h-[32px] w-full text-[11px] uppercase">
          Key hole {t.hole ? 'on' : 'off'}
        </Seg>
        <ColorField id="tag-color" label="Colour" value={t.color} onChange={(color) => set({ color })} />
        <SelectField id="tag-mat" label="Material" value={t.material} onChange={(material) => set({ material })} options={matOptions} />
      </Section>

      <Section title="03 Text">
        <div className="space-y-1">
          <label htmlFor="tag-text" className="text-soft block text-[11px] uppercase tracking-wider">Text</label>
          <input
            id="tag-text"
            type="text"
            value={t.text}
            maxLength={L.textLength}
            placeholder="Type here"
            onChange={(e) => set({ text: e.target.value })}
            className={inputClass}
          />
        </div>
        <SelectField
          id="tag-font"
          label="Font"
          value={t.font}
          onChange={(font) => set({ font })}
          options={[...FONTS, ...(t.font.startsWith('custom-') ? [{ id: t.font, label: 'Custom font' }] : [])]}
        />
        <FileButton id="tag-font-file" label="Upload font (TTF, OTF, WOFF)" accept=".ttf,.otf,.woff" onFile={(f) => b.uploadFont(f, t.id)} />
        <Slider id="tag-tsize" label="Size" value={t.textSize} min={L.textSize[0]} max={L.textSize[1]} unit="%" onChange={(textSize) => set({ textSize })} />
        <Slider id="tag-tdepth" label="Raise height" value={t.textDepth} min={L.textDepth[0]} max={L.textDepth[1]} step={0.1} unit=" mm" onChange={(textDepth) => set({ textDepth })} />
        <div className="grid grid-cols-3 gap-1" role="group" aria-label="Text direction">
          {[[0, 'Across'], [-90, 'Up'], [90, 'Down']].map(([v, l]) => (
            <Seg key={v} pressed={t.textRotate === v} onClick={() => set({ textRotate: v })} className="min-h-[32px] text-[11px]">{l}</Seg>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Text side">
          {[['front', 'Front only'], ['both', 'Both sides']].map(([v, l]) => (
            <Seg key={v} pressed={t.textSide === v} onClick={() => set({ textSide: v })} className="min-h-[32px] text-[11px]">{l}</Seg>
          ))}
        </div>
        <ColorField id="tag-tcolor" label="Text colour" value={t.textColor} onChange={(textColor) => set({ textColor })} />
        <SelectField id="tag-tmat" label="Text material" value={t.textMaterial} onChange={(textMaterial) => set({ textMaterial })} options={matOptions} />
      </Section>

      <Section title="04 Outline rings" defaultOpen={false}>
        <Slider id="tag-o1" label="Outline 1" value={t.outline} min={L.outline[0]} max={L.outline[1]} step={0.2} unit=" mm" onChange={(outline) => set({ outline })} />
        <ColorField id="tag-o1c" label="Outline 1 colour" value={t.outlineColor} onChange={(outlineColor) => set({ outlineColor })} disabled={!t.outline} />
        <Slider id="tag-o2" label="Outline 2" value={t.outline2} min={L.outline[0]} max={L.outline[1]} step={0.2} unit=" mm" onChange={(outline2) => set({ outline2 })} disabled={!t.outline} />
        <ColorField id="tag-o2c" label="Outline 2 colour" value={t.outline2Color} onChange={(outline2Color) => set({ outline2Color })} disabled={!t.outline2} />
      </Section>

      <Section title="05 Logo (SVG)" defaultOpen={false}>
        <p className="text-soft font-mono text-[11px]">A filled SVG replaces the text on this tag (max 150 KB).</p>
        <div className="grid grid-cols-2 gap-1.5">
          <FileButton id="tag-svg" label={t.svg ? 'Replace SVG' : 'Upload SVG'} accept=".svg,image/svg+xml" onFile={(f) => b.uploadSvg(f, t.id)} />
          <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" disabled={!t.svg} onClick={() => set({ svg: '' })}>Clear logo</button>
        </div>
        <Seg pressed={t.svgKeepColors} disabled={!t.svg} onClick={() => set({ svgKeepColors: !t.svgKeepColors })} className="min-h-[32px] w-full text-[11px] uppercase">
          Keep logo colours {t.svgKeepColors ? 'on' : 'off'}
        </Seg>
      </Section>
    </>
  );
}

function Hardware({ b }) {
  const { design } = b;
  const g = b.updateGlobal;
  const carabiner = design.top === 'carabiner';
  return (
    <Section title="06 Hardware">
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Top fitting">
        <Seg pressed={carabiner} onClick={() => g({ top: 'carabiner' })} className="min-h-[32px] text-[11px] uppercase">Carabiner</Seg>
        <Seg pressed={!carabiner} onClick={() => g({ top: 'none' })} className="min-h-[32px] text-[11px] uppercase">Ring only</Seg>
      </div>
      <ColorField id="hw-cara" label="Carabiner colour" value={design.carabinerColor} onChange={(carabinerColor) => g({ carabinerColor })} disabled={!carabiner} />
      <ColorField id="hw-gate" label="Gate colour" value={design.gateColor} onChange={(gateColor) => g({ gateColor })} disabled={!carabiner} />
      <ColorField id="hw-sleeve" label="Lock sleeve" value={design.sleeveColor} onChange={(sleeveColor) => g({ sleeveColor })} disabled={!carabiner} />
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Metal finish">
        {METAL_IDS.map((m) => (
          <Seg key={m} pressed={design.metal === m} onClick={() => g({ metal: m })} className="min-h-[32px] text-[11px] capitalize">{m}</Seg>
        ))}
      </div>
      <Slider id="hw-keys" label="Keys on ring" value={design.keys} min={0} max={3} onChange={(keys) => g({ keys })} />
      <Slider id="hw-chain" label="Chain length" value={design.chain} min={0} max={4} onChange={(chain) => g({ chain })} />
    </Section>
  );
}

function Motion({ b }) {
  return (
    <Section title="07 Animation" hint={b.animation === 'off' ? 'off' : CLIPS[b.animation].label}>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Preview animation">
        <Seg pressed={b.animation === 'off'} onClick={() => b.setAnimation('off')} className="min-h-[34px] text-[11px] uppercase">Off</Seg>
        {CLIP_IDS.map((id) => (
          <Seg key={id} pressed={b.animation === id} onClick={() => b.setAnimation(id)} className="min-h-[34px] text-[11px] uppercase">{CLIPS[id].label}</Seg>
        ))}
      </div>
      <p className="text-soft font-mono text-[11px]">
        Plays live in the 3D view. Items sway on their chains and never pass through each other. Pick which loop to embed under Download.
      </p>
    </Section>
  );
}

function Scene({ b }) {
  return (
    <Section title="08 Backdrop & presets" defaultOpen={false}>
      <div className="grid grid-cols-5 gap-1" role="group" aria-label="Backdrop">
        {Object.entries(BACKGROUNDS).map(([id, v]) => (
          <Seg key={id} pressed={b.design.bg === id} onClick={() => b.updateGlobal({ bg: id })} className="min-h-[32px] text-[11px]">{v.label}</Seg>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" className="hud-btn min-h-[34px] text-[11px] uppercase" onClick={() => b.loadPreset(p.id)}>
            Load preset: {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={b.resetView}>Reset view</button>
        <button type="button" className="hud-btn-subtle min-h-[34px] text-[11px] uppercase" onClick={() => b.loadPreset('reference')}>Reset design</button>
      </div>
    </Section>
  );
}

function Export({ b }) {
  const { stats } = b;
  const h = stats.health;
  return (
    <Section title="09 Download" hint={`${stats.triangles.toLocaleString()} tris`}>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Animation to embed">
        {[['none', 'Still'], ...CLIP_IDS.map((id) => [id, CLIPS[id].label]), ['both', 'All clips']].map(([id, label]) => (
          <Seg key={id} pressed={b.exportAnim === id} onClick={() => b.setExportAnim(id)} className="min-h-[32px] text-[11px] uppercase" title="Animation embedded in GLB, GLTF and the Blender script">{label}</Seg>
        ))}
      </div>
      <p className="text-soft font-mono text-[11px]">Animation is embedded in GLB, GLTF and Blender. Other formats are still models.</p>
      <div className="grid grid-cols-2 gap-1.5">
        {FORMATS.map((f) => (
          <button key={f} type="button" disabled={b.busy} onClick={() => b.handleExport(f)} title={FORMAT_INFO[f].note} className="hud-btn min-h-[40px] text-[11px] font-bold uppercase">
            {FORMAT_INFO[f].label}
          </button>
        ))}
      </div>
      <ul className="text-soft space-y-0.5 font-mono text-[11px]">
        {FORMATS.map((f) => (
          <li key={f}><b>{FORMAT_INFO[f].label}:</b> {FORMAT_INFO[f].note}</li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button type="button" disabled={b.busy} onClick={() => b.renderImage({ transparent: false })} className="hud-btn min-h-[36px] text-[11px] uppercase">Render image</button>
        <button type="button" disabled={b.busy} onClick={() => b.renderImage({ transparent: true })} className="hud-btn min-h-[36px] text-[11px] uppercase">Transparent PNG</button>
      </div>
      <button type="button" onClick={b.checkPrintability} className="hud-btn-subtle min-h-[34px] w-full text-[11px] uppercase">Check mesh for printing</button>
      {h ? (
        <p role="status" className="text-soft font-mono text-[11px]">
          {h.parts} parts · {h.closed} closed · {h.openEdges.toLocaleString()} open edges. Parts overlap where they touch, so slice with “merge overlapping parts” on.
        </p>
      ) : null}
      {stats.overlap > 0.2 ? (
        <p role="alert" className="bg-white px-2 py-1.5 font-mono text-[11px] font-bold text-brand">
          Some parts touch each other. Lengthen the chain or remove a tag or key to separate them.
        </p>
      ) : null}
      <p className="text-soft font-mono text-[11px]">
        Size ≈ {stats.sizeMm.w}×{stats.sizeMm.h}×{stats.sizeMm.d} mm · overlap {stats.overlap === 0 ? 'none' : stats.overlap.toFixed(2)} · built in {stats.ms} ms
      </p>
    </Section>
  );
}

export default function TagPanel({ b }) {
  return (
    <aside aria-label="Tag Builder controls" className="z-40 flex h-[48dvh] w-full shrink-0 flex-col border-t border-white/30 bg-brand text-white md:order-first md:h-full md:w-[400px] md:border-r md:border-t-0 lg:w-[460px]">
      <header className="flex items-center justify-between gap-2 border-b border-white/30 p-3 md:p-4">
        <h1 className="font-pixel flex items-center gap-2.5 text-xs tracking-wider">
          <span className="inline-block h-2.5 w-2.5 bg-white" aria-hidden="true"></span>
          <span>MOCHA // TAG BUILDER</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={b.undo} disabled={!b.historyFlags.canUndo} aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" className="hud-btn-subtle flex h-8 w-8 items-center justify-center"><UndoIcon /></button>
          <button type="button" onClick={b.redo} disabled={!b.historyFlags.canRedo} aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)" className="hud-btn-subtle flex h-8 w-8 items-center justify-center"><RedoIcon /></button>
          <button type="button" onClick={b.copyShareLink} aria-label="Copy share link" title="Copy a link to this design" className="hud-btn-subtle flex h-8 w-8 items-center justify-center"><LinkIcon /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TagList b={b} />
        {b.selected ? <TagSettings b={b} t={b.selected} /> : null}
        <Hardware b={b} />
        <Motion b={b} />
        <Scene b={b} />
        <Export b={b} />
      </div>
    </aside>
  );
}
