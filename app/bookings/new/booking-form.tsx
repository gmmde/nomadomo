"use client";
import BackButton from "@/app/lib/back-button";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, t } from "@/app/lib/i18n";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { createBooking } from "@/app/actions/bookings";

const wrap: React.CSSProperties = { background: "#fff8ec", minHeight: "100vh", display: "flex", justifyContent: "center" };
const card: React.CSSProperties = { width: "100%", maxWidth: 390, minHeight: "100vh", background: "#fff8ec", padding: "32px 24px" };
const input: React.CSSProperties = { width: "100%", background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 600, color: "#1a1008", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
const label: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 700, color: "#ad001c", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" };
const primary: React.CSSProperties = { width: "100%", background: "#ad001c", color: "#fff", border: "none", borderRadius: 16, padding: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "inherit" };

function defaultDateTime(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(12, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  guideId: number;
  guideName: string;
  guideEmoji: string;
  guideUniversity: string;
  ratePerDay: number;
  mode: "free" | "paid";
};

let stripePromise: Promise<StripeJs | null> | null = null;
function getStripe(): Promise<StripeJs | null> {
  if (!stripePromise) {
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = pk ? loadStripe(pk) : Promise.resolve(null);
  }
  return stripePromise;
}

function PayAndSubmit({ guideId, guideName, guideEmoji, guideUniversity, ratePerDay, days, startAt, message }: {
  guideId: number; guideName: string; guideEmoji: string; guideUniversity: string;
  ratePerDay: number; days: number; startAt: string; message: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [lang] = useLang();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    try {
      // 1) Stripe Elements で payment method を確定 (capture は guide accept 時)
      const { error: confirmErr } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.origin + "/bookings" },
        redirect: "if_required",
      });
      if (confirmErr) {
        setErr(confirmErr.message ?? "Payment failed");
        setSubmitting(false);
        return;
      }

      // 2) PaymentIntent ID を取り出して booking を作成
      // confirmPayment 完了時、URL params に payment_intent が乗ってくる場合もあるが
      // ここでは payment_intent_id を form 経由で server action に渡す
      const piId = (elements as unknown as { _commonOptions?: { clientSecret?: string } })._commonOptions?.clientSecret?.split("_secret_")[0];
      if (!piId) {
        setErr("Could not resolve payment_intent");
        setSubmitting(false);
        return;
      }

      const fd = new FormData();
      fd.set("guide_id", String(guideId));
      fd.set("start_at", startAt);
      fd.set("hours", String(days));
      fd.set("message", message);
      fd.set("payment_intent_id", piId);
      const res = await createBooking(undefined, fd);
      if (res?.error) {
        setErr(res.error);
        setSubmitting(false);
        return;
      }
      router.push("/bookings");
    } catch (e2) {
      const m = e2 instanceof Error ? e2.message : "submit failed";
      setErr(m);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div style={{ marginBottom: 16 }}>
        <label style={label}>💳 {lang === "ja" ? "お支払い情報" : "Payment details"}</label>
        <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 14, padding: 14 }}>
          <PaymentElement />
        </div>
        <div style={{ fontSize: 11, color: "#8a7560", marginTop: 6, fontWeight: 600 }}>
          {lang === "ja" ? "🔒 ガイドが承認するまで請求されません" : "🔒 You won't be charged until the guide accepts"}
        </div>
      </div>

      {err && (
        <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
          {err}
        </div>
      )}

      <button type="submit" disabled={submitting || !stripe || !elements} style={{ ...primary, opacity: submitting ? 0.6 : 1 }}>
        {submitting ? t("sending", lang) : t("booking_send_btn", lang)}
      </button>

      {/* Hidden guide info display (already rendered above) */}
      <input type="hidden" value={guideName} readOnly />
      <input type="hidden" value={guideEmoji} readOnly />
      <input type="hidden" value={guideUniversity} readOnly />
      <input type="hidden" value={ratePerDay} readOnly />
    </form>
  );
}

export default function BookingForm({ guideId, guideName, guideEmoji, guideUniversity, ratePerDay }: Props) {
  const router = useRouter();
  const [days, setDays] = useState(1);
  const [startAt, setStartAt] = useState(defaultDateTime());
  const [message, setMessage] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [piErr, setPiErr] = useState<string | null>(null);
  const [piLoading, setPiLoading] = useState(false);
  const total = useMemo(() => ratePerDay * days, [ratePerDay, days]);
  const [lang] = useLang();

  useEffect(() => {
    let cancelled = false;
    setPiLoading(true);
    setPiErr(null);
    fetch("/api/checkout/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guide_id: guideId, hours: days }),
    })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: { clientSecret: string }) => {
        if (!cancelled) setClientSecret(d.clientSecret);
      })
      .catch((e) => {
        if (!cancelled) setPiErr(e?.message ?? "payment intent failed");
      })
      .finally(() => { if (!cancelled) setPiLoading(false); });
    return () => { cancelled = true; };
  }, [guideId, days]);

  const stripeP = useMemo(() => getStripe(), []);

  return (
    <div style={wrap}>
      <div style={card} className="screen-enter">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <BackButton />
          <div className="font-display" style={{ fontSize: 22, fontWeight: 900, color: "#2b1d1a" }}>{t("booking_title", lang)}</div>
        </div>

        <div style={{ background: "#fff", border: "1px solid #ecdcc4", borderRadius: 16, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ffefd5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, border: "1px solid #ecdcc4" }}>{guideEmoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>{guideName}</div>
            <div style={{ fontSize: 11, color: "#8a7560", fontWeight: 700 }}>{guideUniversity}</div>
            <div style={{ fontSize: 12, color: "#ad001c", fontWeight: 900, marginTop: 2 }}>¥{ratePerDay.toLocaleString()} / day</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>{t("booking_start", lang)}</label>
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} style={input} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={label}>{t("booking_days", lang)}</label>
          <input type="number" min={1} max={7} step={1} value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
            style={input} />
        </div>

        <div style={{ background: "#ffefd5", border: "2px solid #ad001c", borderRadius: 14, padding: 14, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#8a7560", fontWeight: 800 }}>{t("booking_total", lang)}</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: "#ad001c" }}>¥{total.toLocaleString()}</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={label}>{t("booking_msg_label", lang)}</label>
          <textarea maxLength={500} rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
            style={{ ...input, resize: "vertical", minHeight: 80 }}
            placeholder={t("booking_msg_placeholder", lang)} />
        </div>

        {piErr && (
          <div style={{ background: "#ad001c20", border: "1.5px solid #ad001c", borderRadius: 12, padding: 12, marginBottom: 16, color: "#ad001c", fontSize: 13, fontWeight: 700 }}>
            ⚠️ {piErr}
          </div>
        )}
        {piLoading && (
          <div style={{ fontSize: 12, color: "#8a7560", fontWeight: 700, padding: 12 }}>
            {lang === "ja" ? "決済を準備中…" : "Preparing payment…"}
          </div>
        )}
        {clientSecret && (
          <Elements stripe={stripeP} options={{ clientSecret, appearance: { theme: "flat" } }}>
            <PayAndSubmit
              guideId={guideId}
              guideName={guideName}
              guideEmoji={guideEmoji}
              guideUniversity={guideUniversity}
              ratePerDay={ratePerDay}
              days={days}
              startAt={startAt}
              message={message}
            />
          </Elements>
        )}
      </div>
    </div>
  );
}
