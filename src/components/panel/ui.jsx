import { ChevronIcon } from '../Icons.jsx';

/** Collapsible panel section (native <details>, so it is keyboard and screen-reader friendly). */
export function Section({ title, hint, defaultOpen = true, children }) {
  return (
    <details open={defaultOpen} className="border-t border-white/25 first:border-t-0">
      <summary className="flex items-center justify-between gap-2 px-4 py-3 text-[11px] font-bold uppercase tracking-widest">
        <span className="flex items-center gap-2">
          <ChevronIcon />
          {title}
        </span>
        {hint ? <span className="text-soft font-mono text-[11px] font-normal normal-case">{hint}</span> : null}
      </summary>
      <div className="space-y-2.5 px-4 pb-4">{children}</div>
    </details>
  );
}

/** Toggle button with an accessible pressed state (styled by the `.seg` class). */
export function Seg({ pressed, className = '', children, ...rest }) {
  return (
    <button type="button" aria-pressed={pressed} className={`seg ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Field({ id, label, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-soft block text-[11px] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}
