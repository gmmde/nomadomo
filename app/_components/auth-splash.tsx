"use client";

import { useState } from "react";

export default function AuthSplash({ subtitle }: { subtitle?: string }) {
  const [camelFailed, setCamelFailed] = useState(false);
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      {!camelFailed && (
        <img
          src="/logo-camel.png"
          alt="NomaDomo"
          onError={() => setCamelFailed(true)}
          style={{ height: 60, width: "auto", display: "inline-block" }}
        />
      )}
      <div className="font-display" style={{ fontSize: 26, fontWeight: 900, color: "#2b1d1a", marginTop: 6, letterSpacing: ".01em" }}>NomaDomo</div>
      {subtitle && <div style={{ fontSize: 13, color: "#b03a2e", fontWeight: 700, marginTop: 5, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}
