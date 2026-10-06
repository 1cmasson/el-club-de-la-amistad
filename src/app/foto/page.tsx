"use client";

import { useState } from "react";
import styles from "./Foto.module.css";

/*
 * The page behind the QR code on the gala screen. A guest picks photos, we
 * shrink each one on the phone (a full-size phone photo is bigger than a
 * Netlify function will accept, and would take ages on venue Wi-Fi), and post
 * them one at a time. Nothing appears on screen until a moderator approves it
 * in Telegram.
 */

const MAX_EDGE = 2000;
const MAX_PHOTOS = 10;

type Picked = { file: File; preview: string };
type Phase = { kind: "pick" } | { kind: "sending"; done: number; total: number } | { kind: "sent"; count: number } | { kind: "error"; message: string };

// createImageBitmap's imageOrientation isn't honored everywhere (older iOS
// Safari), so fall back to an <img>, which applies EXIF orientation itself.
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch (err) {
      URL.revokeObjectURL(url);
      throw err;
    }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await decode(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img.source, 0, 0, width, height);
  img.done();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.86));
  if (!blob) throw new Error("encode");
  return { blob, width, height };
}

export default function FotoPage() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });

  const onPick = (files: FileList | null) => {
    if (!files?.length) return;
    const add = Array.from(files)
      .filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setPicked((prev) => [...prev, ...add].slice(0, MAX_PHOTOS));
    setPhase({ kind: "pick" });
  };

  const remove = (i: number) => {
    URL.revokeObjectURL(picked[i].preview);
    setPicked((prev) => prev.filter((_, j) => j !== i));
  };

  const send = async () => {
    const total = picked.length;
    let done = 0;
    setPhase({ kind: "sending", done, total });
    try {
      for (const p of picked) {
        let shrunk;
        try {
          shrunk = await shrink(p.file);
        } catch {
          throw new Error("Una de las fotos tiene un formato que este teléfono no puede preparar. Prueba con otra.");
        }
        const form = new FormData();
        form.append("photo", shrunk.blob, "foto.jpg");
        form.append("width", String(shrunk.width));
        form.append("height", String(shrunk.height));
        form.append("name", name);
        const res = await fetch("/api/gala/upload", { method: "POST", body: form });
        if (!res.ok) throw new Error("No pudimos enviar la foto. Revisa tu conexión e inténtalo otra vez.");
        done++;
        setPhase({ kind: "sending", done, total });
      }
      picked.forEach((p) => URL.revokeObjectURL(p.preview));
      setPicked([]);
      setPhase({ kind: "sent", count: total });
    } catch (err) {
      setPicked((prev) => prev.slice(done));
      setPhase({ kind: "error", message: err instanceof Error ? err.message : "Algo salió mal." });
    }
  };

  const sending = phase.kind === "sending";

  return (
    <div className={`woodstage ${styles.page}`}>
      <main className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.seal} src="/assets/seal.webp" alt="Club de la Amistad por un Hialeah Mejor" />

        {phase.kind === "sent" ? (
          <section className={styles.thanks} aria-live="polite">
            <h1 className={styles.title}>¡Gracias!</h1>
            <p className={styles.lede}>
              {phase.count === 1
                ? "Recibimos tu foto. En cuanto la aprobemos, aparecerá en la pantalla."
                : `Recibimos tus ${phase.count} fotos. En cuanto las aprobemos, aparecerán en la pantalla.`}
            </p>
            <p className={styles.en}>Thank you! Your photo will appear on the screen once it&rsquo;s approved.</p>
            <button type="button" className={styles.secondary} onClick={() => setPhase({ kind: "pick" })}>
              Enviar otra foto
            </button>
          </section>
        ) : (
          <>
            <h1 className={styles.title}>Comparte tu foto</h1>
            <p className={styles.lede}>Tu foto puede salir en la pantalla de la Gala.</p>
            <p className={styles.en}>Share your photo — it may appear on the big screen tonight.</p>

            <input
              className="srOnly"
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                onPick(e.target.files);
                e.target.value = "";
              }}
            />

            {picked.length === 0 ? (
              <label htmlFor="photos" className={styles.pick}>
                <span className={styles.pickIcon} aria-hidden>
                  ＋
                </span>
                <span className={styles.pickLabel}>Elegir fotos</span>
                <span className={styles.pickSub}>Choose photos · hasta {MAX_PHOTOS}</span>
              </label>
            ) : (
              <ul className={styles.grid}>
                {picked.map((p, i) => (
                  <li key={p.preview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt="" />
                    {!sending && (
                      <button type="button" aria-label="Quitar esta foto" onClick={() => remove(i)}>
                        ×
                      </button>
                    )}
                  </li>
                ))}
                {picked.length < MAX_PHOTOS && !sending && (
                  <li>
                    <label htmlFor="photos" className={styles.addMore} aria-label="Añadir más fotos">
                      ＋
                    </label>
                  </li>
                )}
              </ul>
            )}

            <label className={styles.field}>
              <span>
                Tu nombre <em>(opcional)</em>
              </span>
              <small>Solo lo ven los organizadores — no sale en la pantalla.</small>
              <input
                type="text"
                value={name}
                maxLength={40}
                autoComplete="name"
                placeholder="Tu nombre · Your name"
                onChange={(e) => setName(e.target.value)}
                disabled={sending}
              />
            </label>

            <button type="button" className={styles.send} disabled={picked.length === 0 || sending} onClick={send}>
              {sending
                ? `Enviando ${Math.min(phase.done + 1, phase.total)} de ${phase.total}…`
                : picked.length > 1
                  ? `Enviar ${picked.length} fotos`
                  : "Enviar foto"}
            </button>

            {phase.kind === "error" && (
              <p className={styles.error} role="alert">
                {phase.message}
              </p>
            )}

            <p className={styles.note}>Las fotos se revisan antes de salir en pantalla.</p>
          </>
        )}
      </main>
    </div>
  );
}
