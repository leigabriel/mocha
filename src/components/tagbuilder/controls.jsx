/** Small form controls shared by the Tag Builder panel (styled for the brand-blue panel). */

export const inputClass =
  'w-full border border-white/45 bg-transparent px-2 py-1.5 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none';

export function Slider({ id, label, value, min, max, step = 1, unit = '', onChange, disabled = false }) {
  const shown = Number.isInteger(step) ? value : Number(value).toFixed(1);
  return (
    <div className={disabled ? 'opacity-50' : ''}>
      <div className="text-soft flex items-center justify-between text-[11px] uppercase tracking-wider">
        <label htmlFor={id}>{label}</label>
        <span className="font-mono normal-case" aria-hidden="true">{shown}{unit}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={`${shown}${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
      />
    </div>
  );
}

export function ColorField({ id, label, value, onChange, disabled = false }) {
  return (
    <div className={`flex items-center justify-between gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <label htmlFor={id} className="text-soft text-[11px] uppercase tracking-wider">
        {label}
      </label>
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase">{value}</span>
        <input
          id={id}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer border border-white/60 bg-transparent p-0"
        />
      </span>
    </div>
  );
}

export function SelectField({ id, label, value, onChange, options }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-soft block text-[11px] uppercase tracking-wider">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o.id} value={o.id} className="bg-brand text-white">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function FileButton({ id, label, accept, onFile, className = '' }) {
  return (
    <label htmlFor={id} className={`hud-btn-subtle flex min-h-[34px] cursor-pointer items-center justify-center px-2 text-[11px] uppercase ${className}`}>
      {label}
      <input
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </label>
  );
}
