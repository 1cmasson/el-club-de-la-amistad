# Netlify Forms → Google Sheet

Volunteer signups land in the Netlify dashboard, which is a developer's console:
it needs a Netlify login, it is English-only, and it has no way to write a note or
tap a number and dial it. Edith runs the club and is the person who has to *use*
that list, so this pipeline mirrors every signup into a Google Sheet she can work
in from her phone.

**Netlify stays the system of record. The Sheet is a working projection.** Nothing
here is the only copy of anything, which is what makes every failure mode below
recoverable rather than fatal.

```
volunteer-signup  ──▶  Netlify Forms  ──▶  outgoing webhook  ──▶  Apps Script  ──▶  Voluntarios
   (the website)        (durable copy)      submission_created      doPost()         (her sheet)
```

## This directory is a mirror, not a deployment

`google-sheet-ingest/*.gs` is the source of truth for review and history, but the
code that actually runs lives in the Apps Script project bound to the Sheet.
**Editing a file here changes nothing until someone pastes it in and redeploys.**

## What is live right now

Wired up and verified end to end on **14 Sep 2026**. A real submission through
`porunhialeahmejor.com/#join` reached the sheet in under 12 seconds.

| | |
| --- | --- |
| Sheet | **Club de la Amistad - Voluntarios**, owned by Carlos — id `1GtUGqWxhjQgK1veRuJLjL3EnK6w-FazYcoBN0T2AEPI` |
| Apps Script | **Club de la Amistad - ingesta de voluntarios** (standalone, `SPREADSHEET_ID` set) |
| Web app | Deployed "v1 - webhook de Netlify", Execute as Me, access Anyone |
| Netlify hook | id `6aa8074ad56b0f760d0dcdb7`, `url` / `submission_created`, scoped to form `6a862edf79ed4d0008203c4c` |
| OAuth scopes | Spreadsheets only. "Send email as you" was **declined** — `NOTIFY_EMAIL` is empty, so `notify_()` returns before it ever touches `MailApp`. Granting it later is required only if you set that constant. |
| Backfill | The one historical submission (24 Aug) was replayed through the live endpoint, so it is in the sheet with its real Netlify id and cannot duplicate. |

Verified at go-live: wrong token writes nothing; a non-`volunteer-signup` form is
ignored; a replayed delivery dedupes; the warning-only protection prompts before
an accidental edit to a script-owned column; and the hook was still `disabled=false`
after a successful delivery.

The sheet is shared with the club account **clubporunhialeahmejor@gmail.com**
as **Editor**, and both e-mail notifications are live (that address and Carlos's),
so every signup reaches a person even if the Sheets mirror is ever down. General
access stays **Restricted** — the sheet holds real names and phone numbers and
must not become link-shareable.

**One operational caveat.** Netlify auto-disabled the outgoing webhook once,
during token rotation, after a run of deliberately-failing test deliveries. It
was re-enabled and has stayed enabled through clean deliveries since. Because
Apps Script always answers 302, Netlify cannot tell a success from a failure, so
this can recur — and it fails *silently*. If the sheet ever stops filling, check
`disabled` on the hook first:

```
netlify api listHooksBySiteId --data '{"site_id":"a0f55919-29e9-4909-8014-a3f00cfc6ca0"}'
netlify api enableHook        --data '{"hook_id":"6aa8074ad56b0f760d0dcdb7"}'
```

The permanent fix, if it recurs, is the forwarding Netlify Function described
below — it returns a clean 200 so Netlify never sees a redirect.

## Setup

1. Create the Sheet *Club de la Amistad — Voluntarios*. Rename tab 1 to `Voluntarios`.
2. **File → Settings** → Locale **Español (Estados Unidos)**, Time zone **New York**.
   The locale is what makes her own typed dates parse day-first.
3. Create the Apps Script project and paste each `.gs` file into a file of the
   same name. Two ways, and the only difference between them is one constant:
   - **Bound** (Extensions → Apps Script from inside the sheet): leave
     `SPREADSHEET_ID = ''`. `getActive()` resolves the sheet.
   - **Standalone** (script.google.com → New project): set `SPREADSHEET_ID` to the
     sheet id from its URL. This is how the live one is deployed, because a bound
     project can only be created by clicking through the Sheets UI and this needs
     to be reproducible from the repo.

   Set the constant; do not edit anything else. Keeping the difference in config
   rather than in an edited copy is what stops the deployed script from drifting
   away from this repo.
4. Generate a token: `openssl rand -hex 24`. In the editor, **Project Settings
   (gear) → Script Properties → Add script property**, name `WEBHOOK_TOKEN`.
   *This is why no secret reaches git.*
5. Optionally set `NOTIFY_EMAIL` and `HELP_PHONE` at the top of `Code.gs`.
6. Run **`setup`**. On the first run Google shows *"Authorization required"* →
   Review permissions → pick the account → *"Google hasn't verified this app"* →
   **Advanced → Go to … (unsafe)** → Allow. That warning is expected and correct
   for any unpublished bound script; no Cloud project is needed.
7. Check the result: headers, frozen row, hidden `ID Netlify` column, the `Estado`
   dropdown, and a populated **`Cómo usar`** tab with four real colour swatches.
   Three checks worth doing here, while the webhook is still unwired and a mistake
   costs nothing:
   - **Where will the first row land?** In the editor, run
     `Logger.log(SpreadsheetApp.getActive().getSheetByName('Voluntarios').getLastRow())`.
     It must log **1**. `setup()` applies formats and validation down to
     `getMaxRows()`, and if any of that counted as *content* the first append would
     land at row 1001 and the sheet would look permanently empty to her.
   - **Run `setup()` a second time.** Data → Protected sheets and ranges must still
     show 8 entries (7 without the `Llamar` column), not 16 — proof that re-running
     it after a config change does not accumulate duplicate protections.
   - **Read the `Cómo usar` tab at phone width.** Row heights there are deliberately
     left to auto-fit; confirm nothing is clipped, and that the type is comfortable
     at arm's length. This tab is the difference between a tool she uses and one she
     abandons, so it is worth the minute.
8. **Deploy → New deployment → Web app.** Execute as **Me**; Who has access
   **Anyone** (that means *even anonymous* — Netlify posts unauthenticated, and
   anything narrower fails silently). Copy the `/exec` URL.
9. Sanity-check it: open the `/exec` URL in a browser. Expect
   `{"ok":true,"result":"alive"}`. A Google sign-in page means step 8 is wrong.
10. **Netlify → the project → Project configuration → Notifications → Emails and
    webhooks → Form submission notifications → Add notification → Outgoing
    webhook.** Event *New form submission*; Form `volunteer-signup`; URL =
    the `/exec` URL with `?token=<the token from step 4>` appended;
    **leave the JWS secret token blank** (see below).
11. While in there, add **email** notifications as well — one address per
    notification, so one for Carlos and one for Edith. Costs nothing, and means a
    signup can never silently vanish while the Sheet is being debugged.
12. Backfill anything older than the webhook — see `Backfill.gs`.

## Redeploying after a change

Apps Script serves the **deployed** version, not the saved one.

> **Deploy → Manage deployments → pencil → Version: New version → Deploy.**

That keeps the same `/exec` URL. Creating a *new deployment* instead mints a new
URL and silently orphans the Netlify webhook — the single most common way this
breaks, and it produces no error anywhere.

## Why the webhook is not signature-verified

Netlify can sign deliveries: fill in the **JWS secret token** and it sends an
`X-Webhook-Signature` header containing an HS256 JWT.

**Apps Script cannot read it.** A web app's `doPost(e)` receives only
`queryString`, `parameter`, `parameters`, `pathInfo`, `contextPath`,
`contentLength` and `postData`. There is no `e.headers`, so the header is
structurally unreachable. This is a platform limitation, not a shortcut.

So the guard is three honest layers, and the field is left blank rather than filled
in with something that cannot be checked:

1. An unguessable `/exec` URL (deployment ids are ~57 random characters).
2. A shared `?token=` compared against `WEBHOOK_TOKEN` in Script Properties.
3. A `form_name` allow-list (`ACCEPTED_FORMS`).

Worst case for this threat model is a junk row in a list that is rebuildable from
Netlify — no money, no auth, and no data beyond what someone typed into a public
form. Rotate the token by changing the Script Property and editing the URL in
Netlify; no redeploy needed. Real signature verification would require a Netlify
Function as the receiver, which reintroduces secrets and repo code, trading away
the reason this shape was chosen.

**Do not add header-reading code.** Something that looks like a signature check but
cannot work is worse than no check, because the next person will believe it.

## Two platform constraints that shape the code

**Apps Script cannot return a non-2xx.** `ContentService` output is always 200; the
only way to emit a 5xx is to let an exception escape, which returns an HTML error
page. *"Please retry" is unexpressible*, so nothing depends on retries: everything
is caught, logged to an `Errores` tab with the raw body, and recoverable from
Netlify's durable copy.

**`/exec` answers a POST with a 302** to `script.googleusercontent.com`. If the
sender does not follow it, Netlify records failed deliveries *even though rows are
landing correctly* — and **Netlify auto-disables a notification after repeated
failures**. Dedupe makes retries free, so the practical consequence is just a
standing check: *is the webhook still enabled?* If it starts disabling itself, the
escalation is a small Netlify Function that receives the event and forwards to Apps
Script (it can return a clean 200), at the cost of reintroducing repo code.

## The sheet

Two tabs. `Voluntarios` is the list; **`Cómo usar` is the legend**, generated by
`setup()` in large-type Spanish with real colour swatches, so the sheet explains
itself without anyone standing over her shoulder.

The script owns the ingest columns and `ID Netlify`. **`Estado`, `Última llamada`
and `Notas` are hers and are never rewritten** — the one exception is seeding
`Estado` to `Nuevo` on a row that did not exist a millisecond earlier. Script-owned
columns carry *warning-only* protection: an accidental edit prompts, it does not
block.

The colour code, driven by the `Estado` dropdown so she never has to paint a cell:

| | | |
|---|---|---|
| 🟡 `#FFF3C4` | `Nuevo` | Todavía no la he llamado |
| 🔴 `#F8D7DA` | `Llamado`, `No contestó`, `Dejé mensaje` | **Ya llamé — ya di seguimiento** |
| 🟢 `#E6F4EA` | `Confirmado` | Ya es voluntaria |
| ⚪ `#F1F1F1` | `No interesado`, `Número equivocado` | — |

Rules are plain equality formulas, never `OR()`/`COUNTIF()`, so the spreadsheet's
argument separator under a Spanish locale cannot break them.

### Tap-to-call: tested, and not possible

Worth recording so nobody spends an afternoon on it. Sheets has exactly two ways to
put a link in a cell and **both refuse the `tel:` scheme**:

- `=HYPERLINK("tel:+13055550142", "Llamar")` — the function rejects it.
- `RichTextValue.setLinkUrl('tel:…')` — **throws**. Verified live against a real
  spreadsheet on 14 Sep 2026: `Exception: Illegal argument. at writeRow_`.

This is not a question of how the mobile app renders the link — the *write* is
refused. So the number is stored as plain text in `Teléfono`, which is fine in
practice: the Sheets mobile app linkifies phone-shaped strings on its own, and a
long press offers copy. The header carries a note telling her exactly that.

If a real dial button is ever wanted, the route is a **Google Contacts import**
(export name/phone/email to CSV, import under a "Club de la Amistad" label), where
every number is natively tappable. **Not** a third-party redirector like
`call.ctrlq.org` — that would route every volunteer's phone number through a
stranger's server.

**Rows append at the bottom and are never sorted by the script.** Sorting by hand is
safe (appends target after the last row; dedupe scans a column rather than trusting
position), but filter views are poorly supported in the Sheets mobile app — which is
the only place she will open this — so the colours are what make sorting unnecessary.

## When it does not work

**Apps Script editor → Executions** lists every invocation. The `result` string names
the branch taken:

| `result` | Meaning |
| --- | --- |
| `stored:<id>` | Row appended. |
| `duplicate:<id>` | Already had it. Netlify retried; correctly ignored. |
| `ignored:token` | Wrong or missing `?token=`. |
| `ignored:form:<name>` | A form not in `ACCEPTED_FORMS`. |
| `quarantined:headers` | A column was renamed or deleted. Payload is in the `Revisar` tab; nothing was written to `Voluntarios`. |
| `error-logged` | Unexpected failure. Raw body is in the `Errores` tab. |

**No execution at all** means the POST never arrived: check that the notification is
still enabled, that the URL in Netlify matches the *current* deployment, and that
the last change was a new *version* rather than a new *deployment*.

If forms go quiet entirely, the cause is upstream of all of this: **Project
configuration → Forms → Form detection** must stay on. See the project README.
