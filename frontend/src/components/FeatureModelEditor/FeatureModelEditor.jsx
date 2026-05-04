import React, { useRef, useCallback, useState } from "react";
import { ReactFlow, Controls, Background, useReactFlow, ControlButton } from "@xyflow/react";
import { Undo2, Redo2 } from "lucide-react";

import { useDnD } from '@/components/DnDContext';
import { useGraph } from '@/components/GraphContext';
import { NodeFeature, NodeXOR, NodeOR, NodeCombinaison } from "@/components/nodes";

import FeatureCreationPopup from "./FeatureCreationPopup";
import CombinaisonCreationPopup from "./CombinaisonCreationPopup";
import ContextMenu from "./ContextMenu";

const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  combinaison: NodeCombinaison
};

let id = 0;
const getId = () => `node_${id++}`;

function FeatureModelEditor({ isReadOnly = false }) {
  const reactFlowWrapper = useRef(null);

  const {
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    onConnect, onDelete
  } = useGraph();

  const [menu, setMenu] = useState(null);
  const [popup, setPopup] = useState(null);

  const { screenToFlowPosition, getNode } = useReactFlow();
  const [type] = useDnD();
  const isDragging = useRef(false);

  const onDragOver = useCallback((event) => {
    console.log("Drag over event:", event);
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const OFFSET_TOP = 100;
  const OFFSET_LEFT = 200;

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();

      if (isReadOnly) return;

      setMenu({
        id: node.id,
        label: node.data?.label ?? node.id,
        top: event.clientY - OFFSET_TOP,
        left: event.clientX - OFFSET_LEFT,
      });
    },
    [setMenu, isReadOnly]
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

      if (type === "feature" || type === "combinaison") {
        setPopup({
          pendingNode: { id: getId(), type, position },
          nodeType: type,
        });
      } else {
        const newNode = {
          id: getId(),
          type,
          position,
          data: { label: type.toUpperCase() },
        };
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [screenToFlowPosition, type, setNodes, isReadOnly]
  );

  return (
    <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{ width: "100%", height: "calc(100vh - 80px)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={isReadOnly ? undefined : onNodesChange}
        onEdgesChange={isReadOnly ? undefined : onEdgesChange}
        onConnect={isReadOnly ? undefined : onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
        nodesDraggable={!isReadOnly}
        nodesConnectable={!isReadOnly}
        elementsSelectable={true}
        onDelete={isReadOnly ? undefined : onDelete}
      >
        <Controls position="top-right" showInteractive={!isReadOnly}>
          <ControlButton className="undo-redo-button">
            <Undo2 />
          </ControlButton>
          <ControlButton className="undo-redo-button">
            <Redo2 />
          </ControlButton>
        </Controls>
        <Background />
        {menu && <ContextMenu {...menu} onClick={onPaneClick}
          onOpenPopup={(popupData) => {
            const node = getNode(popupData.nodeId);
            setMenu(null);
            setPopup({
              ...popupData,
              nodeType: node?.type,
              data: node?.data, // ← ajoute ça pour pré-remplir le popup
            });
          }} />}
      </ReactFlow>

      <FeatureCreationPopup
        popup={popup && popup.nodeType === "feature" ? popup : null}
        onClose={() => setPopup(null)}
        onConfirm={(nodeData) => {
          const isMandatory = nodeData.isMandatory === "true";

          // Cas modification (nodeId présent, pas de pendingNode)
          if (popup?.nodeId && !popup?.pendingNode) {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === popup.nodeId
                  ? { ...n, data: { ...n.data, label: nodeData.nodeName, isMandatory }, className: isMandatory ? "mandatory" : "optionnal" }
                  : n
              )
            );
            setPopup(null);
            return;
          }

          // Cas création (existant)
          if (!popup?.pendingNode) return;
          const newNode = {
            ...popup.pendingNode,
            data: { label: nodeData.nodeName, isMandatory },
            className: isMandatory ? "mandatory" : "optionnal",
          };
          setNodes((nds) => nds.concat(newNode));
          setPopup(null);
        }}
      />

      <CombinaisonCreationPopup
        popup={popup && popup.nodeType === "combinaison" ? popup : null}
        onClose={() => setPopup(null)}
        onConfirm={(nodeData) => {

          // Cas modification
          if (popup?.nodeId && !popup?.pendingNode) {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === popup.nodeId
                  ? {
                    ...n,
                    data: {
                      ...n.data,
                      label: `[${nodeData.combinaisonMin}..${nodeData.combinaisonMax}]`,
                      combinaisonMin: parseInt(nodeData.combinaisonMin),
                      combinaisonMax: parseInt(nodeData.combinaisonMax),
                    },
                  }
                  : n
              )
            );
            setPopup(null);
            return;
          }

          // Cas création
          if (!popup?.pendingNode) return;
          const newNode = {
            ...popup.pendingNode,
            data: {
              label: `[${nodeData.combinaisonMin}..${nodeData.combinaisonMax}]`,
              combinaisonMin: parseInt(nodeData.combinaisonMin),
              combinaisonMax: parseInt(nodeData.combinaisonMax),
            },
          };
          setNodes((nds) => nds.concat(newNode));
          setPopup(null);
        }}
      />
    </div>
  );
}

export default FeatureModelEditor;