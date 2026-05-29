import React, {useMemo, useState} from 'react';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Predictions from './pages/Predictions';
import Recovery from './pages/Recovery';

const pages = [
	{id: 'dashboard', label: 'Dashboard'},
	{id: 'alerts', label: 'Alerts'},
	{id: 'predictions', label: 'Predictions'},
	{id: 'recovery', label: 'Recovery'},
];

export default function App() {
	const [page, setPage] = useState('dashboard');
	const activePage = useMemo(() => {
		switch (page) {
			case 'alerts':
				return <Alerts />;
			case 'predictions':
				return <Predictions />;
			case 'recovery':
				return <Recovery />;
			default:
				return <Dashboard />;
		}
	}, [page]);

	return (
		<div className="min-h-full px-4 py-4 md:px-8 md:py-6">
			<div className="glass-panel mb-6 flex flex-col gap-4 rounded-3xl p-4 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-400">Synapse Arc</div>
					<h1 className="text-2xl font-semibold text-white">Predictive System Guardian</h1>
					<p className="mt-1 text-sm text-slate-400">Resource monitoring, anomaly detection, forecasting, and safe self-healing.</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{pages.map((item) => (
						<button
							key={item.id}
							type="button"
							onClick={() => setPage(item.id)}
							className={`rounded-full border px-4 py-2 text-sm transition ${page === item.id ? 'border-sky-300 bg-sky-400/15 text-sky-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>
			{activePage}
		</div>
	);
}
