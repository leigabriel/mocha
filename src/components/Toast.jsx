export default function Toast({ toast }) {
  return (
    <div
      id="statusToast"
      className={`fixed top-4 right-4 z-50 px-3.5 py-1.5 bg-brand border border-white text-white text-[11px] uppercase tracking-wider flex items-center gap-2 pointer-events-none transition-opacity duration-200 max-w-[calc(100vw-2rem)] truncate ${
        toast.visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span id="toastDot" className="w-1.5 h-1.5 bg-white shrink-0"></span>
      <span id="toastText" className="truncate">{toast.text}</span>
    </div>
  );
}
