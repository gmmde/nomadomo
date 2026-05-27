"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useLang, t, type Lang } from "@/app/lib/i18n";
import { signout } from "@/app/actions/auth";

type Initial = {
  language: Lang;
  email_on_new_message: boolean;
  email_on_booking: boolean;
  show_to_anon: boolean;
  app_mode: 'local' | 'traveler' | null;
};

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const sectionBox: React.CSSProperties = { background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14, marginBottom: 14 };
const sectionTitle: React.CSSProperties = { fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 10, textTransform: "uppercase" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0d9b5" };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#1a1008", flex: 1 };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };
const danger: React.CSSProperties = { width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function SettingsForm({ userEmail, initial }: { userEmail: string; initial: Initial }) {
  const router = useRouter();
  const [lang, setLang] = useLang();
  const [language, setLanguage] = useState<Lang>(initial.language);
  const [emailMsg, setEmailMsg] = useState(initial.email_on_new_message);
  const [emailBook, setEmailBook] = useState(initial.email_on_booking);
  const [showAnon, setShowAnon] = useState(initial.show_to_anon);
  const [appMode, setAppMode] = useState<'local' | 'traveler' | null>(initial.app_mode);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  // 言語切替はクライアントで即適用 (localStorage)
  function onLangChange(next: Lang) {
    setLanguage(next);
    setLang(next);
  }

  async function onSave() {
    setStatus("saving");
    const supabase = createClient();
    // upsert (なければ insert、あれば update)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .upsert({
        user_id: user.id,
        language,
        email_on_new_message: emailMsg,
        email_on_booking: emailBook,
        show_to_anon: showAnon,
        app_mode: appMode,
      }, { onConflict: "user_id" });
    if (error) {
      setStatus("idle");
      alert("保存失敗: " + error.message);
      return;
    }
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: "#ad001c", fontSize: 22, cursor: "pointer" }}>←</button>
          <div style={{ fontSize: 20, fontWeight: 900 }}>⚙️ {t("settings_title", lang)}</div>
        </div>

        <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, marginBottom: 16 }}>
          {userEmail}
        </div>

        {/* Language */}
        <div style={sectionBox}>
          <div style={sectionTitle}>🌐 {t("settings_language", lang)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            {(["ja", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                style={{
                  flex: 1,
                  background: language === l ? "#ad001c" : "#fff",
                  color: language === l ? "#fff" : "#8a7560",
                  border: `2px solid ${language === l ? "#ad001c" : "#e8c99a"}`,
                  borderRadius: 12,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {l === "ja" ? "🇯🇵 日本語" : "🇺🇸 English"}
              </button>
            ))}
          </div>
        </div>

        {/* App mode (Local/Traveler) */}
        <div style={sectionBox}>
          <div style={sectionTitle}>🎭 利用モード</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setAppMode("traveler")}
              style={{ flex: 1, background: appMode === "traveler" ? "#ad001c" : "#fff", color: appMode === "traveler" ? "#fff" : "#8a7560", border: `2px solid ${appMode === "traveler" ? "#ad001c" : "#e8c99a"}`, borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >
              ✈️ Traveler
            </button>
            <button
              onClick={() => setAppMode("local")}
              style={{ flex: 1, background: appMode === "local" ? "#2e8b57" : "#fff", color: appMode === "local" ? "#fff" : "#8a7560", border: `2px solid ${appMode === "local" ? "#2e8b57" : "#e8c99a"}`, borderRadius: 12, padding: "10px 0", fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
            >
              🏯 Local
            </button>
          </div>
          <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, marginTop: 8, lineHeight: 1.5 }}>
            Traveler = 旅行者として使う / Local = ガイドとして使う
          </div>
        </div>

        {/* Notifications */}
        <div style={sectionBox}>
          <div style={sectionTitle}>🔔 {t("settings_notifications", lang)}</div>
          <div style={row}>
            <div style={label}>{t("settings_email_new_msg", lang)}</div>
            <Toggle on={emailMsg} onChange={setEmailMsg} />
          </div>
          <div style={{ ...row, borderBottom: "none" }}>
            <div style={label}>{t("settings_email_booking", lang)}</div>
            <Toggle on={emailBook} onChange={setEmailBook} />
          </div>
        </div>

        {/* Privacy */}
        <div style={sectionBox}>
          <div style={sectionTitle}>🔒 {t("settings_privacy", lang)}</div>
          <div style={{ ...row, borderBottom: "none" }}>
            <div style={label}>{t("settings_show_to_anon", lang)}</div>
            <Toggle on={showAnon} onChange={setShowAnon} />
          </div>
        </div>

        <button onClick={onSave} disabled={status === "saving"} style={{ ...primary, opacity: status === "saving" ? 0.6 : 1, marginBottom: 14 }}>
          {status === "saving" ? "..." : status === "saved" ? t("settings_saved", lang) : t("settings_save", lang)}
        </button>

        {/* Account */}
        <div style={sectionBox}>
          <div style={sectionTitle}>👤 {t("settings_account", lang)}</div>
          <form action={signout} style={{ marginBottom: 10 }}>
            <button type="submit" style={danger}>{t("settings_logout", lang)}</button>
          </form>
        </div>

        {/* About */}
        <div style={sectionBox}>
          <div style={sectionTitle}>ℹ️ {t("settings_about", lang)}</div>
          <div style={{ fontSize: 12, color: "#1a1008", lineHeight: 1.6 }}>
            {t("settings_about_text", lang)}
          </div>
          <div style={{ fontSize: 10, color: "#8a7560", fontWeight: 700, marginTop: 8 }}>
            v0.5 · 2026
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 50,
        height: 28,
        borderRadius: 14,
        background: on ? "#2e8b57" : "#ddd0b0",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
      }}
      aria-pressed={on}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: on ? 25 : 3,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
