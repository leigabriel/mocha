import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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

export default function Landing() {
  const root = useRef(null);
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

  useLayoutEffect(() => {
    const el = root.current;
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

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Hero: the wordmark rises out of a mask, then the copy follows.
        const intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
        intro
          .from('.lp-nav > *', { y: -24, autoAlpha: 0, duration: 0.9, stagger: 0.1 }, 0.1)
          .from('.lp-word i', { yPercent: 115, duration: 1.2, stagger: 0.07 }, 0.15)
          .from('.lp-hero-copy', { y: 20, autoAlpha: 0, duration: 0.9 }, 0.9)
          .from('.lp-hero-foot > *', { y: 14, autoAlpha: 0, duration: 0.8, stagger: 0.08 }, 1.05);

        // Marquee: drifts on its own and leans into the scroll velocity.
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
          trigger: '.lp-marquee',
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            const v = gsap.utils.clamp(-2400, 2400, self.getVelocity());
            boost = Math.abs(v) / 500;
            skew(gsap.utils.clamp(-10, 10, -v / 240));
          },
        });
        ScrollTrigger.addEventListener('scrollEnd', () => skew(0));

        // Statement: each word lights up as it crosses the middle of the screen.
        gsap.fromTo('.lp-statement .w', { opacity: 0.14 }, {
          opacity: 1,
          ease: 'none',
          stagger: 0.5,
          scrollTrigger: { trigger: '.lp-statement p', start: 'top 80%', end: 'bottom 45%', scrub: 0.4 },
        });

        // Process: the rule fills as you move through the steps.
        gsap.fromTo('.lp-rule-fill', { scaleY: 0 }, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.lp-steps', start: 'top 60%', end: 'bottom 70%', scrub: true },
        });
        gsap.utils.toArray('.lp-step').forEach((s) => {
          gsap.from(s.querySelectorAll('h3, p'), {
            clipPath: 'inset(0 0 100% 0)',
            y: 18,
            duration: 0.9,
            ease: 'expo.out',
            stagger: 0.08,
            scrollTrigger: { trigger: s, start: 'top 78%' },
          });
        });

        // Closing call to action.
        gsap.from('.lp-cta h2 i', {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.05,
          scrollTrigger: { trigger: '.lp-cta', start: 'top 65%' },
        });

        return () => gsap.ticker.remove(tick);
      });

      // Tools: pinned, scrolls sideways on wide screens; a plain column elsewhere.
      mm.add('(min-width: 900px) and (prefers-reduced-motion: no-preference)', () => {
        const rail = el.querySelector('.lp-rail');
        const dist = () => rail.scrollWidth - window.innerWidth + 0;
        const tween = gsap.to(rail, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.lp-tools',
            pin: true,
            scrub: 0.6,
            start: 'top top',
            end: () => `+=${dist()}`,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        gsap.utils.toArray('.lp-tool').forEach((card) => {
          gsap.from(card.querySelector('.lp-glyph'), {
            scale: 0.6,
            rotate: -8,
            ease: 'back.out(2)',
            scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%', toggleActions: 'play none none reverse' },
          });
        });
      });

      // Magnetic button.
      const btn = el.querySelector('.lp-magnet');
      if (btn && !reduced) {
        const mx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
        const my = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
        const move = (e) => {
          const r = btn.getBoundingClientRect();
          mx((e.clientX - (r.left + r.width / 2)) * 0.25);
          my((e.clientY - (r.top + r.height / 2)) * 0.25);
        };
        const leave = () => { mx(0); my(0); };
        btn.addEventListener('pointermove', move);
        btn.addEventListener('pointerleave', leave);
      }

      return () => { mm.revert(); window.removeEventListener('scroll', setTheme); ScrollTrigger.removeEventListener('refresh', setTheme); };
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  const words = STATEMENT.split(' ');

  return (
    <div ref={root} className="lp">
      <header className="lp-nav" data-theme="blue">
        <a href="#/" className="lp-brand" aria-label="Mocha Studio, home">Mocha Studio</a>
        <a href="#/playground" className="lp-pill">Playground</a>
      </header>

      <main>
        <section className="lp-hero" data-nav="blue" aria-labelledby="lp-title">
          <HeroCharm reduced={reduced} />
          <h1 id="lp-title" className="lp-word" aria-label="Mocha">
            {[...'Mocha'].map((c, i) => (
              <span key={i} className="lp-mask" aria-hidden="true"><i>{c}</i></span>
            ))}
          </h1>
          <p className="lp-hero-copy">Turn an emoji, a name or an animal into a 3D pixel model. Swing it, pose it, then export it.</p>
          <div className="lp-hero-foot">
            <a href="#/playground" className="lp-pill lp-pill-solid">Open the Playground</a>
            <span>Scroll to see what it makes</span>
          </div>
        </section>

        <div className="lp-marquee" aria-hidden="true">
          <div className="lp-marquee-track">
            {[0, 1].map((n) => (
              <span key={n} className="lp-marquee-set">
                {TOOLS.map((t) => (<span key={t.id}>{t.name}<b /></span>))}
              </span>
            ))}
          </div>
        </div>

        <section className="lp-statement" data-nav="light" aria-label="What Mocha Studio is">
          <p>{words.map((w, i) => (<span key={i} className="w">{w} </span>))}</p>
        </section>

        <section className="lp-tools" data-nav="dark" aria-labelledby="lp-tools-title">
          <div className="lp-tools-head">
            <h2 id="lp-tools-title">Seven tools, one studio</h2>
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

        <section className="lp-process" data-nav="light" aria-labelledby="lp-process-title">
          <h2 id="lp-process-title">From a single pixel to a file you can use</h2>
          <ol className="lp-steps">
            <span className="lp-rule" aria-hidden="true"><span className="lp-rule-fill" /></span>
            {STEPS.map((s, i) => (
              <li key={s.t} className="lp-step">
                <span className="lp-num" aria-hidden="true">{i + 1}</span>
                <div>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-cta" data-nav="blue" aria-labelledby="lp-cta-title">
          <h2 id="lp-cta-title" aria-label="Make something small">
            {['Make', 'something', 'small'].map((w) => (
              <span key={w} className="lp-mask" aria-hidden="true"><i>{w}</i> </span>
            ))}
          </h2>
          <a href="#/playground" className="lp-pill lp-pill-solid lp-magnet">Open the Playground</a>
          <footer>Mocha Studio runs in your browser. Nothing to install.</footer>
        </section>
      </main>
    </div>
  );
}
