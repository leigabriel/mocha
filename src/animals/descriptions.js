const DOCS = import.meta.glob('./descriptions/*.md', { query: '?raw', import: 'default', eager: true });

/** Splits a description file into { Appearance: '...', ... } by its "## " headings. */
export function parseDescription(md) {
  const out = {};
  let key = null;
  for (const line of String(md).split('\n')) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) {
      key = m[1].trim();
      out[key] = '';
    } else if (key && line.trim()) out[key] += `${out[key] ? ' ' : ''}${line.trim()}`;
  }
  return out;
}

export const docFor = (id) => parseDescription(DOCS[`./descriptions/${id}.md`] ?? '');
