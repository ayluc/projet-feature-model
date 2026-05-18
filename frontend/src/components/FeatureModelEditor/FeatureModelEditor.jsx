import React, { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { ReactFlow, Controls, Background, useReactFlow, ControlButton, MarkerType } from "@xyflow/react";
import { Undo2, Redo2 } from "lucide-react";

import { useDnD } from '@/components/DnDContext';
import { useGraphStore, useTemporalStore } from '@/components/GraphStore';
import { NodeFeature, NodeXOR, NodeOR, NodeCardinalite } from "@/components/nodes";

import FeatureCreationPopup from "./FeatureCreationPopup";
import CardinaliteCreationPopup from "./CardinaliteCreationPopup";
import LinkCreationPopup from "./LinkCreationPopup";
import ContextMenu from "./ContextMenu";

const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  cardinalite: NodeCardinalite
};

// Retourne le style et les markers selon le type transverse
function getTransverseStyle(data) {
  if (data?.isInclusion) return {
    edgeStyle: { strokeWidth: 2, strokeDasharray: "8 3", stroke: "#5b8dee" },
    edgeMarkers: { markerEnd: { type: MarkerType.ArrowClosed, color: "#5b8dee", width: 18, height: 18 } },
  };
  if (data?.isExclusion) return {
    edgeStyle: { strokeWidth: 2, strokeDasharray: "2 4", stroke: "#d9534f" },
    edgeMarkers: { markerEnd: null },
  };
  if (data?.isCompatibility) return {
    edgeStyle: { strokeWidth: 2, strokeDasharray: "4 4", stroke: "#daac17" },
    edgeMarkers: { markerEnd: null },
  };
  if (data?.isEquivalence) return {
    edgeStyle: { strokeWidth: 5, stroke: "#19b420" }, // double ligne gérée via edgeType custom
    edgeMarkers: { markerEnd: null },
  };
  if (data?.isDifference) return {
    edgeStyle: { strokeWidth: 1, stroke: "#d9534f" },
    edgeMarkers: { markerEnd: null },
  };
  return { edgeStyle: {}, edgeMarkers: {} };
}

function FeatureModelEditor({ isReadOnly = false }) {
  const reactFlowWrapper = useRef(null);

  const nodes = useGraphStore((state) => state.nodes);
  const setNodes = useGraphStore((state) => state.setNodes);
  const onNodesChange = useGraphStore((state) => state.onNodesChange);
  const edges = useGraphStore((state) => state.edges);
  const setEdges = useGraphStore((state) => state.setEdges);
  const onEdgesChange = useGraphStore((state) => state.onEdgesChange);
  const onConnect = useGraphStore((state) => state.onConnect);
  const onDelete = useGraphStore((state) => state.onDelete);

  const undo = useTemporalStore((state) => state.undo);
  const redo = useTemporalStore((state) => state.redo);
  const pastStates = useTemporalStore((state) => state.pastStates);
  const futureStates = useTemporalStore((state) => state.futureStates);
  const pause = useTemporalStore((state) => state.pause);
  const resume = useTemporalStore((state) => state.resume);
  const isTransverseVisible = useGraphStore((state) => state.isTransverseVisible);

  const [menu, setMenu] = useState(null);
  const [popup, setPopup] = useState(null);

  const { screenToFlowPosition, getNode, getEdge } = useReactFlow();
  const [type] = useDnD();
  const isDragging = useRef(false);

  const [panelOpen, setPanelOpen] = useState(false);
  const arcType = useGraphStore((state) => state.arcType);
  const [jsonRepresentation, setJsonRepresentation] = useState("");

  const OFFSET_TOP = 100;
  const OFFSET_LEFT = 200;

  const { toObject } = useReactFlow();

  let edgeMarkers = {};

  const onNodeClick = useCallback((event, clickedNode) => {
    event.stopPropagation();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === clickedNode.id ? { ...n, selected: !n.selected } : { ...n, selected: false }
      )
    );
  }, [setNodes, isReadOnly]);

  const getNextNodeFeatureId = useCallback(() => {
    const maxId = nodes
      .filter(n => n.type === "feature")
      .reduce((max, node) => {
        const regex = /[0-9]+/;
        const match = String(node.id).match(regex);
        const idNum = match ? parseInt(match[0], 10) : 0;
        return Math.max(max, idNum);
      }, 0);
    return "feature-" + (maxId + 1).toString();
  }, [nodes]);

  const getNextNodeOperateurId = useCallback(() => {
    const maxId = nodes
      .filter(n => n.type === "or" || n.type === "xor" || n.type === "cardinalite")
      .reduce((max, node) => {
        const regex = /[0-9]+/;
        const match = String(node.id).match(regex);
        const idNum = match ? parseInt(match[0], 10) : 0;
        return Math.max(max, idNum);
      }, 0);
    return "operateur-" + (maxId + 1).toString();
  }, [nodes]);

  const getNextEdgeId = useCallback(() => {
    const maxId = edges.reduce((max, edge) => {
      const idNum = parseInt(edge.id, 10);
      return isNaN(idNum) ? max : Math.max(max, idNum);
    }, 0);
    return (maxId + 1).toString();
  }, [edges]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      if (isReadOnly) return;
      setMenu({
        id: node.id,
        label: node.data?.label ?? node.id,
        type: "node",
        top: event.clientY - OFFSET_TOP,
        left: event.clientX - OFFSET_LEFT,
      });
    },
    [isReadOnly]
  );

  const onEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      if (isReadOnly) return;
      const restrictedTypes = ["xor", "or", "cardinalite"];
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const isEditable = !restrictedTypes.includes(sourceNode?.type) && !restrictedTypes.includes(targetNode?.type);
      setMenu({
        id: edge.id,
        label: `Lien ${sourceNode.data?.label} → ${targetNode.data?.label}`,
        type: "edge",
        isEditable,
        top: event.clientY - OFFSET_TOP,
        left: event.clientX - OFFSET_LEFT,
      });
    },
    [isReadOnly, nodes]
  );

  const onConnection = useCallback(
    (connection) => {
      if (isReadOnly) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      const restrictedTypes = ["xor", "or", "cardinalite"];
      const newEdgeId = getNextEdgeId();
      const connectionWithId = { ...connection, id: newEdgeId };

      if (restrictedTypes.includes(sourceNode?.type) || restrictedTypes.includes(targetNode?.type)) {
        onConnect({
          ...connectionWithId,
          data: { isMandatory: false },
          style: { strokeWidth: 2, strokeDasharray: "6 3" },
        });
        return;
      }

      if (arcType === "mandatory") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "simple", isMandatory: true },
          style: { strokeWidth: 2.5, strokeDasharray: "none" },
        });
        return;
      }

      if (arcType === "optional") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "simple", isMandatory: false },
          style: { strokeWidth: 2, strokeDasharray: "6 3" },
        });
        return;
      }

      if (arcType === "inclusion") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isInclusion: true },
          style: { strokeWidth: 2, strokeDasharray: "8 3", stroke: "#5b8dee" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#5b8dee", width: 18, height: 18 },
        });
        return;
      }

      if (arcType === "exclusion") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isExclusion: true },
          style: { strokeWidth: 2, strokeDasharray: "2 4", stroke: "#d9534f" },
          markerEnd: null,
        });
        return;
      }

      if (arcType === "compatibility") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isCompatibility: true },
          style: { strokeWidth: 2, strokeDasharray: "4 4", stroke: "#daac17" },
          markerEnd: null,
        });
        return;
      }

      if (arcType === "equivalence") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isEquivalence: true },
          style: { strokeWidth: 5, stroke: "#19b420" },
          markerEnd: null,
        });
        return;
      }

      if (arcType === "difference") {
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isDifference: true },
          style: { strokeWidth: 1, stroke: "#d9534f" },
          markerEnd: null,
        });
        return;
      }

      setPopup({
        nodeType: "link",
        linkSource: connection.source,
        linkTarget: connection.target,
        pendingConnection: connectionWithId,
        isTransverseAllowed: !restrictedTypes.includes(sourceNode?.type) && !restrictedTypes.includes(targetNode?.type),
      });
      setMenu(null);
    },
    [isReadOnly, nodes, onConnect, arcType, getNextEdgeId]
  );

  const onPaneClick = useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false;
      return;
    }
    if (popup) return;
    setMenu(null);
  }, [popup]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!type || isReadOnly) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const newId = type === "feature" ? getNextNodeFeatureId() : getNextNodeOperateurId();

      if (type === "feature" || type === "cardinalite") {
        setPopup({ pendingNode: { id: newId, type, position }, nodeType: type });
      } else {
        setNodes((nds) => nds.concat({ id: newId, type, position, data: { label: type.toUpperCase() } }));
      }
    },
    [screenToFlowPosition, type, setNodes, isReadOnly, getNextNodeFeatureId, getNextNodeOperateurId]
  );

  const handleNodesChange = useCallback((changes) => {
    const isMinorChange = changes.every((c) => c.type === 'select' || c.type === 'dimensions');
    if (isMinorChange) pause();
    const modifiedChanges = isReadOnly
      ? changes.map((change) => {
          if (change.type === 'select' && !change.selected) {
            const node = nodes.find(n => n.id === change.id);
            if (node?.selected) return { ...change, selected: true };
          }
          return change;
        })
      : changes;
    onNodesChange(modifiedChanges);
    if (isMinorChange) resume();
  }, [onNodesChange, pause, resume, nodes, isReadOnly]);

  useEffect(() => {
    if (!panelOpen) return;
    const timeoutId = setTimeout(() => {
      setJsonRepresentation(JSON.stringify(toObject(), null, 2));
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, panelOpen, toObject]);

  useEffect(() => {
    if (!isReadOnly) {
      setNodes(nds => nds.map(n => ({
        ...n,
        className: '',
        data: { ...n.data, configStatus: null }
      })));
    }
  }, [isReadOnly]);

  const enrichedNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      className: n.data.configStatus === 'included' ? 'node-included'
        : n.data.configStatus === 'excluded' ? 'node-excluded' : '',
      data: {
        ...n.data,
        isReadOnly,
        onConfigChange: (nodeId, status) => {
          setNodes(nds => nds.map(nd =>
            nd.id === nodeId
              ? { ...nd, data: { ...nd.data, configStatus: nd.data.configStatus === status ? null : status } }
              : nd
          ));
        }
      }
    }));
  }, [nodes, isReadOnly, setNodes]);

  const nodeMap = useMemo(() => {
    return nodes.reduce((acc, node) => {
      acc[node.id] = node.data?.label || `Nœud ${node.id}`;
      return acc;
    }, {});
  }, [nodes]);

  const visibleEdges = useMemo(() => {
    return isTransverseVisible
      ? edges
      : edges.filter(e => e.data?.liaisonType !== "transverse");
  }, [edges, isTransverseVisible]);

  // ✅ Correction : chaque type transverse est filtré indépendamment
  const { dependancyEdges, exclusionEdges, compatibilityEdges, equivalenceEdges, differenceEdges } = useMemo(() => {
    const dep = [], exc = [], com = [], equ = [], dif = [];
    edges.forEach((e) => {
      if (e.data?.liaisonType === "transverse") {
        if (e.data?.isDependancy)     dep.push(e);
        else if (e.data?.isExclusion)     exc.push(e);
        else if (e.data?.isCompatibility) com.push(e);
        else if (e.data?.isEquivalence)   equ.push(e);
        else if (e.data?.isDifference)    dif.push(e);
      }
    });
    return { dependancyEdges: dep, exclusionEdges: exc, compatibilityEdges: com, equivalenceEdges: equ, differenceEdges: dif };
  }, [edges]);

  const [activeTab, setActiveTab] = useState("json");

  const tabStyle = (tab) => ({
    flex: 1,
    padding: '12px 8px',
    background: activeTab === tab ? '#fff' : '#f9f9f9',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid #5b8dee' : '2px solid transparent',
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

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        style={{
          position: 'absolute',
          right: panelOpen ? '320px' : '0px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          transition: 'right 0.3s ease',
          background: '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '6px 0 0 6px',
          padding: '8px 4px',
          cursor: 'pointer',
          boxShadow: '-2px 0 6px rgba(0,0,0,0.1)',
        }}
      >
        {panelOpen ? '›' : '‹'}
      </button>

      <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ flex: 1, minWidth: 0 }}>
        <ReactFlow
          nodes={enrichedNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          onNodesChange={isReadOnly ? undefined : handleNodesChange}
          onEdgesChange={isReadOnly ? undefined : onEdgesChange}
          onConnect={onConnection}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeDragStart={() => pause()}
          onNodeDragStop={() => resume()}
          fitView
          nodesDraggable={!isReadOnly}
          nodesConnectable={!isReadOnly}
          onDelete={isReadOnly ? undefined : onDelete}
          onNodeClick={onNodeClick}
          multiSelectionKeyCode={null}
          deselectOnClick={true}
        >
          <Controls position="top-right" showInteractive={!isReadOnly}>
            <ControlButton
              title="Annuler"
              className="undo-redo-button"
              onClick={() => undo()}
              disabled={pastStates.length === 0}
              style={{ opacity: pastStates.length === 0 ? 0.5 : 1, cursor: pastStates.length === 0 ? 'not-allowed' : 'pointer', display: isReadOnly ? "none" : "block" }}
            >
              <Undo2 />
            </ControlButton>
            <ControlButton
              title="Rétablir"
              className="undo-redo-button"
              onClick={() => redo()}
              disabled={futureStates.length === 0}
              style={{ opacity: futureStates.length === 0 ? 0.5 : 1, cursor: futureStates.length === 0 ? 'not-allowed' : 'pointer', display: isReadOnly ? "none" : "block" }}
            >
              <Redo2 />
            </ControlButton>
          </Controls>
          <Background />

          {menu && (
            <ContextMenu
              {...menu}
              onClick={onPaneClick}
              onOpenPopup={(popupData) => {
                setMenu(null);
                if (menu.type === "edge") {
                  const edge = getEdge(popupData.edgeId ?? menu.id);
                  const restrictedTypes = ["xor", "or", "cardinalite"];
                  const sourceNode = nodes.find(n => n.id === edge?.source);
                  const targetNode = nodes.find(n => n.id === edge?.target);
                  if (restrictedTypes.includes(sourceNode?.type) || restrictedTypes.includes(targetNode?.type)) return;
                  setPopup({
                    nodeType: "link",
                    linkId: edge?.id,
                    linkSource: edge?.source,
                    linkTarget: edge?.target,
                    data: edge?.data,
                    isTransverseAllowed: !restrictedTypes.includes(sourceNode?.type) && !restrictedTypes.includes(targetNode?.type),
                  });
                  return;
                }
                const node = getNode(popupData.nodeId);
                setPopup({ ...popupData, nodeType: node?.type, data: node?.data });
              }}
            />
          )}
        </ReactFlow>

        <FeatureCreationPopup
          popup={popup && popup.nodeType === "feature" ? popup : null}
          onClose={() => setPopup(null)}
          onConfirm={(nodeData) => {
            if (popup?.nodeId && !popup?.pendingNode) {
              setNodes((nds) => nds.map((n) =>
                n.id === popup.nodeId ? { ...n, data: { ...n.data, label: nodeData.nodeName } } : n
              ));
              setPopup(null);
              return;
            }
            if (!popup?.pendingNode) return;
            setNodes((nds) => nds.concat({ ...popup.pendingNode, data: { label: nodeData.nodeName } }));
            setPopup(null);
          }}
        />

        <CardinaliteCreationPopup
          popup={popup && popup.nodeType === "cardinalite" ? popup : null}
          onClose={() => setPopup(null)}
          onConfirm={(nodeData) => {
            const cardData = {
              label: `[${nodeData.cardinaliteMin}..${nodeData.cardinaliteMax}]`,
              cardinaliteMin: parseInt(nodeData.cardinaliteMin),
              cardinaliteMax: parseInt(nodeData.cardinaliteMax),
            };
            if (popup?.nodeId && !popup?.pendingNode) {
              setNodes((nds) => nds.map((n) =>
                n.id === popup.nodeId ? { ...n, data: { ...n.data, ...cardData } } : n
              ));
              setPopup(null);
              return;
            }
            if (!popup?.pendingNode) return;
            setNodes((nds) => nds.concat({ ...popup.pendingNode, data: cardData }));
            setPopup(null);
          }}
        />

        <LinkCreationPopup
          popup={popup && popup.nodeType === "link" ? popup : null}
          onClose={() => setPopup(null)}
          onConfirm={(linkData) => {
            const { liaisonType, isMandatory: isMandatoryRaw, isDependancy, isExclusion, isCompatibility, isEquivalence, isDifference } = linkData;
            const isMandatory = isMandatoryRaw === "true";

            let edgeStyle = {};
            let edgeData = {};

            if (liaisonType === "simple") {
              edgeData = { liaisonType: "simple", isMandatory };
              edgeStyle = {
                strokeWidth: isMandatory ? 2.5 : 2,
                strokeDasharray: isMandatory ? "none" : "6 3",
              };
              edgeMarkers = { markerEnd: null };
            } else if (liaisonType === "transverse") {
              edgeData = { liaisonType: "transverse", isDependancy, isExclusion, isCompatibility, isEquivalence, isDifference };
              const { edgeStyle: s, edgeMarkers: m } = getTransverseStyle(edgeData);
              edgeStyle = s;
              edgeMarkers = m;
            }

            // Modification via clic droit
            if (popup?.linkId && !popup?.pendingConnection) {
              setEdges((eds) =>
                eds.map((e) =>
                  e.id === popup.linkId
                    ? { ...e, data: { ...e.data, ...edgeData }, style: edgeStyle, ...edgeMarkers }
                    : e
                )
              );
              setPopup(null);
              return;
            }

            // Création via drag
            if (!popup?.pendingConnection) return;
            onConnect({ ...popup.pendingConnection, data: edgeData, style: edgeStyle, ...edgeMarkers });
            setPopup(null);
          }}
        />
      </div>

      {/* Panneau latéral */}
      <div style={{
        width: panelOpen ? '320px' : '0px',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease',
        borderLeft: panelOpen ? '1px solid #e0e0e0' : 'none',
        background: '#fff',
      }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', minWidth: '320px' }}>
          <button onClick={() => setActiveTab("json")} style={tabStyle("json")}>JSON</button>
          <button onClick={() => setActiveTab("rules")} style={tabStyle("rules")}>Contraintes transverses</button>
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
              {/* Inclusion */}
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Inclusion (A ⇒ B)</h3>
                {edgeList(dependancyEdges, e => (
                  <><strong>{nodeMap[e.source]}</strong> nécessite <strong>{nodeMap[e.target]}</strong></>
                )) ?? emptyMsg("Aucune inclusion configurée.")}
              </div>

              {/* Exclusions */}
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Exclusions mutuelles (A ∧ B = FALSE)</h3>
                {edgeList(exclusionEdges, e => (
                  <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont compatibles</>
                )) ?? emptyMsg("Aucune exclusion configurée.")}
              </div>

              {/* Compatibilités */}
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Compatibilités (A ∨ B = TRUE)</h3>
                {edgeList(compatibilityEdges, e => (
                  <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont compatibles</>
                )) ?? emptyMsg("Aucune compatibilité configurée.")}
              </div>

              {/* Équivalences */}
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Équivalences (A = B)</h3>
                {edgeList(equivalenceEdges, e => (
                  <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont équivalents</>
                )) ?? emptyMsg("Aucune équivalence configurée.")}
              </div>

              {/* Différences */}
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Différences (A ≠ B)</h3>
                {edgeList(differenceEdges, e => (
                  <><strong>{nodeMap[e.source]}</strong> et <strong>{nodeMap[e.target]}</strong> sont différents</>
                )) ?? emptyMsg("Aucune différence configurée.")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FeatureModelEditor;
