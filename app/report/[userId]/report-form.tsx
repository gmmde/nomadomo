"use client";
import BackButton from "@/app/lib/back-button";

import Link from "next/link";
import { useActionState } from "react";
import { submitReport, type ReportFormState } from "@/app/actions/reports";

const wrap: React.CSSProperties = { background: "#fff8ec", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#fff8ec", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
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
          <BackButton />
          <div style={{ fontSize: 20, fontWeight: 900 }}>Report</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: "1px solid #ecdcc4" }}>{targetEmoji}</div>
          <div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>Reporting</div>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{targetName}</div>
          </div>
        </div>

        {state?.success ? (
          <div style={{ background: "#2e8b5720", border: "1.5px solid #2e8b57", borderRadius: 12, padding: 16, color: "#2e8b57", fontSize: 13, fontWeight: 700, lineHeight: 1.6 }}>
            ✅ Report received. We will review and respond.
            <div style={{ marginTop: 16 }}>
              <Link href="/" style={{ display: "inline-block", background: "#2e8b57", color: "#fff", padding: "8px 16px", borderRadius: 12, textDecoration: "none", fontWeight: 800 }}>
                Back to home
              </Link>
            </div>
          </div>
        ) : (
          <form action={action}>
            <input type="hidden" name="target_user_id" value={targetUserId} />
            {targetMessageId && <input type="hidden" name="target_message_id" value={targetMessageId} />}

            <div style={{ marginBottom: 20 }}>
              <label style={label} htmlFor="reason">Reason (5–500 chars)</label>
              <textarea
                id="reason"
                name="reason"
                required
                minLength={5}
                maxLength={500}
                rows={6}
                style={{ ...input, resize: "vertical", minHeight: 120 }}
                placeholder="e.g. spam, harassment, inappropriate content, impersonation, etc."
              />
            </div>

            {state?.error && (
              <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
                {state.error}
              </div>
            )}

            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 600, marginBottom: 14, lineHeight: 1.6 }}>
              ⚠️ Please only report in good faith. Accounts that repeatedly file malicious reports may be restricted.
            </div>

            <button type="submit" disabled={pending} style={{ ...primary, opacity: pending ? 0.6 : 1 }}>
              {pending ? "Sending…" : "Submit report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
