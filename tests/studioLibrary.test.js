// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

const { createStudioStore } = await import('../src/studio/store.js');
const { defaultDoc } = await import('../src/studio/doc.js');
const { buildStudioScene } = await import('../src/studio/builder.js');
const { LIBRARY, LIBRARY_GROUPS, libraryItem } = await import('../src/studio/library.js');
const { THEMES } = await import('../src/studio/constants.js');

describe('prebuilt model library', () => {
  it('has unique ids, valid groups and covers trees, animals, keychains and stickers', () => {
    expect(new Set(LIBRARY.map((m) => m.id)).size).toBe(LIBRARY.length);
    const groups = new Set(LIBRARY_GROUPS.map((g) => g.id));
    for (const m of LIBRARY) expect(groups.has(m.group)).toBe(true);
    for (const id of ['nature', 'animals', 'keychains', 'stickers']) expect(LIBRARY.some((m) => m.group === id)).toBe(true);
    expect(libraryItem('pine')).toBeTruthy();
    expect(libraryItem('nope')).toBeNull();
  });

  it.each(LIBRARY.map((m) => [m.id, m]))('%s adds one group of editable parts and builds a scene', (_id, item) => {
    const store = createStudioStore(defaultDoc());
    const root = store.addModel(item);
    expect(root.type).toBe('group');
    const { doc, selection } = store.getState();
    expect(selection).toEqual([root.id]);
    expect(doc.objects.length).toBe(item.build().length + 1);
    expect(doc.objects.filter((o) => o.parent === root.id).length).toBe(doc.objects.length - 1);
    expect(new Set(doc.objects.map((o) => o.name)).size).toBe(doc.objects.length);
    const built = buildStudioScene(doc, { editor: false });
    expect(built.root).toBeTruthy();
    built.dispose();
  });

  it('keeps repeated models apart and can be undone', () => {
    const store = createStudioStore(defaultDoc());
    const a = store.addModel(libraryItem('fox'));
    const b = store.addModel(libraryItem('fox'));
    expect(a.name).not.toBe(b.name);
    expect(a.pos).not.toEqual(b.pos);
    store.undo();
    expect(store.getState().doc.objects.filter((o) => o.type === 'group').length).toBe(1);
  });

  it('offers the three themes', () => {
    expect(THEMES.map((t) => t.id)).toEqual(['studio', 'light', 'dark']);
  });
});
