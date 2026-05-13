// tier: T3
/**
 * hook_stability_check — USSH Phase 0.25
 * =======================================
 *
 * Monitors session stability using Lyapunov analysis.
 * Warns when session is drifting toward failed attractor.
 *
 * Fires: PostToolUse (every 10 tool calls)
 * Theory: Control systems stability via SessionStabilityEngine
 */

import fs from 'fs';
import path from 'path';

const STATE_FILE = 'H:/prism/mcp-server/data/state/session-stability-state.json';
const CHECK_INTERVAL = 10; // Check every N tool calls

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch {}
  return { toolCallCount: 0, lastCheck: 0, history: [] };
}

function saveState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

function estimateSessionState() {
  // Estimate current session health metrics
  const now = Date.now();

  // Read awareness score if available
  let awareness = 0.8;
  try {
    const health = JSON.parse(fs.readFileSync('H:/prism/mcp-server/data/state/HEALTH_CHECK_REPORT.json', 'utf-8'));
    awareness = health.awareness?.score || 0.8;
  } catch {}

  // Read omega from roadmap if available
  let omega = 0.5;
  try {
    const roadmap = JSON.parse(fs.readFileSync('H:/prism/mcp-server/data/roadmap-index.json', 'utf-8'));
    const total = roadmap.milestones?.length || 1;
    const complete = roadmap.milestones?.filter(m => m.status === 'complete').length || 0;
    omega = complete / total;
  } catch {}

  // Estimate other metrics
  return {
    awareness,
    omega,
    sx: 0.85, // Default safety score
    orphanRatio: 0.05,
    lockCount: 0,
    timestamp: now
  };
}

function computeLyapunov(state) {
  // V(x) = x'Px for positive definite P
  const P = [
    [2.0, 0.5, 0.3, 0.0, 0.0],
    [0.5, 1.5, 0.2, 0.0, 0.0],
    [0.3, 0.2, 1.8, 0.0, 0.0],
    [0.0, 0.0, 0.0, 1.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.5]
  ];

  const x = [
    state.awareness,
    state.omega,
    state.sx,
    state.orphanRatio,
    Math.min(state.lockCount / 10, 1.0)
  ];

  let V = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      V += x[i] * P[i][j] * x[j];
    }
  }
  return V;
}

function findClosestAttractor(state) {
  const attractors = [
    { name: 'Healthy', state: [0.9, 1.0, 0.85, 0.0, 0.1], basin: 'healthy' },
    { name: 'Degraded', state: [0.7, 0.6, 0.70, 0.1, 0.3], basin: 'degraded' },
    { name: 'Failed', state: [0.4, 0.3, 0.50, 0.3, 0.6], basin: 'failed' }
  ];

  const x = [state.awareness, state.omega, state.sx, state.orphanRatio, Math.min(state.lockCount / 10, 1.0)];

  let closest = attractors[0];
  let minDist = Infinity;

  for (const attractor of attractors) {
    const dist = Math.sqrt(attractor.state.reduce((sum, v, i) => sum + (v - x[i]) ** 2, 0));
    if (dist < minDist) {
      minDist = dist;
      closest = attractor;
    }
  }

  return closest;
}

export default async function hookStabilityCheck({ tool_name }) {
  const state = loadState();
  state.toolCallCount++;

  // Only check every N tool calls
  if (state.toolCallCount % CHECK_INTERVAL !== 0) {
    saveState(state);
    return { proceed: true };
  }

  const sessionState = estimateSessionState();
  const V = computeLyapunov(sessionState);
  const attractor = findClosestAttractor(sessionState);

  // Track history
  state.history.push({ V, basin: attractor.basin, timestamp: sessionState.timestamp });
  if (state.history.length > 20) state.history.shift();

  // Compute trend
  let dV = 0;
  if (state.history.length >= 2) {
    const prev = state.history[state.history.length - 2];
    const dt = (sessionState.timestamp - prev.timestamp) / 1000;
    if (dt > 0) dV = (V - prev.V) / dt;
  }

  state.lastCheck = Date.now();
  saveState(state);

  // Generate warnings
  const messages = [];

  if (attractor.basin === 'failed') {
    messages.push(`[STABILITY] Session in FAILED basin — consider restart or recovery`);
  } else if (attractor.basin === 'degraded' && dV > 0) {
    messages.push(`[STABILITY] Session degrading (dV/dt=${dV.toFixed(3)}) — stabilize before continuing`);
  }

  if (messages.length > 0) {
    return {
      proceed: true,
      message: messages.join('\n')
    };
  }

  return { proceed: true };
}
