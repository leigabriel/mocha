import { CubeIcon, LinkIcon, RedoIcon, SlidersIcon, UndoIcon } from '../Icons.jsx';
import { SCENE_BG } from '../../constants/index.js';
import { Seg } from './ui.jsx';

export default function PanelHeader({
  bgMode,
  onSetSceneBackground,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopyShareLink,
  collapsed,
  onToggleCollapsed,
}) {
  return (
    <header className="space-y-2.5 border-b border-white/30 p-3 md:p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-pixel flex items-center gap-2.5 text-xs tracking-wider">
          <span className="inline-block h-2.5 w-2.5 bg-white" aria-hidden="true"></span>
          <span>MOCHA // KEYCHAIN STUDIO</span>
        </h1>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl/Cmd+Z)" className="hud-btn-subtle flex h-8 w-8 items-center justify-center">
            <UndoIcon />
          </button>
          <button type="button" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl/Cmd+Shift+Z)" className="hud-btn-subtle flex h-8 w-8 items-center justify-center">
            <RedoIcon />
          </button>
          <button type="button" onClick={onCopyShareLink} aria-label="Copy share link" title="Copy a link to this design" className="hud-btn-subtle flex h-8 w-8 items-center justify-center">
            <LinkIcon />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="studio-controls"
            className="hud-btn-subtle flex h-8 items-center gap-1.5 whitespace-nowrap px-2 text-[11px] font-bold uppercase tracking-wider md:hidden"
          >
            {collapsed ? <SlidersIcon /> : <CubeIcon />}
            <span>{collapsed ? 'Controls' : '3D view'}</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span id="bg-label" className="text-soft uppercase tracking-wider">
          Canvas background
        </span>
        <div className="flex" role="group" aria-labelledby="bg-label">
          {['light', 'dark'].map((mode) => (
            <Seg key={mode} pressed={bgMode === mode} onClick={() => onSetSceneBackground(mode)} className="min-h-[30px] px-3 text-[11px]">
              {SCENE_BG[mode].css}
            </Seg>
          ))}
        </div>
      </div>
    </header>
  );
}
