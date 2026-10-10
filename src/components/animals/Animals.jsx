import Toast from '../Toast.jsx';
import { useAnimals } from '../../hooks/useAnimals.js';
import { docFor } from '../../animals/descriptions.js';
import { BACKGROUNDS } from '../../animals/stage.js';
import { FORMAT_INFO } from '../../animals/exporters.js';
import { Seg, Section } from '../panel/ui.jsx';
import { ColorField, Slider } from '../tagbuilder/controls.jsx';

const OPTION_LABELS = {
  antlers: 'Antlers', spots: 'Fawn spots', stripes: 'Stripes', patch: 'Saddle patch', mane: 'Mane & forelock', socks: 'Dark lower legs',
  face: 'Bare face', sheen: 'Neck sheen', whiteHead: 'White head',
};
const COLOR_LABELS = { coat: 'Body', belly: 'Underside', accent: 'Accent', wing: 'Wings' };

function Picker({ p }) {
  return (
    <Section title="01 Animal" hint={p.spec.kind === 'bird' ? (p.spec.canFly ? 'bird · flies' : 'bird · ground') : 'four-legged'}>
      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Animal">
        {p.species.map((s) => (
          <Seg key={s.id} pressed={p.id === s.id} onClick={() => p.selectAnimal(s.id)} className="min-h-[34px] text-[11px] uppercase">{s.label}</Seg>
        ))}
      </div>
      <p className="text-soft text-[12px]">{p.spec.blurb}</p>
    </Section>
  );
}

function Look({ p }) {
  const keys = Object.keys(COLOR_LABELS).filter((k) => p.colors[k] && (k !== 'wing' || p.spec.kind === 'bird'));
  const opts = Object.keys(p.spec.options).filter((k) => OPTION_LABELS[k]);
  return (
    <Section title="02 Look">
      {keys.map((k) => (
        <ColorField key={k} id={`an-${k}`} label={COLOR_LABELS[k]} value={p.colors[k]} onChange={(v) => p.setColor(k, v)} />
      ))}
      {opts.length > 0 && (
        <div className="grid grid-cols-2 gap-1" role="group" aria-label="Features">
          {opts.map((k) => (
            <Seg key={k} pressed={!!p.options[k]} onClick={() => p.setOption(k, !p.options[k])} className="min-h-[32px] px-1 text-[10px] uppercase">{OPTION_LABELS[k]}</Seg>
          ))}
        </div>
      )}
      <Slider id="an-size" label="Size" value={p.size} min={0.5} max={2} step={0.1} unit="×" onChange={p.setSize} />
      <button type="button" className="hud-btn-subtle min-h-[32px] w-full text-[11px] uppercase" onClick={p.resetLook}>Reset look</button>
    </Section>
  );
}

function Motion({ p }) {
  return (
    <Section title="03 Animation" hint={`${p.clips.length} clips`}>
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Animation clip">
        {p.clips.map((c) => (
          <Seg key={c.id} pressed={p.clip === c.id} onClick={() => p.setClip(c.id)} className="min-h-[34px] px-1 text-[11px] uppercase">{c.label}</Seg>
        ))}
      </div>
      <Slider id="an-speed" label="Speed" value={p.speed} min={0.25} max={2} step={0.25} unit="×" onChange={p.setSpeed} />
      <Options label="Scene" value={p.bg} options={Object.entries(BACKGROUNDS).map(([id, b]) => ({ id, label: b.label }))} onChange={p.setBg} />
    </Section>
  );
}

function Options({ label, value, options, onChange }) {
  return (
    <div className="space-y-1">
      <div className="text-soft text-[11px] uppercase tracking-wider">{label}</div>
      <div className="grid grid-cols-4 gap-1" role="group" aria-label={label}>
        {options.map((o) => (
          <Seg key={o.id} pressed={value === o.id} onClick={() => onChange(o.id)} className="min-h-[32px] px-0 text-[10px] uppercase">{o.label}</Seg>
        ))}
      </div>
    </div>
  );
}

function About({ p }) {
  const d = docFor(p.id);
  return (
    <Section title="04 From the description" defaultOpen={false}>
      {Object.entries(d).map(([k, v]) => (
        <div key={k}>
          <div className="text-soft text-[11px] font-bold uppercase tracking-wider">{k}</div>
          <p className="text-[12px] leading-snug">{v}</p>
        </div>
      ))}
    </Section>
  );
}

function Download({ p }) {
  return (
    <Section title="05 Download" hint={`${p.clips.length} clips embedded`}>
      <div className="grid grid-cols-2 gap-1.5">
        {['glb', 'gltf'].map((f) => (
          <button key={f} type="button" disabled={p.busy} onClick={() => p.exportModel(f)} title={FORMAT_INFO[f].note} className="hud-btn min-h-[40px] text-[11px] font-bold uppercase">{FORMAT_INFO[f].label}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <button type="button" disabled={p.busy} onClick={() => p.renderImage('image/png')} className="hud-btn-subtle min-h-[36px] text-[11px] uppercase">PNG image</button>
        <button type="button" disabled={p.busy} onClick={() => p.renderImage('image/jpeg')} className="hud-btn-subtle min-h-[36px] text-[11px] uppercase">JPG image</button>
      </div>
      <p className="text-soft font-mono text-[11px]">
        The file holds {p.clips.map((c) => c.label).join(', ')} as named animation clips on a node rig (no skinning), so game engines, three.js and Blender list them as separate actions.
      </p>
    </Section>
  );
}

function Transport({ p }) {
  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-3 flex items-center gap-2 bg-black/65 px-2 py-1.5 text-white" role="group" aria-label="Playback">
      <button type="button" onClick={() => p.setPaused(!p.paused)} aria-label={p.paused ? 'Play' : 'Pause'} className="min-h-[30px] min-w-[60px] border border-white/60 px-2 text-[11px] font-bold uppercase">{p.paused ? 'Play' : 'Pause'}</button>
      <input aria-label="Animation time" type="range" min={0} max={1} step={0.005} value={p.time} onChange={(e) => p.seek(Number(e.target.value))} className="min-w-0 flex-1" />
      <span className="font-mono text-[11px]" aria-hidden="true">{p.clip}</span>
    </div>
  );
}

/** Animals tab: ten rigged animals with idle / walk / run / eat / fly / sleep clips. */
export default function Animals() {
  const [containerRef, p] = useAnimals();
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-sceneLight md:flex-row">
      <Toast toast={p.toast} />
      <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
        <div ref={containerRef} tabIndex={0} role="application" aria-label={`3D ${p.spec.label} playing the ${p.clip} animation`} className="h-full w-full touch-none"></div>
        <Transport p={p} />
        <p aria-hidden="true" className="pointer-events-none absolute left-3 top-3 hidden bg-black/60 px-2 py-1 text-[11px] uppercase tracking-wider text-white md:block">Drag to orbit · Scroll to zoom</p>
      </main>
      <aside aria-label="Animal controls" className="z-40 flex h-[48dvh] w-full shrink-0 flex-col border-t border-white/30 bg-brand text-white md:order-first md:h-full md:w-[360px] md:border-r md:border-t-0">
        <header className="flex items-center justify-between gap-2 border-b border-white/30 p-3 md:p-4">
          <h1 className="font-pixel flex items-center gap-2.5 text-xs tracking-wider">
            <span className="inline-block h-2.5 w-2.5 bg-white" aria-hidden="true"></span>
            <span>MOCHA // ANIMALS</span>
          </h1>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Picker p={p} />
          <Look p={p} />
          <Motion p={p} />
          <About p={p} />
          <Download p={p} />
        </div>
      </aside>
    </div>
  );
}
