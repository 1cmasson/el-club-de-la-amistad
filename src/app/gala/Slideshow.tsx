"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { DeckPhoto } from "./deck";
import { Ambience } from "./ambience";
import styles from "./Gala.module.css";

/*
 * The gala screen. One rAF loop owns all motion: it computes every visible
 * element's opacity and transform from the clock and writes them straight to
 * the DOM, so React only re-renders when the set of mounted slides changes.
 *
 * Two clocks drive the same frame function:
 *  - live (default): the wall clock, with guest uploads polled in and slotted
 *    in as the very next slide;
 *  - render (?render): no clock at all — window.__gala.renderAt(t) draws the
 *    exact frame for time t, which is how scripts/render-gala-video.mjs
 *    captures a frame-perfect, seamlessly looping MP4.
 *
 * Query params: ?render, ?qr=0|1, ?sec=7 (seconds per photo), ?live=0.
 */

type PhotoSlide = {
  kind: "photo";
  id: string;
  src: string;
  width: number;
  height: number;
  fresh?: boolean;
};
type Slide = { kind: "title"; id: string } | { kind: "end"; id: string } | PhotoSlide;
type Entry = { seq: number; slide: Slide; start: number; end: number; fromDeck: boolean };
// Who sent a photo is never sent to the screen: the club doesn't call guests out.
type Upload = { id: string; src: string; width: number; height: number };

const FADE = 1.6; // seconds of crossfade between slides
const CARD_SEC = 9; // title and closing cards
const FRESH_BONUS = 3; // a just-approved guest photo stays a little longer
const UPLOAD_EVERY = 3; // after the first showing, a guest photo every N deck photos
const POLL_MS = 12_000;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;
const easeIn = (x: number) => x ** 3;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function readConfig() {
  const q = new URLSearchParams(window.location.search);
  const render = q.has("render");
  const sec = Number(q.get("sec"));
  return {
    render,
    showQr: q.has("qr") ? q.get("qr") !== "0" : !render,
    live: !render && q.get("live") !== "0",
    photoSec: Number.isFinite(sec) && sec >= 3 && sec <= 30 ? sec : 7,
  };
}

const durOf = (s: Slide, photoSec: number) =>
  s.kind === "photo" ? photoSec + (s.fresh ? FRESH_BONUS : 0) : CARD_SEC;

/** The deck as a fixed loop: title card, every photo, closing card. */
function buildTimeline(deck: DeckPhoto[], photoSec: number) {
  const base: Slide[] = [
    { kind: "title", id: "title" },
    ...deck.map((p, i): Slide => ({ kind: "photo", id: `deck-${i}`, ...p })),
    { kind: "end", id: "end" },
  ];
  let period = 0;
  const starts = base.map((sl) => {
    const at = period;
    period += durOf(sl, photoSec);
    return at;
  });
  return { base, starts, period };
}

declare global {
  interface Window {
    __gala?: { period: number; renderAt: (t: number) => Promise<void> };
  }
}

export default function Slideshow({ deck, qrSvg, uploadLabel }: { deck: DeckPhoto[]; qrSvg: string; uploadLabel: string }) {
  const [config] = useState(readConfig);
  const [timeline] = useState(() => buildTimeline(deck, config.photoSec));
  const [mounted, setMounted] = useState<Entry[]>([]);
  const [paused, setPaused] = useState(false);
  const [idle, setIdle] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brandRef = useRef<HTMLElement>(null);
  const slotEls = useRef(new Map<number, HTMLDivElement>());
  const imgEls = useRef(new Map<number, HTMLImageElement>());

  // Everything the frame loop mutates lives here, outside React.
  const sched = useRef({
    cur: null as Entry | null,
    next: null as Entry | null,
    cursor: 0,
    seq: 0,
    uploads: [] as Upload[],
    fresh: [] as Upload[],
    uploadCursor: 0,
    sinceUpload: 0,
    cache: new Map<string, string>(), // network src -> blob: URL, so a dropped connection never blanks the screen
    clockOrigin: 0,
    pausedAt: 0 as number | 0,
  });

  /* ---------- the deck, and its fixed timeline for render mode ---------- */

  /* ------------------------------- frame ------------------------------- */

  const ambience = useRef<Ambience | null>(null);

  const applyFrame = useCallback((t: number) => {
    const sc = sched.current;
    let cardShown = 0;
    for (const e of [sc.cur, sc.next]) {
      if (!e) continue;
      const el = slotEls.current.get(e.seq);
      if (!el) continue;
      const enter = easeOut(clamp01((t - (e.start - FADE * 0.6)) / (FADE * 0.6)));
      const exit = easeIn(clamp01((t - (e.end - FADE)) / (FADE * 0.7)));
      const opacity = enter * (1 - exit);
      const y = (1 - enter) * 2.8 - exit * 1.4;
      const scale = 0.965 + 0.035 * enter + 0.018 * exit;
      el.style.opacity = opacity.toFixed(4);
      el.style.transform = `translate3d(0, ${y.toFixed(3)}vh, 0) scale(${scale.toFixed(4)})`;
      el.style.visibility = opacity > 0.001 ? "visible" : "hidden";

      // Slow Ken Burns across the slide's whole life, drifting a different way each time.
      const life = clamp01((t - (e.start - FADE)) / (e.end - e.start + FADE));
      const img = imgEls.current.get(e.seq);
      if (img) {
        const h = hash(e.slide.id);
        const dx = (h & 1 ? 1 : -1) * 2.2;
        const dy = (h & 2 ? 1 : -1) * 1.4;
        const zoomIn = !(h & 4);
        const z = zoomIn ? 1.025 + 0.06 * life : 1.085 - 0.06 * life;
        img.style.transform = `translate3d(${(dx * (life - 0.5)).toFixed(3)}%, ${(dy * (life - 0.5)).toFixed(3)}%, 0) scale(${z.toFixed(4)})`;
      } else if (e.slide.kind !== "photo") {
        const inner = el.firstElementChild as HTMLElement | null;
        if (inner) inner.style.transform = `scale(${(1 + 0.03 * life).toFixed(4)})`;
      }
      if (e.slide.kind !== "photo") cardShown = Math.max(cardShown, opacity);
    }
    // The corner brand would repeat the title card, so it steps aside for it.
    if (brandRef.current) brandRef.current.style.opacity = (1 - cardShown).toFixed(3);
    ambience.current?.draw(((t % timeline.period) + timeline.period) % timeline.period, timeline.period);
  }, [timeline]);

  /* ------------------------------ ambience ----------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = new Ambience(canvas);
    ambience.current = a;
    a.resize();
    const onResize = () => a.resize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* ---------------------------- render mode ---------------------------- */

  useEffect(() => {
    if (!config.render) return;
    const sc = sched.current;
    const entryAt = (i: number, offset: number): Entry => {
      const n = timeline.base.length;
      const k = ((i % n) + n) % n;
      const slide = timeline.base[k];
      const start = timeline.starts[k] + offset;
      return { seq: i, slide, start, end: start + durOf(slide, config.photoSec), fromDeck: true };
    };

    window.__gala = {
      period: timeline.period,
      renderAt: async (t: number) => {
        const tm = ((t % timeline.period) + timeline.period) % timeline.period;
        let i = timeline.starts.length - 1;
        while (timeline.starts[i] > tm) i--;
        const cur = entryAt(i, 0);
        const next = i + 1 < timeline.base.length ? entryAt(i + 1, 0) : entryAt(timeline.base.length, timeline.period);
        if (sc.cur?.seq !== cur.seq || sc.next?.seq !== next.seq) {
          sc.cur = cur;
          sc.next = next;
          flushSync(() => setMounted([cur, next]));
        }
        await Promise.all(
          [...imgEls.current.values()].map((img) => (img.complete ? null : img.decode().catch(() => null))),
        );
        await document.fonts.ready;
        applyFrame(tm);
      },
    };
    return () => {
      delete window.__gala;
    };
  }, [config, timeline, applyFrame]);

  /* ----------------------------- live mode ----------------------------- */

  const resolve = useCallback((src: string) => sched.current.cache.get(src) ?? src, []);

  const nextSlide = useCallback((): { slide: Slide; fromDeck: boolean } => {
    const sc = sched.current;
    const fresh = sc.fresh.shift();
    if (fresh) {
      return {
        slide: { kind: "photo", ...fresh, id: `up-${fresh.id}`, src: resolve(fresh.src), fresh: true },
        fromDeck: false,
      };
    }
    const upNext = timeline.base[sc.cursor % timeline.base.length];
    if (sc.uploads.length && sc.sinceUpload >= UPLOAD_EVERY && upNext.kind === "photo") {
      const u = sc.uploads[sc.uploadCursor++ % sc.uploads.length];
      sc.sinceUpload = 0;
      return { slide: { kind: "photo", ...u, id: `up-${u.id}`, src: resolve(u.src) }, fromDeck: false };
    }
    sc.cursor++;
    if (upNext.kind === "photo") sc.sinceUpload++;
    return { slide: upNext.kind === "photo" ? { ...upNext, src: resolve(upNext.src) } : upNext, fromDeck: true };
  }, [resolve, timeline]);

  const makeEntry = useCallback(
    (start: number): Entry => {
      const { slide, fromDeck } = nextSlide();
      return { seq: ++sched.current.seq, slide, start, end: start + durOf(slide, config.photoSec), fromDeck };
    },
    [nextSlide, config.photoSec],
  );

  const now = useCallback(() => {
    const sc = sched.current;
    const ms = (sc.pausedAt || performance.now()) - sc.clockOrigin;
    return ms / 1000;
  }, []);

  useEffect(() => {
    if (config.render) return;
    const sc = sched.current;
    sc.clockOrigin = performance.now();
    sc.cur = makeEntry(0);
    sc.next = makeEntry(sc.cur.end);
    setMounted([sc.cur, sc.next]);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = now();
      const { cur, next } = sc;
      if (!cur || !next) return;

      // Never fade into a picture that hasn't arrived: hold the current one.
      // A guest photo that was pulled from the screen (404) is swapped out.
      if (t >= next.start - FADE) {
        const img = imgEls.current.get(next.seq);
        const broken = img?.complete && img.naturalWidth === 0;
        if (broken) {
          if (next.fromDeck) sc.cursor--;
          sc.next = makeEntry(Math.max(next.start, t + FADE));
          cur.end = sc.next.start;
          setMounted([cur, sc.next]);
        } else if (img && !img.complete) {
          cur.end = next.start = t + FADE;
          next.end = next.start + durOf(next.slide, config.photoSec);
        }
      }

      if (t >= next.start && t >= cur.end) {
        sc.cur = next;
        sc.next = makeEntry(next.end);
        setMounted([sc.cur, sc.next]);
      }
      applyFrame(t);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [config, makeEntry, now, applyFrame]);

  // Pull every deck photo into memory up front, so a venue Wi-Fi drop mid-show
  // can't leave an empty frame. Slides created after this use the blob URLs.
  useEffect(() => {
    if (config.render) return;
    const sc = sched.current;
    let cancelled = false;
    (async () => {
      for (const p of deck) {
        if (cancelled) return;
        try {
          const blob = await (await fetch(p.src)).blob();
          sc.cache.set(p.src, URL.createObjectURL(blob));
        } catch {
          /* fall back to the network URL */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.render, deck]);

  // Guest photos: approved ones arrive here, and a new one becomes the next slide.
  useEffect(() => {
    if (!config.live) return;
    const sc = sched.current;
    let first = true;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/gala/photos", { cache: "no-store" });
        if (!res.ok) return;
        const { photos } = (await res.json()) as { photos: Upload[] };
        const live = new Set(photos.map((p) => p.id));
        sc.uploads = sc.uploads.filter((u) => live.has(u.id));
        sc.fresh = sc.fresh.filter((u) => live.has(u.id));
        const known = new Set(sc.uploads.map((u) => u.id));
        for (const p of photos) {
          if (known.has(p.id) || stopped) continue;
          try {
            const blob = await (await fetch(p.src)).blob();
            sc.cache.set(p.src, URL.createObjectURL(blob));
          } catch {
            continue;
          }
          sc.uploads.push(p);
          // Photos already approved when the page loads just join the rotation;
          // only ones approved while we're on screen get the "new photo" entrance.
          if (!first) sc.fresh.push(p);
        }

        // Jump the queue: if the upcoming slide hasn't started fading in, swap
        // it for the new guest photo so it appears within seconds.
        const { cur, next } = sc;
        if (sc.fresh.length && cur && next && !(next.slide.kind === "photo" && next.slide.fresh) && now() < next.start - FADE - 0.3) {
          if (next.fromDeck) sc.cursor--;
          sc.next = makeEntry(next.start);
          setMounted([cur, sc.next]);
        }
      } catch {
        /* offline — keep showing what we have */
      } finally {
        first = false;
      }
    };

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [config.live, makeEntry, now]);

  /* ----------------------------- operating ----------------------------- */

  useEffect(() => {
    if (config.render) return;
    const sc = sched.current;

    const togglePause = () => {
      if (sc.pausedAt) {
        sc.clockOrigin += performance.now() - sc.pausedAt;
        sc.pausedAt = 0;
        setPaused(false);
      } else {
        sc.pausedAt = performance.now();
        setPaused(true);
      }
    };
    const skip = () => {
      const { cur, next } = sc;
      const t = now();
      if (!cur || !next || t >= next.start - FADE) return;
      cur.end = next.start = t + FADE;
      next.end = next.start + durOf(next.slide, config.photoSec);
    };
    const fullscreen = () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        togglePause();
      } else if (e.key === "ArrowRight") skip();
      else if (e.key === "f" || e.key === "F") fullscreen();
    };

    let idleTimer = 0;
    const onMove = () => {
      setIdle(false);
      clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setIdle(true), 2500);
    };

    // Keep a laptop on the projector from dimming or sleeping mid-show.
    let lock: WakeLockSentinel | null = null;
    const wake = async () => {
      try {
        if (document.visibilityState === "visible") lock = await navigator.wakeLock?.request("screen");
      } catch {
        /* not supported or not allowed — harmless */
      }
    };
    wake();

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("dblclick", fullscreen);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("dblclick", fullscreen);
      document.removeEventListener("visibilitychange", wake);
      clearTimeout(idleTimer);
      lock?.release().catch(() => {});
    };
  }, [config, now]);

  /* ------------------------------- markup ------------------------------ */

  const slotRef = (seq: number) => (el: HTMLDivElement | null) => {
    if (el) slotEls.current.set(seq, el);
    else slotEls.current.delete(seq);
  };
  const imgRef = (seq: number) => (el: HTMLImageElement | null) => {
    if (el) imgEls.current.set(seq, el);
    else imgEls.current.delete(seq);
  };

  return (
    <div className={styles.stage} data-idle={idle || config.render} data-qr={config.showQr}>
      <div className={styles.wood} aria-hidden />
      <canvas ref={canvasRef} className={styles.ambience} aria-hidden />
      <div className={styles.vignette} aria-hidden />

      <header ref={brandRef} className={styles.brand}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a fixed kiosk asset */}
        <img src="/assets/seal.webp" alt="" />
        <div>
          <p className={styles.brandName}>Club de la Amistad</p>
          <p className={styles.brandSub}>por un Hialeah Mejor</p>
        </div>
      </header>

      <main className={styles.slides}>
        {mounted.map((e) => (
          <div key={e.seq} ref={slotRef(e.seq)} className={styles.slot} style={{ opacity: 0, visibility: "hidden" }}>
            <SlideBody slide={e.slide} imgRef={imgRef(e.seq)} />
          </div>
        ))}
      </main>

      {config.showQr && (
        <aside className={styles.qr}>
          <p className={styles.qrTitle}>
            Comparte
            <br />
            tu foto
          </p>
          <div className={styles.qrCode} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className={styles.qrHint}>
            Escanea y aparece
            <br />
            en la pantalla
          </p>
          <p className={styles.qrUrl}>{uploadLabel}</p>
        </aside>
      )}

      {paused && <p className={styles.paused}>En pausa</p>}
      {!config.render && (
        <p className={styles.hint}>
          <kbd>F</kbd> pantalla completa · <kbd>Espacio</kbd> pausa · <kbd>→</kbd> siguiente
        </p>
      )}
    </div>
  );
}

function SlideBody({ slide, imgRef }: { slide: Slide; imgRef: (el: HTMLImageElement | null) => void }) {
  if (slide.kind === "title") {
    return (
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cardSeal} src="/assets/seal.webp" alt="" />
        <h1 className={styles.cardTitle}>
          Club de la Amistad
          <span>por un Hialeah Mejor</span>
        </h1>
        <div className={styles.rule} aria-hidden>
          <i />
          <b />
          <i />
        </div>
        <p className={styles.cardLine}>Un Hialeah mejor, cuadra por cuadra</p>
      </div>
    );
  }
  if (slide.kind === "end") {
    return (
      <div className={styles.card}>
        <h2 className={styles.cardThanks}>¡Gracias!</h2>
        <p className={styles.cardLine}>por acompañarnos esta noche</p>
        <div className={styles.rule} aria-hidden>
          <i />
          <b />
          <i />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.cardSealSmall} src="/assets/seal.webp" alt="" />
        <p className={styles.cardUrl}>porunhialeahmejor.com</p>
      </div>
    );
  }

  const ar = slide.width && slide.height ? slide.width / slide.height : 4 / 3;
  const tilt = ((hash(slide.id) % 1000) / 1000 - 0.5) * 1.6;
  return (
    <figure
      className={styles.frame}
      data-fresh={slide.fresh || undefined}
      style={{ "--ar": ar, transform: `rotate(${tilt.toFixed(2)}deg)` } as React.CSSProperties}
    >
      <div className={styles.window}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URLs and exact sizing; next/image adds nothing here */}
        <img ref={imgRef} src={slide.src} alt="" decoding="async" draggable={false} />
      </div>
      {slide.fresh && (
        <figcaption className={styles.fresh}>
          <span className={styles.freshTag}>✦ Nueva foto</span>
        </figcaption>
      )}
    </figure>
  );
}
