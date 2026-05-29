import React from 'react';

export default function NodeCard({title, value, subtitle, tone = 'accent'}) {
	const palette = {
		accent: 'text-sky-300',
		success: 'text-emerald-300',
		warning: 'text-amber-300',
		danger: 'text-rose-300',
	};

	return (
		<div className="glass-panel rounded-2xl p-4 shadow-glow">
			<div className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</div>
			<div className={`mt-3 text-3xl font-semibold ${palette[tone] || palette.accent}`}>{value}</div>
			<div className="mt-2 text-sm text-slate-400">{subtitle}</div>
		</div>
	);
}
