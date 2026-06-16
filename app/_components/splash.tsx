"use client";

import BrandLogo from "./brand-logo";

export default function Splash() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f5ead0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <BrandLogo variant="full" size={42} nomaColor="#2ecc71" domoColor="#ad001c" camelHeight={140} />
      <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>
        Meet a real local in Kyoto
      </div>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e8c99a", borderTopColor: "#ad001c", animation: "spin 0.9s linear infinite", marginTop: 8 }} />
    </div>
  );
}
