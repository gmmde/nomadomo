"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useLang, t, type Lang } from "@/app/lib/i18n";
import { signout } from "@/app/actions/auth";
import { unblockUser } from "@/app/actions/blocks";
import { requestAccountDeletion } from "@/app/actions/account";

type Initial = {
  language: Lang;
  email_on_new_message: boolean;
  email_on_booking: boolean;
  show_to_anon: boolean;
  app_mode: 'local' | 'traveler' | null;
};
type BlockedUser = { user_id: string; name: string; emoji: string };

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const sectionBox: React.CSSProperties = { background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 14, marginBottom: 14 };
const sectionTitle: React.CSSProperties = { fontSize: 11, color: "#8a7560", fontWeight: 900, marginBottom: 10, textTransform: "uppercase" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0d9b5" };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#1a1008", flex: 1 };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };
const danger: React.CSSProperties = { width: "100%", background: "#fff", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function SettingsForm({ userEmail, initial, blockedList }: { userEmail: string; initial: Initial; blockedList: BlockedUser[] }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>(blockedList);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  // 初回マウントで DB の language を localStorage に同期 (Settings 開いて差分があったら即適用)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const current = localStorage.getItem("noma_lang");
    if (current !== initial.language) {
      localStorage.setItem("noma_lang", initial.language);
      setLang(initial.language);
      window.dispatchEvent(new StorageEvent("storage", { key: "noma_lang", newValue: initial.language }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onConfirmDelete() {
    setDeletePending(true);
    const r = await requestAccountDeletion();
    setDeletePending(false);
    if (r?.error) {
      alert(r.error);
      return;
    }
    setShowDeleteConfirm(false);
    // ホームに戻すと AccountDeletionPrompt が出る (30 日 grace 表示)
    router.push("/");
  }


  async function onUnblock(targetId: string) {
    setUnblockingId(targetId);
    const r = await unblockUser(targetId);
    setUnblockingId(null);
    if (r?.success) {
      setBlocked((prev) => prev.filter((b) => b.user_id !== targetId));
    } else if (r?.error) {
      alert(r.error);
    }
  }

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
      alert(t("settings_save_failed", lang) + ": " + error.message);
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
            {(["en", "ja"] as Lang[]).map((l) => (
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
                {l === "en" ? "🇺🇸 English" : "🇯🇵 日本語"}
              </button>
            ))}
          </div>
        </div>

        {/* App mode (Local/Traveler) */}
        <div style={sectionBox}>
          <div style={sectionTitle}>🎭 {t("settings_app_mode_title", lang)}</div>
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
            {t("settings_app_mode_hint", lang)}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!confirm(t("settings_reset_mode_confirm", lang))) return;
              const supabase = createClient();
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              await supabase.from("user_settings").upsert({ user_id: user.id, app_mode: null }, { onConflict: "user_id" });
              setAppMode(null);
              alert(t("settings_reset_mode_done", lang));
              window.location.href = "/";
            }}
            style={{ width: "100%", marginTop: 10, background: "#fff", color: "#8a7560", border: "1.5px dashed #e8c99a", borderRadius: 12, padding: 8, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
          >
            🔄 {t("settings_reset_mode_btn", lang)}
          </button>
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

        {/* Blocked users */}
        <div style={sectionBox}>
          <div style={sectionTitle}>🚫 {t("blocked_users_section", lang)}</div>
          {blocked.length === 0 ? (
            <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, padding: "8px 0" }}>
              {t("blocked_users_empty", lang)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {blocked.map((b) => (
                <div key={b.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid #f0d9b5" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#ffefd5", border: "2px solid #e8c99a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{b.emoji}</div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: "#1a1008" }}>{b.name}</div>
                  <button
                    onClick={() => onUnblock(b.user_id)}
                    disabled={unblockingId === b.user_id}
                    style={{ background: "transparent", color: "#2e8b57", border: "2px solid #2e8b57", borderRadius: 12, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: unblockingId === b.user_id ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: unblockingId === b.user_id ? 0.6 : 1 }}
                    type="button"
                  >
                    {unblockingId === b.user_id ? "..." : t("unblock_btn", lang)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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

        {/* Danger zone: アカウント削除 */}
        <div style={{ ...sectionBox, border: "2px solid #ad001c", marginTop: 8 }}>
          <div style={{ ...sectionTitle, color: "#ad001c" }}>⚠️ {lang === "ja" ? "危険ゾーン" : "Danger zone"}</div>
          <div style={{ fontSize: 12, color: "#5a4a18", fontWeight: 600, lineHeight: 1.6, marginBottom: 12 }}>
            {lang === "ja"
              ? "アカウント削除をリクエストすると、30日後にデータが完全削除されるわよ。途中で取り消すこともできるから安心して。"
              : "Requesting deletion schedules full removal in 30 days. You can cancel anytime before that."}
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            style={{ width: "100%", background: "transparent", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" }}
          >
            🗑 {lang === "ja" ? "アカウントを削除する" : "Delete my account"}
          </button>
        </div>
      {showDeleteConfirm && (
        <div onClick={() => !deletePending && setShowDeleteConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(20,8,4,0.7)", backdropFilter: "blur(2px)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "#fff9f0", border: "3px solid #ad001c", borderRadius: 18, padding: 22, fontFamily: "inherit" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 6 }}>🗑</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: "#1a1008", textAlign: "center", marginBottom: 10 }}>
              {lang === "ja" ? "本当に削除する?" : "Really delete?"}
            </div>
            <div style={{ fontSize: 12, color: "#5a4a18", fontWeight: 600, lineHeight: 1.6, background: "#fff3cd", border: "2px solid #f5c649", borderRadius: 10, padding: 10, marginBottom: 14 }}>
              {lang === "ja"
                ? "30日間は復活可能。期限を過ぎるとプロフィール・チャット・レビュー含め全部消えるわよ"
                : "Reversible within 30 days. After that everything including profile, chats, and reviews is gone."}
            </div>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={deletePending}
              style={{ width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: deletePending ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 8, opacity: deletePending ? 0.6 : 1 }}
            >
              {deletePending ? "..." : (lang === "ja" ? "30日後に削除予約する" : "Schedule deletion (30 days)")}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deletePending}
              style={{ width: "100%", background: "transparent", color: "#8a7560", border: "2px solid #e8c99a", borderRadius: 14, padding: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
            >
              {lang === "ja" ? "キャンセル" : "Cancel"}
            </button>
          </div>
        </div>
      )}
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
