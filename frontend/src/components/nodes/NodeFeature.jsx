import { useCallback } from 'react';
import { Position, Handle, NodeToolbar } from '@xyflow/react';

export function NodeFeature({ id, data, isConnectable, selected }) {

  const configStatus = data.configStatus; // 'included' | 'excluded' | null

   const borderColor = configStatus === 'included' ? '#22c55e'
                    : configStatus === 'excluded' ? '#ef4444'
                    : '#185fa5';

  const bgColor = configStatus === 'included' ? '#dcfce7' 
                : configStatus === 'excluded' ? '#fee2e2'
                : '#e6f1fb';

  return (
    <div style={{ textAlign: "center", 
    display: 'flex', 
    flexDirection: 'column', }}>
      <NodeToolbar isVisible={data.isReadOnly && selected}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => data.onConfigChange(id, 'included')}
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
            onClick={() => data.onConfigChange(id, 'excluded')}
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