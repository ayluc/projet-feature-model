import React, { createContext, useContext, useCallback } from 'react';
import { useNodesState, useEdgesState, addEdge, useReactFlow } from '@xyflow/react';

import { getLayoutedElements } from '@/components/utils/layout';


const GraphContext = createContext();

const initialNodes = [];

export function GraphProvider({ children }) {
    const { getNodes, getEdges } = useReactFlow();

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

    const onDelete = useCallback(() => {
        setTimeout(() => {
            const freshNodes = getNodes();
            const freshEdges = getEdges();

            const { layoutedNodes } = getLayoutedElements(freshNodes, freshEdges);
            setNodes(layoutedNodes);
        }, 10);
        }, 
        [getNodes, getEdges, setNodes]
    );

    return (
        <GraphContext.Provider 
        value={{ 
            nodes, setNodes, onNodesChange, 
            edges, setEdges, onEdgesChange, 
            onConnect,
            onDelete
        }}
        >
        {children}
        </GraphContext.Provider>
    );
}

export const useGraph = () => useContext(GraphContext);