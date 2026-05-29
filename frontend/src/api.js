const BASE = 'http://127.0.0.1:8000';

export async function getOverview() {
  const res = await fetch(`${BASE}/overview`);
  if (!res.ok) throw new Error('Failed to fetch overview');
  return res.json();
}

export async function getMetrics() {
  const res = await fetch(`${BASE}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function postHeal(action) {
  const res = await fetch(`${BASE}/heal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return res.json();
}

export async function runSimulation(opts = {}) {
  const res = await fetch(`${BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  return res.json();
}

export async function simulateAnomaly(payload = {}) {
  const res = await fetch(`${BASE}/simulate/anomaly`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default {
  getOverview,
  getMetrics,
  postHeal,
  runSimulation,
  simulateAnomaly,
};
