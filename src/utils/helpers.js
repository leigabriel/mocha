const EMOJI_TEST = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]️?⃣/u;

const EMOJI_SEQUENCE =
  /\p{Regional_Indicator}{2}|[0-9#*]️?⃣|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*/u;

/** Exact sRGB (0..1) to linear (0..1) transfer function. */
export function sRGBToLinear(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

/** Wraps an angle into (-PI, PI]. */
export function wrapAngle(a) {
  const TWO_PI = Math.PI * 2;
  let r = a % TWO_PI;
  if (r > Math.PI) r -= TWO_PI;
  else if (r <= -Math.PI) r += TWO_PI;
  return r;
}

export function isEmoji(segment) {
  return typeof segment === 'string' && EMOJI_TEST.test(segment);
}

/**
 * Returns the first emoji (a full grapheme, including ZWJ sequences, flags and
 * skin tones) found in `str`, or null when the text contains no emoji.
 */
export function extractFirstEmoji(str) {
  if (typeof str !== 'string') return null;
  const text = str.trim();
  if (!text) return null;

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      for (const { segment } of segmenter.segment(text)) {
        if (isEmoji(segment)) return segment;
      }
      return null;
    } catch {
      // fall through to the regex path
    }
  }

  const match = text.match(EMOJI_SEQUENCE);
  return match ? match[0] : null;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

export function saveDataUrl(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
