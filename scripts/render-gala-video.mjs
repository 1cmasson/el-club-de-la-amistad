#!/usr/bin/env node
/*
 * Renders the gala slideshow to a seamlessly looping MP4 — the fail-safe for a
 * venue with no Wi-Fi, or an AV person who needs a file for their own deck.
 *
 * It doesn't screen-record. /gala?render exposes window.__gala.renderAt(t),
 * which draws the exact frame for time t, so every frame is captured
 * deterministically and the last frame flows into the first.
 *
 *   npm run dev                       # or netlify dev, or point --url at the live site
 *   node scripts/render-gala-video.mjs [--url http://localhost:3000/gala] [--out gala-loop.mp4]
 *                                      [--fps 30] [--width 1920] [--height 1080] [--sec 7] [--qr]
 *                                      [--preview 20]
 *
 * --qr keeps the "share your photo" card in the video. It's off by default:
 * a video can't show the photos guests send.
 */
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values: opt } = parseArgs({
  options: {
    url: { type: "string", default: "http://localhost:3000/gala" },
    out: { type: "string", default: "gala-loop.mp4" },
    fps: { type: "string", default: "30" },
    width: { type: "string", default: "1920" },
    height: { type: "string", default: "1080" },
    sec: { type: "string" },
    qr: { type: "boolean", default: false },
    preview: { type: "string" }, // render only the first N seconds, to check a change quickly
  },
});

const fps = Number(opt.fps);
const width = Number(opt.width);
const height = Number(opt.height);
const url = new URL(opt.url);
url.searchParams.set("render", "");
url.searchParams.set("qr", opt.qr ? "1" : "0");
if (opt.sec) url.searchParams.set("sec", opt.sec);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
await page.goto(url.href, { waitUntil: "networkidle" });
// The Next.js dev-mode badge would otherwise end up in every frame.
await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
await page.waitForFunction(() => window.__gala);
const period = await page.evaluate(() => window.__gala.period);
const frames = Math.round((opt.preview ? Math.min(Number(opt.preview), period) : period) * fps);
console.log(`${period}s loop → ${frames} frames at ${fps} fps, ${width}×${height} → ${opt.out}`);

const ffmpeg = spawn(
  "ffmpeg",
  [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", opt.out,
  ],
  { stdio: ["pipe", "inherit", "inherit"] },
);
const done = new Promise((resolve, reject) => {
  ffmpeg.on("error", reject);
  ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
});

const started = Date.now();
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.__gala.renderAt(t), i / fps);
  const jpg = await page.screenshot({ type: "jpeg", quality: 93 });
  if (!ffmpeg.stdin.write(jpg)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
  if (i % (fps * 10) === 0) {
    const pct = ((i / frames) * 100).toFixed(1);
    const eta = i ? Math.round(((Date.now() - started) / i) * (frames - i) / 1000) : "?";
    console.log(`  ${pct}%  (${Math.round(i / fps)}s of ${Math.round(period)}s, ~${eta}s left)`);
  }
}
ffmpeg.stdin.end();
await done;
await browser.close();
console.log(`Wrote ${opt.out} in ${Math.round((Date.now() - started) / 1000)}s`);
