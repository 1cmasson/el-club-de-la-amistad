"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n/I18nProvider";
import s from "@/components/ContactCard.module.css";

const PHONE_DISPLAY = "(786) 801-9879";
const PHONE_E164 = "+17868019879";
const PORTRAIT = "/assets/edith-calvo.png";

/** Square-crops the portrait to a base64 JPEG so the vCard carries a photo. */
function loadPortraitBase64(): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve("");
    img.onload = () => {
      try {
        const size = 320;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve("");
        // The portrait is a cutout with a transparent background, and JPEG has
        // no alpha — without an opaque ground every transparent pixel would
        // export as black. Fill with the card's cream before drawing.
        ctx.fillStyle = "#f6efe1";
        ctx.fillRect(0, 0, size, size);
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - side) / 2;
        const sy = Math.max(
          0,
          Math.min(img.naturalHeight - side, img.naturalHeight * 0.14 - side * 0.14),
        );
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1] ?? "");
      } catch {
        resolve("");
      }
    };
    img.src = PORTRAIT;
  });
}

export default function EdithContactPage() {
  const { t } = useTranslation();
  const { language, toggle } = useLanguage();

  const [photoB64, setPhotoB64] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadPortraitBase64().then((b64) => {
      if (!cancelled) setPhotoB64(b64);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * A data: URL rather than a blob: URL — it is a pure string, so the server
   * render and the first client render agree, and there is nothing to revoke.
   * The photo arrives on a later render once the canvas crop resolves.
   */
  const vcfHref = useMemo(() => {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      "N:Calvo;Edith;;;",
      "FN:Edith Calvo",
      "ORG:Club de la Amistad para un Hialeah Mejor",
      `TITLE:${t("contact.vcardTitle")}`,
      `TEL;TYPE=CELL,VOICE:${PHONE_E164}`,
      "ADR;TYPE=WORK:;;;Hialeah;FL;;USA",
      "URL:https://clubdelaamistad.org",
      `NOTE:${t("contact.vcardNote")}`,
    ];

    if (photoB64) {
      const wrapped = photoB64.match(/.{1,74}/g) ?? [];
      lines.push(`PHOTO;ENCODING=b;TYPE=JPEG:${wrapped.join("\r\n ")}`);
    }

    lines.push("END:VCARD");
    const text = `${lines.join("\r\n")}\r\n`;
    return `data:text/vcard;charset=utf-8,${encodeURIComponent(text)}`;
  }, [photoB64, t]);

  return (
    <div className={s.stage}>
      <div className={s.card}>
        <div className={s.top}>
          <Link href="/" className={s.brand}>
            <Image
              src="/assets/seal.png"
              alt="Club de la Amistad seal"
              width={38}
              height={38}
              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.5))", flex: "none" }}
            />
            <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <span className={s.brandName}>CLUB DE LA AMISTAD</span>
              <span className={s.brandTagline}>{t("tagline")}</span>
            </span>
          </Link>
          <button
            type="button"
            className={s.langBtn}
            onClick={toggle}
            aria-label={language === "es" ? "Switch to English" : "Cambiar a español"}
          >
            {language === "es" ? "EN" : "ES"}
          </button>
        </div>

        <div className={s.hero}>
          <div className={s.portrait}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={PORTRAIT} alt="Edith Calvo" className={s.portraitImg} />
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            <h1 className={s.name}>Edith Calvo</h1>
            <p className={s.role} style={{ margin: 0 }}>
              {t("contact.role")}
            </p>
            <p className={s.city} style={{ margin: 0 }}>
              {t("contact.city")}
            </p>
          </div>
          <p className={s.blurb}>{t("contact.blurb")}</p>
        </div>

        <div className={s.actions}>
          <a href={`tel:${PHONE_E164}`} className={s.callBtn}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={s.icon}
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            {t("contact.call")}
          </a>

          <a
            href={vcfHref}
            download="Edith-Calvo.vcf"
            onClick={() => setSaved(true)}
            className={s.saveBtn}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={s.icon}
              style={{ width: 21, height: 21 }}
            >
              <path d="M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20" />
              <circle cx="9.5" cy="8" r="3.5" />
              <path d="M19 8h-6" />
              <path d="M16 5v6" />
            </svg>
            {saved ? t("contact.saved") : t("contact.save")}
          </a>
        </div>

        <div className={s.details}>
          <div className={s.detailRow}>
            <span className={s.detailLabel}>{t("contact.phoneLabel")}</span>
            <a href={`tel:${PHONE_E164}`} className={s.detailPhone}>
              {PHONE_DISPLAY}
            </a>
          </div>
          <div className={s.detailRow}>
            <span className={s.detailLabel}>{t("contact.orgLabel")}</span>
            <span className={s.detailOrg}>Club de la Amistad para un Hialeah Mejor</span>
          </div>
        </div>

        <div className={s.joinBlock}>
          <span className={s.joinKicker}>{t("contact.joinKicker")}</span>
          <p className={s.joinBody}>{t("contact.joinBody")}</p>
          <Link href="/#join" className={s.joinCta}>
            {t("contact.joinCta")}
          </Link>
        </div>

        <p className={s.foot}>{t("contact.foot")}</p>
      </div>
    </div>
  );
}
