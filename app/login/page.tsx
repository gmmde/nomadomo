"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signin, type AuthState } from "@/app/actions/auth";

const wrapStyle: React.CSSProperties = {
  background: "#f5ead0",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
};
const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 390,
  minHeight: "100vh",
  background: "#f5ead0",
  padding: "32px 24px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff9f0",
  border: "2px solid #e8c99a",
  borderRadius: 14,
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: "#1a1008",
  outline: "none",
  fontFamily: "inherit",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#8a7560",
  marginBottom: 6,
  textTransform: "uppercase",
};
const btnPrimary: React.CSSProperties = {
  width: "100%",
  background: "#ad001c",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: 16,
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signin,
    undefined,
  );

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
          <span style={{ color: "#2ecc71" }}>Noma</span>
          <span style={{ color: "#ad001c" }}>Domo</span>
        </div>
        <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, marginBottom: 28 }}>
          ログインしてガイドを始めよう
        </div>

        <form action={action}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required style={inputStyle} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle} htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8} style={inputStyle} placeholder="8文字以上" />
          </div>

          {state?.error && (
            <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.6 : 1 }}>
            {pending ? "ログイン中…" : "ログイン"}
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
          <Link href="/forgot-password" style={{ color: "#8a7560", fontWeight: 700, textDecoration: "underline" }}>
            パスワード忘れた？
          </Link>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: "#8a7560", textAlign: "center", fontWeight: 700 }}>
          アカウントない？{" "}
          <Link href="/signup" style={{ color: "#ad001c", fontWeight: 800 }}>新規登録</Link>
        </div>
        <div style={{ marginTop: 24, fontSize: 13, textAlign: "center" }}>
          <Link href="/" style={{ color: "#8a7560", fontWeight: 700 }}>← ホームに戻る</Link>
        </div>
      </div>
    </div>
  );
}
