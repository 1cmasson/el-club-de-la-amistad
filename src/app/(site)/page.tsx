"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { VolunteerForm } from "@/components/VolunteerForm";
import ui from "@/components/ui.module.css";
import s from "@/components/Home.module.css";

export default function HomePage() {
  const { t } = useTranslation();
  const categories = t("categories", { returnObjects: true }) as string[];
  const perks = t("joinPerks", { returnObjects: true }) as string[];

  const steps = [
    { n: "01", title: t("step1Title"), body: t("step1Body") },
    { n: "02", title: t("step2Title"), body: t("step2Body") },
    { n: "03", title: t("step3Title"), body: t("step3Body") },
  ];

  return (
    <>
      <section className={`shell ${s.hero}`}>
        <div className={s.heroCopy}>
          <h1 className={s.heroTitle}>{t("heroTitle")}</h1>
          <p className={s.heroBody}>{t("heroBody")}</p>
          <div className={s.heroActions}>
            <Link href="#join" className={ui.btnGold}>
              {t("ctaPrimary")}
            </Link>
            <Link href="/report" className={ui.btnGhost}>
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
        <div className={s.heroSealWrap}>
          <Image
            src="/assets/seal.png"
            alt="Club de la Amistad para un Hialeah Mejor Voluntario"
            width={900} 
            height={891}
            className={s.heroSeal}
            priority
          />
        </div>
      </section>

      <section className={`shell ${s.section}`} id="how">
        <div className={s.sectionHead}>
          <p className="kicker" style={{ margin: 0 }}>
            {t("howKicker")}
          </p>
          <h2 className="sectionTitle">{t("howTitle")}</h2>
        </div>

        <div className={s.steps}>
          {steps.map((step) => (
            <article key={step.n} className={s.step}>
              <p className={s.stepNum} style={{ margin: 0 }}>
                {step.n}
              </p>
              <h3 className={s.stepTitle}>{step.title}</h3>
              <p className={s.stepBody}>{step.body}</p>
            </article>
          ))}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <p className={s.catsHead} style={{ margin: 0 }}>
            {t("catsTitle")}
          </p>
          <div className={s.cats}>
            {categories.map((cat) => (
              <span key={cat} className={s.cat}>
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="join" className={s.join}>
        <div className={`shell ${s.joinGrid}`}>
          <div className={s.joinCopy}>
            <p className="kicker" style={{ margin: 0 }}>
              {t("joinKicker")}
            </p>
            <h2 className="sectionTitle">{t("joinTitle")}</h2>
            <p className={s.joinBody}>{t("joinBody")}</p>
            <ul className={s.perks}>
              {perks.map((perk) => (
                <li key={perk} className={s.perk}>
                  <span className="diamond" />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <VolunteerForm />
        </div>
      </section>
    </>
  );
}
