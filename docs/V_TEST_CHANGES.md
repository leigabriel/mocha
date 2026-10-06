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
- The rest pose is now where the charms hang once they have settled against each other, so with 3+ charms some chains hang slightly tilted (up to about 25 degrees at worst with five 6 mm charms).
- Selection and hover use a soft emissive tint on the charm. No wireframe is drawn, and exports strip the tint.
- Tests: no overlap at rest (1-5 charms x 3 thicknesses), while swinging, and in baked swing/spin clips.

## Behaviour changes to be aware of
- Hardware was rescaled (ring ≈ 40 mm across, links and jump rings larger) so it reads at real-world proportions.
- Charm slots were re-laid-out: the centre charm is frontmost and the four others sit behind it. The original fifth slot ("front-right accent") is now a rear accent.
- Rest-pose and exported clips are different from v0 by design (finding 3 and 20).
