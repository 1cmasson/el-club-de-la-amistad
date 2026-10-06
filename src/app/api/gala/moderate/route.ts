import type { NextRequest } from "next/server";
import { getPhoto, isPhotoId, updatePhoto } from "@/lib/gala/store";
import { isReviewKey, refreshCards, verify, type ModerationAction } from "@/lib/gala/telegram";
import { siteOrigin } from "@/lib/gala/origin";

/*
 * The target of the Approve / Reject buttons under each Telegram photo. The
 * link is HMAC-signed per photo and action, so it can't be forged or reused
 * for another photo. A GET that changes state is deliberate: a Telegram URL
 * button can only open a link, and approving twice is harmless.
 */

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center;
    background: #241509; color: #f6efe1; font: 18px/1.5 system-ui, sans-serif;
    text-align: center; padding: 24px; box-sizing: border-box; }
  h1 { font-family: Georgia, serif; color: #f7e7bd; font-size: 30px; margin: 0 0 8px; }
  p { margin: 0; color: rgba(246,239,225,.75); }
</style></head>
<body><main><h1>${title}</h1><p>${body}</p></main></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const id = q.get("id") ?? "";
  const action = q.get("a") as ModerationAction;
  const sig = q.get("s") ?? "";

  if (!isPhotoId(id) || (action !== "approve" && action !== "reject") || !verify(id, action, sig)) {
    return page("Enlace no válido", "Este enlace no es correcto o ha caducado.", 403);
  }

  const photo = await getPhoto(id);
  if (!photo) return page("No encontrada", "Esa foto ya no existe.", 404);

  const next = action === "approve" ? "approved" : "rejected";
  if (photo.status !== next) {
    photo.status = next;
    photo.approvedAt = next === "approved" ? Date.now() : undefined;
    await updatePhoto(photo);
    await refreshCards(photo, siteOrigin(request));
  }

  // Taps from the backup review page go back to it.
  const back = q.get("r");
  if (isReviewKey(back)) {
    return new Response(null, { status: 303, headers: { Location: `/api/gala/review?k=${back}` } });
  }

  return next === "approved"
    ? page("✅ Aprobada", "La foto aparecerá en la pantalla en unos segundos. Ya puedes cerrar esta ventana.")
    : page("❌ Rechazada", "Esta foto no se mostrará en la pantalla. Ya puedes cerrar esta ventana.");
}
