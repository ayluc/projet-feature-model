import Toolbar from "@/components/Toolbar";
import React, { useRef, useCallback, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
  Background
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { DnDProvider, useDnD } from '@/components/DnDContext';

import { NodeFeature, NodeXOR, NodeOR, NodeCombinaison } from "@/components/nodes";

import { FeatureModelEditor}  from "@/components/FeatureModelEditor/FeatureModelEditor";


const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  combinaison: NodeCombinaison
};

const initialNodes = [];

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDFlow = () => {
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
    []
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

    // Ne ferme pas le popup si on vient juste de drag
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
  [screenToFlowPosition, type]
);

  return (
    <>
      <div className="grid grid-row-2 gap-4 grid-cols-1 p-4">
        <Toolbar />
        <FeatureModelEditor
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
          popup={popup}
          setPopup={setPopup}
          menu={menu}
        />
      </div>
    </>
  );
};

export default () => (
  <ReactFlowProvider>
    <DnDProvider>
      <DnDFlow />
    </DnDProvider>
  </ReactFlowProvider>
);
