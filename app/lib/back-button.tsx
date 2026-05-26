"use client";

import { useRouter } from "next/navigation";

type Props = {
  fallback?: string;
  color?: string;
  fontSize?: number;
};

export default function BackButton({ fallback = "/", color = "#ad001c", fontSize = 22 }: Props) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      style={{ background: "none", border: "none", color, fontSize, cursor: "pointer", padding: 0, lineHeight: 1 }}
      aria-label="戻る"
    >
      ←
    </button>
  );
}
