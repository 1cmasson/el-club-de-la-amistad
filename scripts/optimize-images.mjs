#!/usr/bin/env node
/**
 * Re-encodes the repo's raster images to their shipping form — everything the
 * site serves out of public/assets, plus the reference screenshot at the root.
 *
 * The manifest below is explicit on purpose — a directory sweep would happily
 * flatten the alpha off the seal or resize the 16/32/48 favicons, both of which
 * the README calls out as things not to do. Every entry says exactly what it is
 * and why its settings differ.
 *
 * Idempotent: an entry whose output already hashes to the value recorded in
 * scripts/image-ledger.json is skipped, so re-running never re-encodes an
 * already-lossy file into a lossier one.
 *
 *   npm run images              # encode what has changed
 *   npm run images -- --force   # re-derive outputs from their sources
 *
 * --force re-runs entries whose source still exists. It deliberately will not
 * touch an entry that encodes a file onto itself (the OG cards, the icons),
 * because there the source IS the previous output and redoing it is exactly the
 * generational loss the ledger exists to prevent. To genuinely redo one of
 * those, restore the original first:
 *
 *   git show HEAD:public/assets/og-home.jpg > public/assets/og-home.jpg
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = path.join(ROOT, "scripts/image-ledger.json");

const FORCE = process.argv.includes("--force");

/**
 * `in`  — source filename, relative to `dir`
 * `out` — output filename; when it differs from `in`, the source is deleted
 * `dir` — repo-relative directory, defaulting to public/assets
 * `keepInput` — output is a derivative, leave the source alone
 * `resize` — [w, h]; omit to keep native dimensions
 */
const ASSETS_DIR = "public/assets";
const at = (entry, name) => path.join(ROOT, entry.dir ?? ASSETS_DIR, name);
const MANIFEST = [
  // --- Photos rendered through next/image -----------------------------------
  // Next generates the per-device srcset itself, so these masters stay at native
  // size. Downscaling here would permanently cap quality on 2x/3x screens; the
  // weight problem in these files is the encoding, not the pixel count.
  { in: "volunteers-lineup.jpg", out: "volunteers-lineup.webp", webp: { quality: 80 } },
  { in: "festival-mayor.jpg", out: "festival-mayor.webp", webp: { quality: 80 } },
  { in: "team-lunch.jpg", out: "team-lunch.webp", webp: { quality: 80 } },
  { in: "team-framed-gate.jpg", out: "team-framed-gate.webp", webp: { quality: 80 } },
  { in: "edith-bryan.jpg", out: "edith-bryan.webp", webp: { quality: 80 } },

  // A transparent cutout, and lossless today — so a lossy master would stack a
  // second lossy pass under next/image's own. Hence 90/100, and alpha kept.
  {
    in: "edith-calvo.png",
    out: "edith-calvo.webp",
    webp: { quality: 90, alphaQuality: 100 },
    keepInput: true,
  },
  // /edith needs a plain <img> + canvas source (see PORTRAIT in edith/page.tsx),
  // which never passes through next/image. 480px covers the 148px circle at 3x
  // and the vCard canvas's 320px crop. 480x504 keeps 900x945's exact ratio.
  {
    in: "edith-calvo.png",
    out: "edith-calvo-480.webp",
    resize: [480, 504],
    // Lower than the master on purpose: this file is delivered as-is into a
    // 148px circle, so it takes one lossy pass, not two, and nothing at that
    // size resolves the difference.
    webp: { quality: 78, alphaQuality: 90 },
  },

  // The seal never renders above 168px (hero, Home.module.css). 512 covers 3x.
  {
    in: "seal.png",
    out: "seal.webp",
    resize: [512, 512],
    webp: { quality: 90, alphaQuality: 100 },
  },

  // --- CSS backgrounds ------------------------------------------------------
  // next/image never sees these, so the responsive variants are made by hand.
  // hialeah-gate sits under a 0.52->0.8 dark gradient and tolerates q72.
  { in: "hialeah-gate.jpg", out: "hialeah-gate.webp", webp: { quality: 72 }, keepInput: true },
  { in: "hialeah-gate.jpg", out: "hialeah-gate-480.webp", resize: [480, null], webp: { quality: 72 } },
  // wood-grain is a repeating tile pinned to `background-size: 1024px 750px`.
  // It gets no variants: the same tile serves every viewport, and any dimension
  // change would silently rescale the texture.
  { in: "wood-grain.jpg", out: "wood-grain.webp", webp: { quality: 78 } },

  // --- Open Graph cards -----------------------------------------------------
  // Filenames and .jpg extension are load-bearing: README documents the absolute
  // URLs and scrapers cache them. Recompress in place, never convert.
  { in: "og-home.jpg", out: "og-home.jpg", jpeg: { quality: 80, mozjpeg: true, chromaSubsampling: "4:2:0" } },
  { in: "og-edith.jpg", out: "og-edith.jpg", jpeg: { quality: 80, mozjpeg: true, chromaSubsampling: "4:2:0" } },

  // --- Icons ----------------------------------------------------------------
  // PNG in, PNG out, identical dimensions — browsers and the manifest expect it.
  // favicon-16/32/48 are deliberately absent: README warns they carry a hand-
  // tuned contrast boost, and at 1-7 KB there is nothing to win.
  { in: "favicon-512.png", out: "favicon-512.png", png: true },
  { in: "favicon-maskable-512.png", out: "favicon-maskable-512.png", png: true },
  { in: "favicon-192.png", out: "favicon-192.png", png: true },
  { in: "apple-touch-icon-180.png", out: "apple-touch-icon-180.png", png: true },

  // --- Reference screenshot -------------------------------------------------
  // Not served to anyone — it lives at the repo root, so it costs clone time,
  // not page weight. Kept at its native 1440x3600 because downscaling would
  // blur the UI text it exists to show; q82 leaves that text pixel-legible at
  // 1:1 while dropping three quarters of the bytes.
  { in: "home-desktop.png", out: "home-desktop.webp", dir: ".", webp: { quality: 82, effort: 6 } },
];

const PNG_OPTS = { compressionLevel: 9, effort: 10, palette: true };

const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// Always read the ledger, even under --force: entries this run cannot rebuild
// (their source was consumed by an earlier run) must keep their recorded hash,
// or the next plain run would treat their output as unverified.
async function readLedger() {
  try {
    return JSON.parse(await fs.readFile(LEDGER, "utf8"));
  } catch {
    return {};
  }
}

async function main() {
  const ledger = await readLedger();
  const rows = [];
  let before = 0;
  let after = 0;
  let changed = 0;

  for (const entry of MANIFEST) {
    const src = at(entry, entry.in);
    const dest = at(entry, entry.out);

    // Already optimized on a previous run: the output is present and matches the
    // hash we recorded for it. Skip, so quality never degrades generationally.
    const current = await fs.readFile(dest).catch(() => null);
    const inPlace = entry.in === entry.out;
    if (FORCE && inPlace && current) {
      rows.push([entry.out, "—", kb(current.length), "force: in-place, skipped"]);
      before += current.length;
      after += current.length;
      continue;
    }
    if (!FORCE && current && ledger[entry.out] === sha(current)) {
      rows.push([entry.out, "—", kb(current.length), "skipped"]);
      before += current.length;
      after += current.length;
      continue;
    }

    const input = await fs.readFile(src).catch(() => null);
    if (!input) {
      // The source was consumed by an earlier run and its output is unhashed —
      // nothing to do, but say so rather than failing silently.
      rows.push([entry.out, "—", current ? kb(current.length) : "missing", "no source"]);
      if (current) {
        before += current.length;
        after += current.length;
      }
      continue;
    }

    let pipeline = sharp(input);
    if (entry.resize) {
      pipeline = pipeline.resize(entry.resize[0], entry.resize[1], { fit: "cover" });
    }
    if (entry.webp) pipeline = pipeline.webp(entry.webp);
    else if (entry.jpeg) pipeline = pipeline.jpeg(entry.jpeg);
    else if (entry.png) pipeline = pipeline.png(PNG_OPTS);

    const output = await pipeline.toBuffer();

    // Never ship a "optimized" file that is bigger than what it replaces.
    if (inPlace && output.length >= input.length) {
      rows.push([entry.out, kb(input.length), kb(input.length), "kept original"]);
      ledger[entry.out] = sha(input);
      before += input.length;
      after += input.length;
      continue;
    }

    await fs.writeFile(dest, output);
    ledger[entry.out] = sha(output);

    if (entry.in !== entry.out && !entry.keepInput) {
      await fs.rm(src, { force: true });
    }

    rows.push([entry.out, kb(input.length), kb(output.length), `-${(100 - (output.length / input.length) * 100).toFixed(0)}%`]);
    before += input.length;
    after += output.length;
    changed += 1;
  }

  // Sources kept only to feed a derivative are deleted once every entry that
  // reads them has run.
  for (const entry of MANIFEST.filter((e) => e.keepInput)) {
    const stillNeeded = MANIFEST.some((e) => e.in === entry.in && e.out === entry.in);
    if (!stillNeeded) await fs.rm(at(entry, entry.in), { force: true });
  }

  await fs.writeFile(LEDGER, JSON.stringify(ledger, null, 2) + "\n");

  const w = Math.max(...rows.map((r) => r[0].length));
  console.log(`\n${"file".padEnd(w)}  ${"before".padStart(10)}  ${"after".padStart(10)}  delta`);
  console.log("-".repeat(w + 34));
  for (const [name, b, a, d] of rows) {
    console.log(`${name.padEnd(w)}  ${b.padStart(10)}  ${a.padStart(10)}  ${d}`);
  }
  console.log("-".repeat(w + 34));
  console.log(
    `${"total".padEnd(w)}  ${kb(before).padStart(10)}  ${kb(after).padStart(10)}  ` +
      `-${(100 - (after / before) * 100).toFixed(0)}%`,
  );
  console.log(`\n${changed} changed, ${rows.length - changed} unchanged\n`);
}

await main();
