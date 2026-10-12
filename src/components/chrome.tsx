"use client";
import Link from "next/link";
import { createContext, useContext, useState } from "react";
import { Flower2, ArrowUpRight } from "lucide-react";
import type { Language } from "@/lib/types";
const LanguageContext = createContext<{
  lang: Language;
  setLang: (l: Language) => void;
}>({ lang: "en", setLang: () => {} });
export function useLanguage() {
  return useContext(LanguageContext);
}
export function Providers({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("en");
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function Header() {
  const { lang, setLang } = useLanguage();
  return (
    <header className="header">
      <Link href="/" className="brand" aria-label="BloomDate home">
        <Flower2 size={27} strokeWidth={1.4} />
        <span>
          Bloom<span className="brand-light">Date</span>
          <i>®</i>
        </span>
      </Link>
      <nav>
        <button
          className="language"
          onClick={() => setLang(lang === "en" ? "ms" : "en")}
          aria-label="Change language"
        >
          EN <span className={lang === "ms" ? "active-lang" : ""}>/ BM</span>
        </button>
        <Link href="/dashboard" className="nav-link">
          {lang === "en" ? "My invitations" : "Jemputan saya"}
        </Link>
        <Link href="/create" className="btn btn-small">
          {lang === "en" ? "Make an invitation" : "Cipta jemputan"}{" "}
          <ArrowUpRight size={16} />
        </Link>
      </nav>
    </header>
  );
}
export function Footer() {
  const { lang } = useLanguage();
  return (
    <footer className="footer">
      <Link href="/" className="brand">
        <Flower2 size={21} />
        BloomDate
      </Link>
      <span>
        {lang === "en"
          ? "Made for little moments that mean everything."
          : "Untuk detik kecil yang penuh makna."}
      </span>
      <span>With a little love ♡</span>
    </footer>
  );
}
