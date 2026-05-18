import { Position, Handle, NodeToolbar } from '@xyflow/react';
import { useModelValidation } from '../utils/useModelValidation';
import { useGraphStore } from '../GraphStore';

export function NodeFeature({ id, data, isConnectable, selected }) {

  const configStatus = data.configStatus; // 'included' | 'excluded' | null

  const borderColor = configStatus === 'included' ? '#22c55e'
    : configStatus === 'excluded' ? '#ef4444'
      : '#185fa5';

  const bgColor = configStatus === 'included' ? '#dcfce7'
    : configStatus === 'excluded' ? '#fee2e2'
      : '#e6f1fb';

  const isReadOnly = data.isReadOnly;

  const { validate } = useModelValidation(isReadOnly);


  return (
    <div style={{
      textAlign: "center",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <NodeToolbar isVisible={isReadOnly && selected}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => { data.onConfigChange(id, 'included'); if (configStatus === null || configStatus === "excluded") validate(); }}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: configStatus === 'included' ? '#d1d5db' : '#22c55e',
            }}
            title="Inclure"
          >✓</button>

          <button
            onClick={() => { data.onConfigChange(id, 'excluded'); if (configStatus === null || configStatus === "included") validate(); }}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: configStatus === 'excluded' ? '#d1d5db' : '#ef4444',
            }}
            title="Exclure"
          >✕</button>
        </div>
      </NodeToolbar>
      <label style={{ fontSize: "6px", fontWeight: "bold" }}>FEATURE</label>
      <label>{data?.label ?? 'Feature'}</label>
      {/* <input type="checkbox"/> */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
    </div>
  );
}