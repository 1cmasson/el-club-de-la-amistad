"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import ui from "@/components/ui.module.css";
import s from "@/components/About.module.css";

type Value = { title: string; body: string };

export default function AboutPage() {
  const { t } = useTranslation();
  const values = t("values", { returnObjects: true }) as Value[];

  return (
    <div className={s.page}>
      <section className={s.intro}>
        <div className={s.introCopy}>
          <p className="kicker" style={{ margin: 0 }}>
            {t("aboutKicker")}
          </p>
          <h1 className={s.title}>{t("aboutTitle")}</h1>
          <p className="lede">{t("aboutLede")}</p>
        </div>
        <div className={ui.plaque}>
          <div className={ui.plaqueInner}>
            <div className={s.introShot}>
              <Image
                src="/assets/team-lunch.jpg"
                alt="Club volunteers at a monthly meeting around a table"
                fill
                sizes="(max-width: 700px) 92vw, 46vw"
                className={s.introImg}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={s.founder}>
        <div className={s.portraitCol}>
          <div className={s.portraitFrame}>
            <div className={s.portraitDisc}>
              <Image
                src="/assets/edith-calvo.png"
                alt="Edith Calvo"
                fill
                sizes="(max-width: 700px) 60vw, 300px"
                className={s.portraitImg}
              />
            </div>
          </div>
          <div style={{ display: "grid", gap: 2 }}>
            <h2 className={s.founderName}>Edith Calvo</h2>
            <p className={s.founderRole} style={{ margin: 0 }}>
              {t("edithRole")}
            </p>
            <Link href="/edith" className={s.callLink} style={{ marginTop: 8 }}>
              <span className="diamond" />
              {t("contact.call")}
            </Link>
          </div>
        </div>

        <div className={s.founderCopy}>
          <blockquote className={s.quote}>&ldquo;{t("edithQuote")}&rdquo;</blockquote>
          <p className={s.para}>{t("edithBio1")}</p>
          <p className={s.para}>{t("edithBio2")}</p>
          <div className={ui.plaque}>
            <div className={ui.plaqueInner}>
              <div className={s.bioShot}>
                <Image
                  src="/assets/edith-bryan.jpg"
                  alt="Edith Calvo with her son, Mayor Bryan Calvo"
                  fill
                  sizes="(max-width: 700px) 92vw, 56vw"
                  className={s.bioImg}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={s.twoUp}>
        <div style={{ display: "grid", gap: 16 }}>
          <h2 className={s.blockTitle}>{t("missionTitle")}</h2>
          <p className={s.para}>{t("missionBody")}</p>
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <h2 className={s.blockTitle}>{t("sealTitle")}</h2>
          <p className={s.para}>{t("sealBody")}</p>
        </div>
      </section>

      <section style={{ display: "grid", gap: 24 }}>
        <h2 className={s.blockTitle}>{t("valuesTitle")}</h2>
        <div className={s.values}>
          {values.map((value) => (
            <article key={value.title} className={s.value}>
              <h3 className={s.valueTitle}>{value.title}</h3>
              <p className={s.valueBody}>{value.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
