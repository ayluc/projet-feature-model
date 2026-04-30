import React, { useRef, useCallback, useState } from "react";
import { ReactFlow, Controls, Background, useReactFlow } from "@xyflow/react";

import { useDnD } from '@/components/DnDContext';
import { useGraph } from '@/components/GraphContext';
import { NodeFeature, NodeXOR, NodeOR, NodeCombinaison } from "@/components/nodes";

import NodeCreationPopup from "./NodeCreationPopup";
import ContextMenu from "./ContextMenu";

const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  combinaison: NodeCombinaison
};

let id = 0;
const getId = () => `node_${id++}`;

function FeatureModelEditor({isReadOnly=false}) {
  const reactFlowWrapper = useRef(null);
  
  const { 
    nodes, setNodes, onNodesChange, 
    edges, setEdges, onEdgesChange, 
    onConnect, onDelete
  } = useGraph();

  const [menu, setMenu] = useState(null);
  const [popup, setPopup] = useState(null);
  
  const { screenToFlowPosition } = useReactFlow();
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
        top: event.clientY-OFFSET_TOP,
        left: event.clientX-OFFSET_LEFT,
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

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setPopup({ node: newNode });
    },
    [screenToFlowPosition, type, setNodes, isReadOnly]
  );

  return (
    <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{width:"100%", height:"calc(100vh - 80px)"}}>
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
        <Controls position="top-right" showInteractive={!isReadOnly}/>
        <Background />
        {menu && <ContextMenu {...menu} onClick={onPaneClick} />}
      </ReactFlow>

      <NodeCreationPopup
        popup={popup}
        onClose={() => setPopup(null)}
        onConfirm={(nodeData) => {
          const newNode = {
            ...popup.node,
            data: {
              ...popup.node.data,
              label: nodeData.nodeName,
              isMandatory: nodeData.isMandatory === "true",
            },
          };
          console.log("Données du popup :", nodeData);
          setNodes((nds) => nds.concat(newNode));
          setPopup(null);
        }}
      />
    </div>
  );
}

export default FeatureModelEditor;