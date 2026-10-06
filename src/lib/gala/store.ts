import { getStore } from "@netlify/blobs";

/*
 * Guest photos for the gala screen live in a Netlify Blobs store, so the site
 * stays database-free. Each upload is two keys:
 *
 *   img/<id>   the JPEG bytes the guest's phone produced
 *   meta/<id>  a GuestPhoto record — the moderation state lives here
 *
 * Reads are strongly consistent: an approval tapped in Telegram should reach
 * the projector on its next poll, not up to a minute later.
 */

export type PhotoStatus = "pending" | "approved" | "rejected";

export type TelegramMessageRef = { chatId: string; messageId: number };

export type GuestPhoto = {
  id: string;
  status: PhotoStatus;
  name: string;
  width: number;
  height: number;
  contentType: string;
  createdAt: number;
  approvedAt?: number;
  telegram: TelegramMessageRef[];
};

const store = () => getStore({ name: "gala-photos", consistency: "strong" });

export function newPhotoId() {
  // Sortable by upload time, unguessable enough that ids can't be enumerated.
  const rand = crypto.getRandomValues(new Uint8Array(6));
  const tail = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${Date.now().toString(36)}-${tail}`;
}

export const isPhotoId = (id: string) => /^[a-z0-9]{6,12}-[0-9a-f]{12}$/.test(id);

export async function savePhoto(photo: GuestPhoto, bytes: ArrayBuffer) {
  const s = store();
  await s.set(`img/${photo.id}`, bytes, {
    metadata: { contentType: photo.contentType },
  });
  await s.setJSON(`meta/${photo.id}`, photo);
}

export async function getPhoto(id: string) {
  return (await store().get(`meta/${id}`, { type: "json" })) as GuestPhoto | null;
}

export async function updatePhoto(photo: GuestPhoto) {
  await store().setJSON(`meta/${photo.id}`, photo);
}

export async function getPhotoBytes(id: string) {
  const res = await store().getWithMetadata(`img/${id}`, { type: "arrayBuffer" });
  if (!res) return null;
  const contentType =
    typeof res.metadata.contentType === "string" ? res.metadata.contentType : "image/jpeg";
  return { bytes: res.data, contentType };
}

export async function listAll() {
  const s = store();
  const { blobs } = await s.list({ prefix: "meta/" });
  const photos = await Promise.all(
    blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<GuestPhoto | null>),
  );
  return photos.filter((p): p is GuestPhoto => p !== null);
}

export async function listApproved() {
  return (await listAll())
    .filter((p) => p.status === "approved")
    .sort((a, b) => (a.approvedAt ?? 0) - (b.approvedAt ?? 0));
}
