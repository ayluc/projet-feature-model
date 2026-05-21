import { useState } from "react";
import { createPortal } from "react-dom";

const FORMATS = [
  { id: "json", label: "JSON (React Flow)" },
  { id: "image", label: "Image du graphe (PNG)" },
  { id: "dzn", label: "Modèle MiniZinc (.dzn)" },
  { id: "mzn", label: "Configuration MiniZinc (.mzn)" },
];

export default function DownloadPopup({ onClose, onDownload }) {
  const [selected, setSelected] = useState({
    json: true,
    image: false,
    dzn: false,
    mzn: false,
  });

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const hasSelection = Object.values(selected).some(Boolean);

  const handleDownload = () => {
    onDownload(selected);
    onClose();
  };

  return createPortal(
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
          gap: "16px",
          minWidth: 320,
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
          Télécharger le feature model
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {FORMATS.map(({ id, label }) => (
            <label
              key={id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                fontSize: "0.9rem",
              }}
            >
              <input
                type="checkbox"
                checked={selected[id]}
                onChange={() => toggle(id)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              {label}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleDownload}
            disabled={!hasSelection}
            style={{
              padding: "6px 16px",
              background: hasSelection ? "#4CAF50" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: hasSelection ? "pointer" : "not-allowed",
            }}
          >
            Télécharger
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}