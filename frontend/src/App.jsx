import Toolbar from "@/components/ui/Toolbar";
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

import Sidebar from '@/components/ui/SidebarReact';
import { DnDProvider, useDnD } from '@/components/ui/DnDContext';

import { NodeFeature } from "./components/ui/NodeFeature";
import { NodeXOR } from "@/components/ui/NodeXOR";
import { NodeOR } from "@/components/ui/NodeOR";
import { NodeCombinaison } from "@/components/ui/NodeCombinaison";

import ContextMenu from '@/components/ui/ContextMenu';

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
  const isDragging = useRef(false); // 👈 ajout

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const OFFSET = 10;

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      const pane = reactFlowWrapper.current.getBoundingClientRect();
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
        <div className="dndflow">
          <Sidebar />
          <div className="reactflow-wrapper" ref={reactFlowWrapper}>
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
              {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
            </ReactFlow>

            {popup && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  padding: 16,
                  zIndex: 1000,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }}
              >
                <strong>{popup.node.data.label}</strong>
                <input type="text" id="nodeName" required name="Nom du noeud" placeholder="Nom du noeud" />
                <div>
                  <div>
                  <input type="radio" id="isMandatory" name="isMandatory" value="true"/>
                  <label htmlFor="isMandatory">Obligatoire</label>
                  </div>
                  <div>
                  <input type="radio" id="isOptional" name="isMandatory" value="false" />
                  <label htmlFor="isOptional">Optionnel</label>
                  </div>
                </div>
                <button onClick={() => setPopup(null)}>✕ Fermer</button>
              </div>
            )}
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
