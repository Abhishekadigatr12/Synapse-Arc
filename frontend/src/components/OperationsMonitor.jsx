import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, AlertTriangle, Eye, Sparkles } from 'lucide-react';

/**
 * OperationsMonitor - Page 2 Real-Time Technical Explainability & Topologies.
 * Embeds simulated prediction countdown timers, Explainable AI (XAI) weights correlation lists,
 * and high-contrast cluster network mapping controllers.
 */
function OperationsMonitor({ 
  metrics, 
  setMetrics, 
  selectedNodeId, 
  setSelectedNodeId, 
  simulationActive, 
  setSimulationActive,
  currentStageIndex,
  setCurrentStageIndex
}) {
  const [countdown, setCountdown] = useState(138); // 2m 18s default

  // Simulate prediction timeline ticking down when stage is anomaly/critical
  useEffect(() => {
    let timer = null;
    if (simulationActive && (currentStageIndex === 1 || currentStageIndex === 2)) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      setCountdown(currentStageIndex >= 3 ? 0 : 138);
    }
    return () => clearInterval(timer);
  }, [simulationActive, currentStageIndex]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m} Min ${String(s).padStart(2, '0')} Secs`;
  };

  // Simulated Explainable AI neural connection contributions
  const xaiMetrics = [
    { label: 'GPU Temp Core-08', value: currentStageIndex >= 1 ? '88°C' : '62°C', change: currentStageIndex >= 1 ? '▲ 42%' : '0%', impact: currentStageIndex >= 1 ? '+24.5%' : '+0.1%', isDanger: currentStageIndex >= 1 },
    { label: 'Network Packet Loss', value: currentStageIndex >= 1 ? '1.25%' : '0.01%', change: currentStageIndex >= 1 ? '▲ 1.2%' : '0%', impact: currentStageIndex >= 1 ? '+4.2%' : '+0.0%', isDanger: false },
    { label: 'System Power Draw', value: currentStageIndex >= 1 ? '16.9 kW' : '14.2 kW', change: currentStageIndex >= 1 ? '▲ 18%' : '0%', impact: currentStageIndex >= 1 ? '+5.3%' : '+0.1%', isDanger: false },
  ];

  return (
    <div className="flex flex-col gap-8 h-auto">
      
      {/* Simulation Controller header */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-4.5 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className={`flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
            currentStageIndex === 2 ? 'bg-red-500/10 text-red-500 border-red-500/20' : (currentStageIndex === 1 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20')
          }`}>
            <span className="w-2.5 h-2.5 rounded-full mr-2 bg-current animate-pulse"></span>
            {currentStageIndex === 2 ? 'CASCADE PREDICTED' : (currentStageIndex === 1 ? 'ANOMALY DETECTED' : 'SYSTEM NORMAL')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            AI Commander scanning and forecasting network path vectors.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSimulationActive(true);
              setCurrentStageIndex(1);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-extrabold tracking-wider uppercase cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            Run Simulation
          </button>
          <button
            onClick={() => {
              setSimulationActive(false);
              setCurrentStageIndex(0);
              setCountdown(138);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 text-xs font-extrabold tracking-wider uppercase hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Failure timeline risk row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Cascade Propagation Arrow sequence */}
        <div className="md:col-span-8 glass-panel p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex items-center justify-between shadow-panel">
          <div className="flex flex-col gap-1 text-left">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
              Predicted cascade sequence paths
            </span>
            <div className="mt-2 text-xs font-extrabold font-mono text-slate-800 dark:text-slate-200">
              {currentStageIndex >= 1 ? (
                <div className="flex items-center gap-2 text-red-500 animate-pulse">
                  <span>Node-08 (DB)</span>
                  <span>&rarr;</span>
                  <span>Node-05 (LB)</span>
                  <span>&rarr;</span>
                  <span className={currentStageIndex >= 2 ? 'text-red-500' : 'text-slate-400'}>Node-04 (API)</span>
                </div>
              ) : (
                <span className="text-slate-400">No cascade failure predicted. Paths stable.</span>
              )}
            </div>
          </div>
        </div>

        {/* Prediction Countdown clock */}
        <div className="md:col-span-4 glass-panel p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex items-center justify-between shadow-panel">
          <div className="flex flex-col gap-0.5 text-left font-mono">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase">
              EST. FAILURE TIMELINE RISK
            </span>
            <span className={`text-xl font-bold mt-0.5 ${currentStageIndex === 2 ? 'text-red-500 animate-pulse' : (currentStageIndex === 1 ? 'text-amber-500' : 'text-slate-800 dark:text-white')}`}>
              {formatCountdown(countdown)}
            </span>
          </div>
          <div className={`p-2 rounded-xl shrink-0 border ${currentStageIndex >= 1 ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 'bg-slate-100 dark:bg-slate-850 text-slate-450 border-slate-200'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Explainable AI core (Why AI predicted this) & Dependency mappings */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch select-none h-auto">
        
        {/* Why the AI Predicted This panel */}
        <div className="xl:col-span-6 glass-panel p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
              Why the AI predicted this incident
            </h4>
            <Eye className="w-4 h-4 text-slate-450" />
          </div>
          
          <span className="text-xs font-bold font-mono text-left">
            Risk Level Deviation: {currentStageIndex >= 1 ? '+34.0%' : 'Nominal'}
          </span>
          
          <div className="flex flex-col gap-2.5 font-mono text-[10px]">
            {xaiMetrics.map((met) => (
              <div key={met.label} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
                <span className="text-slate-400 font-medium">{met.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{met.value}</span>
                  <span className={`font-bold ${met.isDanger ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>
                    {met.change}
                  </span>
                  <span className={`font-bold ${met.isDanger ? 'text-red-400' : 'text-emerald-500'}`}>
                    ({met.impact})
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-[9px] text-slate-400 dark:text-slate-500 text-left font-medium">
            Neural weights correlate high thermal core deviation against inter-cluster network edge congestions.
          </p>
        </div>

        {/* Risk Confidence categories */}
        <div className="xl:col-span-6 glass-panel p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col justify-between gap-3.5">
          <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
            Risk category breakdown
          </h4>
          
          <div className="flex flex-col gap-2.5 font-mono text-[9px] text-left">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-550">
                <span>THERMAL DRIFT</span>
                <span>{currentStageIndex >= 1 ? '68%' : '14%'}</span>
              </div>
              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${currentStageIndex >= 1 ? 'bg-red-500' : 'bg-primary'}`} 
                  style={{ width: currentStageIndex >= 1 ? '68%' : '14%', transition: 'width 0.8s ease' }}
                ></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-550">
                <span>NETWORK PACKETS</span>
                <span>{currentStageIndex >= 1 ? '24%' : '8%'}</span>
              </div>
              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: currentStageIndex >= 1 ? '24%' : '8%', transition: 'width 0.8s ease' }}
                ></div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-550">
                <span>GRID POWER</span>
                <span>{currentStageIndex >= 1 ? '40%' : '12%'}</span>
              </div>
              <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent" 
                  style={{ width: currentStageIndex >= 1 ? '40%' : '12%', transition: 'width 0.8s ease' }}
                ></div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default OperationsMonitor;
