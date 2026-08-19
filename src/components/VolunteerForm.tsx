"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { submitForm, VOLUNTEER_FORM } from "@/lib/netlifyForms";
import ui from "./ui.module.css";

type Status = "idle" | "sending" | "sent";

export function VolunteerForm() {
  const { t } = useTranslation();
  const zones = t("zones", { returnObjects: true }) as string[];

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

    setError("");
    setStatus("sending");

    try {
      await submitForm(VOLUNTEER_FORM, {
        name,
        email,
        phone: String(data.get("phone") ?? "").trim(),
        zone: String(data.get("zone") ?? ""),
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
        <button type="button" className={ui.submit} onClick={() => setStatus("idle")}>
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
          autoComplete="tel"
          placeholder="(305) 555-0142"
        />
      </label>

      <label className={ui.field}>
        {t("fieldZone")}
        <select className={ui.select} name="zone" defaultValue={zones[0]}>
          {zones.map((zone) => (
            <option key={zone}>{zone}</option>
          ))}
        </select>
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
