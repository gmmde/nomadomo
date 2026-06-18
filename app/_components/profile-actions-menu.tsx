"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang, t } from "../lib/i18n";
import { blockUser } from "../actions/blocks";

type Props = {
  targetUserId: string | null | undefined;
  targetName: string;
  // 自分の demo or 自分自身なら menu 隠す用
  hide?: boolean;
};

export default function ProfileActionsMenu({ targetUserId, targetName, hide }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lang] = useLang();
  const router = useRouter();

  if (hide || !targetUserId) return null;

  function onBlock() {
    if (!targetUserId) return;
    setErr(null);
    startTransition(async () => {
      const r = await blockUser(targetUserId);
      if (r?.error) {
        setErr(r.error);
        return;
      }
      setConfirmBlock(false);
      setOpen(false);
      // ホームに戻す (相手プロフィールはもう見えない方が UX 上自然)
      router.push("/");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("profile_actions_menu", lang)}
        style={{
          background: "rgba(0,0,0,0.4)",
          border: "none",
          color: "#fff",
          width: 38,
          height: 38,
          borderRadius: "50%",
          fontSize: 22,
          fontWeight: 900,
          cursor: "pointer",
          fontFamily: "inherit",
          lineHeight: 1,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        …
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          onClick={() => { if (!pending) setOpen(false); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(20,8,4,0.55)", backdropFilter: "blur(2px)",
            display: "flex", justifyContent: "center", alignItems: "flex-end",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 360, background: "#fff9f0",
              borderRadius: 18, padding: 14, boxShadow: "0 14px 32px rgba(0,0,0,0.3)",
              fontFamily: "inherit",
            }}
          >
            {!confirmBlock ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link
                  href={`/report/${targetUserId}`}
                  onClick={() => setOpen(false)}
                  style={{ display: "block", background: "transparent", color: "#1a1008", border: "2px solid #e8c99a", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, textAlign: "center", textDecoration: "none" }}
                >
                  🚩 {t("report_user_btn", lang)}
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmBlock(true)}
                  style={{ background: "transparent", color: "#ad001c", border: "2px solid #ad001c", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                >
                  🚫 {t("block_user_btn", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: "transparent", color: "#8a7560", border: "none", padding: 10, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 2 }}
                >
                  {t("cancel_generic", lang)}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#1a1008", textAlign: "center", marginBottom: 4 }}>
                  🚫 {t("block_confirm_title", lang).replace("{name}", targetName)}
                </div>
                <div style={{ fontSize: 12, color: "#5a4a18", fontWeight: 600, lineHeight: 1.5, background: "#fff3cd", border: "2px solid #f5c649", borderRadius: 10, padding: 10 }}>
                  {t("block_confirm_body", lang)}
                </div>
                {err && (
                  <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700 }}>{err}</div>
                )}
                <button
                  type="button"
                  onClick={onBlock}
                  disabled={pending}
                  style={{ background: "#ad001c", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontSize: 13, fontWeight: 900, cursor: pending ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: pending ? 0.6 : 1 }}
                >
                  🚫 {t("block_confirm_yes", lang)}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmBlock(false)}
                  disabled={pending}
                  style={{ background: "transparent", color: "#8a7560", border: "2px solid #e8c99a", borderRadius: 12, padding: 10, fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}
                >
                  {t("cancel_generic", lang)}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
