import { useState, useEffect, useMemo } from "react";
import { useReactFlow } from "@xyflow/react";
import { useGraphStore } from "@/components/store/GraphStore";

function PanneauLateral({ isOpen }) {
    const setActiveTab = useGraphStore((state) => state.setPanelTab);
    const activeTab = useGraphStore((state) => state.panelTab);
    const nodes = useGraphStore((state) => state.nodes);
    const edges = useGraphStore((state) => state.edges);
    const [jsonRepresentation, setJsonRepresentation] = useState("");
    const { toObject } = useReactFlow();

    useEffect(() => {
        if (!isOpen) return;
        const timeoutId = setTimeout(() => {
            setJsonRepresentation(JSON.stringify(toObject(), null, 2));
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [nodes, edges, isOpen, toObject]);

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
                            {edgeList(inclusionEdges, e => (
                                <><strong>{nodeMap[e.source]}</strong> nécessite <strong>{nodeMap[e.target]}</strong></>
                            )) ?? emptyMsg("Aucune inclusion configurée.")}
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Exclusion mutuelle (A ∧ B = FALSE)</h3>
                            {edgeList(exclusionEdges, e => (
                                <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont incompatibles</>
                            )) ?? emptyMsg("Aucune exclusion configurée.")}
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Compatibilité (A ∨ B = TRUE)</h3>
                            {edgeList(compatibilityEdges, e => (
                                <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont compatibles</>
                            )) ?? emptyMsg("Aucune compatibilité configurée.")}
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Équivalence (A = B)</h3>
                            {edgeList(equivalenceEdges, e => (
                                <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont équivalents</>
                            )) ?? emptyMsg("Aucune équivalence configurée.")}
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <h3 className="font-bold mb-2">Différence (A ≠ B)</h3>
                            {edgeList(differenceEdges, e => (
                                <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont différents</>
                            )) ?? emptyMsg("Aucune différence configurée.")}
                        </div>
                    </div>
                )}
                {activeTab === "validation" && (
                    <div>
                        <li>Il ne doit exister qu'une seule racine</li>
                        <li>Un noeud doit avoir un unique parent (sauf pour la racine qui n'en a pas)</li>
                        <li>Un noeud opérateur doit avoir au moins 1 enfant</li>
                        <li>Un noeud cardinalité doit avoir au minimum le nombre d'enfants de sa cardinalité minimum (ex : pour un noeud [2..5], le noeud doit avoir au moins 2 enfants)</li>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PanneauLateral;
