import { useCallback } from 'react';
import { Position, Handle } from '@xyflow/react';

export function NodeFeature({ data, isConnectable }) {
  return (
    <div style={{ textAlign: "center", display: 'flex', flexDirection: 'column' }}>
      <label style={{ fontSize: "6px", fontWeight: "bold" }}>FEATURE</label>
      <label>{data?.label ?? 'Feature'}</label>
      {/* <input type="checkbox"/> */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
    </div>
  );
}