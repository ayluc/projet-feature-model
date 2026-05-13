import { Position, Handle } from '@xyflow/react';

export function NodeCardinalite({data, isConnectable}) {
  return (
    <div className="node-cardinalite">
      <div style={{ textAlign: "center", display: 'flex', flexDirection: 'column'}}>
        <label style={{ fontSize: "6px", fontWeight: "bold" }}>CARDINALITE</label>
        <label>{`[${data?.cardinaliteMin}..${data?.cardinaliteMax}]`}</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable}/>
      </div>
    </div>
  );
}