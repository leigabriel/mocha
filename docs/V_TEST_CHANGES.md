# v-test: fixes for the codebase analysis

Numbers refer to the findings in `MOCHA_ANALYSIS.md`. "Verified" says how each fix was checked.

| # | Finding | Fix | Verified |
|---|---------|-----|----------|
| 1 | Paste applies the old emoji | `onPaste` reads `clipboardData`; invalid text is rejected with a toast | Unit test + real paste in Chromium |
| 2 | Bottom ring parallel to last link / clips lug | Twist spread evenly along the chain; bottom ring always lies in the lug-threading plane | Unit test for 4–10 links + screenshots |
| 3 | Charms never return to rest | Rest is the contact equilibrium (charms settle against each other); cluster sleeps and snaps to it | Unit test (1/3/5 charms settle exactly on their rest pose) |
| 4 | Chain length has no effect | Pendulum length comes from the real chain; charm swings on its bottom ring. **Not** per-link articulated: links still move as one rigid chain | Unit test (10 links ≥ 1.2× the period of 4) |
| 5 | Frame-rate dependent physics | Fixed 1/120 s steps with accumulator | Unit test at 30/60/144 Hz |
| 6 | Stuck grab, right-click grab, bad fling | Pointer capture, `pointercancel`, primary button only, time-windowed release velocity | Chromium: drag, right-drag, release |
| 7 | Split ring self-intersects, open ends | Coil pitch ≥ wire diameter, capped ends | Unit test + close-up screenshot |
| 8 | Ring cropped by default camera | Camera fits the cluster bounds and viewport aspect; re-fits on changes until the user orbits | Screenshots at 1440×900, 1366×768, 390×844 |
| 9 | Flat metals, invisible Noir, no support | Room environment map, lighter Noir, wall peg and plate | Screenshots (steel, gold, dark) |
| 10 | Undefined scale | 1 voxel = 1.5 mm; OBJ in mm, glTF in m; overall size shown in the panel | Export validated (36×63×13 mm) |
| 11 | Emoji rasterising quirks | FE0F for text-presentation glyphs, validation, linear-light averaging, no 8-cell minimum, warning for missing colour glyph | Unit tests (the missing-glyph warning is untested in a real font-less browser) |
| 12 | Camera limits, resize | Polar limits, pan clamp, animated presets, `ResizeObserver`, reduced-motion respected | Chromium for presets, resize and orbit; pan clamp, polar limits and reduced-motion not exercised |
| 13 | Picking and cursor | Listeners on the canvas, hover raycast once per frame, fat pick volumes, hover/selected emissive tint (no wireframe box), cursor stays correct | Chromium for hover, grab cursor, selection and drag; chain-link picking not specifically tested |
| 14 | Selected state invisible | `aria-pressed` buttons filled white when active | Screenshots |
| 15 | Low contrast, tiny text | 85% white minimum (5:1 on #0034FF), 11 px minimum | Computed contrast |
| 16 | No accessibility | Real buttons, labels, `aria-pressed`, live toast, focus rings, keyboard control of the viewport | Unit tests (roles, names) |
| 17 | Mobile covers the 3D view | Bottom sheet under the view, collapsible; no horizontal overflow at 390 px | Screenshot (not a physical device) |
| 18 | Global `!important` resets | Scoped to form controls | Build + screenshots |
| 19 | UX gaps | Add disabled at 5, selection follows removals, undo/redo, autosave, share link, larger preset grid | Unit tests + Chromium |
| 20 | Export mismatch | Rest pose shared with the viewport; charms and chains are simulated for the clips (ring motion is scripted); 2× snapshot with transparency; export errors reported | GLB/GLTF/OBJ/PNG inspected |
| 21 | No disposal | Shared hardware geometry, LRU cache for charm geometry, disposal on rebuild/unmount | Code review only (no GPU memory measurement) |
| 22 | Per-frame waste | Render on demand, allocation-free transforms, sleep when at rest, charm cache | Code review only (the loop renders only when the scene, camera or a tween changes; not profiled) |
| 23 | Bundle and deps | Removed R3F/drei/FontAwesome and the duplicate font loading; exporters load on demand; CSS 120 → 34 kB. The main chunk is still ~880 kB because it is three.js | Build output |
| 24 | Architecture | Scene, interaction, physics, pose and design modules split out; no `window.showToast`; frozen config; injectable RNG; tests and CI. The main hook is still large (UI state) | Lint, tests |

## Charm collision and the blue box (follow-up)
- **Problem:** charms passed through each other (3-9 mm overlap at rest, up to ~11 mm swinging, on charms only 3-6 mm thick). The old "repulsion" was a 2D centroid spring that did nothing at rest, exports baked independent simulations, and the blue box was the always-on selection outline.
- **Fix:** every charm is a rigid box tested against the others with a 15-axis separating-axis test (`src/three/collision.js`). Contacts swing the two chains apart and remove closing speed (`src/three/dynamics.js`). The same solver drives the live view, the rest pose, Reset, and the baked GLB/GLTF clips; baked frames get a final position-only pass.
- Charm mounts stay within a jump ring's reach of the ring wire (|z| ≤ 0.04), so every chain hangs from the ring itself; separation comes from tilt, not from moving mounts off the wire.
- The rest pose is now where the charms hang once they have settled against each other, so with 3+ charms some chains hang slightly tilted (up to about 30 degrees at worst with five 6 mm charms).
- Selection and hover use a soft emissive tint on the charm. No wireframe is drawn, and exports strip the tint.
- Tests: no overlap at rest (1-5 charms x 3 thicknesses), while swinging, and in baked swing/spin clips.

## Spin + Swing export (follow-up)
- New **Spin + Swing** track bakes one clip, `Mocha_Spin_Swing`: a full 360° turn and two swing cycles in exactly 4.0 s, so the first and last frames are the same pose. The swing stays fixed in the world while the keychain turns on its own axis.
- The charms and chains are simulated with the same collision solver as the other clips. The baked loop closes exactly (no stutter at the seam) and has no overlapping charms.
- **All clips** now embeds Swing, Spin 360° and Spin + Swing as three separate animations.
- Warm-up before recording was raised to 10 periods.

## Behaviour changes to be aware of
- Hardware was rescaled (ring ≈ 40 mm across, links and jump rings larger) so it reads at real-world proportions.
- Charm slots were re-laid-out: the centre charm is frontmost and the four others sit behind it. The original fifth slot ("front-right accent") is now a rear accent.
- Rest-pose and exported clips are different from v0 by design (finding 3 and 20).

## Tag Builder tab (new)

A second top-level tab next to "Emoji Charms". It builds a keychain like a product render, procedurally in the browser (no server, no account):

- **Hardware:** anodized carabiner with a locking sleeve (three colours), split ring, 0–3 keys, jump rings and chains (0–4), four metals.
- **Tags (up to 6):** bar, rounded, pill, circle, hex, cube or free cut (outline follows the text or an uploaded SVG). Raised text in four bundled fonts or an uploaded font, up to two outline rings, clear acrylic / gloss / matte / rubber / metal materials, per-tag hang angle.
- **Editable:** click a tag in the 3D view or the list; undo/redo, share link (`#t=`), presets, autosave in `localStorage`.
- **Downloads:** GLB, GLTF, OBJ, STL, PLY, USDZ, 3MF, and a Blender Python script (embeds the GLB and sets up lights, backdrop and Cycles). Also a 3x supersampled PNG render, optionally transparent.
- **Animation:** Swing, Spin 360° and Spin + Swing, played live in the 3D view and embedded as seamless 30 fps loops in GLB, GLTF and the Blender script (choose Still, one loop or all clips under Download). Keys and tags sway on their chains and twist, with a contact pass so neighbours never pass through each other. The live view and the exported clips use the same `poseAt` function (`src/tagbuilder/animation.js`).
- Units are millimetres; GLB/GLTF/USDZ are exported in metres.

Known limits: the animation is a scripted, contact-checked motion, not a full physics simulation like the Emoji tab; USDZ, OBJ, STL, PLY and 3MF stay static. the "Render image" is a raster snapshot, not a path-traced render. 3MF/STL are made of overlapping parts, so a slicer may need "merge overlapping parts". The Blender script has not been run in real Blender. With chain length 0, a key plus several tags can still touch (the panel warns). Source: `src/tagbuilder/`, UI: `src/components/tagbuilder/`.

## Stamp Pack tab (new)

A third tab that turns any pictures you upload into a bagged postage-stamp collection, like a collectible pack: a header card with a hanging hole, a clear bag and stamps with perforated edges, loosely scattered and overlapping.

- **Upload:** JPG, PNG, WebP, GIF (first frame), AVIF, BMP and SVG, by button or by dropping files on the 3D view. Up to 12 stamps, 10 MB each. Pictures are decoded in the browser and never uploaded. (HEIC is not supported by most browsers.)
- **Each stamp:** portrait, landscape, square, circle or wedge; size, rotation, position, white border, perforation size; print look (original, halftone dots, duotone, mono) with an ink colour; zoom and pan of the picture; an optional caption; replace picture; bring to front or send to back; copy; delete. Click a stamp in the 3D view to select it.
- **Header card:** three text lines (mono, serif or sans), text and card colours, a logo and an icon upload, hanging hole on or off, card on or off.
- **Pack:** clear bag on or off, stamp paper colour, backdrop (black, charcoal, paper, sage, sky, clear), Shuffle (new seeded scatter), sample stamps (original artwork drawn in the app).
- **Animation:** Spin 360° and Sway, played live.
- **Downloads:** PNG (1x to 4x, optional transparent background), JPG, and GLB or GLTF 3D models with embedded textures and the chosen loop (still, spin, sway or both). Units are metres in the 3D files.

Notes: the 3D model is thin paper geometry with the printed pictures as textures (one JPEG per stamp). Only the look and feel (header text, colours, bag, backdrop) is remembered between visits; the pictures are not. Source: `src/stamppack/`, UI: `src/components/stamppack/`.

## Stamp Pack refinement
- Clear bag is now an alpha-blended glossy film (clearcoat, crease streaks, frosted ribbed seal band, welded seams) so stamps stay crisp; no transmission whitewash.
- Higher-resolution stamp and card textures with paper grain and a paper normal map; contact shadows under each stamp; denser, slightly tilted layout; drag a stamp to move it.
- New controls: plastic shine, plastic wrinkles, lighting preset (studio / soft / dramatic).
- glTF is the recommended 3D export: it embeds pictures, key/fill/rim lights, a camera and the spin loop. GLB carries the same data but some viewers ignore lights; neither can embed an environment map.

## Keychain Set tab
- New fourth tab: a glass or chrome loop clasp (or carabiner / ring only), a split ring and up to 6 customisable charms fanned on jump rings and optional chain links, modelled on a glass-and-chrome product-shot reference.
- Charm styles: motel tag, bar, ribbed bar, triangle, silhouette (cat, heart, star, bolt, cloud or an uploaded SVG) and disc. Per charm: size, thickness, material (tinted glass, frosted, glossy, matte, soft touch, chrome), colour, title / small line / number, font, raised or printed text, text direction, ribs, ruler marking, chain links, turn.
- Generate button makes a random set; Reference restores the default.
- Exports: PNG / JPG, GLTF (recommended) and GLB with lights, camera and the spin / swing loops, and a self-contained Blender script (draft / high / ultra) that swaps materials for Cycles glass, chrome, soft touch and frosted nodes, adds strip-light softboxes, a depth-of-field camera and a denoised render. It was run in Blender (bpy 5) to check it renders. Usage: `blender -b -P file.py -- out.png [--anim] [--samples N] [--res WxH] [--save set.blend]`.
- Limits: a real .blend file cannot be written in the browser, so the script builds it; transmission materials in the live preview are an approximation of the Cycles render.

## 3D Studio (`#/studio`)

A full-page, Blender-style 3D editor, opened from the "3D Studio" button in the top bar (the Mocha tabs are replaced; Back returns).

- Layout: menu bar, left toolbar (select/move/rotate/scale), viewport with axis gizmo, outliner + properties on the right, keyframe timeline, status bar. Icons come from `reicon-react`.
- Objects: 13 parametric shapes (box, sphere, cylinder, cone, torus, plane, capsule, icosphere, star, heart, ring, 3D text, SVG extrude), point/spot/sun lights, cameras, groups, array and mirror modifiers.
- Materials: plastic, clay, metal, chrome, glass, frosted, soft-touch, emissive.
- Shortcuts: Q/G/R/S, Shift+A add, Shift+D duplicate, X/Delete, Ctrl+Z/Y, Ctrl+G group, F frame, I keyframe, Space play, 1/3/7/0 views.
- Exports: GLB, glTF, OBJ, STL, PNG/JPG, project JSON, Blender script (Cycles). Animation is baked at 30 fps into GLB/glTF.
- Autosaves to the browser (`mocha.studio.v1`).
- Not yet: vertex/face edit mode, boolean cuts. The preview is three.js, so the Blender render looks different (lights are rescaled on import).
- Code: `src/studio/*`, `src/hooks/useStudio.js`, `src/components/studio/*`, tests in `tests/studio.test.js`.

## Animals tab (v-test)

New **Animals** tab: ten procedurally modelled, rigged animals (deer, parrot, dove, eagle, tiger, ostrich, cat, dog, monkey, horse).

- Anatomy-driven lofted, skinned bodies (one shared skeleton per animal), fur/skin/keratin/feather PBR textures generated on canvas (colour, normal, roughness), eyes with iris/lids, hooves, claws, beaks, antlers, whiskers, layered feathers for birds.
- Baked 30 fps looping clips: idle, walk, run, eat, sleep, and fly (parrot, dove, eagle). The same clips drive the live preview and the GLB/glTF export.
- Export: GLB / glTF with skins, textures and all clips (about 5-9 MB per animal).
- Species notes come from `src/animals/descriptions/*.md`.
- Caveats: procedural geometry, not hand-sculpted; no subsurface scattering in the web preview; fur is texture/normal-map based.
