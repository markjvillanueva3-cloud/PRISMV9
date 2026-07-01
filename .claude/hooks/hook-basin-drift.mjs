// tier: T3
/**
 * hook_basin_drift — USSH Phase 0.25
 * ====================================
 *
 * Detects when session state drifts between attractor basins.
 * Uses phase space analysis to identify trajectory changes.
 *
 * Fires: PostToolUse (every 20 tool calls)
 * Theory: Dynamical systems, attractor basins, bifurcation detection
 */

import fs from 'fs';

const STATE_FILE = 'H:/prism/mcp-server/data/state/basin-drift-state.json';
const CHECK_INTERVAL = 20;

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
  return {
    toolCallCount: 0,
    basinHistory: [],
    lastBasin: null,
    driftEvents: []
  };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

function estimateSessionMetrics() {
  let awareness = 0.8, omega = 0.5, sx = 0.85;

  try {
    const health = JSON.parse(fs.readFileSync('H:/prism/mcp-server/data/state/HEALTH_CHECK_REPORT.json', 'utf-8'));
    awareness = ({pass:0.95,healthy:0.95,ok:0.95,operational:0.9,warning:0.6,degraded:0.6,fail:0.3,failed:0.3,critical:0.2})[String(health.status||"").toLowerCase()] ?? 0.8;
  } catch {}

  try {
    const roadmap = JSON.parse(fs.readFileSync('H:/prism/mcp-server/data/roadmap-index.json', 'utf-8'));
    const total = roadmap.milestones?.length || 1;
    const complete = roadmap.milestones?.filter(m => m.status === 'complete').length || 0;
    omega = complete / total;
  } catch {}

  return { awareness, omega, sx };
}

function classifyBasin(metrics) {
  const attractors = [
    { name: 'healthy', center: [0.9, 1.0, 0.85] },
    { name: 'degraded', center: [0.7, 0.6, 0.70] },
    { name: 'failed', center: [0.4, 0.3, 0.50] }
  ];

  const state = [metrics.awareness, metrics.omega, metrics.sx];

  let closest = attractors[0];
  let minDist = Infinity;

  for (const attractor of attractors) {
    const dist = Math.sqrt(
      attractor.center.reduce((sum, v, i) => sum + (v - state[i]) ** 2, 0)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = attractor;
    }
  }

  return {
    basin: closest.name,
    distance: minDist,
    confidence: 1 / (1 + minDist)
  };
}

export default async function hookBasinDrift({ tool_name }) {
  const state = loadState();
  state.toolCallCount++;

  // Only check every N tool calls
  if (state.toolCallCount % CHECK_INTERVAL !== 0) {
    saveState(state);
    return { proceed: true };
  }

  const metrics = estimateSessionMetrics();
  const classification = classifyBasin(metrics);

  // Track basin history
  state.basinHistory.push({
    basin: classification.basin,
    confidence: classification.confidence,
    timestamp: Date.now()
  });

  if (state.basinHistory.length > 50) {
    state.basinHistory = state.basinHistory.slice(-50);
  }

  // Detect drift
  const messages = [];

  if (state.lastBasin && state.lastBasin !== classification.basin) {
    const driftEvent = {
      from: state.lastBasin,
      to: classification.basin,
      timestamp: Date.now()
    };
    state.driftEvents.push(driftEvent);

    if (state.driftEvents.length > 20) {
      state.driftEvents = state.driftEvents.slice(-20);
    }

    // Determine drift severity
    const basinOrder = ['healthy', 'degraded', 'failed'];
    const fromIdx = basinOrder.indexOf(state.lastBasin);
    const toIdx = basinOrder.indexOf(classification.basin);

    if (toIdx > fromIdx) {
      // Degrading
      messages.push(
        `[BASIN-DRIFT] Session transitioned from ${state.lastBasin} → ${classification.basin} basin`,
        `  Current metrics: awareness=${metrics.awareness.toFixed(2)}, omega=${metrics.omega.toFixed(2)}, S(x)=${metrics.sx.toFixed(2)}`,
        `  Consider: stabilize before continuing complex work`
      );
    } else {
      // Improving
      messages.push(
        `[BASIN-DRIFT] Session improved from ${state.lastBasin} → ${classification.basin} basin`
      );
    }
  }

  state.lastBasin = classification.basin;
  saveState(state);

  if (messages.length > 0) {
    return {
      proceed: true,
      message: messages.join('\n')
    };
  }

  return { proceed: true };
}
