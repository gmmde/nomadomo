"use client";

import { useLang } from "@/app/lib/i18n";

/** Language-aware inline text. Renders EN or JA based on current language.
 *  Optional `sub` shows a small secondary label (only in JA mode, e.g. an English gloss). */
export default function Bi({ ja, en, sub }: { ja: string; en: string; sub?: string }) {
  const [lang] = useLang();
  return (
    <>
      {lang === "ja" ? ja : en}
      {lang === "ja" && sub ? <span style={{ fontSize: 12, color: "#b6a48f", fontWeight: 500 }}> {sub}</span> : null}
    </>
  );
}
