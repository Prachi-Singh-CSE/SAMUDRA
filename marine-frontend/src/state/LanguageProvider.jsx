import { useCallback, useMemo, useState } from "react";
import { LanguageContext } from "./LanguageContext";
import { translations } from "../i18n/translations";

const STORAGE_KEY = "jalsetu-language";

function getFromPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

function getInitialLanguage() {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) return stored;
  } catch {
    // localStorage unavailable (e.g. private mode) — fall back silently.
  }
  return "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);

  const setLanguage = useCallback((code) => {
    if (!translations[code]) return;
    setLanguageState(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Ignore storage failures; language still updates for this session.
    }
  }, []);

  const t = useCallback(
    (key) => {
      const dict = translations[language] || translations.en;
      const value = getFromPath(dict, key);
      if (value !== undefined) return value;
      return getFromPath(translations.en, key) ?? key;
    },
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}