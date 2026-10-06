import { listApproved } from "@/lib/gala/store";

/**
 * What the projector polls: approved guest photos, oldest approval first.
 * Deliberately without the sender's name — that is for the moderators in
 * Telegram only, never the screen or this public endpoint.
 */
export async function GET() {
  const photos = await listApproved();
  return Response.json(
    {
      photos: photos.map((p) => ({
        id: p.id,
        src: `/api/gala/photo/${p.id}`,
        width: p.width,
        height: p.height,
        approvedAt: p.approvedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
