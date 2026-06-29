"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup, type AuthState } from "@/app/actions/auth";
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

import { useState } from "react";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);
  const [lang] = useLang();
  const [ageOk, setAgeOk] = useState(false);
  const [termsOk, setTermsOk] = useState(false);
  const canSubmit = ageOk && termsOk && !pending;

  return (
    <div style={{ ...wrapStyle, position: "relative" }}>
      <LangToggle position="absolute" topRight={true} />
      <div style={cardStyle}>
<AuthSplash subtitle={t("signup_subtitle", lang)} />

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
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="password">{t("password_label", lang)}</label>
                <input id="password" name="password" type="password" required minLength={8} style={inputStyle} placeholder={t("password_placeholder", lang)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle} htmlFor="dob">{t("dob_label", lang)}</label>
                <input id="dob" name="dob" type="date" required max={new Date().toISOString().slice(0, 10)} style={inputStyle} />
                <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>{t("dob_hint", lang)}</div>
              </div>

              {(state?.errorCode || state?.error) && (
                <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                  {state.errorCode ? t(state.errorCode as Parameters<typeof t>[0], lang) : state.error}
                </div>
              )}

              {/* 年齢確認 + 規約同意 (両方必須) */}
              <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 8px 20px -16px rgba(120,50,20,.3)" }}>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, fontWeight: 700, color: "#1a1008", cursor: "pointer" }}>
                  <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5 }}>
                    {lang === "ja" ? "私は満18歳以上です。" : "I am 18 years of age or older."}
                  </span>
                </label>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, fontWeight: 700, color: "#1a1008", cursor: "pointer" }}>
                  <input type="checkbox" checked={termsOk} onChange={(e) => setTermsOk(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ lineHeight: 1.5 }}>
                    {lang === "ja" ? "以下に同意します：" : "I agree to the:"}{" "}
                    <Link href="/terms" target="_blank" style={{ color: "#ad001c", textDecoration: "underline", fontWeight: 800 }}>
                      {lang === "ja" ? "利用規約" : "Terms of Service"}
                    </Link>
                    {lang === "ja" ? "・" : " and "}
                    <Link href="/privacy" target="_blank" style={{ color: "#ad001c", textDecoration: "underline", fontWeight: 800 }}>
                      {lang === "ja" ? "プライバシーポリシー" : "Privacy Policy"}
                    </Link>
                  </span>
                </label>
              </div>

              <button type="submit" disabled={!canSubmit} style={{ ...btnPrimary, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? "pointer" : "not-allowed" }}>
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
