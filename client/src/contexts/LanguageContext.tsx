import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { languageCopy, type AppLanguage, type DashboardCopy } from "@/lib/dashboardLanguage";
import { translateInterface, type InterfacePhrase } from "@/lib/interfaceTranslations";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  copy: DashboardCopy;
  t: (phrase: InterfacePhrase) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const stored = localStorage.getItem("cropwise-language");
    return stored === "hi" || stored === "mr" ? stored : "en";
  });

  useEffect(() => {
    localStorage.setItem("cropwise-language", language);
    document.documentElement.lang = language === "hi" ? "hi" : language === "mr" ? "mr" : "en";
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, copy: languageCopy[language], t: (phrase: InterfacePhrase) => translateInterface(language, phrase) }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
