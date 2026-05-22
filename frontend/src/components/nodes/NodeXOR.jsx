import { Position, Handle } from '@xyflow/react';

export function NodeXOR({isConnectable}) {
  return (
    <div className="node-xor">
      <div>
        <label>XOR</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
      </div>
    </div>
  );
}