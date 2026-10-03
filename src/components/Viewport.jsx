export default function Viewport({ containerRef }) {
  return (
    <main className="flex-1 h-full relative overflow-hidden">
      {/* 3D Canvas Container */}
      <div id="viewportCanvas" ref={containerRef} className="w-full h-full"></div>
    </main>
  );
}
