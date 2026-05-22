import React, { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";


import { DnDProvider } from '@/components/utils/DnDContext';
import { useGraphStore } from '@/components/store/GraphStore';

import Toolbar from "@/components/editor-ui/Toolbar";
import Creation from './pages/Creation';
import Configuration from './pages/Configuration';
import Assemblage from './pages/Assemblage';

import '@xyflow/react/dist/style.css';

function Page () {
  const isColorblind = useGraphStore((state) => state.isColorblind);

  useEffect(() => {
    document.body.classList.toggle('colorblind', isColorblind);
    return () => document.body.classList.remove('colorblind');
  }, [isColorblind]);

  return (
    <div className="grid grid-row-2 gap-4 grid-cols-1 p-4">
      <Toolbar />
      <Routes>
        <Route path="/" element={<Navigate to="/creation" replace />}></Route>
        <Route path="/creation" element={<Creation/>}></Route>
        <Route path="/configuration" element={<Configuration/>}></Route>
        <Route path="/assemblage" element={<Assemblage/>}></Route>
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