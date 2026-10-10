import { useRef, useState } from 'react';

const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmt = (v, step) => (Number.isFinite(v) ? String(Math.round(v * 10000) / 10000) : '0') + (step ? '' : '');

/** A Blender-style number field: drag the label sideways to scrub, or click to type. */
export function NumberField({ label, value, onChange, step = 0.1, min = -1000, max = 1000, axis = '', unit = '', title }) {
  const [text, setText] = useState(fmt(value, step));
  const [focus, setFocus] = useState(false);
  const drag = useRef(null);

  const onDown = (e) => {
    e.preventDefault();
    drag.current = { x: e.clientX, v: value, first: true };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const mult = e.shiftKey ? 0.1 : e.ctrlKey ? 5 : 1;
    const next = clampN(d.v + Math.round((e.clientX - d.x) / 4) * step * mult, min, max);
    onChange(Math.round(next * 10000) / 10000, { record: d.first });
    d.first = false;
  };
  const onUp = () => {
    drag.current = null;
  };
  const commit = () => {
    const n = Number(text);
    if (Number.isFinite(n)) onChange(clampN(n, min, max), { record: true });
    setFocus(false);
  };
  return (
    <label className="st-field" title={title}>
      <span className={axis} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={focus ? text : `${fmt(value, step)}${unit}`}
        onFocus={(e) => { setFocus(true); setText(fmt(value, step)); e.target.select(); }}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setText(fmt(value, step)); e.currentTarget.blur(); } e.stopPropagation(); }}
      />
    </label>
  );
}

export function Vec3({ value, onChange, step = 0.1, unit = '', min, max }) {
  return (
    <div className="st-grid3">
      {['x', 'y', 'z'].map((a, i) => (
        <NumberField key={a} label={a.toUpperCase()} axis={a} value={value[i]} step={step} unit={unit} min={min} max={max}
          onChange={(v, o) => onChange(value.map((x, k) => (k === i ? v : x)), o)} />
      ))}
    </div>
  );
}

export function Row({ label, children }) {
  return (
    <div className="st-row2">
      <label>{label}</label>
      <div>{children}</div>
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section className="st-sec">
      {title ? <h3>{title}</h3> : null}
      {children}
    </section>
  );
}

export function ColorInput({ value, onChange }) {
  return <input type="color" className="st-color" value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function TextInput({ value, onChange, max = 60, placeholder }) {
  return <input type="text" className="st-text" value={value} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />;
}

export function Select({ value, onChange, options }) {
  return (
    <select className="st-select" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.stopPropagation()}>
      {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  );
}
