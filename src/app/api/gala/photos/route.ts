import { listApproved } from "@/lib/gala/store";

/**
 * What the projector polls: approved guest photos, oldest approval first.
 * The sender's name is included only when they ticked "show my name on
 * screen"; otherwise it stays with the moderators.
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
        ...(p.showName && p.name ? { name: p.name } : {}),
        approvedAt: p.approvedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
