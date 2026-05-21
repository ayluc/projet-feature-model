import React, { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { CopyPlus, Trash2, Pencil } from 'lucide-react';

import { useGraphStore } from '@/components/store/GraphStore';

export default function ContextMenu({
  id,
  label,
  type,
  isEditable = true,
  top,
  left,
  right,
  bottom,
  onClose,
  onOpenPopup,
  onClick,
  ...rest
}) {
  const { getNode, setNodes, addNodes, setEdges } = useReactFlow();

  const nodes = useGraphStore((state) => state.nodes);

  const getNextNodeFeatureId = useCallback(() => {
    const maxId = nodes
      .filter(n => n.type === "feature")
      .reduce((max, node) => {
        const regex = /[0-9]+/;
        const match = String(node.id).match(regex);
        const idNum = match ? parseInt(match[0], 10) : 0;
        return Math.max(max, idNum);
      }, 0);
    return "feature-" + (maxId + 1).toString();
  }, [nodes]);

  const getNextNodeOperateurId = useCallback(() => {
    const maxId = nodes
      .filter(n => n.type === "or" || n.type === "xor" || n.type === "cardinalite")
      .reduce((max, node) => {
        const regex = /[0-9]+/;
        const match = String(node.id).match(regex);
        const idNum = match ? parseInt(match[0], 10) : 0;
        return Math.max(max, idNum);
      }, 0);
    return "operateur-" + (maxId + 1).toString();
  }, [nodes]);

  const onNodesChange = useGraphStore((state) => state.onNodesChange);

  const duplicateNode = useCallback(() => {
    const node = getNode(id);
    const position = {
      x: node.position.x + 50,
      y: node.position.y + 50,
    };
    if(node.type === 'feature')
    {
      addNodes({
        ...node,
        selected: false,
        dragging: false,
        id: getNextNodeFeatureId(),
        position,
      });
    }
    else
    {
      addNodes({
        ...node,
        selected: false,
        dragging: false,
        id: getNextNodeOperateurId(),
        position,
      });
    }
    
    if (onClose) onClose();
  }, [id, getNode, addNodes]);

  const deleteNode = useCallback(() => {
    onNodesChange([{ type: 'remove', id }]);
    if (onClose) onClose();
  }, [id, onNodesChange, onClose]);

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
    if (onClose) onClose();
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