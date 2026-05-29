"use client";

import { useState } from "react";

export default function StripeOnboardButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/stripe/onboard", { method: "POST" });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error ?? `HTTP ${r.status}`);
      window.location.href = data.url;
    } catch (e) {
      const m = e instanceof Error ? e.message : "onboarding failed";
      setErr(m);
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={onClick}
        disabled={loading}
        style={{
          display: "block",
          width: "100%",
          background: "#635bff",
          color: "#fff",
          border: "none",
          borderRadius: 16,
          padding: 12,
          fontSize: 14,
          fontWeight: 900,
          textAlign: "center",
          cursor: loading ? "wait" : "pointer",
          fontFamily: "inherit",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "…" : label}
      </button>
      {err && <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 700, marginTop: 4 }}>{err}</div>}
    </>
  );
}
