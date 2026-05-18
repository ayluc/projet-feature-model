import { create, useStore } from 'zustand';
import { temporal } from 'zundo';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { getLayoutedElements } from '@/components/utils/layout';

const reindexGraph = (nodes, edges) => {
  const featureNodes = nodes.filter(n => n.type === 'feature')
    .sort((a,b) => parseInt(a.id.match(/\d+/)?.[0] || 0) - parseInt(b.id.match(/\d+/)?.[0] || 0));
  const operateurNodes = nodes.filter(n => ['or', 'xor', 'cardinalite'].includes(n.type))
    .sort((a,b) => parseInt(a.id.match(/\d+/)?.[0] || 0) - parseInt(b.id.match(/\d+/)?.[0] || 0));

  const idMapping = {};
  featureNodes.forEach((n, index) => { idMapping[n.id] = `feature-${index + 1}`; });
  operateurNodes.forEach((n, index) => { idMapping[n.id] = `operateur-${index + 1}`; });

  const newNodes = nodes.map(node => {
    return {
      ...node,
      id: idMapping[node.id] || node.id
    };
  });

  const newEdges = edges.map((edge, index) => ({
    ...edge,
    id: (index + 1).toString(), 
    source: idMapping[edge.source] || edge.source,
    target: idMapping[edge.target] || edge.target
  }));

  return { newNodes, newEdges };
};

export const useGraphStore = create()(
  temporal(
    (set, get) => ({
      nodes: [],
      edges: [],
      isLayoutAuto: true,
      isTransverseVisible: true,
      arcType: null,

      setIsReadOnly: (val) => set({ isReadOnly: val }),
      setArcType: (val) => set({ arcType: val }),

      setNodes: (update) => {
        const nextNodes = typeof update === 'function' ? update(get().nodes) : update;
        set({ nodes: nextNodes });
      },

      setEdges: (update) => {
        const nextEdges = typeof update === 'function' ? update(get().edges) : update;
        set({ edges: nextEdges });
      },

      setLayout: (update) => {
        set({ isLayoutAuto: update })
      },

      setTransverseVisible: (update) => {
        set({ isTransverseVisible: update })
      },

      onNodesChange: (changes) => {
        const state = get();
        const hasRemoves = changes.some(c => c.type === 'remove');
        const nextNodes = applyNodeChanges(changes, state.nodes);

        if (hasRemoves) {
          const removedIds = changes.filter(c => c.type === 'remove').map(c => c.id);
          const remainingEdges = state.edges.filter(e => !removedIds.includes(e.source) && !removedIds.includes(e.target));

          const { newNodes, newEdges } = reindexGraph(nextNodes, remainingEdges);
          set({ nodes: newNodes, edges: newEdges });
        } else {
          set({ nodes: nextNodes });
        }
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
      },

      onConnect: (connection) => {
        const newEdges = addEdge(connection, get().edges);

        if (get().isLayoutAuto) {
          setTimeout(() => {
            const { layoutedNodes } = getLayoutedElements(get().nodes, newEdges);
            set({ nodes: layoutedNodes, edges: newEdges });
          }, 10);
        }
        else {
          set({ edges: newEdges });
        }
      },

      onDelete: () => {
        if (get().isLayoutAuto) {
          setTimeout(() => {
            const { layoutedNodes } = getLayoutedElements(get().nodes, get().edges);
            set({ nodes: layoutedNodes });
          }, 10);
        }
      }
    }),
    {
      limit: 50,
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges
      }),
    }
  )
);

export const useTemporalStore = (selector) => useStore(useGraphStore.temporal, selector);