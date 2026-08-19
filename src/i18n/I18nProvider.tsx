"use client";

import { useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n, { detectLanguage, Language, STORAGE_KEY } from "./index";

/** Applies the stored/detected language once the client has hydrated. */
function LanguageBootstrap() {
  const { i18n: instance } = useTranslation();

  useEffect(() => {
    const next = detectLanguage();
    if (next !== instance.language) void instance.changeLanguage(next);
  }, [instance]);

  useEffect(() => {
    const sync = (lng: string) => {
      document.documentElement.lang = lng;
    };
    sync(instance.language);
    instance.on("languageChanged", sync);
    return () => {
      instance.off("languageChanged", sync);
    };
  }, [instance]);

  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageBootstrap />
      {children}
    </I18nextProvider>
  );
}

/** Convenience hook: current language plus a persisting setter. */
export function useLanguage() {
  const { i18n: instance } = useTranslation();
  const current = (instance.language === "es" ? "es" : "en") as Language;

  const setLanguage = (lng: Language) => {
    void instance.changeLanguage(lng);
    try {
      window.localStorage.setItem(STORAGE_KEY, lng);
    } catch {
      /* ignore */
    }
  };

  return { language: current, setLanguage, toggle: () => setLanguage(current === "es" ? "en" : "es") };
}
