import { TriangleAlert, Info } from "lucide-react";

export default function CustomPopup({ dialog, onClose }) {
  if (!dialog) return null;

  const isConfirm = dialog.type === "confirm";

  const handleConfirm = () => {
    dialog.onConfirm?.();
    onClose();
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1999,
          background: "rgba(0,0,0,0.35)",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white",
          border: "1px solid #ddd",
          borderRadius: 10,
          padding: 24,
          zIndex: 2000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          minWidth: 300,
          maxWidth: 420,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.4rem" }}>{isConfirm ? <TriangleAlert /> : <Info />}</span>
          <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: "1.5" }}>
            {dialog.message}
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: isConfirm ? "space-between" : "flex-end" }}>
          {isConfirm && (
            <button
              onClick={handleConfirm}
              style={{
                padding: "6px 16px",
                background: "#d9534f",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Confirmer
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              background: isConfirm ? "#6c757d" : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {isConfirm ? "Annuler" : "OK"}
          </button>
        </div>
      </div>
    </>
  );
}
