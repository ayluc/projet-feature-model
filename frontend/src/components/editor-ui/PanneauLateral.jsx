import { useState, useEffect, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { CheckCircle, XCircle } from 'lucide-react';
import { useGraphStore } from "@/components/store/GraphStore";
import { useModelValidation } from "@/components/utils/useModelValidation";

function PanneauLateral({ isOpen }) {
    const setActiveTab = useGraphStore((state) => state.setPanelTab);
    const activeTab = useGraphStore((state) => state.panelTab);
    const nodes = useGraphStore((state) => state.nodes);
    const edges = useGraphStore((state) => state.edges);
    const [jsonRepresentation, setJsonRepresentation] = useState("");
    const { toObject } = useReactFlow();

        const tabStyle = (tab) => ({
        flex: 1,
        padding: '12px 8px',
        background: activeTab === tab ? '#fff' : '#f9f9f9',
        border: 'none',
        borderBottom: activeTab === tab ? '2px solid #3B82F6' : '2px solid transparent',
        cursor: 'pointer',
        fontWeight: activeTab === tab ? 'bold' : 'normal',
        color: activeTab === tab ? '#333' : '#777',
        transition: 'background 0.2s',
    });

    //// ONGLET JSON ////

    // Mise à jour du JSON du graphe lors de la mise à jour de la liste des nodes ou des edges, si le panneau latéral est ouvert
    useEffect(() => {
        if (!isOpen) return;
        const timeoutId = setTimeout(() => {
            setJsonRepresentation(JSON.stringify(toObject(), null, 2));
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [nodes, edges, isOpen, toObject]);

    //// ONGLET CONTRAINTES TRANSVERSES ////

    const emptyMsg = (msg) => (
        <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>{msg}</p>
    );

    const edgeList = (edgeArr, renderLabel) => (
        edgeArr.length > 0
            ? <ul style={{ paddingLeft: '20px', fontSize: '14px', listStyleType: 'disc' }}>
                {edgeArr.map(edge => (
                    <li key={edge.id} style={{ marginBottom: '4px' }}>{renderLabel(edge)}</li>
                ))}
            </ul>
            : null
    );

    const { inclusionEdges, exclusionEdges, compatibilityEdges, equivalenceEdges, differenceEdges } = useMemo(() => {
        const inc = [], exc = [], com = [], equ = [], dif = [];
        edges.forEach((e) => {
            if (e.data?.liaisonType === "transverse") {
                if (e.data?.isInclusion) inc.push(e);
                else if (e.data?.isExclusion) exc.push(e);
                else if (e.data?.isCompatibility) com.push(e);
                else if (e.data?.isEquivalence) equ.push(e);
                else if (e.data?.isDifference) dif.push(e);
            }
        });
        return { inclusionEdges: inc, exclusionEdges: exc, compatibilityEdges: com, equivalenceEdges: equ, differenceEdges: dif };
    }, [edges]);

    const nodeMap = useMemo(() => {
        return nodes.reduce((acc, node) => {
            acc[node.id] = node.data?.label || `Nœud ${node.id}`;
            return acc;
        }, {});
    }, [nodes]);

    //// ONGLET RÈGLES DE VALIDATION ////

    const { validationError } = useModelValidation();

    const validationRules = [
        { code: 'selfLoop',                    label: 'Aucun nœud ne pointe vers lui-même' },
        { code: 'noUniqueRoot',                label: 'Le modèle a exactement une racine (nœud sans parent)' },
        { code: 'noSingleParent',              label: 'Chaque nœud a au plus un parent' },
        { code: 'hasCycle',                    label: 'Le graphe ne contient pas de cycle' },
        { code: 'isolatedNode',                label: 'Aucun nœud isolé (sans enfant ni parent)' },
        { code: 'noChildOperator',             label: 'Tout nœud opérateur a au moins un enfant' },
        { code: 'operatorsLink',               label: 'Pas de lien direct entre deux opérateurs' },
        { code: 'operatorNotUniqueChild',      label: 'Un nœud ayant un enfant opérateur ne peut avoir aucun autre enfant' },
        { code: 'invalidCardinalityBounds',    label: 'La cardinalité minimale d\'un noeud doit être inférieure à sa cardinalité supérieur' },
        { code: 'cardinalityMaxExceedsChildren', label: 'Le nombre d\'enfants d\'un parent doit être inférieur à sa cardinalité maximale' },
        { code: 'noEnoughChildren',            label: 'Le nombre d\'enfants d\'un parent doit être supérieur à sa cardinalité minimale' },
    ];

    //// HTML ////
    return (
        <div style={{
            width: isOpen ? '320px' : '0px',
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s ease',
            borderLeft: isOpen ? '1px solid #e0e0e0' : 'none',
            background: '#fff',
        }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', minWidth: '320px' }}>
                <button onClick={() => setActiveTab("json")} style={tabStyle("json")}>JSON</button>
                <button onClick={() => setActiveTab("rules")} style={tabStyle("rules")}>Contraintes transverses</button>
                <button onClick={() => setActiveTab("validation")} style={tabStyle("validation")}>Règles de validation</button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minWidth: '320px' }}>
                {activeTab === "json" && (
                    <pre style={{
                        fontSize: '11px', background: '#f5f5f5', borderRadius: '6px',
                        padding: '10px', overflowX: 'auto', whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all', margin: 0
                    }}>
                        {jsonRepresentation}
                    </pre>
                )}

                {activeTab === "rules" && (
                    <div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Inclusion (A ⇒ B)</h3>
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
                            <div style={{ marginTop: '8px' }}>
                                {edgeList(inclusionEdges, e => (
                                    <><strong>{nodeMap[e.source]}</strong> nécessite <strong>{nodeMap[e.target]}</strong></>
                                )) ?? emptyMsg("Aucune inclusion configurée.")}
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Exclusion mutuelle (A ∧ B = FALSE)</h3>
                            <hr className="exclusion-line-dotted" />
                            <div style={{ marginTop: '8px' }}>
                                {edgeList(exclusionEdges, e => (
                                    <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont incompatibles</>
                                )) ?? emptyMsg("Aucune exclusion configurée.")}
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Compatibilité (A ∨ B = TRUE)</h3>
                            <hr className="compatibility-line-dotted" />
                            <div style={{ marginTop: '8px' }}>
                                {edgeList(compatibilityEdges, e => (
                                    <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont compatibles</>
                                )) ?? emptyMsg("Aucune compatibilité configurée.")}
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Équivalence (A = B)</h3>
                            <hr className="equivalence-line-dotted" />
                            <div style={{ marginTop: '8px' }}>
                                {edgeList(equivalenceEdges, e => (
                                    <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont équivalents</>
                                )) ?? emptyMsg("Aucune équivalence configurée.")}
                            </div>
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Différence (A ≠ B)</h3>
                            <hr className="difference-line-dotted" />
                            <div style={{ marginTop: '8px' }}>
                                {edgeList(differenceEdges, e => (
                                    <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont différents</>
                                )) ?? emptyMsg("Aucune différence configurée.")}
                            </div>
                        </div>
                    </div>
                )}
                {activeTab === "validation" && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {validationRules.map(({ code, label }) => {
                            const violated = validationError === code;
                            return (
                                <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {violated
                                        ? <XCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                                        : <CheckCircle size={16} color="#22c55e" style={{ flexShrink: 0 }} />}
                                    <span style={{ fontSize: '13px', color: violated ? '#ef4444' : '#374151' }}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PanneauLateral;
