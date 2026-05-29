import React from 'react';
import { ArrowUpRight, ShieldAlert, ShieldCheck, Radar, BadgeDollarSign } from 'lucide-react';

/**
 * ExecutiveOverview - Page 1 Executive Context Command Center.
 * Displays predictive auto-scaling metrics, Multi-Cluster regional cards, SLA Breach Probabilities,
 * and persistent AI Health training dashboards.
 */
function ExecutiveOverview({ metrics, currentStageIndex, onLaunchMonitor }) {
  // Multi-cluster Region states
  const clusters = [
    { id: 'A', region: 'US-EAST', status: 'HEALTHY', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { id: 'B', region: 'EU-WEST', status: currentStageIndex >= 1 ? 'WARNING' : 'HEALTHY', badge: currentStageIndex >= 1 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { id: 'C', region: 'AS-SOUTH', status: 'HEALTHY', badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  ];

  return (
    <div className="flex flex-col gap-8 h-auto">
      
      {/* Hero Banner Banner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold tracking-wider uppercase w-fit animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            Predictive Autonomic Remediation
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-800 dark:text-white leading-[1.1]">
            Predict Infrastructure <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">Failures</span> Before They Happen
          </h2>
          
          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            AI-powered anomaly detection, cascade prediction, blast radius analysis, and autonomous self-healing engineered for global multi-region clusters.
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={onLaunchMonitor}
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-xs font-extrabold tracking-wider uppercase shadow-glow hover:scale-103 transition-all duration-300 cursor-pointer"
            >
              Launch Mission Control
            </button>
            <button 
              onClick={onLaunchMonitor}
              className="px-6 py-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-extrabold tracking-wider uppercase hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer"
            >
              Watch Live Demo
            </button>
          </div>
        </div>

        {/* Isometric SVG Graph Container */}
        <div className="lg:col-span-5 h-[340px] border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl flex items-center justify-center p-4 relative shadow-panel overflow-hidden">
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-md flex items-center gap-2 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
            <span className="text-[9px] font-bold tracking-widest font-mono text-slate-500 dark:text-slate-400 uppercase">
              ACTIVE NEURAL CORE
            </span>
          </div>

          <div className="text-center font-mono p-6">
            <div className="w-24 h-24 rounded-full border-4 border-dashed border-primary/20 flex items-center justify-center mx-auto animate-spin" style={{ animationDuration: '10s' }}>
              <Radar className="w-10 h-10 text-primary" />
            </div>
            <div className="mt-4 text-xs font-extrabold tracking-widest text-slate-700 dark:text-slate-200">
              SCANNING INGEST CHANNELS
            </div>
            <div className="text-[9px] text-slate-400 mt-1 uppercase">
              Core Telemetry Feed: active
            </div>
          </div>
        </div>
      </div>

      {/* Multi-cluster Region dashboard & AI Health panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch select-none">
        
        {/* SLA Health Indicator ring */}
        <div className="xl:col-span-4 glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex items-center justify-between shadow-panel">
          <div className="flex flex-col gap-1.5">
            <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
              Cluster health index
            </h4>
            <p className="text-xs text-slate-400 font-medium">Continuous system SLA check value.</p>
            <div className="flex items-center justify-between mt-3 text-[10px] font-mono border-t border-slate-100 dark:border-slate-850 pt-3 gap-8">
              <span class="text-slate-400 uppercase">SLA Breach Prob</span>
              <span className="text-emerald-500 font-extrabold">{currentStageIndex >= 2 ? '48.2%' : '0.02%'}</span>
            </div>
          </div>
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(148, 163, 184, 0.08)" strokeWidth="5" />
              <circle 
                cx="50" cy="50" r="44" 
                fill="none" 
                stroke={metrics.health >= 98 ? '#10B981' : '#EF4444'} 
                strokeWidth="5" 
                strokeLinecap="round"
                strokeDasharray="276.46" 
                strokeDashoffset={276.46 - (metrics.health / 100) * 276.46}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute text-center flex flex-col">
              <span className="text-md font-extrabold font-mono text-slate-800 dark:text-white">
                {metrics.health}%
              </span>
              <span className="text-[7px] text-slate-400 font-extrabold tracking-wider uppercase font-mono">
                SLA HEALTH
              </span>
            </div>
          </div>
        </div>

        {/* Multi-cluster Region enclaves */}
        <div className="xl:col-span-4 glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-4 shadow-panel justify-between">
          <h4 class="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
            Multi-Cluster Regions
          </h4>
          <div className="flex flex-col gap-2.5 font-mono text-[9px]">
            {clusters.map((cls) => (
              <div key={cls.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                <span className="text-slate-450">CLUSTER-{cls.id} ({cls.region})</span>
                <span className={`px-2 py-0.5 rounded font-extrabold border ${cls.badge}`}>
                  {cls.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Model Health Monitor */}
        <div className="xl:col-span-4 glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-4 shadow-panel justify-between">
          <h4 className="text-xs font-bold tracking-widest font-mono text-slate-400 dark:text-slate-500 uppercase">
            AI Model Health Monitor
          </h4>
          <div className="grid grid-cols-2 gap-4 text-left font-mono text-[10px]">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Accuracy</span>
              <span className="text-xs font-bold text-emerald-500 mt-0.5">98.7%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Latency</span>
              <span className="text-xs font-bold text-primary dark:text-cyan-400 mt-0.5">4.2 ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Last Retrained</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0.5">3 Days Ago</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase font-bold">Inference State</span>
              <span className="text-xs font-bold text-emerald-500 mt-0.5">OPTIMAL</span>
            </div>
          </div>
        </div>

      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-2.5 transition-all duration-300 hover:-translate-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            Infrastructure Health
          </span>
          <span className="text-3xl font-extrabold font-mono text-emerald-500">{metrics.health}%</span>
          <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono font-bold">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
            STABLE SLA
          </div>
        </div>

        <div className="glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-2.5 transition-all duration-300 hover:-translate-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            Active Nodes
          </span>
          <span className="text-3xl font-extrabold font-mono text-slate-800 dark:text-white">12</span>
          <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            ALL SYNCED
          </div>
        </div>

        <div className="glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-2.5 transition-all duration-300 hover:-translate-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            Anomalies Detected
          </span>
          <span className={`text-3xl font-extrabold font-mono ${metrics.anomalies > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-white'}`}>
            {metrics.anomalies}
          </span>
          <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            SAFE STATE GUARD
          </div>
        </div>

        <div className="glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-2.5 transition-all duration-300 hover:-translate-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            Predicted Threats
          </span>
          <span className={`text-3xl font-extrabold font-mono ${metrics.threats > 0 ? 'text-red-500' : 'text-slate-800 dark:text-white'}`}>
            {metrics.threats}
          </span>
          <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono font-bold">
            <Radar className="w-3.5 h-3.5 text-primary" />
            CONTINUOUS SCAN
          </div>
        </div>

        <div className="glass-panel p-5.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 flex flex-col gap-2.5 transition-all duration-300 hover:-translate-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            Loss Prevented
          </span>
          <span className="text-3xl font-extrabold font-mono text-cyan-500">${metrics.lossPrevented}K</span>
          <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono font-bold">
            <BadgeDollarSign className="w-3.5 h-3.5 text-emerald-500" />
            DAMAGE AVOIDED
          </div>
        </div>
      </div>

    </div>
  );
}

export default ExecutiveOverview;
