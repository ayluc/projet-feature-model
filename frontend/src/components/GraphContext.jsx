import React, { createContext, useContext, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';

const GraphContext = createContext();

const initialNodes = [];

export function GraphProvider({ children }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <GraphContext.Provider 
      value={{ 
        nodes, setNodes, onNodesChange, 
        edges, setEdges, onEdgesChange, 
        onConnect 
      }}
    >
      {children}
    </GraphContext.Provider>
  );
}

export const useGraph = () => useContext(GraphContext);