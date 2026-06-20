"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signin, type AuthState } from "@/app/actions/auth";
import AuthSplash from "@/app/_components/auth-splash";
import { useLang, t } from "@/app/lib/i18n";
import LangToggle from "@/app/_components/lang-toggle";

const wrapStyle: React.CSSProperties = {
  background: "#fff8ec",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
};
const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  minHeight: "100vh",
  background: "#fff8ec",
  padding: "46px 22px 40px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#fff",
  border: "1px solid #ecdcc4",
  borderRadius: 13,
  padding: "13px 15px",
  fontSize: 14.5,
  fontWeight: 600,
  color: "#2b1d1a",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#ad001c",
  marginBottom: 7,
  textTransform: "uppercase",
  letterSpacing: ".05em",
};
const btnPrimary: React.CSSProperties = {
  width: "100%",
  background: "#ad001c",
  color: "#fff",
  border: "none",
  borderRadius: 14,
  padding: 15,
  fontSize: 15.5,
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: "inherit",
  boxShadow: "0 10px 22px -12px rgba(173,0,28,.7)",
};

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signin, undefined);
  const [lang] = useLang();

  return (
    <div style={{ ...wrapStyle, position: "relative" }}>
      <LangToggle position="absolute" topRight={true} />
      <div style={cardStyle}>
<AuthSplash subtitle={t("login_subtitle", lang)} />

        <form action={action}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle} htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required style={inputStyle} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle} htmlFor="password">{t("password_label", lang)}</label>
            <input id="password" name="password" type="password" required minLength={8} style={inputStyle} placeholder={t("password_placeholder", lang)} />
          </div>

          {(state?.errorCode || state?.error) && (
            <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
              {state.errorCode ? t(state.errorCode as Parameters<typeof t>[0], lang) : state.error}
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
