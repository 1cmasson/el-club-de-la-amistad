"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import s from "./SiteFooter.module.css";

export function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className={s.footer}>
      <div className={`shell ${s.inner}`}>
        <div className={s.identity}>
          <Image
            src="/assets/seal.webp"
            alt=""
            width={40}
            height={40}
            sizes="40px"
            className={s.seal}
          />
          <p className={s.note}>
            Club de la Amistad por un Hialeah Mejor Voluntario
            <br />
            {t("footerNote")}
          </p>
        </div>
        <nav className={s.links}>
          <Link href="/#join">{t("navJoin")}</Link>
          <Link href="/#how">{t("howKicker")}</Link>
          <Link href="/edith">Edith Calvo</Link>
        </nav>
      </div>
    </footer>
  );
}
