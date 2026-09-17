/**
 * Forwards the Netlify volunteer-signup webhook to the Apps Script sheet ingest.
 *
 * Apps Script's /exec always answers a POST with a 302, which Netlify's outgoing
 * webhook eventually reads as a run of failures and auto-disables the hook —
 * silently, with no error anywhere (it has happened twice; see
 * automation/README.md). This endpoint sits between the two so that Netlify's
 * webhook only ever talks to us: it always gets a clean 200, so it can never
 * trip that auto-disable again. Whether the forward to Apps Script itself
 * succeeds is logged here, not surfaced to Netlify.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const url = process.env.SHEET_INGEST_URL;

  if (!url) {
    console.error("SHEET_INGEST_URL is not set; dropped a submission");
  } else {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) console.error(`Sheet ingest responded ${res.status}`);
    } catch (err) {
      console.error("Sheet ingest forward failed", err);
    }
  }

  return Response.json({ ok: true });
}

/** Health check, same shape as Apps Script's own doGet(). */
export async function GET() {
  return Response.json({ ok: true });
}
