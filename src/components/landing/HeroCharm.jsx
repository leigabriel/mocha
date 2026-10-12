import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CHARM } from './sprites.js';

const LAYERS = 7;

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/**
 * The hero: a pixel-art keychain charm that assembles from scattered cells, then keeps a
 * stack of offset layers so it reads as an extruded voxel slab that tilts with the pointer.
 */
export default function HeroCharm({ reduced }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rows = CHARM.rows;
    const NX = rows[0].length;
    const NY = rows.length;
    const cells = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const color = CHARM.palette[ch];
      cells.push({ x, y, color, side: shade(color, 0.62), fx: 0, fy: 0, depth: 0, a: reduced ? 1 : 0 });
    }));

    const state = { tx: 0, ty: 0, swing: 0, pointer: false };
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cs = Math.floor(Math.min(w, h) / (NX + 2));
      const ox = Math.round((w - cs * NX) / 2);
      const oy = Math.round((h - cs * NY) / 2);
      const tx = state.tx + state.swing;
      const step = cs * 0.13;
      for (let k = LAYERS - 1; k >= 0; k--) {
        const front = k === 0;
        for (const c of cells) {
          if (c.a <= 0.01) continue;
          const d = c.depth * k;
          const px = ox + (c.x + c.fx) * cs + tx * d * step;
          const py = oy + (c.y + c.fy) * cs + state.ty * d * step;
          ctx.globalAlpha = c.a;
          ctx.fillStyle = front ? c.color : c.side;
          ctx.fillRect(px, py, cs + 0.6, cs + 0.6);
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };

    size();
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(canvas);

    const ctxG = gsap.context(() => {
      if (reduced) {
        cells.forEach((c) => { c.depth = 1; });
        draw();
        return;
      }
      cells.forEach((c) => {
        c.fx = gsap.utils.random(-14, 14);
        c.fy = gsap.utils.random(-14, 14);
      });
      const tl = gsap.timeline({ delay: 0.35 });
      cells.forEach((c) => {
        tl.to(c, { a: 1, duration: 0.2 }, 0);
      });
      tl.to(cells, { fx: 0, fy: 0, duration: 1.15, ease: 'expo.out', stagger: { amount: 0.9, from: 'random' } }, 0.1);
      tl.to(cells, { depth: 1, duration: 0.9, ease: 'power3.out', stagger: { amount: 0.4, from: 'center', grid: [NY, NX] } }, 1.1);
      // idle swing, like the charm hanging off a chain
      gsap.to(state, { swing: 0.9, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2.2 });
      raf = requestAnimationFrame(loop);
    });

    const toX = gsap.quickTo(state, 'tx', { duration: 0.8, ease: 'power3.out' });
    const toY = gsap.quickTo(state, 'ty', { duration: 0.8, ease: 'power3.out' });
    const onMove = (e) => {
      toX((e.clientX / window.innerWidth - 0.5) * 5);
      toY((e.clientY / window.innerHeight - 0.5) * 3);
    };
    if (!reduced) window.addEventListener('pointermove', onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      ro.disconnect();
      ctxG.revert();
    };
  }, [reduced]);

  return <canvas ref={canvasRef} className="lp-charm" role="img" aria-label="A pixel-art coffee cup keychain charm that tilts as you move the pointer" />;
}
