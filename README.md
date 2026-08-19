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
| `/report` | Report an issue: photo, location pin, category, contact |
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

Both forms post to Netlify Forms. Netlify discovers forms by parsing **static**
HTML at deploy time, which never sees a React-rendered form, so
`public/__forms.html` declares both forms and every field they send;
`src/lib/netlifyForms.ts` posts real submissions to that same path.

**A field missing from `public/__forms.html` is dropped silently** — no error,
no submission. Keep the two in sync.

| Form | Name | Notes |
| --- | --- | --- |
| Volunteer signup | `volunteer-signup` | URL-encoded |
| Issue report | `issue-report` | `multipart/form-data`, carries the photo |

Submissions appear under **Netlify → your site → Forms**. Turn on email
notifications there so reports reach a person.

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

`public/assets/` holds the seal, the wood-grain background tile, the Hialeah
gate photo, and the founder portrait.

**The portrait is a placeholder.** The original was unrecoverable from the
Design API (its 256 KB per-file cap truncates the file). Drop the real photo in
as `public/assets/edith-calvo.jpg` — roughly 4:5, face in the upper third — and
both the About page and the contact card pick it up with no code change. The
vCard on `/edith` embeds whatever is at that path.

## Things to replace before launch

- `public/assets/edith-calvo.jpg` — placeholder portrait (see above).
- `hola@clubdelaamistad.org` in `src/app/(site)/report/page.tsx` — confirm this
  mailbox exists.
- **`(305) 445-4860`** — the Hialeah Public Works number in the emergency copy
  (`rUrgentBody` in both locale files). This one came from the design and looks
  real, so nobody will notice if it is wrong; verify it, because someone may
  dial it during an actual emergency. The `(305) 555-0142` numbers elsewhere
  are obviously placeholders and flag themselves.
- The address typeahead on `/report` uses a fixed list of Hialeah cross streets
  (`ADDRESS_POOL` in `src/components/ReportForm.tsx`). Swap in a real geocoder
  when there is budget for one.
