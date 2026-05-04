import { useState, useEffect } from "react";

export default function CombinaisonCreationPopup({ popup, onClose, onConfirm }) {
  const [isMandatory, setIsMandatory] = useState(null);
  const [nodeName, setNodeName] = useState("");
  const [combinaisonMin, setCombinaisonMin] = useState("");
  const [combinaisonMax, setCombinaisonMax] = useState(""); 
  const [error, setError] = useState("");

  useEffect(() => {
    if (popup) {
      setNodeName("");
      setCombinaisonMin("");
      setCombinaisonMax("");
      setIsMandatory(null);
      setError("");
    }
  }, [popup]);


  if (!popup) return null;

  const handleSubmit = () => {
    if (!nodeName.trim() || isMandatory === null) {
      setError("Veuillez remplir tous les champs avant de valider.");
      return;
    }
    setError("");
    onConfirm({ nodeName, isMandatory });
    onClose();
  };

  const onCancel = () => {
    onClose();
  };

  return (
    <div
      style={{
        position: "absolute",
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
      
      {error && (
        <p style={{ color: "red", fontSize: "0.85rem", marginTop: "-8px" }}>
          {error}
        </p>
      )}
      

        <div>
          <span>Choisir le nombre de caractéristiques minimal et maximal à sélectionner :</span>

        
        <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingBottom: "4px", whiteSpace: "nowrap" }}>
          <input
            type="integer"
            placeholder="Minimum"
            className="border border-solid"
            value={combinaisonMin}
            onChange={(e) => setCombinaisonMin(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
          />
          <input
            type="integer"
            placeholder="Maximum"
            className="border border-solid"
            value={combinaisonMax}
            onChange={(e) => setCombinaisonMax(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
          />
        </div>
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
  );
}
