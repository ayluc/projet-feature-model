import React from 'react';
import { useState } from 'react';

import { useDnD } from '@/components/DnDContext';
import { Button } from "@/components/ui/button";
import { getLayoutedElements } from '@/components/utils/layout';
import { useGraphStore } from '@/components/GraphStore';

export default ({ isReadOnly = false }) => {  // ← prop ajoutée
  const [_, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const arcType = useGraphStore((state) => state.arcType);
  const setArcType = useGraphStore((state) => state.setArcType);

  const handleChange = (value) => {
    setArcType(arcType === value ? null : value);
  };

  const nodes = useGraphStore((state) => state.nodes);
  const setNodes = useGraphStore((state) => state.setNodes);
  const edges = useGraphStore((state) => state.edges);

  const isLayoutAuto = useGraphStore((state) => state.isLayoutAuto);
  const setLayout = useGraphStore((state) => state.setLayout);
  const isTransverseVisible = useGraphStore((state) => state.isTransverseVisible);
  const setTransverseVisible = useGraphStore((state) => state.setTransverseVisible);

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleNoeuds = () => {
    const { layoutedNodes } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
  };

  const handleValidateModel = async () => {
    // Mode configuration
    if (isReadOnly) {
      const formattedNodes = nodes
        .filter(node => node.type === "feature")
        .map(node => ({
          id: parseInt(node.id, 10),
          status: node.data?.configStatus || null
        }));


      const payload = {
        nodes: formattedNodes,
      };

      console.log(payload);

      try {
        const response = await fetch('http://localhost:8080/validate-configuration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur lors de la validation');
        }
        console.log(data);

        setResult(data);
        setError(null);
      } catch (err) {
        console.error("Erreur de communication avec le back:", err);
        setError(err.message);
        setResult(null);
      }
    }
    else // Mode création
    {
      const formattedNodes = nodes.map(node => {
        const formattedNode = {
          id: parseInt(node.id, 10),
          type: node.type
        }

        if (node.type === "cardinalite" && node.data) {
          console.log("Node cardinalité avant formatage : ", node, node.data.cardinaliteMin, node.data.cardinaliteMax);
          formattedNode.cardinaliteMax = parseInt(node.data.cardinaliteMax, 10);
          formattedNode.cardinaliteMin = parseInt(node.data.cardinaliteMin, 10);
        }

        return formattedNode;
      });

    const formattedEdges = edges.map(edge => {
      console.log("Edge avant formatage : ", edge, edge.data.isMandatory, edge.data.isExclusion);
      const formattedEdge = {
        id: parseInt(edge.id),
        source: parseInt(edge.source),
        target: parseInt(edge.target),
        type: edge.data
          ? ("isMandatory" in edge.data
            ? (edge.data.isMandatory ? "mandatory" : "optional")
            : (edge.data.isExclusion ? "exclusion" : "dependancy"))
          : "dependancy"
      }

        return formattedEdge;
      });

    const payload = {
      nodes: formattedNodes,
      edges: formattedEdges
    };

    console.log("Payload envoyé au back : ", JSON.stringify(payload));

      try {
        const response = await fetch('http://localhost:8080/validate-creation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la validation');
      }
      console.log("DATA : ", data);

        setResult(data);
        setError(null);
      } catch (err) {
        console.error("Erreur de communication avec le back:", err);
        setError(err.message);
        setResult(null);
      }
    }
  };

  const toggleTransverse = (
    <div className="toggle-wrapper">
      <label className="toggle-label">Affichage des liaisons transverses</label>
      <label className="toggle-switch">
        <input
          type="checkbox"
          defaultChecked={isTransverseVisible}
          onChange={() => setTransverseVisible(!isTransverseVisible)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );

  return (
    <aside>
      {/* LÉGENDE */}
      <h2 className="text-lg font-bold mb-3">LÉGENDE</h2>
      <div className="legende mb-4">
        <div className="feature-legende-item">
          <span className="legende-label">Noeud feature</span>
        </div>
        <div className="operator-legende-item">
          <span className="legende-label">Noeud opérateur</span>
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc obligatoire</span>
          <hr className="mandatory-line-solid" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc optionnel</span>
          <hr className="optional-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc de dépendance (source → target)</span>
          <hr className="dependancy-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc d'incompatibilité</span>
          <hr className="incompatibility-line-dotted" />
        </div>
      </div>

      <hr style={{ border: "1px solid #e0e0e0", marginBottom: "16px" }} />

      {isReadOnly ? toggleTransverse : null}

      {!isReadOnly && (
        <>
          {/* CRÉATION */}
          <h2 className="text-lg font-bold mb-3">CRÉATION</h2>

          <h4 className="text-sm font-semibold mb-2 text-[#6e6d68] uppercase tracking-wide">Noeuds</h4>
          <p className="description mb-3">Faire glisser les noeuds à ajouter au modèle</p>
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

          <h4 className="text-sm font-semibold mt-4 mb-2 text-[#6e6d68] uppercase tracking-wide">Liaisons</h4>
          {toggleTransverse}
          <p className="description mb-3">Sélectionner le type d'arc à appliquer automatiquement entre deux noeuds feature.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="mandatory"
                checked={arcType === "mandatory"}
                onChange={() => { }}
                onClick={() => handleChange("mandatory")}
              />
              Obligatoire
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="optional"
                checked={arcType === "optional"}
                onChange={() => { }}
                onClick={() => handleChange("optional")}
              />
              Optionnel
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="requires"
                checked={arcType === "requires"}
                onChange={() => { }}
                onClick={() => handleChange("requires")}
              />
              Dépendance
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="excludes"
                checked={arcType === "excludes"}
                onChange={() => { }}
                onClick={() => handleChange("excludes")}
              />
              Exclusion
            </label>
          </div>

          <h4 className="text-sm font-semibold mb-2 text-[#6e6d68] uppercase tracking-wide">Réorganisation</h4>
          <Button variant="outline" onClick={handleNoeuds} className="reorganize-button mb-4">
            Réorganisation du graphe
          </Button>

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


        </>
      )}

      <h4 className="text-sm font-semibold mb-2 text-[#6e6d68] uppercase tracking-wide">Back-end</h4>
      <Button variant="outline" onClick={handleValidateModel} className="reorganize-button mb-4">
        Validation du graphe
      </Button>
    </aside>


  );
};