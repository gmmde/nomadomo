"use client";
import BackButton from "@/app/lib/back-button";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useLang, t } from "@/app/lib/i18n";
import AuthSplash from "@/app/_components/auth-splash";

const wrap: React.CSSProperties = { background: "#fff8ec", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 400, minHeight: "100vh", padding: "46px 22px 40px" };
const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #ecdcc4", borderRadius: 13, padding: "13px 15px", fontSize: 14.5, fontWeight: 600, color: "#2b1d1a", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#ad001c", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 14, padding: 15, fontSize: 15.5, fontWeight: 900, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 22px -12px rgba(173,0,28,.7)" };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [bootMsg, setBootMsg] = useState<string>("Verifying recovery session…");
  const [state, setState] = useState<{ status: "idle" | "saving" | "ok" | "error"; msg?: string }>({ status: "idle" });
  const [lang] = useLang();

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const url = new URL(window.location.href);

      const error = url.searchParams.get("error") ?? url.hash.match(/error=([^&]+)/)?.[1];
      const errorDesc = url.searchParams.get("error_description") ?? url.hash.match(/error_description=([^&]+)/)?.[1];
      if (error) {
        setBootMsg(`❌ Supabase error: ${error}${errorDesc ? ` - ${decodeURIComponent(errorDesc).replace(/\+/g, " ")}` : ""}`);
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          setBootMsg(`❌ Code exchange failed: ${exErr.message}`);
          return;
        }
        setReady(true);
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.toString());
        return;
      }

      if (window.location.hash.includes("access_token")) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          const { error: setErr } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (setErr) {
            setBootMsg(`❌ Session restore failed: ${setErr.message}`);
            return;
          }
          setReady(true);
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setReady(true);
        return;
      }

      setBootMsg("⚠️ Open this page from the password-reset email link. Direct access doesn't work. The link may have expired (1 hour) — request a new one.");
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password.length < 8) {
      setState({ status: "error", msg: lang === "ja" ? "パスワードは8文字以上にして" : "Password must be at least 8 characters" });
      return;
    }
    if (password !== confirm) {
      setState({ status: "error", msg: lang === "ja" ? "確認用パスワードが一致しないわよ" : "Passwords do not match" });
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
<AuthSplash subtitle={t("reset_title", lang)} />

        {!ready ? (
          <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 16, color: "#ad001c", fontSize: 13, fontWeight: 700, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {bootMsg}
          </div>
        ) : state.status === "ok" ? (
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 12, padding: 16, color: "#2e8b57", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            {t("reset_done", lang)}
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="password">{t("reset_new_password", lang)}</label>
              <input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} style={input} placeholder={t("password_placeholder", lang)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={label} htmlFor="confirm">{lang === "ja" ? "確認（もう一度）" : "Confirm (again)"}</label>
              <input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} style={input} placeholder={lang === "ja" ? "同じパスワード" : "Same password"} />
            </div>

            {state.status === "error" && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.msg ?? "Update failed"}
              </div>
            )}

            <button type="submit" disabled={state.status === "saving"} style={{ ...primary, opacity: state.status === "saving" ? 0.6 : 1 }}>
              {state.status === "saving" ? t("sending", lang) : t("reset_save_btn", lang)}
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
