export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#f5ead0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 1000,
      }}
    >
      <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1 }}>
        <span style={{ color: "#2ecc71" }}>Noma</span>
        <span style={{ color: "#ad001c" }}>Domo</span>
      </div>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid #e8c99a",
          borderTopColor: "#ad001c",
          animation: "spin 0.9s linear infinite",
        }}
      />
    </div>
  );
}
