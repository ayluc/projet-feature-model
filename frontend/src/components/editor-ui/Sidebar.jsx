import React from 'react';
import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

import { useDnD } from '@/components/utils/DnDContext';
import { Button } from "@/components/shadcn-ui/button";
import { getLayoutedElements } from '@/components/utils/layout';
import { useGraphStore } from '@/components/store/GraphStore';
import { modelValidation } from '../utils/modelValidation';
import CustomPopup from '../popups/CustomPopup';

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

  const handleReinit = () => {
    setNodes(nds => nds.map(n => ({
      ...n,
      className: '',
      data: { ...n.data, configStatus: null, configSource: null }
    })));
  }

  const { validationError, customPopup, setCustomPopup } = modelValidation(isReadOnly);

  const featureNodes = nodes.filter(n => n.type === 'feature');
  const isConfigComplete = featureNodes.length > 0 && featureNodes.every(n => n.data.configStatus !== null);

  const toggleTransverse = (
    <div className="toggle-wrapper">
      <label className="toggle-label">Affichage des liaisons transverses</label>
      <label className="toggle-switch">
        <input
          type="checkbox"
          defaultChecked={isTransverseVisible}
          onChange={() => setTransverseVisible(!isTransverseVisible)}
          checked={isTransverseVisible}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );

  const callAssemblage = async () => {
    try {
      const response = await fetch('http://localhost:8080/assemblage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: null,
      });

      const data = await response.json();

      console.log(data);
    } catch (error) {
      console.error("Erreur de validation :", error);
    }
  }

  return (
    <>
      <aside>
        {!isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h2 className="text-xs font-bold">VALIDITÉ DU MODÈLE</h2>
            {validationError === null
              ? <CheckCircle size={20} color="#22c55e" />
              : <XCircle size={20} color="#ef4444" />}
          </div>
        )}
        {isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h2 className="text-xs font-bold">CONFIGURATION COMPLÉTÉE</h2>
            {isConfigComplete
              ? <CheckCircle size={20} color="#22c55e" />
              : <XCircle size={20} color="#ef4444" />}
          </div>
        )}

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
            <div className="legende mb-4">
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
            </div>
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
            <svg width="100%" height="10" style={{ display: "block", marginTop: "4px" }}>
              <defs>
                <marker id="legend-inclusion-arrow" markerWidth="7" markerHeight="6" refX="6" refY="3" orient="auto">
                  <polygon points="0 0, 7 3, 0 6" fill="#3B82F6" />
                </marker>
              </defs>
              <line x1="2" y1="5" x2="94%" y2="5"
                stroke="#3B82F6" strokeWidth="2" strokeDasharray="8 3"
                markerEnd="url(#legend-inclusion-arrow)" />
            </svg>
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
          <br />
        </div>

        <hr style={{ border: "1px solid #e0e0e0", marginBottom: "16px" }} />
        {isReadOnly ? toggleTransverse : null}

        {isReadOnly && (
          <div>
            <Button variant="outline" className="reinit-button mb-4" onClick={handleReinit}>Réinitialiser la configuration</Button>
          </div>
        )}
        {isReadOnly && (
          <div>
            <Button variant="outline" className="assemblage-button mb-4" onClick={callAssemblage}>Assemblage</Button>
          </div>
        )}

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

      </aside>
      <CustomPopup dialog={customPopup} onClose={() => setCustomPopup(null)} />
    </>
  );
};