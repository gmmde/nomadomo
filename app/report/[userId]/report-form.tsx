"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitReport, type ReportFormState } from "@/app/actions/reports";

const wrap: React.CSSProperties = { background: "#f5ead0", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#f5ead0", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 800, color: "#8a7560", marginBottom: 6, textTransform: "uppercase" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

type Props = {
  targetUserId: string;
  targetName: string;
  targetEmoji: string;
  targetMessageId: string | null;
};

export default function ReportForm({ targetUserId, targetName, targetEmoji, targetMessageId }: Props) {
  const [state, action, pending] = useActionState<ReportFormState, FormData>(
    submitReport,
    undefined,
  );

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <Link href="/" style={{ color: "#ad001c", fontSize: 22, textDecoration: "none" }}>←</Link>
          <div style={{ fontSize: 20, fontWeight: 900 }}>通報</div>
        </div>

        <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "2px solid #e8c99a" }}>{targetEmoji}</div>
          <div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>通報対象</div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{targetName}</div>
          </div>
        </div>

        {state?.success ? (
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 12, padding: 16, color: "#2e8b57", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            ✅ 通報を受け付けたわ。内容を確認次第対応するわよ。
            <div style={{ marginTop: 16 }}>
              <Link href="/" style={{ display: "inline-block", background: "#2e8b57", color: "#fff", padding: "8px 16px", borderRadius: 12, textDecoration: "none", fontWeight: 800 }}>
                ホームに戻る
              </Link>
            </div>
          </div>
        ) : (
          <form action={action}>
            <input type="hidden" name="target_user_id" value={targetUserId} />
            {targetMessageId && <input type="hidden" name="target_message_id" value={targetMessageId} />}

            <div style={{ marginBottom: 20 }}>
              <label style={label} htmlFor="reason">通報理由（5〜500文字）</label>
              <textarea
                id="reason"
                name="reason"
                required
                minLength={5}
                maxLength={500}
                rows={6}
                style={{ ...input, resize: "vertical", minHeight: 120 }}
                placeholder="例: スパム、ハラスメント、不適切な内容、なりすまし、など具体的に"
              />
            </div>

            {state?.error && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.error}
              </div>
            )}

            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, marginBottom: 14, lineHeight: 1.6 }}>
              ⚠️ 通報は虚偽なくお願いね。悪意ある通報を繰り返すアカウントは制限することがあるわ。
            </div>

            <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1 }}>
              {pending ? "送信中…" : "通報を送信"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
