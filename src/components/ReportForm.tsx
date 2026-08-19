"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { REPORT_FORM, submitFormWithFile } from "@/lib/netlifyForms";
import ui from "./ui.module.css";
import s from "./Report.module.css";

/** Cross streets used for the address typeahead until a geocoder is wired up. */
const ADDRESS_POOL = [
  "Palm Ave & W 29th St",
  "E 4th Ave & E 25th St",
  "W 12th Ave & W 21st St",
  "Hialeah Dr & E 8th Ave",
  "W 16th Ave & W 60th St",
  "Okeechobee Rd & E 9th St",
  "W 84th St & W 12th Ave",
  "E 49th St & E 8th Ave",
];

type Coords = { lat: number; lon: number };
type LocState = "idle" | "busy" | "done";

function referenceNumber(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return `HIA-${stamp}-${100 + Math.floor(Math.random() * 900)}`;
}

export function ReportForm() {
  const { t } = useTranslation();
  const categories = t("categories", { returnObjects: true }) as string[];

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [typed, setTyped] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locState, setLocState] = useState<LocState>("idle");
  const [category, setCategory] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ ref: string; category: string; address: string } | null>(null);

  const addressInput = useRef<HTMLInputElement>(null);

  // Object URLs must be released or the blob leaks for the life of the tab.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
    setError("");
  }

  function pinAt(label: string, lat: number, lon: number) {
    setAddress(label);
    setCoords({ lat, lon });
    setTyped("");
    setLocState("done");
    setError("");
    if (addressInput.current) addressInput.current.value = "";
  }

  function useMyLocation() {
    if (locState === "busy") return;
    setLocState("busy");
    setError("");

    let settled = false;
    const once = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };
    const fallback = () => pinAt(`${ADDRESS_POOL[0]} (approx.)`, 25.85762, -80.27811);

    if (!navigator.geolocation) {
      window.setTimeout(() => once(fallback), 700);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) =>
        once(() => pinAt(t("rLocDone"), position.coords.latitude, position.coords.longitude)),
      () => once(fallback),
      { enableHighAccuracy: true, timeout: 5000 },
    );
    window.setTimeout(() => once(fallback), 5600);
  }

  const query = typed.trim().toLowerCase();
  const suggestions =
    query.length < 2
      ? []
      : (ADDRESS_POOL.filter((a) => a.toLowerCase().includes(query)).length
          ? ADDRESS_POOL.filter((a) => a.toLowerCase().includes(query))
          : ADDRESS_POOL
        ).slice(0, 4);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photo) return setError(t("rErrPhoto"));
    if (!coords) return setError(t("rErrLoc"));
    if (!category) return setError(t("rErrCat"));

    const data = new FormData(event.currentTarget);
    const reference = referenceNumber();
    setError("");
    setSending(true);

    try {
      await submitFormWithFile(
        REPORT_FORM,
        {
          reference,
          category,
          address,
          coordinates: `${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`,
          note: String(data.get("note") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
          phone: String(data.get("phone") ?? "").trim(),
          language: document.documentElement.lang || "en",
        },
        { photo },
      );
      setSent({ ref: reference, category, address });
    } catch {
      setError(t("rErrSend"));
    } finally {
      setSending(false);
    }
  }

  function reset() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhoto(null);
    setPhotoUrl("");
    setTyped("");
    setAddress("");
    setCoords(null);
    setLocState("idle");
    setCategory("");
    setError("");
    setSent(null);
  }

  if (sent) {
    return (
      <div className={ui.paper} style={{ gap: 22 }}>
        <div className={s.doneHead}>
          <span className={s.doneMark} />
          <h2 className={s.doneTitle}>{t("rDoneTitle")}</h2>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          <p className={s.doneLabel} style={{ margin: 0 }}>
            {t("rDoneRef")}
          </p>
          <p className={s.doneRef} style={{ margin: 0 }}>
            {sent.ref}
          </p>
        </div>

        <div className={s.doneFacts}>
          <div style={{ display: "grid", gap: 4 }}>
            <p className={s.doneLabel} style={{ margin: 0 }}>
              {t("rDoneCat")}
            </p>
            <p className={s.doneValue} style={{ margin: 0 }}>
              {sent.category}
            </p>
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            <p className={s.doneLabel} style={{ margin: 0 }}>
              {t("rDoneWhere")}
            </p>
            <p className={s.doneValue} style={{ margin: 0 }}>
              {sent.address || "—"}
            </p>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 16.5, lineHeight: 1.6, color: "rgba(42,26,12,.75)" }}>
          {t("rDoneBody")}
        </p>

        <button type="button" className={s.doneAgain} onClick={reset}>
          {t("rAnother")}
        </button>
      </div>
    );
  }

  const locLabel =
    locState === "busy" ? t("rLocBusy") : locState === "done" ? t("rLocDone") : t("rLocIdle");

  return (
    <form
      name={REPORT_FORM}
      method="post"
      data-netlify="true"
      encType="multipart/form-data"
      onSubmit={handleSubmit}
      className={`${ui.paper} ${s.form}`}
    >
      <input type="hidden" name="form-name" value={REPORT_FORM} />

      {/* 01 — photo */}
      <div className={s.block}>
        <div className={ui.stepHead}>
          <span className={ui.stepNum}>01</span>
          <span className={ui.stepLabel}>{t("rStep1")}</span>
        </div>

        {!photoUrl ? (
          <label className={s.dropzone}>
            <span className={s.dropRing} />
            <span className={s.dropCta}>{t("rPhotoCta")}</span>
            <span className={s.dropHint}>{t("rPhotoHint")}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPhoto}
              style={{ display: "none" }}
            />
          </label>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div className={s.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" className={s.previewImg} />
            </div>
            <div className={s.previewMeta}>
              <span className={s.previewName}>{photo?.name}</span>
              <label className={s.retake}>
                {t("rPhotoRetake")}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onPhoto}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 02 — location */}
      <div className={`${s.block} ${ui.divider}`}>
        <div className={ui.stepHead}>
          <span className={ui.stepNum}>02</span>
          <span className={ui.stepLabel}>{t("rStep2")}</span>
        </div>

        <button type="button" onClick={useMyLocation} className={s.locBtn}>
          <span className={s.locDot} />
          {locLabel}
        </button>

        <div className={s.orRule}>{t("rOr")}</div>

        <div style={{ display: "grid", gap: 8 }}>
          <input
            ref={addressInput}
            type="text"
            className={ui.input}
            placeholder={t("rAddrPh")}
            onChange={(event) => setTyped(event.target.value)}
            aria-label={t("rAddrPh")}
          />
          {suggestions.length > 0 ? (
            <div className={s.suggestions}>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  className={s.suggestion}
                  onClick={() =>
                    pinAt(suggestion, 25.8576 + index * 0.004, -80.2781 - index * 0.005)
                  }
                >
                  <span className={s.suggestionDot} />
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}
          <p className={s.hint} style={{ margin: 0 }}>
            {t("rAddrHint")}
          </p>
        </div>

        {coords ? (
          <div className={s.pinCard}>
            <div className={s.map}>
              <span className={s.pin} />
              <span className={s.mapLabel}>{t("rMapSlot")}</span>
            </div>
            <div className={s.pinMeta}>
              <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                <span className={s.pinAddr}>{address || "—"}</span>
                <span className={s.pinCoords}>
                  {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                </span>
              </div>
              <button
                type="button"
                className={s.pinChange}
                onClick={() => {
                  setCoords(null);
                  setAddress("");
                  setLocState("idle");
                }}
              >
                {t("rLocChange")}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* 03 — category */}
      <div className={`${s.block} ${ui.divider}`}>
        <div className={ui.stepHead}>
          <span className={ui.stepNum}>03</span>
          <span className={ui.stepLabel}>{t("rStep3")}</span>
        </div>
        <div className={s.chips}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={category === cat}
              className={`${s.chip} ${category === cat ? s.chipOn : ""}`}
              onClick={() => {
                setCategory(cat);
                setError("");
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className={`${ui.divider}`} style={{ display: "grid", gap: 16 }}>
        <label className={ui.field}>
          {t("rExtra")}
          <textarea
            name="note"
            rows={2}
            className={ui.textarea}
            placeholder={t("rExtraPh")}
          />
        </label>

        <div className={ui.row}>
          <label className={ui.field}>
            {t("rEmail")}
            <input type="email" name="email" className={ui.input} placeholder="you@email.com" />
          </label>
          <label className={ui.field}>
            {t("rPhone")}
            <input type="tel" name="phone" className={ui.input} placeholder="(305) 555-0142" />
          </label>
        </div>

        <button type="submit" className={ui.submit} disabled={sending}>
          {sending ? t("rSending") : t("rSubmit")}
        </button>

        {error ? <div className={ui.error}>{error}</div> : null}
      </div>
    </form>
  );
}
