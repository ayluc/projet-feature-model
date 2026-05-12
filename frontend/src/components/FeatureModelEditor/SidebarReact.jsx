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
          id: String(node.id).match(/[0-9]+/) ? parseInt(String(node.id).match(/[0-9]+/)[0], 10) : 1,
          status: node.data?.configStatus || null
        })
        );


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
      // -- Étape 1 : construire des maps pour accès rapide
      const edgeMap = {};   // source -> [targets]
      const parentMap = {}; // target -> source
      edges.forEach(e => {
        if (!edgeMap[e.source]) edgeMap[e.source] = [];
        edgeMap[e.source].push(e.target);
        parentMap[e.target] = e.source;
      });

      const nodeMap = {};
      nodes.forEach(n => nodeMap[n.id] = n);

      // -- Étape 2 : pour chaque nœud opérateur, remonter la cardinalité au parent feature
      const operatorTypes = ["or", "xor", "cardinalite"];
      const operatorIds = new Set(
        nodes.filter(n => operatorTypes.includes(n.type)).map(n => n.id)
      );

      // cardinalité héritée par chaque feature parent d'un opérateur
      const inheritedOperator = {}; // featureId -> { type, min, max, operatorId }
      operatorIds.forEach(opId => {
        const op = nodeMap[opId];
        const parentId = parentMap[opId];
        if (!parentId) return;

        let min, max;
        if (op.type === "xor") { min = 1; max = 1; }
        else if (op.type === "or") { min = 1; max = (edgeMap[opId] || []).length; }
        else if (op.type === "cardinalite") {
          min = parseInt(op.data?.cardinaliteMin, 10);
          max = parseInt(op.data?.cardinaliteMax, 10);
        }
        inheritedOperator[parentId] = { type: op.type, min, max, operatorId: opId };
      });

      // -- Étape 3 : Construire les nœuds finaux (features uniquement)
      const formattedNodes = nodes
        .filter(n => !operatorTypes.includes(n.type))
        .map(n => {
          const numericId = parseInt(String(n.id).match(/\d+/)[0], 10);
          const inherited = inheritedOperator[n.id];

          const formattedNode = { id: numericId, type: "feature" };

          if (inherited) {
            formattedNode.operatorType = inherited.type;
            formattedNode.cardinaliteMin = inherited.min;
            formattedNode.cardinaliteMax = inherited.max;
          }

          return formattedNode;
        });

      // -- Étape 4 : Construire les arcs en "court-circuitant" les opérateurs
      const formattedArcs = edges
        .filter(e => "isMandatory" in e.data)
        .reduce((acc, edge) => {
          const sourceId = edge.source;
          const targetId = edge.target;

          if (operatorIds.has(targetId)) return acc;

          const realSourceId = operatorIds.has(sourceId)
            ? parentMap[sourceId]
            : sourceId;

          if (!realSourceId) return acc;

          acc.push({
            id: 0, 
            source: parseInt(String(realSourceId).match(/\d+/)[0], 10),
            target: parseInt(String(targetId).match(/\d+/)[0], 10),
            type: operatorIds.has(sourceId) ? "optional" : (edge.data.isMandatory ? "mandatory" : "optional"),
          });

          return acc;
        }, []);

      // Renuméroter proprement les ID d'arcs à partir de 1
      formattedArcs.forEach((a, i) => a.id = i + 1);

      // -- Étape 5 : Les liens transverses
      const formattedLinks = edges
        .filter(e => "isExclusion" in e.data)
        .map((edge, i) => ({
          id: i + 1,
          source: parseInt(String(edge.source).match(/\d+/)[0], 10),
          target: parseInt(String(edge.target).match(/\d+/)[0], 10),
          type: edge.data.isExclusion ? "exclusion" : "dependancy",
        }));

      const payload = {
        nodes: formattedNodes,
        arcs: formattedArcs,
        links: formattedLinks,
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