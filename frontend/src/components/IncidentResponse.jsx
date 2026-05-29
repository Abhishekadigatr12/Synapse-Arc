import React from 'react';
import { ShieldCheck, Play, Sparkles, CheckCircle2 } from 'lucide-react';

/**
 * IncidentResponse - Page 3 Incident Remediation & Recovery Audits.
 * Displays dynamic self-healing recommendations, recovery checklist validations,
 * chronological scrubbers, and latest event logs.
 */
function IncidentResponse({ metrics, currentStageIndex, setCurrentStageIndex, simulationActive }) {
  // Chronological scrubbing timeline nodes
  const timelineSteps = [
    { idx: 0, time: '00:00', label: 'Normal' },
    { idx: 1, time: '00:15', label: 'Anomaly' },
    { idx: 2, time: '00:32', label: 'Cascade' },
    { idx: 3, time: '00:45', label: 'Remediation' },
    { idx: 5, time: '01:08', label: 'Complete' },
  ];

  // Self-healing priorities
  const recommendations = [
    { action: 'Execute Workload Migration', success: 97, status: currentStageIndex >= 3 ? 'EXECUTED' : 'SELECTED', priority: 'CRITICAL' },
    { action: 'Isolate Primary DB host Core-08', success: 98, status: currentStageIndex >= 3 ? 'EXECUTED' : 'SELECTED', priority: 'CRITICAL' },
    { action: 'Reroute active broker links', success: 95, status: currentStageIndex >= 3 ? 'EXECUTED' : 'SELECTED', priority: 'HIGH' },
  ];

  return (
    <div className="flex flex-col gap-8 h-auto select-none">
      
      {/* Dynamic Incident Scrubbing timeline */}
      <div className="glass-panel p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col gap-5 shadow-panel">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2">
          <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
            Incident Replay Scrubbing timeline
          </h4>
          <span className="text-[8px] text-slate-400 font-bold font-mono">CLICK STEPS TO SCRUB STATES</span>
        </div>

        <div className="flex flex-wrap gap-4 justify-between items-center px-4 py-2 font-mono text-[9px]">
          {timelineSteps.map((step) => {
            const active = currentStageIndex === step.idx;
            return (
              <button
                key={step.idx}
                onClick={() => setCurrentPageStage && setCurrentStageIndex(step.idx)}
                className={`replay-timeline-node px-3 py-2 border rounded-xl flex items-center gap-2 cursor-pointer transition-all ${
                  active 
                    ? 'border-accent text-accent bg-accent/15 glow-active-card font-extrabold' 
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-700 dark:text-slate-350'
                }`}
              >
                <span>{step.time}</span>
                <span className="font-medium text-slate-400">{step.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Splits: AI Recommendation Decision Engine & Checklist Verifiers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Recommendation Engine priorities list */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col gap-4">
          <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
            AI Decision engine action priorities
          </h4>

          <div className="flex flex-col gap-3 font-mono text-[10px] text-left">
            {recommendations.map((rec, index) => (
              <div key={rec.action} className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-800 dark:text-slate-300">
                    {index + 1}. {rec.action}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                    rec.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {rec.priority}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-400">Efficacy: {rec.success}%</span>
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] ${
                    rec.status === 'EXECUTED' ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/20' : 'bg-cyan-500/15 text-cyan-500'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Validation checklist panel */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between shadow-panel">
          <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
            Recovery validation checks
          </h4>

          <div className="flex flex-col gap-3.5 select-none font-mono text-[10px] text-left mt-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-450">NODE TEMPERATURE</span>
              <span className={`flex items-center gap-1.5 font-bold ${currentStageIndex >= 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentStageIndex >= 3 ? 'NORMAL' : 'MONITORING'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-450">NETWORK TRAFFIC</span>
              <span className={`flex items-center gap-1.5 font-bold ${currentStageIndex >= 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentStageIndex >= 3 ? 'NORMAL' : 'MONITORING'}
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default IncidentResponse;
