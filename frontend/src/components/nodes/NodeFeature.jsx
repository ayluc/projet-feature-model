import { Position, Handle, NodeToolbar } from '@xyflow/react';
import { useModelValidation } from '../utils/useModelValidation';
import { useGraphStore } from '../store/GraphStore';
import CustomPopup from '../popups/CustomPopup';

export function NodeFeature({ id, data, isConnectable, selected }) {

  const configStatus = data.configStatus; // 'included' | 'excluded' | null
  const configSource = data.configSource; // 'manual' | 'inferred' | null

  const borderColor = configStatus === 'included' ? '#029C70'
    : configStatus === 'excluded' ? '#FF667A'
      : '#185fa5';

  const bgColor = configStatus === 'included' ? '#dcfce7'
    : configStatus === 'excluded' ? '#fee2e2'
      : '#e6f1fb';

  const isReadOnly = data.isReadOnly;

  const { validate, customPopup, setCustomPopup } = useModelValidation(isReadOnly);
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
              background: configStatus === 'included' ? '#d1d5db' : '#029C70',
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
              background: configStatus === 'excluded' ? '#d1d5db' : '#FF667A',
            }}
            title="Exclure"
          >✕</button>
        </div>
      </NodeToolbar>
      <label style={{ fontSize: "6px", fontWeight: "bold" }}>FEATURE</label>
      <label>{data?.label ?? 'Feature'}</label>
      {/* <input type="checkbox"/> */}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <CustomPopup dialog={customPopup} onClose={() => setCustomPopup(null)} />
    </div>
  );
}