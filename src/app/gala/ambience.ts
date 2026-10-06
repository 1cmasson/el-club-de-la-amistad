/*
 * The candlelit background behind the gala slideshow: a few large warm glows
 * that drift and flicker, soft out-of-focus bokeh, and gold dust rising. It is
 * drawn on a canvas that screen-blends over the site's wood grain.
 *
 * Everything is a pure function of time and is periodic in `period` (the
 * length of one pass through the reel), so the exported MP4 loops seamlessly:
 * the frame at t = period is the frame at t = 0. Every motion below is a whole
 * number of cycles per period for that reason.
 */

type Glow = { x: number; y: number; ax: number; ay: number; kx: number; ky: number; px: number; py: number; r: number; a: number };
type Mote = { x: number; y0: number; r: number; laps: number; sway: number; swayK: number; phase: number; a: number; twK: number; twPhase: number };

const TAU = Math.PI * 2;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sprite(rgb: string, stops: [number, number][]) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, alpha] of stops) grad.addColorStop(at, `rgba(${rgb},${alpha})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return c;
}

export class Ambience {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private glows: Glow[] = [];
  private bokeh: Glow[] = [];
  private motes: Mote[] = [];
  private glowSprite = sprite("236,170,84", [[0, 1], [0.35, 0.55], [1, 0]]);
  private bokehSprite = sprite("255,214,140", [[0, 0.85], [0.68, 0.7], [0.84, 0.32], [1, 0]]);
  private moteSprite = sprite("255,226,160", [[0, 1], [0.2, 0.8], [0.5, 0.18], [1, 0]]);

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    const rand = mulberry32(1934);
    const pick = (lo: number, hi: number) => lo + rand() * (hi - lo);
    const pickInt = (lo: number, hi: number) => Math.floor(pick(lo, hi + 1));

    this.glows = [
      { x: 0.2, y: 0.78, r: 0.75, a: 0.2 },
      { x: 0.82, y: 0.2, r: 0.62, a: 0.15 },
      { x: 0.55, y: 0.55, r: 0.95, a: 0.09 },
    ].map((g) => ({
      ...g,
      ax: pick(0.04, 0.08),
      ay: pick(0.03, 0.06),
      kx: pickInt(1, 2),
      ky: pickInt(1, 2),
      px: rand() * TAU,
      py: rand() * TAU,
    }));

    this.bokeh = Array.from({ length: 13 }, () => ({
      x: rand(),
      y: rand(),
      ax: pick(0.02, 0.07),
      ay: pick(0.02, 0.06),
      kx: pickInt(1, 3),
      ky: pickInt(1, 3),
      px: rand() * TAU,
      py: rand() * TAU,
      r: pick(0.025, 0.075),
      a: pick(0.04, 0.1),
    }));

    this.motes = Array.from({ length: 70 }, () => ({
      x: rand(),
      y0: rand(),
      r: pick(0.0016, 0.0042),
      laps: pickInt(4, 9),
      sway: pick(0.006, 0.026),
      swayK: pickInt(5, 14),
      phase: rand() * TAU,
      a: pick(0.35, 0.95),
      twK: pickInt(20, 60),
      twPhase: rand() * TAU,
    }));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.round(this.canvas.clientWidth * dpr);
    this.h = Math.round(this.canvas.clientHeight * dpr);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }

  draw(t: number, period: number) {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    const f = (k: number) => (TAU * k * t) / period; // k whole cycles per period

    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    // Candle flicker: a slow breath with two faint faster tremors on top.
    const flicker = 1 + 0.07 * Math.sin(f(23)) + 0.04 * Math.sin(f(71) + 1.3) + 0.025 * Math.sin(f(149) + 0.4);

    for (const g of this.glows) {
      const r = g.r * h;
      const x = (g.x + g.ax * Math.sin(f(g.kx) + g.px)) * w;
      const y = (g.y + g.ay * Math.sin(f(g.ky) + g.py)) * h;
      ctx.globalAlpha = g.a * flicker;
      ctx.drawImage(this.glowSprite, x - r, y - r, r * 2, r * 2);
    }

    for (const b of this.bokeh) {
      const r = b.r * h;
      const x = (b.x + b.ax * Math.sin(f(b.kx) + b.px)) * w;
      const y = (b.y + b.ay * Math.sin(f(b.ky) + b.py)) * h;
      ctx.globalAlpha = b.a * (0.75 + 0.25 * Math.sin(f(b.kx + b.ky + 3) + b.py));
      ctx.drawImage(this.bokehSprite, x - r, y - r, r * 2, r * 2);
    }

    for (const m of this.motes) {
      const rise = (((m.y0 + (m.laps * t) / period) % 1) + 1) % 1;
      const y = (1.08 - rise * 1.16) * h;
      const x = (m.x + m.sway * Math.sin(f(m.swayK) + m.phase)) * w;
      const edge = Math.min(1, rise / 0.12, (1 - rise) / 0.18);
      const twinkle = 0.6 + 0.4 * Math.sin(f(m.twK) + m.twPhase);
      const r = m.r * h * 3;
      ctx.globalAlpha = Math.max(0, m.a * edge * twinkle);
      ctx.drawImage(this.moteSprite, x - r, y - r, r * 2, r * 2);
    }

    ctx.globalAlpha = 1;
  }
}
