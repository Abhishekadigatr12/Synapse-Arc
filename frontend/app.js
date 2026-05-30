/* SYNAPSE-ARC - Enterprise AI Anomaly Management Platform Controller */

// Resilient Error Boundary interceptor
window.addEventListener('error', (event) => {
  console.error("SYNAPSE-ARC Error Boundary intercepted exception:", event.error);
  const boundaryScreen = document.getElementById('error-boundary-screen');
  if (boundaryScreen) {
    boundaryScreen.classList.add('hidden', 'opacity-0', 'pointer-events-none');
    boundaryScreen.classList.remove('flex', 'opacity-100');
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("SYNAPSE-ARC async boundary intercepted rejection:", event.reason);
  const boundaryScreen = document.getElementById('error-boundary-screen');
  if (boundaryScreen) {
    boundaryScreen.classList.add('hidden', 'opacity-0', 'pointer-events-none');
    boundaryScreen.classList.remove('flex', 'opacity-100');
  }
});

window.SynapseCore = {
  isSimulationRunning: false,
  activeIntervals: [],
  activeTimeouts: [],
  clearAllTimers: function() {
    this.activeIntervals.forEach(clearInterval);
    this.activeTimeouts.forEach(clearTimeout);
    this.activeIntervals = [];
    this.activeTimeouts = [];
    this.isSimulationRunning = false;
    
    if (typeof state !== 'undefined') {
      if (state.simulationInterval) {
        clearInterval(state.simulationInterval);
        state.simulationInterval = null;
      }
      state.simulationActive = false;
    }
    if (typeof backendRefreshInterval !== 'undefined' && backendRefreshInterval) {
      clearInterval(backendRefreshInterval);
      backendRefreshInterval = null;
    }
    if (typeof predictionCountdownInterval !== 'undefined' && predictionCountdownInterval) {
      clearInterval(predictionCountdownInterval);
      predictionCountdownInterval = null;
    }
  }
};

const nativeSetInterval = window.setInterval;
const nativeSetTimeout = window.setTimeout;

window.setInterval = function(handler, delay, ...args) {
  const id = nativeSetInterval(handler, delay, ...args);
  window.SynapseCore.activeIntervals.push(id);
  return id;
};

window.setTimeout = function(handler, delay, ...args) {
  const id = nativeSetTimeout(handler, delay, ...args);
  window.SynapseCore.activeTimeouts.push(id);
  return id;
};


// Global App State
const state = {
  theme: 'dark',
  currentPage: 'overview',
  simulationActive: false,
  simulationInterval: null,
  currentStageIndex: 0,
  selectedNodeId: 8, // Default database node
  sessionStart: Date.now(),
  demoPanelCollapsed: false,
  backendConnected: false,
  backendSocket: null,
  backend: {
    overview: null,
    metrics: null,
    alerts: [],
    actions: [],
    history: [],
    topology: null,
    demo: null,
    shap: null,
    lastSyncAt: null,
  },
  selectedDatasetFile: null,
  selectedDatasetName: null,
  metrics: {
    health: 99.98,
    activeNodes: 12,
    anomalies: 0,
    threats: 0,
    lossPrevented: 420.4,
    cpu: 45.2,
    gpu: 62.8,
    memory: 54.1,
    latency: 24,
    packetLoss: 0.01,
    power: 14.2,
    riskScore: 4,
    aiConfidence: 98.7,
    failureWindow: 'N/A',
    stabilization: 0,
    downtimePrevented: 48.2,
    nodesSaved: 12,
    recoverySuccess: 99.96,
    costAvoided: 58.2,
  },
  logs: [
    { time: '13:50:11', type: 'info', actor: 'AI Core Agent', msg: 'SYNAPSE-ARC telemetry pipeline initialized.' },
    { time: '13:52:45', type: 'success', actor: 'RL Optimizer', msg: 'RL agent optimizer loaded successfully.' },
    { time: '13:55:00', type: 'info', actor: 'Guardian Engine', msg: 'Guardian self-healing system online. Protection active.' },
  ],
};

const API_BASE_URL = (window.SYNAPSE_ARC_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const DATA_REFRESH_INTERVAL_MS = 60000; // Polling kept slow — UI updates from manual button actions only

let backendRefreshInterval = null;

  function apiUrl(path) {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(apiUrl(path), {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${path}: ${response.status}`);
    }

    return response.json();
  }

  function cloneStage(stage) {
    return JSON.parse(JSON.stringify(stage));
  }

  function refreshLiveViews() {
    renderTopologies();
    renderArchitectureFlow();
    renderTimelineChart();
    renderBlastRadiusChart();
    updateDashboardMetrics();
    updateLiveLogs();
    updateSelfHealingWorkflow();
    updateTelemetryGauge();

    if (state.activeDemoMode === 'cryptojack') {
      const shapSummaryEl = document.getElementById('mlShapSummary');
      if (shapSummaryEl) shapSummaryEl.innerText = "Anomaly detected: Resource consumption inconsistent with system Idle state";
      const decisionReasonEl = document.getElementById('mlDecisionReason');
      if (decisionReasonEl) decisionReasonEl.innerText = "Anomaly detected: Resource consumption inconsistent with system Idle state";
      const brainReasoningVal = document.getElementById('brainReasoningVal');
      if (brainReasoningVal) brainReasoningVal.innerText = "Anomaly detected: Resource consumption inconsistent with system Idle state";
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const el = byId(id);
    if (el) el.innerText = value;
  }

  function setWidth(id, value) {
    const el = byId(id);
    if (el) el.style.width = value;
  }

  function createIconsSafe() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function scoreToStageIndex(score, anomalyCount = 0, criticalCount = 0) {
    if (score >= 98 && anomalyCount === 0 && criticalCount === 0) return 0;
    if (score >= 94 && criticalCount === 0) return 1;
    if (score >= 85 || criticalCount > 0) return 2;
    if (score >= 70) return 3;
    return 4;
  }

  function buildBackendStage() {
    const overview = state.backend.overview || {};
    const snapshot = overview.latest_snapshot || state.backend.metrics || {};
    const alerts = Array.isArray(overview.recent_alerts) ? overview.recent_alerts : [];
    const actions = Array.isArray(overview.recent_actions) ? overview.recent_actions : [];
    const cluster = overview.cluster || {};
    const demoState = state.backend.demo || {};
    const latestAlert = alerts[0] || {};
    const latestAlertDetails = latestAlert.details || {};
    const latestAnalysis = latestAlertDetails.analysis || latestAlertDetails;
    const demoAnalysis = demoState.analysis || {};
    const explainability = state.backend.shap || demoAnalysis.explainability || latestAnalysis.explainability || null;
    const healing = demoAnalysis.healing || latestAnalysis.healing || null;
    const decision = demoState.decision || demoAnalysis.decision || latestAnalysis.decision || {};
    const forecast = demoState.forecast || demoAnalysis.forecast || latestAnalysis.forecast || {};

    const healthScore = Number.isFinite(Number(overview.health_score)) ? Number(overview.health_score) : state.metrics.health;
    const anomalyCount = Number.isFinite(Number(cluster.anomaly)) ? Number(cluster.anomaly) : alerts.length;
    const criticalCount = Number.isFinite(Number(cluster.critical)) ? Number(cluster.critical) : 0;
    const warningCount = Number.isFinite(Number(cluster.warning)) ? Number(cluster.warning) : 0;
    const stageIndex = scoreToStageIndex(healthScore, anomalyCount, criticalCount);
    const baseStage = cloneStage(simulationStages[Math.min(stageIndex, simulationStages.length - 1)] || simulationStages[0]);
    const cpuValue = Number.isFinite(Number(snapshot.cpu)) ? Number(snapshot.cpu) : baseStage.cpu;
    const memoryValue = Number.isFinite(Number(snapshot.memory)) ? Number(snapshot.memory) : baseStage.memory;
    const tempValue = Number.isFinite(Number(snapshot.temp)) ? Number(snapshot.temp) : baseStage.gpu;
    const diskValue = Number.isFinite(Number(snapshot.disk)) ? Number(snapshot.disk) : 0;
    const riskScore = Math.max(0, Math.min(100, Math.round((100 - healthScore) + anomalyCount * 12 + criticalCount * 20 + warningCount * 4)));
    const explainabilityMetrics = Array.isArray(explainability?.feature_contributions) && explainability.feature_contributions.length > 0
      ? explainability.feature_contributions.slice(0, 3).map((item) => ({
        label: item.feature.toUpperCase(),
        value: `${item.value.toFixed(1)} / ${item.threshold.toFixed(1)}`,
        change: item.overflow > 0 ? `+${item.overflow.toFixed(1)}` : '0.0',
        impact: `${Math.round((item.weight || 0) * 100)}%`,
        isDanger: item.overflow > 0,
      }))
      : [
          { label: 'CPU Load', value: `${cpuValue.toFixed(1)}%`, change: anomalyCount > 0 ? '▲ live' : '0%', impact: `+${Math.min(12, anomalyCount * 2).toFixed(1)}%`, isDanger: anomalyCount > 0 },
          { label: 'Memory Pressure', value: `${memoryValue.toFixed(1)}%`, change: criticalCount > 0 ? '▲ live' : '0%', impact: `+${Math.min(10, warningCount * 1.5).toFixed(1)}%`, isDanger: criticalCount > 0 },
          { label: 'Disk Saturation', value: `${diskValue.toFixed(1)}%`, change: 'live', impact: `+${Math.min(8, healthScore < 95 ? 2.5 : 0.2).toFixed(1)}%`, isDanger: healthScore < 95 },
        ];
    const liveLogs = [];

    if (alerts.length > 0) {
      alerts.slice(0, 3).forEach((alert) => {
        liveLogs.push({
          time: alert.ts ? new Date(alert.ts).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: String(alert.severity || 'info').toLowerCase(),
          actor: alert.host || 'Backend Monitor',
          msg: alert.message || alert.title || 'Alert received from backend',
        });
      });
    } else {
      liveLogs.push({
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'info',
        actor: 'Backend Sync',
        msg: 'No active alerts returned from the API.',
      });
    }

    if (Array.isArray(demoState.pipeline_events)) {
      demoState.pipeline_events.slice(-5).forEach((event) => {
        liveLogs.push({
          time: event.timestamp ? new Date(event.timestamp).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: String(event.event || '').includes('completed') ? 'success' : 'info',
          actor: 'Backend Pipeline',
          msg: `${event.event || 'pipeline:event'} ${event.payload?.status ? `-> ${event.payload.status}` : ''}`,
        });
      });
    }

    if (Array.isArray(demoState.recovery_events)) {
      demoState.recovery_events.forEach((event) => {
        liveLogs.push({
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: event.status === 'completed' ? 'success' : event.status === 'failed' ? 'danger' : 'warning',
          actor: 'Self-Healing',
          msg: event.message || `${event.step}: ${event.status}`,
        });
      });
    }

    if (actions.length > 0) {
      actions.slice(0, 3).forEach((action) => {
        liveLogs.push({
          time: action.ts ? new Date(action.ts).toLocaleTimeString('en-US', { hour12: false }) : new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: action.status === 'completed' ? 'success' : 'warning',
          actor: action.target || 'Remediation Engine',
          msg: `${action.action || 'Action'} -> ${action.result || action.status || 'queued'}`,
        });
      });
    }

    return {
      ...baseStage,
      currentStageIndex: stageIndex,
      name: stageIndex === 0 ? 'SYSTEM NORMAL' : stageIndex === 1 ? 'ANOMALY DETECTED' : stageIndex === 2 ? 'CASCADE PREDICTED' : stageIndex === 3 ? 'SELF-HEALING ACTIVE' : 'SYSTEM RECOVERED',
      badgeClass: stageIndex === 0
        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-glowGreen'
        : stageIndex === 1
          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-glow'
          : stageIndex === 2
            ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-glowRed animate-pulse'
            : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-glowCyan',
      title: overview.system_name || baseStage.title,
      health: Number(healthScore.toFixed(1)),
      activeNodes: Number.isFinite(Number(cluster.node_count)) ? Number(cluster.node_count) : baseStage.activeNodes,
      anomalies: anomalyCount,
      threats: warningCount + criticalCount,
      lossPrevented: Number((baseStage.lossPrevented + actions.length * 4).toFixed(1)),
      cpu: Number(cpuValue.toFixed(1)),
      gpu: Number(tempValue.toFixed(1)),
      memory: Number(memoryValue.toFixed(1)),
      latency: diskValue > 0 ? Math.max(12, Math.round(diskValue / 2)) : baseStage.latency,
      packetLoss: Number((anomalyCount * 0.42 + criticalCount * 1.25).toFixed(2)),
      power: diskValue > 0 ? Number(Math.max(1, diskValue / 6).toFixed(1)) : baseStage.power,
      riskScore,
      aiConfidence: Number(Math.max(72, 99 - anomalyCount * 3 - criticalCount * 5).toFixed(1)),
      failureWindow: stageIndex >= 2 ? '1.8 mins' : stageIndex === 1 ? '4.2 mins' : 'N/A',
      stabilization: stageIndex >= 3 ? Math.min(100, 55 + actions.length * 10) : 0,
      nodesSaved: Math.max(0, (Number.isFinite(Number(cluster.node_count)) ? Number(cluster.node_count) : 12) - criticalCount),
      logs: liveLogs,
      rca: {
        cause: alerts[0]?.title || alerts[0]?.message || 'N/A',
        confidence: stageIndex === 0 ? 0 : Math.max(45, 72 + anomalyCount * 5),
        affected: anomalyCount,
        time: stageIndex >= 2 ? '1.8 Minutes' : stageIndex === 1 ? '4.2 Minutes' : 'N/A',
      },
      brain: {
        action: stageIndex === 0 ? 'Scanning Telemetry' : stageIndex === 1 ? 'Analyzing Backend Alerts' : 'Coordinating API Remediation',
        next: stageIndex === 0 ? 'Analyze Trends' : 'Review Alerts',
        reasoning: explainability?.summary || (stageIndex === 0 ? 'Continuous monitoring with live backend telemetry.' : 'Live backend signals indicate a remediation path.'),
        confidence: Number(Math.max(75, 96 - anomalyCount * 4).toFixed(1)),
      },
      costImpact: {
        potential: Number((stageIndex >= 2 ? 120 : 0).toFixed(1)),
        recovered: actions.length * 12,
        downtime: stageIndex >= 2 ? 1.2 : 0,
        saved: stageIndex >= 3 ? 88 : stageIndex >= 2 ? 75 : 100,
      },
      twin: {
        current: Math.min(100, Math.max(4, riskScore)),
        predicted: Math.min(100, Math.max(5, riskScore + 12)),
        diff: 12,
      },
      xai: {
        metrics: explainabilityMetrics,
        totalIncrease: explainability?.decision?.confidence ? `+${Math.round(explainability.decision.confidence * 100)}%` : `+${Math.max(0.2, (100 - healthScore) / 2).toFixed(1)}%`,
      },
      riskConfidence: {
        thermal: Math.min(100, Math.round(tempValue * 1.1)),
        network: Math.min(100, 10 + warningCount * 18),
        power: Math.min(100, 12 + criticalCount * 22),
        memory: Math.min(100, Math.round(memoryValue)),
      },
      dependencyImpact: alerts.slice(0, 3).map((alert) => alert.host || alert.title || 'Backend alert'),
      blastRadiusForecast: {
        current: anomalyCount,
        min2: anomalyCount + warningCount,
        min5: anomalyCount + warningCount + criticalCount,
      },
      mlDecision: {
        action: decision.action || (stageIndex === 0 ? 'observe' : 'review'),
        reason: decision.reason || explainability?.summary || 'Live backend analysis unavailable',
        confidence: Number.isFinite(Number(decision.confidence)) ? Number(decision.confidence) : Math.max(0.5, 1 - anomalyCount * 0.08),
        feature: decision.feature || 'none',
        threshold: decision.threshold ?? null,
        value: decision.value ?? null,
      },
      mlForecast: {
        resource: forecast.resource || 'memory',
        risk: Number.isFinite(Number(forecast.risk)) ? Number(forecast.risk) : Math.max(0, Math.round(healthScore)),
        timeToThreshold: forecast.time_to_threshold || forecast.timeToThreshold || 'N/A',
        predictedCpu: forecast.predicted_cpu ?? forecast.predictedCpu ?? cpuValue,
        predictedMemory: forecast.predicted_memory ?? forecast.predictedMemory ?? memoryValue,
      },
      mlExplainability: {
        summary: explainability?.summary || 'No backend explanation available yet.',
        whyNow: explainability?.root_cause || explainability?.why_now || explainability?.summary || 'No backend explanation available yet.',
        modelPrediction: explainability?.model || demoAnalysis.model || latestAnalysis.model || null,
        featureContributions: Array.isArray(explainability?.feature_contributions) ? explainability.feature_contributions : [],
      },
      recommendations: actions.length > 0
        ? actions.slice(0, 3).map((action) => ({
          action: action.action || 'Backend remediation',
          priority: action.status === 'completed' ? 'LOW' : 'HIGH',
          successRate: action.status === 'completed' ? 98 : 91,
          status: String(action.status || 'queued').toUpperCase(),
        }))
        : Array.isArray(healing?.steps) && healing.steps.length > 0
          ? healing.steps.map((step) => ({
            action: step.title,
            priority: 'HIGH',
            successRate: 95,
            status: step.action === 'observe' ? 'STANDBY' : 'SELECTED',
          }))
          : baseStage.recommendations,
      validation: {
        nodeStable: stageIndex === 0 ? 'NOMINAL' : 'WARNING',
        trafficNormal: stageIndex >= 2 ? 'WARNING' : 'NOMINAL',
        tempNormal: healthScore >= 95 ? 'NOMINAL' : 'CRITICAL',
        state: stageIndex >= 3 ? 'VALIDATING' : 'MONITORING',
      },
      slaBreachProb: `${Math.max(0.02, 100 - healthScore).toFixed(2)}%`,
      multiCluster: {
        A: 'HEALTHY',
        B: criticalCount > 0 ? 'CRITICAL' : warningCount > 0 ? 'WARNING' : 'HEALTHY',
        C: healthScore >= 90 ? 'HEALTHY' : 'WARNING',
      },
    };
  }

  function resolveActiveStage() {
    if (state.backendConnected && state.backend.overview) {
      return buildBackendStage();
    }

    const baseStage = simulationStages[state.currentStageIndex] || simulationStages[0];
    if (state.activeDemoMode === 'cryptojack' && state.currentStageIndex <= 2) {
      const cloned = cloneStage(baseStage);
      cloned.name = 'CRITICAL ANOMALY DETECTED';
      cloned.badgeClass = 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-glowRed animate-pulse';
      cloned.health = 23.1;
      cloned.anomalies = 1;
      cloned.threats = 1;
      cloned.riskScore = 96;
      cloned.threatLevel = 'Critical';
      cloned.failureWindow = '1.2 mins';
      cloned.nodeStates[8] = 'critical';
      cloned.brain = {
        action: "Coordinating Cryptojacking Remediation",
        next: "Isolate Unauthorized Processes",
        reasoning: "Anomaly detected: Resource consumption inconsistent with system Idle state",
        confidence: 96
      };
      cloned.mlExplainability = {
        summary: "Anomaly detected: Resource consumption inconsistent with system Idle state",
        whyNow: "Resource consumption inconsistent with system Idle state",
        modelPrediction: 1,
        featureContributions: [
          { feature: 'cpu', value: 92.0, overflow: 47.0, weight: 0.62 },
          { feature: 'memory', value: 40.0, overflow: 0.0, weight: 0.12 }
        ]
      };
      cloned.mlDecision = {
        action: "isolate",
        reason: "Anomaly detected: Resource consumption inconsistent with system Idle state",
        confidence: 0.96,
        feature: "cpu",
        threshold: 45.0,
        value: 92.0
      };
      return cloned;
    }

    return baseStage;
  }

  function applyBackendSnapshot(payload) {
    state.backend.overview = payload.overview;
    state.backend.metrics = payload.metrics;
    state.backend.alerts = payload.alerts;
    state.backend.actions = payload.actions;
    state.backend.history = payload.history;
    state.backend.topology = payload.topology;
    state.backend.demo = payload.demo;
    state.backend.shap = payload.shap;
    state.backend.lastSyncAt = new Date().toISOString();
    state.backendConnected = true;

    const liveStage = buildBackendStage();
    state.currentStageIndex = liveStage.currentStageIndex;
    state.metrics.health = liveStage.health;
    state.metrics.activeNodes = liveStage.activeNodes;
    state.metrics.anomalies = liveStage.anomalies;
    state.metrics.threats = liveStage.threats;
    state.metrics.lossPrevented = liveStage.lossPrevented;
    state.metrics.cpu = liveStage.cpu;
    state.metrics.gpu = liveStage.gpu;
    state.metrics.memory = liveStage.memory;
    state.metrics.latency = liveStage.latency;
    state.metrics.packetLoss = liveStage.packetLoss;
    state.metrics.power = liveStage.power;
    state.metrics.riskScore = liveStage.riskScore;
    state.metrics.aiConfidence = liveStage.aiConfidence;

    state.logs = liveStage.logs;

    if (state.simulationInterval) {
      clearInterval(state.simulationInterval);
      state.simulationInterval = null;
    }
  }

  function applySimulationResult(mode, result) {
    const snapshot = result.snapshot || result.payload || state.backend.metrics || null;
    const overview = state.backend.overview || {
      system_name: 'SYNAPSE-ARC',
      latest_snapshot: snapshot,
      recent_alerts: [],
      recent_actions: [],
      cluster: {
        node_count: 12,
        stable: 12,
        warning: 0,
        anomaly: result.anomaly?.anomaly ? 1 : 0,
        critical: result.anomaly?.severity === 'critical' ? 1 : 0,
      },
      health_score: result.status === 'healthy' ? 99.98 : 23.1,
    };

    applyBackendSnapshot({
      overview,
      metrics: snapshot,
      alerts: state.backend.alerts,
      actions: state.backend.actions,
      history: state.backend.history,
      topology: result.topology || state.backend.topology,
      demo: { mode, ...result },
    });
  }

  async function syncBackendState() {
    if (window.SynapseCore && window.SynapseCore.isSimulationRunning) {
      return false;
    }
    try {
      const [overview, metrics, alerts, actions, history, topology, demoState, shapState] = await Promise.all([
        fetchJson('/overview'),
        fetchJson('/metrics'),
        fetchJson('/alerts').catch(() => ({ alerts: [] })),
        fetchJson('/actions').catch(() => ({ actions: [] })),
        fetchJson('/history').catch(() => ({ history: [] })),
        fetchJson('/topology').catch(() => null),
        fetchJson('/demo/state').catch(() => ({ state: null })),
        fetchJson('/shap').catch(() => ({ shap: null })),
      ]);

      applyBackendSnapshot({
        overview,
        metrics,
        alerts: alerts.alerts || [],
        actions: actions.actions || [],
        history: history.history || [],
        topology,
        demo: demoState.state || null,
        shap: shapState.shap || null,
      });

      return true;
    } catch (error) {
      console.warn('Backend sync failed, falling back to local simulation:', error);
      state.backendConnected = false;
      return false;
    }
  }

  let reconnectTimer = null;

  function connectBackendStream() {
    try {
      if (state.backendSocket && state.backendSocket.readyState === WebSocket.OPEN) {
        return;
      }

      const socket = new WebSocket(`${API_BASE_URL.replace(/^http/i, 'ws')}/ws/live`);
      state.backendSocket = socket;

      socket.addEventListener('open', () => {
        state.backendConnected = true;
        console.log('[WebSocket] Connected to streaming backend');
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
      });

      socket.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'TELEMETRY_UPDATE') {
            const data = message.payload;
            state.liveTelemetry = data;

            // Target B: Live Telemetry Parameters Grid
            const insCpuBar = document.getElementById('insCpuBar');
            const insCpuText = document.getElementById('insCpuText');
            if (insCpuBar && insCpuText && data.cpu !== undefined) {
              insCpuBar.style.width = `${Math.round(data.cpu)}%`;
              insCpuText.innerText = `${Math.round(data.cpu)}%`;
            }

            const insRamBar = document.getElementById('insRamBar');
            const insRamText = document.getElementById('insRamText');
            if (insRamBar && insRamText && data.memory !== undefined) {
              insRamBar.style.width = `${Math.round(data.memory)}%`;
              insRamText.innerText = `${Math.round(data.memory)}%`;
            }

            const drCpuBar = document.getElementById('drCpuBar');
            const drCpuText = document.getElementById('drCpuText');
            if (drCpuBar && data.cpu !== undefined) {
              drCpuBar.style.width = `${Math.round(data.cpu)}%`;
              if (drCpuText) drCpuText.innerText = `${Math.round(data.cpu)}%`;
            }

            const drRamBar = document.getElementById('drRamBar');
            const drRamText = document.getElementById('drRamText');
            if (drRamBar && data.memory !== undefined) {
              drRamBar.style.width = `${Math.round(data.memory)}%`;
              if (drRamText) drRamText.innerText = `${Math.round(data.memory)}%`;
            }
          } 
          else if (message.type === 'MODEL_TRAINED') {
             // Handle trained log
             const mlDecisionAction = document.getElementById('mlDecisionAction');
             if (mlDecisionAction) mlDecisionAction.innerText = 'BASELINE TRAINED';
          }
        } catch (e) {
          console.warn('WebSocket message parse error:', e);
        }
      });

      socket.addEventListener('close', () => {
        state.backendConnected = false;
        state.backendSocket = null;
        console.log('[WebSocket] Disconnected, attempting reconnect in 3s...');
        if (!reconnectTimer) {
            reconnectTimer = setTimeout(connectBackendStream, 3000);
        }
      });
      
      socket.addEventListener('error', (err) => {
        socket.close();
      });
      
    } catch (error) {
      console.warn('Backend websocket unavailable:', error);
    }
  }

  function startBackendRefreshLoop() {
    // Legacy polling removed. Real-time stream handles updates.
  }

  function startTelemetryPolling() {
      // Polling removed — UI now updates directly from WebSocket TELEMETRY_UPDATE events
  }

  function runAutonomousSelfHealing() {
    state.simulationActive = true;
    state.currentStageIndex = 0;
    switchPageView('incident');

    window.SynapseCore.clearAllTimers();
    window.SynapseCore.isSimulationRunning = true;
    state.backendConnected = false; // Override map bindings locally

    const steps = [0, 1, 2, 3, 4, 5];
    let idx = 0;

    const executeNextStep = () => {
      if (idx >= steps.length) {
        restoreNominalPlatform();
        return;
      }

      const stageIdx = steps[idx];
      state.currentStageIndex = stageIdx;

      // Force target node DB-Cluster-08 (ID 8) states to warning/critical locally
      const stage = simulationStages[stageIdx];
      if (stageIdx === 1) {
        stage.nodeStates[8] = 'warning';
      } else if (stageIdx === 2) {
        stage.nodeStates[8] = 'critical';
      }

      loadSimulationStage(stageIdx);

      // Instantly flip node 8 to a pulsing Crimson Red on map during incident phases
      if (stageIdx === 1 || stageIdx === 2) {
        const nodeGroup = document.querySelectorAll('g[onclick*="nodeClickDispatcher(8"]');
        nodeGroup.forEach(g => {
          const circle = g.querySelector('circle.topo-node');
          if (circle) {
            circle.setAttribute('fill', '#EF4444');
            circle.setAttribute('stroke', '#EF4444');
            circle.classList.add('animate-pulse');
          }
        });
      }

      if (stageIdx === 0) {
        appendTerminalLog('success', 'Backend Pipeline', 'run-simulation-completed -> healthy');
      }

      idx++;
      const timeoutId = setTimeout(executeNextStep, 3000);
      window.SynapseCore.activeTimeouts.push(timeoutId);
    };

    executeNextStep();
  }

  function appendTerminalLog(type, actor, msg) {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    state.logs.push({
      time: timeStr,
      type: type,
      actor: actor,
      msg: msg
    });
    if (state.logs.length > 30) {
      state.logs.shift();
    }
    updateLiveLogs();
  }

  function restoreNominalPlatform() {
    const stage = simulationStages[5];
    stage.nodeStates[8] = 'healthy';
    loadSimulationStage(5);

    const liveStatusBadge = document.getElementById('liveStatusBadge');
    if (liveStatusBadge) {
      liveStatusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full mr-2 bg-emerald-500 animate-ping"></span> SYSTEM RECOVERED & OPTIMIZED`;
      liveStatusBadge.className = "flex items-center px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-glowGreen";
    }

    appendTerminalLog('success', 'Memory Manager', 'Reclaimed 2.4 GB active memory blocks. Platform fully optimized.');

    setTimeout(() => {
      state.activeDemoMode = null;
      fetchJson('/api/demo-scenario/reset').catch(() => {});
      if (window.SynapseCore) {
        window.SynapseCore.isSimulationRunning = false;
      }
      state.simulationActive = false;
      state.backendConnected = true;
      startTelemetryPolling();
      startBackendRefreshLoop();
    }, 4000);
  }


// Node Definition Table (12 connected system nodes)
const nodesData = [
  { id: 1, name: 'Arc-Core-01', x: 250, y: 150, type: 'Core Compute', status: 'healthy', cpu: 42, ram: 55, temp: 45, power: 12.4, packetLoss: 0.01 },
  { id: 2, name: 'Edge-Gateway-02', x: 120, y: 220, type: 'API Gateway', status: 'healthy', cpu: 32, ram: 41, temp: 38, power: 8.5, packetLoss: 0.02 },
  { id: 3, name: 'Sdn-Router-03', x: 380, y: 220, type: 'Network Router', status: 'healthy', cpu: 28, ram: 34, temp: 40, power: 6.2, packetLoss: 0.01 },
  { id: 4, name: 'Api-Broker-04', x: 180, y: 320, type: 'API Broker', status: 'healthy', cpu: 49, ram: 60, temp: 47, power: 10.1, packetLoss: 0.02 },
  { id: 5, name: 'Load-Balancer-05', x: 320, y: 320, type: 'Load Balancer', status: 'healthy', cpu: 38, ram: 50, temp: 43, power: 9.4, packetLoss: 0.01 },
  { id: 6, name: 'Micro-Service-06', x: 80, y: 380, type: 'Worker Node', status: 'healthy', cpu: 55, ram: 68, temp: 51, power: 11.2, packetLoss: 0.03 },
  { id: 7, name: 'Cache-Redis-07', x: 220, y: 420, type: 'Redis Cache', status: 'healthy', cpu: 61, ram: 79, temp: 53, power: 14.8, packetLoss: 0.02 },
  { id: 8, name: 'Db-Cluster-08', x: 280, y: 420, type: 'Database Primary', status: 'healthy', cpu: 45, ram: 62, temp: 62, power: 15.6, packetLoss: 0.01 },
  { id: 9, name: 'Worker-Group-09', x: 420, y: 380, type: 'Worker Node', status: 'healthy', cpu: 30, ram: 44, temp: 42, power: 10.5, packetLoss: 0.02 },
  { id: 10, name: 'S3-Storage-10', x: 140, y: 480, type: 'Storage Cluster', status: 'healthy', cpu: 15, ram: 28, temp: 35, power: 5.1, packetLoss: 0.01 },
  { id: 11, name: 'Standby-Spare-11', x: 360, y: 480, type: 'Standby Host', status: 'healthy', cpu: 2, ram: 10, temp: 31, power: 1.2, packetLoss: 0.00 },
  { id: 12, name: 'Analytics-AI-12', x: 250, y: 550, type: 'AI Compute Enclave', status: 'healthy', cpu: 51, ram: 70, temp: 58, power: 16.4, packetLoss: 0.02 }
];

// Topology Edges (Inter-node Network Links)
const edgesData = [
  { from: 1, to: 2 }, { from: 1, to: 3 },
  { from: 2, to: 4 }, { from: 2, to: 6 },
  { from: 3, to: 5 }, { from: 3, to: 9 },
  { from: 4, to: 5 }, { from: 4, to: 7 },
  { from: 5, to: 8 }, { from: 5, to: 9 },
  { from: 6, to: 10 }, { from: 7, to: 8 },
  { from: 8, to: 11 }, { from: 8, to: 12 },
  { from: 10, to: 12 }, { from: 11, to: 12 }
];

// Simulation Scenario Setup with enhanced UI metrics & Explainable AI (XAI) values
const simulationStages = [
  {
    name: 'SYSTEM NORMAL',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-glowGreen',
    title: 'Guardian AI Core Stable',
    riskScore: 4,
    aiConfidence: 98.7,
    threatLevel: 'Minimal',
    failureWindow: 'N/A',
    health: 99.98,
    activeNodes: 12,
    anomalies: 0,
    threats: 0,
    lossPrevented: 420.4,
    cpu: 45.2,
    gpu: 62.8,
    memory: 54.1,
    latency: 24,
    packetLoss: 0.01,
    power: 14.2,
    stabilization: 0,
    nodesSaved: 12,
    workflowStep: 'Detect',
    workflowActiveIndex: 0,
    workflowCompletedIndices: [],
    logs: [
      'HEALTH CHECK: All 12 telemetry streams returning normal parameter sets.',
      'AI INFERENCE: Cascade prediction model predicts 0.02% failure probability next 2h.',
      'OPTIMIZER: Cluster power load auto-throttled. Average savings: 8.4%.'
    ],
    nodeStates: { 8: 'healthy', 4: 'healthy', 5: 'healthy', 11: 'healthy' },
    rca: { cause: 'N/A', confidence: 0, affected: 0, time: 'N/A' },
    brain: { action: 'Scanning Telemetry', next: 'Analyze Trends', reasoning: 'SHAP Value deviation within bounds. Nominal Random Forest classification confidence: 98.7%.', confidence: 99.2 },
    costImpact: { potential: 0, recovered: 0, downtime: 0, saved: 100 },
    twin: { current: 4, predicted: 5, diff: 1 },
    xai: {
      metrics: [
        { label: 'GPU Temp Core-08', value: '62°C', change: '0%', impact: '+0.1%', isDanger: false },
        { label: 'Network Packet Loss', value: '0.01%', change: '0%', impact: '+0.0%', isDanger: false },
        { label: 'System Power Draw', value: '14.2 kW', change: '0%', impact: '+0.1%', isDanger: false }
      ],
      totalIncrease: '+0.2%'
    },
    riskConfidence: { thermal: 14, network: 8, power: 12, memory: 5 },
    dependencyImpact: ['None'],
    blastRadiusForecast: { current: 0, min2: 0, min5: 0 },
    recommendations: [
      { action: 'Scale Auxiliary Fans', priority: 'Low', successRate: 98, status: 'STANDBY' },
      { action: 'Database Replication Rollback', priority: 'Medium', successRate: 91, status: 'STANDBY' }
    ],
    validation: { nodeStable: 'NOMINAL', trafficNormal: 'NOMINAL', tempNormal: 'NOMINAL', state: 'UNAVAILABLE' },
    slaBreachProb: '0.02%',
    multiCluster: { A: 'HEALTHY', B: 'HEALTHY', C: 'HEALTHY' },
    mlDecision: {
      action: 'observe',
      reason: 'No anomalous signals detected in cluster telemetry.',
      confidence: 0.98,
      feature: 'none',
      threshold: null,
      value: null
    },
    mlForecast: {
      resource: 'CPU',
      risk: 4,
      timeToThreshold: 'N/A',
      predictedCpu: 45.2,
      predictedMemory: 54.1
    },
    mlExplainability: {
      summary: 'Telemetry signals reside completely inside the statistical baseline. Multi-cluster enclaves secure.',
      whyNow: 'No hard thresholds exceeded.',
      modelPrediction: 0,
      featureContributions: [
        { feature: 'cpu', value: 45.2, overflow: 0.0, weight: 0.12 },
        { feature: 'temp', value: 62.8, overflow: 0.0, weight: 0.14 },
        { feature: 'memory', value: 54.1, overflow: 0.0, weight: 0.08 }
      ]
    }
  },
  {
    name: 'ANOMALY DETECTED',
    badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-glow',
    title: 'Thermal Spike Identified',
    riskScore: 34,
    aiConfidence: 89.2,
    threatLevel: 'Elevated',
    failureWindow: '4.2 mins',
    health: 98.42,
    activeNodes: 12,
    anomalies: 1,
    threats: 1,
    lossPrevented: 420.4,
    cpu: 68.4,
    gpu: 88.5,
    memory: 72.8,
    latency: 48,
    packetLoss: 1.25,
    power: 16.9,
    stabilization: 0,
    nodesSaved: 12,
    workflowStep: 'Analyze',
    workflowActiveIndex: 1,
    workflowCompletedIndices: [0],
    logs: [
      'WARNING: High thermal anomaly on database host Db-Cluster-08. Temperature: 88°C.',
      'AI DETECTOR: Anomaly footprint identified as cooling hardware restriction.',
      'RISK PREDICTION: Potential thermal cascade danger to API gateway and load balancers.'
    ],
    nodeStates: { 8: 'warning', 4: 'healthy', 5: 'healthy', 11: 'healthy' },
    rca: { cause: 'Host DB cooling shroud degradation', confidence: 82, affected: 1, time: '4.2 Minutes' },
    brain: { action: 'Analyzing Thermal Anomaly', next: 'Isolate Vulnerable Links', reasoning: 'SHAP Value deviation detected on Thermal Core-08: cooling restrictions driving anomaly score spike (98.4%). Isolation Forest confirms outlier status.', confidence: 89.4 },
    costImpact: { potential: 120, recovered: 0, downtime: 0, saved: 100 },
    twin: { current: 34, predicted: 75, diff: 41 },
    xai: {
      metrics: [
        { label: 'GPU Temp Core-08', value: '88°C', change: '▲ 42%', impact: '+24.5%', isDanger: true },
        { label: 'Network Packet Loss', value: '1.25%', change: '▲ 1.2%', impact: '+4.2%', isDanger: false },
        { label: 'System Power Draw', value: '16.9 kW', change: '▲ 18%', impact: '+5.3%', isDanger: false }
      ],
      totalIncrease: '+34.0%'
    },
    riskConfidence: { thermal: 68, network: 24, power: 40, memory: 18 },
    dependencyImpact: ['Db-Cluster-08'],
    blastRadiusForecast: { current: 1, min2: 2, min5: 5 },
    recommendations: [
      { action: 'Trigger Fan Overdrive Surge', priority: 'HIGH', successRate: 94, status: 'EVALUATED' },
      { action: 'Prepare Standby-Spare-11 Sync', priority: 'HIGH', successRate: 96, status: 'EVALUATED' },
      { action: 'Micro-throttling Db-08 core', priority: 'Medium', successRate: 88, status: 'EVALUATED' }
    ],
    validation: { nodeStable: 'WARNING', trafficNormal: 'NOMINAL', tempNormal: 'CRITICAL', state: 'VALIDATING' },
    slaBreachProb: '4.80%',
    multiCluster: { A: 'HEALTHY', B: 'WARNING', C: 'HEALTHY' },
    mlDecision: {
      action: 'reduce_priority',
      reason: 'Db-Cluster-08 thermal threshold exceeded (88.5°C).',
      confidence: 0.89,
      feature: 'temp',
      threshold: 80.0,
      value: 88.5
    },
    mlForecast: {
      resource: 'TEMP',
      risk: 34,
      timeToThreshold: '4.2 mins',
      predictedCpu: 78.4,
      predictedMemory: 82.8
    },
    mlExplainability: {
      summary: 'Thermal overload on Db-Cluster-08. Baseline deviation is +24.5% due to hardware cooling fan restriction.',
      whyNow: 'Database temp exceeds policy threshold (80°C).',
      modelPrediction: 1,
      featureContributions: [
        { feature: 'temp', value: 88.5, overflow: 8.5, weight: 0.68 },
        { feature: 'cpu', value: 68.4, overflow: 0.0, weight: 0.24 },
        { feature: 'memory', value: 72.8, overflow: 0.0, weight: 0.18 }
      ]
    }
  },
  {
    name: 'CASCADE PREDICTED',
    badgeClass: 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-glowRed animate-pulse',
    title: 'Failure Propagation Predicted',
    riskScore: 82,
    aiConfidence: 94.6,
    threatLevel: 'Critical',
    failureWindow: '1.8 mins',
    health: 92.15,
    activeNodes: 12,
    anomalies: 3,
    threats: 2,
    lossPrevented: 420.4,
    cpu: 91.5,
    gpu: 94.2,
    memory: 89.3,
    latency: 320,
    packetLoss: 8.42,
    power: 19.8,
    stabilization: 0,
    nodesSaved: 9,
    workflowStep: 'Isolate',
    workflowActiveIndex: 2,
    workflowCompletedIndices: [0, 1],
    logs: [
      'CRITICAL: DB latency surge to 320ms propagating traffic backlog to Load-Balancer-05.',
      'AI COMMAND: Automated incident protocol triggered. Risk threshold exceeded (>75%).',
      'BLAST RADIUS: Identified origin Node 08 infecting active nodes 04 and 05. Financial cost: $12,400/min.'
    ],
    nodeStates: { 8: 'critical', 4: 'warning', 5: 'warning', 11: 'healthy' },
    rca: { cause: 'GPU Thermal Spike & API Throttling', confidence: 96, affected: 3, time: '1.8 Minutes' },
    brain: { action: 'Isolating Node-08', next: 'Rerouting user traffic to spare spare Node-11', reasoning: 'SHAP Value cascade warning: database query backup propagating to Load-Balancer-05. Random Forest model predicts high risk of SLA failure.', confidence: 97.2 },
    costImpact: { potential: 420, recovered: 120, downtime: 1.2, saved: 75 },
    twin: { current: 82, predicted: 98, diff: 16 },
    xai: {
      metrics: [
        { label: 'GPU Temp Core-08', value: '94°C', change: '▲ 51%', impact: '+42.8%', isDanger: true },
        { label: 'Network Packet Loss', value: '8.42%', change: '▲ 840%', impact: '+28.4%', isDanger: true },
        { label: 'System Power Draw', value: '19.8 kW', change: '▲ 40%', impact: '+10.8%', isDanger: true }
      ],
      totalIncrease: '+82.0%'
    },
    riskConfidence: { thermal: 94, network: 82, power: 75, memory: 52 },
    dependencyImpact: ['Db-Cluster-08', 'Load-Balancer-05', 'Api-Broker-04'],
    blastRadiusForecast: { current: 3, min2: 5, min5: 9 },
    recommendations: [
      { action: 'Execute Workload Migration', priority: 'CRITICAL', successRate: 97, status: 'SELECTED' },
      { action: 'Isolate Db-Cluster-08 Fabric', priority: 'CRITICAL', successRate: 98, status: 'SELECTED' },
      { action: 'Reroute active broker links', priority: 'CRITICAL', successRate: 95, status: 'SELECTED' }
    ],
    validation: { nodeStable: 'CRITICAL', trafficNormal: 'WARNING', tempNormal: 'CRITICAL', state: 'VALIDATING' },
    slaBreachProb: '48.20%',
    multiCluster: { A: 'HEALTHY', B: 'CRITICAL', C: 'HEALTHY' },
    mlDecision: {
      action: 'workload_migration',
      reason: 'Critical temperature surge (94.2°C) causing database query latency spikes propagating to load balancer.',
      confidence: 0.96,
      feature: 'temp',
      threshold: 80.0,
      value: 94.2
    },
    mlForecast: {
      resource: 'TEMP',
      risk: 82,
      timeToThreshold: '1.8 mins',
      predictedCpu: 95.5,
      predictedMemory: 91.8
    },
    mlExplainability: {
      summary: 'Severe query backlog at Node-08 cascading to Node-05 and Node-04. Immediate isolation is advised.',
      whyNow: 'Multi-node network saturation cascading from DB node core temperatures.',
      modelPrediction: 1,
      featureContributions: [
        { feature: 'temp', value: 94.2, overflow: 14.2, weight: 0.94 },
        { feature: 'network', value: 8.42, overflow: 6.42, weight: 0.82 },
        { feature: 'cpu', value: 91.5, overflow: 11.5, weight: 0.75 }
      ]
    }
  },
  {
    name: 'SELF-HEALING ACTIVE',
    badgeClass: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 shadow-glowCyan',
    title: 'Remediation Sequence In Progress',
    riskScore: 48,
    aiConfidence: 91.1,
    threatLevel: 'Mitigating',
    failureWindow: '0.4 mins',
    health: 94.85,
    activeNodes: 12,
    anomalies: 2,
    threats: 1,
    lossPrevented: 458.2,
    cpu: 72.1,
    gpu: 71.5,
    memory: 64.9,
    latency: 105,
    packetLoss: 2.11,
    power: 18.1,
    stabilization: 45,
    nodesSaved: 10,
    workflowStep: 'Recover',
    workflowActiveIndex: 3,
    workflowCompletedIndices: [0, 1, 2],
    logs: [
      'REMEDIATION: Triggered automatic Workload Migration from Db-Cluster-08.',
      'REMEDIATION: Activating Standby-Spare-11 as alternative primary replica.',
      'REMEDIATION: Rerouting Api-Broker-04 traffic pathways away from Db-Cluster-08. Path isolated.',
      'REMEDIATION: Triggering dynamic auxiliary cooling surge to Db-Cluster-08 server bank.'
    ],
    nodeStates: { 8: 'isolated', 4: 'healthy', 5: 'healthy', 11: 'active' },
    rca: { cause: 'GPU Thermal Spike (Mitigated)', confidence: 96, affected: 1, time: 'N/A' },
    brain: { action: 'Workload Migration Active', next: 'Validate Stabilization', reasoning: 'AI Directive: Workload migration active. Random Forest health status: REMEDIATING. Isolation Forest score returning to baseline.', confidence: 94.8 },
    costImpact: { potential: 420, recovered: 350, downtime: 2.8, saved: 85 },
    twin: { current: 48, predicted: 12, diff: 36 },
    xai: {
      metrics: [
        { label: 'GPU Temp Core-08', value: '71°C', change: '▼ 23%', impact: '+12.5%', isDanger: false },
        { label: 'Network Packet Loss', value: '2.11%', change: '▼ 6.3%', impact: '+4.8%', isDanger: false },
        { label: 'System Power Draw', value: '18.1 kW', change: '▼ 8%', impact: '+6.1%', isDanger: false }
      ],
      totalIncrease: '+23.4%'
    },
    riskConfidence: { thermal: 48, network: 32, power: 51, memory: 28 },
    dependencyImpact: ['Db-Cluster-08 (Isolated)'],
    blastRadiusForecast: { current: 1, min2: 1, min5: 0 },
    recommendations: [
      { action: 'Sync Core Node replica', priority: 'CRITICAL', successRate: 98, status: 'EXECUTED' },
      { action: 'Channel cooling surge', priority: 'HIGH', successRate: 95, status: 'EXECUTED' }
    ],
    validation: { nodeStable: 'NOMINAL', trafficNormal: 'NOMINAL', tempNormal: 'NOMINAL', state: 'VERIFIED' },
    slaBreachProb: '8.40%',
    multiCluster: { A: 'HEALTHY', B: 'WARNING', C: 'HEALTHY' },
    mlDecision: {
      action: 'workload_migration',
      reason: 'Executing automated workload migration from Node-08 to Standby-Spare-11.',
      confidence: 0.94,
      feature: 'temp',
      threshold: 80.0,
      value: 71.5
    },
    mlForecast: {
      resource: 'TEMP',
      risk: 48,
      timeToThreshold: '0.4 mins',
      predictedCpu: 75.2,
      predictedMemory: 68.9
    },
    mlExplainability: {
      summary: 'Active replication sync to Standby-Spare-11 is 85% completed. Dynamic fan overdrive surge cooling is active.',
      whyNow: 'Active mitigation processes underway.',
      modelPrediction: 1,
      featureContributions: [
        { feature: 'temp', value: 71.5, overflow: 0.0, weight: 0.48 },
        { feature: 'network', value: 2.11, overflow: 0.11, weight: 0.32 },
        { feature: 'memory', value: 64.9, overflow: 0.0, weight: 0.28 }
      ]
    }
  },
  {
    name: 'SYSTEM RECOVERING',
    badgeClass: 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 animate-pulse',
    title: 'Stabilizing Network Fabric',
    riskScore: 12,
    aiConfidence: 96.5,
    threatLevel: 'Low',
    failureWindow: 'N/A',
    health: 98.92,
    activeNodes: 12,
    anomalies: 0,
    threats: 0,
    lossPrevented: 478.6,
    cpu: 48.7,
    gpu: 60.1,
    memory: 52.8,
    latency: 35,
    packetLoss: 0.05,
    power: 14.9,
    stabilization: 85,
    nodesSaved: 12,
    workflowStep: 'Validate',
    workflowActiveIndex: 4,
    workflowCompletedIndices: [0, 1, 2, 3],
    logs: [
      'INTEGRITY CHECK: Workload successfully migrated. Integrity score: 100%.',
      'RECOVERY: Standby-Spare-11 fully synchronized. Servicing 100% active read queries.',
      'COOL DOWN: Host Db-Cluster-08 temperature dropped to 62°C. Recovering host.',
      'VALIDATION: Packet loss stabilized below SLA margin. Testing core node links.'
    ],
    nodeStates: { 8: 'cooling', 4: 'healthy', 5: 'healthy', 11: 'healthy' },
    rca: { cause: 'N/A (Resolved)', confidence: 98, affected: 0, time: 'N/A' },
    brain: { action: 'Verifying Integrity Checks', next: 'Nominal Scan Cycle', reasoning: 'AI Validation: Telemetry streams successfully stabilized. Random Forest verification: 100% healthy.', confidence: 98.1 },
    costImpact: { potential: 420, recovered: 415, downtime: 3.7, saved: 92 },
    twin: { current: 12, predicted: 2, diff: 10 },
    xai: {
      metrics: [
        { label: 'GPU Temp Core-08', value: '60°C', change: '▼ 34%', impact: '+0.8%', isDanger: false },
        { label: 'Network Packet Loss', value: '0.05%', change: '▼ 8.3%', impact: '+0.1%', isDanger: false },
        { label: 'System Power Draw', value: '14.9 kW', change: '▼ 25%', impact: '+0.4%', isDanger: false }
      ],
      totalIncrease: '+1.3%'
    },
    riskConfidence: { thermal: 18, network: 12, power: 15, memory: 8 },
    dependencyImpact: ['None'],
    blastRadiusForecast: { current: 0, min2: 0, min5: 0 },
    recommendations: [
      { action: 'Audit replica sync speeds', priority: 'Medium', successRate: 98, status: 'EXECUTED' }
    ],
    validation: { nodeStable: 'NOMINAL', trafficNormal: 'NOMINAL', tempNormal: 'NOMINAL', state: 'VERIFIED' },
    slaBreachProb: '0.45%',
    multiCluster: { A: 'HEALTHY', B: 'HEALTHY', C: 'HEALTHY' },
    mlDecision: {
      action: 'observe',
      reason: 'Self-healing successfully completed. Node-08 thermal recovery complete.',
      confidence: 0.98,
      feature: 'none',
      threshold: null,
      value: null
    },
    mlForecast: {
      resource: 'TEMP',
      risk: 12,
      timeToThreshold: 'N/A',
      predictedCpu: 50.5,
      predictedMemory: 53.0
    },
    mlExplainability: {
      summary: 'Incident fully mitigated. Core temperature is dropping, and user traffic has stabilized.',
      whyNow: 'All enclaves return metrics within nominal thresholds.',
      modelPrediction: 0,
      featureContributions: [
        { feature: 'temp', value: 60.1, overflow: 0.0, weight: 0.18 },
        { feature: 'network', value: 0.05, overflow: 0.0, weight: 0.12 },
        { feature: 'cpu', value: 48.7, overflow: 0.0, weight: 0.15 }
      ]
    }
  },
  {
    name: 'SYSTEM RECOVERED',
    badgeClass: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-glowGreen',
    title: 'Mission Complete. Core Nominal',
    riskScore: 2,
    aiConfidence: 99.4,
    threatLevel: 'Minimal',
    failureWindow: 'N/A',
    health: 100.00,
    activeNodes: 12,
    anomalies: 0,
    threats: 0,
    lossPrevented: 478.6,
    cpu: 40.5,
    gpu: 52.3,
    memory: 49.8,
    latency: 22,
    packetLoss: 0.00,
    power: 13.6,
    stabilization: 100,
    nodesSaved: 12,
    workflowStep: 'Complete',
    workflowActiveIndex: 5,
    workflowCompletedIndices: [0, 1, 2, 3, 4, 5],
    logs: [
      'AUDIT: Autonomous self-healing sequence fully completed.',
      'METRICS: Total system recovery achieved in 28 seconds. SLA violations avoided: 1.',
      'AUDIT: Re-entering high-alert autonomous threat scanning. System stable.'
    ],
    nodeStates: { 8: 'healthy', 4: 'healthy', 5: 'healthy', 11: 'healthy' },
    rca: { cause: 'N/A (Resolved)', confidence: 99, affected: 0, time: 'N/A' },
    brain: { action: 'Re-entering Nominal SCAN State', next: 'Analyze Logs', reasoning: 'Self-healing loop complete. Re-entering high-alert autonomous threat scanning.', confidence: 99.4 },
    costImpact: { potential: 420, recovered: 415, downtime: 3.7, saved: 92 },
    twin: { current: 2, predicted: 2, diff: 0 },
    xai: {
      metrics: [
        { label: 'GPU Temp Core-08', value: '52°C', change: '▼ 42%', impact: '+0.1%', isDanger: false },
        { label: 'Network Packet Loss', value: '0.00%', change: '▼ 100%', impact: '+0.0%', isDanger: false },
        { label: 'System Power Draw', value: '13.6 kW', change: '▼ 31%', impact: '+0.1%', isDanger: false }
      ],
      totalIncrease: '+0.2%'
    },
    riskConfidence: { thermal: 4, network: 2, power: 5, memory: 1 },
    dependencyImpact: ['None'],
    blastRadiusForecast: { current: 0, min2: 0, min5: 0 },
    recommendations: [],
    validation: { nodeStable: 'NOMINAL', trafficNormal: 'NOMINAL', tempNormal: 'NOMINAL', state: 'VERIFIED' },
    slaBreachProb: '0.02%',
    multiCluster: { A: 'HEALTHY', B: 'HEALTHY', C: 'HEALTHY' },
    mlDecision: {
      action: 'observe',
      reason: 'All enclaves nominal. Monitoring thread re-activated.',
      confidence: 0.99,
      feature: 'none',
      threshold: null,
      value: null
    },
    mlForecast: {
      resource: 'CPU',
      risk: 2,
      timeToThreshold: 'N/A',
      predictedCpu: 40.5,
      predictedMemory: 49.8
    },
    mlExplainability: {
      summary: 'Self-healing fully complete. Telemetry levels have returned to their historical baselines.',
      whyNow: 'All enclaves return metrics within nominal thresholds.',
      modelPrediction: 0,
      featureContributions: [
        { feature: 'temp', value: 52.3, overflow: 0.0, weight: 0.04 },
        { feature: 'network', value: 0.0, overflow: 0.0, weight: 0.02 },
        { feature: 'cpu', value: 40.5, overflow: 0.0, weight: 0.05 }
      ]
    }
  }
];

// Sparkline datasets (Pre-populated values to simulate chart streams)
const sparklineDataSets = {
  cpu: [40, 42, 45, 43, 45, 44, 48, 68, 91, 72, 48, 40],
  gpu: [60, 61, 62, 61, 62, 88, 94, 71, 60, 52, 52, 52],
  memory: [50, 51, 54, 53, 54, 72, 89, 64, 52, 49, 49, 49],
  latency: [22, 23, 24, 23, 24, 48, 320, 105, 35, 22, 22, 22],
  packetLoss: [0.01, 0.01, 0.01, 0.01, 0.01, 1.25, 8.42, 2.11, 0.05, 0.00, 0.00, 0.00],
  power: [13.8, 14.0, 14.2, 14.1, 14.2, 16.9, 19.8, 18.1, 14.9, 13.6, 13.6, 13.6]
};

// Historical risk trend tracking for central Timeline chart
let historyPoints = [
  { x: 0, risk: 4, load: 45 },
  { x: 10, risk: 5, load: 46 },
  { x: 20, risk: 4, load: 44 },
  { x: 30, risk: 6, load: 45 },
  { x: 40, risk: 5, load: 47 },
  { x: 50, risk: 4, load: 45 }
];

// Countdown failure time tracker variables
let predictionCountdownTime = 138; // 2 min 18s
let predictionCountdownInterval = null;

// Document Loaded Orchestrator
document.addEventListener('DOMContentLoaded', () => {
  runSafely(createFloatingParticles, 'particles');
  runSafely(initUI, 'ui-bindings');
  runSafely(initDelegatedControls, 'delegated-controls');
  runSafely(initializePageRoute, 'page-routing');
  bootstrapApplication().catch((error) => {
    console.warn('Bootstrap failed, staying in local UI mode:', error);
    runSafely(refreshLiveViews, 'fallback-refresh');
  });
  runSafely(startTickingClocks, 'clocks');
  runSafely(startPredictionCountdown, 'prediction-countdown');
});

function runSafely(fn, label) {
  try {
    return fn();
  } catch (error) {
    console.warn(`SYNAPSE-ARC ${label} failed:`, error);
    return null;
  }
}

function triggerInstantFeedback(buttonEl) {
  if (!buttonEl) return;
  if (window.SynapseCore) {
    window.SynapseCore.clearAllTimers();
    window.SynapseCore.isSimulationRunning = true;
  }

  if (!buttonEl.innerHTML.includes("INITIALIZING")) {
    buttonEl.dataset.originalHtml = buttonEl.innerHTML;
    buttonEl.dataset.originalClass = buttonEl.className;
  }

  buttonEl.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> INITIALIZING AI ENGINE...`;
  buttonEl.className = "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-red-600 text-white text-xs font-extrabold tracking-wider uppercase shadow-glow animate-pulse scale-95 opacity-90 transition-all duration-100";
  createIconsSafe();
}

document.addEventListener('DOMContentLoaded', () => {
    const API = (window.SYNAPSE_ARC_API_URL || 'http://' + window.location.hostname + ':8000').replace(/\/$/, '');

    async function postApi(path, body = {}) {
        try {
            const res = await fetch(API + path, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (err) {
            console.warn('API call failed:', path, err);
            return null;
        }
    }

    async function getApi(path) {
        try {
            const res = await fetch(API + path);
            return await res.json();
        } catch (err) {
            console.warn('API GET failed:', path, err);
            return null;
        }
    }

    function populateShapPanel(shap) {
        if (!shap) return;
        const featuresEl = document.getElementById('mlShapFeatures');
        const summaryEl = document.getElementById('mlShapSummary');
        if (summaryEl && shap.summary) summaryEl.innerText = shap.summary;
        if (featuresEl && shap.feature_contributions && shap.feature_contributions.length) {
            featuresEl.innerHTML = shap.feature_contributions.map(fc => {
                const pct = Math.min(100, Math.abs(fc.overflow || fc.weight || 0));
                const color = pct > 50 ? 'bg-red-500' : pct > 25 ? 'bg-amber-500' : 'bg-emerald-500';
                return '<div class="flex flex-col gap-1">' +
                    '<div class="flex justify-between text-[9px] text-slate-400 font-mono uppercase">' +
                    '<span>' + (fc.feature || 'unknown') + '</span>' +
                    '<span class="font-bold">' + (fc.overflow != null ? '+' + fc.overflow : (fc.weight || 0)) + '</span>' +
                    '</div>' +
                    '<div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">' +
                    '<div class="' + color + ' h-full rounded-full transition-all duration-500" style="width:' + pct + '%"></div>' +
                    '</div></div>';
            }).join('');
        }
        if (shap.root_cause) {
            const reasonEl = document.getElementById('mlDecisionReason');
            if (reasonEl) reasonEl.innerText = shap.root_cause;
        }
    }

    function populateDecisionPanel(analysis) {
        if (!analysis) return;
        const decision = analysis.decision || {};
        const forecast = analysis.forecast || {};
        const anomaly = analysis.anomaly || {};
        safeUpdateById('mlDecisionAction', decision.action ? decision.action.toUpperCase() : 'OBSERVE');
        safeUpdateById('mlDecisionConfidence', decision.confidence ? Math.round(decision.confidence * 100) + '%' : '50%');
        safeUpdateById('mlForecastRisk', forecast.risk_score ? forecast.risk_score + '% risk' : '0% risk');
        safeUpdateById('mlForecastWindow', forecast.time_to_threshold || 'N/A');
        var riskVal = anomaly.score ? Math.round(anomaly.score * 100) : 4;
        var riskTextEl = document.getElementById('aiRiskScoreText');
        if (riskTextEl) riskTextEl.innerHTML = '<span id="aiRiskScoreVal" data-current="' + riskVal + '">' + riskVal + '%</span>';
    }

    function safeUpdateById(id, text) {
        var el = document.getElementById(id);
        if (el) el.innerText = text;
    }

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const btnId = btn.id || '';
        const btnText = btn.innerText || '';

        // ============================================================
        // CONTROL PANEL BUTTON DISPATCHER — OPERATOR-DRIVEN PIPELINE
        // ============================================================

        // ── HELPER: Populate all monitoring panels from a backend result ──
        function populateAllPanels(result, mode) {
            const analysis = result.analysis || result || {};
            const anomaly  = result.anomaly || analysis.anomaly || {};
            const decision = analysis.decision || result.decision || {};
            const forecast = analysis.forecast || result.forecast || {};
            const snap     = result.snapshot   || result.payload  || {};
            const expl     = analysis.explainability || {};

            // ── Risk score gauge ──
            const rawScore = anomaly.score != null ? anomaly.score : (forecast.forecast_risk || 0.04);
            const riskPct  = Math.round(rawScore * 100);
            const riskEl   = document.getElementById('aiRiskScoreVal');
            if (riskEl) {
                riskEl.textContent = riskPct + '%';
                riskEl.setAttribute('data-current', riskPct);
            }
            // Animate the radial gauge ring
            const ring = document.getElementById('aiRadialProgressCircle');
            if (ring) {
                const circ = 2 * Math.PI * 54;
                const dash = circ * (1 - Math.min(1, riskPct / 100));
                ring.setAttribute('stroke-dasharray', circ.toFixed(2));
                ring.setAttribute('stroke-dashoffset', dash.toFixed(2));
                ring.setAttribute('stroke', riskPct > 70 ? '#EF4444' : riskPct > 40 ? '#F59E0B' : '#10B981');
            }

            // ── Threat level ──
            const threat = anomaly.severity || (riskPct > 70 ? 'critical' : riskPct > 40 ? 'high' : 'minimal');
            safeUpdateById('aiThreatLevelVal', threat.charAt(0).toUpperCase() + threat.slice(1));
            const threatEl = document.getElementById('aiThreatLevelVal');
            if (threatEl) {
                threatEl.className = 'text-sm font-bold mt-1 ' + (riskPct > 70 ? 'text-red-500' : riskPct > 40 ? 'text-amber-500' : 'text-emerald-500');
            }

            // ── ML Decision panel ──
            safeUpdateById('mlDecisionAction',     (decision.action || 'observe').toUpperCase());
            safeUpdateById('mlDecisionConfidence', decision.confidence ? Math.round(decision.confidence * 100) + '%' : (riskPct > 50 ? '87%' : '50%'));
            safeUpdateById('mlForecastRisk',       (Math.round((forecast.forecast_risk || 0) * 100)) + '% risk');
            safeUpdateById('mlForecastWindow',     forecast.time_to_threshold || 'N/A');
            const reasonEl = document.getElementById('mlDecisionReason');
            if (reasonEl) reasonEl.innerText = decision.reason || expl.why_now || 'Awaiting backend analysis.';

            // ── SHAP / Feature contributions ──
            const contribs = expl.feature_contributions || [];
            const shapFeats = document.getElementById('mlShapFeatures');
            if (shapFeats && contribs.length) {
                shapFeats.innerHTML = contribs.slice(0, 5).map(fc => {
                    const pct   = Math.min(100, Math.round(Math.abs((fc.overflow || 0) / Math.max(1, fc.threshold || 1) * 100)));
                    const color = pct > 60 ? 'bg-red-500' : pct > 30 ? 'bg-amber-500' : 'bg-emerald-500';
                    return `<div class="flex flex-col gap-1">
                        <div class="flex justify-between text-[9px] text-slate-400 font-mono uppercase">
                            <span>${fc.feature || 'unknown'}</span>
                            <span class="font-bold">${fc.value != null ? fc.value.toFixed(1) : 'N/A'} (overflow: ${(fc.overflow||0).toFixed(1)})</span>
                        </div>
                        <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div class="${color} h-full rounded-full transition-all duration-700" style="width:${pct}%"></div>
                        </div></div>`;
                }).join('');
            }
            const shapSumEl = document.getElementById('mlShapSummary');
            if (shapSumEl && expl.summary) shapSumEl.innerText = expl.summary;

            // ── RCA panel ──
            safeUpdateById('rcaCauseVal',      decision.feature ? decision.feature.toUpperCase() + ' pressure' : (anomaly.reason || 'N/A'));
            safeUpdateById('rcaConfidenceVal', decision.confidence ? Math.round(decision.confidence * 100) + '%' : (riskPct > 50 ? '87%' : '0%'));
            safeUpdateById('rcaAffectedVal',   anomaly.anomaly ? '1 System' : '0 Systems');
            safeUpdateById('rcaTimeVal',       forecast.time_to_threshold || 'N/A');

            // ── Telemetry gauges ──
            if (snap.cpu != null) {
                const cpuPct = Math.round(snap.cpu);
                safeUpdateById('insCpuText', cpuPct + '%');
                const cpuBar = document.getElementById('insCpuBar');
                if (cpuBar) cpuBar.style.width = cpuPct + '%';
                const telCpu = document.getElementById('telCpu');
                if (telCpu) { telCpu.textContent = cpuPct + '%'; telCpu.setAttribute('data-current', cpuPct); }
                const telCpuBar = document.getElementById('telCpuBar');
                if (telCpuBar) telCpuBar.style.width = cpuPct + '%';
            }
            if (snap.memory != null) {
                const memPct = Math.round(snap.memory);
                safeUpdateById('insRamText', memPct + '%');
                const ramBar = document.getElementById('insRamBar');
                if (ramBar) ramBar.style.width = memPct + '%';
                const telMem = document.getElementById('telMem');
                if (telMem) { telMem.textContent = memPct + '%'; telMem.setAttribute('data-current', memPct); }
                const telMemBar = document.getElementById('telMemBar');
                if (telMemBar) telMemBar.style.width = memPct + '%';
            }
            if (snap.temp != null) {
                safeUpdateById('insTempText', snap.temp + '°C');
                const tempBar = document.getElementById('insTempBar');
                if (tempBar) tempBar.style.width = Math.min(100, Math.round(snap.temp)) + '%';
                safeUpdateText('.gpu-temp-val', snap.temp + '°C');
            }

            // ── Digital twin bars ──
            const twinCurrent   = riskPct;
            const twinPredicted = Math.min(100, riskPct + 10);
            safeUpdateById('twinCurrentText',   twinCurrent + '% Risk');
            safeUpdateById('twinPredictedText', twinPredicted + '% Risk');
            const twinCurBar = document.getElementById('twinCurrentBar');
            if (twinCurBar) { twinCurBar.style.width = twinCurrent + '%'; twinCurBar.className = 'h-full rounded-full transition-all duration-700 ' + (riskPct > 70 ? 'bg-red-500' : riskPct > 40 ? 'bg-amber-500' : 'bg-emerald-500'); }
            const twinPreBar = document.getElementById('twinPredictedBar');
            if (twinPreBar) twinPreBar.style.width = twinPredicted + '%';
            safeUpdateById('twinDiffText', '▲ ' + (twinPredicted - twinCurrent) + '% Divergence');

            // ── Risk category breakdown bars ──
            const contributions = expl.feature_contributions || [];
            const getOverflow = (feat) => { const f = contributions.find(c => c.feature === feat); return f ? Math.min(100, Math.round(f.overflow || 0)) : 0; };
            const tempOver = getOverflow('temp');   safeUpdateById('confThermalVal',  tempOver + '%');  document.getElementById('confThermalBar')?.style.setProperty('width', tempOver + '%');
            const netOver  = getOverflow('network'); safeUpdateById('confNetworkVal', netOver + '%');   document.getElementById('confNetworkBar')?.style.setProperty('width', netOver + '%');
            const diskOver = getOverflow('disk');   safeUpdateById('confPowerVal',    diskOver + '%');  document.getElementById('confPowerBar')?.style.setProperty('width', diskOver + '%');
            const memOver  = getOverflow('memory'); safeUpdateById('confMemoryVal',   memOver + '%');   document.getElementById('confMemoryBar')?.style.setProperty('width', memOver + '%');

            // ── Brain card ──
            safeUpdateById('brainActionVal', (decision.action || 'observe').replace(/_/g, ' ').toUpperCase());
            safeUpdateById('brainReasoningVal', expl.summary || decision.reason || 'Awaiting analysis.');
            safeUpdateById('brainConfidenceVal', decision.confidence ? Math.round(decision.confidence * 100) + '%' : '50%');

            // ── Node status indicator on map ──
            const nodeEl = document.getElementById('node-db-cluster');
            if (nodeEl) {
                if (anomaly.anomaly) {
                    nodeEl.setAttribute('fill', riskPct > 70 ? '#EF4444' : '#F59E0B');
                    nodeEl.setAttribute('stroke', riskPct > 70 ? '#EF4444' : '#F59E0B');
                } else {
                    nodeEl.setAttribute('fill', '#0F172A');
                    nodeEl.setAttribute('stroke', '#00F0FF');
                }
            }
            safeUpdateById('insStatus', anomaly.anomaly ? (riskPct > 70 ? 'CRITICAL' : 'WARNING') : 'HEALTHY');
            const insStatusEl = document.getElementById('insStatus');
            if (insStatusEl) insStatusEl.className = 'text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider ' + (anomaly.anomaly ? (riskPct > 70 ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20') : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20');

            // ── Blast radius forecast ──
            const blastNodes = anomaly.anomaly ? (riskPct > 70 ? 3 : 1) : 0;
            safeUpdateById('forecastCurrent', blastNodes + ' Node' + (blastNodes !== 1 ? 's' : ''));
            safeUpdateById('forecastMin2',    (blastNodes + (anomaly.anomaly ? 2 : 0)) + ' Nodes');
            safeUpdateById('forecastMin5',    (blastNodes + (anomaly.anomaly ? 5 : 0)) + ' Nodes');

            // ── AI Confidence ──
            const aiConf = anomaly.anomaly ? 94.5 : 98.7;
            safeUpdateById('aiConfidenceVal', aiConf.toFixed(2) + '%');
            const aiConfEl = document.getElementById('aiConfidenceVal');
            if (aiConfEl) aiConfEl.setAttribute('data-current', aiConf);
        }

        // ── HELPER: Animate pipeline steps (just lights up dots, no log spam) ──
        function animatePipelineSteps(steps) {
            const dots = document.querySelectorAll('.pipeline-step-dot');
            if (!steps || !steps.length) return;
            // Only light up NEW steps (don't reset already-lit ones)
            steps.forEach((stepIdx, i) => {
                setTimeout(() => {
                    const dot = dots[stepIdx];
                    if (!dot) return;
                    dot.classList.remove('bg-primary/10', 'text-primary', 'bg-amber-500');
                    dot.classList.add('bg-emerald-500', 'text-white');
                }, i * 800);
            });
        }

        // Reset all pipeline dots to idle state
        function resetPipelineDots() {
            document.querySelectorAll('.pipeline-step-dot').forEach(d => {
                d.classList.remove('bg-emerald-500', 'bg-red-500', 'bg-amber-500', 'text-white');
                d.classList.add('bg-primary/10', 'text-primary');
            });
        }

        // ── HELPER: Populate SHAP panel from /shap endpoint ──
        async function fetchAndPopulateShap() {
            var shapData = await getApi('/shap');
            if (shapData && shapData.shap) {
                populateShapPanel(shapData.shap);
                return shapData.shap;
            }
            return null;
        }

        // ── 0. RUN SIMULATION ──
        if (btnId === 'btnStartSimMonitor' || btnText.includes('RUN SIMULATION')) {
            appendLogToFeed('SUCCESS', '▶ Simulation started — collecting 30 rows of live system metrics...');
            safeUpdateById('mlDecisionAction', 'COLLECTING...');
            safeUpdateById('mlShapSummary', 'Collecting baseline system data...');

            var simResult = await postApi('/simulate/run', {});
            if (simResult) {
                appendLogToFeed('SUCCESS', `✔ Collected ${simResult.rows_collected || 0} rows → datasets/generated/system_metrics.csv`);
                appendLogToFeed('SUCCESS', `✔ ML model ${simResult.ml_trained ? 'trained successfully on live data' : 'training skipped (insufficient rows)'}`);
                if (simResult.snapshot) {
                    const s = simResult.snapshot;
                    safeUpdateById('insCpuText', Math.round(s.cpu || 0) + '%');
                    safeUpdateById('insRamText', Math.round(s.memory || 0) + '%');
                    safeUpdateById('insTempText', (s.temp || 0) + '°C');
                    const telCpu = document.getElementById('telCpu'); if (telCpu) telCpu.textContent = Math.round(s.cpu || 0) + '%';
                    const telMem = document.getElementById('telMem'); if (telMem) telMem.textContent = Math.round(s.memory || 0) + '%';
                }
                safeUpdateById('mlDecisionAction', 'BASELINE TRAINED');
                safeUpdateById('mlShapSummary', `Baseline captured: ${simResult.rows_collected} rows. CPU, Memory, Disk, Network distributions learned. Ready for anomaly detection.`);
            } else {
                appendLogToFeed('WARNING', '⚠ Backend unreachable — simulation failed.');
            }
        }

        // ── 1. SPARK ANOMALY ──
        if (btnId === 'floatTriggerAnomaly' || btnText.includes('SPARK ANOMALY')) {
            appendLogToFeed('CRITICAL', '🔴 SPARK ANOMALY initiated — injecting critical resource pressure...');
            resetPipelineDots();
            animatePipelineSteps([0]); // DETECT lights up

            var sparkResult = await postApi('/spark/run', { limit: 25 });
            if (sparkResult) {
                const rowsProcessed = sparkResult.spark ? sparkResult.spark.processed_rows : 0;
                appendLogToFeed('WARNING', `Spark engine processed ${rowsProcessed} rows → ANOMALY DETECTED`);
                appendLogToFeed('CRITICAL', `Status: ${sparkResult.status.toUpperCase()} | ML Model re-trained on injected data`);

                populateAllPanels(sparkResult, 'spark');
                animatePipelineSteps([1]); // ANALYZE lights up (DETECT already lit)

                // Fetch SHAP explanation
                var shap = await fetchAndPopulateShap();
                if (shap) appendLogToFeed('SUCCESS', `SHAP root cause: ${shap.root_cause || 'Analysis complete'}`);

                // After 3s → self-heal
                setTimeout(async () => {
                    appendLogToFeed('WARNING', '[AI OVERRIDE] Engaging autonomous self-healing protocol...');
                    animatePipelineSteps([2, 3]); // ISOLATE + RECOVER

                    var healResult = await postApi('/heal', { failure_type: 'resource_pressure' });
                    if (healResult) {
                        appendLogToFeed('SUCCESS', `Self-healing complete → Action: ${healResult.action} | Status: ${healResult.status}`);
                        if (healResult.recovery_events) {
                            healResult.recovery_events.forEach(ev =>
                                appendLogToFeed('SUCCESS', `[${ev.step.toUpperCase()}] ${ev.message} — ${ev.status}`)
                            );
                        }

                        // Validate + complete
                        setTimeout(() => {
                            animatePipelineSteps([4, 5]); // VALIDATE + COMPLETE
                            appendLogToFeed('SUCCESS', '✅ Self-healing COMPLETE — system stabilizing');
                            const nodeEl = document.getElementById('node-db-cluster');
                            if (nodeEl) { nodeEl.setAttribute('fill', '#0F172A'); nodeEl.setAttribute('stroke', '#00F0FF'); }
                            safeUpdateById('insStatus', 'RECOVERING');
                            safeUpdateById('brainActionVal', 'STABILIZING');
                            safeUpdateById('brainNextVal', 'Validate Recovery');
                        }, 2500);
                    }
                }, 3000);

            } else {
                appendLogToFeed('WARNING', '⚠ Backend unreachable — run RUN SIMULATION first to collect data.');
            }
        }

        // ── 2. LOAD CASCADE ──
        if (btnId === 'floatTriggerCascade' || btnText.includes('LOAD CASCADE')) {
            appendLogToFeed('CRITICAL', '🔴 CASCADE FAILURE loading — triggering multi-node cascade...');
            resetPipelineDots();
            animatePipelineSteps([0]);

            var cascadeResult = await postApi('/simulate/anomaly', { failure_type: 'resource_pressure' });
            if (cascadeResult) {
                const snap2 = cascadeResult.payload || cascadeResult.snapshot || {};
                appendLogToFeed('CRITICAL', `Cascade injected. Host: ${snap2.host || 'unknown'} | CPU: ${Math.round(snap2.cpu || 0)}% | MEM: ${Math.round(snap2.memory || 0)}%`);
                appendLogToFeed('CRITICAL', `Root cause: Cascade Failure — Unauthorized Background Process (Context Mismatch)`);

                populateAllPanels(cascadeResult, 'cascade');
                safeUpdateById('rcaCauseVal', 'Multi-Node Cascade Failure');
                animatePipelineSteps([1]);

                var shap2 = await fetchAndPopulateShap();
                if (shap2) appendLogToFeed('SUCCESS', `SHAP explainability: ${shap2.root_cause || 'Analysis complete'}`);

                setTimeout(async () => {
                    appendLogToFeed('WARNING', '[AI OVERRIDE] No human remediation detected. Engaging self-healing...');
                    animatePipelineSteps([2, 3]);

                    var healResult2 = await postApi('/heal', { failure_type: 'resource_pressure' });
                    if (healResult2) {
                        appendLogToFeed('SUCCESS', `Cascade recovery → Action: ${healResult2.action} | Status: ${healResult2.status}`);
                        if (healResult2.recovery_events) {
                            healResult2.recovery_events.forEach(ev =>
                                appendLogToFeed('SUCCESS', `[${ev.step.toUpperCase()}] ${ev.message} — ${ev.status}`)
                            );
                        }
                        setTimeout(() => {
                            animatePipelineSteps([4, 5]);
                            appendLogToFeed('SUCCESS', '✅ CASCADE RECOVERY COMPLETE — re-routing traffic to healthy nodes');
                            const nodeEl2 = document.getElementById('node-db-cluster');
                            if (nodeEl2) { nodeEl2.setAttribute('fill', '#0F172A'); nodeEl2.setAttribute('stroke', '#10B981'); }
                            safeUpdateById('insStatus', 'RECOVERING');
                        }, 2500);
                    }
                }, 5000);

            } else {
                appendLogToFeed('WARNING', '⚠ Backend unreachable for cascade. Run RUN SIMULATION first.');
            }
        }

        // ── 3. AUTO RECOVERY ──
        if (btnId === 'floatTriggerRecovery' || btnText.includes('AUTO RECOVERY')) {
            appendLogToFeed('WARNING', '🔧 AUTO RECOVERY initiated — running self-healing protocol...');
            resetPipelineDots();
            animatePipelineSteps([0, 1, 2]);

            var healResult3 = await postApi('/heal', { failure_type: 'service_crash' });
            if (healResult3) {
                appendLogToFeed('SUCCESS', `Recovery action: ${healResult3.action} | Result: ${healResult3.status}`);
                if (healResult3.recovery_events) {
                    healResult3.recovery_events.forEach(ev =>
                        appendLogToFeed('SUCCESS', `[${ev.step.toUpperCase()}] ${ev.message} — ${ev.status}`)
                    );
                }
                setTimeout(() => {
                    animatePipelineSteps([3, 4, 5]);
                    const nodeEl3 = document.getElementById('node-db-cluster');
                    if (nodeEl3) { nodeEl3.setAttribute('fill', '#0F172A'); nodeEl3.setAttribute('stroke', '#00F0FF'); }
                    safeUpdateById('insStatus', 'HEALTHY');
                    safeUpdateById('brainActionVal', 'MONITORING');
                    safeUpdateById('brainNextVal', 'Analyze Trends');
                    safeUpdateById('brainReasoningVal', 'System recovered. Re-entering autonomous monitoring cycle.');
                    const riskEl2 = document.getElementById('aiRiskScoreVal');
                    if (riskEl2) { riskEl2.textContent = '6%'; riskEl2.setAttribute('data-current', 6); }
                    appendLogToFeed('SUCCESS', '✅ System fully recovered and stabilized.');
                }, 6500);
            } else {
                appendLogToFeed('WARNING', '⚠ Backend unreachable. Running UI-only recovery animation.');
                runSafeHealingSequence();
            }
        }

        // ── 4. RESET CLUSTER ──
        if (btnId === 'floatTriggerReset' || btnText.includes('RESET CLUSTER')) {
            appendLogToFeed('SUCCESS', '🔄 Resetting cluster — clearing all anomaly records...');
            await postApi('/reset', {});

            // Reset all UI panels to idle state
            safeUpdateById('mlDecisionAction', 'OBSERVE');
            safeUpdateById('mlDecisionConfidence', '50%');
            safeUpdateById('mlForecastRisk', '0% risk');
            safeUpdateById('mlForecastWindow', 'N/A');
            safeUpdateById('mlDecisionReason', 'Waiting for backend decision output.');
            safeUpdateById('mlShapSummary', 'Backend explainability summary will appear here.');
            safeUpdateById('rcaCauseVal', 'N/A');
            safeUpdateById('rcaConfidenceVal', '0%');
            safeUpdateById('rcaAffectedVal', '0 Systems');
            safeUpdateById('rcaTimeVal', 'N/A');
            safeUpdateById('insStatus', 'HEALTHY');
            safeUpdateById('brainActionVal', 'Scanning Telemetry');
            safeUpdateById('brainNextVal', 'Analyze Trends');
            safeUpdateById('brainReasoningVal', 'Continuous background monitoring for thermal and network drifts.');
            safeUpdateById('aiThreatLevelVal', 'Minimal');
            safeUpdateById('aiConfidenceVal', '98.70%');
            safeUpdateById('forecastCurrent', '0 Nodes');
            safeUpdateById('forecastMin2', '0 Nodes');
            safeUpdateById('forecastMin5', '0 Nodes');
            safeUpdateById('twinCurrentText', '4% Risk');
            safeUpdateById('twinPredictedText', '5% Risk');
            safeUpdateById('twinDiffText', '▲ 1% Divergence');

            var shapFeatures = document.getElementById('mlShapFeatures');
            if (shapFeatures) shapFeatures.innerHTML = '<span class="text-xs text-slate-500 font-medium">Waiting for explainability output.</span>';
            var riskTextEl2 = document.getElementById('aiRiskScoreVal');
            if (riskTextEl2) { riskTextEl2.textContent = '4%'; riskTextEl2.setAttribute('data-current', 4); }
            const ringReset = document.getElementById('aiRadialProgressCircle');
            if (ringReset) { const c = 2 * Math.PI * 54; ringReset.setAttribute('stroke-dasharray', c.toFixed(2)); ringReset.setAttribute('stroke-dashoffset', (c * 0.96).toFixed(2)); ringReset.setAttribute('stroke', '#10B981'); }
            const nodeElReset = document.getElementById('node-db-cluster');
            if (nodeElReset) { nodeElReset.setAttribute('fill', '#0F172A'); nodeElReset.setAttribute('stroke', '#00F0FF'); }

            var logFeed = document.querySelector('.live-alert-feed-container');
            if (logFeed) { while (logFeed.firstChild) logFeed.removeChild(logFeed.firstChild); }
            resetHealingSequenceUI();
            appendLogToFeed('SUCCESS', '✅ Cluster reset complete. All systems nominal. Ready for next simulation.');
        }
    });
});


// Safe text update by CSS selector
function safeUpdateText(selector, text) {
    var el = document.querySelector(selector);
    if (el) el.innerText = text;
}

// Append a styled table row to the Live Alert Center Feed
function appendLogToFeed(severity, msg) {
    var feed = document.querySelector('.live-alert-feed-container');
    if (!feed) return;
    var row = document.createElement('tr');
    var colorClass = severity === 'CRITICAL' ? 'text-red-500' : severity === 'WARNING' ? 'text-amber-500' : 'text-emerald-500';
    row.className = 'text-[11px] font-mono';
    row.innerHTML = '<td class="py-2.5 px-4 text-slate-400 whitespace-nowrap">' + new Date().toLocaleTimeString() + '</td><td class="py-2.5 px-4"><span class="px-2 py-0.5 rounded text-[9px] font-bold ' + colorClass + '">' + severity + '</span></td><td class="py-2.5 px-4 text-slate-300">' + msg + '</td>';
    feed.prepend(row);
}

// Animate the 6 pipeline step dots green one-by-one
function runSafeHealingSequence() {
    var steps = document.querySelectorAll('.pipeline-step-dot');
    if (!steps.length) return;
    var delay = 0;
    steps.forEach(function(step, index) {
        setTimeout(function() {
            step.classList.add('bg-emerald-500', 'text-white', 'shadow-glowGreen');
            step.classList.remove('bg-primary/10', 'text-primary');
            appendLogToFeed("SUCCESS", 'Pipeline Step ' + (index + 1) + '/6 completed successfully.');
        }, delay);
        delay += 1000;
    });
}

// Reset all pipeline dots back to default
function resetHealingSequenceUI() {
    var steps = document.querySelectorAll('.pipeline-step-dot');
    steps.forEach(function(step) {
        step.classList.remove('bg-emerald-500', 'text-white', 'shadow-glowGreen');
        step.classList.add('bg-primary/10', 'text-primary');
    });
}

function initDelegatedControls() {
    // Replaced by DOMContentLoaded block above.
}

function routePageFromLocation() {
  const page = (window.location.hash || '').replace('#', '').trim();
  return ['overview', 'monitoring', 'incident'].includes(page) ? page : 'overview';
}

function initializePageRoute() {
  switchPageView(routePageFromLocation(), { updateHash: false });
  window.addEventListener('hashchange', () => {
    switchPageView(routePageFromLocation(), { updateHash: false });
  });
}

async function bootstrapApplication() {
  const connected = await syncBackendState();

  if (connected) {
    connectBackendStream();
    // Telemetry polling is slow/display-only. Backend pipeline is operator-driven.
    startTelemetryPolling();
  } else {
    console.warn('Backend disconnected. Dashboard loaded into static, calm state waiting for manual override.');
  }

  // Refresh loop disabled at startup — only activated after operator button clicks.
  // startBackendRefreshLoop();

  refreshLiveViews();
}

// startDemoMode removed to enforce strict Operator-Driven Hybrid Cycle

// Create live infrastructure drifting particles
function createFloatingParticles() {
  const container = document.getElementById('particles-overlay');
  if (!container) return;

  container.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.width = `${Math.random() * 80 + 30}px`;
    p.style.height = p.style.width;
    p.style.top = `${Math.random() * 100}%`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${Math.random() * 15 + 10}s`;
    p.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(p);
  }
}

// System Clocks
function startTickingClocks() {
  // UTC Time Clock
  setInterval(() => {
    const now = new Date();
    const utcStr = now.toUTCString().slice(17, 25);
    const clockEl = document.getElementById('topClockUtc');
    if (clockEl) clockEl.innerText = utcStr;
  }, 1000);

  // Monitoring session elapsed timer
  setInterval(() => {
    const elapsedMs = Date.now() - state.sessionStart;
    const s = Math.floor((elapsedMs / 1000) % 60);
    const m = Math.floor((elapsedMs / (1000 * 60)) % 60);
    const h = Math.floor((elapsedMs / (1000 * 60 * 60)) % 24);
    
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    const durationEl = document.getElementById('topDuration');
    if (durationEl) durationEl.innerText = timeStr;
  }, 1000);
}

// Prediction countdown timer ticks
function startPredictionCountdown() {
  predictionCountdownInterval = setInterval(() => {
    if (state.currentStageIndex === 1 || state.currentStageIndex === 2) {
      if (predictionCountdownTime > 0) {
        predictionCountdownTime--;
      }
    } else if (state.currentStageIndex >= 3) {
      predictionCountdownTime = 0; // Resolved
    } else {
      predictionCountdownTime = 138; // System nominal state 2m 18s
    }

    const min = Math.floor(predictionCountdownTime / 60);
    const sec = predictionCountdownTime % 60;
    const timeStr = `${min} Min ${String(sec).padStart(2, '0')} Secs`;

    const timerEl = document.getElementById('aiPredictionTimerVal');
    if (timerEl) {
      timerEl.innerText = timeStr;
      if (state.currentStageIndex === 2) {
        timerEl.className = "text-xl font-bold font-mono text-red-500 animate-pulse mt-0.5";
      } else if (state.currentStageIndex === 1) {
        timerEl.className = "text-xl font-bold font-mono text-amber-500 mt-0.5";
      } else {
        timerEl.className = "text-xl font-bold font-mono text-slate-800 dark:text-white mt-0.5";
      }
    }
  }, 1000);
}

// Setup Initial UI Bindings & Router
function initUI() {
  // Dual Theme switch binding
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.addEventListener('change', (e) => {
      if (e.target.checked) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    });
  }


  // Collapsible demo control panel trigger
  const collapseBtn = document.getElementById('btnPanelCollapseToggle');
  const controlPanel = document.getElementById('demo-control-room-panel');
  if (collapseBtn && controlPanel) {
    collapseBtn.addEventListener('click', () => {
      state.demoPanelCollapsed = !state.demoPanelCollapsed;
      if (state.demoPanelCollapsed) {
        controlPanel.classList.add('panel-collapsed');
        collapseBtn.innerHTML = `<i data-lucide="chevron-up" class="w-4 h-4"></i>`;
      } else {
        controlPanel.classList.remove('panel-collapsed');
        collapseBtn.innerHTML = `<i data-lucide="chevron-down" class="w-4 h-4"></i>`;
      }
      createIconsSafe();
    });
  }

  // Incident scrubbing timeline triggers (Incident replay)
  document.querySelectorAll('.replay-timeline-node').forEach(node => {
    node.addEventListener('click', () => {
      const targetStage = parseInt(node.getAttribute('data-stage-index'));
      triggerSpecificStage(targetStage);
    });
  });

  // Action drawer close binding
  document.getElementById('btnDrawerClose')?.addEventListener('click', () => {
    const drawer = document.getElementById('node-detail-drawer');
    drawer?.classList.add('drawer-hidden');
  });

}

async function ensureDatasetLoaded() {
  if (!state.selectedDatasetFile) {
    return null;
  }

  const csv = await state.selectedDatasetFile.text();
  const result = await fetchJson('/dataset/load', {
    method: 'POST',
    body: JSON.stringify({
      name: state.selectedDatasetFile.name,
      csv,
    }),
  });

  const label = document.getElementById('selectedDatasetName');
  if (label) {
    label.innerText = `${result.dataset?.loaded_rows || 0} rows loaded`;
  }

  return result;
}

async function runSparkProcessing() {
  try {
    await ensureDatasetLoaded();
    const result = await fetchJson('/spark/run', {
      method: 'POST',
      body: JSON.stringify({ limit: 25 }),
    });
    applySimulationResult('spark-processing', result);
    connectBackendStream();
    startBackendRefreshLoop();
    refreshLiveViews();
    switchPageView('monitoring');
    return syncBackendState();
  } catch (error) {
    console.warn('Spark backend processing failed:', error);
    state.logs.push({
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type: 'danger',
      actor: 'Spark API',
      msg: error.message || 'Spark processing failed',
    });
    refreshLiveViews();
  }
}

async function loadAnomalyPipeline() {
  try {
    const result = await fetchJson('/anomaly/load', {
      method: 'POST',
      body: JSON.stringify({
        failure_type: 'resource_pressure',
      }),
    });
    applySimulationResult('load-anomaly', result);
    connectBackendStream();
    startBackendRefreshLoop();
    refreshLiveViews();
    switchPageView('monitoring');
    return syncBackendState();
  } catch (error) {
    console.warn('Anomaly injection failed, falling back to local stage 1:', error);
    startInteractiveSimulation();
  }
}

async function autoRecoverDemo() {
  try {
    const result = await fetchJson('/heal', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    applySimulationResult('auto-recover', result);
    connectBackendStream();
    startBackendRefreshLoop();
    refreshLiveViews();
    switchPageView('monitoring');
  } catch (error) {
    console.warn('Auto recover failed, falling back to local mitigation:', error);
    triggerSpecificStage(3);
  }
}

// Router Switch Controller
function switchPageView(pageId, options = {}) {
  if (!['overview', 'monitoring', 'incident'].includes(pageId)) return;
  
  const pages = ['overview', 'monitoring', 'incident'];
  pages.forEach(p => {
    const pageEl = document.getElementById(`page-${p}`);
    const navBtn = document.querySelector(`.sidebar-nav-btn[data-page="${p}"]`);
    if (!pageEl) return;
    
    if (p === pageId) {
      pageEl.classList.remove('hidden-view');
      pageEl.removeAttribute('aria-hidden');
      navBtn?.classList.add('bg-primary/10', 'text-primary', 'dark:text-white', 'border-l-4', 'border-primary');
      navBtn?.classList.remove('text-slate-500', 'dark:text-slate-400');
    } else {
      pageEl.classList.add('hidden-view');
      pageEl.setAttribute('aria-hidden', 'true');
      navBtn?.classList.remove('bg-primary/10', 'text-primary', 'dark:text-white', 'border-l-4', 'border-primary');
      navBtn?.classList.add('text-slate-500', 'dark:text-slate-400');
    }
  });

  // Hide demo control room panel on Overview/Home page
  const floatPanel = document.getElementById('demo-control-room-panel');
  if (floatPanel) {
    if (pageId === 'overview') {
      floatPanel.classList.add('hidden', 'pointer-events-none');
    } else {
      floatPanel.classList.remove('hidden', 'pointer-events-none');
    }
  }

  state.currentPage = pageId;

  if (options.updateHash !== false && window.location.hash !== `#${pageId}`) {
    history.replaceState(null, '', `#${pageId}`);
  }

  const recoveredScreenOverlay = document.getElementById('system-recovered-overlay');
  if (recoveredScreenOverlay && pageId !== 'incident') {
    recoveredScreenOverlay.classList.add('opacity-0', 'pointer-events-none');
    recoveredScreenOverlay.classList.remove('opacity-100');
  }
  
  // Re-draw diagrams to fit potential canvas scale changes
  setTimeout(() => {
    try {
      renderTopologies();
      renderTimelineChart();
      renderBlastRadiusChart();
      updateDashboardMetrics();
      updateLiveLogs();
      updateSelfHealingWorkflow();
    } catch (error) {
      console.warn('Page refresh failed:', error);
    }
  }, 100);
}

// Theme Controller
function setTheme(mode) {
  state.theme = mode;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
    setText('themeSwitchText', 'CYBER SPACE');
  } else {
    root.classList.remove('dark');
    setText('themeSwitchText', 'OPERATIONAL');
  }
}

// Reset Entire Simulation State back to normal
async function resetSimulationState() {
  if (window.SynapseCore) {
    window.SynapseCore.clearAllTimers();
  }
  

  const floatBtns = ['floatTriggerAnomaly', 'floatTriggerCascade', 'floatTriggerRecovery'];
  floatBtns.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.dataset.originalHtml) {
      el.innerHTML = el.dataset.originalHtml;
      el.className = el.dataset.originalClass;
    }
  });

  state.activeDemoMode = null;
  state.simulationActive = false;
  state.currentStageIndex = 0;
  predictionCountdownTime = 138;
  
  // Wipe history chart back to initial curves
  historyPoints = [
    { x: 0, risk: 4, load: 45 },
    { x: 10, risk: 5, load: 46 },
    { x: 20, risk: 4, load: 44 },
    { x: 30, risk: 6, load: 45 },
    { x: 40, risk: 5, load: 47 },
    { x: 50, risk: 4, load: 45 }
  ];

  // Close recovered overlay and detail drawer
  const overlay = document.getElementById('system-recovered-overlay');
  if (overlay) overlay.classList.add('opacity-0', 'pointer-events-none');
  
  const drawer = document.getElementById('node-detail-drawer');
  drawer?.classList.add('drawer-hidden');

  try {
    await fetchJson('/reset', { method: 'POST', body: JSON.stringify({}) });
    await syncBackendState();
    connectBackendStream();
    startBackendRefreshLoop();
    refreshLiveViews();
  } catch (error) {
    console.warn('Backend reset failed, falling back to local reset:', error);
    loadSimulationStage(0);
  }
}

// Trigger explicit stage instantly via presentation control triggers
function triggerSpecificStage(stageIdx) {
  // Turn on simulation variables
  if (!state.simulationActive) {
    state.simulationActive = true;
    switchPageView('monitoring');
  }
  
  clearInterval(state.simulationInterval);
  
  state.currentStageIndex = stageIdx;
  if (stageIdx === 2) {
    predictionCountdownTime = 108; // 1 min 48s failure risk window
  } else if (stageIdx >= 3) {
    predictionCountdownTime = 0;
  }
  
  loadSimulationStage(stageIdx);

  // Resume automated step progression from this point
  state.simulationInterval = setInterval(() => {
    state.currentStageIndex++;

    if (state.currentStageIndex >= simulationStages.length) {
      clearInterval(state.simulationInterval);
      state.simulationActive = false;
      return;
    }

    loadSimulationStage(state.currentStageIndex);
  }, DATA_REFRESH_INTERVAL_MS);
}

// Draw/Render Topology Map SVG Canvas
function renderTopologies() {
  const drawTopology = (containerId, clickable = false) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    const width = container.clientWidth || 500;
    const height = container.clientHeight || 450;
    
    // Scale helper
    const scaleX = (x) => (x / 500) * width;
    const scaleY = (y) => (y / 600) * height;

    let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Glow Filters definition -->
      <defs>
        <filter id="glow-p1" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>`;

    // Draw Links / Edges first
    edgesData.forEach(edge => {
      const fromNode = nodesData.find(n => n.id === edge.from);
      const toNode = nodesData.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const fromX = scaleX(fromNode.x);
      const fromY = scaleY(fromNode.y);
      const toX = scaleX(toNode.x);
      const toY = scaleY(toNode.y);

      // Edge Styling dependent on Simulation States & Light/Dark Theme contrast
      const isDark = state.theme === 'dark';
      let strokeColor = isDark ? 'rgba(79, 70, 229, 0.16)' : 'rgba(79, 70, 229, 0.45)';
      let isPulsing = true;
      let isFast = false;
      let opacity = isDark ? 0.85 : 0.95;
      let baseWidth = isDark ? 1.5 : 2.5;

      const n8State = resolveActiveStage().nodeStates[8] || 'healthy';

      if (edge.from === 8 || edge.to === 8) {
        if (n8State === 'warning') {
          strokeColor = isDark ? 'rgba(245, 158, 11, 0.45)' : 'rgba(180, 83, 9, 0.7)';
        } else if (n8State === 'critical') {
          strokeColor = isDark ? 'rgba(239, 68, 68, 0.6)' : 'rgba(185, 28, 28, 0.8)';
          isFast = true;
        } else if (n8State === 'isolated') {
          strokeColor = isDark ? 'rgba(79, 70, 229, 0.04)' : 'rgba(79, 70, 229, 0.1)'; // Faded out isolated link
          isPulsing = false;
          opacity = 0.15;
        } else if (n8State === 'cooling') {
          strokeColor = isDark ? 'rgba(6, 182, 212, 0.4)' : 'rgba(14, 116, 144, 0.7)';
        }
      }

      // Check cascade threat spread links
      if (n8State === 'critical' && ((edge.from === 4 || edge.to === 4) || (edge.from === 5 || edge.to === 5))) {
        strokeColor = isDark ? 'rgba(239, 68, 68, 0.45)' : 'rgba(185, 28, 28, 0.7)';
      }

      // Check active backup links
      if (n8State === 'isolated' && (edge.from === 11 || edge.to === 11)) {
        strokeColor = isDark ? 'rgba(6, 182, 212, 0.7)' : 'rgba(14, 116, 144, 0.85)';
        isFast = true;
      }

      svgHtml += `<line class="topo-edge ${isPulsing ? (isFast ? 'flow-line-fast' : 'flow-line') : ''}" 
        x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" 
        stroke="${strokeColor}" stroke-width="${isFast ? (baseWidth + 1.2) : baseWidth}" 
        opacity="${opacity}" />`;
    });

    // Draw Nodes
    nodesData.forEach(node => {
      const nodeX = scaleX(node.x);
      const nodeY = scaleY(node.y);
      
      // Determine Node Color based on global live state overrides
      let glowFilter = '';
      let isCentralNode = node.id === 1;
      let statusColor = '#06B6D4'; // Stable Neon Cyan

      // Dynamic Node overrides from simulation steps
      const stageObj = resolveActiveStage();
      const targetState = stageObj.nodeStates[node.id];

      if (targetState) {
        if (targetState === 'warning') {
          statusColor = '#EF4444'; // Crimson Anomaly
          glowFilter = 'filter="url(#glow-p1)"';
        } else if (targetState === 'critical') {
          statusColor = '#EF4444'; // Crimson Anomaly
          glowFilter = 'filter="url(#glow-p1)"';
        } else if (targetState === 'isolated') {
          statusColor = '#64748B'; // Slate Grey / offline
        } else if (targetState === 'cooling') {
          statusColor = '#06B6D4'; // Neon Cyan
          glowFilter = 'filter="url(#glow-cyan)"';
        } else if (targetState === 'active') {
          statusColor = '#06B6D4'; // Neon Cyan active
          glowFilter = 'filter="url(#glow-cyan)"';
        }
      }

      // Highlight active inspector select outline
      const isSelected = clickable && node.id === state.selectedNodeId;
      const ringStroke = isSelected ? 'stroke-primary dark:stroke-accent stroke-[3]' : 'stroke-transparent';
      
      // Node Elements SVG Group
      svgHtml += `
        <g class="cursor-pointer group" onclick="nodeClickDispatcher(${node.id}, ${clickable})">
          <!-- Selection highlight halo -->
          <circle cx="${nodeX}" cy="${nodeY}" r="${isCentralNode ? '26' : '18'}" fill="transparent" class="${ringStroke}" />
          
          <!-- Base background node shape -->
          <circle cx="${nodeX}" cy="${nodeY}" r="${isCentralNode ? '16' : '10'}" 
            fill="${isCentralNode ? 'url(#heroGrad)' : '#0F172A'}" 
            stroke="${statusColor}" stroke-width="2" 
            ${glowFilter}
            class="topo-node transition-all duration-300 group-hover:scale-110" />

          <!-- Center pulse dot -->
          <circle cx="${nodeX}" cy="${nodeY}" r="${isCentralNode ? '4' : '3.5'}" fill="${isCentralNode ? '#FFFFFF' : statusColor}" />
          
          <!-- Center Text for AI CORE -->
          ${isCentralNode ? `
            <text x="${nodeX}" y="${nodeY - 24}" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="11" class="fill-slate-900 dark:fill-slate-200 select-none animate-text-glow">AI CORE</text>
          ` : ''}

          <!-- Micro tooltip tags -->
          <text x="${nodeX}" y="${nodeY + 22}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="500" font-size="8.5" class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 fill-slate-800 dark:fill-slate-300 pointer-events-none select-none">
            ${node.name}
          </text>
        </g>
      `;
    });

    // Color gradient for the Core Node
    svgHtml += `
      <defs>
        <radialGradient id="heroGrad">
          <stop offset="0%" stop-color="#9333EA" />
          <stop offset="100%" stop-color="#4F46E5" />
        </radialGradient>
      </defs>
    </svg>`;
    
    container.innerHTML = svgHtml;
  };

  // Draw Page 1 Hero Visual Topology Map (non-clickable)
  drawTopology('hero-topology', false);
  // Draw Page 2 Interactive Command Center Topology Map (clickable)
  drawTopology('live-monitor-topology', true);
}

// Click Dispatcher for interactively inspectable topology nodes
window.nodeClickDispatcher = (nodeId, clickable) => {
  if (!clickable) return;
  state.selectedNodeId = nodeId;
  
  // Show/render visual highlight topologies
  renderTopologies();
  
  // Load Detail values and open the drawer
  updateTelemetryGauge();
  
  const drawer = document.getElementById('node-detail-drawer');
  drawer?.classList.remove('drawer-hidden');
};

// Update right side interactive node inspector panel AND Slide drawer
function updateTelemetryGauge() {
  const node = nodesData.find(n => n.id === state.selectedNodeId);
  if (!node) return;

  // Set titles across inspector + drawer
  setText('insNodeName', node.name.toUpperCase());
  setText('insNodeRole', node.type);

  // Drawer Title
  const drTitle = document.getElementById('drawerNodeName');
  if (drTitle) drTitle.innerText = node.name.toUpperCase();
  
  const drRole = document.getElementById('drawerNodeRole');
  if (drRole) drRole.innerText = node.type.toUpperCase();

  // Determine current active node health values
  let cpu = node.cpu;
  let ram = node.ram;
  if (node.id === 8 && state.liveTelemetry) {
    cpu = Math.round(state.liveTelemetry.cpu_utilization);
    ram = Math.round(state.liveTelemetry.memory_utilization);
  }
  let temp = node.temp;
  let power = node.power;
  let packetLoss = node.packetLoss;
  let riskScore = 4;
  let status = 'HEALTHY';
  let badgeStyle = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';

  // If node 8, apply dynamic simulation overrides
  const stageObj = resolveActiveStage();
  const targetState = stageObj.nodeStates[node.id];
  
  if (targetState) {
    if (targetState === 'warning') {
      cpu = 88;
      ram = 78;
      temp = 88;
      power = 18.5;
      packetLoss = 1.25;
      riskScore = 34;
      status = 'WARNING';
      badgeStyle = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    } else if (targetState === 'critical') {
      cpu = 98;
      ram = 94;
      temp = 98;
      power = 22.4;
      packetLoss = 8.42;
      riskScore = 82;
      status = 'CRITICAL FAILURE';
      badgeStyle = 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse';
    } else if (targetState === 'isolated') {
      cpu = 0;
      ram = 0;
      temp = 24;
      power = 0.5;
      packetLoss = 0.00;
      riskScore = 2;
      status = 'ISOLATED / SAFE';
      badgeStyle = 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
    } else if (targetState === 'cooling') {
      cpu = 18;
      ram = 32;
      temp = 62;
      power = 6.4;
      packetLoss = 0.05;
      riskScore = 12;
      status = 'COOLING / RECOVERING';
      badgeStyle = 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20';
    } else if (targetState === 'active') {
      cpu = 62;
      ram = 70;
      temp = 54;
      power = 14.1;
      packetLoss = 0.02;
      riskScore = 8;
      status = 'PROMOTED / PRIMARY';
      badgeStyle = 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20';
    }
  }

  // Update Main Inspector panel DOM
  const insStatus = document.getElementById('insStatus');
  if (insStatus) {
    insStatus.innerText = status;
    insStatus.className = `text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wider ${badgeStyle}`;
  }
  setText('insCpuText', `${cpu}%`);
  setWidth('insCpuBar', `${cpu}%`);
  setText('insRamText', `${ram}%`);
  setWidth('insRamBar', `${ram}%`);
  setText('insTempText', `${temp}°C`);
  setWidth('insTempBar', `${Math.min(temp, 100)}%`);

  // Update Drawer elements
  const drStatus = document.getElementById('drawerStatusBadge');
  if (drStatus) {
    drStatus.innerText = status;
    drStatus.className = `px-3 py-1 rounded-full text-xs font-bold ${badgeStyle}`;
  }

  const setDrawerParam = (textId, barId, val, suffix = '%') => {
    const txt = document.getElementById(textId);
    const bar = document.getElementById(barId);
    if (txt) txt.innerText = `${val}${suffix}`;
    if (bar) bar.style.width = `${Math.min(val, 100)}%`;
  };

  setDrawerParam('drCpuText', 'drCpuBar', cpu, '%');
  setDrawerParam('drRamText', 'drRamBar', ram, '%');
  setDrawerParam('drTempText', 'drTempBar', temp, '°C');
  setDrawerParam('drPowerText', 'drPowerBar', power, ' kW');
  setDrawerParam('drLossText', 'drLossBar', packetLoss, '%');
  setDrawerParam('drRiskText', 'drRiskBar', riskScore, '%');

  // Draw node specific local SVG micro sparkline inside Inspector
  const sparkContainer = document.getElementById('insSparkline');
  if (sparkContainer) {
    const pts = [20, 24, 21, cpu - 15, cpu - 5, cpu, cpu - 8, cpu];
    let pointsStr = '';
    const w = sparkContainer.clientWidth || 220;
    const h = 50;
    pts.forEach((v, index) => {
      const px = (index / (pts.length - 1)) * w;
      const py = h - (v / 100) * (h - 10);
      pointsStr += `${px},${py} `;
    });

    sparkContainer.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
      <polyline fill="none" stroke="#4F46E5" stroke-width="2" points="${pointsStr}" />
      <circle cx="${w}" cy="${h - (cpu / 100) * (h - 10)}" r="3" fill="#4F46E5" />
    </svg>`;
  }

  // Draw identical sparkline inside Drawer Detail
  const drawerSpark = document.getElementById('drawerTrendSparkline');
  if (drawerSpark) {
    const pts = [18, 22, 28, 22, cpu - 20, cpu - 5, cpu];
    let pointsStr = '';
    const w = drawerSpark.clientWidth || 300;
    const h = 60;
    pts.forEach((v, index) => {
      const px = (index / (pts.length - 1)) * w;
      const py = h - (v / 100) * (h - 10);
      pointsStr += `${px},${py} `;
    });

    drawerSpark.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
      <polyline fill="none" stroke="#06B6D4" stroke-width="2" points="${pointsStr}" />
      <circle cx="${w}" cy="${h - (cpu / 100) * (h - 10)}" r="3.5" fill="#06B6D4" />
    </svg>`;
  }
}

// Render Architecture Flow Diagram (Page 1 Process Block)
function renderArchitectureFlow() {
  const container = document.getElementById('architecture-flow');
  if (!container) return;

  const flowSteps = [
    { title: 'TELEMETRY STREAM', desc: 'Realtime edge telemetry streams', icon: 'zap' },
    { title: 'AI DEVIATION DISCOVER', desc: 'Continuous anomaly scans', icon: 'shield-alert' },
    { title: 'RISK PROPAGATION', desc: 'Neural network cascade check', icon: 'trending-up' },
    { title: 'BLAST RADIUS MAP', desc: 'Financial loss mitigation boundaries', icon: 'circle-dot' },
    { title: 'RL REMEDIATION', desc: 'Reinforcement Learning resolution', icon: 'sparkles' }
  ];

  let html = '';
  flowSteps.forEach((step, idx) => {
    const isCompleted = state.currentStageIndex >= idx;
    const isCurrent = state.currentStageIndex === idx;
    
    let ringClass = 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400';
    let labelColor = 'text-slate-500 dark:text-slate-400';
    let cardShadow = 'border-slate-200 dark:border-slate-800';

    if (isCompleted) {
      ringClass = 'border-primary bg-primary/10 text-primary dark:text-indigo-300 shadow-glow';
      labelColor = 'text-indigo-600 dark:text-indigo-400 font-semibold';
      cardShadow = 'border-primary/20 bg-indigo-500/[0.02]';
    }
    if (isCurrent) {
      ringClass = 'border-accent bg-accent/10 text-accent dark:text-cyan-300 shadow-glowCyan animate-pulse';
      labelColor = 'text-accent font-bold';
      cardShadow = 'border-accent/40 bg-accent-500/[0.04]';
    }

    html += `
      <div class="flex flex-col items-center flex-1 min-w-[150px] p-4 rounded-xl border ${cardShadow} backdrop-blur-md relative transition-all duration-300 hover:-translate-y-1">
        <!-- Connecting Pipeline Line -->
        ${idx < flowSteps.length - 1 ? `
          <div class="hidden lg:block absolute h-[2px] w-[50%] left-[75%] top-[40px] bg-gradient-to-r ${isCompleted ? 'from-primary to-slate-300 dark:to-slate-800' : 'from-slate-300 to-slate-300 dark:from-slate-800 dark:to-slate-800'} z-0"></div>
        ` : ''}
        
        <div class="w-12 h-12 rounded-full border-2 flex items-center justify-center z-10 transition-colors duration-300 ${ringClass}">
          <i data-lucide="${step.icon}" class="w-5 h-5"></i>
        </div>
        
        <h4 class="text-xs font-bold tracking-wider mt-4 text-center ${labelColor}">${step.title}</h4>
        <p class="text-[10px] text-slate-400 dark:text-slate-500 mt-1 text-center font-medium">${step.desc}</p>
      </div>
    `;
  });

  container.innerHTML = html;
  createIconsSafe();
}

// Render SVG area Chart recording Risk and Load progression (Page 2)
function renderTimelineChart() {
  const container = document.getElementById('timeline-chart-svg');
  if (!container) return;

  container.innerHTML = '';
  const w = container.clientWidth || 550;
  const h = container.clientHeight || 200;

  // Margin spacing
  const padL = 35;
  const padB = 25;
  const padT = 10;
  const padR = 10;

  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  // Max points shown
  const maxValX = 100;
  const maxValY = 100;

  // Coord scale helpers
  const scaleX = (valX) => padL + (valX / maxValX) * chartW;
  const scaleY = (valY) => padT + chartH - (valY / maxValY) * chartH;

  let pathDataRisk = '';
  let pathDataLoad = '';
  let areaDataRisk = '';

  historyPoints.forEach((pt, i) => {
    const cx = scaleX(pt.x);
    const cyRisk = scaleY(pt.risk);
    const cyLoad = scaleY(pt.load);

    if (i === 0) {
      pathDataRisk += `M ${cx} ${cyRisk}`;
      pathDataLoad += `M ${cx} ${cyLoad}`;
      areaDataRisk += `M ${cx} ${scaleY(0)} L ${cx} ${cyRisk}`;
    } else {
      pathDataRisk += ` L ${cx} ${cyRisk}`;
      pathDataLoad += ` L ${cx} ${cyLoad}`;
      areaDataRisk += ` L ${cx} ${cyRisk}`;
    }

    if (i === historyPoints.length - 1) {
      areaDataRisk += ` L ${cx} ${scaleY(0)} Z`;
    }
  });

  // Compile full Chart Elements in SVG
  let svg = `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
    <defs>
      <!-- Gradients -->
      <linearGradient id="areaGradRisk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#EF4444" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#EF4444" stop-opacity="0.00"/>
      </linearGradient>
    </defs>

    <!-- Grid Horizontal Lines -->
    <line x1="${padL}" y1="${scaleY(25)}" x2="${w - padR}" y2="${scaleY(25)}" stroke="rgba(148, 163, 184, 0.08)" stroke-dasharray="3,3" />
    <line x1="${padL}" y1="${scaleY(50)}" x2="${w - padR}" y2="${scaleY(50)}" stroke="rgba(148, 163, 184, 0.08)" stroke-dasharray="3,3" />
    <line x1="${padL}" y1="${scaleY(75)}" x2="${w - padR}" y2="${scaleY(75)}" stroke="rgba(148, 163, 184, 0.08)" stroke-dasharray="3,3" />
    <line x1="${padL}" y1="${scaleY(100)}" x2="${w - padR}" y2="${scaleY(100)}" stroke="rgba(148, 163, 184, 0.08)" stroke-dasharray="3,3" />

    <!-- Grid Y and X Boundaries -->
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="rgba(148, 163, 184, 0.15)" />
    <line x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" stroke="rgba(148, 163, 184, 0.15)" />

    <!-- Y labels -->
    <text x="${padL - 6}" y="${scaleY(0) + 3}" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="8" class="fill-slate-400">0%</text>
    <text x="${padL - 6}" y="${scaleY(50) + 3}" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="8" class="fill-slate-400">50%</text>
    <text x="${padL - 6}" y="${scaleY(100) + 3}" text-anchor="end" font-family="'JetBrains Mono', monospace" font-size="8" class="fill-slate-400">100%</text>

    <!-- Area Fill (Risk) -->
    ${historyPoints.length > 1 ? `<path d="${areaDataRisk}" fill="url(#areaGradRisk)" />` : ''}

    <!-- Lines -->
    ${historyPoints.length > 1 ? `<path d="${pathDataLoad}" fill="none" stroke="#9333EA" stroke-width="2" />` : ''}
    ${historyPoints.length > 1 ? `<path d="${pathDataRisk}" fill="none" stroke="#EF4444" stroke-width="2" />` : ''}

    <!-- Render Legend indicators -->
    <g transform="translate(${padL + 20}, ${padT + 10})">
      <rect width="8" height="8" rx="2" fill="#EF4444" />
      <text x="14" y="8" font-family="'Inter', sans-serif" font-weight="600" font-size="8.5" class="fill-slate-700 dark:fill-slate-300">AI RISK ASSESSMENT</text>
      
      <rect width="8" height="8" rx="2" fill="#9333EA" transform="translate(130, 0)" />
      <text x="144" y="8" font-family="'Inter', sans-serif" font-weight="600" font-size="8.5" class="fill-slate-700 dark:fill-slate-300 font-medium">WORKLOAD VOLUME</text>
    </g>
  </svg>`;

  container.innerHTML = svg;
}

// Render Blast Radius Circle Vector Visualization with expanding ripples
function renderBlastRadiusChart() {
  const container = document.getElementById('blast-radius-svg');
  if (!container) return;

  container.innerHTML = '';
  const w = container.clientWidth || 300;
  const h = container.clientHeight || 280;

  const cx = w / 2;
  const cy = h / 2;

  // Radius sizes depend on risk
  const currentRisk = resolveActiveStage().riskScore;
  const ring1Rad = 35;
  const ring2Rad = 70;
  const ring3Rad = 105;

  let waveHtml = '';
  
  if (currentRisk >= 30) {
    // Render infected outward pulse ripples (Expanding rings animation)
    waveHtml += `
      <circle cx="${cx}" cy="${cy}" r="${ring1Rad}" fill="rgba(239, 68, 68, 0.05)" stroke="rgba(239, 68, 68, 0.4)" stroke-width="1.5" />
      <circle cx="${cx}" cy="${cy}" r="${ring1Rad}" fill="none" stroke="#EF4444" stroke-width="2.5" opacity="0.6">
        <animate attributeName="r" values="35;105" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0" dur="2.5s" repeatCount="indefinite" />
      </circle>
    `;
    
    if (currentRisk >= 75) {
      waveHtml += `
        <circle cx="${cx}" cy="${cy}" r="${ring2Rad}" fill="rgba(239, 68, 68, 0.03)" stroke="rgba(239, 68, 68, 0.3)" stroke-width="1" stroke-dasharray="3,3" />
        <circle cx="${cx}" cy="${cy}" r="${ring2Rad}" fill="none" stroke="#EF4444" stroke-width="2" opacity="0.4">
          <animate attributeName="r" values="70;140" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0" dur="2.5s" begin="0.8s" repeatCount="indefinite" />
        </circle>
      `;
    }
  }

  // Draw safe containment boundaries when isolated remediation active
  const n8State = resolveActiveStage().nodeStates[8] || 'healthy';
  let containmentHtml = '';
  
  if (n8State === 'isolated' || n8State === 'cooling') {
    containmentHtml += `
      <circle cx="${cx}" cy="${cy}" r="${ring2Rad + 15}" fill="none" stroke="#06B6D4" stroke-width="2" stroke-dasharray="6,4" class="flow-line" />
      <!-- Concentric boundary ring -->
      <circle cx="${cx}" cy="${cy}" r="${ring2Rad + 15}" fill="rgba(6, 182, 212, 0.03)" stroke="rgba(6, 182, 212, 0.2)" stroke-width="1" />
      <text x="${cx}" y="${cy - ring2Rad - 22}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="8" fill="#06B6D4">CONTAINMENT BARRIER</text>
    `;
  }

  let svgHtml = `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
    <defs>
      <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#EF4444" stop-opacity="0.3" />
        <stop offset="100%" stop-color="#EF4444" stop-opacity="0.0" />
      </radialGradient>
    </defs>

    <!-- Radar Grid Background Concentric Circles -->
    <circle cx="${cx}" cy="${cy}" r="${ring1Rad}" fill="none" stroke="rgba(148, 163, 184, 0.07)" />
    <circle cx="${cx}" cy="${cy}" r="${ring2Rad}" fill="none" stroke="rgba(148, 163, 184, 0.07)" />
    <circle cx="${cx}" cy="${cy}" r="${ring3Rad}" fill="none" stroke="rgba(148, 163, 184, 0.07)" />
    
    <!-- Crosshair Lines -->
    <line x1="${cx - ring3Rad - 10}" y1="${cy}" x2="${cx + ring3Rad + 10}" y2="${cy}" stroke="rgba(148, 163, 184, 0.06)" />
    <line x1="${cx}" y1="${cy - ring3Rad - 10}" x2="${cx}" y2="${cy + ring3Rad + 10}" stroke="rgba(148, 163, 184, 0.06)" />

    <!-- Center Hazard Glow -->
    ${currentRisk >= 30 ? `<circle cx="${cx}" cy="${cy}" r="60" fill="url(#centerGlow)" />` : ''}

    <!-- Dynamic Ripples -->
    ${waveHtml}
    ${containmentHtml}

    <!-- Center Infected Node marker -->
    <circle cx="${cx}" cy="${cy}" r="8" fill="${currentRisk >= 75 ? '#EF4444' : (currentRisk >= 30 ? '#F59E0B' : '#10B981')}" />
    <circle cx="${cx}" cy="${cy}" r="15" fill="none" stroke="${currentRisk >= 30 ? '#EF4444' : '#10B981'}" stroke-width="1.5" class="animate-ping" style="animation-duration: 2s;" />

    <text x="${cx}" y="${cy - 18}" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="700" font-size="9.5" class="fill-slate-900 dark:fill-slate-200">DB-CLUSTER-08</text>
    <text x="${cx}" y="${cy + 25}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="700" font-size="8" class="fill-slate-400">
      ${currentRisk >= 75 ? 'INVOLVED AREA' : (currentRisk >= 30 ? 'THERMAL ANOMALY' : 'STATUS NOMINAL')}
    </text>
  </svg>`;

  container.innerHTML = svgHtml;
}

// Update primary dashboard metric UI counters (count-up styles)
function updateDashboardMetrics() {
  const stage = resolveActiveStage();
  
  // Interpolation helpers for animating numbers
  const animateNumber = (id, targetVal, prefix = '', suffix = '', isFloat = false) => {
    const el = document.getElementById(id);
    if (!el) return;
    
    let currentVal = parseFloat(el.getAttribute('data-current') || '0');
    const steps = 15;
    const increment = (targetVal - currentVal) / steps;
    let stepCount = 0;

    const timer = setInterval(() => {
      currentVal += increment;
      stepCount++;
      
      if (stepCount >= steps) {
        clearInterval(timer);
        currentVal = targetVal;
      }
      
      el.setAttribute('data-current', currentVal);
      el.innerText = `${prefix}${isFloat ? currentVal.toFixed(2) : Math.round(currentVal)}${suffix}`;
    }, 25);
  };

  // KPI panel counters
  animateNumber('kpiHealth', stage.health, '', '%', true);
  animateNumber('kpiHealthOverview', stage.health, '', '%', true);
  
  // Update Health ring SVG circle values
  const healthRing = document.getElementById('kpiHealthRingCircle');
  if (healthRing) {
    const radius = 64;
    const circ = 2 * Math.PI * radius; // 402.12
    const offset = circ - (stage.health / 100) * circ;
    healthRing.style.strokeDashoffset = offset;
    
    healthRing.setAttribute('stroke', stage.health >= 98 ? '#10B981' : (stage.health >= 94 ? '#F59E0B' : '#EF4444'));
  }

  animateNumber('kpiNodes', stage.activeNodes, '', '');
  animateNumber('kpiAnomalies', stage.anomalies, '', '');
  animateNumber('kpiThreats', stage.threats, '', '');
  animateNumber('kpiLoss', stage.lossPrevented, '$', 'K', true);

  // Overview Page counters updates
  animateNumber('ovAnomaliesToday', stage.anomalies, '', '');
  animateNumber('ovThreatsPrevented', stage.currentStageIndex >= 4 ? 8 : (stage.currentStageIndex >= 1 ? 7 : 6), '', '');
  const getPredictions = () => {
    if (state.liveTelemetry && state.liveTelemetry.total_predictions) {
      return state.liveTelemetry.total_predictions;
    }
    return stage.currentStageIndex * 24 + 104;
  };
  animateNumber('ovPredictions', getPredictions(), '', '');
  animateNumber('ovHealActions', stage.currentStageIndex >= 3 ? 33 : 32, '', '');

  // Update Donut Chart Counts (Real-time distribution indicators)
  const donutH = stage.activeNodes - stage.anomalies;
  const donutHealthyText = document.getElementById('donutHealthyText');
  if (donutHealthyText) donutHealthyText.innerText = `${donutH} Nodes`;
  const donutWarningText = document.getElementById('donutWarningText');
  if (donutWarningText) donutWarningText.innerText = `${stage.anomalies > 0 && stage.currentStageIndex == 1 ? 1 : 0} Nodes`;
  const donutCriticalText = document.getElementById('donutCriticalText');
  if (donutCriticalText) donutCriticalText.innerText = `${stage.currentStageIndex == 2 ? 1 : 0} Nodes`;
  const donutRecoveredText = document.getElementById('donutRecoveredText');
  if (donutRecoveredText) donutRecoveredText.innerText = `${stage.currentStageIndex >= 4 ? 1 : 0} Nodes`;

  // Update rack capacity
  setText('rackACount', `${state.currentStageIndex === 2 ? '3/4' : '4/4'} ONLINE`);
  setText('rackBCount', '4/4 ONLINE');
  setText('rackCCount', '4/4 ONLINE');

  // Live monitor KPI subtext and badges
  const liveStatusBadge = document.getElementById('liveStatusBadge');
  if (liveStatusBadge) {
    liveStatusBadge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full mr-2 bg-current animate-ping"></span>${stage.name}`;
    liveStatusBadge.className = `flex items-center px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${stage.badgeClass}`;
  }

  // Update Page 2 Side AI risk meters
  document.getElementById('aiRiskScoreText')?.setAttribute('class', 'text-4xl font-extrabold text-slate-800 dark:text-white ' + 
    (stage.riskScore >= 75 ? 'text-red-500 dark:text-red-400' : (stage.riskScore >= 30 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-500 dark:text-emerald-400'))
  );
  animateNumber('aiRiskScoreVal', stage.riskScore, '', '%');
  animateNumber('aiConfidenceVal', stage.aiConfidence, '', '%', true);
  
  const riskThreatEl = document.getElementById('aiThreatLevelVal');
  if (riskThreatEl) {
    riskThreatEl.innerText = stage.threatLevel;
    riskThreatEl.className = 'font-bold mt-1 text-sm ' + 
      (stage.riskScore >= 75 ? 'text-red-500' : (stage.riskScore >= 30 ? 'text-amber-500' : 'text-emerald-500'));
  }
  
  const failureWindowEl = document.getElementById('aiFailureWindowVal');
  if (failureWindowEl) {
    failureWindowEl.innerText = stage.failureWindow;
    failureWindowEl.className = 'font-bold mt-1 text-sm text-slate-700 dark:text-slate-300 ' + 
      (stage.riskScore >= 75 ? 'animate-pulse text-red-500 dark:text-red-400' : '');
  }

  // Update radial SVG ring stroke offset
  const radialCircle = document.getElementById('aiRadialProgressCircle');
  if (radialCircle) {
    const radius = 54;
    const circ = 2 * Math.PI * radius; // 339.29
    const offset = circ - (stage.riskScore / 100) * circ;
    radialCircle.style.strokeDasharray = circ;
    radialCircle.style.strokeDashoffset = offset;
    
    // Circle Color adjustment
    radialCircle.setAttribute('stroke', stage.riskScore >= 75 ? '#EF4444' : (stage.riskScore >= 30 ? '#F59E0B' : '#10B981'));
  }

  // Live telemetry meters
  animateNumber('telCpu', stage.cpu, '', '%', true);
  setWidth('telCpuBar', `${stage.cpu}%`);
  
  animateNumber('telGpu', stage.gpu, '', '°C', true);
  setWidth('telGpuBar', `${stage.gpu}%`);
  
  animateNumber('telMem', stage.memory, '', '%', true);
  setWidth('telMemBar', `${stage.memory}%`);
  
  animateNumber('telLat', stage.latency, '', ' ms');
  setWidth('telLatBar', `${Math.min(stage.latency / 4, 100)}%`);
  
  animateNumber('telLoss', stage.packetLoss, '', '%', true);
  setWidth('telLossBar', `${Math.min(stage.packetLoss * 10, 100)}%`);
  
  animateNumber('telPower', stage.power, '', ' kW', true);
  setWidth('telPowerBar', `${Math.min(stage.power * 4, 100)}%`);

  // Draw Mini CSS-sparklines for all telemetry cells dynamically!
  Object.keys(sparklineDataSets).forEach(key => {
    renderMiniSparkline(`sparkline-${key}`, sparklineDataSets[key], stage.riskScore);
  });

  // Page 2 - Predicted Cascade Path sequential list updating
  const cascadeList = document.getElementById('predicted-cascade-path-list');
  if (cascadeList) {
    if (stage.riskScore >= 30) {
      cascadeList.innerHTML = `
        <div class="flex items-center gap-2 text-red-500 font-extrabold animate-pulse">
          <span>Node-08 (DB)</span>
          <i data-lucide="chevrons-right" class="w-4 h-4"></i>
          <span>Node-05 (LB)</span>
          <i data-lucide="chevrons-right" class="w-4 h-4"></i>
          <span class="${stage.riskScore >= 75 ? 'text-red-500' : 'text-slate-400 font-normal'}">Node-04 (API)</span>
          <i data-lucide="chevrons-right" class="w-4 h-4 text-slate-600"></i>
          <span class="text-slate-600 font-normal">Node-02 (GW)</span>
        </div>
      `;
    } else {
      cascadeList.innerHTML = `<span class="text-xs text-slate-500 font-medium">No cascade failure predicted. Paths stable.</span>`;
    }
  }

  // Page 2 - Root Cause Panel update
  setText('rcaCauseVal', stage.rca.cause);
  setText('rcaConfidenceVal', stage.rca.confidence > 0 ? `${stage.rca.confidence}%` : 'N/A');
  setText('rcaAffectedVal', stage.rca.affected > 0 ? `${stage.rca.affected} Nodes` : 'None');
  setText('rcaTimeVal', stage.rca.time);

  // Page 2 - Digital Twin Panel comparison updates
  setText('twinCurrentText', `${stage.twin.current}% Risk`);
  setWidth('twinCurrentBar', `${stage.twin.current}%`);
  setText('twinPredictedText', `${stage.twin.predicted}% Risk`);
  setWidth('twinPredictedBar', `${stage.twin.predicted}%`);
  setText('twinDiffText', `▲ ${stage.twin.diff}% Divergence`);

  // Page 2 - risk confidence breakdown update
  setWidth('confThermalBar', `${stage.riskConfidence.thermal}%`);
  setText('confThermalVal', `${stage.riskConfidence.thermal}%`);
  
  setWidth('confNetworkBar', `${stage.riskConfidence.network}%`);
  setText('confNetworkVal', `${stage.riskConfidence.network}%`);
  
  setWidth('confPowerBar', `${stage.riskConfidence.power}%`);
  setText('confPowerVal', `${stage.riskConfidence.power}%`);
  
  setWidth('confMemoryBar', `${stage.riskConfidence.memory}%`);
  setText('confMemoryVal', `${stage.riskConfidence.memory}%`);

  // Page 2 - Blast radius forecast metrics
  setText('forecastCurrent', `${stage.blastRadiusForecast.current} Node`);
  setText('forecastMin2', `${stage.blastRadiusForecast.min2} Nodes`);
  setText('forecastMin5', `${stage.blastRadiusForecast.min5} Nodes`);

  // Page 2 - Explainable AI (XAI) factors updating
  const xaiContainer = document.getElementById('xai-metric-correlations');
  if (xaiContainer) {
    xaiContainer.innerHTML = '';
    stage.xai.metrics.forEach(met => {
      xaiContainer.innerHTML += `
        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-2 text-[10px]">
          <span class="text-slate-400 font-medium">${met.label}</span>
          <div class="flex items-center gap-3">
            <span class="text-slate-800 dark:text-slate-200 font-bold font-mono">${met.value}</span>
            <span class="font-bold font-mono ${met.isDanger ? 'text-red-500 animate-pulse' : 'text-slate-400'}">${met.change}</span>
            <span class="font-bold font-mono ${met.isDanger ? 'text-red-400' : 'text-emerald-500'}">(${met.impact})</span>
          </div>
        </div>
      `;
    });
    // Update XAI dynamic header
    const xaiHeader = document.getElementById('xaiRiskIncreaseHeader');
    if (xaiHeader) {
      xaiHeader.innerText = `Risk Level Deviation: ${stage.xai.totalIncrease}`;
      xaiHeader.className = `text-xs font-bold font-mono ${stage.riskScore >= 75 ? 'text-red-500 animate-pulse' : 'text-slate-800 dark:text-white'}`;
    }
  }

  const mlDecision = stage.mlDecision || { action: 'observe', reason: 'Waiting for backend decision output.', confidence: 0.5 };
  const mlForecast = stage.mlForecast || { risk: 0, timeToThreshold: 'N/A' };
  const mlExplainability = stage.mlExplainability || { summary: 'Backend explainability summary will appear here.', featureContributions: [] };

  const decisionActionEl = document.getElementById('mlDecisionAction');
  if (decisionActionEl) {
    decisionActionEl.innerText = String(mlDecision.action || 'observe').toUpperCase();
  }

  const decisionConfidenceEl = document.getElementById('mlDecisionConfidence');
  if (decisionConfidenceEl) {
    const confidence = Number(mlDecision.confidence);
    decisionConfidenceEl.innerText = `${Math.round((Number.isFinite(confidence) ? confidence : 0.5) * 100)}%`;
  }

  const forecastRiskEl = document.getElementById('mlForecastRisk');
  if (forecastRiskEl) {
    forecastRiskEl.innerText = `${mlForecast.risk}% risk`;
  }

  const forecastWindowEl = document.getElementById('mlForecastWindow');
  if (forecastWindowEl) {
    forecastWindowEl.innerText = mlForecast.timeToThreshold;
  }

  const decisionReasonEl = document.getElementById('mlDecisionReason');
  if (decisionReasonEl) {
    decisionReasonEl.innerText = mlDecision.reason;
  }

  const shapSummaryEl = document.getElementById('mlShapSummary');
  if (shapSummaryEl) {
    shapSummaryEl.innerText = mlExplainability.summary;
  }

  const shapFeaturesEl = document.getElementById('mlShapFeatures');
  if (shapFeaturesEl) {
    const contributions = mlExplainability.featureContributions || [];
    shapFeaturesEl.innerHTML = contributions.length > 0
      ? contributions.slice(0, 4).map((item) => `
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-850 pb-2 text-[10px]">
          <span class="text-slate-400 font-medium uppercase">${item.feature}</span>
          <div class="flex items-center gap-2">
            <span class="font-bold font-mono text-slate-800 dark:text-slate-200">${item.value.toFixed(1)}</span>
            <span class="font-bold font-mono ${item.overflow > 0 ? 'text-red-500' : 'text-emerald-500'}">${item.overflow > 0 ? `+${item.overflow.toFixed(1)}` : '0.0'}</span>
            <span class="font-bold font-mono text-slate-400">(${Math.round((item.weight || 0) * 100)}%)</span>
          </div>
        </div>
      `).join('')
      : '<span class="text-xs text-slate-500 font-medium">No SHAP-style contributions available yet.</span>';
  }

  // Page 3 Metrics update
  const criticalSectionAlert = document.getElementById('page3-critical-alert');
  if (criticalSectionAlert) {
    if (stage.riskScore >= 75) {
      criticalSectionAlert.classList.remove('hidden');
      criticalSectionAlert.classList.add('flex', 'warning-card-pulse');
    } else {
      criticalSectionAlert.classList.add('hidden');
      criticalSectionAlert.classList.remove('flex', 'warning-card-pulse');
    }
  }

  // Page 3 Recovery percentage rings
  animateNumber('p3StabilizationText', stage.stabilization, '', '%');
  const recoveryCircle = document.getElementById('p3RadialRecoveryRing');
  if (recoveryCircle) {
    const radius = 70;
    const circ = 2 * Math.PI * radius; // 439.8
    const offset = circ - (stage.stabilization / 100) * circ;
    recoveryCircle.style.strokeDashoffset = offset;
  }

  // Page 3 AI Brain update
  setText('brainActionVal', stage.brain.action);
  setText('brainNextVal', stage.brain.next);
  setText('brainReasoningVal', stage.brain.reasoning);
  setText('brainConfidenceVal', `${stage.brain.confidence}%`);

  // Page 3 Cost dashboard
  animateNumber('p3LossPotentialText', stage.costImpact.potential, '$', ',000');
  animateNumber('p3LossSavedText', stage.costImpact.recovered, '$', ',000');
  setText('p3DowntimeAvoidedText', `${stage.costImpact.downtime} Hours`);
  setText('p3PercentSavedText', `${stage.costImpact.saved}%`);

  // Page 3 Recovery recommendation engine updating
  const recContainer = document.getElementById('p3-recommendation-list');
  if (recContainer) {
    recContainer.innerHTML = '';
    if (stage.recommendations.length > 0) {
      stage.recommendations.forEach((rec, idx) => {
        let badge = 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
        if (rec.priority === 'CRITICAL') badge = 'bg-red-500/10 text-red-550 border border-red-550/20 animate-pulse';
        if (rec.priority === 'HIGH') badge = 'bg-amber-500/10 text-amber-550 border border-amber-550/20';
        
        let stateBadge = 'bg-slate-100 dark:bg-slate-800 text-slate-400';
        if (rec.status === 'SELECTED') stateBadge = 'bg-cyan-500/15 text-cyan-500 border border-cyan-550/20';
        if (rec.status === 'EXECUTED') stateBadge = 'bg-emerald-500/15 text-emerald-500 border border-emerald-550/20';

        recContainer.innerHTML += `
          <div class="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-950/10 rounded-xl text-[10px]">
            <div class="flex items-center gap-3">
              <span class="font-bold text-slate-800 dark:text-slate-350">${idx + 1}. ${rec.action}</span>
              <span class="px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${badge}">${rec.priority}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="font-semibold text-slate-400 font-mono">Efficacy: ${rec.successRate}%</span>
              <span class="px-2 py-0.5 rounded font-extrabold text-[8px] ${stateBadge}">${rec.status}</span>
            </div>
          </div>
        `;
      });
    } else {
      recContainer.innerHTML = `<span class="text-xs text-slate-500 font-medium text-center w-full">Recommendations nominal. Systems secure.</span>`;
    }
  }

  // Page 3 Recovery Validation checking
  const valNode = document.getElementById('p3ValNode');
  const valTraffic = document.getElementById('p3ValTraffic');
  const valTemp = document.getElementById('p3ValTemp');
  const valStatus = document.getElementById('p3ValStatus');

  const setValidationValue = (el, text) => {
    if (!el) return;
    el.innerText = text;
    el.className = `font-bold ${text === 'NOMINAL' || text === 'VERIFIED' ? 'text-emerald-500' : (text === 'WARNING' ? 'text-amber-500' : 'text-red-500 animate-pulse')}`;
  };

  setValidationValue(valNode, stage.validation.nodeStable);
  setValidationValue(valTraffic, stage.validation.trafficNormal);
  setValidationValue(valTemp, stage.validation.tempNormal);
  setValidationValue(valStatus, stage.validation.state);

  // SLA breach updating
  const slaEl = document.getElementById('topSlaBreachVal');
  if (slaEl) {
    slaEl.innerText = stage.slaBreachProb;
    if (stage.riskScore >= 75) {
      slaEl.className = 'text-xs font-extrabold font-mono text-red-500 animate-pulse';
    } else if (stage.riskScore >= 30) {
      slaEl.className = 'text-xs font-extrabold font-mono text-amber-500';
    } else {
      slaEl.className = 'text-xs font-extrabold font-mono text-emerald-500';
    }
  }

  // Multi-cluster states updating
  const setClusterClass = (id, state) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = state;
    el.className = `px-2 py-0.5 rounded font-extrabold text-[8px] font-mono ` +
      (state === 'HEALTHY' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : (state === 'WARNING' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse'));
  };

  setClusterClass('clsAState', stage.multiCluster.A);
  setClusterClass('clsBState', stage.multiCluster.B);
  setClusterClass('clsCState', stage.multiCluster.C);

  // Page 3 Efficacy gauge ring
  const efficacyCircle = document.getElementById('p3EfficacyRadialRing');
  if (efficacyCircle) {
    const radius = 54;
    const circ = 2 * Math.PI * radius; // 339.29
    const effVal = stage.currentStageIndex >= 4 ? 97 : (stage.currentStageIndex >= 3 ? 88 : 0);
    const offset = circ - (effVal / 100) * circ;
    efficacyCircle.style.strokeDashoffset = offset;
    
    const effTxt = document.getElementById('p3EfficacyValText');
    if (effTxt) effTxt.innerText = `${effVal}%`;
  }

  // Executive resolved report values
  if (stage.name === 'SYSTEM RECOVERED') {
    setText('execNodeCountText', '12 Nodes Stable');
    setText('execSavedCostText', '$415,000');
  } else {
    setText('execNodeCountText', 'Telemetry stable');
    setText('execSavedCostText', '$0.00');
  }

  // Incident Replay Scrubbers focus highlight
  document.querySelectorAll('.replay-timeline-node').forEach(node => {
    node.classList.remove('glow-active-card', 'border-accent', 'text-accent', 'bg-accent/15');
    const idx = parseInt(node.getAttribute('data-stage-index'));
    if (idx === state.currentStageIndex) {
      node.classList.add('glow-active-card', 'border-accent', 'text-accent', 'bg-accent/15');
    }
  });

  // Action checklist checkboxes update
  updateActionRemediationList();

  // Page 3 Saved Counter stats
  animateNumber('p3SavedNodesText', stage.nodesSaved, '', ' / 12');
  animateNumber('p3CostAvoidedText', stage.stabilization > 0 ? stage.lossPrevented - 420.4 : 0, '$', 'K', true);

  // System Recovered Screen overlay toggle
  const recoveredScreenOverlay = document.getElementById('system-recovered-overlay');
  if (recoveredScreenOverlay) {
    if (stage.name === 'SYSTEM RECOVERED' && state.currentPage === 'incident') {
      recoveredScreenOverlay.classList.remove('opacity-0', 'pointer-events-none');
      recoveredScreenOverlay.classList.add('opacity-100');
    } else {
      recoveredScreenOverlay.classList.add('opacity-0', 'pointer-events-none');
      recoveredScreenOverlay.classList.remove('opacity-100');
    }
  }

  // Highlighting active control buttons based on current simulation state index
  const btnAnomaly = document.getElementById('floatTriggerAnomaly');
  const btnCascade = document.getElementById('floatTriggerCascade');
  const btnRecovery = document.getElementById('floatTriggerRecovery');
  const btnReset = document.getElementById('floatTriggerReset');
  
  [btnAnomaly, btnCascade, btnRecovery, btnReset].forEach(b => b?.classList.remove('glow-active-card', 'border-accent'));
  if (state.currentStageIndex === 1) btnAnomaly?.classList.add('glow-active-card');
  if (state.currentStageIndex === 2) btnCascade?.classList.add('glow-active-card');
  if (state.currentStageIndex >= 3 && state.currentStageIndex < 5) btnRecovery?.classList.add('glow-active-card');
  if (state.currentStageIndex === 0) btnReset?.classList.add('glow-active-card');
}

// Generate inline CSS SVG Sparklines for telemetry cells
function renderMiniSparkline(elementId, dataset, riskLevel) {
  const container = document.getElementById(elementId);
  if (!container) return;

  const w = container.clientWidth || 100;
  const h = 32;

  // Select color
  let strokeColor = '#10B981'; // Green
  if (riskLevel >= 75 && (elementId.includes('latency') || elementId.includes('loss') || elementId.includes('cpu'))) {
    strokeColor = '#EF4444'; // Red
  } else if (riskLevel >= 30 && elementId.includes('gpu')) {
    strokeColor = '#F59E0B'; // Amber
  }

  let pointsStr = '';
  dataset.forEach((val, i) => {
    const cx = (i / (dataset.length - 1)) * w;
    const maxVal = Math.max(...dataset, 10);
    const cy = h - (val / maxVal) * (h - 6) - 3;
    pointsStr += `${cx},${cy} `;
  });

  container.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">
    <polyline fill="none" stroke="${strokeColor}" stroke-width="1.5" points="${pointsStr}" />
  </svg>`;
}

// Orchestrate Mitigation checklists on Page 3
function updateActionRemediationList() {
  const currentStage = resolveActiveStage();
  const stab = currentStage.stabilization || 0;

  const checklistItems = [
    { key: 'cooling', selector: '#checkCooling', remediateAt: 0, completeAt: 25 },
    { key: 'migrate', selector: '#checkMigrate', remediateAt: 0, completeAt: 45 },
    { key: 'isolate', selector: '#checkIsolate', remediateAt: 45, completeAt: 80 },
    { key: 'reroute', selector: '#checkReroute', remediateAt: 80, completeAt: 100 }
  ];

  checklistItems.forEach((item) => {
    const el = document.querySelector(item.selector);
    const checkEl = el?.querySelector('.action-check');
    const badgeEl = el?.querySelector('.action-badge');

    if (!el || !checkEl || !badgeEl) return;

    if (stab >= item.completeAt) {
      el.className = "flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.01] transition-all duration-300 shadow-glowGreen";
      checkEl.innerHTML = `<i data-lucide="check-circle-2" class="w-4.5 h-4.5 text-emerald-500"></i>`;
      badgeEl.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500";
      badgeEl.innerText = "COMPLETE";
    } else if (stab > item.remediateAt) {
      el.className = "flex items-center justify-between p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.02] transition-all duration-300 shadow-glowCyan";
      checkEl.innerHTML = `<i data-lucide="loader" class="w-4.5 h-4.5 text-cyan-500 animate-spin"></i>`;
      badgeEl.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-500 animate-pulse";
      badgeEl.innerText = "ACTIVE";
    } else {
      el.className = "flex items-center justify-between p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.005] transition-all duration-300";
      checkEl.innerHTML = `<i data-lucide="circle-dot" class="w-4.5 h-4.5 text-amber-500/40"></i>`;
      badgeEl.className = "text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20";
      badgeEl.innerText = "PENDING";
    }
  });

  createIconsSafe();
}

// Render dynamic Activity Logs Table rows + Alert Center segregation
function updateLiveLogs() {
  const logTbody = document.getElementById('log-table-rows');
  if (!logTbody) return;

  logTbody.innerHTML = '';
  
  // Wipe Alert counts
  let critCount = 0;
  let warnCount = 0;
  let recovCount = 0;
  let infoCount = 0;

  // Render logs in reverse order (newest first)
  [...state.logs].reverse().forEach(log => {
    let icon = 'info';
    let bgBadge = 'bg-slate-500/10 text-slate-500';

    if (log.type === 'success') {
      icon = 'check-circle-2';
      bgBadge = 'bg-emerald-500/10 text-emerald-500';
      recovCount++;
    } else if (log.type === 'warning') {
      icon = 'alert-triangle';
      bgBadge = 'bg-amber-500/10 text-amber-500';
      warnCount++;
    } else if (log.type === 'danger') {
      icon = 'shield-alert';
      bgBadge = 'bg-red-500/10 text-red-500';
      critCount++;
    } else {
      infoCount++;
    }

    const tr = document.createElement('tr');
    tr.className = "border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors duration-150 animate-fade-in";
    tr.innerHTML = `
      <td class="py-3 px-4 font-mono text-[10px] text-slate-400 dark:text-slate-500">${log.time}</td>
      <td class="py-3 px-4">
        <span class="inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-bold ${bgBadge}">
          <i data-lucide="${icon}" class="w-3 h-3 mr-1"></i>
          ${log.type.toUpperCase()}
        </span>
      </td>
      <td class="py-3 px-4 text-xs text-slate-700 dark:text-slate-300 font-medium font-mono">[${log.actor}] ${log.msg}</td>
    `;

    logTbody.appendChild(tr);
  });

  // Update dynamic alert center panel badges
  const cBadge = document.getElementById('badgeCritCount');
  if (cBadge) cBadge.innerText = critCount;
  const wBadge = document.getElementById('badgeWarnCount');
  if (wBadge) wBadge.innerText = warnCount;
  const rBadge = document.getElementById('badgeRecovCount');
  if (rBadge) rBadge.innerText = recovCount;
  const iBadge = document.getElementById('badgeInfoCount');
  if (iBadge) iBadge.innerText = infoCount;
  
  createIconsSafe();
}

// Update Self-Healing Workflow Steps Visuals (Page 3 Header checklist tracker)
function updateSelfHealingWorkflow() {
  const container = document.getElementById('workflow-steps-indicator');
  if (!container) return;

  const steps = ['Detect', 'Analyze', 'Isolate', 'Recover', 'Validate', 'Complete'];
  const stage = resolveActiveStage();

  let html = '';
  steps.forEach((step, idx) => {
    const isCompleted = stage.workflowCompletedIndices.includes(idx);
    const isActive = stage.workflowStep === step;

    let ringClass = 'border-slate-200 dark:border-slate-800 text-slate-400 bg-white dark:bg-slate-900';
    let textClass = 'text-slate-400';

    if (isCompleted) {
      ringClass = 'border-emerald-500 bg-emerald-500/10 text-emerald-500 shadow-glowGreen';
      textClass = 'text-emerald-500 font-semibold';
    }
    if (isActive) {
      ringClass = 'border-primary bg-primary/10 text-primary dark:text-indigo-300 shadow-glow animate-pulse';
      textClass = 'text-primary dark:text-indigo-400 font-bold';
    }

    html += `
      <div class="flex items-center flex-1 relative min-w-[90px]">
        <!-- Pipeline link connector -->
        ${idx < steps.length - 1 ? `
          <div class="absolute left-[70%] w-[65%] h-[2px] bg-slate-200 dark:bg-slate-800 z-0">
            <div class="h-full bg-primary transition-all duration-500" style="width: ${isCompleted ? '100' : '0'}%"></div>
          </div>
        ` : ''}

        <div class="flex flex-col items-center z-10 mx-auto">
          <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs tracking-wider transition-colors duration-300 ${ringClass}">
            ${isCompleted ? '<i data-lucide="check" class="w-4 h-4"></i>' : idx + 1}
          </div>
          <span class="text-[9px] font-bold tracking-wider mt-2 uppercase transition-all duration-300 ${textClass}">${step}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  createIconsSafe();
}

// Core Simulation Scenario engine
async function startInteractiveSimulation() {
  if (state.simulationActive) return;

  state.simulationActive = true;
  state.currentStageIndex = 0;
  
  // Transition views to the operations center so they see the impact immediately!
  switchPageView('monitoring');

  try {
    await ensureDatasetLoaded();
  } catch (error) {
    console.warn('Dataset upload failed before simulation:', error);
    state.logs.push({
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      type: 'danger',
      actor: 'Dataset Loader',
      msg: error.message || 'Selected CSV could not be loaded',
    });
    refreshLiveViews();
    state.simulationActive = false;
    return;
  }

  fetchJson('/simulate/run', {
    method: 'POST',
    body: JSON.stringify({
      nodes: 1,
      inject_anomaly: false,
    }),
  })
    .then((result) => {
      applySimulationResult('run-simulation', result);
      connectBackendStream();
      startBackendRefreshLoop();
      refreshLiveViews();
      return syncBackendState();
    })
    .then((connected) => {
      if (!connected) {
        refreshLiveViews();
      }
    })
    .catch((error) => {
      console.warn('Backend run simulation failed. Waiting for Operator override.', error);
    });
}

// Load exact properties of selected simulation stages
function loadSimulationStage(index) {
  const stage = simulationStages[index];
  
  // Dynamic alerts
  let alertType = 'info';
  if (stage.name.includes('ANOMALY')) alertType = 'warning';
  if (stage.name.includes('CASCADE')) alertType = 'danger';
  if (stage.name.includes('RECOVERED')) alertType = 'success';

  // Inject logs into table
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  stage.logs.forEach(logMsg => {
    let msg = logMsg;
    let actor = stage.name.includes('RECOVER') ? 'AI Remediation Engine' : 'AI Core Scanner';
    let currentType = alertType;
    
    if (stage.name.includes('SELF-HEALING') || stage.name.includes('RECOVERY') || stage.name.includes('RECOVERED')) {
      if (logMsg.toLowerCase().includes('workload migration') || logMsg.toLowerCase().includes('migrated')) {
        actor = 'Backend Pipeline';
        msg = 'workload-migration -> complete';
        currentType = 'success';
      } else if (logMsg.toLowerCase().includes('standby-spare-11') || logMsg.toLowerCase().includes('standby host')) {
        actor = 'Remediation Engine';
        msg = 'standby-spare-activation -> sync-complete';
        currentType = 'success';
      } else if (logMsg.toLowerCase().includes('rerouting') || logMsg.toLowerCase().includes('packet loss')) {
        actor = 'Gateway Router';
        msg = 'route-isolation -> db-cluster-isolated';
        currentType = 'success';
      } else if (logMsg.toLowerCase().includes('cooling') || logMsg.toLowerCase().includes('temperature dropped') || logMsg.toLowerCase().includes('fan')) {
        actor = 'Thermal Controller';
        msg = 'auxiliary-fans-overdrive -> complete';
        currentType = 'success';
      } else if (logMsg.toLowerCase().includes('sequence fully completed') || logMsg.toLowerCase().includes('recovery achieved')) {
        actor = 'Backend Pipeline';
        msg = 'run-simulation-completed -> healthy';
        currentType = 'success';
      }
    }

    state.logs.push({
      time: timeStr,
      type: currentType,
      actor: actor,
      msg: msg
    });
  });

  // Prune history to avoid memory leaks
  if (state.logs.length > 30) {
    state.logs.shift();
  }

  // Update dynamic chart values
  historyPoints.push({
    x: historyPoints.length * 10,
    risk: stage.riskScore,
    load: Math.round(stage.cpu * 0.95)
  });

  if (historyPoints.length > 10) {
    historyPoints.shift();
    // Re-scale X indices to keep alignment inside chart
    historyPoints.forEach((pt, i) => {
      pt.x = i * 10;
    });
  }

  // Redraw all components
  renderTopologies();
  renderArchitectureFlow();
  renderTimelineChart();
  renderBlastRadiusChart();
  updateDashboardMetrics();
  updateLiveLogs();
  updateSelfHealingWorkflow();
  updateTelemetryGauge();
}

// Manual Override Mitigations clicker (Page 3)
async function triggerManualMitigation(actionName, cardEl) {
  if (state.currentStageIndex !== 2) { // Only available during active crisis
    alert('Mitigation manual overrides are optimized for high-crisis cascade phases. Active during "CASCADE PREDICTED" state.');
    return;
  }

  // Shorten the simulation phase to proceed to recovery instantly on manual intervention!
  clearInterval(state.simulationInterval);
  
  // Flash element
  cardEl.classList.add('scale-95', 'opacity-50');
  setTimeout(() => {
    cardEl.classList.remove('scale-95', 'opacity-50');
  }, 150);

  // Push remediation log
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  state.logs.push({
    time: timeStr,
    type: 'success',
    actor: 'Infrastructure Commander',
    msg: `MANUAL INTERVENTION: Override issued - "${actionName.toUpperCase()}". Force executing AI self-healing.`
  });

  try {
    const result = await fetchJson('/heal', {
      method: 'POST',
      body: JSON.stringify({ action: actionName }),
    });
    applySimulationResult('manual-mitigation', result);
    connectBackendStream();
    startBackendRefreshLoop();
    refreshLiveViews();
  } catch (error) {
    console.warn('Manual mitigation failed, falling back to local remediation:', error);

    // Progress to mitigation state instantly!
    state.currentStageIndex = 3;
    loadSimulationStage(3);

    // Resume remaining simulation stages
    state.simulationInterval = setInterval(() => {
      state.currentStageIndex++;
      if (state.currentStageIndex >= simulationStages.length) {
        clearInterval(state.simulationInterval);
        state.simulationActive = false;
        return;
      }
      loadSimulationStage(state.currentStageIndex);
    }, DATA_REFRESH_INTERVAL_MS);
  }
}
