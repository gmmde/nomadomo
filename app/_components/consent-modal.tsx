"use client";

// 既存ユーザ向け強制同意モーダル: 規約バージョンが上がったり、年齢確認が
// まだの場合に表示。同意するまでアプリの他の操作はブロック (全画面 overlay)。
//
// 設計: クライアントマウントで checkConsentStatus を呼び、needsConsent なら
// 全画面オーバーレイ表示。signout ボタンは出す (拒否したいユーザの避難経路)。

import { useEffect, useState } from "react";
import Link from "next/link";
import { recordConsent, checkConsentStatus } from "@/app/actions/consent";
import { signout } from "@/app/actions/auth";
import { useLang } from "@/app/lib/i18n";

export default function ConsentModal() {
  const [lang] = useLang();
  const [show, setShow] = useState(false);
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await checkConsentStatus();
      if (cancelled) return;
      if (r.needsConsent) {
        // 既に同意済みの項目はチェック済みに見せる
        setAge(r.ageOk);
        setTerms(r.termsOk);
        setPrivacy(r.privacyOk);
        setShow(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!show) return null;

  async function onAccept() {
    setErr(null);
    if (!(age && terms && privacy)) {
      setErr(lang === "ja" ? "すべてチェックしてね" : "Please check all boxes");
      return;
    }
    setPending(true);
    const r = await recordConsent({ age, terms, privacy });
    setPending(false);
    if (!r.ok) {
      setErr(r.error ?? "failed");
      return;
    }
    setShow(false);
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(20,8,4,0.65)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fdf6ec", borderRadius: 18, padding: 22, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 18px 40px rgba(0,0,0,0.4)" }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1008", marginBottom: 6, textAlign: "center" }}>
          {lang === "ja" ? "ご利用前にご確認ください" : "Before you continue"}
        </div>
        <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 600, lineHeight: 1.6, marginBottom: 14, textAlign: "center" }}>
          {lang === "ja"
            ? "サービス継続のため、年齢確認と最新の規約への同意をお願いします。"
            : "Please confirm your age and agree to our latest Terms and Privacy Policy to continue."}
        </div>

        <div style={{ background: "#ad001c", color: "#fff", borderRadius: 10, padding: "10px 12px", fontSize: 12, fontWeight: 800, marginBottom: 14, lineHeight: 1.5 }}>
          ⚠️ {lang === "ja" ? "本サービスは満18歳以上限定です" : "This service is for users aged 18 or older"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, fontWeight: 700, color: "#1a1008", cursor: "pointer" }}>
            <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
            <span style={{ lineHeight: 1.5 }}>
              {lang === "ja" ? "私は満18歳以上です。" : "I am 18 years of age or older."}
            </span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, fontWeight: 700, color: "#1a1008", cursor: "pointer" }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
            <span style={{ lineHeight: 1.5 }}>
              <Link href="/terms" target="_blank" style={{ color: "#ad001c", textDecoration: "underline", fontWeight: 800 }}>
                {lang === "ja" ? "利用規約" : "Terms of Service"}
              </Link>
              {lang === "ja" ? "に同意します。" : " — I agree."}
            </span>
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, fontWeight: 700, color: "#1a1008", cursor: "pointer" }}>
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
            <span style={{ lineHeight: 1.5 }}>
              <Link href="/privacy" target="_blank" style={{ color: "#ad001c", textDecoration: "underline", fontWeight: 800 }}>
                {lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
              </Link>
              {lang === "ja" ? "に同意します。" : " — I agree."}
            </span>
          </label>
        </div>

        {err && (
          <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, marginBottom: 10 }}>{err}</div>
        )}

        <button
          type="button"
          onClick={onAccept}
          disabled={pending}
          style={{ width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: pending ? 0.6 : 1, marginBottom: 10 }}
        >
          {pending ? "..." : (lang === "ja" ? "同意して続ける" : "I agree — continue")}
        </button>

        <form action={signout}>
          <button type="submit" style={{ width: "100%", background: "transparent", color: "#8a7560", border: "none", padding: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
            {lang === "ja" ? "同意せずログアウトする" : "Decline and sign out"}
          </button>
        </form>
      </div>
    </div>
  );
}
