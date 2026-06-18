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
        gap: 20,
        zIndex: 1000,
      }}
    >
      <img src="/logo.png" alt="NomaDomo" style={{ width: "min(260px, 70%)", height: "auto", display: "block" }} />
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
