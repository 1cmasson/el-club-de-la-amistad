# Club de la Amistad por un Hialeah Mejor

Website for the volunteer club that walks Hialeah block by block, photographs
what the city needs to repair, and files it with the right department.

Built from the Claude Design source in
[`Club de la Amistad.dc.html` / `Edith Calvo Contact.dc.html`](https://claude.ai/design/p/ab8d0580-0fdf-498e-a643-9c77923ef12a).

## Stack

| Piece | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, all routes static) |
| Styling | CSS Modules + design tokens in `src/app/globals.css` — no utility framework |
| i18n | `react-i18next`, English + Spanish, browser-detected and user-switchable |
| Forms | Netlify Forms — no backend, no API keys |
| Hosting | Netlify (`@netlify/plugin-nextjs`) |

## Routes

| Path | What it is |
| --- | --- |
| `/` | Hero, how it works, volunteer signup |
| `/about` | The club, Edith Calvo, mission, values |
| `/edith` | Standalone contact card for Edith, with a downloadable vCard |
| `/gala` | Full-screen slideshow for the gala projector (unlisted, noindex) |
| `/gala/tarjeta` | Printable QR table cards for the gala, four to a letter page |
| `/foto` | Where guests land from the gala screen's QR code to send a photo (unlisted, noindex) |

## Local development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint
```

## Internationalisation

Strings live in `src/i18n/locales/en.ts` and `es.ts`. `es.ts` is typed as
`typeof en`, so adding a key to English and forgetting the Spanish is a
compile error rather than a missing string at runtime.

The app always renders English on the server and on the first client render,
then `LanguageBootstrap` (`src/i18n/I18nProvider.tsx`) switches to the stored
or browser-detected language after hydration. That ordering is deliberate —
detecting during render would produce a hydration mismatch. A manual choice is
persisted to `localStorage` under `cda-lang`.

## Forms

The volunteer signup posts to Netlify Forms. Netlify discovers forms by parsing
**static** HTML at deploy time, which never sees a React-rendered form, so
`public/__forms.html` declares the form and every field it sends;
`src/lib/netlifyForms.ts` posts real submissions to that same path,
URL-encoded.

**A field missing from `public/__forms.html` is dropped silently** — no error,
no submission. Keep the two in sync. The form sends `name`, `email`, `phone`,
`smsConsent` and `language`.

Submissions appear under **Netlify → your site → Forms**, and are mirrored into
a Google Sheet Edith works from — see `automation/`. The mirror is **one-way and
append-only**: Netlify stays the system of record, the Sheet is a working
projection, and the script never rewrites a row she has annotated. Turn on email
notifications too, so a signup reaches a person even if the mirror is down.

> **Form detection is off by default on new Netlify sites** and had to be
> enabled on this one (`processing_settings.ignore_html_forms` → `false`, i.e.
> Site configuration → Forms → Form detection). That setting lives in the
> Netlify dashboard, **not in this repo** — it cannot be set from
> `netlify.toml`. If this site is ever recreated, moved to another account, or
> forked, forms go quiet with no error anywhere until it is re-enabled.
>
> The **outgoing webhook** that feeds the Google Sheet lives in the same place
> and fails the same way (Site configuration → Notifications → Emails and
> webhooks). Netlify auto-disables a notification after repeated delivery
> failures, so if the Sheet stops filling, check that toggle before anything
> else. Its URL carries a shared token; the token itself lives in Apps Script
> Script Properties, which is why nothing secret is needed here.

## Gala slideshow

`/gala` is a kiosk page for the projector: the club's photos one by one, each
matted and slowly drifting, over the site's wood grain with candlelight, bokeh
and rising gold dust drawn on a canvas. It loops forever: title card, the
reel, then a closing *¡Gracias!*.

| Piece | Where |
| --- | --- |
| The reel, in order | `src/app/gala/deck.ts` → `public/gala/NN.webp` |
| Slideshow and timing | `src/app/gala/Slideshow.tsx` (one rAF loop, no per-frame React renders) |
| Background | `src/app/gala/ambience.ts` |
| Guest upload page | `src/app/foto/` |
| Upload / list / serve / moderate | `src/app/api/gala/*`, `src/lib/gala/*` |

**On the night:** open `https://porunhialeahmejor.com/gala` in Chrome on the
laptop driving the projector and press <kbd>F</kbd> (or double-click) for
fullscreen. <kbd>Space</kbd> pauses, <kbd>→</kbd> skips. The cursor hides
itself and a wake lock keeps the laptop awake. Every reel photo is pulled into
memory on load, so a Wi-Fi drop mid-show never blanks the screen — only new
guest photos need the connection.

For the tables, print `/gala/tarjeta` (letter, no margins, background
graphics on) and cut along the dashed lines — guests can scan from their seats.

Query params: `?qr=0` hides the QR card, `?sec=9` changes seconds per photo,
`?live=0` stops polling for guest photos.

**Changing the reel:** drop WebPs (1920px long edge, orientation baked in) in
`public/gala/` and list them in `deck.ts` in showing order.

### Guest photos and Telegram approval

The QR card on screen opens `/foto`. A guest picks up to ten photos; the page
shrinks each to a 2000px JPEG on the phone (Netlify caps a function body at
6 MB) and posts it to `/api/gala/upload`. Photos are stored in the
`gala-photos` **Netlify Blobs** store — no database — as `pending`.

Each upload is sent as a photo to the moderators in Telegram, through the
club's existing bot **@ClubAmistadHialeah_bot**, with **✅ Aprobar** /
**❌ Rechazar** buttons. Those are *URL buttons* to an HMAC-signed
`/api/gala/moderate` link, not callback buttons, on purpose: the Postiz bridge
long-polls that bot, and a webhook or `getUpdates` here would break it. A URL
tap produces no update, so the bridge never sees these messages' buttons. After
a tap, every moderator's copy is relabelled, and an approved photo can still be
pulled with **🗑 Quitar de la pantalla**.

The projector polls `/api/gala/photos` every 12 s. A newly approved photo jumps
the queue and appears as the very next slide with a gold *Nueva foto* ribbon, then joins
the rotation every third slide. The sender's optional name goes to the
moderators in Telegram and the review page only — never to the screen or to
`/api/gala/photos`, so nobody is called out in front of the room.
Unapproved photos are never served: `/api/gala/photo/<id>` 404s unless approved.

Environment (Netlify → Site configuration → Environment variables):

| Variable | Value |
| --- | --- |
| `GALA_TELEGRAM_BOT_TOKEN` | the bot's token (same as Postiz's `TELEGRAM_BOT_TOKEN`) |
| `GALA_TELEGRAM_CHAT_IDS` | comma-separated Telegram user ids that approve; each must have started the bot |
| `GALA_SECRET` | any long random string; signs the approve/reject links |
| `GALA_AUTO_APPROVE` | optional — `1` puts uploads straight on screen, no approval |

Without the Telegram variables uploads are still saved, just never announced.
Telegram rate-limits a chat to about a message a second; a 429 is waited out
twice before giving up.

**Backup review page.** If a Telegram card never arrives (a moderator who
never sent `/start` to the bot, a burst that outlasted the retries, Telegram
down), every upload is still reachable at `/api/gala/review?k=<key>`: newest
first, thumbnails, Aprobar / Rechazar / Quitar, refreshing itself every 20 s.
The key is derived from `GALA_SECRET`:

```bash
node -e "console.log(require('crypto').createHmac('sha256', process.env.GALA_SECRET).update('review').digest('base64url').slice(0,24))"
```

### The MP4 fallback

`scripts/render-gala-video.mjs` renders the same slideshow (without the QR
card) to a seamlessly looping 1080p MP4, for a venue without Wi-Fi or an AV
person who wants a file. It doesn't screen-record: `/gala?render` exposes
`window.__gala.renderAt(t)`, every motion is a pure function of time and the
background is periodic in the loop length, so frame *N* flows into frame 0.

```bash
npm run dev
node scripts/render-gala-video.mjs --out gala-loop.mp4        # ~15 min for the full loop
node scripts/render-gala-video.mjs --preview 20 --out test.mp4  # first 20 s only
```

## Deployment

Pushes to `main` deploy automatically. The wiring is a **Netlify build hook
plus a GitHub push webhook**, not Netlify's native Git integration, because the
latter needs the Netlify GitHub App installed interactively. Two consequences:

- No deploy previews on pull requests, and no branch deploys.
- The webhook fires on a push to *any* branch, while the build hook is pinned
  to `main` — so pushing a feature branch rebuilds `main` from `main`.

To get the real integration, click **Link to Git** on the site in the Netlify
UI. Manual deploys work either way: `netlify deploy --build --prod`.

## Assets

`public/assets/` holds everything the site ships: the seal, the wood-grain
background tile, the Hialeah gate photo, the founder portrait, five
photographs of the club, a favicon family, and two Open Graph cards.

| Group | Files |
| --- | --- |
| Photographs | `volunteers-lineup.webp` (hero), `team-framed-gate.webp` (gallery band), `festival-mayor.webp` (join section), `team-lunch.webp` and `edith-bryan.webp` (about) |
| CSS backgrounds | `wood-grain.webp` (1024×750 tile), `hialeah-gate.webp` + `hialeah-gate-480.webp` (behind the founder portrait) |
| Portrait and seal | `edith-calvo.webp` (900×945 cutout), `edith-calvo-480.webp` (`/edith`), `seal.webp` (512×512) |
| Favicons | `favicon-16/32/48/192/512.png`, `favicon-maskable-512.png`, `apple-touch-icon-180.png` |
| Social cards | `og-home.jpg`, `og-edith.jpg` — 1200×630 |

### The image pipeline

`npm run images` runs `scripts/optimize-images.mjs`, which re-encodes the repo's
rasters from an explicit manifest — photos to WebP at native size, the OG cards
to mozjpeg, the large icons to quantized PNG. Entries default to `public/assets/`;
an entry may set `dir` to reach elsewhere, which is how `home-desktop.webp` at
the repo root is covered.

It is idempotent: `scripts/image-ledger.json` records a hash per output and
already-optimized files are skipped, so re-running never stacks another lossy
pass. `--force` re-derives outputs whose source still exists, but refuses entries
that encode a file onto itself — there the source *is* the previous output. To
redo one of those, or any entry whose source a previous run consumed, restore the
original first with `git show <ref>:<path>`.

Re-shooting the screenshot is the one routine case: save it as `home-desktop.png`
as usual and run `npm run images`, which converts it and removes the PNG.

The photographs, favicons and cards came from the design's brand handoff
bundle. Things to keep in mind when replacing one:

- **Photos rendered through `next/image` stay at native resolution.** Next builds
  the per-device `srcset` itself, so downscaling a master permanently caps
  quality on 2x/3x screens. Only `seal` and `edith-calvo-480` are deliberately
  resized, because their render sizes are fixed and small.
- **`sizes` values are measured, not guessed** — every one was read off the live
  layout at 390 / 720 / 1000 / 1440 / 2560px. Two gotchas behind the odd-looking
  numbers: a `vw` unit anywhere in `sizes` makes Next drop every srcset candidate
  below `640 × (smallest vw)`, and a fixed-size `<Image>` with no `sizes` gets
  only a 1x/2x pair — which is why the header seal spells out its three CSS
  widths.
- **The OG cards must stay `.jpg` under these exact names.** The absolute URLs are
  public and scrapers cache them; several also handle WebP poorly.
- **Do not regenerate the 16/32/48 favicons with a plain resize.** They were
  exported with a deliberate contrast and saturation boost so the seal's gold
  ring survives downscaling; a naive resize turns them to mush. They are left out
  of the script's manifest for that reason.
- The bundle also contained newer `seal-v12.png`, `wood-grain.png`,
  `edith-calvo.png` and `hialeah-gate.jpg`. **Those four were deliberately not
  adopted** — the repo keeps its own versions, so nothing in the CSS or the
  components had to change. If you ever do adopt them, note that the seal goes
  from 900×900 to 1275×1233 and the wood tile from 1024×750 to 1024×1024, so
  `.woodstage` in `globals.css` **and** `.stage` in `ContactCard.module.css` need
  their `background-size` updated. `wood-grain.webp` is written at exactly
  1024×750 to keep those values honest.

`.woodstage`, `.stage` and `.portraitFrame` are CSS backgrounds, so `next/image`
never touches them and they carry their own responsive handling: each declares a
plain `url()` first and an `image-set()` override second, because an
`image-set()` the browser cannot parse invalidates the entire declaration —
taking the gradient layer with it. `.portraitFrame` also swaps down to
`hialeah-gate-480.webp` below 701px.

`edith-calvo.webp` is a **cutout with a transparent background**, which is what
the design intended: it sits on a gold-tinted disc, so the tint shows through
around her rather than a photographic background. Keep the alpha if you ever
replace it — a flattened JPEG would show as a hard rectangle inside the circle.

That transparency is also why `/edith` fills its canvas with cream before
drawing the vCard photo. JPEG has no alpha, so without an opaque ground every
transparent pixel exports as black.

## Metadata and link previews

`metadataBase` in `src/app/layout.tsx` is `https://porunhialeahmejor.com`.
`og:image` **must** resolve absolutely — crawlers ignore relative paths, and
Next fails the build on a relative image with no `metadataBase` — so if the
production origin ever changes, change it there.

`/edith` carries its own card via `src/app/edith/layout.tsx`; a layout is
needed because `edith/page.tsx` is a client component and those cannot export
metadata. `/about` inherits the homepage card: the bundle only ever produced
two cards.

The root `openGraph` deliberately sets **no `url`**. It would be inherited, and
`/about` would then advertise itself as the homepage — which crawlers that
canonicalise on `og:url` would collapse into one page. With it absent they fall
back to the URL they fetched, which is right everywhere; `/edith` sets its own
explicitly.

The cards are **Spanish-only by design decision**, so `openGraph.title` and
`description` are Spanish even though the `<title>` and meta description are
English. English variants would need their own artwork, not just new strings.

`src/app/manifest.ts` emits `/manifest.webmanifest` and its own
`<link rel="manifest">`. Do not also set `manifest` in the root layout's
metadata or the tag renders twice. There is deliberately no `favicon.ico` —
modern browsers use the PNG links, and an `app/favicon.ico` would emit a
`sizes="any"` link that outranks them.

## Things to replace before launch

- ~~**`porunhialeahmejor.com` must actually resolve to this site.**~~ Done — it
  is the site's live custom domain, so link previews resolve.
- **The signup collects SMS consent but nothing can text yet.** The consent
  wording promises STOP/HELP handling and a specific sender. Before anyone
  sends a single message, the number needs A2P 10DLC or toll-free
  registration — collecting consent is the easy half. Until then the Sheet
  column is headed `¿Permitió mensajes? (aún no enviamos)` and carries a note
  saying so, and **nothing in the Sheet offers a tappable way to text someone** —
  that affordance would read as permission the infrastructure cannot honour.
