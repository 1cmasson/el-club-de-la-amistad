# Club de la Amistad para un Hialeah Mejor

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

Submissions appear under **Netlify → your site → Forms**. Turn on email
notifications there so signups reach a person.

> **Form detection is off by default on new Netlify sites** and had to be
> enabled on this one (`processing_settings.ignore_html_forms` → `false`, i.e.
> Site configuration → Forms → Form detection). That setting lives in the
> Netlify dashboard, **not in this repo** — it cannot be set from
> `netlify.toml`. If this site is ever recreated, moved to another account, or
> forked, forms go quiet with no error anywhere until it is re-enabled.

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
| Photographs | `volunteers-lineup.jpg` (hero), `team-framed-gate.jpg` (gallery band), `festival-mayor.jpg` (join section), `team-lunch.jpg` and `edith-bryan.jpg` (about) |
| Favicons | `favicon-16/32/48/192/512.png`, `favicon-maskable-512.png`, `apple-touch-icon-180.png` |
| Social cards | `og-home.jpg`, `og-edith.jpg` — 1200×630 |

The photographs, favicons and cards came from the design's brand handoff
bundle. Two things about them:

- **Do not regenerate the 16/32/48 favicons with a plain resize.** They were
  exported with a deliberate contrast and saturation boost so the seal's gold
  ring survives downscaling; a naive resize turns them to mush.
- The bundle also contained newer `seal-v12.png`, `wood-grain.png`,
  `edith-calvo.png` and `hialeah-gate.jpg`. **Those four were deliberately not
  adopted** — the repo keeps its own versions, so nothing in the CSS or the
  components had to change. If you ever do adopt them, note that the seal goes
  from 900×900 to 1275×1233 and the wood tile from 1024×750 to 1024×1024, so
  `.woodstage` in `globals.css` needs its `background-size` updated.

`edith-calvo.png` is a **cutout with a transparent background**, which is what
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

- **`porunhialeahmejor.com` must actually resolve to this site.** Every link
  preview points at `https://porunhialeahmejor.com/assets/og-*.jpg`; until DNS
  is cut over, shared links render with a broken image and no card.
- **The signup collects SMS consent but nothing can text yet.** The consent
  wording promises STOP/HELP handling and a specific sender. Before anyone
  sends a single message, the number needs A2P 10DLC or toll-free
  registration — collecting consent is the easy half.
