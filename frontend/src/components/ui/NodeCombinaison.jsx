import { useCallback } from 'react';
import { Position, Handle } from '@xyflow/react';

export function NodeCombinaison(props) {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);
 
  return (
    <div className="text-updater-node">
      <div>
        <label>Combinaison</label>
        <Handle type="source" position={Position.Top} />
        <Handle type="target" position={Position.Bottom} />
      </div>
    </div>
  );
}