"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signin, type AuthState } from "@/app/actions/auth";
import { useLang, t } from "@/app/lib/i18n";

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
  const [state, action, pending] = useActionState<AuthState, FormData>(signin, undefined);
  const [lang] = useLang();

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
          <span style={{ color: "#2ecc71" }}>Noma</span>
          <span style={{ color: "#ad001c" }}>Domo</span>
        </div>
        <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, marginBottom: 28 }}>
          {t("login_subtitle", lang)}
        </div>

        <form action={action}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required style={inputStyle} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle} htmlFor="password">{t("password_label", lang)}</label>
            <input id="password" name="password" type="password" required minLength={8} style={inputStyle} placeholder={t("password_placeholder", lang)} />
          </div>

          {state?.error && (
            <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.6 : 1 }}>
            {pending ? t("signing_in", lang) : t("signin_btn", lang)}
          </button>
        </form>

        <div style={{ marginTop: 14, fontSize: 13, textAlign: "center" }}>
          <Link href="/forgot-password" style={{ color: "#8a7560", fontWeight: 700, textDecoration: "underline" }}>
            {t("forgot_password_link", lang)}
          </Link>
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: "#8a7560", textAlign: "center", fontWeight: 700 }}>
          {t("no_account", lang)}{" "}
          <Link href="/signup" style={{ color: "#ad001c", fontWeight: 800 }}>{t("signup_link", lang)}</Link>
        </div>
        <div style={{ marginTop: 24, fontSize: 13, textAlign: "center" }}>
          <Link href="/" style={{ color: "#8a7560", fontWeight: 700 }}>{t("back_home_arrow", lang)}</Link>
        </div>
      </div>
    </div>
  );
}
