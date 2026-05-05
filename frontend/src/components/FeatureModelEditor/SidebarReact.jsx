import React from 'react';
import { useDnD } from '@/components/DnDContext';
import { Button } from "@/components/ui/button";
import { getLayoutedElements } from '@/components/utils/layout';
import { useGraphStore } from '@/components/GraphStore';


export default () => {
  const [_, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodes = useGraphStore((state) => state.nodes);
  const setNodes = useGraphStore((state) => state.setNodes);
  const edges = useGraphStore((state) => state.edges);

  const isLayoutAuto = useGraphStore((state) => state.isLayoutAuto);
  const setLayout = useGraphStore((state) => state.setLayout);

  const handleNoeuds = () => {
    const { layoutedNodes } = getLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
  };

  return (
    <aside>
      <div className="description">Faire glisser les noeuds à ajouter au modèle</div>
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
      <div>
        <Button variant="outline" onClick={handleNoeuds}>Réorganiser les noeuds</Button>
      </div>
      <div>
        <label>Disposition du graphe automatique </label>
        <input type="checkbox" defaultChecked={isLayoutAuto} onChange={() => setLayout(!isLayoutAuto)}></input>
      </div>
      <hr class="dotted" />
    
    </aside>
  );
};