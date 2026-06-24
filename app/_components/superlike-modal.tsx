"use client";

import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { createSuperLikePaymentIntent, redeemSuperLike } from "@/app/actions/superlike";
import { useLang } from "@/app/lib/i18n";

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 9998,
  background: "rgba(20,8,4,0.7)", backdropFilter: "blur(2px)",
  display: "flex", justifyContent: "center", alignItems: "center", padding: 20,
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 360, background: "#fff8ec", border: "1px solid #f3e8d6",
  borderRadius: 22, padding: 22, boxShadow: "0 20px 50px -20px rgba(120,50,20,.5)",
  maxHeight: "92vh", overflowY: "auto",
};
const btnPrimary: React.CSSProperties = {
  width: "100%", background: "#ad001c", color: "#fff", border: "none",
  borderRadius: 14, padding: 14, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "inherit",
};
const btnSecondary: React.CSSProperties = {
  width: "100%", background: "transparent", color: "#8a7560", border: "1px solid #e8d8c0",
  borderRadius: 14, padding: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginTop: 8,
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
  travelerUserId: string;
  travelerName: string;
  travelerEmoji: string;
  onClose: () => void;
  /** 解錠成功（既存 or 課金完了）。呼び出し側でチャットを開く。 */
  onUnlocked: () => void;
};

export default function SuperLikeModal({ travelerUserId, travelerName, travelerEmoji, onClose, onUnlocked }: Props) {
  const [lang] = useLang();
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [amountYen, setAmountYen] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await createSuperLikePaymentIntent(travelerUserId);
      if (cancelled) return;
      if (r.alreadyUnlocked) { onUnlocked(); return; }
      if (r.error) { setErr(r.error); setLoading(false); return; }
      setClientSecret(r.clientSecret ?? null);
      setPaymentIntentId(r.paymentIntentId ?? null);
      setAmountYen(r.amountYen ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [travelerUserId, onUnlocked]);

  if (loading) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={card} onClick={(e) => e.stopPropagation()}>
          <div style={{ textAlign: "center", padding: 20, fontSize: 13, color: "#9a8a7c", fontWeight: 700 }}>
            {lang === "ja" ? "準備中…" : "Preparing…"}
          </div>
        </div>
      </div>
    );
  }

  if (err || !clientSecret || !paymentIntentId) {
    return (
      <div style={overlay} onClick={onClose}>
        <div style={card} onClick={(e) => e.stopPropagation()}>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 900, marginBottom: 10, color: "#2b1d1a" }}>{lang === "ja" ? "エラー" : "Error"}</div>
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
          <div style={{ width: 46, height: 46, borderRadius: 14, background: "#ffefd5", border: "1px solid #f0e3cf", display: "grid", placeItems: "center", fontSize: 22 }}>{travelerEmoji}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "#ad001c", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".05em" }}>{lang === "ja" ? "メッセージ" : "Message"}</div>
            <div className="font-display" style={{ fontSize: 15.5, fontWeight: 800, color: "#2b1d1a" }}>{travelerName}</div>
          </div>
        </div>

        {!confirmed ? (
          <>
            <div style={{ background: "#fff", border: "1px solid #f3e8d6", borderRadius: 14, padding: 16, marginBottom: 14, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#2b1d1a", fontWeight: 700, lineHeight: 1.6 }}>
                {lang === "ja"
                  ? <>{travelerName}さんにメッセージを送るには<br />お支払いが必要です。</>
                  : <>Messaging {travelerName} requires<br />a one-time payment.</>}
              </div>
              {amountYen != null && (
                <div style={{ fontSize: 28, fontWeight: 900, color: "#2b1d1a", lineHeight: 1.1, marginTop: 10 }}>¥{amountYen.toLocaleString()}</div>
              )}
              <div style={{ fontSize: 11, color: "#7a6a5c", fontWeight: 700, marginTop: 4 }}>
                {lang === "ja" ? "支払うとリクエスト不要で今すぐチャット開設" : "Chat opens instantly — no request needed"}
              </div>
            </div>
            <button type="button" onClick={() => setConfirmed(true)} style={btnPrimary}>
              {lang === "ja" ? "メッセージする" : "Send message"}
            </button>
            <button type="button" onClick={onClose} style={btnSecondary}>{lang === "ja" ? "キャンセル" : "Cancel"}</button>
          </>
        ) : (
          <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "flat" } }}>
            <PayForm travelerUserId={travelerUserId} paymentIntentId={paymentIntentId} onUnlocked={onUnlocked} onCancel={onClose} lang={lang} />
          </Elements>
        )}
      </div>
    </div>
  );
}

function PayForm({ travelerUserId, paymentIntentId, onUnlocked, onCancel, lang }: {
  travelerUserId: string; paymentIntentId: string; onUnlocked: () => void; onCancel: () => void; lang: "ja" | "en";
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setErr(null);

    const { error: confirmErr } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + "/" },
      redirect: "if_required",
    });
    if (confirmErr) { setErr(confirmErr.message ?? "Payment failed"); setSubmitting(false); return; }

    const fd = new FormData();
    fd.set("traveler_user_id", travelerUserId);
    fd.set("payment_intent_id", paymentIntentId);
    const r = await redeemSuperLike(fd);
    if (r?.error) { setErr(r.error); setSubmitting(false); return; }
    onUnlocked();
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement />
      {err && <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 700, marginTop: 10, marginBottom: 4 }}>{err}</div>}
      <button type="submit" disabled={!stripe || submitting} style={{ ...btnPrimary, marginTop: 14, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
        {submitting ? (lang === "ja" ? "処理中…" : "Processing…") : (lang === "ja" ? "支払ってメッセージを始める" : "Pay & start chat")}
      </button>
      <button type="button" onClick={onCancel} disabled={submitting} style={btnSecondary}>{lang === "ja" ? "キャンセル" : "Cancel"}</button>
    </form>
  );
}
