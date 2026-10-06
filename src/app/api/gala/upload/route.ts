import { newPhotoId, savePhoto, updatePhoto, type GuestPhoto } from "@/lib/gala/store";
import { announce } from "@/lib/gala/telegram";
import { siteOrigin } from "@/lib/gala/origin";

// Netlify caps a function's request body at 6 MB. The upload page re-encodes
// photos to ~2000px JPEG first, which lands well under this.
const MAX_BYTES = 5 * 1024 * 1024;

const TYPES: Record<string, (b: Uint8Array) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/webp": (b) =>
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};

const clampDim = (v: FormDataEntryValue | null) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n <= 10000 ? n : 0;
};

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "bad-form" }, { status: 400 });
  }

  const file = form.get("photo");
  if (!(file instanceof File)) {
    return Response.json({ ok: false, error: "no-photo" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return Response.json({ ok: false, error: "too-big" }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const head = new Uint8Array(bytes.slice(0, 12));
  const contentType = Object.keys(TYPES).find((t) => TYPES[t](head));
  if (!contentType) {
    return Response.json({ ok: false, error: "not-an-image" }, { status: 415 });
  }

  const name = String(form.get("name") ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  const autoApprove = process.env.GALA_AUTO_APPROVE === "1";
  const now = Date.now();
  const photo: GuestPhoto = {
    id: newPhotoId(),
    status: autoApprove ? "approved" : "pending",
    name,
    width: clampDim(form.get("width")),
    height: clampDim(form.get("height")),
    contentType,
    createdAt: now,
    approvedAt: autoApprove ? now : undefined,
    telegram: [],
  };

  await savePhoto(photo, bytes);

  // Telegram trouble must not fail the guest's upload — the photo is saved and
  // can still be approved once the bot is reachable again.
  try {
    photo.telegram = await announce(photo, bytes, siteOrigin(request));
    if (photo.telegram.length) await updatePhoto(photo);
  } catch (err) {
    console.error("Gala announce failed", err);
  }

  return Response.json({ ok: true, id: photo.id, status: photo.status });
}
