// Embers rising across the main menu: the picture of the throne room is still, and this is what moves in front of
// it. Small squares, as everything in the game is made of; none at all for a player who has asked for less motion.
// They are drawn at half the page's size and thirty times a second, which a square that drifts cannot be told from
// the whole of it, and costs a slow phone an eighth as much.
import { useEffect, useRef } from "react";

interface Ember { x: number; y: number; vx: number; vy: number; size: number; life: number; span: number; hot: number }

export function Embers() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current, ctx = el?.getContext("2d");
    if (!el || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const embers: Ember[] = [];
    // Born along the foot of the picture, most of them near the two braziers at its sides.
    const born = (anywhere = false): Ember => {
      const side = Math.random() < 0.7 ? (Math.random() < 0.5 ? 0.08 : 0.92) + (Math.random() - 0.5) * 0.1 : Math.random();
      return { x: side * el.width, y: anywhere ? Math.random() * el.height : el.height * (0.72 + Math.random() * 0.2), vx: (Math.random() - 0.5) * 7, vy: -(9 + Math.random() * 23), size: 2 + Math.floor(Math.random() * 2), life: 0, span: 4 + Math.random() * 5, hot: Math.random() };
    };
    let frame = 0, last = performance.now(), skip = false;
    const fit = () => { el.width = Math.ceil(el.clientWidth / 2); el.height = Math.ceil(el.clientHeight / 2); };
    fit();
    for (let i = 0; i < 64; i++) embers.push({ ...born(true), life: Math.random() * 4 });
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if ((skip = !skip)) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (el.width !== Math.ceil(el.clientWidth / 2) || el.height !== Math.ceil(el.clientHeight / 2)) fit();
      ctx.clearRect(0, 0, el.width, el.height);
      embers.forEach((ember, i) => {
        ember.life += dt;
        // It drifts on a slow wind that swings from side to side, and goes out as it climbs.
        ember.x += (ember.vx + Math.sin(now / 1700 + ember.hot * 9) * 8) * dt; ember.y += ember.vy * dt;
        const left = 1 - ember.life / ember.span;
        if (left <= 0 || ember.y < -10) { embers[i] = born(); return; }
        ctx.fillStyle = `rgba(255,${Math.round(120 + ember.hot * 110)},${Math.round(40 + ember.hot * 50)},${Math.min(1, left * 1.6)})`;
        ctx.fillRect(Math.round(ember.x), Math.round(ember.y), ember.size, ember.size);
      });
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]" />;
}
