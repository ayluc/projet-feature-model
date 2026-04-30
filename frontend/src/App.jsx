import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";


import { DnDProvider } from '@/components/DnDContext';
import { GraphProvider } from '@/components/GraphContext'; 

import Toolbar from "@/components/Toolbar";
import Creation from './pages/Creation';
import Configuration from './pages/Configuration';

import '@xyflow/react/dist/style.css';

function Page () {
  return (
    <div className="grid grid-row-2 gap-4 grid-cols-1 p-4">
      <Toolbar />
      <Routes>
        <Route path="/" element={<Navigate to="/creation" replace />}></Route>
        <Route path="/creation" element={<Creation/>}></Route>
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
          <GraphProvider>
            <Page />
          </GraphProvider>
        </DnDProvider>
      </ReactFlowProvider>
    </Router>
  );
}

export default App;