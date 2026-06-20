"use client";
import BackButton from "@/app/lib/back-button";

import { useState } from "react";
import AuthSplash from "@/app/_components/auth-splash";
import { createClient } from "@/app/lib/supabase/client";
import { useLang, t } from "@/app/lib/i18n";

const wrap: React.CSSProperties = { background: "#fff8ec", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 400, minHeight: "100vh", background: "#fff8ec", padding: "46px 22px 40px" };
const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #ecdcc4", borderRadius: 13, padding: "13px 15px", fontSize: 14.5, fontWeight: 600, color: "#2b1d1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#ad001c", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 15, fontSize: 15.5, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 22px -12px rgba(173,0,28,.7)" };

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ status: "idle" | "sending" | "ok" | "error"; msg?: string }>({ status: "idle" });
  const [lang] = useLang();

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
<AuthSplash subtitle={t("forgot_desc", lang)} />

        {state.status === "ok" ? (
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 12, padding: 16, color: "#2e8b57", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            {t("reset_sent", lang)}<br/>
            <strong>{email}</strong>
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
                {state.msg ?? "Send failed"}
              </div>
            )}

            <button type="submit" disabled={state.status === "sending"} style={{ ...primary, opacity: state.status === "sending" ? 0.6 : 1 }}>
              {state.status === "sending" ? t("sending", lang) : t("send_reset_email", lang)}
            </button>
          </form>
        )}

        <div style={{ marginTop: 24, fontSize: 13, textAlign: "center" }}>
          <BackButton />
        </div>
      </div>
    </div>
  );
}
