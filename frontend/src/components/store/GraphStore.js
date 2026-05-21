import { create, useStore } from 'zustand';
import { temporal } from 'zundo';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import { getLayoutedElements } from '@/components/utils/layout';

// Fonction permettant de réindexer les noeuds du graphe après la suppression d'un noeud
const reindexGraph = (nodes, edges) => {
  const featureNodes = nodes.filter(n => n.type === 'feature')
    .sort((a, b) => parseInt(a.id.match(/\d+/)?.[0] || 0) - parseInt(b.id.match(/\d+/)?.[0] || 0));
  const operateurNodes = nodes.filter(n => ['or', 'xor', 'cardinalite'].includes(n.type))
    .sort((a, b) => parseInt(a.id.match(/\d+/)?.[0] || 0) - parseInt(b.id.match(/\d+/)?.[0] || 0));

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

// Structure permettant de gérer les différents états de l'interface et du graphe.
// On crée un store "vanilla" zustand puis on lui ajoute des capacités temporelles avec zundo pour avoir accès aux undo/redo
export const useGraphStore = create()(
  temporal(
    (set, get) => ({
      nodes: [], // liste des noeuds du graphe
      edges: [], // liste des arcs du graphe
      isLayoutAuto: true, // disposition automatique des noeuds du graphe activée ou non
      isTransverseVisible: true, // affichage des liens transverses ou non
      arcType: null,
      panelOpen: false,
      panelTab: "json",

      setArcType: (val) => set({ arcType: val }),
      setPanelOpen: (val) => set({ panelOpen: val }),
      setPanelTab: (val) => set({ panelTab: val }),
      setLayout: (val) => set({ isLayoutAuto: val }),
      setTransverseVisible: (val) => set({ isTransverseVisible: val }),

      setNodes: (update) => {
        const nextNodes = typeof update === 'function' ? update(get().nodes) : update;
        set({ nodes: nextNodes });
      },

      setEdges: (update) => {
        const nextEdges = typeof update === 'function' ? update(get().edges) : update;
        set({ edges: nextEdges });
      },


      onNodesChange: (changes) => {
        const state = get();
        const hasRemoves = changes.some(c => c.type === 'remove');
        const nextNodes = applyNodeChanges(changes, state.nodes);

        if (hasRemoves) {
          const removedIds = changes.filter(c => c.type === 'remove').map(c => c.id);
          const remainingEdges = state.edges.filter(e => !removedIds.includes(e.source) && !removedIds.includes(e.target));

          const { newNodes, newEdges } = reindexGraph(nextNodes, remainingEdges);
          if (state.isLayoutAuto) {
            setTimeout(() => {
              const { layoutedNodes } = getLayoutedElements(newNodes, newEdges);
              set({ nodes: layoutedNodes, edges: newEdges });
            }, 10);
          } else {
            set({ nodes: newNodes, edges: newEdges });
          }
        } else {
          set({ nodes: nextNodes });
        }
      },

      onEdgesChange: (changes) => {
        const newEdges = applyEdgeChanges(changes, get().edges)
        setTimeout(() => {
          if(get().isLayoutAuto)
          {
            const { layoutedNodes } = getLayoutedElements(get().nodes, newEdges);
            set({ nodes: layoutedNodes, edges: newEdges });
          }
          else
          {
            set({ edges: newEdges });
          }
        }, 10);
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
      }

    }),
    {
      limit: 50, // taille de l'historique pour les undo/redo en nombre d'actions
      partialize: (state) => ({
        nodes: state.nodes.map(({ selected, ...n }) => n),
        edges: state.edges
      }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
);

export const useTemporalStore = (selector) => useStore(useGraphStore.temporal, selector);