"use client";

import { useState, useTransition } from "react";
import { setDisplayName } from "@/app/actions/user-settings";
import { useLang, t } from "@/app/lib/i18n";
import BrandLogo from "./brand-logo";
import LangToggle from "./lang-toggle";

const wrap: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 998,
  background: "#f5ead0",
  display: "flex", justifyContent: "center", alignItems: "flex-start",
  padding: "40px 20px 24px", overflowY: "auto",
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 360, background: "transparent",
  display: "flex", flexDirection: "column", gap: 16,
  fontFamily: "inherit",
};
const input: React.CSSProperties = {
  width: "100%", background: "#fff9f0", border: "2px solid #e8c99a",
  borderRadius: 14, padding: "14px 16px", fontSize: 18, fontWeight: 700,
  color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  letterSpacing: "0.02em",
};
const btnPrimary: React.CSSProperties = {
  width: "100%", background: "#ad001c", color: "#fff", border: "none",
  borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer",
  fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  width: "100%", background: "transparent", color: "#8a7560",
  border: "2px solid #e8c99a", borderRadius: 14, padding: 12, fontSize: 13,
  fontWeight: 800, cursor: "pointer", fontFamily: "inherit",
};

type Props = {
  onComplete: () => void;
};

export default function NameInputScreen({ onComplete }: Props) {
  const [name, setName] = useState("");
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [lang] = useLang();

  function validate(s: string): string | null {
    const t1 = s.trim().replace(/ +/g, " ");
    if (t1.length < 2 || t1.length > 30) {
      return lang === "ja" ? "2〜30 文字で入力してね" : "Use 2-30 characters";
    }
    if (!/^[A-Za-z][A-Za-z ]+[A-Za-z]$/.test(t1)) {
      return lang === "ja"
        ? "ローマ字 (A-Z, a-z) と半角スペースだけ使えるわよ。先頭・末尾はスペース不可"
        : "Only A-Z, a-z, and spaces. No leading/trailing space.";
    }
    return null;
  }

  function onProceed() {
    setErr(null);
    const v = validate(name);
    if (v) { setErr(v); return; }
    setStep("confirm");
  }

  function onConfirm() {
    setErr(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("display_name", name.trim().replace(/ +/g, " "));
      const r = await setDisplayName(fd);
      if (r?.error) {
        setErr(r.error);
        setStep("input");
        return;
      }
      onComplete();
    });
  }

  const normalizedPreview = name.trim().replace(/ +/g, " ");

  return (
    <div style={wrap}>
      <LangToggle position="absolute" topRight={true} />
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <BrandLogo variant="full" size={26} camelHeight={70} />
        </div>

        {step === "input" ? (
          <>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#1a1008", textAlign: "center" }}>
              {lang === "ja" ? "あなたの名前を教えて" : "What's your name?"}
            </div>
            <div style={{ fontSize: 12, color: "#5a4a18", lineHeight: 1.6, fontWeight: 600, background: "#fff3cd", border: "2px solid #f5c649", borderRadius: 12, padding: 12 }}>
              ⚠️ {lang === "ja"
                ? "一度登録すると二度と変更できないわよ。慎重に入力してね。"
                : "Once set, your name cannot be changed. Please enter it carefully."}
            </div>
            <div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input}
                placeholder={lang === "ja" ? "Taro Yamada" : "Your name"}
                maxLength={30}
                autoFocus
                spellCheck={false}
                autoComplete="off"
              />
              <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, marginTop: 6, lineHeight: 1.5 }}>
                {lang === "ja"
                  ? "ローマ字 (A-Z, a-z) と半角スペースのみ、2〜30 文字"
                  : "Only A-Z, a-z, and spaces. 2-30 characters."}
              </div>
            </div>
            {err && (
              <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, lineHeight: 1.5 }}>{err}</div>
            )}
            <button onClick={onProceed} disabled={pending} style={btnPrimary} type="button">
              {lang === "ja" ? "次へ →" : "Next →"}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#1a1008", textAlign: "center" }}>
              {lang === "ja" ? "この名前で登録する？" : "Save this name?"}
            </div>
            <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: 18, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                {lang === "ja" ? "あなたの名前" : "Your name"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#1a1008", letterSpacing: "0.02em" }}>
                {normalizedPreview}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#5a4a18", lineHeight: 1.6, fontWeight: 600, background: "#fff3cd", border: "2px solid #f5c649", borderRadius: 12, padding: 12 }}>
              ⚠️ {lang === "ja"
                ? "この名前は二度と変更できないわよ。本当にこれでいい？"
                : "This name cannot be changed later. Sure this is the one?"}
            </div>
            {err && (
              <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, lineHeight: 1.5 }}>{err}</div>
            )}
            <button onClick={onConfirm} disabled={pending} style={{ ...btnPrimary, opacity: pending ? 0.6 : 1 }} type="button">
              {pending ? "..." : (lang === "ja" ? "✓ 確定する" : "✓ Confirm")}
            </button>
            <button onClick={() => setStep("input")} disabled={pending} style={btnSecondary} type="button">
              {lang === "ja" ? "← 戻って修正" : "← Go back and edit"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
