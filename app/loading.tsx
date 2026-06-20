export default function Loading() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#fff8ec",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        zIndex: 1000,
      }}
    >
      <img src="/logo-2.png" alt="NomaDomo" style={{ width: "min(260px, 70%)", height: "auto", display: "block" }} />
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "3px solid #f3e8d6",
          borderTopColor: "#ad001c",
          animation: "spin 0.9s linear infinite",
        }}
      />
    </div>
  );
}
