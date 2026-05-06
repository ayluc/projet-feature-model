import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { CopyPlus, Trash2, Pencil } from 'lucide-react';

export default function ContextMenu({
  id,
  label,
  type,
  isEditable = true,
  top,
  left,
  right,
  bottom,
  onOpenPopup,
  onClick,
  ...rest
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
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
  }, [id, setNodes, setEdges]);

  const onModifyNode = useCallback(() => {
    const node = getNode(id);
    const nodeType = node.type || "feature";
    onOpenPopup({
      nodeId: id,
      nodeType,
      label: node.data?.label ?? id,
    });
  }, [id, getNode, rest]);

  const deleteEdge = useCallback(() => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  }, [id, setEdges]);

  const onModifyEdge = useCallback(() => {
    onOpenPopup({ edgeId: id });
  }, [id, rest]);

  if (type === "edge") {
    return (
      <div style={{ top, left, right, bottom }} className="context-menu" {...rest}>
        <p style={{ margin: '0.5em' }}>
          <small>{label}</small>
        </p>
        <button
          onClick={onModifyEdge}
          disabled={!isEditable}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            opacity: isEditable ? 1 : 0.4,
            cursor: isEditable ? 'pointer' : 'not-allowed'
          }}
        >
          <Pencil />
          <span>Modifier</span>
        </button>
        <button onClick={deleteEdge} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trash2 />
          <span>Supprimer</span>
        </button>
      </div>
    );
  }

  return (
    console.log({ type, label }),
    <div style={{ top, left, right, bottom }} className="context-menu" {...rest}>
      <p style={{ margin: '0.5em' }}>
        <small>Noeud : {label}</small>
      </p>
      {label != "XOR" && label != "OR" && (
        <button onClick={onModifyNode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Pencil />
          <span>Modifier</span>
        </button>
      )}
      <button onClick={duplicateNode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CopyPlus />
        <span>Dupliquer</span>
      </button>
      <button onClick={deleteNode} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Trash2 />
        <span>Supprimer</span>
      </button>
    </div>
  );
}