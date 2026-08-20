"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/i18n/I18nProvider";
import { Flag } from "./Flag";
import ui from "./ui.module.css";
import s from "./SiteHeader.module.css";

const NAV = [
  { href: "/", key: "navHome" },
  { href: "/about", key: "navAbout" },
] as const;

export function SiteHeader() {
  const { t } = useTranslation();
  const { language, setLanguage, toggle } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const navClass = (href: string) =>
    `${s.navLink} ${isActive(href) ? s.navLinkActive : ""}`;

  return (
    <header className={s.header}>
      <div className={s.bar}>
        <Link href="/" className={s.brand} aria-label={t("navHome")}>
          <Image
            src="/assets/seal.webp"
            alt="Club de la Amistad seal"
            width={68}
            height={68}
            // Without sizes, a fixed-size image only gets a 1x/2x srcset, whose
            // 2x rung here is 256w — for a mark that is 68px at most and 44px on
            // a phone. Declaring the three CSS widths opens the full ladder.
            sizes="(max-width: 430px) 44px, (max-width: 820px) 52px, 68px"
            className={s.brandSeal}
            priority
          />
          <span className={s.brandText}>
            <span className={s.brandName}>CLUB DE LA AMISTAD</span>
            <span className={s.brandTagline}>{t("tagline")}</span>
          </span>
        </Link>

        {/* Desktop */}
        <nav className={s.desktopNav}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={navClass(item.href)}>
              {t(item.key)}
            </Link>
          ))}

          <div className={s.langGroup} role="group" aria-label={t("langGroup")}>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
              className={`${s.langPill} ${language === "en" ? s.langPillOn : ""}`}
            >
              <Flag country="us" />
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("es")}
              aria-pressed={language === "es"}
              className={`${s.langPill} ${language === "es" ? s.langPillOn : ""}`}
            >
              <Flag country="es" />
              ES
            </button>
          </div>

          <Link href="/#join" className={`${ui.btnGold} ${s.joinBtn}`}>
            {t("navJoin")}
          </Link>
        </nav>

        {/* Mobile */}
        <div className={s.mobileControls}>
          <button
            type="button"
            onClick={toggle}
            className={s.langToggle}
            aria-label={language === "es" ? "Switch to English" : "Cambiar a español"}
          >
            <Flag country={language === "es" ? "us" : "es"} />
            {language === "es" ? "EN" : "ES"}
          </button>
          <button
            type="button"
            className={s.menuBtn}
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
          >
            <span className={`${s.menuBox} ${menuOpen ? s.menuBoxOpen : ""}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      <div id="site-menu" className={`${s.drawer} ${menuOpen ? s.drawerOpen : ""}`}>
        <nav className={s.drawerInner} aria-hidden={!menuOpen}>
          <div className={s.drawerLinks}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navClass(item.href)}
                tabIndex={menuOpen ? undefined : -1}
                onClick={() => setMenuOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
            <Link
              href="/#join"
              className={`${ui.btnGold} ${s.drawerJoin}`}
              tabIndex={menuOpen ? undefined : -1}
              onClick={() => setMenuOpen(false)}
            >
              {t("navJoin")}
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
