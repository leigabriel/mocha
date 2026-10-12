import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { animate, stagger } from 'animejs';
import '@fontsource/bebas-neue/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './landing.css';
import HeroCharm from './HeroCharm.jsx';
import { GLYPHS } from './sprites.js';

gsap.registerPlugin(ScrollTrigger);

const TOOLS = [
  { id: 'charms', name: 'Emoji Charms', glyph: 'charm', color: '#FF5D8F', href: '#/playground', text: 'Type or pick any emoji and it becomes a solid voxel charm on a split ring and chain. Drag it and it swings like the real thing.' },
  { id: 'tag', name: 'Tag Builder', glyph: 'tag', color: '#FFE45C', href: '#/playground', text: 'Shape a tag as a bar, pill, hex or cube, add raised lettering or your own SVG, and export for printing as 3MF.' },
  { id: 'stamp', name: 'Stamp Pack', glyph: 'stamp', color: '#7CF0C0', href: '#/playground', text: 'Turn your images into a pack of stamps in a bag with a caption card, in original, halftone or duotone looks.' },
  { id: 'set', name: 'Keychain Set', glyph: 'keys', color: '#9DB4FF', href: '#/playground', text: 'Build a set of up to six charms on one clasp: motel tags, bars, discs and silhouettes such as a cat, heart or star.' },
  { id: 'animals', name: 'Animals', glyph: 'animal', color: '#FFA45C', href: '#/playground', text: 'Ten rigged animals with fur, feathers and skin. They idle, walk, run and eat, and export with their animation.' },
  { id: 'stickers', name: 'Stickers', glyph: 'sticker', color: '#FF8AD8', href: '#/playground', text: 'Pick a die-cut design from a library of badges, signs, type blobs and pixel art, then restyle it with a palette.' },
  { id: 'studio', name: '3D Studio', glyph: 'cursor', color: '#FFFFFF', href: '#/studio', text: 'A full workspace in the style of Blender: an outliner, properties, a timeline and 25 ready-made models to start from.' },
];

const STEPS = [
  { t: 'Pick', d: 'Type an emoji, write a name, or choose one of the ten animals. The preview updates as you go.' },
  { t: 'Build', d: 'Mocha turns the pixels into solid geometry: every voxel is 1.5\u00a0mm, so what you see has a real size.' },
  { t: 'Pose', d: 'Grab a charm and swing it, orbit the camera, or play a walk and run cycle on an animal.' },
  { t: 'Export', d: 'Download GLB, glTF or OBJ for 3D software, 3MF for printing, or a PNG with a transparent background.' },
];

const STATEMENT = 'Mocha Studio is a workshop for small 3D things that runs in your browser. Start from a single emoji and end with a model you can hold, print or animate. Nothing to install, nothing to learn first.';

const BUILD_ROWS = ['Every emoji is a grid', 'Every cell is a block', 'Every block is 1.5 mm'];
const BUILD_COLS = [
  { h: 'Rasterise', p: 'Mocha draws your emoji with the emoji font already on your device, reads the pixels back and averages them into a coarse grid. Empty cells stay empty. The rest keep their colour, so a pizza is still red, yellow and brown.' },
  { h: 'Extrude', p: 'Each coloured cell becomes a solid block. You choose the moulded thickness: 3.0, 4.5 or 6.0 mm. One voxel is 1.5 mm across, so every charm has a real size, shown in the panel, that you can check before you print.' },
  { h: 'Hang', p: 'The charm is threaded on a split ring and joined to a chain of four to ten links. Finish the metal in steel, gold or noir, and hang up to five charms from one master ring.' },
];
const STATS = [
  { n: 120, label: 'physics steps every second' },
  { n: 10, label: 'chain links at most' },
  { n: 5, label: 'charms on one ring' },
  { n: 25, label: 'ready-made 3D models' },
];
const ANIMALS = ['Deer', 'Tiger', 'Cat', 'Dog', 'Horse', 'Monkey', 'Parrot', 'Dove', 'Eagle', 'Ostrich'];
const FORMATS = [
  { h: 'GLB and glTF', p: 'For 3D software, game engines and web viewers. Charms export with a swing or a spin loop, animals with the clip you chose. glTF files are in metres.' },
  { h: 'OBJ', p: 'Static geometry of the pose on screen, in millimetres, for slicers and CAD tools that do not read glTF.' },
  { h: '3MF and STL', p: 'Tag Builder writes 3MF for printing. Stickers can be saved as STL for a plain printable shape.' },
  { h: 'Blender script', p: 'The Tag Builder and Keychain Set can write a Python script that carries the model inside it. Run it in Blender and you get the model, lights, a camera and a render setup.' },
  { h: 'PNG', p: 'A snapshot at twice the on-screen size, with an optional transparent background, ready for a shop listing or a message.' },
];
const FAQ = [
  { q: 'Do I need to install anything?', a: 'No. Mocha Studio runs in the browser on your computer. Open the Playground and start.' },
  { q: 'Are my designs saved?', a: 'The Playground keeps your current design on your device and writes it into the page address, so you can copy the link and share exactly what you made. There is no account.' },
  { q: 'How big will my charm be?', a: 'One voxel is 1.5 mm and the overall size in millimetres is shown in the panel. Pick a thickness of 3.0, 4.5 or 6.0 mm to change how chunky it feels.' },
  { q: 'Can I print what I make?', a: 'Yes, as long as your printer software reads the file. Use 3MF from the Tag Builder, STL from Stickers, or OBJ in millimetres from the charm tools.' },
  { q: 'Do the animals export with animation?', a: 'Yes. GLB and glTF files carry the skeleton and the clips, so the idle, walk, run and eat cycles play when you import them. Birds also fly.' },
  { q: 'What is the 3D Studio?', a: 'A separate workspace in the style of Blender, with an outliner, a properties panel, a timeline and 25 prebuilt models. It comes in three themes: Studio, Light and Dark.' },
];

const CHARM_MINI = ['..####..', '.######.', '##.##.##', '########', '########', '.######.', '..####..'];

const Pixels = ({ rows, color }) => {
  const w = Math.max(...rows.map((r) => r.length));
  const rects = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') rects.push(<rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" />); }));
  return (
    <svg className="lp-glyph" viewBox={`-1 -1 ${w + 3} ${rows.length + 3}`} aria-hidden="true" style={{ '--c': color }}>
      <g className="lp-glyph-back" transform="translate(0.9 0.9)">{rects}</g>
      <g className="lp-glyph-mid" transform="translate(0.45 0.45)">{rects}</g>
      <g className="lp-glyph-front">{rects}</g>
    </svg>
  );
};

const Split = ({ text }) => (
  <>
    {[...text].map((c, i) => (
      <span key={i} className="lp-ch" aria-hidden="true">{c === ' ' ? ' ' : c}</span>
    ))}
  </>
);

const GRID_W = 28;
const GRID_H = 7;

export default function Landing() {
  const root = useRef(null);
  const [open, setOpen] = useState(-1);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The app shell is locked to the viewport; the landing page scrolls like a normal document.
  useEffect(() => {
    document.documentElement.classList.add('lp-scroll');
    window.scrollTo(0, 0);
    return () => {
      document.documentElement.classList.remove('lp-scroll');
      window.scrollTo(0, 0);
    };
  }, []);

  // FAQ answers open and close with a height tween.
  useEffect(() => {
    const el = root.current;
    el.querySelectorAll('.lp-faq-a').forEach((a, i) => {
      const on = i === open;
      if (reduced) { gsap.set(a, { height: on ? 'auto' : 0 }); return; }
      gsap.to(a, { height: on ? 'auto' : 0, duration: 0.55, ease: 'power3.inOut', onComplete: () => ScrollTrigger.refresh() });
    });
  }, [open, reduced]);

  useLayoutEffect(() => {
    const el = root.current;
    const anims = [];
    const ctx = gsap.context(() => {
      // The nav changes colour to match whichever section is under it.
      const nav = el.querySelector('.lp-nav');
      const sections = [...el.querySelectorAll('[data-nav]')];
      const setTheme = () => {
        const hit = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; });
        if (hit) nav.dataset.theme = hit.dataset.nav;
      };
      window.addEventListener('scroll', setTheme, { passive: true });
      ScrollTrigger.addEventListener('refresh', setTheme);
      setTheme();

      // Counters count up with anime.js when their section arrives.
      el.querySelectorAll('[data-count]').forEach((n) => {
        const target = +n.dataset.count;
        if (reduced) { n.textContent = target; return; }
        const o = { v: 0 };
        n.textContent = '0';
        ScrollTrigger.create({
          trigger: n, start: 'top 85%', once: true,
          onEnter: () => anims.push(animate(o, { v: target, duration: 1800, ease: 'outExpo', onUpdate: () => { n.textContent = Math.round(o.v); } })),
        });
      });

      // A grid of pixels pulses outwards from the centre (anime.js stagger on a grid).
      const cells = el.querySelectorAll('.lp-cell');
      if (cells.length && !reduced) {
        ScrollTrigger.create({
          trigger: '.lp-build', start: 'top 60%', once: true,
          onEnter: () => anims.push(animate(cells, {
            scale: [{ to: 0.25, duration: 0 }, { to: 1, duration: 500 }, { to: 0.45, duration: 700 }],
            opacity: [{ to: 0.2, duration: 0 }, { to: 1, duration: 500 }, { to: 0.55, duration: 700 }],
            delay: stagger(55, { grid: [GRID_W, GRID_H], from: 'center' }),
            loop: true, loopDelay: 1400, ease: 'inOutQuad',
          })),
        });
      }

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // 1 Hero: the wordmark rises out of a mask, then the copy follows.
        gsap.timeline({ defaults: { ease: 'expo.out' } })
          .from('.lp-nav > *', { y: -24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.1)
          .from('.lp-word i', { yPercent: 115, duration: 1.2, stagger: 0.07 }, 0.15)
          .from('.lp-hero-copy', { y: 20, autoAlpha: 0, duration: 0.9 }, 0.9)
          .from('.lp-hero-foot > *', { y: 14, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 1.05);
        gsap.to('.lp-word', { yPercent: -18, ease: 'none', scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: true } });

        // 2 Marquee: drifts on its own and leans into the scroll velocity.
        const track = el.querySelector('.lp-marquee-track');
        const skew = gsap.quickSetter(track, 'skewX', 'deg');
        let x = 0;
        let boost = 0;
        const tick = () => {
          const half = track.scrollWidth / 2;
          x -= 1.1 + boost;
          if (x <= -half) x += half;
          gsap.set(track, { x });
        };
        gsap.ticker.add(tick);
        ScrollTrigger.create({
          trigger: '.lp-marquee', start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => {
            const v = gsap.utils.clamp(-2400, 2400, self.getVelocity());
            boost = Math.abs(v) / 500;
            skew(gsap.utils.clamp(-10, 10, -v / 240));
          },
        });

        // 3 Statement: each word lights up as it crosses the middle of the screen.
        gsap.fromTo('.lp-statement .w', { opacity: 0.14 }, {
          opacity: 1, ease: 'none', stagger: 0.5,
          scrollTrigger: { trigger: '.lp-statement p', start: 'top 80%', end: 'bottom 45%', scrub: 0.4 },
        });

        // 4 Build: the three big lines slide in from alternating sides; columns unmask.
        gsap.utils.toArray('.lp-slide').forEach((row, i) => {
          gsap.fromTo(row, { xPercent: i % 2 ? 22 : -22, opacity: 0.2 }, {
            xPercent: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: row, start: 'top 95%', end: 'top 45%', scrub: 0.5 },
          });
        });
        gsap.from('.lp-col', {
          clipPath: 'inset(0 0 100% 0)', y: 40, duration: 1, ease: 'expo.out', stagger: 0.12,
          scrollTrigger: { trigger: '.lp-cols', start: 'top 80%' },
        });

        // 5 Physics: the pendulum swings; scrolling fast makes it swing harder.
        const swing = gsap.fromTo('.lp-arm', { rotation: -26 }, { rotation: 26, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: -1, transformOrigin: '50% 0%', svgOrigin: '200 20' });
        ScrollTrigger.create({
          trigger: '.lp-physics', start: 'top bottom', end: 'bottom top',
          onUpdate: (self) => { swing.timeScale(gsap.utils.clamp(1, 3.2, 1 + Math.abs(self.getVelocity()) / 900)); },
          onLeave: () => swing.timeScale(1), onLeaveBack: () => swing.timeScale(1),
        });
        gsap.from('.lp-stat', { y: 60, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.lp-stats', start: 'top 82%' } });
        gsap.from('.lp-physics-copy > *', { y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.lp-physics-copy', start: 'top 80%' } });

        // 7 Animals: names light up one by one; a pixel cat walks across, tied to scroll.
        gsap.utils.toArray('.lp-animal').forEach((a) => {
          gsap.fromTo(a, { opacity: 0.18, xPercent: -4 }, {
            opacity: 1, xPercent: 0, ease: 'none',
            scrollTrigger: { trigger: a, start: 'top 82%', end: 'top 50%', scrub: 0.4 },
          });
        });
        gsap.fromTo('.lp-walker', { x: '-12vw' }, { x: '100vw', ease: 'none', scrollTrigger: { trigger: '.lp-animals', start: 'top bottom', end: 'bottom top', scrub: 0.8 } });
        gsap.from('.lp-animals-copy > *', { y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.lp-animals-copy', start: 'top 80%' } });

        // 8 Print: the heading flips in letter by letter; columns drift at different speeds.
        gsap.from('.lp-print h2 .lp-ch', {
          rotateX: -90, yPercent: 40, opacity: 0, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.03, transformOrigin: '50% 100%',
          scrollTrigger: { trigger: '.lp-print h2', start: 'top 80%' },
        });
        gsap.utils.toArray('.lp-format').forEach((f, i) => {
          gsap.fromTo(f, { y: 80 + (i % 3) * 40 }, { y: -30 * (i % 3), ease: 'none', scrollTrigger: { trigger: '.lp-formats', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
        });

        // 9 Studio: the mock workspace tilts up and the playhead runs along the timeline.
        gsap.fromTo('.lp-win', { rotateX: 24, scale: 0.84, y: 80 }, {
          rotateX: 0, scale: 1, y: 0, ease: 'none', transformOrigin: '50% 100%',
          scrollTrigger: { trigger: '.lp-win', start: 'top 95%', end: 'top 35%', scrub: 0.6 },
        });
        gsap.fromTo('.lp-head', { left: '4%' }, { left: '96%', ease: 'none', scrollTrigger: { trigger: '.lp-studio', start: 'top 60%', end: 'bottom 80%', scrub: true } });
        gsap.from('.lp-studio-copy > *', { y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.lp-studio-copy', start: 'top 80%' } });

        // 10 Process: the rule fills as you move through the steps.
        gsap.fromTo('.lp-rule-fill', { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.lp-steps', start: 'top 60%', end: 'bottom 70%', scrub: true } });
        gsap.utils.toArray('.lp-step').forEach((st) => {
          gsap.from(st.querySelectorAll('h3, p'), {
            clipPath: 'inset(0 0 100% 0)', y: 18, duration: 0.9, ease: 'expo.out', stagger: 0.08,
            scrollTrigger: { trigger: st, start: 'top 78%' },
          });
        });

        // 11 FAQ: rows slide up in turn.
        gsap.from('.lp-faq-item', { y: 50, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.lp-faq-list', start: 'top 80%' } });

        // 12 Closing call to action.
        gsap.from('.lp-cta h2 i', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.lp-cta', start: 'top 65%' } });


        return () => gsap.ticker.remove(tick);
      });

      // 6 Tools: pinned, scrolls sideways on wide screens; a plain column elsewhere.
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const rail = el.querySelector('.lp-rail');
        const dist = () => rail.scrollWidth - window.innerWidth;
        const tween = gsap.to(rail, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: { trigger: '.lp-tools', pin: true, scrub: 0.6, start: 'top top', end: () => `+=${dist()}`, invalidateOnRefresh: true, anticipatePin: 1 },
        });
        gsap.utils.toArray('.lp-tool').forEach((card) => {
          gsap.from(card.querySelector('.lp-glyph'), {
            scale: 0.6, rotate: -8, ease: 'back.out(2)',
            scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%', toggleActions: 'play none none reverse' },
          });
        });
      });

      // Magnetic button.
      const btn = el.querySelector('.lp-magnet');
      if (btn && !reduced) {
        const mx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
        const my = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
        btn.addEventListener('pointermove', (e) => {
          const r = btn.getBoundingClientRect();
          mx((e.clientX - (r.left + r.width / 2)) * 0.25);
          my((e.clientY - (r.top + r.height / 2)) * 0.25);
        });
        btn.addEventListener('pointerleave', () => { mx(0); my(0); });
      }

      return () => { mm.revert(); window.removeEventListener('scroll', setTheme); ScrollTrigger.removeEventListener('refresh', setTheme); };
    }, root);

    return () => { anims.forEach((a) => a.revert?.()); ctx.revert(); };
  }, [reduced]);

  const words = STATEMENT.split(' ');

  return (
    <div ref={root} className="lp">
      <header className="lp-nav" data-theme="blue">
        <a href="#/" className="lp-brand" aria-label="Mocha Studio, home">Mocha Studio</a>
        <a href="#/playground" className="lp-pill">Playground</a>
      </header>

      <main>
        {/* 1 */}
        <section className="lp-hero" data-nav="blue" aria-labelledby="lp-title">
          <HeroCharm reduced={reduced} />
          <h1 id="lp-title" className="lp-word" aria-label="Mocha">
            {[...'Mocha'].map((c, i) => (<span key={i} className="lp-mask" aria-hidden="true"><i>{c}</i></span>))}
          </h1>
          <p className="lp-hero-copy">Turn an emoji, a name or an animal into a 3D pixel model. Swing it, pose it, then export it.</p>
          <div className="lp-hero-foot">
            <a href="#/playground" className="lp-pill lp-pill-solid">Open the Playground</a>
            <span>Scroll to see what it makes</span>
          </div>
        </section>

        {/* 2 */}
        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-marquee-track">
            {[0, 1].map((n) => (
              <span key={n} className="lp-marquee-set">
                {TOOLS.map((t) => (<span key={t.id}>{t.name}<b /></span>))}
              </span>
            ))}
          </div>
        </div>

        {/* 3 */}
        <section className="lp-statement lp-sec" data-nav="light" aria-label="What Mocha Studio is">
          <p className="lp-display">{words.map((w, i) => (<span key={i} className="w">{w} </span>))}</p>
        </section>

        {/* 4 */}
        <section className="lp-build lp-sec" data-nav="blue" aria-labelledby="lp-build-title">
          <h2 id="lp-build-title" className="sr-only">How a pixel becomes a model</h2>
          <div className="lp-slides" aria-hidden="true">
            {BUILD_ROWS.map((r) => (<div key={r} className="lp-slide lp-display">{r}</div>))}
          </div>
          <div className="lp-cols">
            {BUILD_COLS.map((c) => (
              <article key={c.h} className="lp-col">
                <h3 className="lp-display">{c.h}</h3>
                <p>{c.p}</p>
              </article>
            ))}
          </div>
          <div className="lp-grid" aria-hidden="true" style={{ '--w': GRID_W }}>
            {Array.from({ length: GRID_W * GRID_H }, (_, i) => (<span key={i} className="lp-cell" />))}
          </div>
        </section>

        {/* 5 */}
        <section className="lp-physics lp-sec" data-nav="light" aria-labelledby="lp-physics-title">
          <div className="lp-physics-grid">
            <div className="lp-physics-copy">
              <h2 id="lp-physics-title" className="lp-display">It swings like the real thing</h2>
              <p>The chain is a pendulum. A longer chain swings slower and a shorter one swings quicker, and the charm turns on its bottom ring instead of sliding with the chain.</p>
              <p>Physics runs in fixed steps of one 120th of a second, so a swing looks the same on a 30 Hz screen and a 144 Hz one. Let go and the whole cluster settles back to its resting pose.</p>
              <p>Grab a charm and fling it. Drag the empty space to orbit. Scroll to zoom. Or press Spin to watch it turn on a turntable.</p>
            </div>
            <svg className="lp-pendulum" viewBox="0 0 400 520" aria-hidden="true">
              <rect x="150" y="0" width="100" height="20" rx="4" className="lp-pend-mount" />
              <g className="lp-arm">
                <line x1="200" y1="20" x2="200" y2="360" className="lp-pend-chain" />
                {[60, 110, 160, 210, 260, 310].map((y) => (<rect key={y} x="192" y={y} width="16" height="30" rx="8" className="lp-pend-link" />))}
                <g transform="translate(160 360)">
                  {CHARM_MINI.map((row, ry) => [...row].map((c, cx) => (c === '#' ? <rect key={`${cx}-${ry}`} x={cx * 8} y={ry * 8} width="8.4" height="8.4" className="lp-pend-px" /> : null)))}
                </g>
              </g>
            </svg>
          </div>
          <dl className="lp-stats">
            {STATS.map((s) => (
              <div key={s.label} className="lp-stat">
                <dt className="lp-display"><span data-count={s.n}>{s.n}</span></dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 6 */}
        <section className="lp-tools" data-nav="dark" aria-labelledby="lp-tools-title">
          <div className="lp-tools-head">
            <h2 id="lp-tools-title" className="lp-display">Seven tools, one studio</h2>
          </div>
          <div className="lp-rail">
            {TOOLS.map((t) => (
              <a key={t.id} href={t.href} className="lp-tool" style={{ '--c': t.color }}>
                <Pixels rows={GLYPHS[t.glyph]} color={t.color} />
                <h3>{t.name}</h3>
                <p>{t.text}</p>
              </a>
            ))}
          </div>
        </section>

        {/* 7 */}
        <section className="lp-animals lp-sec" data-nav="yellow" aria-labelledby="lp-animals-title">
          <div className="lp-walker" aria-hidden="true"><Pixels rows={GLYPHS.animal} color="#161616" /></div>
          <div className="lp-animals-grid">
            <div className="lp-animals-copy">
              <h2 id="lp-animals-title" className="lp-display">Ten animals with a skeleton inside</h2>
              <p>Each animal is built around its own skeleton: shoulders, elbows and paws or hooves, a neck, a jaw, a tail, and wings for the birds. That is what lets the same model idle, walk, run, eat and sleep, and fly if it has wings.</p>
              <p>The clips are written into the file, so they play when you open it in software that reads glTF.</p>
            </div>
            <ul className="lp-animal-list">
              {ANIMALS.map((a) => (<li key={a} className="lp-animal lp-display">{a}</li>))}
            </ul>
          </div>
        </section>

        {/* 8 */}
        <section className="lp-print lp-sec" data-nav="blue" aria-labelledby="lp-print-title">
          <h2 id="lp-print-title" className="lp-display" aria-label="Made to leave the screen">
            <Split text="Made to leave" /><br /><Split text="the screen" />
          </h2>
          <div className="lp-formats">
            {FORMATS.map((f) => (
              <article key={f.h} className="lp-format">
                <h3 className="lp-display">{f.h}</h3>
                <p>{f.p}</p>
              </article>
            ))}
          </div>
        </section>

        {/* 9 */}
        <section className="lp-studio lp-sec" data-nav="dark" aria-labelledby="lp-studio-title">
          <div className="lp-studio-copy">
            <h2 id="lp-studio-title" className="lp-display">And a workspace for everything else</h2>
            <p>The 3D Studio is a full workspace in the style of Blender. Add a model from the library, select it in the outliner, change its material and transform in the properties panel, and keyframe it on the timeline.</p>
            <p>It starts with 25 ready-made models, from a low-poly tree to a keychain and a sticker, and it comes in three themes: Studio blue, Light and Dark.</p>
            <a href="#/studio" className="lp-pill lp-pill-solid">Open the 3D Studio</a>
          </div>
          <div className="lp-win" aria-hidden="true">
            <div className="lp-win-bar"><i /><i /><i /><span>Mocha 3D Studio</span></div>
            <div className="lp-win-body">
              <div className="lp-pane lp-outliner">
                <b>Outliner</b>
                <span>Scene</span><span>Low-poly tree</span><span>Keychain</span><span>Sticker</span><span>Cat</span>
              </div>
              <div className="lp-pane lp-viewport"><Pixels rows={GLYPHS.charm} color="#FF5D8F" /></div>
              <div className="lp-pane lp-props">
                <b>Properties</b>
                <span>Location</span><span>Rotation</span><span>Scale</span><span>Material</span>
              </div>
            </div>
            <div className="lp-win-time"><b>Timeline</b><div className="lp-track"><span className="lp-head" /></div></div>
          </div>
        </section>

        {/* 10 */}
        <section className="lp-process lp-sec" data-nav="light" aria-labelledby="lp-process-title">
          <h2 id="lp-process-title" className="lp-display">From a single pixel to a file you can use</h2>
          <ol className="lp-steps">
            <span className="lp-rule" aria-hidden="true"><span className="lp-rule-fill" /></span>
            {STEPS.map((s, i) => (
              <li key={s.t} className="lp-step">
                <span className="lp-num" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className="lp-display">{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 11 */}
        <section className="lp-faq lp-sec" data-nav="dark" aria-labelledby="lp-faq-title">
          <h2 id="lp-faq-title" className="lp-display">Questions, answered</h2>
          <div className="lp-faq-list">
            {FAQ.map((f, i) => (
              <div key={f.q} className="lp-faq-item">
                <h3>
                  <button type="button" className="lp-faq-q lp-display" aria-expanded={open === i} aria-controls={`faq-${i}`} onClick={() => setOpen(open === i ? -1 : i)}>
                    <span>{f.q}</span><i aria-hidden="true" />
                  </button>
                </h3>
                <div id={`faq-${i}`} className="lp-faq-a" role="region" style={{ height: 0 }}><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </section>

        {/* 12 */}
        <section className="lp-cta lp-sec" data-nav="blue" aria-labelledby="lp-cta-title">
          <h2 id="lp-cta-title" aria-label="Make something small">
            {['Make', 'something', 'small'].map((w) => (<span key={w} className="lp-mask" aria-hidden="true"><i>{w}</i> </span>))}
          </h2>
          <a href="#/playground" className="lp-pill lp-pill-solid lp-magnet">Open the Playground</a>
          <footer>Mocha Studio runs in your browser. Nothing to install.</footer>
        </section>
      </main>
    </div>
  );
}
