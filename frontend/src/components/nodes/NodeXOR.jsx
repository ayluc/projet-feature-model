import { useCallback } from 'react';
import { Position, Handle } from '@xyflow/react';

export function NodeXOR({isConnectable}) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);
 
  return (
    <div className="node-xor">
      <div>
        <label>XOR</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable}/>
      </div>
    </div>
  );
}