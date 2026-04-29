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

import Sidebar from '@/components/SidebarReact';
import { DnDProvider, useDnD } from '@/components/DnDContext';

import { NodeFeature } from "./components/nodes/NodeFeature";
import { NodeXOR } from "@/components/nodes/NodeXOR";
import { NodeOR } from "@/components/nodes/NodeOR";
import { NodeCombinaison } from "@/components/nodes/NodeCombinaison";

import ContextMenu from '@/components/ui/ContextMenu';

const nodeTypes = {
  feature: NodeFeature,
  xor: NodeXOR,
  or: NodeOR,
  combinaison: NodeCombinaison
};

const initialNodes = [
  {
    id: '1',
    type: 'feature',
    data: { value: 123 },
    position: { x: 250, y: 5 },
  },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDFlow = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [menu, setMenu] = useState(null);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();
  const ref = useRef(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const OFFSET = 10; // pixels d'écart

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();

      const pane = ref.current.getBoundingClientRect();
      const x = event.clientX - pane.left + OFFSET;
      const y = event.clientY - pane.top + OFFSET;

      setMenu({
        id: node.id,
        top: y < pane.height - 200 ? y : undefined,
        left: x < pane.width - 200 ? x : undefined,
        right: x >= pane.width - 200 ? pane.width - x : undefined,
        bottom: y >= pane.height - 200 ? pane.height - y : undefined,
      });
    },
    [setMenu],
  );
  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      // check if the dropped element is valid
      if (!type) {
        return;
      }

      // project was renamed to screenToFlowPosition
      // and you don't need to subtract the reactFlowBounds.left/top anymore
      // details: https://reactflow.dev/whats-new/2023-11-10
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
    },
    [screenToFlowPosition, type],
  );

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.setData('text/plain', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };



  return (
    <>
      <div className="grid grid-row-2 gap-4 grid-cols-1 p-4">
        <Toolbar />
        <div className="dndflow">
          <Sidebar />
          <div className="reactflow-wrapper" ref={reactFlowWrapper}>
            <ReactFlow
              ref={ref}
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onPaneClick={onPaneClick}
              onNodeContextMenu={onNodeContextMenu}
              fitView
            >
              <Controls position="top-right" />
              <Background />
              {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
            </ReactFlow>
          </div>

        </div>
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
