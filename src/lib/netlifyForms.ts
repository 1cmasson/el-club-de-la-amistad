/**
 * Netlify Forms submission helpers.
 *
 * Netlify detects forms by parsing static HTML at deploy time, which never sees
 * a React-rendered form. `public/__forms.html` declares both forms (name +
 * every field) so detection succeeds; these helpers post real submissions to
 * that same path. Keep the two in sync — a field missing from `__forms.html`
 * is silently dropped from the submission.
 */

const ENDPOINT = "/__forms.html";

export const VOLUNTEER_FORM = "volunteer-signup";
export const REPORT_FORM = "issue-report";

/** URL-encoded submission, for forms without a file input. */
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

/** Multipart submission, for the report form's photo upload. */
export async function submitFormWithFile(
  formName: string,
  fields: Record<string, string>,
  files: Record<string, File | null>,
): Promise<void> {
  const body = new FormData();
  body.append("form-name", formName);
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  for (const [key, file] of Object.entries(files)) {
    if (file) body.append(key, file, file.name);
  }

  // No Content-Type header — the browser sets the multipart boundary.
  const res = await fetch(ENDPOINT, { method: "POST", body });

  if (!res.ok) throw new Error(`Netlify Forms responded ${res.status}`);
}
