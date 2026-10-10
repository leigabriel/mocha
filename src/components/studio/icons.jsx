import {
  Add, ArrowLeft, Atom, Box, Camera, ChevronDown, ChevronRight, CloseCircle, Copy, Diamonds, Download, Expand, Eye, EyeOff,
  Film, Folder, FolderOpen, Fullscreen, Grid, Group, Heart, Help, Hierarchy, Home, Image, InfoCircle, Keyboard, Lamp, Layers,
  Lightbulb, Lightning, Lock, LockOpen, MagicStar, MagicWand, Magnet, Maximize, Palette, Pause, Planet, Play, Pointer, Redo,
  RotateRight, Save, Scale, Search, Settings, Shapes, Sliders, Sun, Target, Text, ThreeDCube, Timer, Trash, Triangle, Undo, Upload,
  Refresh, Rocket, Code,
} from 'reicon-react';

/** All icons come from reicon (reicon.dev). One place to rename them for the editor. */
const MAP = {
  select: Pointer, move: Maximize, rotate: RotateRight, scale: Scale, add: Add, back: ArrowLeft, undo: Undo, redo: Redo,
  trash: Trash, copy: Copy, eye: Eye, eyeOff: EyeOff, lock: Lock, unlock: LockOpen, folder: Folder, folderOpen: FolderOpen,
  save: Save, download: Download, upload: Upload, image: Image, film: Film, play: Play, pause: Pause, key: Diamonds, timer: Timer,
  chevronRight: ChevronRight, chevronDown: ChevronDown, close: CloseCircle, search: Search, settings: Settings, sliders: Sliders,
  palette: Palette, layers: Layers, hierarchy: Hierarchy, group: Group, grid: Grid, magnet: Magnet, help: Help, info: InfoCircle,
  keyboard: Keyboard, home: Home, frame: Fullscreen, expand: Expand, magic: MagicWand, rocket: Rocket, code: Code, refresh: Refresh,
  // objects
  box: ThreeDCube, sphere: Planet, cylinder: Box, cone: Triangle, torus: Refresh, plane: Grid, capsule: Lightning, icosphere: Atom,
  star: MagicStar, heart: Heart, ring: Target, text: Text, svg: Shapes, camera: Camera, 'light:point': Lightbulb, 'light:spot': Lamp,
  'light:sun': Sun, shapes: Shapes, mesh: ThreeDCube,
};

export default function Icon({ name, size = 16, weight = 'Outline', className = '' }) {
  const C = MAP[name] ?? ThreeDCube;
  return <C size={size} weight={weight} className={className} aria-hidden="true" />;
}
