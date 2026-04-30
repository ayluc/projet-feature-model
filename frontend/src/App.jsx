import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { DnDProvider } from '@/components/DnDContext';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Toolbar from "@/components/Toolbar";
import { FeatureModelEditor } from "@/components/FeatureModelEditor/FeatureModelEditor";

import '@xyflow/react/dist/style.css';
import Configuration from './pages/Configuration';

function Page () {
  return (
    <div className="grid grid-row-2 gap-4 grid-cols-1 p-4">
      <Toolbar />
      <Routes>
        <Route path="/creation" element={<FeatureModelEditor/>}></Route>
        <Route path="/configuration" element={<Configuration/>}></Route>
      </Routes>
    </div>
  );
};

function App() {
  return (
    <Router>
      <ReactFlowProvider>
        <DnDProvider>
          <Page />
        </DnDProvider>
      </ReactFlowProvider>
    </Router>
  );
}

export default App;