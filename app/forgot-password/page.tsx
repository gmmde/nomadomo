"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

const wrap: React.CSSProperties = { background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "ok" | "error"; msg?: string }>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setState({ status: "sending" });
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) {
      setState({ status: "error", msg: error.message });
      return;
    }
    setState({ status: "ok" });
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
          <span style={{ color: "#2ecc71" }}>Noma</span>
          <span style={{ color: "#ad001c" }}>Domo</span>
        </div>
        <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, marginBottom: 28 }}>
          パスワード再設定リンクをメールで送るわよ
        </div>

        {state.status === "ok" ? (
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 12, padding: 16, color: "#2e8b57", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            ✅ <strong>{email}</strong> にリンク送ったわ。<br/>
            メール届くまで少し待って、迷惑メールフォルダも確認して。<br/>
            <br/>
            ⚠️ 注意: メール内のリンクは1時間で失効するわよ。
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={label} htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={input}
                placeholder="you@example.com"
                disabled={state.status === "sending"}
              />
            </div>

            {state.status === "error" && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.msg ?? "送信失敗"}
              </div>
            )}

            <button type="submit" disabled={state.status === "sending"} style={{ ...primary, opacity: state.status === "sending" ? 0.6 : 1 }}>
              {state.status === "sending" ? "送信中…" : "リセットリンクを送る"}
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
