/**
 * The origin for links we send out (Telegram buttons): whichever deploy took
 * the upload. Not Netlify's `URL`, which is always the primary domain — on a
 * draft deploy that would point the buttons at a site without these routes.
 * Deliberately not X-Forwarded-Host either: an uploader controls that header,
 * and could aim a moderator's Approve button at a site of their own.
 */
export const siteOrigin = (request: Request) => new URL(request.url).origin;
