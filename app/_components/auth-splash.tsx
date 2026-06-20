"use client";

import { useState } from "react";

export default function AuthSplash({ subtitle }: { subtitle?: string }) {
  const [camelFailed, setCamelFailed] = useState(false);
  const [letterFailed, setLetterFailed] = useState(false);
  return (
    <div style={{ textAlign: "center", marginBottom: 24 }}>
      {!camelFailed && (
        <img
          src="/logo-camel.png"
          alt=""
          onError={() => setCamelFailed(true)}
          style={{ height: 60, width: "auto", display: "inline-block" }}
        />
      )}
      {!letterFailed ? (
        <img
          src="/logo-letter.png"
          alt="NomaDomo"
          onError={() => setLetterFailed(true)}
          style={{ height: 30, width: "auto", display: "inline-block", marginTop: 8 }}
        />
      ) : (
        <div className="font-display" style={{ fontSize: 26, fontWeight: 900, color: "#2b1d1a", marginTop: 6 }}>NomaDomo</div>
      )}
      {subtitle && <div style={{ fontSize: 13, color: "#b03a2e", fontWeight: 700, marginTop: 8, lineHeight: 1.5 }}>{subtitle}</div>}
    </div>
  );
}
