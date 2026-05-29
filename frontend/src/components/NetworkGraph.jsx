import React, {useMemo} from 'react';
import ReactFlow, {Background, Controls} from 'reactflow';
import 'reactflow/dist/style.css';

export default function NetworkGraph() {
	const {nodes, edges} = useMemo(() => {
		const graphNodes = [
			{id: 'agent', position: {x: 40, y: 120}, data: {label: 'System Agent'}},
			{id: 'collector', position: {x: 220, y: 120}, data: {label: 'Resource Collector'}},
			{id: 'anomaly', position: {x: 430, y: 40}, data: {label: 'Anomaly Engine'}},
			{id: 'predict', position: {x: 430, y: 200}, data: {label: 'Prediction Engine'}},
			{id: 'decision', position: {x: 640, y: 120}, data: {label: 'Decision Engine'}},
			{id: 'healing', position: {x: 840, y: 120}, data: {label: 'Self-Healing'}},
		];

		const graphEdges = [
			{id: 'a-b', source: 'agent', target: 'collector'},
			{id: 'b-c', source: 'collector', target: 'anomaly'},
			{id: 'b-d', source: 'collector', target: 'predict'},
			{id: 'c-e', source: 'anomaly', target: 'decision'},
			{id: 'd-e', source: 'predict', target: 'decision'},
			{id: 'e-f', source: 'decision', target: 'healing'},
		];

		return {nodes: graphNodes, edges: graphEdges};
	}, []);

	return (
		<div className="glass-panel h-[420px] rounded-2xl p-4">
			<div className="mb-3 flex items-center justify-between">
				<div>
					<div className="text-xs uppercase tracking-[0.3em] text-slate-400">Architecture</div>
					<h3 className="text-lg font-semibold text-white">System flow graph</h3>
				</div>
			</div>
			<div className="h-[360px] overflow-hidden rounded-xl border border-white/10 bg-slate-950/60">
				<ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false} nodesConnectable={false} zoomOnScroll={false} panOnScroll={false}>
					<Background gap={18} size={1} color="rgba(148,163,184,0.15)" />
					<Controls showInteractive={false} />
				</ReactFlow>
			</div>
		</div>
	);
}
