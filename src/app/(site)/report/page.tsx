"use client";

import { useTranslation } from "react-i18next";
import { ReportForm } from "@/components/ReportForm";
import ui from "@/components/ui.module.css";
import s from "@/components/Report.module.css";

export default function ReportPage() {
  const { t } = useTranslation();
  const next = [t("rNext1"), t("rNext2"), t("rNext3")];

  return (
    <div className={s.page}>
      <section className={s.intro}>
        <p className="kicker" style={{ margin: 0 }}>
          {t("rKicker")}
        </p>
        <h1 className={s.title}>{t("rTitle")}</h1>
        <p className="lede" style={{ fontSize: "clamp(16.5px, 2.1vw, 19px)" }}>
          {t("rLede")}
        </p>
        <p className={s.time} style={{ margin: 0 }}>
          <span className="diamond" />
          {t("rTime")}
        </p>
      </section>

      <section className={s.grid}>
        <ReportForm />

        <aside className={s.aside}>
          <div className={ui.panel}>
            <p className={ui.panelKicker} style={{ margin: 0 }}>
              {t("rNextTitle")}
            </p>
            <div style={{ display: "grid", gap: 14 }}>
              {next.map((line, index) => (
                <p key={line} className={s.nextItem} style={{ margin: 0 }}>
                  <span className={s.nextNum}>{`0${index + 1}`}</span>
                  {line}
                </p>
              ))}
            </div>
          </div>

          <div className={`${ui.panel} ${ui.panelAccent}`}>
            <p className={ui.panelKicker} style={{ margin: 0 }}>
              {t("rUrgentTitle")}
            </p>
            <p className={ui.panelBody}>{t("rUrgentBody")}</p>
          </div>

          <div className={ui.panel}>
            <p className={ui.panelKicker} style={{ margin: 0 }}>
              {t("reachTitle")}
            </p>
            <div style={{ display: "grid", gap: 4 }}>
              <span className={s.reachLabel}>Email</span>
              <a href="mailto:hola@clubdelaamistad.org" style={{ fontSize: 17 }}>
                hola@clubdelaamistad.org
              </a>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <span className={s.reachLabel}>{t("phoneLabel")}</span>
              <a href="tel:+17868019879" style={{ fontSize: 17 }}>
                (786) 801-9879
              </a>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
