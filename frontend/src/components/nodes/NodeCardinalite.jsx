import { Position, Handle } from '@xyflow/react';

export function NodeCardinalite({data, isConnectable}) {
  return (
    <div className="node-cardinalite">
      <div style={{ textAlign: "center", display: 'flex', flexDirection: 'column'}}>
        <label style={{ fontSize: "6px", fontWeight: "bold" }}>CARDINALITE</label>
        <label>{`[${data?.cardinaliteMin}..${data?.cardinaliteMax}]`}</label>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
      </div>
    </div>
  );
}