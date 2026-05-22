import React, { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { ReactFlow, Controls, Background, useReactFlow, ControlButton, MarkerType } from "@xyflow/react";
import { Undo2, Redo2 } from "lucide-react";

import { useDnD } from '@/components/utils/DnDContext';
import { useGraphStore, useTemporalStore } from '@/components/store/GraphStore';
import { NodeFeature, NodeXOR, NodeOR, NodeCardinalite } from "@/components/nodes";
import { DoubleLineEdge } from "@/components/edges";
import PanneauLateral from "./PanneauLateral";
import { getNextNodeFeatureId, getNextNodeOperateurId } from '@/components/utils/getIds';


import FeatureCreationPopup from "../popups/FeatureCreationPopup";
import CardinaliteCreationPopup from "../popups/CardinaliteCreationPopup";
import LinkCreationPopup from "../popups/LinkCreationPopup";
import ContextMenu from "../popups/ContextMenu";

const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  cardinalite: NodeCardinalite
};

const edgeTypes = {
  doubleLine: DoubleLineEdge,
};

const EDGE_STYLES = {
  mandatory:     { strokeWidth: 2.5, strokeDasharray: "none" },
  optional:      { strokeWidth: 2,   strokeDasharray: "6 3" },
  inclusion:     { strokeWidth: 2,   strokeDasharray: "8 3", stroke: "#3B82F6" },
  exclusion:     { strokeWidth: 2,   strokeDasharray: "2 4", stroke: "#d90606ff" },
  compatibility: { strokeWidth: 2,   strokeDasharray: "4 4", stroke: "#da6e0aff" },
  equivalence:   { strokeWidth: 2,                           stroke: "#09a109ff" },
  difference:    { strokeWidth: 2,                           stroke: "#d90606ff" },
};

const MARKER_INCLUSION = { markerEnd: { type: MarkerType.ArrowClosed, color: "#3B82F6", width: 18, height: 18 } };
const MARKER_NONE = { markerEnd: null };

function getTransverseStyle(data) {
  if (data?.isInclusion)     return { edgeStyle: EDGE_STYLES.inclusion,     edgeMarkers: MARKER_INCLUSION, edgeType: undefined };
  if (data?.isExclusion)     return { edgeStyle: EDGE_STYLES.exclusion,     edgeMarkers: MARKER_NONE,      edgeType: undefined };
  if (data?.isCompatibility) return { edgeStyle: EDGE_STYLES.compatibility, edgeMarkers: MARKER_NONE,      edgeType: undefined };
  if (data?.isEquivalence)   return { edgeStyle: EDGE_STYLES.equivalence,   edgeMarkers: MARKER_NONE,      edgeType: "doubleLine" };
  if (data?.isDifference)    return { edgeStyle: EDGE_STYLES.difference,    edgeMarkers: MARKER_NONE,      edgeType: undefined };
  return { edgeStyle: {}, edgeMarkers: {}, edgeType: undefined };
}

function getNodeClassName(n) {
  const { configStatus, configSource } = n.data;
  if (configStatus === 'included') {
    return configSource === 'inferred' ? 'node-included-inferred' : 'node-included';
  }
  if (configStatus === 'excluded') {
    return configSource === 'inferred' ? 'node-excluded-inferred' : 'node-excluded';
  }
  return '';
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

  const panelOpen = useGraphStore((state) => state.panelOpen);
  const setPanelOpen = useGraphStore((state) => state.setPanelOpen);
  const arcType = useGraphStore((state) => state.arcType);

  const OFFSET_TOP = 100;
  const OFFSET_LEFT = 200;

  let edgeMarkers = {};

  const onNodeClick = useCallback((event, clickedNode) => {
    // event.stopPropagation();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === clickedNode.id ? { ...n, selected: true } : { ...n, selected: false }
      )
    );
  }, [setNodes, isReadOnly]);


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
        onConnect({ ...connectionWithId, data: { isMandatory: false }, style: EDGE_STYLES.optional });
        return;
      }

      if (arcType === "mandatory") {
        onConnect({ ...connectionWithId, data: { liaisonType: "simple", isMandatory: true }, style: EDGE_STYLES.mandatory });
        return;
      }

      if (arcType === "optional") {
        onConnect({ ...connectionWithId, data: { liaisonType: "simple", isMandatory: false }, style: EDGE_STYLES.optional });
        return;
      }

      if (arcType === "inclusion") {
        onConnect({ ...connectionWithId, data: { liaisonType: "transverse", isInclusion: true }, style: EDGE_STYLES.inclusion, ...MARKER_INCLUSION });
        return;
      }

      if (arcType === "exclusion") {
        onConnect({ ...connectionWithId, data: { liaisonType: "transverse", isExclusion: true }, style: EDGE_STYLES.exclusion, ...MARKER_NONE });
        return;
      }

      if (arcType === "compatibility") {
        onConnect({ ...connectionWithId, data: { liaisonType: "transverse", isCompatibility: true }, style: EDGE_STYLES.compatibility, ...MARKER_NONE });
        return;
      }

      if (arcType === "equivalence") {
        onConnect({ ...connectionWithId, data: { liaisonType: "transverse", isEquivalence: true }, style: EDGE_STYLES.equivalence, type: "doubleLine", ...MARKER_NONE });
        return;
      }

      if (arcType === "difference") {
        onConnect({ ...connectionWithId, data: { liaisonType: "transverse", isDifference: true }, style: EDGE_STYLES.difference, ...MARKER_NONE });
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
      const newId = type === "feature" ? getNextNodeFeatureId(nodes) : getNextNodeOperateurId(nodes);

      if (type === "feature" || type === "cardinalite") {
        setPopup({ pendingNode: { id: newId, type, position }, nodeType: type });
      } else {
        setNodes((nds) => nds.concat({ id: newId, type, position, data: { label: type.toUpperCase() } }));
      }
    },
    [screenToFlowPosition, type, setNodes, isReadOnly, nodes]
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
    if (isReadOnly) {
      setNodes(nds => nds.map(n => ({ ...n, selected: false })));
    } else {
      setNodes(nds => nds.map(n => ({
        ...n,
        className: '',
        data: { ...n.data, configStatus: null, configSource: null }
      })));
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (isReadOnly) return;
    const handleKeyDown = (event) => {
      if (event.key == 'Backspace') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const selectedNodes = nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;
        onNodesChange(selectedNodes.map(n => ({ type: 'remove', id: n.id })));
      }
      else if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
        undo();
      }
      else if (event.key === 'y' && (event.ctrlKey || event.metaKey)) {
        redo();
      }
      else {
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReadOnly, nodes, onNodesChange]);

  const enrichedNodes = useMemo(() => {
    return nodes.map(n => ({
      ...n,
      className: getNodeClassName(n),
      data: {
        ...n.data,
        isReadOnly,
        onConfigChange: (nodeId, status) => {
          setNodes(nds => nds.map(nd => {
            if (nd.id !== nodeId) return nd;
            const isToggleOff = nd.data.configStatus === status;
            return {
              ...nd,
              selected: false,
              focused: false,
              data: {
                ...nd.data,
                configStatus: isToggleOff ? null : status,
                configSource: isToggleOff ? null : 'manual',
              }
            };
          }));
        }
      }
    }));
  }, [nodes, isReadOnly, setNodes]);

  const visibleEdges = useMemo(() => {
    return isTransverseVisible
      ? edges
      : edges.filter(e => e.data?.liaisonType !== "transverse");
  }, [edges, isTransverseVisible]);


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
          className={isReadOnly ? 'read-only' : ''}
          nodes={enrichedNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
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
          onNodeClick={onNodeClick}
          multiSelectionKeyCode={null}
          deselectOnClick={true}
          deleteKeyCode={null}
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
              onClose={() => setMenu(null)}
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
            const { liaisonType, isMandatory: isMandatoryRaw, isInclusion, isExclusion, isCompatibility, isEquivalence, isDifference } = linkData;
            const isMandatory = isMandatoryRaw === "true";

            let edgeStyle = {};
            let edgeData = {};
            let edgeType = undefined;

            if (liaisonType === "simple") {
              edgeData = { liaisonType: "simple", isMandatory };
              edgeStyle = isMandatory ? EDGE_STYLES.mandatory : EDGE_STYLES.optional;
              edgeMarkers = MARKER_NONE;
            } else if (liaisonType === "transverse") {
              edgeData = { liaisonType: "transverse", isInclusion, isExclusion, isCompatibility, isEquivalence, isDifference };
              const { edgeStyle: s, edgeMarkers: m, edgeType: t } = getTransverseStyle(edgeData);
              edgeStyle = s;
              edgeMarkers = m;
              edgeType = t;
            }

            // Modification via clic droit
            if (popup?.linkId && !popup?.pendingConnection) {
              setEdges((eds) =>
                eds.map((e) =>
                  e.id === popup.linkId
                    ? { ...e, type: edgeType, data: { ...e.data, ...edgeData }, style: edgeStyle, ...edgeMarkers }
                    : e
                )
              );
              setPopup(null);
              return;
            }

            // Création via drag
            if (!popup?.pendingConnection) return;
            onConnect({ ...popup.pendingConnection, type: edgeType, data: edgeData, style: edgeStyle, ...edgeMarkers });
            setPopup(null);
          }}
        />
      </div>
      <PanneauLateral isOpen={panelOpen} />
    </div>
  );
}

export default FeatureModelEditor;