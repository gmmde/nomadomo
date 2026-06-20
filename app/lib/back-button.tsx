"use client";

import { useRouter } from "next/navigation";

type Props = {
  fallback?: string;
  color?: string;
  fontSize?: number;
};

export default function BackButton({ fallback = "/", color = "#2b1d1a" }: Props) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "1px solid #f0e3cf", cursor: "pointer", padding: 0, flex: "none", boxShadow: "0 2px 8px rgba(120,60,20,.06)" }}
      aria-label="戻る"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </button>
  );
}
