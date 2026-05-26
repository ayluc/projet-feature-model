import dagre from 'dagre';

// Disposition automatiques des noeuds et arcs du graphe
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  if (nodes.length === 0) return { layoutedNodes: [], layoutedEdges: [] };

  const layoutEdges = edges.filter(
    (edge) => edge.data?.liaisonType === 'simple' || !edge.data?.liaisonType
  );

  // Récupération des noeuds qui sont connectés à au moins un autre noeud 
  const connectedNodeIds = new Set();
  layoutEdges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  // Initialisation du graphe Diagre et de son format
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 80,  // espace horizontal entre les noeuds
    ranksep: 100, // espace vertical entre les noeuds
  });

  // On fournit au graphe Dagre les tailles et ids de nos noeuds React-flow
  nodes.forEach((node) => {
    if (connectedNodeIds.has(node.id)) {
      const width = node.measured?.width ?? node.width ?? 150;
      const height = node.measured?.height ?? node.height ?? 80;
      dagreGraph.setNode(node.id, { width, height });
    }
  });

  // On fournit au graphe Dagre nos arcs React-flow
  layoutEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calcul des nouvelles positions
  if (layoutEdges.length > 0) {
    dagre.layout(dagreGraph);
  }


  // Cette partie permet de calculer un "offset" pour que le graphe soit remis là où il était avant, et pas qu'il soit "téléporté" à l'autre bout du graphe
  let deltaX = 0;
  let deltaY = 0;

  const firstConnectedNode = nodes.find(node => connectedNodeIds.has(node.id));

  if (firstConnectedNode && layoutEdges.length > 0) {
    const oldPosition = firstConnectedNode.position;
    const newDagrePosition = dagreGraph.node(firstConnectedNode.id);

    deltaX = oldPosition.x - (newDagrePosition.x - (firstConnectedNode.measured?.width ?? 150) / 2);
    deltaY = oldPosition.y - (newDagrePosition.y - (firstConnectedNode.measured?.height ?? 80) / 2);
  }


  // Disposition des noeuds react-flow avec leurs nouvelles positions
  const layoutedNodes = nodes.map((node) => {
    if (!connectedNodeIds.has(node.id)) {
      return node;
    }

    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.measured?.width ?? node.width ?? 150;
    const height = node.measured?.height ?? node.height ?? 80;

    return {
      ...node,
      position: {
        x: (nodeWithPosition.x - width / 2) + deltaX,
        y: (nodeWithPosition.y - height / 2) + deltaY,
      },
    };
  });


  return { layoutedNodes, layoutedEdges: edges };
};