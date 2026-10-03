export function sRGBToLinear(v) {
  return Math.pow(v, 2.2);
}

export function extractFirstEmoji(str) {
  if (!str) return '👾';
  str = str.trim();
  if (!str) return '👾';

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      const segments = [...segmenter.segment(str)];
      for (const s of segments) {
        const seg = s.segment.trim();
        if (seg) return seg;
      }
    } catch {
      // ignore
    }
  }

  const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Base}\p{Emoji_Modifier}?|\p{Extended_Pictographic})/u;
  const match = str.match(emojiRegex);
  if (match) return match[0];

  return Array.from(str)[0] || '👾';
}

export function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }, 200);
}
