export default function Toast({ toast }) {
  return (
    <div
      id="statusToast"
      className={`fixed top-4 right-4 z-50 px-3.5 py-1.5 bg-[#0034FF] border border-white text-white text-[11px] uppercase tracking-wider flex items-center gap-2 pointer-events-none transition-opacity duration-200 ${
        toast.visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span id="toastDot" className="w-1.5 h-1.5 bg-white"></span>
      <span id="toastText">{toast.text}</span>
    </div>
  );
}
