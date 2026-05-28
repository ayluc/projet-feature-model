import { Position, Handle, NodeToolbar } from '@xyflow/react';
import { modelValidation } from '../utils/modelValidation';
import { useGraphStore } from '../store/GraphStore';
import CustomPopup from '../popups/CustomPopup';

export function NodeFeature({ id, data, isConnectable, selected }) {

  const configStatus = data.configStatus; // 'included' | 'excluded' | null
  const configSource = data.configSource; // 'manual' | 'inferred' | null
  const isColorblind = useGraphStore((state) => state.isColorblind);

  const borderColor = configStatus === 'included'
    ? (isColorblind ? '#3b82f6' : '#22c55e')
    : configStatus === 'excluded'
      ? (isColorblind ? '#eab308' : '#ef4444')
      : '#185fa5';

  const bgColor = configStatus === 'included'
    ? (isColorblind ? '#dbeafe' : '#dcfce7')
    : configStatus === 'excluded'
      ? (isColorblind ? '#fef9c3' : '#fee2e2')
      : '#e6f1fb';

  const isReadOnly = data.isReadOnly;

  const { validate, customPopup, setCustomPopup } = modelValidation(isReadOnly);
  const setNodes = useGraphStore((state) => state.setNodes);

  return (
    <div style={{
      textAlign: "center",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <NodeToolbar isVisible={isReadOnly && selected}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              data.onConfigChange(id, 'included');
              if (configStatus === null || configStatus === "excluded") {
                const isValid = await validate();
                if (!isValid) {
                  setNodes(nds => nds.map(nd =>
                    nd.id === id
                      ? { ...nd, selected: true, data: { ...nd.data, configStatus: null, configSource: null } }
                      : nd
                  ));
                }
              }
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: 'none',
              cursor: 'pointer',
              background: configStatus === 'included' ? '#d1d5db' : (isColorblind ? '#3b82f6' : '#22c55e'),
            }}
            title="Inclure"
          >✓</button>

          <button
            onClick={async (e) => {
              e.stopPropagation();
              data.onConfigChange(id, 'excluded');
              if (configStatus === null || configStatus === "included") {
                const isValid = await validate();
                if (!isValid) {
                  setNodes(nds => nds.map(nd =>
                    nd.id === id
                      ? { ...nd, selected: true, data: { ...nd.data, configStatus: null, configSource: null } }
                      : nd
                  ));
                }
              }
            }}
            style={{
              width: 22, height: 22, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: configStatus === 'excluded' ? '#d1d5db' : (isColorblind ? '#eab308' : '#ef4444'),
            }}
            title="Exclure"
          >✕</button>
        </div>
      </NodeToolbar>
      <label style={{ fontSize: "6px", fontWeight: "bold" }}>FEATURE</label>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
        <label>{data?.label ?? 'Feature'}</label>
        {/* {configStatus && (
          <span style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: borderColor,
            lineHeight: 1,
          }}>
            {configStatus === 'included' ? '✓' : '✕'}
          </span>
        )} */} // Mode daltonien 
      </div>
      {/* <input type="checkbox"/> */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} style={{width: '0.70em',height: '0.70em', background:"#5a5858ff"}}/>
      <CustomPopup dialog={customPopup} onClose={() => setCustomPopup(null)} />
    </div>
  );
}