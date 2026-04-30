import React from 'react';

import FeatureModelEditor from '@/components/FeatureModelEditor/FeatureModelEditor';

function Configuration() {
  return (
    <div>
        <div className="dndflow">
            <FeatureModelEditor isReadOnly={true}/>
        </div>
    </div>
  );
}

export default Configuration;