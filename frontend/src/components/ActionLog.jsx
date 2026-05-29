import React from 'react';

export default function ActionLog({actions = []}) {
	return (
		<div className="glass-panel rounded-2xl p-5">
			<div className="mb-4">
				<div className="text-xs uppercase tracking-[0.3em] text-slate-400">Self-Healing Actions</div>
				<h3 className="text-lg font-semibold text-white">Audit log</h3>
			</div>
			<div className="space-y-3">
				{actions.length === 0 ? (
					<div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">No actions executed yet</div>
				) : (
					actions.map((action, index) => (
						<div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
							<div className="flex items-center justify-between gap-3">
								<div className="font-semibold text-white">{action.action}</div>
								<div className="text-xs text-slate-400">{action.status}</div>
							</div>
							<div className="mt-1 text-slate-400">{action.reason}</div>
							<div className="mt-2 text-xs text-slate-500">{action.description}</div>
						</div>
					))
				)}
			</div>
		</div>
	);
}
