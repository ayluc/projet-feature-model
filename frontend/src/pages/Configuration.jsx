import React from 'react';
import Sidebar from '@/components/FeatureModelEditor/SidebarReact';

import FeatureModelEditor from '@/components/FeatureModelEditor/FeatureModelEditor';

import { useEffect } from 'react';
import { useGraphStore } from '@/components/GraphStore';

function Configuration() {
  const setIsReadOnly = useGraphStore((state) => state.setIsReadOnly);

  useEffect(() => {
    setIsReadOnly(true);
    return () => setIsReadOnly(false);
  }, [setIsReadOnly]);

  return (
    <div>
      <div className="dndflow">
        <Sidebar isReadOnly={true} />
        <FeatureModelEditor isReadOnly={true} />
      </div>
    </div>
  );
}

export default Configuration;