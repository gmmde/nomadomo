import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        background: "#f5ead0",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "60px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          background: "#fff9f0",
          border: "2px solid #e8c99a",
          borderRadius: 16,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12 }}>🗺️</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: "#ad001c", margin: "0 0 8px" }}>
          404 · 道に迷ったわね
        </h2>
        <p style={{ fontSize: 13, color: "#8a7560", margin: "0 0 20px", lineHeight: 1.6 }}>
          そのページは存在しないか、移動したか、まだ作ってないわ。
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            background: "#ad001c",
            color: "#fff",
            border: "none",
            borderRadius: 14,
            padding: "12px 24px",
            fontSize: 14,
            fontWeight: 900,
            textDecoration: "none",
          }}
        >
          🏠 ホームに戻る
        </Link>
      </div>
    </div>
  );
}
