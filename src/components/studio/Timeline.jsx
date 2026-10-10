import { useRef } from 'react';
import Icon from './icons.jsx';
import { NumberField } from './fields.jsx';

const PX = 90; // pixels per second

export default function Timeline({ s, store }) {
  const dur = s.doc.time.duration;
  const width = Math.max(300, dur * PX + 40);
  const ruler = useRef(null);
  const drag = useRef(null);
  const animated = s.doc.objects.filter((o) => o.keys.length > 0);
  const sel = s.doc.objects.filter((o) => s.selection.includes(o.id));
  const rows = [...new Map([...sel, ...animated].map((o) => [o.id, o])).values()];

  const scrub = (e) => {
    const rect = ruler.current.getBoundingClientRect();
    store.setView({ playing: false });
    store.setTime(Math.round(((e.clientX - rect.left) / PX) * 30) / 30);
  };
  const keyDown = (o, i) => (e) => {
    e.stopPropagation();
    drag.current = { id: o.id, i, x: e.clientX, t: o.keys[i].t };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const keyMove = (e) => {
    const d = drag.current;
    if (!d) return;
    store.moveKey(d.id, d.i, Math.round((d.t + (e.clientX - d.x) / PX) * 30) / 30);
  };

  return (
    <section className="st-timeline" aria-label="Timeline">
      <div className="st-tl-head">
        <button type="button" className="st-btn" onClick={() => store.setView({ playing: !s.playing })} aria-label={s.playing ? 'Pause' : 'Play'}>
          <Icon name={s.playing ? 'pause' : 'play'} size={15} weight="Filled" /> {s.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="st-btn" onClick={() => { store.setView({ playing: false }); store.setTime(0); }} aria-label="Back to start"><Icon name="timer" size={15} /></button>
        <button type="button" className="st-btn" disabled={!s.selection.length} onClick={() => s.selection.forEach((id) => store.addKey(id))} title="Insert keyframe (I)">
          <Icon name="key" size={14} /> Keyframe
        </button>
        <span style={{ marginLeft: 6, color: 'var(--st-dim)' }}>{s.time.toFixed(2)}s / {dur}s</span>
        <span style={{ flex: 1 }} />
        <div style={{ width: 120 }}><NumberField label="Length" value={dur} step={0.5} min={0.5} max={120} unit="s" onChange={(v) => store.updateTime({ duration: v })} /></div>
        <button type="button" className="st-btn" aria-pressed={s.doc.time.loop} onClick={() => store.updateTime({ loop: !s.doc.time.loop })}><Icon name="refresh" size={14} /> Loop</button>
      </div>
      <div className="st-tl-body">
        <div style={{ width: width + 120, position: 'relative' }}>
          <div className="st-tl-ruler" ref={ruler} style={{ marginLeft: 120, width }} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e); }} onPointerMove={(e) => { if (e.buttons) scrub(e); }}>
            {Array.from({ length: Math.floor(dur) + 1 }, (_, i) => (
              <span key={i} style={{ position: 'absolute', left: i * PX + 3, top: 3, fontSize: 10, color: 'var(--st-dim)' }}>{i}s</span>
            ))}
          </div>
          <div className="st-tl-head-line" style={{ left: 120 + s.time * PX }} />
          {rows.length === 0 ? <div className="st-empty" style={{ position: 'sticky', left: 0, width: 360 }}>Select an object, move the playhead, change it, then press <b>I</b> to add keyframes.</div> : null}
          {rows.map((o) => (
            <div key={o.id} className="st-tl-track">
              <span className="st-tl-name" style={{ width: 120, position: 'absolute', left: 0, top: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
              <div style={{ position: 'absolute', left: 120, top: 0, width, height: '100%' }}>
                {o.keys.map((k, i) => (
                  <button key={i} type="button" className={`st-tl-key ${s.selection.includes(o.id) ? 'sel' : ''}`} style={{ left: k.t * PX }} aria-label={`Keyframe at ${k.t.toFixed(2)} seconds`}
                    onPointerDown={keyDown(o, i)} onPointerMove={keyMove} onPointerUp={() => { drag.current = null; }}
                    onDoubleClick={() => store.removeKey(o.id, i)} title="Drag to move, double-click to delete" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
