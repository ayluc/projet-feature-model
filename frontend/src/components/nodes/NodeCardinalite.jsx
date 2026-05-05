import { useCallback } from 'react';
import { Position, Handle } from '@xyflow/react';

export function NodeCardinalite({data, isConnectable}) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);
 
  return (
    <div className="node-cardinalite">
      <div style={{ textAlign: "center", display: 'flex', flexDirection: 'column'}}>
        <label style={{ fontSize: "6px", fontWeight: "bold" }}>COMBINAISON</label>
        <label>{`[${data?.cardinaliteMin}..${data?.cardinaliteMax}]`}</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable}/>
      </div>
    </div>
  );
}