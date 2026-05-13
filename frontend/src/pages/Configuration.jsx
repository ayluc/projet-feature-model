import React from 'react';
import Sidebar from '@/components/FeatureModelEditor/SidebarReact';

import FeatureModelEditor from '@/components/FeatureModelEditor/FeatureModelEditor';


function Configuration() {

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