import React from 'react';
import Sidebar from '@/components/editor-ui/Sidebar';

import FeatureModelEditor from '@/components/editor-ui/FeatureModelEditor';


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