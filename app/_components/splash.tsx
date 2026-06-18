"use client";

export default function Splash() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#f5ead0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
      <img src="/logo-2.png" alt="NomaDomo" style={{ width: "min(260px, 70%)", height: "auto", display: "block" }} />
      <div style={{ fontSize: 13, color: "#8a7560", fontWeight: 700 }}>
        Meet a real local in Japan
      </div>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e8c99a", borderTopColor: "#ad001c", animation: "spin 0.9s linear infinite", marginTop: 8 }} />
    </div>
  );
}
