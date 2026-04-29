import React from 'react';
import { useDnD } from './DnDContext';

export default () => {
  const [_, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside>
      <div className="description">You can drag these nodes to the pane on the right.</div>
      <div className="dndnode" onDragStart={(event) => onDragStart(event, 'feature')} draggable>
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
    </aside>
  );
};
