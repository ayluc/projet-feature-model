import React, { createContext, useContext, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge } from '@xyflow/react';

import { getLayoutedElements } from '@/components/utils/layout';


const GraphContext = createContext();

const initialNodes = [];

export function GraphProvider({ children }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => {
        setEdges((eds) => {
        const newEdges = addEdge(params, eds);
        
        setTimeout(() => {
            setNodes((currentNodes) => {
            const { layoutedNodes } = getLayoutedElements(currentNodes, newEdges);
            return layoutedNodes;
            });
        }, 10);
        
        return newEdges;
        });
    },
    [setNodes, setEdges]
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