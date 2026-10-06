import { getPhoto, getPhotoBytes, isPhotoId } from "@/lib/gala/store";

/**
 * Serves an approved guest photo. Pending and rejected ones 404, so a photo
 * nobody approved is never reachable from the public site.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/gala/photo/[id]">) {
  const { id } = await ctx.params;
  if (!isPhotoId(id)) return new Response("Not found", { status: 404 });

  const photo = await getPhoto(id);
  if (photo?.status !== "approved") return new Response("Not found", { status: 404 });

  const file = await getPhotoBytes(id);
  if (!file) return new Response("Not found", { status: 404 });

  return new Response(file.bytes, {
    headers: {
      "Content-Type": file.contentType,
      // Short and private: a photo pulled from the screen should stop loading
      // soon after, rather than living on in a shared cache.
      "Cache-Control": "private, max-age=300",
    },
  });
}
