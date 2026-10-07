import { CameraIcon, CubeIcon, FileCodeIcon, ShapesIcon } from '../Icons.jsx';
import { Seg } from './ui.jsx';

const TRACKS = [
  { id: 'swing', label: 'Swing', title: 'Embed the simulated pendulum swing loop' },
  { id: 'spin', label: 'Spin 360°', title: 'Embed a 360° turntable loop with simulated charm response' },
  { id: 'spinswing', label: 'Spin + Swing', title: 'Embed one seamless loop that spins 360° while it swings' },
  { id: 'both', label: 'All clips', title: 'Embed the swing, spin and spin + swing clips as separate animations' },
];

export default function ExportSection({
  exportAnimType,
  setExportAnimType,
  snapshotTransparent,
  setSnapshotTransparent,
  onExportGLB,
  onExportGLTF,
  onExportOBJ,
  onCaptureSnapshot,
}) {
  return (
    <div className="space-y-2.5 border-t border-white/30 bg-brandDeep p-4 md:[@media(min-height:880px)]:sticky md:[@media(min-height:880px)]:bottom-0">
      <div className="flex items-center justify-between">
        <span className="text-soft font-mono text-[11px] uppercase tracking-wider">Export assembly</span>
        <span
          className="bg-white px-1.5 text-[11px] font-bold text-brand"
          title="Charms and chains are simulated with the same physics as the viewport; the ring motion is scripted"
        >
          SIM-BAKED
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1" role="group" aria-label="Animation track">
        {TRACKS.map((t) => (
          <Seg
            key={t.id}
            pressed={exportAnimType === t.id}
            onClick={() => setExportAnimType(t.id)}
            title={t.title}
            className="min-h-[34px] text-[11px] font-bold uppercase tracking-wider"
          >
            {t.label}
          </Seg>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onExportGLB}
          className="hud-btn flex min-h-[40px] items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
          title="Binary glTF with the selected animation, in metres"
        >
          <CubeIcon />
          <span>.GLB (anim)</span>
        </button>
        <button
          type="button"
          onClick={onExportGLTF}
          className="hud-btn flex min-h-[40px] items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider"
          title="JSON glTF with the selected animation, in metres"
        >
          <FileCodeIcon />
          <span>.GLTF (anim)</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 uppercase">
        <button
          type="button"
          onClick={onExportOBJ}
          className="hud-btn-subtle flex min-h-[36px] items-center justify-center gap-1.5 text-[11px]"
          title="Static geometry of the current pose, in millimetres"
        >
          <ShapesIcon />
          <span>.OBJ (static)</span>
        </button>
        <button
          type="button"
          onClick={onCaptureSnapshot}
          className="hud-btn-subtle flex min-h-[36px] items-center justify-center gap-1.5 text-[11px]"
          title="PNG at 2× the on-screen size"
        >
          <CameraIcon />
          <span>Snapshot 2×</span>
        </button>
      </div>

      <label className="text-soft flex items-center gap-2 text-[11px] uppercase">
        <input
          type="checkbox"
          checked={snapshotTransparent}
          onChange={(e) => setSnapshotTransparent(e.target.checked)}
          className="h-4 w-4 accent-white"
        />
        Transparent snapshot background
      </label>

      <p className="text-soft font-mono text-[11px]">Real-world size: OBJ in millimetres, glTF in metres.</p>
    </div>
  );
}
