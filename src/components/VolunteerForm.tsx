"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitForm, VOLUNTEER_FORM } from "@/lib/netlifyForms";
import ui from "./ui.module.css";

type Status = "idle" | "sending" | "sent";

/** Formats keystrokes as a US number: 3055550142 → (305) 555-0142. */
function maskPhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function VolunteerForm() {
  const { t } = useTranslation();

  const [phone, setPhone] = useState("");
  const [smsOk, setSmsOk] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();

    if (!name || !email) {
      setError(t("formErrRequired"));
      return;
    }

    // Agreeing to texts without leaving a number is the one incoherent state
    // this form can reach, so it is the one thing worth blocking on.
    if (smsOk && phone.replace(/\D/g, "").length !== 10) {
      setError(t("formErrPhone"));
      return;
    }

    setError("");
    setStatus("sending");

    try {
      await submitForm(VOLUNTEER_FORM, {
        name,
        email,
        phone,
        smsConsent: smsOk ? "yes" : "no",
        language: document.documentElement.lang || "en",
      });
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError(t("formErrSend"));
    }
  }

  if (status === "sent") {
    return (
      <div className={ui.paper}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="diamond" style={{ width: 14, height: 14 }} />
          <h3 className={ui.paperTitle} style={{ fontSize: "clamp(24px, 4vw, 30px)" }}>
            {t("formDoneTitle")}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: "rgba(42,26,12,.75)" }}>
          {t("formDoneBody")}
        </p>
        <button
          type="button"
          className={ui.submit}
          onClick={() => {
            setPhone("");
            setSmsOk(false);
            setStatus("idle");
          }}
        >
          {t("formDoneAgain")}
        </button>
      </div>
    );
  }

  return (
    <form
      name={VOLUNTEER_FORM}
      method="post"
      data-netlify="true"
      onSubmit={handleSubmit}
      className={ui.paper}
    >
      <input type="hidden" name="form-name" value={VOLUNTEER_FORM} />

      <div style={{ display: "grid", gap: 6 }}>
        <h3 className={ui.paperTitle}>{t("formTitle")}</h3>
        <p className={ui.paperSub} style={{ margin: 0 }}>
          {t("formSub")}
        </p>
      </div>

      <label className={ui.field}>
        {t("fieldName")}
        <input
          className={ui.input}
          type="text"
          name="name"
          autoComplete="name"
          placeholder={t("phName")}
          required
        />
      </label>

      <label className={ui.field}>
        {t("fieldEmail")}
        <input
          className={ui.input}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@email.com"
          required
        />
      </label>

      <label className={ui.field}>
        {t("fieldPhone")}
        <input
          className={ui.input}
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          maxLength={14}
          placeholder="(305) 555-0142"
          value={phone}
          onChange={(event) => setPhone(maskPhone(event.target.value))}
        />
        <span className={ui.fine}>{t("phoneHint")}</span>
      </label>

      <label className={ui.check}>
        <input
          type="checkbox"
          name="smsConsent"
          className={ui.checkBox}
          checked={smsOk}
          onChange={(event) => setSmsOk(event.target.checked)}
        />
        <span className={ui.checkText}>{t("smsConsent")}</span>
      </label>

      <button type="submit" className={ui.submit} disabled={status === "sending"}>
        {status === "sending" ? t("formSending") : t("formSubmit")}
      </button>

      {error ? <div className={ui.error}>{error}</div> : null}

      <p className={ui.fine} style={{ margin: 0 }}>
        {t("formFine")}
      </p>
    </form>
  );
}
