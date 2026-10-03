export default function Viewport({ containerRef }) {
  return (
    <main className="flex-1 w-full h-full relative overflow-hidden">
      {/* Top Interaction Notice */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none text-[9px] sm:text-[10px] tracking-wide text-neutral-600 font-mono flex items-center gap-2 bg-white/95 px-2.5 sm:px-3 py-1.5 border border-neutral-300 max-w-[calc(100vw-2rem)] truncate">
        <span className="w-1.5 h-1.5 bg-brand shrink-0"></span>
        <span className="truncate">MOCHA — 3D PIXEL-ART KEYCHAIN STUDIO // 1 SHARED MASTER RING // 4–10 CABLE CHAIN</span>
      </div>

      {/* 3D Canvas Container */}
      <div id="viewportCanvas" ref={containerRef} className="w-full h-full touch-none"></div>
    </main>
  );
}
