import React from 'react';
import { useState } from 'react';

import { useDnD } from '@/components/DnDContext';
import { Button } from "@/components/ui/button";
import { getLayoutedElements } from '@/components/utils/layout';
import { useGraphStore } from '@/components/GraphStore';


export default () => {
  const [_, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };
  const [selected, setSelected] = useState(null);

  const handleChange = (value) => {
    setSelected(prev => prev === value ? null : value);
  };

  const nodes = useGraphStore((state) => state.nodes);
  const setNodes = useGraphStore((state) => state.setNodes);
  const edges = useGraphStore((state) => state.edges);

  const isLayoutAuto = useGraphStore((state) => state.isLayoutAuto);
  const setLayout = useGraphStore((state) => state.setLayout);

  const handleNoeuds = () => {
    const { layoutedNodes } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
  };

  return (
    <aside>
      <h2 className="text-lg font-bold mb-1">LÉGENDE</h2>
      <div className="legende">
        <div className="feature-legende-item">
          <span className="legende-label">Noeud feature</span>
        </div>
        <div className="operator-legende-item">
          <span className="legende-label">Noeud opérateur</span>
        </div>
        <div className="mandatory-legende-item">
          <span className="legende-label">Arc obligatoire</span>
          <hr className="line-solid" />
        </div>
        <div className="optionnal-legende-item">
          <span className="legende-label">Arc optionnel</span>
          <hr className="line-dotted" />
        </div>
      </div>
      <div style={{ margin: "16px 0" }}>
        <hr class="solid" style={{ "border": "1px solid #444444ff" }} />
      </div>
      <h2 className="text-lg font-bold mb-1">CRÉATION</h2>

      <h4 className="text-md font-bold mb-1">Noeuds</h4>
      <div className="description">Faire glisser les noeuds à ajouter au modèle</div>
      <div className="dndnode feature" onDragStart={(event) => onDragStart(event, 'feature')} draggable>
        Feature
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'or')} draggable>
        OR
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'xor')} draggable>
        XOR
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'cardinalite')} draggable>
        CARDINALITÉ
      </div>
      <h4 className="text-md font-bold mb-1">Liaisons</h4>
      <div className="description">Sélectionner le type d'arc à appliquer automatiquement.</div>
      <div style={{ display: 'flex', gap: '4px', flexDirection: 'column', marginBottom: '8px' }}>
        <label>
          <input
            type="radio"
            name="arcType"
            value="mandatory"
            checked={selected === "mandatory"}
            onChange={() => { }}
            onClick={() => handleChange("mandatory")} // ← onClick important pour détecter le re-clic
          />
          {" "}Obligatoire
        </label>
        <label>
          <input
            type="radio"
            name="arcType"
            value="optional"
            checked={selected === "optional"}
            onChange={() => { }}
            onClick={() => handleChange("optional")}
          />
          {" "}Optionnel
        </label>
      </div>
      <h4 className="text-md font-bold mb-2">Réorganisation du graphe</h4>
      <div >
        <Button variant="outline" onClick={handleNoeuds} className='reorganize-button'>Réorganisation du graphe</Button>
      </div>
      <div className="toggle-wrapper">
        <label className="toggle-label">Disposition automatique du graphe</label>
        <label className="toggle-switch">
          <input
            type="checkbox"
            defaultChecked={isLayoutAuto}
            onChange={() => setLayout(!isLayoutAuto)}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    </aside>
  );
};