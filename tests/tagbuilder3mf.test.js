// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { unzipSync, strFromU8 } from 'three/examples/jsm/libs/fflate.module.js';
import fs from 'node:fs';
import { FONTS } from '../src/tagbuilder/constants.js';
import { registerFont } from '../src/tagbuilder/fonts.js';
import { defaultDesign } from '../src/tagbuilder/design.js';
import { exportModel } from '../src/tagbuilder/exporters.js';

const FILES = {
  inter: '@fontsource/inter/files/inter-latin-900-normal.woff',
  bebas: '@fontsource/bebas-neue/files/bebas-neue-latin-400-normal.woff',
  fredoka: '@fontsource/fredoka/files/fredoka-latin-600-normal.woff',
  silkscreen: '@fontsource/silkscreen/files/silkscreen-latin-700-normal.woff',
};

describe('3MF export', () => {
  it('is a zip with a well-formed model part', async () => {
    for (const f of FONTS) {
      const b = fs.readFileSync(`${import.meta.dirname}/../node_modules/${FILES[f.id]}`);
      registerFont(f.id, b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), f.label);
    }
    const { blob, filename } = await exportModel('3mf', defaultDesign());
    expect(filename.endsWith('.3mf')).toBe(true);
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', '3D/3dmodel.model']));
    const xml = strFromU8(files['3D/3dmodel.model']);
    expect(xml).toContain('unit="millimeter"');
    expect((xml.match(/<object /g) ?? []).length).toBeGreaterThan(10);
    expect(xml).toContain('<basematerials');
  });
});
