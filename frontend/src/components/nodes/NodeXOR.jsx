import { Position, Handle } from '@xyflow/react';

export function NodeXOR({isConnectable}) {
  return (
    <div className="node-xor">
      <div>
        <label>XOR</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em'}}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em'}}/>
      </div>
    </div>
  );
}