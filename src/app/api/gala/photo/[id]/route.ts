import type { NextRequest } from "next/server";
import { getPhoto, getPhotoBytes, isPhotoId } from "@/lib/gala/store";
import { isReviewKey } from "@/lib/gala/telegram";

/**
 * Serves an approved guest photo. Pending and rejected ones 404, so a photo
 * nobody approved is never reachable from the public site — except with the
 * review key, which is how the backup review page shows its thumbnails.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/gala/photo/[id]">) {
  const { id } = await ctx.params;
  if (!isPhotoId(id)) return new Response("Not found", { status: 404 });

  const photo = await getPhoto(id);
  const reviewer = isReviewKey(request.nextUrl.searchParams.get("k"));
  if (!photo || (photo.status !== "approved" && !reviewer)) {
    return new Response("Not found", { status: 404 });
  }

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
