import { listApproved } from "@/lib/gala/store";

/** What the projector polls: approved guest photos, oldest approval first. */
export async function GET() {
  const photos = await listApproved();
  return Response.json(
    {
      photos: photos.map((p) => ({
        id: p.id,
        src: `/api/gala/photo/${p.id}`,
        width: p.width,
        height: p.height,
        name: p.name,
        approvedAt: p.approvedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
