import bebas from '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff?url';
import fredoka from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff?url';
import inter from '@fontsource/inter/files/inter-latin-900-normal.woff?url';
import silkscreen from '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff?url';
import geistMono from '@fontsource/geist-mono/files/geist-mono-latin-700-normal.woff?url';

const CJK = '"Noto Sans CJK JP","Hiragino Sans","Yu Gothic","Microsoft YaHei","PingFang SC",sans-serif';

/** Bundled fonts (SIL Open Font License via @fontsource) with CJK system fallbacks for kana/hanzi. */
export const FONTS = {
  display: { label: 'Condensed', family: 'MochaDisplay', url: bebas, weight: 400, scale: 1.12 },
  rounded: { label: 'Rounded', family: 'MochaRounded', url: fredoka, weight: 600, scale: 1 },
  sans: { label: 'Heavy sans', family: 'MochaSans', url: inter, weight: 900, scale: 0.92 },
  mono: { label: 'Mono', family: 'MochaMono', url: geistMono, weight: 700, scale: 0.9 },
  pixel: { label: 'Pixel', family: 'MochaPixel', url: silkscreen, weight: 700, scale: 0.8 },
};

export const fontCss = (key, size) => {
  const f = FONTS[key] ?? FONTS.sans;
  return `${f.weight} ${Math.round(size * f.scale)}px "${f.family}",${CJK}`;
};

let loading = null;
/** Registers the bundled fonts with the document once (a no-op without the FontFace API). */
export function loadStickerFonts() {
  if (loading) return loading;
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) {
    loading = Promise.resolve(false);
    return loading;
  }
  loading = Promise.all(
    Object.values(FONTS).map(async (f) => {
      try {
        const face = new FontFace(f.family, `url(${f.url})`, { weight: String(f.weight) });
        await face.load();
        document.fonts.add(face);
      } catch {
        /* falls back to the system font */
      }
    }),
  ).then(() => true);
  return loading;
}
