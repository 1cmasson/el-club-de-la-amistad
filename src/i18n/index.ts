import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import es from "./locales/es";

export const LANGUAGES = ["en", "es"] as const;
export type Language = (typeof LANGUAGES)[number];
export const STORAGE_KEY = "cda-lang";

/**
 * Always initialise to English so the server render and the first client render
 * agree. `LanguageBootstrap` switches to the stored/detected language in an
 * effect, after hydration.
 */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function detectLanguage(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") return stored;
  } catch {
    /* private mode / storage disabled */
  }
  const nav =
    (navigator.languages && navigator.languages[0]) || navigator.language || "en";
  return String(nav).toLowerCase().startsWith("es") ? "es" : "en";
}

export default i18n;
