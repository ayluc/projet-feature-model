import React, { useRef, useCallback, useState, useEffect } from "react";
import { ReactFlow, Controls, Background, useReactFlow, ControlButton } from "@xyflow/react";
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

  const getNextNodeId = useCallback(() => {
    const maxId = nodes.reduce((max, node) => {
      const idNum = parseInt(node.id, 10);
      return isNaN(idNum) ? max : Math.max(max, idNum);
    }, -1);
    return (maxId + 1).toString();
  }, [nodes]);

  const getNextEdgeId = useCallback(() => {
    const maxId = edges.reduce((max, edge) => {
      const idNum = parseInt(edge.id, 10);
      return isNaN(idNum) ? max : Math.max(max, idNum);
    }, -1);
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
          data: { isMandatory: true },
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
          data: { isMandatory: false },
          style: {
            strokeWidth: 2,
            strokeDasharray: "6 3",
          },
        });
        return;
      }

      // Sinon popup normal
      setPopup({
        nodeType: "link",
        linkSource: connection.source,
        linkTarget: connection.target,
        pendingConnection: connectionWithId, // Contient maintenant le nouvel ID
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

      const newId = getNextNodeId();

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
    [screenToFlowPosition, type, setNodes, isReadOnly, getNextNodeId]
  );

  const handleNodesChange = useCallback((changes) => {
    const isMinorChange = changes.every(
      (c) => c.type === 'select' || c.type === 'dimensions'
    );
    if (isMinorChange) pause();

    // Bloque les désélections automatiques de ReactFlow sur les autres noeuds
    const modifiedChanges = changes.map((change) => {
      if (change.type === 'select' && !change.selected) {
        const node = nodes.find(n => n.id === change.id);
        if (node?.selected) {
          return { ...change, selected: true }; // maintient la sélection
        }
      }
      return change;
    });

    onNodesChange(modifiedChanges);
    if (isMinorChange) resume();
  }, [onNodesChange, pause, resume, nodes]);

  const onNodeClick = useCallback((event, node) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === node.id ? { ...n, selected: !n.selected } : n
      )
    );
  }, [setNodes]);

  useEffect(() => {
    if (panelOpen) {
      const flowData = toObject();
      setJsonRepresentation(JSON.stringify(flowData, null, 2));
    }
  }, [nodes, edges, panelOpen]);


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
          nodes={nodes}
          edges={edges}
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
          elementsSelectable={true}
          onDelete={isReadOnly ? undefined : onDelete}
          multiSelectionKeyCode={null}
          onNodeClick={onNodeClick}
          deselectOnClick={false}
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
            const isMandatory = linkData.isMandatory === "true";

            // Cas modification via clic droit
            if (popup?.linkId && !popup?.pendingConnection) {
              setEdges((eds) =>
                eds.map((e) =>
                  e.id === popup.linkId
                    ? {
                      ...e,
                      data: { ...e.data, isMandatory },
                      style: {
                        strokeWidth: isMandatory ? 2.5 : 2,
                        strokeDasharray: isMandatory ? "none" : "6 3",
                      },
                    }
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
              data: { isMandatory },
              style: {
                strokeWidth: isMandatory ? 2.5 : 2,
                strokeDasharray: isMandatory ? "none" : "6 3",
              },
            });
            setPopup(null);
          }}
        />
      </div>
      <div
        style={{
          width: panelOpen ? '320px' : '0px',
          minWidth: 0,
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          borderLeft: panelOpen ? '1px solid #e0e0e0' : 'none',
          background: '#fff',
          boxShadow: panelOpen ? '-4px 0 12px rgba(0,0,0,0.08)' : 'none',
          overflowY: panelOpen ? 'auto' : 'hidden',
        }}
      >
        <div style={{ width: '320px', padding: '16px' }}>
          <h2 className="text-lg font-bold mb-3">Représentation du feature model au format JSON</h2>
          <pre style={{
            fontSize: '11px',
            background: '#f5f5f5',
            borderRadius: '6px',
            padding: '10px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {jsonRepresentation}
          </pre>
        </div>
      </div>

    </div>
  );
}

export default FeatureModelEditor;