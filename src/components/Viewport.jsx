export default function Viewport({ containerRef }) {
  return (
    <main className="flex-1 w-full h-full relative overflow-hidden">
      {/* 3D Canvas Container */}
      <div id="viewportCanvas" ref={containerRef} className="w-full h-full touch-none"></div>
    </main>
  );
}
