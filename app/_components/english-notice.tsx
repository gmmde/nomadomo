"use client";

import { useLang, t } from "../lib/i18n";

export default function EnglishNotice() {
  const [lang] = useLang();
  return (
    <div style={{
      background: "#fff3cd",
      border: "2px solid #f5c649",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
      fontFamily: "inherit",
    }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#5a4a18", marginBottom: 4 }}>
        {t("profile_english_notice_title", lang)}
      </div>
      <div style={{ fontSize: 11, color: "#5a4a18", fontWeight: 600, lineHeight: 1.6 }}>
        {t("profile_english_notice_body", lang)}
      </div>
    </div>
  );
}
