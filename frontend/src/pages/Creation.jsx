import React from 'react';

import Sidebar from '@/components/editor-ui/Sidebar';
import FeatureModelEditor from '@/components/editor-ui/FeatureModelEditor';

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