import { useState } from "react";

export default function NodeCreationPopup({ popup, onClose, onConfirm }) {
  const [isMandatory, setIsMandatory] = useState(null);
  const [nodeName, setNodeName] = useState("");

  if (!popup) return null;

  const handleSubmit = () => {
    console.log("Nom :", nodeName);
    console.log("Obligatoire :", isMandatory); 
    onConfirm({nodeName, isMandatory});
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
        borderRadius: 8,
        padding: 16,
        zIndex: 1000,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <strong >{popup.node.data.label}</strong>
        <hr className="border-t border-gray-300 w-full p-2" />

      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
        <p>Nom du noeud : </p>
        <input
          type="text"
          placeholder="Saisir le nom"
          className="border border-solid"
          value={nodeName}
          onChange={(e) => setNodeName(e.target.value)}
        />
      </div>


      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
        <label>
          <input type="radio" name="isMandatory" value="true"
            onChange={(e) => setIsMandatory(e.target.value)} />
          Obligatoire
        </label>
        <label>
          <input type="radio" name="isMandatory" value="false"
            onChange={(e) => setIsMandatory(e.target.value)} />
          Optionnel
        </label>
      </div>
      <button onClick={handleSubmit}>✓ Valider</button>
      <button onClick={onCancel}>✕ Annuler</button>
    </div>
  );
}
