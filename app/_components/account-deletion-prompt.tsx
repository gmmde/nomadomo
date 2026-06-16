"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAccountDeletion } from "../actions/account";
import { signout } from "../actions/auth";

type Props = {
  scheduledAt: string;
};

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9999,
  background: "rgba(20,8,4,0.78)", backdropFilter: "blur(3px)",
  display: "flex", justifyContent: "center", alignItems: "center",
  padding: 20,
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 360, background: "#fff9f0",
  border: "3px solid #ad001c", borderRadius: 20, padding: 22,
  boxShadow: "0 14px 36px rgba(0,0,0,0.4)", fontFamily: "inherit",
};

export default function AccountDeletionPrompt({ scheduledAt }: Props) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const daysLeft = Math.max(0, Math.ceil((new Date(scheduledAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  function onCancel() {
    setErr(null);
    startTransition(async () => {
      const r = await cancelAccountDeletion();
      if (r?.error) { setErr(r.error); return; }
      // 復活完了 → ホームにリロード
      router.refresh();
      window.location.href = "/";
    });
  }

  async function onLogout() {
    // continue with deletion = signout (server action は引数なし)
    await signout();
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#1a1008", textAlign: "center", marginBottom: 10 }}>
          アカウント削除予定
        </div>
        <div style={{ fontSize: 13, color: "#5a4a18", lineHeight: 1.6, marginBottom: 16 }}>
          このアカウントは <strong style={{ color: "#ad001c" }}>あと {daysLeft} 日</strong> で完全に削除されるわよ。<br /><br />
          「削除を取り消す」を押すと普段通り使えるようになる。<br />
          このままログアウトすれば予定通り削除されるわよ。
        </div>
        {err && (
          <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, marginBottom: 10 }}>{err}</div>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          style={{ width: "100%", background: "#2e8b57", color: "#fff", border: "none", borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit", marginBottom: 8, opacity: pending ? 0.6 : 1 }}
        >
          ✅ {pending ? "..." : "削除を取り消して使い続ける"}
        </button>
        <button
          type="button"
          onClick={onLogout}
          disabled={pending}
          style={{ width: "100%", background: "transparent", color: "#8a7560", border: "2px solid #e8c99a", borderRadius: 14, padding: 12, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
        >
          このままログアウト (削除進行)
        </button>
      </div>
    </div>
  );
}
