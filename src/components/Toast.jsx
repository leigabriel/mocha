export default function Toast({ toast }) {
  return (
    <div
      id="statusToast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed top-3 right-3 z-50 px-3.5 py-1.5 bg-brand border border-white text-white text-[11px] uppercase tracking-wider flex items-center gap-2 pointer-events-none transition-opacity duration-200 max-w-[calc(100vw-1.5rem)] ${
        toast.visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="w-1.5 h-1.5 bg-white shrink-0" aria-hidden="true"></span>
      <span className="truncate">{toast.text}</span>
    </div>
  );
}
