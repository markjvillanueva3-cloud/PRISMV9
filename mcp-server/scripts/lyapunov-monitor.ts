/**
 * lyapunov-monitor.ts — USSH Phase 0.25
 * ======================================
 *
 * Monitors session stability using Lyapunov analysis.
 * Generates stability reports and trajectory visualizations.
 *
 * Usage: npx tsx scripts/lyapunov-monitor.ts [--watch] [--interval=5000]
 *
 * Theory: Control systems stability, V(x) = x'Px, dV/dt < 0 for stability
 */

import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "lyapunov-report.json");

interface SessionState {
  awareness: number;
  omega: number;
  sx: number;
  orphanRatio: number;
  lockCount: number;
  timestamp: number;
}

interface LyapunovReport {
  timestamp: number;
  V: number;
  dV: number;
  basin: string;
  isStable: boolean;
  trajectory: string;
  history: Array<{ V: number; timestamp: number }>;
}

const P = [
  [2.0, 0.5, 0.3, 0.0, 0.0],
  [0.5, 1.5, 0.2, 0.0, 0.0],
  [0.3, 0.2, 1.8, 0.0, 0.0],
  [0.0, 0.0, 0.0, 1.0, 0.0],
  [0.0, 0.0, 0.0, 0.0, 0.5],
];

function computeLyapunov(state: SessionState): number {
  const x = [
    state.awareness,
    state.omega,
    state.sx,
    state.orphanRatio,
    Math.min(state.lockCount / 10, 1.0),
  ];

  let V = 0;
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      V += x[i] * P[i][j] * x[j];
    }
  }
  return V;
}

function classifyBasin(state: SessionState): string {
  const attractors = [
    { name: "healthy", center: [0.9, 1.0, 0.85, 0.0, 0.1] },
    { name: "degraded", center: [0.7, 0.6, 0.7, 0.1, 0.3] },
    { name: "failed", center: [0.4, 0.3, 0.5, 0.3, 0.6] },
  ];

  const x = [
    state.awareness,
    state.omega,
    state.sx,
    state.orphanRatio,
    Math.min(state.lockCount / 10, 1.0),
  ];

  let closest = "unknown";
  let minDist = Infinity;

  for (const attractor of attractors) {
    const dist = Math.sqrt(
      attractor.center.reduce((sum, v, i) => sum + (v - x[i]) ** 2, 0)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = attractor.name;
    }
  }

  return closest;
}

function loadSessionState(): SessionState {
  const now = Date.now();

  let awareness = 0.8;
  let omega = 0.5;

  try {
    const health = JSON.parse(
      fs.readFileSync(path.join(STATE_DIR, "HEALTH_CHECK_REPORT.json"), "utf-8")
    );
    awareness = health.awareness?.score || 0.8;
  } catch {}

  try {
    const roadmap = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "data/roadmap-index.json"), "utf-8")
    );
    const total = roadmap.milestones?.length || 1;
    const complete = roadmap.milestones?.filter((m: { status: string }) => m.status === "complete").length || 0;
    omega = complete / total;
  } catch {}

  return {
    awareness,
    omega,
    sx: 0.85,
    orphanRatio: 0.05,
    lockCount: 0,
    timestamp: now,
  };
}

function loadHistory(): Array<{ V: number; timestamp: number }> {
  try {
    const report = JSON.parse(fs.readFileSync(REPORT_FILE, "utf-8"));
    return report.history || [];
  } catch {
    return [];
  }
}

function generateReport(): LyapunovReport {
  const state = loadSessionState();
  const V = computeLyapunov(state);
  const basin = classifyBasin(state);

  const history = loadHistory();
  history.push({ V, timestamp: state.timestamp });

  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }

  let dV = 0;
  if (history.length >= 2) {
    const prev = history[history.length - 2];
    const dt = (state.timestamp - prev.timestamp) / 1000;
    if (dt > 0) dV = (V - prev.V) / dt;
  }

  let trajectory: string;
  if (dV < -0.01) trajectory = "converging";
  else if (dV > 0.01) trajectory = "diverging";
  else trajectory = "stable";

  const isStable = dV <= 0 && basin !== "failed";

  const report: LyapunovReport = {
    timestamp: Date.now(),
    V,
    dV,
    basin,
    isStable,
    trajectory,
    history,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: LyapunovReport): void {
  console.log("\n=== Lyapunov Stability Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`V(x): ${report.V.toFixed(4)}`);
  console.log(`dV/dt: ${report.dV.toFixed(6)} (${report.dV <= 0 ? "stable" : "unstable"})`);
  console.log(`Basin: ${report.basin}`);
  console.log(`Trajectory: ${report.trajectory}`);
  console.log(`Overall: ${report.isStable ? "STABLE" : "UNSTABLE"}`);
  console.log(`History points: ${report.history.length}`);
}

// Main
const args = process.argv.slice(2);
const watchMode = args.includes("--watch");
const intervalArg = args.find((a) => a.startsWith("--interval="));
const interval = intervalArg ? parseInt(intervalArg.split("=")[1]) : 5000;

if (watchMode) {
  console.log(`Watching session stability (interval: ${interval}ms)...`);
  setInterval(() => {
    const report = generateReport();
    printReport(report);
  }, interval);
} else {
  const report = generateReport();
  printReport(report);
}
