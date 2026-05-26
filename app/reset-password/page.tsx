"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

const wrap: React.CSSProperties = { minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [bootMsg, setBootMsg] = useState<string>("リカバリセッション確認中…");
  const [state, setState] = useState<{ status: "idle" | "saving" | "ok" | "error"; msg?: string }>({ status: "idle" });

  // recovery 経由でアクセスされた時の認証ハンドリング
  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const url = new URL(window.location.href);

      // 1. Supabase からのエラー (?error=... or ?error_description=...)
      const error = url.searchParams.get("error") ?? url.hash.match(/error=([^&]+)/)?.[1];
      const errorDesc = url.searchParams.get("error_description") ?? url.hash.match(/error_description=([^&]+)/)?.[1];
      if (error) {
        setBootMsg(`❌ Supabase エラー: ${error}${errorDesc ? ` - ${decodeURIComponent(errorDesc).replace(/\+/g, " ")}` : ""}`);
        return;
      }

      // 2. PKCE フロー: ?code=xxx で来る
      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          setBootMsg(`❌ code 交換失敗: ${exErr.message}`);
          return;
        }
        setReady(true);
        // URL の code を消す
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
        return;
      }

      // 3. OTP/暗黙フロー: #access_token=... で来る
      if (window.location.hash.includes("access_token")) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (setErr) {
            setBootMsg(`❌ セッション復元失敗: ${setErr.message}`);
            return;
          }
          setReady(true);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
      }

      // 4. 既にセッションあり (リロード後)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        return;
      }

      // 5. 何もない: 直接アクセス or 期限切れ
      setBootMsg("⚠️ このページはパスワード再設定メールのリンクから開いて。\n直接アクセスしても何もできないわよ。\nリンクが期限切れ (1時間) の可能性もあるから、もう一度送り直して。");
    }

    init();

    // PASSWORD_RECOVERY イベントも保険で監視
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setState({ status: "error", msg: "パスワードは8文字以上にして" });
      return;
    }
    if (password !== confirm) {
      setState({ status: "error", msg: "確認用パスワードが一致しないわよ" });
      return;
    }
    setState({ status: "saving" });
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setState({ status: "error", msg: error.message });
      return;
    }
    setState({ status: "ok" });
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
          <span style={{ color: "#2ecc71" }}>Noma</span>
          <span style={{ color: "#ad001c" }}>Domo</span>
        </div>
        <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, marginBottom: 28 }}>
          新しいパスワードを設定
        </div>

        {!ready ? (
          <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 16, color: "#ad001c", fontSize: 13, fontWeight: 700, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {bootMsg}
          </div>
        ) : state.status === "ok" ? (
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 12, padding: 16, color: "#2e8b57", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            ✅ パスワード更新したわ。ホームに飛ばすわよ…
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="password">新しいパスワード</label>
              <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={input} placeholder="8文字以上" />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={label} htmlFor="confirm">確認（もう一度）</label>
              <input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={input} placeholder="同じパスワード" />
            </div>

            {state.status === "error" && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.msg ?? "更新失敗"}
              </div>
            )}

            <button type="submit" disabled={state.status === "saving"} style={{ ...primary, opacity: state.status === "saving" ? 0.6 : 1 }}>
              {state.status === "saving" ? "更新中…" : "パスワードを更新"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, fontSize: 13, textAlign: "center" }}>
          <Link href="/login" style={{ color: "#8a7560", fontWeight: 700 }}>← ログインに戻る</Link>
        </div>
      </div>
    </div>
  );
}
