"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthState } from "@/app/actions/auth";
import BrandLogo from "@/app/_components/brand-logo";
import { useLang, t } from "@/app/lib/i18n";
import LangToggle from "@/app/_components/lang-toggle";

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
  background: "#2e8b57",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: 16,
  fontSize: 16,
  fontWeight: 900,
  cursor: "pointer",
  fontFamily: "inherit",
};

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);
  const [lang] = useLang();

  return (
    <div style={{ ...wrapStyle, position: "relative" }}>
      <LangToggle position="absolute" topRight={true} />
      <div style={cardStyle}>
        <div style={{ marginBottom: 4 }}>
          <BrandLogo variant="text" size={28} />
        </div>
        <div style={{ fontSize: 14, color: "#8a7560", fontWeight: 700, marginBottom: 28 }}>
          {t("signup_subtitle", lang)}
        </div>

        {state?.checkEmail ? (
          <div style={{ background: "#fff3cd", border: "2px solid #f5c649", borderRadius: 14, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 28, textAlign: "center", marginBottom: 6 }}>📬</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#1a1008", textAlign: "center", marginBottom: 8 }}>
              {t("signup_check_email_title", lang)}
            </div>
            <div style={{ fontSize: 13, color: "#5a4a18", fontWeight: 600, lineHeight: 1.6 }}>
              {t("signup_check_email_body", lang).replace("{email}", state.email ?? "")}
            </div>
          </div>
        ) : (
          <>
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
                {pending ? t("signing_up", lang) : t("signup_btn", lang)}
              </button>
            </form>

            <div style={{ marginTop: 16, fontSize: 11, color: "#8a7560", lineHeight: 1.6, fontWeight: 600 }}>
              {t("signup_email_confirm_note", lang)}
            </div>
          </>
        )}

        <div style={{ marginTop: 20, fontSize: 13, color: "#8a7560", textAlign: "center", fontWeight: 700 }}>
          {t("have_account", lang)}{" "}
          <Link href="/login" style={{ color: "#ad001c", fontWeight: 800 }}>{t("signin_btn", lang)}</Link>
        </div>
        <div style={{ marginTop: 24, fontSize: 13, textAlign: "center" }}>
          <Link href="/" style={{ color: "#8a7560", fontWeight: 700 }}>{t("back_home_arrow", lang)}</Link>
        </div>
      </div>
    </div>
  );
}
