import React from 'react';

export default function RiskPanel({prediction}) {
	const risk = prediction?.risk_score ?? 0;
	const resource = prediction?.resource ?? 'CPU';
	const current = prediction?.current ?? 0;
	const projected = prediction?.predicted ?? 0;

	return (
		<div className="glass-panel rounded-2xl p-5">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-400">Prediction Center</div>
					<h3 className="text-lg font-semibold text-white">Forecast risk</h3>
				</div>
				<div className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
					{prediction?.time_to_threshold || 'waiting for data'}
				</div>
			</div>
			<div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
				<div className="flex items-end justify-between gap-4">
					<div>
						<div className="text-sm text-slate-400">Resource</div>
						<div className="text-2xl font-semibold text-white">{resource}</div>
					</div>
					<div className="text-right">
						<div className="text-sm text-slate-400">Risk score</div>
						<div className="text-2xl font-semibold text-sky-300">{Math.round(risk * 100)}%</div>
					</div>
				</div>
				<div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
					<div className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300" style={{width: `${Math.min(100, risk * 100)}%`}} />
				</div>
				<div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
					<div className="rounded-xl border border-white/10 p-3">Current: {current.toFixed ? current.toFixed(1) : current}%</div>
					<div className="rounded-xl border border-white/10 p-3">Projected: {projected.toFixed ? projected.toFixed(1) : projected}%</div>
				</div>
			</div>
		</div>
	);
}
