// Small inline SVG icon set (replaces the 120 kB FontAwesome stylesheet).
// All icons inherit `currentColor` and are decorative (aria-hidden).

const base = {
  width: 14,
  height: 14,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
  'aria-hidden': true,
  focusable: false,
};

function Icon({ size = 14, children }) {
  return (
    <svg {...base} width={size} height={size}>
      {children}
    </svg>
  );
}

export const CubeIcon = (p) => (
  <Icon {...p}>
    <path d="M12 2 3 7v10l9 5 9-5V7z" />
    <path d="M3 7l9 5 9-5M12 12v10" />
  </Icon>
);

export const SlidersIcon = (p) => (
  <Icon {...p}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <path d="M16 4v4M10 10v4M18 16v4" />
  </Icon>
);

export const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Icon>
);

export const WandIcon = (p) => (
  <Icon {...p}>
    <path d="M4 20 16 8M14 6l4 4M19 3v3M17.5 4.5h3M6 3v2M5 4h2M20 14v2M19 15h2" />
  </Icon>
);

export const RotateIcon = (p) => (
  <Icon {...p}>
    <path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5" />
  </Icon>
);

export const SwingIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3v7M12 10 6 19M12 10l6 9M3 21h18" />
  </Icon>
);

export const ResetIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
  </Icon>
);

export const FileCodeIcon = (p) => (
  <Icon {...p}>
    <path d="M6 3h9l4 4v14H6zM15 3v4h4M10 12l-2 2 2 2M14 12l2 2-2 2" />
  </Icon>
);

export const ShapesIcon = (p) => (
  <Icon {...p}>
    <path d="M8 3 3 12h10zM13 13h8v8h-8z" />
    <circle cx="7" cy="18" r="3.5" />
  </Icon>
);

export const CameraIcon = (p) => (
  <Icon {...p}>
    <path d="M3 8h4l2-3h6l2 3h4v12H3z" />
    <circle cx="12" cy="13" r="3.5" />
  </Icon>
);

export const UndoIcon = (p) => (
  <Icon {...p}>
    <path d="M9 7 4 12l5 5M4 12h10a6 6 0 0 1 6 6" />
  </Icon>
);

export const RedoIcon = (p) => (
  <Icon {...p}>
    <path d="m15 7 5 5-5 5M20 12H10a6 6 0 0 0-6 6" />
  </Icon>
);

export const LinkIcon = (p) => (
  <Icon {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Icon>
);

export const ChevronIcon = (p) => (
  <span className="chevron inline-block transition-transform" aria-hidden="true">
    <Icon size={10} {...p}>
      <path d="m9 5 7 7-7 7" />
    </Icon>
  </span>
);
