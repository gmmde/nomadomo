"use client";

import { useState } from "react";

export default function AuthSplash({ subtitle }: { subtitle?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={{ textAlign: "center", marginBottom: 26 }}>
      {!failed ? (
        <img
          src="/logo-2.png"
          alt="NomaDomo"
          onError={() => setFailed(true)}
          style={{ height: 132, width: "auto", display: "block", margin: "0 auto" }}
        />
      ) : (
        <div className="font-display" style={{ fontSize: 30, fontWeight: 900, color: "#2b1d1a" }}>NomaDomo</div>
      )}
      {subtitle && <div style={{ fontSize: 13.5, color: "#b03a2e", fontWeight: 700, marginTop: 10, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}
