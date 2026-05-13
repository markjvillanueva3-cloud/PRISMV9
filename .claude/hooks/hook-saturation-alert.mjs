// tier: T3
/**
 * hook_saturation_alert — USSH Phase 0.25
 * ========================================
 *
 * Monitors hook pipeline saturation using queueing theory.
 * Alerts when utilization ρ > 0.8 (system approaching saturation).
 *
 * Fires: PostToolUse
 * Theory: Little's Law (L = λW), M/M/1 queue analysis
 */

import fs from 'fs';
import path from 'path';

const TELEMETRY_FILE = 'H:/prism/mcp-server/data/state/hook-telemetry.json';
const SATURATION_THRESHOLD = 0.8;
const WINDOW_SIZE = 100; // Rolling window for rate calculation

function loadTelemetry() {
  try {
    if (fs.existsSync(TELEMETRY_FILE)) {
      return JSON.parse(fs.readFileSync(TELEMETRY_FILE, 'utf-8'));
    }
  } catch {}
  return {
    arrivals: [],      // timestamps of tool calls
    serviceTimes: [],  // hook execution times in ms
    alerts: 0,
    lastAlert: 0
  };
}

function saveTelemetry(telemetry) {
  try {
    fs.mkdirSync(path.dirname(TELEMETRY_FILE), { recursive: true });
    fs.writeFileSync(TELEMETRY_FILE, JSON.stringify(telemetry, null, 2));
  } catch {}
}

function computeMetrics(telemetry) {
  const now = Date.now();

  // Filter to recent window
  const recentArrivals = telemetry.arrivals.filter(t => now - t < 60000);
  const recentServices = telemetry.serviceTimes.slice(-WINDOW_SIZE);

  if (recentArrivals.length < 2 || recentServices.length < 2) {
    return null;
  }

  // Arrival rate λ (per second)
  const windowDuration = (recentArrivals[recentArrivals.length - 1] - recentArrivals[0]) / 1000;
  const lambda = windowDuration > 0 ? recentArrivals.length / windowDuration : 0;

  // Service rate μ (per second)
  const avgServiceTime = recentServices.reduce((a, b) => a + b, 0) / recentServices.length;
  const mu = avgServiceTime > 0 ? 1000 / avgServiceTime : Infinity;

  // Utilization ρ = λ/μ
  const rho = mu > 0 ? lambda / mu : 0;

  // Average queue length (M/M/1): L_q = ρ²/(1-ρ)
  const Lq = rho < 1 ? (rho * rho) / (1 - rho) : Infinity;

  // Average wait time: W_q = L_q/λ
  const Wq = lambda > 0 ? Lq / lambda : 0;

  return {
    arrivalRate: lambda,
    serviceRate: mu,
    utilization: rho,
    avgQueueLength: Lq,
    avgWaitTime: Wq,
    avgServiceTimeMs: avgServiceTime
  };
}

export default async function hookSaturationAlert({ tool_name, duration_ms }) {
  const telemetry = loadTelemetry();
  const now = Date.now();

  // Record arrival
  telemetry.arrivals.push(now);
  if (telemetry.arrivals.length > WINDOW_SIZE * 2) {
    telemetry.arrivals = telemetry.arrivals.slice(-WINDOW_SIZE);
  }

  // Record service time (estimate from duration if available)
  const serviceTime = duration_ms || 50; // default 50ms
  telemetry.serviceTimes.push(serviceTime);
  if (telemetry.serviceTimes.length > WINDOW_SIZE * 2) {
    telemetry.serviceTimes = telemetry.serviceTimes.slice(-WINDOW_SIZE);
  }

  // Compute metrics
  const metrics = computeMetrics(telemetry);

  if (!metrics) {
    saveTelemetry(telemetry);
    return { proceed: true };
  }

  // Check for saturation
  const messages = [];

  if (metrics.utilization > SATURATION_THRESHOLD) {
    // Rate limit alerts (max 1 per minute)
    if (now - telemetry.lastAlert > 60000) {
      telemetry.alerts++;
      telemetry.lastAlert = now;

      messages.push(
        `[SATURATION] Hook pipeline at ${(metrics.utilization * 100).toFixed(0)}% utilization (threshold: ${SATURATION_THRESHOLD * 100}%)`,
        `  λ=${metrics.arrivalRate.toFixed(2)}/s, μ=${metrics.serviceRate.toFixed(2)}/s, L_q=${metrics.avgQueueLength.toFixed(1)}`,
        `  Consider: reduce parallel operations, optimize slow hooks, or increase capacity`
      );
    }
  }

  saveTelemetry(telemetry);

  if (messages.length > 0) {
    return {
      proceed: true,
      message: messages.join('\n')
    };
  }

  return { proceed: true };
}
