import React from 'react';

export default function SystemHealth({score = 100, label = 'Healthy'}) {
	const tone = score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : 'bg-rose-400';

	return (
		<div className="glass-panel rounded-2xl p-5">
			<div className="flex items-center justify-between gap-3">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-400">System Health Score</div>
					<h3 className="text-lg font-semibold text-white">{label}</h3>
				</div>
				<div className="text-3xl font-semibold text-sky-300">{Math.round(score)}%</div>
			</div>
			<div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
				<div className={`h-full rounded-full ${tone}`} style={{width: `${Math.min(100, score)}%`}} />
			</div>
		</div>
	);
}
