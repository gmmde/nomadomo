"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { createMeetPaymentIntent, proposeMeet } from "@/app/actions/meetings";
import { useLang, t } from "@/app/lib/i18n";

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998,
  background: "rgba(20,8,4,0.7)", backdropFilter: "blur(2px)",
  display: "flex", justifyContent: "center", alignItems: "center",
  padding: "20px",
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 360, background: "#f5ead0", border: "3px solid #2e8b57",
  borderRadius: 20, padding: 22, boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
  maxHeight: "92vh", overflowY: "auto",
};
const btnPrimary: React.CSSProperties = {
  width: "100%", background: "#ad001c", color: "#fff", border: "none",
  borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer",
  fontFamily: "inherit", letterSpacing: 0.3,
};
const btnSecondary: React.CSSProperties = {
  width: "100%", background: "transparent", color: "#8a7560", border: "2px solid #e8c99a",
  borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 800, cursor: "pointer",
  fontFamily: "inherit", marginTop: 8,
};

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripe(): Promise<StripeJs | null> {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return stripePromise;
}

type Props = {
  peerId: string;
  peerName: string;
  peerEmoji: string;
  onClose: () => void;
  onSuccess: () => void;
};

export default function MeetPaymentModal({ peerId, peerName, peerEmoji, onClose, onSuccess }: Props) {
  const [lang] = useLang();
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [amountYen, setAmountYen] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // モーダル open 時に PaymentIntent (authorize) を作成
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await createMeetPaymentIntent(peerId);
      if (cancelled) return;
      if (r.error) {
        setErr(r.error);
        setLoading(false);
        return;
      }
      setClientSecret(r.clientSecret ?? null);
      setPaymentIntentId(r.paymentIntentId ?? null);
      setAmountYen(r.amountYen ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [peerId]);

  if (loading) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={card} onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: "center", padding: 20, fontSize: 13, color: "#8a7560", fontWeight: 700 }}>
            {lang === "ja" ? "支払い情報を準備中…" : "Preparing checkout…"}
          </div>
        </div>
      </div>
    );
  }

  if (err || !clientSecret || !paymentIntentId) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={card} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 15, fontWeight: 900, marginBottom: 10 }}>{lang === "ja" ? "エラー" : "Error"}</div>
          <div style={{ fontSize: 13, color: "#ad001c", fontWeight: 700, marginBottom: 12 }}>{err ?? "Could not prepare payment"}</div>
          <button onClick={onClose} style={btnSecondary} type="button">{lang === "ja" ? "閉じる" : "Close"}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={card} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#ffefd5", border: "2px solid #e8c99a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{peerEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{lang === "ja" ? "マッチして会う" : "Pay & Meet"}</div>
            <div style={{ fontSize: 15, fontWeight: 900 }}>{peerName}</div>
          </div>
        </div>

        {amountYen != null && (
          <div style={{ background: "#fff9f0", border: "2px solid #e8c99a", borderRadius: 14, padding: 14, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700, textTransform: "uppercase" }}>{lang === "ja" ? "1日あたり" : "Per day"}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#1a1008", lineHeight: 1.1 }}>¥{amountYen.toLocaleString()}</div>
          </div>
        )}

        <div style={{ background: "#fff3cd", border: "2px solid #f5c649", borderRadius: 12, padding: 10, marginBottom: 14, fontSize: 11, color: "#5a4a18", fontWeight: 700, lineHeight: 1.5 }}>
          ⏱ {t("meet_refund_notice_48h", lang).replace("{name}", peerName)}
        </div>

        <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "flat" } }}>
          <PayForm
            peerId={peerId}
            paymentIntentId={paymentIntentId}
            onSuccess={onSuccess}
            onCancel={onClose}
            lang={lang}
          />
        </Elements>
      </div>
    </div>
  );
}

function PayForm({ peerId, paymentIntentId, onSuccess, onCancel, lang }: {
  peerId: string;
  paymentIntentId: string;
  onSuccess: () => void;
  onCancel: () => void;
  lang: "ja" | "en";
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + "/" },
      redirect: "if_required",
    });
    if (confirmErr) {
      setErr(confirmErr.message ?? "Payment failed");
      setSubmitting(false);
      return;
    }

    // proposeMeet を呼ぶ
    const fd = new FormData();
    fd.set("peer_id", peerId);
    fd.set("payment_intent_id", paymentIntentId);
    const r = await proposeMeet(fd);
    if (r?.error) {
      setErr(r.error);
      setSubmitting(false);
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement />
      {err && (
        <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, marginTop: 10, marginBottom: 4 }}>{err}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        style={{ ...btnPrimary, marginTop: 14, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}
      >
        {submitting
          ? (lang === "ja" ? "送信中…" : "Submitting…")
          : (lang === "ja" ? "💳 支払いを保留して Meet を提案" : "💳 Hold payment & propose Meet")}
      </button>
      <button type="button" onClick={onCancel} disabled={submitting} style={btnSecondary}>
        {lang === "ja" ? "キャンセル" : "Cancel"}
      </button>
    </form>
  );
}
