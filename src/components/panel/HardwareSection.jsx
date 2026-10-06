import { FINISHES, MAX_LINKS, MIN_LINKS, SPREAD_MAX, SPREAD_MIN, THICKNESS_MM } from '../../constants/index.js';
import { Seg, Section } from './ui.jsx';

const LINK_PRESETS = [4, 6, 8, 10];

export function ChainSection({ chainLinks, clusterSpread, clusterSpreadText, onUpdateLinks, onUpdateSpread }) {
  return (
    <Section title={`02 Chain Links (${MIN_LINKS}–${MAX_LINKS})`} hint={`${chainLinks} links`}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdateLinks(chainLinks - 1)}
          disabled={chainLinks <= MIN_LINKS}
          aria-label="Remove a chain link"
          className="hud-btn-subtle h-9 w-9 text-base font-bold hover:bg-white hover:text-brand"
        >
          −
        </button>
        <input
          id="chainLinksSlider"
          type="range"
          min={MIN_LINKS}
          max={MAX_LINKS}
          step="1"
          value={chainLinks}
          aria-label="Chain links"
          aria-valuetext={`${chainLinks} links`}
          onChange={(e) => onUpdateLinks(e.target.value, { quiet: true })}
          className="flex-1 cursor-pointer"
        />
        <button
          type="button"
          onClick={() => onUpdateLinks(chainLinks + 1)}
          disabled={chainLinks >= MAX_LINKS}
          aria-label="Add a chain link"
          className="hud-btn-subtle h-9 w-9 text-base font-bold hover:bg-white hover:text-brand"
        >
          +
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1" role="group" aria-label="Chain length presets">
        {LINK_PRESETS.map((n) => (
          <Seg key={n} pressed={chainLinks === n} onClick={() => onUpdateLinks(n)} className="min-h-[32px] text-[11px] uppercase">
            {n} links
          </Seg>
        ))}
      </div>

      <div className="text-soft flex items-center justify-between pt-1 text-[11px] uppercase">
        <label htmlFor="clusterSpreadSlider">Cluster spread</label>
        <span aria-hidden="true">{clusterSpreadText}</span>
      </div>
      <input
        id="clusterSpreadSlider"
        type="range"
        min={SPREAD_MIN}
        max={SPREAD_MAX}
        step="0.05"
        value={clusterSpread}
        aria-valuetext={clusterSpreadText.toLowerCase()}
        onChange={(e) => onUpdateSpread(e.target.value)}
        className="w-full cursor-pointer"
      />
    </Section>
  );
}

export function ThicknessSection({ thickness, sizeMm, onUpdateThickness }) {
  return (
    <Section title="03 Molded Thickness" hint={sizeMm.w ? `≈ ${sizeMm.w}×${sizeMm.h}×${sizeMm.d} mm` : ''}>
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Charm thickness">
        {[1, 2, 3].map((mode) => (
          <Seg key={mode} pressed={thickness === mode} onClick={() => onUpdateThickness(mode)} className="min-h-[36px] text-xs">
            {THICKNESS_MM[mode].toFixed(1)}mm
          </Seg>
        ))}
      </div>
      <p className="text-soft font-mono text-[11px]">Overall size is width × height × depth of the whole keychain.</p>
    </Section>
  );
}

export function FinishSection({ finish, onUpdateFinish }) {
  return (
    <Section title="04 Hardware Alloy">
      <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Hardware finish">
        {FINISHES.map((f) => (
          <Seg key={f} pressed={finish === f} onClick={() => onUpdateFinish(f)} className="min-h-[36px] text-xs capitalize">
            {f}
          </Seg>
        ))}
      </div>
    </Section>
  );
}

export function CameraSection({ onCameraView }) {
  return (
    <Section title="05 Camera View">
      <div className="grid grid-cols-3 gap-1.5 uppercase">
        <button type="button" className="hud-btn min-h-[36px] text-[11px]" onClick={() => onCameraView('front')}>
          Front
        </button>
        <button type="button" className="hud-btn min-h-[36px] text-[11px]" onClick={() => onCameraView('iso')}>
          Angle
        </button>
        <button type="button" className="hud-btn min-h-[36px] text-[11px]" onClick={() => onCameraView('hardware')}>
          Master ring
        </button>
      </div>
    </Section>
  );
}
