"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

const wrap: React.CSSProperties = { background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "saving" | "ok" | "error"; msg?: string }>({ status: "idle" });

  // Supabase は recovery リンク経由でアクセスされた時に PASSWORD_RECOVERY イベントを出す
  // それを掴むまでフォームを enable しない
  useEffect(() => {
    const supabase = createClient();
    // 既にセッションがあれば（リカバリ完了済みケース）即 enable
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
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
      <div style={card}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
          <span style={{ color: "#2ecc71" }}>Noma</span>
          <span style={{ color: "#ad001c" }}>Domo</span>
        </div>
        <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, marginBottom: 28 }}>
          新しいパスワードを設定
        </div>

        {!ready ? (
          <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 16, color: "#ad001c", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            ⚠️ このページはパスワード再設定メールのリンクから開いてね。<br/>
            直接アクセスしても何もできないわよ。<br/>
            <br/>
            メール内リンクをクリックしてからここに来てるならちょっと待って、リカバリセッション確認中…
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
