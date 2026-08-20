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
          <Image
            src="/assets/seal.png"
            alt="Club de la Amistad para un Hialeah Mejor Voluntario"
            width={900}
            height={900}
            // Renders at clamp(120px, 15vw, 168px) — without this the srcset
            // tops out at 1920w for a 168px slot.
            sizes="168px"
            className={s.heroSeal}
            priority
          />
          <h1 className={s.heroTitle}>{t("heroTitle")}</h1>
          <p className={s.heroBody}>{t("heroBody")}</p>
          <div className={s.heroActions}>
            <Link href="#join" className={ui.btnGold}>
              {t("ctaPrimary")}
            </Link>
            <Link href="#how" className={ui.btnGhost}>
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
        <div className={s.heroPhotoWrap}>
          {/* The heroPlaque/heroPlaqueInner classes are hooks for the 820px
              block in Home.module.css, which dismantles the frame on phones.
              They cannot be written as descendant selectors there: ui.plaque
              is a different CSS Module, so its hashed class never matches. */}
          <div className={`${ui.plaque} ${s.heroPlaque}`}>
            <div className={`${ui.plaqueInner} ${s.heroPlaqueInner}`}>
              <Image
                src="/assets/volunteers-lineup.jpg"
                alt="Club de la Amistad volunteers"
                width={1080}
                height={1434}
                // 100vw below the breakpoint: the photo goes full-bleed there.
                sizes="(max-width: 820px) 100vw, 44vw"
                className={s.heroPhoto}
                priority
              />
            </div>
          </div>
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

        <div className={s.gallery}>
          <div className={s.galleryHead}>
            <p className="kicker" style={{ margin: 0, whiteSpace: "nowrap" }}>
              {t("galleryKicker")}
            </p>
            <span className={s.galleryRule} />
          </div>
          <div className={ui.plaque}>
            <div className={ui.plaqueInner}>
              <div className={s.galleryShot}>
                <Image
                  src="/assets/team-framed-gate.jpg"
                  alt="Club de la Amistad volunteers holding a framed photograph of the Hialeah gate"
                  fill
                  sizes="(max-width: 1320px) 92vw, 1240px"
                  className={s.galleryImg}
                />
              </div>
            </div>
          </div>
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
            <div className={`${ui.photoFrame} ${s.joinPhoto}`}>
              <div className={s.joinShot}>
                <Image
                  src="/assets/festival-mayor.jpg"
                  alt="Edith Calvo with Mayor Bryan Calvo at a Hialeah festival"
                  fill
                  sizes="(max-width: 820px) 92vw, 46vw"
                  className={s.joinImg}
                />
              </div>
            </div>
          </div>
          <VolunteerForm />
        </div>
      </section>
    </>
  );
}
