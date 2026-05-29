import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ExecutiveOverview from './components/ExecutiveOverview';
import OperationsMonitor from './components/OperationsMonitor';
import IncidentResponse from './components/IncidentResponse';

/**
 * App - Main controller for the SYNAPSE-ARC AI Anomaly Management Platform.
 * Simulates real-time telemetry processing, failure predictions, and automated self-healing.
 */
function App() {
  const [theme, setTheme] = useState('dark');
  const [currentPage, setCurrentPage] = useState('overview');
  const [simulationActive, setSimulationActive] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState(8); // Default: DB-Cluster-08

  // Globally shared simulation metrics
  const [metrics, setMetrics] = useState({
    health: 99.98,
    activeNodes: 12,
    anomalies: 0,
    threats: 0,
    lossPrevented: 420.4,
    cpu: 45.2,
    gpu: 62.8,
    memory: 54.1,
    latency: 24,
    packetLoss: 0.01,
    power: 14.2,
    riskScore: 4,
    aiConfidence: 98.7,
  });

  // Toggle CSS dark mode class on root element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Main Page View router
  const renderActivePage = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <ExecutiveOverview
            metrics={metrics}
            currentStageIndex={currentStageIndex}
            onLaunchMonitor={() => setCurrentPage('monitoring')}
          />
        );
      case 'monitoring':
        return (
          <OperationsMonitor
            metrics={metrics}
            setMetrics={setMetrics}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            simulationActive={simulationActive}
            setSimulationActive={setSimulationActive}
            currentStageIndex={currentStageIndex}
            setCurrentStageIndex={setCurrentStageIndex}
          />
        );
      case 'incident':
        return (
          <IncidentResponse
            metrics={metrics}
            currentStageIndex={currentStageIndex}
            setCurrentStageIndex={setCurrentStageIndex}
            simulationActive={simulationActive}
          />
        );
      default:
        return <ExecutiveOverview metrics={metrics} onLaunchMonitor={() => setCurrentPage('monitoring')} />;
    }
  };

  return (
    <div className="bg-slate-50 text-slate-900 dark:bg-[#090D1A] dark:text-slate-100 min-h-screen flex transition-colors duration-500 overflow-x-hidden cyber-grid grid-anim relative">
      
      {/* Left Sidebar Menu */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        theme={theme}
        setTheme={setTheme}
        metrics={metrics}
      />

      {/* Main Command Viewport */}
      <main className="flex-1 flex flex-col min-h-screen relative z-10">
        
        {/* Top Header Navigation Clocks */}
        <Header 
          currentPage={currentPage}
          metrics={metrics}
        />

        {/* Dynamic Content Grid */}
        <div className="flex-1 p-8 relative min-h-0 h-auto">
          {renderActivePage()}
        </div>

      </main>

    </div>
  );
}

export default App;
