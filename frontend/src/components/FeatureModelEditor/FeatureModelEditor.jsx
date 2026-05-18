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

  // Dans setMenu pour les edges :
  const onEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      if (isReadOnly) return;

      const restrictedTypes = ["xor", "or", "cardinalite"];
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      const isEditable = !restrictedTypes.includes(sourceNode?.type) && !restrictedTypes.includes(targetNode?.type);
      console.log("Noeuds :", sourceNode, targetNode, sourceNode.data?.label, targetNode.data?.label)
      setMenu({
        id: edge.id,
        label: `Lien ${sourceNode.data?.label} → ${targetNode.data?.label}`,
        type: "edge",
        isEditable, // ← transmis au ContextMenu
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

      // Si source ou target est un nœud restreint = création directe en optional, sans popup
      if (restrictedTypes.includes(sourceNode?.type) || restrictedTypes.includes(targetNode?.type)) {
        onConnect({
          ...connectionWithId,
          data: { isMandatory: false },
          style: {
            strokeWidth: 2,
            strokeDasharray: "6 3",
          },
        });
        return;
      }

      if (arcType === "mandatory") {
        console.log("Connection mandatory détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "simple", isMandatory: true },
          style: {
            strokeWidth: 2.5,
            strokeDasharray: "none",
          },
        });
        return;
      }

      if (arcType === "optional") {
        console.log("Connection optional détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "simple", isMandatory: false },
          style: {
            strokeWidth: 2,
            strokeDasharray: "6 3",
          },
        });
        return;
      }

      if (arcType === "dependancy") {
        console.log("Connection dependancy détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isDependancy: true },
          style: {
            strokeWidth: 2,
            strokeDasharray: "8 3",
            stroke: "#5b8dee",
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#5b8dee",
            width: 18,
            height: 18,
          },
        });
        return;
      }

      if (arcType === "exclusion") {
        console.log("Connection exclusion détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isExclusion: true },
          style: {
            strokeWidth: 2,
            strokeDasharray: "2 4",
            stroke: "#d9534f",
          },
          markerEnd: null,
        });
        return;
      }

      if (arcType === "compatibility") {
        console.log("Connection compatibility détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isCompatibility: true },
          style: {
            strokeWidth: 2,
            strokeDasharray: "4 4",
            stroke: "#daac17",
          },
          markerEnd: null,
          // markerEnd: {
          //   type: MarkerType.ArrowClosed,
          //   color: "#daac17",
          //   width: 18,
          //   height: 18,
          // },
        });
        return;
      }

      if (arcType === "equivalence") {
        console.log("Connection equivalence détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isEquivalence: true },
          style: {
            strokeWidth: 2,
            strokeDasharray: "2 4",
            stroke: "#19b420",
          },
          markerEnd: null,
        });
        return;
      }

      if (arcType === "difference") {
        console.log("Connection difference détectée, création sans popup");
        onConnect({
          ...connectionWithId,
          data: { liaisonType: "transverse", isDifference: true },
          style: {
            strokeWidth: 1,
            stroke: "#d9534f",
          },
          markerEnd: null,
        });
        return;
      }

      // Sinon popup normal
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

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newId = type === "feature" ? getNextNodeFeatureId() : getNextNodeOperateurId();

      if (type === "feature" || type === "cardinalite") {
        setPopup({
          pendingNode: { id: newId, type, position },
          nodeType: type,
        });
      } else {
        const newNode = {
          id: newId,
          type,
          position,
          data: { label: type.toUpperCase() },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [screenToFlowPosition, type, setNodes, isReadOnly, getNextNodeFeatureId, getNextNodeOperateurId]
  );

  const handleNodesChange = useCallback((changes) => {
    const isMinorChange = changes.every(
      (c) => c.type === 'select' || c.type === 'dimensions'
    );
    if (isMinorChange) pause();

    const modifiedChanges = isReadOnly
      ? changes.map((change) => {
        if (change.type === 'select' && !change.selected) {
          const node = nodes.find(n => n.id === change.id);
          if (node?.selected) {
            return { ...change, selected: true };
          }
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
      const flowData = toObject();
      setJsonRepresentation(JSON.stringify(flowData, null, 2));
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
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

  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const enrichedNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      className: n.data.configStatus === 'included' ? 'node-included'
        : n.data.configStatus === 'excluded' ? 'node-excluded'
          : '',
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

  const { requiresEdges, excludesEdges } = useMemo(() => {
    const req = [];
    const exc = [];
    edges.forEach((e) => {
      if (e.data?.liaisonType === "transverse") {
        if (e.data?.isExclusion) exc.push(e);
        else req.push(e);
      }
    });
    return { requiresEdges: req, excludesEdges: exc };
  }, [edges]);

  const [activeTab, setActiveTab] = useState("json");

  return (
    <div style={{ display: 'flex', width: '100%', height: 'calc(100vh - 80px)', position: 'relative' }}>
      {/* Bouton pour ouvrir le panneau */}
      <button
        onClick={() => {
          setPanelOpen(!panelOpen);
        }}

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
      <div
        className="reactflow-wrapper"
        ref={reactFlowWrapper}
        style={{ flex: 1, minWidth: 0 }}
      >
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

                // Clic droit sur un lien
                if (menu.type === "edge") {
                  const edge = getEdge(popupData.edgeId ?? menu.id);

                  const restrictedTypes = ["xor", "or", "cardinalite"];
                  const sourceNode = nodes.find(n => n.id === edge?.source);
                  const targetNode = nodes.find(n => n.id === edge?.target);

                  // Bloque l'ouverture du popup si source ou target est restreint
                  if (restrictedTypes.includes(sourceNode?.type) || restrictedTypes.includes(targetNode?.type)) {
                    return;
                  }

                  setPopup({
                    nodeType: "link",
                    linkId: edge?.id,
                    linkSource: edge?.source,
                    linkTarget: edge?.target,
                    data: edge?.data,
                    isTransverseAllowed: !restrictedTypes.includes(sourceNode?.type) && !restrictedTypes.includes(targetNode?.type), // ← ajout
                  });
                  return;
                }

                // Clic droit sur un nœud (comportement existant)
                const node = getNode(popupData.nodeId);
                setPopup({
                  ...popupData,
                  nodeType: node?.type,
                  data: node?.data,
                });
              }}
            />
          )}
        </ReactFlow>

        <FeatureCreationPopup
          popup={popup && popup.nodeType === "feature" ? popup : null}
          onClose={() => setPopup(null)}
          onConfirm={(nodeData) => {
            if (popup?.nodeId && !popup?.pendingNode) {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === popup.nodeId
                    ? { ...n, data: { ...n.data, label: nodeData.nodeName } }
                    : n
                )
              );
              setPopup(null);
              return;
            }
            if (!popup?.pendingNode) return;
            const newNode = {
              ...popup.pendingNode,
              data: { label: nodeData.nodeName },
            };
            setNodes((nds) => nds.concat(newNode));
            setPopup(null);
          }}
        />

        <CardinaliteCreationPopup
          popup={popup && popup.nodeType === "cardinalite" ? popup : null}
          onClose={() => setPopup(null)}
          onConfirm={(nodeData) => {
            if (popup?.nodeId && !popup?.pendingNode) {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === popup.nodeId
                    ? {
                      ...n,
                      data: {
                        ...n.data,
                        label: `[${nodeData.cardinaliteMin}..${nodeData.cardinaliteMax}]`,
                        cardinaliteMin: parseInt(nodeData.cardinaliteMin),
                        cardinaliteMax: parseInt(nodeData.cardinaliteMax),
                      },
                    }
                    : n
                )
              );
              setPopup(null);
              return;
            }
            if (!popup?.pendingNode) return;
            const newNode = {
              ...popup.pendingNode,
              data: {
                label: `[${nodeData.cardinaliteMin}..${nodeData.cardinaliteMax}]`,
                cardinaliteMin: parseInt(nodeData.cardinaliteMin),
                cardinaliteMax: parseInt(nodeData.cardinaliteMax),
              },
            };
            setNodes((nds) => nds.concat(newNode));
            setPopup(null);
          }}
        />

        <LinkCreationPopup
          popup={popup && popup.nodeType === "link" ? popup : null}
          onClose={() => setPopup(null)}
          onConfirm={(linkData) => {
            const { liaisonType, isMandatory: isMandatoryRaw, isExclusion: isExclusionRaw } = linkData;

            const isMandatory = isMandatoryRaw === "true";
            const isExclusion = isExclusionRaw === "true";

            // Calcul du style selon le type de liaison
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
              const { isDependancy, isExclusion, isCompatibility, isEquivalence, isDifference } = linkData;

              edgeData = { liaisonType: "transverse", isDependancy, isExclusion, isCompatibility, isEquivalence, isDifference };

              if (isDependancy) {
                edgeStyle = { strokeWidth: 2, strokeDasharray: "8 3", stroke: "#5b8dee" };
                edgeMarkers = { markerEnd: { type: MarkerType.ArrowClosed, color: "#5b8dee", width: 18, height: 18 } };
              } else if (isExclusion) {
                edgeStyle = { strokeWidth: 2, strokeDasharray: "2 4", stroke: "#d9534f" };
                edgeMarkers = { markerEnd: null };
              } else if (isCompatibility) {
                edgeStyle = { strokeWidth: 2, strokeDasharray: "4 4", stroke: "#daac17" };
                edgeMarkers = { markerEnd: null };
              } else if (isEquivalence) {
                edgeStyle = { strokeWidth: 2, strokeDasharray: "2 4", stroke: "#19b420" };
                edgeMarkers = { markerEnd: null };
              } else if (isDifference) {
                edgeStyle = { strokeWidth: 1, stroke: "#d9534f" };
                edgeMarkers = { markerEnd: null };
              }
            }
            // Cas modification via clic droit
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

            // Cas création via drag de connexion
            if (!popup?.pendingConnection) return;
            onConnect({
              ...popup.pendingConnection,
              data: edgeData,
              style: edgeStyle,
              ...edgeMarkers
            });
            setPopup(null);
          }}
        />
      </div>
      <div
        style={{
          width: panelOpen ? '320px' : '0px',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s ease',
          borderLeft: panelOpen ? '1px solid #e0e0e0' : 'none',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', minWidth: '320px' }}>
          <button
            onClick={() => setActiveTab("json")}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === "json" ? '#fff' : '#f9f9f9',
              border: 'none',
              borderBottom: activeTab === "json" ? '2px solid #5b8dee' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === "json" ? 'bold' : 'normal',
              color: activeTab === "json" ? '#333' : '#777',
              transition: 'background 0.2s',
            }}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab("rules")}
            style={{
              flex: 1,
              padding: '12px 8px',
              background: activeTab === "rules" ? '#fff' : '#f9f9f9',
              border: 'none',
              borderBottom: activeTab === "rules" ? '2px solid #5b8dee' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === "rules" ? 'bold' : 'normal',
              color: activeTab === "rules" ? '#333' : '#777',
              transition: 'background 0.2s',
            }}
          >
            Dépendances et Incompatibilités
          </button>
        </div>

        <div style={{ padding: '16px', overflowY: 'auto', flex: 1, minWidth: '320px' }}>

          {activeTab === "json" && (
            <div>
              <pre style={{
                fontSize: '11px',
                background: '#f5f5f5',
                borderRadius: '6px',
                padding: '10px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0
              }}>
                {jsonRepresentation}
              </pre>
            </div>
          )}

          {activeTab === "rules" && (
            <div>
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Dépendances (A =&#62; B)</h3>
                {requiresEdges.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', listStyleType: 'disc' }}>
                    {requiresEdges.map(edge => (
                      <li key={edge.id} style={{ marginBottom: '4px' }}>
                        <strong>{nodeMap[edge.source]}</strong> nécessite <strong>{nodeMap[edge.target]}</strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>
                    Aucune dépendance configurée.
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-bold mb-2">Exclusions mutuelle (A /\ B = FALSE)</h3>
                {excludesEdges.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', listStyleType: 'disc' }}>
                    {excludesEdges.map(edge => (
                      <li key={edge.id} style={{ marginBottom: '4px' }}>
                        <strong>{nodeMap[edge.source]}</strong> et <strong>{nodeMap[edge.target]}</strong> sont incompatibles
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>
                    Aucune exclusion configurée.
                  </p>
                )}
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Compatibilités (A \/ B = TRUE)</h3>
                {requiresEdges.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', listStyleType: 'disc' }}>
                    {requiresEdges.map(edge => (
                      <li key={edge.id} style={{ marginBottom: '4px' }}>
                        <strong>{nodeMap[edge.source]}</strong> et <strong>{nodeMap[edge.target]}</strong> sont compatibles.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>
                    Aucune compatibilité configurée.
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-bold mb-2">Equivalences (A = B)</h3>
                {excludesEdges.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', listStyleType: 'disc' }}>
                    {excludesEdges.map(edge => (
                      <li key={edge.id} style={{ marginBottom: '4px' }}>
                        <strong>{nodeMap[edge.source]}</strong> et <strong>{nodeMap[edge.target]}</strong> sont équivalents.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>
                    Aucune équivalence configurée.
                  </p>
                )}
              </div>
              <div style={{ marginBottom: '24px' }}>
                <h3 className="font-bold mb-2">Différences (A ≠ B)</h3>
                {requiresEdges.length > 0 ? (
                  <ul style={{ paddingLeft: '20px', fontSize: '14px', listStyleType: 'disc' }}>
                    {requiresEdges.map(edge => (
                      <li key={edge.id} style={{ marginBottom: '4px' }}>
                        <strong>{nodeMap[edge.source]}</strong> et <strong>{nodeMap[edge.target]}</strong> sont différents.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '12px', color: '#888', fontStyle: 'italic', margin: 0 }}>
                    Aucune différence configurée.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default FeatureModelEditor;