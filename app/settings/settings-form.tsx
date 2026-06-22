"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useLang, t, type Lang } from "@/app/lib/i18n";
import { signout } from "@/app/actions/auth";
import { unblockUser } from "@/app/actions/blocks";
import { requestAccountDeletion } from "@/app/actions/account";
import { startSupportChat } from "@/app/actions/support";
import { isPushSupported, subscribePush, unsubscribePush, serializeSubscription, getExistingSubscription } from "@/app/lib/push";
import { saveSubscription, setPushEnabled as setPushEnabledServer } from "@/app/actions/push";

type Initial = {
  language: Lang;
  email_on_new_message: boolean;
  email_on_booking: boolean;
  show_to_anon: boolean;
  app_mode: 'local' | 'traveler' | null;
  push_enabled: boolean;
};
type BlockedUser = { user_id: string; name: string; emoji: string };

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center", background: "#fff8ec" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "16px 16px 80px" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 15, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function SettingsForm({ userEmail, initial, blockedList }: { userEmail: string; initial: Initial; blockedList: BlockedUser[] }) {
  const router = useRouter();
  const [blocked, setBlocked] = useState<BlockedUser[]>(blockedList);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [supportPending, setSupportPending] = useState(false);

  async function onContactSupport() {
    setSupportPending(true);
    const r = await startSupportChat();
    setSupportPending(false);
    if (r?.error) { alert(r.error); return; }
    if (r?.adminUserId) router.push(`/?support=${r.adminUserId}`);
  }

  async function onTogglePush(want: boolean) {
    setPushErr(null);
    setPushPending(true);
    try {
      if (want) {
        const r = await subscribePush();
        if (r.status !== "granted" || !r.subscription) {
          setPushErr(
            r.status === "denied"
              ? (lang === "ja" ? "ブラウザの通知設定で許可してから OFF→ON を切り替えてね" : "Please allow notifications in your browser settings")
              : r.status === "unsupported"
              ? (lang === "ja" ? "このブラウザは Push 非対応" : "Push not supported in this browser")
              : (lang === "ja" ? "許可されなかったわよ" : "Permission denied")
          );
          return;
        }
        const ser = serializeSubscription(r.subscription);
        if (!ser) { setPushErr("subscription parse failed"); return; }
        const saved = await saveSubscription({ ...ser, userAgent: navigator.userAgent });
        if (!saved.ok) { setPushErr(saved.error ?? "save failed"); return; }
        setPushOn(true);
      } else {
        const sub = await getExistingSubscription();
        if (sub) await unsubscribePush();
        await setPushEnabledServer(false);
        setPushOn(false);
      }
    } finally {
      setPushPending(false);
    }
  }


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
  const [pushOn, setPushOn] = useState(initial.push_enabled);
  const [pushPending, setPushPending] = useState(false);
  const [pushErr, setPushErr] = useState<string | null>(null);
  const pushSupported = typeof window !== "undefined" && isPushSupported();
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


  const langVal = language === "ja" ? "日本語" : "English";
  const modeVal = appMode === "traveler" ? "Traveler" : appMode === "local" ? "Local" : "—";

  async function onResetMode() {
    if (!confirm(t("settings_reset_mode_confirm", lang))) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_settings").upsert({ user_id: user.id, app_mode: null }, { onConflict: "user_id" });
    setAppMode(null);
    alert(t("settings_reset_mode_done", lang));
    window.location.href = "/";
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 2px 14px" }}>
          <button onClick={() => router.back()} aria-label={lang === "ja" ? "戻る" : "Back"} style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "1px solid #f0e3cf", cursor: "pointer", flex: "none" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2b1d1a" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg></button>
          <h1 className="font-display" style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>{lang === "ja" ? "設定" : "Settings"}{lang === "ja" && <span style={{ fontSize: 12, color: "#b6a48f", fontWeight: 500 }}> Settings</span>}</h1>
        </div>
        <div style={{ fontSize: 11, color: "#b6a48f", fontWeight: 600, padding: "0 4px 14px" }}>{userEmail}</div>

        {/* アカウント */}
        <Group title={lang === "ja" ? "アカウント" : "Account"}>
          <Row d={IC.profile} jp="プロフィール編集" en="Edit profile" chevron onClick={() => router.push("/travelers/edit")} />
          <Row d={IC.globe} jp="言語" en="Language" right={<Val>{langVal}</Val>} chevron onClick={() => onLangChange(language === "ja" ? "en" : "ja")} />
          <Row d={IC.swap} jp="アプリモード" en="Traveler / Local" right={<Val>{modeVal}</Val>} chevron onClick={() => setAppMode(appMode === "local" ? "traveler" : "local")} />
          <Row d={IC.reset} jp="モードを選び直す" en="Reset mode picker" chevron last onClick={onResetMode} />
        </Group>

        {/* 通知 */}
        <Group title={lang === "ja" ? "通知" : "Notifications"}>
          <Row d={IC.bell} jp="プッシュ通知" en="Push notifications" sub={!pushSupported ? (lang === "ja" ? "このブラウザ非対応" : "Not supported in this browser") : undefined}
               right={<Toggle on={pushOn} onChange={(v) => { if (!pushPending && pushSupported) onTogglePush(v); }} />} />
          {pushErr && <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, padding: "0 16px 8px 63px" }}>{pushErr}</div>}
          <Row d={IC.mail} jp="新着メッセージをメール通知" en="Email me on new messages" right={<Toggle on={emailMsg} onChange={setEmailMsg} />} />
          <Row d={IC.cal} jp="予約の更新をメール通知" en="Email me on booking updates" last right={<Toggle on={emailBook} onChange={setEmailBook} />} />
        </Group>

        {/* 予約・支払い */}
        <Group title={lang === "ja" ? "予約・支払い" : "Booking & payments"}>
          <Row d={IC.card} jp="支払い方法" en="Payment methods" right={<Val>Visa ···42</Val>} chevron last onClick={() => alert(lang === "ja" ? "支払い方法の管理は準備中よ" : "Payment methods management is coming soon")} />
        </Group>

        {/* プライバシー */}
        <Group title={lang === "ja" ? "プライバシー" : "Privacy"}>
          <Row d={IC.eye} jp="未ログイン訪問者にプロフィールを表示" en="Show my profile to logged-out visitors" last={blocked.length === 0} right={<Toggle on={showAnon} onChange={setShowAnon} />} />
          {blocked.length > 0 && blocked.map((b, idx) => (
            <div key={b.user_id} style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 16px", borderBottom: idx === blocked.length - 1 ? "none" : "1px solid #f4ead7" }}>
              <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 11, background: "#ffe7ea", flex: "none", fontSize: 17 }}>{b.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-display" style={{ fontWeight: 700, fontSize: 14, color: "#2b1d1a", lineHeight: 1.2 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "#a8978a", marginTop: 1 }}>{lang === "ja" ? "ブロック中" : "Blocked"}</div>
              </div>
              <button onClick={() => onUnblock(b.user_id)} disabled={unblockingId === b.user_id} type="button"
                style={{ background: "transparent", color: "#2e8b57", border: "1.5px solid #2e8b57", borderRadius: 11, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: unblockingId === b.user_id ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: unblockingId === b.user_id ? 0.6 : 1, flex: "none" }}>
                {unblockingId === b.user_id ? "..." : t("unblock_btn", lang)}
              </button>
            </div>
          ))}
        </Group>

        <button onClick={onSave} disabled={status === "saving"} style={{ ...primary, opacity: status === "saving" ? 0.6 : 1, marginBottom: 18 }}>
          {status === "saving" ? "..." : status === "saved" ? t("settings_saved", lang) : t("settings_save", lang)}
        </button>

        {/* サポート */}
        <Group title={lang === "ja" ? "サポート" : "Support"}>
          <Row d={IC.chat} jp="開発者に連絡" en="Contact the developer" sub={supportPending ? "..." : undefined} chevron onClick={() => { if (!supportPending) onContactSupport(); }} />
          <Row d={IC.help} jp="ヘルプセンター" en="Help center" chevron onClick={() => alert(lang === "ja" ? "ヘルプセンターは準備中よ" : "Help center is coming soon")} />
          <Row d={IC.doc} jp="利用規約" en="Terms of service" chevron onClick={() => router.push("/terms")} />
          <Row d={IC.shield} jp="プライバシーポリシー" en="Privacy policy" chevron onClick={() => router.push("/privacy")} />
          <Row d={IC.info} jp="このアプリについて" en="About NomaDomo" right={<Val>v0.5</Val>} last />
        </Group>

        {/* 危険ゾーン */}
        <Group title=" ">
          <Row d={IC.trash} jp="アカウントを削除" en="Delete my account" danger chevron onClick={() => setShowDeleteConfirm(true)} />
          <Row d={IC.logout} jp="ログアウト" en="Log out" danger last onClick={() => signout()} chevron />
        </Group>

        <div style={{ height: 24 }} />

      {showDeleteConfirm && (
        <div onClick={() => !deletePending && setShowDeleteConfirm(false)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(20,8,4,0.7)", backdropFilter: "blur(2px)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "#fff8ec", border: "1px solid #f3e8d6", borderRadius: 22, padding: 22, fontFamily: "inherit", boxShadow: "0 20px 50px -20px rgba(120,50,20,.5)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 6 }}>🗑</div>
            <div className="font-display" style={{ fontSize: 18, fontWeight: 900, color: "#2b1d1a", textAlign: "center", marginBottom: 10 }}>
              {lang === "ja" ? "本当に削除する?" : "Really delete?"}
            </div>
            <div style={{ fontSize: 12, color: "#7a6452", fontWeight: 600, lineHeight: 1.6, background: "#fff", border: "1px solid #f3e8d6", borderRadius: 12, padding: 12, marginBottom: 14 }}>
              {lang === "ja"
                ? "30日間は復活可能。期限を過ぎるとプロフィール・チャット・レビュー含め全部消えるわよ"
                : "Reversible within 30 days. After that everything including profile, chats, and reviews is gone."}
            </div>
            <button type="button" onClick={onConfirmDelete} disabled={deletePending}
              style={{ width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: deletePending ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 8, opacity: deletePending ? 0.6 : 1 }}>
              {deletePending ? "..." : (lang === "ja" ? "30日後に削除予約する" : "Schedule deletion (30 days)")}
            </button>
            <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deletePending}
              style={{ width: "100%", background: "transparent", color: "#8a7560", border: "1px solid #e8d8c0", borderRadius: 14, padding: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
              {lang === "ja" ? "キャンセル" : "Cancel"}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

const IC = {
  profile: '<circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />',
  globe: '<circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" />',
  swap: '<path d="M16 3l4 4-4 4" /><path d="M20 7H8a4 4 0 0 0-4 4v1" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h12a4 4 0 0 0 4-4v-1" />',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" />',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" />',
  card: '<rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20.5l1.5-5.2A8.4 8.4 0 1 1 21 11.5z" />',
  help: '<circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.5-2 2-2 3.5" /><circle cx="12" cy="17" r=".6" />',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" />',
  shield: '<path d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6z" />',
  info: '<circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><circle cx="12" cy="8" r=".6" />',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M6 6l1 14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-14" />',
} as const;

function Tile({ d, danger = false }: { d: string; danger?: boolean }) {
  return (
    <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 11, background: danger ? "#ffe7ea" : "#ffefd5", flex: "none" }}>
      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#ad001c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
    </span>
  );
}

function Val({ children }: { children: React.ReactNode }) {
  return <span style={{ fontSize: 12.5, color: "#9a8a7c", fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>;
}

function Chevron() {
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#cbb9a4" strokeWidth={2.2}><path d="M9 6l6 6-6 6" /></svg>;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {title.trim() !== "" && <p style={{ margin: "0 0 9px 2px", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", color: "#ad001c", textTransform: "uppercase" }}>{title}</p>}
      <div style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 18, overflow: "hidden", boxShadow: "0 8px 20px -16px rgba(120,50,20,.3)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ d, jp, en, sub, danger = false, onClick, right, chevron = false, last = false }: {
  d: string; jp: string; en: string; sub?: string; danger?: boolean; onClick?: () => void; right?: React.ReactNode; chevron?: boolean; last?: boolean;
}) {
  const [lang] = useLang();
  const primary = lang === "ja" ? jp : en;
  const secondary = lang === "ja" ? en : jp;
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 13, padding: "14px 16px", borderBottom: last ? "none" : "1px solid #f4ead7", cursor: onClick ? "pointer" : "default" }}>
      <Tile d={d} danger={danger} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-display" style={{ fontWeight: 700, fontSize: 14, color: danger ? "#ad001c" : "#2b1d1a", lineHeight: 1.2 }}>{primary}</div>
        <div style={{ fontSize: 11, color: "#a8978a", marginTop: 1 }}>{secondary}</div>
        {sub && <div style={{ fontSize: 10, color: "#c0392b", fontWeight: 700, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
      {chevron && <Chevron />}
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
