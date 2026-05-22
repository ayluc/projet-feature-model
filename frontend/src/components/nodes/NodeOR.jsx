import { Position, Handle } from '@xyflow/react';

export function NodeOR({isConnectable}) {
  return (
    <div className="node-or">
      <div>
        <label>OR</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
      </div>
    </div>
  );
}