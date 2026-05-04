import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

import { CopyPlus, Trash2, Pencil } from 'lucide-react';
import FeatureCreationPopup from './FeatureCreationPopup'; 

export default function ContextMenu({
  id,
  label,
  top,
  left,
  right,
  bottom,
  ...props
}) {
  const { getNode, setNodes, addNodes, setEdges } = useReactFlow();
  const duplicateNode = useCallback(() => {
    const node = getNode(id);
    const position = {
      x: node.position.x + 50,
      y: node.position.y + 50,
    };

    addNodes({
      ...node,
      selected: false,
      dragging: false,
      id: `${node.id}-copy`,
      position,
    });
  }, [id, getNode, addNodes]);

  const deleteNode = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id));
  }, [id, setNodes, setEdges]);

  const onModify = useCallback(() => {
    const node = getNode(id);
    const label = node.data?.label || node.id;
    const type = node.type || "feature"; // Default to "feature" if type is not defined

    props.onOpenPopup({
      nodeId: id,
      nodeType: type,
      label,
    });
  }, [id, getNode, props]); 


  return (
    <div
      style={{ top, left, right, bottom }}
      className="context-menu"
      {...props}
    >
      <p style={{ margin: '0.5em' }}>
        <small>Noeud : {label}</small>
      </p>
      <button onClick={onModify} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Pencil />
        <span>Modifier</span>
      </button>
      <button onClick={duplicateNode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CopyPlus/>
        <span>Dupliquer</span>
      </button>
      <button onClick={deleteNode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trash2/>
        <span>Supprimer</span>
      </button>
    </div>
  );
}
