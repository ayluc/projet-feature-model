import React, { useRef } from "react";
import {ReactFlow, Controls, Background } from "@xyflow/react";
import NodeCreationPopup from "./NodeCreationPopup";
import ContextMenu from "./ContextMenu";
import Sidebar from './SidebarReact';

export function FeatureModelEditor({
  nodes,
  edges,
  nodeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onPaneClick,
  onNodeContextMenu,
  popup,
  setPopup,
  menu,
}) {
  const reactFlowWrapper = useRef(null);

  return (
    <div className="dndflow">
      <Sidebar/>
    
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
    </div>
  );
}
