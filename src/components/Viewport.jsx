export default function Viewport({ containerRef, branches, onKeyDown }) {
  const label = `3D keychain preview with ${branches.length} charm${branches.length === 1 ? '' : 's'}: ${branches
    .map((b) => b.emoji)
    .join(' ')}`;

  return (
    <main className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
      <div
        id="viewportCanvas"
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label={label}
        aria-describedby="viewport-help"
        onKeyDown={onKeyDown}
        className="w-full h-full touch-none"
      ></div>

      <p id="viewport-help" className="sr-only">
        Arrow keys swing the keychain. Space gives it a push, S spins it, R resets it. Keys 1 to 5, or the
        left and right bracket keys, select a charm. Control or Command plus Z undoes the last change.
      </p>

      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 left-3 hidden md:block max-w-[calc(100%-1.5rem)] bg-black/60 px-2 py-1 text-[11px] uppercase tracking-wider text-white"
      >
        Drag a charm to swing it · Drag the background to orbit · Scroll to zoom
      </p>
    </main>
  );
}
