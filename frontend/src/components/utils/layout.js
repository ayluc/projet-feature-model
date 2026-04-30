import dagre from 'dagre';

export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  if (nodes.length === 0) return { layoutedNodes: [], layoutedEdges: [] };

  const connectedNodeIds = new Set();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep: 80,  // espace horizontal entre les noeuds
    ranksep: 100, // espace vertical entre les noeuds
  });

  nodes.forEach((node) => {
    if (connectedNodeIds.has(node.id)) {
      const width = node.measured?.width ?? node.width ?? 150;
      const height = node.measured?.height ?? node.height ?? 80;
      dagreGraph.setNode(node.id, { width, height });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  if (edges.length > 0) {
    dagre.layout(dagreGraph);
  }

  let deltaX = 0;
  let deltaY = 0;

  const firstConnectedNode = nodes.find(node => connectedNodeIds.has(node.id));

  if (firstConnectedNode && edges.length > 0) {
    const oldPosition = firstConnectedNode.position;
    const newDagrePosition = dagreGraph.node(firstConnectedNode.id);

    deltaX = oldPosition.x - (newDagrePosition.x - (firstConnectedNode.measured?.width ?? 150) / 2);
    deltaY = oldPosition.y - (newDagrePosition.y - (firstConnectedNode.measured?.height ?? 80) / 2);
  }

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