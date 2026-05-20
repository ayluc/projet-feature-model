import React from 'react';
import { useState } from 'react';

import { useDnD } from '@/components/DnDContext';
import { Button } from "@/components/ui/button";
import { getLayoutedElements } from '@/components/utils/layout';
import { useGraphStore } from '@/components/GraphStore';
import { useModelValidation } from '../utils/useModelValidation';

export default ({ isReadOnly = false }) => {
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

  const handleNoeuds = () => {
    const { layoutedNodes } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
  };

  const { validate } = useModelValidation(isReadOnly);

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
        {isReadOnly && (
          <>
            <div className="feature-included-legende-item">
              <span className="legende-label">Noeud feature inclus <em style={{ fontSize: '11px', opacity: 0.7 }}>(manuel)</em></span>
            </div>
            <div className="feature-excluded-legende-item">
              <span className="legende-label">Noeud feature exclus <em style={{ fontSize: '11px', opacity: 0.7 }}>(manuel)</em></span>
            </div>
            <div className="feature-included-inferred-legende-item">
              <span className="legende-label">Noeud feature inclus <em style={{ fontSize: '11px', opacity: 0.7 }}>(inféré)</em></span>
            </div>
            <div className="feature-excluded-inferred-legende-item">
              <span className="legende-label">Noeud feature exclus <em style={{ fontSize: '11px', opacity: 0.7 }}>(inféré)</em></span>
            </div>
          </>
        )}
        <div className="line-legende-item">
          <span className="legende-label">Arc obligatoire</span>
          <hr className="mandatory-line-solid" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc optionnel</span>
          <hr className="optional-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc d'inclusion (A =&#62; B)</span>
          <hr className="inclusion-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc d'exclusion mutuelle (A /\ B = FALSE)</span>
          <hr className="exclusion-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc de compatibilité (A \/ B = TRUE)</span>
          <hr className="compatibility-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc d'équivalence (A = B)</span>
          <hr className="equivalence-line-dotted" />
        </div>
        <div className="line-legende-item">
          <span className="legende-label">Arc de différence (A ≠ B)</span>
          <hr className="difference-line-dotted" />
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
                value="inclusion"
                checked={arcType === "inclusion"}
                onChange={() => { }}
                onClick={() => handleChange("inclusion")}
              />
              Inclusion
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="exclusion"
                checked={arcType === "exclusion"}
                onChange={() => { }}
                onClick={() => handleChange("exclusion")}
              />
              Exclusion mutuelle
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="compatibility"
                checked={arcType === "compatibility"}
                onChange={() => { }}
                onClick={() => handleChange("compatibility")}
              />
              Compatibilité
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="equivalence"
                checked={arcType === "equivalence"}
                onChange={() => { }}
                onClick={() => handleChange("equivalence")}
              />
              Equivalence
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6e6d68', cursor: 'pointer' }}>
              <input
                type="radio"
                name="arcType"
                value="difference"
                checked={arcType === "difference"}
                onChange={() => { }}
                onClick={() => handleChange("difference")}
              />
              Différence
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
      <Button variant="outline" onClick={validate} className="reorganize-button mb-4">
        Validation du graphe
      </Button>
    </aside>


  );
};