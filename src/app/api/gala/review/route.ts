import type { NextRequest } from "next/server";
import { listAll, type GuestPhoto } from "@/lib/gala/store";
import { isReviewKey, moderateUrl } from "@/lib/gala/telegram";
import { siteOrigin } from "@/lib/gala/origin";

/*
 * Backup moderation, for when Telegram can't be: a moderator who never sent
 * /start to the bot, a message lost to rate limits, or the bot being down.
 * Every guest photo, newest first, with the same signed approve/reject links
 * the Telegram buttons use. The page is reachable only with the review key,
 * which is derived from GALA_SECRET.
 */

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const LABEL: Record<GuestPhoto["status"], string> = {
  pending: "Pendiente",
  approved: "En pantalla",
  rejected: "Rechazada",
};

export async function GET(request: NextRequest) {
  const k = request.nextUrl.searchParams.get("k");
  if (!isReviewKey(k)) return new Response("Not found", { status: 404 });

  const origin = siteOrigin(request);
  const photos = (await listAll()).sort((a, b) => b.createdAt - a.createdAt);
  const pending = photos.filter((p) => p.status === "pending").length;

  const rows = photos
    .map((p) => {
      const link = (a: "approve" | "reject") => `${moderateUrl(origin, p.id, a)}&r=${k}`;
      const actions =
        p.status === "approved"
          ? `<a class="no" href="${link("reject")}">Quitar</a>`
          : p.status === "rejected"
            ? `<a class="ok" href="${link("approve")}">Aprobar</a>`
            : `<a class="ok" href="${link("approve")}">Aprobar</a><a class="no" href="${link("reject")}">Rechazar</a>`;
      const when = new Date(p.createdAt).toLocaleTimeString("es-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
      });
      return `<li class="${p.status}">
  <img src="/api/gala/photo/${p.id}?k=${k}" alt="" loading="lazy">
  <div><b>${LABEL[p.status]}</b><span>${esc(p.name || "Sin nombre")}${p.name ? (p.showName ? " · nombre en pantalla" : " · sin nombre en pantalla") : ""} · ${when}</span></div>
  <nav>${actions}</nav>
</li>`;
    })
    .join("\n");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="20">
<title>Fotos de la Gala (${pending})</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #241509; color: #f6efe1; font: 16px/1.4 system-ui, sans-serif; }
  header { position: sticky; top: 0; padding: 14px 16px; background: #1c1108; border-bottom: 1px solid rgba(212,160,42,.35); }
  h1 { margin: 0; font: 700 20px Georgia, serif; color: #f7e7bd; }
  header p { margin: 2px 0 0; font-size: 14px; color: rgba(246,239,225,.6); }
  ul { list-style: none; margin: 0; padding: 12px 16px 40px; display: grid; gap: 12px; }
  li { display: grid; grid-template-columns: 96px 1fr; gap: 6px 12px; align-items: center;
    padding: 10px; border-radius: 12px; background: rgba(0,0,0,.25); border: 1px solid rgba(212,160,42,.2); }
  li.pending { border-color: #d4a02a; }
  li.rejected { opacity: .55; }
  img { width: 96px; height: 96px; object-fit: cover; border-radius: 8px; grid-row: span 2; background: #1c1108; }
  li div { display: flex; flex-direction: column; }
  li div span { font-size: 14px; color: rgba(246,239,225,.65); }
  nav { display: flex; gap: 8px; }
  nav a { flex: 1; text-align: center; padding: 10px; border-radius: 10px; font-weight: 700; text-decoration: none; }
  a.ok { background: #d4a02a; color: #241509; }
  a.no { border: 1px solid rgba(220,110,80,.6); color: #f5c4b4; }
  .empty { padding: 40px 16px; text-align: center; color: rgba(246,239,225,.6); }
</style></head><body>
<header><h1>Fotos de la Gala</h1><p>${pending} pendiente${pending === 1 ? "" : "s"} · ${photos.length} en total · se actualiza sola</p></header>
${photos.length ? `<ul>${rows}</ul>` : `<p class="empty">Todavía no han llegado fotos.</p>`}
</body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
