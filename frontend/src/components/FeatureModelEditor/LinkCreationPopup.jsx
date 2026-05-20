import { useState, useEffect } from "react";

export default function LinkCreationPopup({ popup, onClose, onConfirm }) {
  const [liaisonType, setLiaisonType] = useState(null); // "simple" | "transverse"
  const [isMandatory, setIsMandatory] = useState(null); // "true" | "false"
  const [transverseType, setTransverseType] = useState(null); // "inclusion" | "exclusion" | "compatibility" | "equivalence" | "difference"
  const [error, setError] = useState("");

  const isEditing = Boolean(popup?.linkId);

  useEffect(() => {
    if (popup) {
      if (popup.linkId) {
        const typeLiaison = popup.data?.liaisonType || null;
        setLiaisonType(typeLiaison);

        if (typeLiaison === "simple") {
          setIsMandatory(popup.data?.isMandatory !== undefined ? String(popup.data.isMandatory) : null);
          setTransverseType(null);
        } else if (typeLiaison === "transverse") {
          setIsMandatory(null);
          // Reconstitue le transverseType depuis les flags booléens
          if (popup.data?.isInclusion)     setTransverseType("inclusion");
          else if (popup.data?.isExclusion) setTransverseType("exclusion");
          else if (popup.data?.isCompatibility) setTransverseType("compatibility");
          else if (popup.data?.isEquivalence)   setTransverseType("equivalence");
          else if (popup.data?.isDifference)    setTransverseType("difference");
          else setTransverseType(null);
        } else {
          setIsMandatory(null);
          setTransverseType(null);
        }
      } else {
        setLiaisonType(null);
        setIsMandatory(null);
        setTransverseType(null);
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
    if (liaisonType === "transverse" && transverseType === null) {
      setError("Veuillez choisir un type de liaison transverse.");
      return;
    }
    setError("");

    // Construit le payload attendu par onConfirm dans FeatureModelEditor
    const payload = { liaisonType };

    if (liaisonType === "simple") {
      payload.isMandatory = isMandatory;
      payload.isExclusion = null;
    } else {
      // Traduit transverseType en flags booléens pour compatibilité avec l'éditeur
      payload.isMandatory     = null;
      payload.isInclusion     = transverseType === "inclusion";
      payload.isExclusion     = transverseType === "exclusion";
      payload.isCompatibility = transverseType === "compatibility";
      payload.isEquivalence   = transverseType === "equivalence";
      payload.isDifference    = transverseType === "difference";
    }

    onConfirm(payload);
    onClose();
  };

  const labelStyle = (enabled) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: enabled ? "inherit" : "#aaa",
    cursor: enabled ? "pointer" : "not-allowed",
  });

  const childStyle = () => ({
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    marginLeft: "20px",
    borderLeft: "1.5px solid #e0e0e0",
    paddingLeft: "12px",
  });

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
        }}
      />
      <div
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background: "white", border: "1px solid #ddd",
          borderRadius: 10, padding: 24, zIndex: 1000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}
      >
      <div style={{ textAlign: "center" }}>
        <strong style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
          {popup.nodeType}
        </strong>
        <hr className="border-t border-gray-300 w-full p-2" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>

        {/* Liaison simple */}
        <label style={labelStyle(!isEditing || liaisonType === "simple")}>
          <input
            type="radio"
            name="liaisonType"
            value="simple"
            checked={liaisonType === "simple"}
            disabled={isEditing && liaisonType !== "simple"}
            onChange={() => { setLiaisonType("simple"); setTransverseType(null); }}
          />
          Liaison simple
        </label>

        <div style={childStyle()}>
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

        {/* Liaison transverse */}
        <label style={labelStyle(!isEditing || liaisonType === "transverse")}>
          <input
            type="radio"
            name="liaisonType"
            value="transverse"
            checked={liaisonType === "transverse"}
            disabled={isEditing && liaisonType !== "transverse"}
            onChange={() => { setLiaisonType("transverse"); setIsMandatory(null); }}
          />
          Liaison transverse
        </label>

        <div style={childStyle()}>
          {[
            { value: "inclusion",    label: "Inclusion" },
            { value: "exclusion",     label: "Exclusion mutuelle" },
            { value: "compatibility", label: "Compatibilité" },
            { value: "equivalence",   label: "Équivalence" },
            { value: "difference",    label: "Différence" },
          ].map(({ value, label }) => (
            <label key={value} style={labelStyle(liaisonType === "transverse")}>
              <input
                type="radio"
                name="transverseType"
                value={value}
                disabled={liaisonType !== "transverse"}
                checked={transverseType === value}
                onChange={() => setTransverseType(value)}
              />
              {label}
            </label>
          ))}
        </div>

        {error && <p style={{ color: "red", fontSize: "0.85rem" }}>{error}</p>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
        <button
          onClick={handleSubmit}
          style={{ padding: "6px 12px", background: "#4CAF50", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          ✓ Valider
        </button>
        <button
          onClick={onClose}
          style={{ padding: "6px 12px", background: "#d9534f", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
        >
          ✕ Annuler
        </button>
      </div>
      </div>
    </>
  );
}
