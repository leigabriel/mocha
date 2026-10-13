import { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './landing.css';
import HeroCharm from './HeroCharm.jsx';

gsap.registerPlugin(ScrollTrigger);

/** A table with a visually hidden caption, a header row and a fixed column layout. */
function Table({ caption, cols, head, rows, widths }) {
  return (
    <div className="lp-table-wrap" data-in>
      <table className="lp-table">
        <caption className="lp-sr">{caption}</caption>
        <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead>
          <tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (j === 0 && cols.rowHeader
                ? <th key={j} scope="row">{c}</th>
                : <td key={j}>{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Section = ({ id, theme = 'light', title, intro, children }) => (
  <section className={`lp-sec lp-${theme}`} data-nav={theme} aria-labelledby={`${id}-h`}>
    <div className="lp-wrap">
      <h2 id={`${id}-h`} data-in>{title}</h2>
      {intro && <p className="lp-intro" data-in>{intro}</p>}
      {children}
    </div>
  </section>
);

const link = (href, text) => <a href={href}>{text}</a>;

const AT_A_GLANCE = [
  ['Runs in', 'Your browser. Nothing to install and no account to make.'],
  ['Starts from', 'An emoji, a line of text, an image, an SVG shape or one of ten animals.'],
  ['Makes', 'Keychain charms, name tags, stamp packs, keychain sets, stickers and rigged animals.'],
  ['Exports', 'GLB, glTF, OBJ, STL, 3MF, PLY, USDZ, PNG, SVG and a Blender script. Which ones depend on the tool.'],
  ['Real size', 'One voxel is 1.5 mm. Charms show their overall size in millimetres.'],
  ['Saved', 'In your browser as you work, and in the share link.'],
  ['Status', 'Under active development. Some features are unfinished.'],
];

const TOOLS = [
  [link('#/playground', 'Emoji Charms'), 'A solid voxel charm from any emoji, hung on a ring and chain that swings when you drag it.', 'GLB, glTF, OBJ, PNG'],
  [link('#/playground', 'Tag Builder'), 'Name tags as a bar, rounded rectangle, pill, circle, hex or cube, with raised text or your own SVG.', 'GLB, glTF, OBJ, STL, PLY, USDZ, 3MF, Blender script'],
  [link('#/playground', 'Stamp Pack'), 'Up to twelve stamps from your own images, in five shapes, with original, halftone or duotone looks.', 'GLB, glTF'],
  [link('#/playground', 'Keychain Set'), 'Up to six charms on one clasp: motel tags, bars, discs and silhouettes such as a cat, heart or star.', 'GLB, glTF, Blender script'],
  [link('#/playground', 'Animals'), 'Ten rigged animals with fur, feathers or skin and ready-made motions.', 'GLB, glTF'],
  [link('#/playground', 'Stickers'), 'Die-cut designs from a library of badges, signs, type blobs and pixel art, restyled with a palette.', 'PNG, SVG, GLB, glTF, STL'],
  [link('#/studio', '3D Studio'), 'A Blender-style workspace with an outliner, properties panel and timeline.', 'GLB, glTF, OBJ, STL, JSON'],
];

const STEPS = [
  ['1', 'Pick', 'Type an emoji or a name, add an image, or choose an animal.', 'Emoji, text, font, image, animal'],
  ['2', 'Build', 'Mocha turns the pixels or outline into solid geometry with real dimensions.', 'Size, thickness, finish'],
  ['3', 'Pose', 'Swing a charm, orbit the camera, or play a motion on an animal.', 'Chain length, camera view, motion'],
  ['4', 'Export', 'Download the file your next tool expects.', 'Format, animation, transparent background'],
];

const CHARMS = [
  ['Chain', 'Four to ten links. A longer chain swings more slowly, as a longer pendulum does.'],
  ['Physics', 'Fixed steps of 1/120 s, so the motion looks the same on a 30 Hz and a 144 Hz screen.'],
  ['Cluster', 'Up to five charms on one master ring. They fan out and settle back to rest.'],
  ['Thickness', '3.0, 4.5 or 6.0 mm.'],
  ['Finish', 'Steel, Gold or Noir.'],
  ['Motion export', 'A Swing or Spin loop, saved into the GLB or glTF file.'],
];

const ANIMALS = [
  ['Dog, cat, tiger, deer, horse, monkey', 'Four legs', 'Idle, walk, run, eat, sleep'],
  ['Parrot, dove, eagle', 'Two legs and wings', 'Idle, walk, run, eat, sleep, fly'],
  ['Ostrich', 'Two legs, flightless', 'Idle, walk, run, eat, sleep'],
];

const STUDIO = [
  ['Library', 'Twenty-five ready-made models, from a low-poly tree to a keychain and a sticker.'],
  ['Objects', 'Cube, sphere, cylinder, cone, torus, plane, capsule, ico sphere, star, heart, ring, text and SVG extrude, plus point, spot and sun lights, cameras and groups.'],
  ['Materials', 'Plastic, clay, metal, chrome, glass, frosted, soft touch and glow.'],
  ['Panels', 'An outliner to select and rename, a properties panel to transform and restyle, and a timeline for keyframes.'],
  ['Themes', 'Studio (blue), Light and Dark.'],
];

const FORMATS = [
  ['GLB and glTF', '3D software, game engines and web viewers. Can carry skeleton and animation. Units are metres.', 'All tools'],
  ['OBJ', 'Plain geometry of the current pose. The charm tools write millimetres.', 'Emoji Charms, Tag Builder, 3D Studio'],
  ['STL', 'Printing a single solid shape.', 'Tag Builder, Stickers, 3D Studio'],
  ['3MF', 'Slicers that read 3MF.', 'Tag Builder'],
  ['PLY and USDZ', 'Mesh exchange and Apple viewers.', 'Tag Builder'],
  ['PNG and SVG', 'Flat images. PNG snapshots are twice the on-screen size.', 'Emoji Charms (PNG), Stickers (PNG, SVG)'],
  ['Blender script', 'A Python script that rebuilds the model in Blender.', 'Tag Builder, Keychain Set'],
];

const LIMITS = [
  ['Charms on one ring', '5'],
  ['Charms in a Keychain Set', '6'],
  ['Tags in the Tag Builder', '6'],
  ['Stamps in a Stamp Pack', '12'],
  ['Objects in a 3D Studio scene', '300'],
  ['Chain links', '4 to 10'],
];

const FAQ = [
  ['Do I need an account?', 'No. There is nothing to sign in to. Your design is saved in your browser and in the page address, so you can copy the link to share exactly what you made.'],
  ['Does it work on a phone?', 'Yes. On a narrow screen the controls sit in a sheet under the 3D view. Live 3D is demanding, so an older phone may feel slow.'],
  ['Can I print what I make?', 'If your slicer reads the file. Use 3MF or STL from the Tag Builder, STL from Stickers, or OBJ in millimetres from the charm tools.'],
  ['Is it finished?', 'Not yet. Mocha is under active development, so some features are incomplete and things change often.'],
];

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
    const nav = el.querySelector('.lp-nav');
    const sections = [...el.querySelectorAll('[data-nav]')];
    const setTheme = () => {
      const hit = sections.find((s) => { const r = s.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; });
      if (hit) nav.dataset.theme = hit.dataset.nav;
    };
    window.addEventListener('scroll', setTheme, { passive: true });
    setTheme();

    // The only scroll motion: each section's content fades in once.
    const ctx = gsap.context(() => {
      if (reduced) return;
      el.querySelectorAll('.lp-sec:not(.lp-hero)').forEach((sec) => {
        gsap.from(sec.querySelectorAll('[data-in]'), {
          opacity: 0, y: 12, duration: 0.6, ease: 'power2.out', stagger: 0.06,
          scrollTrigger: { trigger: sec, start: 'top 65%', once: true },
        });
      });
    }, root);

    return () => { window.removeEventListener('scroll', setTheme); ctx.revert(); };
  }, [reduced]);

  return (
    <div ref={root} className="lp">
      <header className="lp-nav" data-theme="blue">
        <div className="lp-nav-in">
          <a href="#/" className="lp-brand" aria-label="Mocha Studio, home">Mocha Studio</a>
          <a href="#/playground" className="lp-pill">Playground</a>
        </div>
      </header>

      <main>
        <section className="lp-sec lp-hero lp-blue" data-nav="blue" aria-labelledby="lp-title">
          <div className="lp-wrap lp-hero-grid">
            <div>
              <h1 id="lp-title">Mocha Studio</h1>
              <p className="lp-lead">Mocha is a 3D studio that runs in your browser. Start from an emoji, a name, an image or an animal, and turn it into a pixel-art model you can pose, swing and export for printing, games or 3D software.</p>
              <div className="lp-actions">
                <a href="#/playground" className="lp-btn lp-btn-solid">Open the Playground</a>
                <a href="#/studio" className="lp-btn">Open the 3D Studio</a>
              </div>
            </div>
            <HeroCharm reduced={reduced} />
          </div>
        </section>

        <Section id="lp-what" title="What Mocha is" intro="Mocha turns simple inputs into solid 3D models. Type an emoji and it becomes a voxel charm on a chain. Write a name and it becomes a tag. Choose an animal and you get a rigged character with ready-made motions. Everything happens in the browser, so you can start in seconds.">
          <Table caption="Mocha Studio at a glance" cols={{ rowHeader: true }} head={['Topic', 'Detail']} widths={['28%', '72%']} rows={AT_A_GLANCE} />
        </Section>

        <Section id="lp-tools" title="Seven tools" intro="Each tool makes one kind of object and exports in the formats that suit it.">
          <Table caption="The seven tools and what they export" cols={{ rowHeader: true }} head={['Tool', 'What you make', 'Exports']} widths={['20%', '48%', '32%']} rows={TOOLS} />
        </Section>

        <Section id="lp-how" title="How it works" intro="Every tool follows the same four steps.">
          <Table caption="The four steps" cols={{}} head={['Step', 'Stage', 'What happens', 'You choose']} widths={['12%', '14%', '46%', '28%']} rows={STEPS} />
        </Section>

        <Section id="lp-charms" title="Charms that swing" intro="An emoji is read pixel by pixel, and each coloured pixel becomes a block 1.5 mm across. A charm seventeen blocks wide comes out about 25 mm wide.">
          <Table caption="Emoji charm features" cols={{ rowHeader: true }} head={['Feature', 'Detail']} widths={['24%', '76%']} rows={CHARMS} />
        </Section>

        <Section id="lp-animals" title="Ten animals, built to move" intro="Each animal has a skeleton, skin weights and baked motions. Export a GLB or glTF and the skeleton and animation go with the file.">
          <Table caption="Animals and their motions" cols={{}} head={['Animals', 'Build', 'Motions']} widths={['38%', '24%', '38%']} rows={ANIMALS} />
        </Section>

        <Section id="lp-studio" title="A 3D studio in the browser" intro="When a template is not enough, the 3D Studio gives you a Blender-style workspace to build a scene from scratch.">
          <Table caption="3D Studio features" cols={{ rowHeader: true }} head={['Area', 'What it does']} widths={['24%', '76%']} rows={STUDIO} />
          <p data-in><a className="lp-btn lp-btn-ink" href="#/studio">Open the 3D Studio</a></p>
        </Section>

        <Section id="lp-formats" title="Formats" intro="Download what you made in the format your next tool reads.">
          <Table caption="Export formats" cols={{ rowHeader: true }} head={['Format', 'Good for', 'Available in']} widths={['20%', '48%', '32%']} rows={FORMATS} />
        </Section>

        <Section id="lp-know" title="Good to know">
          <div className="lp-two">
            <Table caption="Limits" cols={{ rowHeader: true }} head={['Item', 'Limit']} widths={['72%', '28%']} rows={LIMITS} />
            <div className="lp-faq" data-in>
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>

        <section className="lp-sec lp-cta lp-blue" data-nav="blue" aria-labelledby="lp-cta-h">
          <div className="lp-wrap">
            <h2 id="lp-cta-h" data-in>Start with an emoji.</h2>
            <p className="lp-lead" data-in>Open the Playground, pick something small, and have a model to export in a few minutes.</p>
            <p data-in><a href="#/playground" className="lp-btn lp-btn-solid">Open the Playground</a></p>
            <footer data-in>Mocha Studio is under active development.</footer>
          </div>
        </section>
      </main>
    </div>
  );
}
