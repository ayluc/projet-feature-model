import React from 'react';

import Sidebar from '@/components/Sidebar';
import FeatureModelEditor from '@/components/FeatureModelEditor/FeatureModelEditor';

function Creation() {
  return (
    <div>
        <div className="dndflow">
            <Sidebar />
            <FeatureModelEditor/>
        </div>
    </div>
  );
}

export default Creation;