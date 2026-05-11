import { UndoIcon } from "lucide-react";
import { useState, useEffect } from "react";

export default function LinkCreationPopup({ popup, onClose, onConfirm }) {
  const [liaisonType, setLiaisonType] = useState(null); // "simple" | "transverse"
  const [isMandatory, setIsMandatory] = useState(null);
  const [isExclusion, setIsExclusion] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (popup) {
      if (popup.linkId) {
        const typeLiaison = popup.data?.liaisonType || null;

        setLiaisonType(typeLiaison);

        if(typeLiaison === "simple")
        {
          setIsMandatory(popup.data?.isMandatory !== undefined ? String(popup.data.isMandatory) : null);
          setIsExclusion(null);
        }
        else if (typeLiaison === "transverse")
        {
          setIsMandatory(null);
          setIsExclusion(popup.data?.isExclusion !== undefined ? String(popup.data.isMandatory) : null);
        }
        else
        {
          setIsMandatory(null);
          setIsExclusion(null);
        }


      } else {
        setIsMandatory(null);
        setLiaisonType(null);
        setIsExclusion(null);
      }

      setError("");
    }
  }, [popup]);

  if (!popup) return null;

  const handleSubmit = () => {
    if (!liaisonType) {
      setError("Veuillez sélectionner un type de liaison.");
      return;
    }
    if (liaisonType === "simple" && isMandatory === null) {
      setError("Veuillez choisir Obligatoire ou Optionnel.");
      return;
    }
    if (liaisonType === "transverse" && isExclusion === null) {
      setError("Veuillez choisir Dépendance ou Exclusion.");
      return;
    }
    setError("");
    onConfirm({ liaisonType, isMandatory, isExclusion });
    onClose();
  };

  const childStyle = (enabled) => ({
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginLeft: "20px",
    borderLeft: "1.5px solid #e0e0e0",
    paddingLeft: "12px",
  });

  const labelStyle = (enabled) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: enabled ? "inherit" : "#aaa",
    cursor: enabled ? "pointer" : "not-allowed",
  });

  return (
    <div style={{
      position: "absolute", top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      background: "white", border: "1px solid #ddd",
      borderRadius: 10, padding: 24, zIndex: 1000,
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      display: "flex", flexDirection: "column", gap: "16px",
    }}>
      <div style={{ textAlign: "center" }}>
        <strong style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
          {popup.nodeType}
        </strong>
        <hr className="border-t border-gray-300 w-full p-2" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Parent 1 — Liaison simple */}
        <label style={labelStyle(true)}>
          <input
            type="radio"
            name="liaisonType"
            value="simple"
            checked={liaisonType === "simple"}
            onChange={() => { setLiaisonType("simple"); setIsExclusion(null); }}
          />
          Liaison simple
        </label>

        <div style={childStyle(liaisonType === "simple")}>
          <label style={labelStyle(liaisonType === "simple")}>
            <input
              type="radio"
              name="isMandatory"
              value="true"
              disabled={liaisonType !== "simple"}
              checked={isMandatory === "true"}
              onChange={(e) => setIsMandatory(e.target.value)}
            />
            Obligatoire
          </label>
          <label style={labelStyle(liaisonType === "simple")}>
            <input
              type="radio"
              name="isMandatory"
              value="false"
              disabled={liaisonType !== "simple"}
              checked={isMandatory === "false"}
              onChange={(e) => setIsMandatory(e.target.value)}
            />
            Optionnel
          </label>
        </div>

        {/* Parent 2 — Liaison transverse */}
        <label style={labelStyle(true)}>
          <input
            type="radio"
            name="liaisonType"
            value="transverse"
            checked={liaisonType === "transverse"}
            onChange={() => { setLiaisonType("transverse"); setIsMandatory(null); }}
          />
          Liaison transverse
        </label>

        <div style={childStyle(liaisonType === "transverse")}>
          <label style={labelStyle(liaisonType === "transverse")}>
            <input
              type="radio"
              name="isExclusion"
              value="false"
              disabled={liaisonType !== "transverse"}
              checked={isExclusion === "false"}
              onChange={(e) => setIsExclusion(e.target.value)}
            />
            Dépendance
          </label>
          <label style={labelStyle(liaisonType === "transverse")}>
            <input
              type="radio"
              name="isExclusion"
              value="true"
              disabled={liaisonType !== "transverse"}
              checked={isExclusion === "true"}
              onChange={(e) => setIsExclusion(e.target.value)}
            />
            Exclusion
          </label>
        </div>

        {error && <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <button onClick={handleSubmit} style={{ padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
          ✓ Valider
        </button>
        <button onClick={onClose} style={{ padding: "6px 12px", background: "#d9534f", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}>
          ✕ Annuler
        </button>
      </div>
    </div>
  );
}