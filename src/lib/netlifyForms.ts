/**
 * Netlify Forms submission helper.
 *
 * Netlify detects forms by parsing static HTML at deploy time, which never sees
 * a React-rendered form. `public/__forms.html` declares the volunteer form
 * (name + every field) so detection succeeds; this helper posts real
 * submissions to that same path. Keep the two in sync — a field missing from
 * `__forms.html` is silently dropped from the submission.
 */

const ENDPOINT = "/__forms.html";

export const VOLUNTEER_FORM = "volunteer-signup";

/** URL-encoded submission. */
export async function submitForm(
  formName: string,
  fields: Record<string, string>,
): Promise<void> {
  const body = new URLSearchParams({ "form-name": formName, ...fields });

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`Netlify Forms responded ${res.status}`);
}
