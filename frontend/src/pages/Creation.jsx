import React from 'react';

import Sidebar from '@/components/FeatureModelEditor/SidebarReact';
import FeatureModelEditor from '@/components/FeatureModelEditor/FeatureModelEditor';

function Creation() {
  return (
    <div>
        <div className="dndflow">
            <Sidebar isReadOnly={false}/>
            <FeatureModelEditor isReadOnly={false}/>
        </div>
    </div>
  );
}

export default Creation;