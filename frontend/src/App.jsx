import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DnDProvider } from '@/components/DnDContext';

import Toolbar from "@/components/Toolbar";
import { FeatureModelEditor } from "@/components/FeatureModelEditor/FeatureModelEditor";

import '@xyflow/react/dist/style.css';

const Layout = () => {
  return (
    <div className="grid grid-row-2 gap-4 grid-cols-1 p-4">
      <Toolbar />
      <FeatureModelEditor />
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <Layout />
      </DnDProvider>
    </ReactFlowProvider>
  );
}