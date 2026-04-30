import React, { useRef, useCallback, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow
} from "@xyflow/react";

import { useDnD } from '@/components/DnDContext';
import { NodeFeature, NodeXOR, NodeOR, NodeCombinaison } from "@/components/nodes";

import NodeCreationPopup from "./NodeCreationPopup";
import ContextMenu from "./ContextMenu";
import Sidebar from './SidebarReact';

const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  combinaison: NodeCombinaison
};

const initialNodes = [];
let id = 0;
const getId = () => `dndnode_${id++}`;

function FeatureModelEditor() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [menu, setMenu] = useState(null);
  const [popup, setPopup] = useState(null);
  
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();
  const isDragging = useRef(false);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const OFFSET_TOP = 100;
    const OFFSET_LEFT = 200;


  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY-OFFSET_TOP,
        left: event.clientX-OFFSET_LEFT,
      });
    },
    [setMenu]
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
      if (!type) return;

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

      setNodes((nds) => nds.concat(newNode));
      setPopup({ node: newNode });
    },
    [screenToFlowPosition, type, setNodes]
  );

  return (
    <div className="reactflow-wrapper" ref={reactFlowWrapper} style={{width:"100%", height:"calc(100vh - 80px)"}}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        fitView
      >
        <Controls position="top-right" />
        <Background />
        {menu && <ContextMenu {...menu} onClick={onPaneClick} />}
      </ReactFlow>

      <NodeCreationPopup popup={popup} onClose={() => setPopup(null)} />
    </div>
  );
}

export default FeatureModelEditor;