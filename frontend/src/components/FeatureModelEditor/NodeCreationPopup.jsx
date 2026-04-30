export default function NodeCreationPopup({ popup, onClose }) {
  if (!popup) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
        zIndex: 1000,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      <strong>{popup.node.data.label}</strong>

      <input type="text" placeholder="Nom du noeud" />

      <div>
        <label>
          <input type="radio" name="isMandatory" value="true" />
          Obligatoire
        </label>
        <label>
          <input type="radio" name="isMandatory" value="false" />
          Optionnel
        </label>
      </div>

      <button onClick={onClose}>✕ Fermer</button>
    </div>
  );
}
