"use client";

import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { SAMPLE_RESULTS } from "../lib/data";
import { createT } from "../lib/i18n";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [results, setResults] = useState(SAMPLE_RESULTS);

  // Start with "zh" so SSR and first client render match, then correct in useEffect
  const [lang, setLangState] = useState("zh");

  useEffect(() => {
    const stored = localStorage.getItem("proofmade_lang");
    if (stored === "zh" || stored === "en") {
      setLangState(stored);
    } else {
      // Detect browser language: startsWith("zh") → Chinese, else English
      const bl = (navigator.language ?? "").toLowerCase();
      setLangState(bl.startsWith("zh") ? "zh" : "en");
    }
  }, []);

  const setLang = (l) => {
    setLangState(l);
    localStorage.setItem("proofmade_lang", l);
  };

  // Re-create the translator only when language changes
  const t = useMemo(() => createT(lang), [lang]);

  return (
    <AppContext.Provider value={{ results, setResults, lang, setLang, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

/** Convenience hook — just language + translator, no results state. */
export function useLang() {
  const { lang, setLang, t } = useApp();
  return { lang, setLang, t };
}
