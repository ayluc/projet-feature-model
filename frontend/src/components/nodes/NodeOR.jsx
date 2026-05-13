import { Position, Handle } from '@xyflow/react';

export function NodeOR({isConnectable}) {
  return (
    <div className="node-or">
      <div>
        <label>OR</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable}/>
      </div>
    </div>
  );
}