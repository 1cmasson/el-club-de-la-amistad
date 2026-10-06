/**
 * The public origin for links we send out (Telegram buttons). Netlify sets
 * `URL` to the site's primary domain; locally we fall back to the request's.
 */
export const siteOrigin = (request: Request) =>
  process.env.URL ?? new URL(request.url).origin;
