import React from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

export default function MetricsChart({history = []}) {
	const data = history.slice(-24).map((entry, index) => ({
		label: entry.label || `t-${history.length - index}`,
		cpu: entry.cpu,
		memory: entry.memory,
		disk: entry.disk,
		network: entry.network,
	}));

	return (
		<div className="glass-panel rounded-2xl p-5">
			<div className="mb-4 flex items-center justify-between">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-400">Resource Forecasting</div>
					<h3 className="text-lg font-semibold text-white">Live system trends</h3>
				</div>
			</div>
			<div className="h-72 w-full">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data}>
						<defs>
							<linearGradient id="cpuFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#59d0ff" stopOpacity={0.45} />
								<stop offset="95%" stopColor="#59d0ff" stopOpacity={0.02} />
							</linearGradient>
							<linearGradient id="memoryFill" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#a78bfa" stopOpacity={0.35} />
								<stop offset="95%" stopColor="#a78bfa" stopOpacity={0.02} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
						<XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
						<YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
						<Tooltip contentStyle={{ background: '#08111d', border: '1px solid rgba(148,163,184,0.2)' }} />
						<Area type="monotone" dataKey="cpu" stroke="#59d0ff" fill="url(#cpuFill)" strokeWidth={2} />
						<Area type="monotone" dataKey="memory" stroke="#a78bfa" fill="url(#memoryFill)" strokeWidth={2} />
						<Area type="monotone" dataKey="disk" stroke="#34d399" fill="none" strokeWidth={2} />
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
