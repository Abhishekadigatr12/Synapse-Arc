import React from 'react';
import { LayoutDashboard, Activity, Sparkles, ShieldAlert } from 'lucide-react';

/**
 * Sidebar - Left drawer containing navigation routers, persistent AI engine status card,
 * and standard telemetry heartbeats.
 */
function Sidebar({ currentPage, setCurrentPage, theme, setTheme, metrics }) {
  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col justify-between p-6 z-30 shrink-0 select-none">
      <div className="flex flex-col gap-6">
        
        {/* Glowing Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-glow">
            <ShieldAlert className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-extrabold tracking-widest text-slate-800 dark:text-white font-mono">
              SYNAPSE-ARC
            </span>
            <span className="text-[9px] text-primary dark:text-cyan-400 font-bold tracking-widest font-mono uppercase">
              AI COMMANDER
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-col gap-2">
          <button
            onClick={() => setCurrentPage('overview')}
            className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
              currentPage === 'overview'
                ? 'border-l-4 border-primary bg-primary/10 text-primary dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            Overview
          </button>
          <button
            onClick={() => setCurrentPage('monitoring')}
            className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
              currentPage === 'monitoring'
                ? 'border-l-4 border-primary bg-primary/10 text-primary dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Activity className="w-4.5 h-4.5" />
            Operations Monitor
          </button>
          <button
            onClick={() => setCurrentPage('incident')}
            className={`flex items-center gap-3.5 px-4.5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-all duration-300 ${
              currentPage === 'incident'
                ? 'border-l-4 border-primary bg-primary/10 text-primary dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-4.5 h-4.5" />
            Incident Response
          </button>
        </nav>

        {/* Persistent AI Engine Status Card */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/35 backdrop-blur-md">
          <h5 className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            AI Engine Status
          </h5>
          
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase">Engine State</span>
            <span className="flex items-center text-success font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase">Model Version</span>
            <span className="text-slate-850 dark:text-slate-350 font-bold">v2.4</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase">Confidence</span>
            <span className="text-primary dark:text-cyan-400 font-bold">
              {metrics.aiConfidence}%
            </span>
          </div>
        </div>

        {/* Telemetry Status Heartbeat */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20 backdrop-blur-md">
          <h5 className="text-[9px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest font-mono uppercase">
            Telemetry status
          </h5>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase">Uptime Heartbeat</span>
            <span className="flex items-center text-success font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5 animate-ping"></span>
              ACTIVE
            </span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-600 dark:text-slate-400 font-bold uppercase">Enclaves Active</span>
            <span className="text-slate-800 dark:text-slate-200 font-extrabold">12 / 12</span>
          </div>
        </div>

      </div>

      {/* Theme Switcher & System Footer */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-900/20">
          <span className="text-[9px] font-extrabold tracking-widest font-mono text-slate-400 dark:text-slate-400">
            {theme === 'dark' ? 'CYBER SPACE' : 'OPERATIONAL'}
          </span>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={theme === 'dark'}
              onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:bg-primary transition-all duration-300"></div>
            <div className="absolute left-[2px] top-[2px] w-3.5 h-3.5 bg-white rounded-full transition-transform peer-checked:translate-x-full"></div>
          </label>
        </div>
        <div className="text-[9px] text-slate-400 dark:text-slate-600 text-center font-semibold font-mono tracking-widest uppercase">
          SYNAPSE-ARC V4.8-PROD
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
