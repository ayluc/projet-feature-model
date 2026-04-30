import React from 'react';
import { useDnD } from '@/components/DnDContext';
import { Button } from "@/components/ui/button";
import { useGraph } from '@/components/GraphContext';
import { getLayoutedElements } from '@/components/utils/layout';


export default () => {
  const [_, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const { 
    nodes, setNodes, onNodesChange, 
    edges
  } = useGraph();

  const handleNoeuds = () => {
    const { layoutedNodes } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
  };

  return (
    <aside>
      <div className="description">You can drag these nodes to the pane on the right.</div>
      <div className="dndnode feature" onDragStart={(event) => onDragStart(event, 'feature')} draggable>
        Feature
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'or')} draggable>
        OR
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'xor')} draggable>
        XOR
      </div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'combinaison')} draggable>
        COMBINAISON
      </div>
      <Button variant="outline" onClick={handleNoeuds}>Réorganiser les noeuds</Button>
    </aside>
  );
};