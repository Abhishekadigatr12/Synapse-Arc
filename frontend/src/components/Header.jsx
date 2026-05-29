import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Activity } from 'lucide-react';

/**
 * Header - Top Navigation Command panel containing elapsed timers, live UTC clocks,
 * and high-fidelity System Operator Command details.
 */
function Header({ currentPage, metrics }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [utcTime, setUtcTime] = useState('00:00:00');

  // Monitor ticking session timer
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Date.now() - start;
      setElapsedSeconds(Math.floor(diff / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update Live UTC clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeString = now.toUTCString().slice(17, 25);
      setUtcTime(timeString);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format seconds to hh:mm:ss
  const formatDuration = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <header className="h-20 border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl flex items-center justify-between px-8 z-20 shrink-0 select-none">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-extrabold tracking-widest font-mono uppercase text-slate-800 dark:text-white">
          SYNAPSE-ARC CLUSTER CORE
        </h1>
        <div className="h-4 w-[1px] bg-slate-200 dark:border-slate-800"></div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          AI Commander scanning global matrix
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Live Presentation timers */}
        <div className="hidden xl:grid grid-cols-3 gap-6 border-r border-slate-200 dark:border-slate-850 pr-6 py-1 text-right font-mono">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase">
              SYSTEM UPTIME
            </span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              127 Days
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase">
              MONITOR DURATION
            </span>
            <span className="text-xs font-extrabold text-primary dark:text-cyan-400">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold tracking-widest uppercase">
              LIVE UTC TIME
            </span>
            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
              {utcTime}
            </span>
          </div>
        </div>

        {/* Premium Enterprise System Operator Panel */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-primary/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <Shield className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Operator: Admin</span>
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase font-mono tracking-widest mt-0.5">
              Infra Commander
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
