import { useState, useEffect } from "react";
import { useGraphStore } from "@/components/store/GraphStore";

export default function FeatureCreationPopup({ popup, onClose, onConfirm }) {
  const isColorblind = useGraphStore((state) => state.isColorblind);
  const [nodeName, setNodeName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (popup) {
      // Mode modification : pré-remplir avec les données existantes
      if (popup.nodeId) {
        setNodeName(popup.label || "");
      } else {
        // Mode création : champs vides
        setNodeName("");
      }
      setError("");
    }
  }, [popup]);


  if (!popup) return null;

  const handleSubmit = () => {
    if (!nodeName.trim() ) {
      setError("Veuillez remplir tous les champs avant de valider.");
      return;
    }
    setError("");
    onConfirm({ nodeName });
    onClose();
  };

  const onCancel = () => {
    onClose();
  };

  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
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
        zIndex: 1000,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <strong style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
          {popup.nodeType}
        </strong>
        <hr className="border-t border-gray-300 w-full p-2" />
      </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingBottom: "4px", whiteSpace: "nowrap" }}>
          <span>Nom du nœud :</span>
          <input
            type="text"
            placeholder="Saisir le nom"
            className="border border-solid"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
          />

          {error && (
            <p style={{ color: isColorblind ? "#a16207" : "red", fontSize: "0.85rem", marginTop: "-8px" }}>
              {error}
            </p>
          )}

        </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <button onClick={handleSubmit}
          style={{
            padding: "6px 12px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}>✓ Valider</button>
        <button onClick={onCancel}
          style={{
            padding: "6px 12px",
            background: "#d9534f",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}>✕ Annuler</button>
      </div>
    </div>
    </>
  );
}
