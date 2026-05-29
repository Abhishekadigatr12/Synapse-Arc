import React from 'react';

export default function AlertPanel({alerts = []}) {
	return (
		<div className="glass-panel rounded-2xl p-5">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-400">Alert Center</div>
					<h3 className="text-lg font-semibold text-white">Active anomalies</h3>
				</div>
			</div>
			<div className="space-y-3">
				{alerts.length === 0 ? (
					<div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No active alerts</div>
				) : (
					alerts.map((alert, index) => (
						<div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4">
							<div className="flex items-center justify-between gap-3">
								<div>
									<div className="text-sm font-semibold text-white">{alert.title}</div>
									<div className="text-xs text-slate-400">{alert.message}</div>
								</div>
								<span className={`rounded-full px-3 py-1 text-xs font-semibold ${alert.severity === 'critical' ? 'bg-rose-500/20 text-rose-200' : alert.severity === 'high' ? 'bg-amber-500/20 text-amber-200' : 'bg-sky-500/20 text-sky-200'}`}>
									{alert.severity || 'info'}
								</span>
							</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
