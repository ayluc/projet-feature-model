import { create, useStore } from 'zustand';
import { temporal } from 'zundo';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { getLayoutedElements } from '@/components/utils/layout';

export const useGraphStore = create()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      isLayoutAuto: true,

      setNodes: (update) => {
        const nextNodes = typeof update === 'function' ? update(get().nodes) : update;
        set({ nodes: nextNodes });
      },

      setEdges: (update) => {
        const nextEdges = typeof update === 'function' ? update(get().edges) : update;
        set({ edges: nextEdges });
      },

      setLayout: (update) => {
        set({isLayoutAuto: update})
      },

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },

      onConnect: (connection) => {
        const newEdges = addEdge(connection, get().edges);
        
        if(get().isLayoutAuto)
        {
          setTimeout(() => {
            const { layoutedNodes } = getLayoutedElements(get().nodes, newEdges);
            set({ nodes: layoutedNodes, edges: newEdges });
          }, 10);
        }  
        else
        {
          set({edges: newEdges});
        }
      },

      onDelete: () => {
        if(get().isLayoutAuto)
        {
          setTimeout(() => {
            const { layoutedNodes } = getLayoutedElements(get().nodes, get().edges);
            set({ nodes: layoutedNodes });
          }, 10);
        }
      }
    }),
    {
      limit: 50,
    }
  )
);

export const useTemporalStore = (selector) => useStore(useGraphStore.temporal, selector);