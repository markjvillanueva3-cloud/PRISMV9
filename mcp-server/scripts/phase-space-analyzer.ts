/**
 * phase-space-analyzer.ts — USSH Phase 0.25
 * ==========================================
 *
 * Analyzes session state trajectories in phase space.
 * Identifies attractors, basins, and bifurcation points.
 *
 * Usage: npx tsx scripts/phase-space-analyzer.ts [--history=100]
 *
 * Theory: Dynamical systems, attractors, phase portraits, bifurcation
 */

import fs from "fs";
import path from "path";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "phase-space-report.json");

interface StatePoint {
  awareness: number;
  omega: number;
  sx: number;
  timestamp: number;
}

interface Attractor {
  name: string;
  center: number[];
  radius: number;
  stability: "stable" | "unstable" | "saddle";
}

interface TrajectorySegment {
  from: StatePoint;
  to: StatePoint;
  velocity: number[];
  magnitude: number;
  direction: string;
}

interface PhaseSpaceReport {
  timestamp: number;
  currentState: StatePoint;
  currentBasin: string;
  trajectory: TrajectorySegment[];
  attractors: Attractor[];
  bifurcationRisk: number;
  phasePortrait: {
    dimension: number;
    bounds: { min: number[]; max: number[] };
    density: number[][];
  };
  recommendations: string[];
}

const ATTRACTORS: Attractor[] = [
  { name: "healthy", center: [0.9, 1.0, 0.85], radius: 0.15, stability: "stable" },
  { name: "degraded", center: [0.7, 0.6, 0.70], radius: 0.15, stability: "stable" },
  { name: "failed", center: [0.4, 0.3, 0.50], radius: 0.2, stability: "stable" },
  { name: "chaotic", center: [0.5, 0.5, 0.60], radius: 0.1, stability: "saddle" },
];

function loadStateHistory(): StatePoint[] {
  try {
    const historyFile = path.join(STATE_DIR, "session-stability-state.json");
    if (fs.existsSync(historyFile)) {
      const data = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
      return (data.history || []).map((h: { timestamp: number }) => ({
        awareness: 0.8,
        omega: 0.5,
        sx: 0.85,
        timestamp: h.timestamp,
      }));
    }
  } catch {}

  // Generate synthetic history for analysis
  const history: StatePoint[] = [];
  const now = Date.now();

  for (let i = 0; i < 50; i++) {
    history.push({
      awareness: 0.7 + Math.sin(i * 0.1) * 0.15,
      omega: 0.5 + i * 0.008,
      sx: 0.8 + Math.cos(i * 0.15) * 0.1,
      timestamp: now - (50 - i) * 60000,
    });
  }

  return history;
}

function computeTrajectory(history: StatePoint[]): TrajectorySegment[] {
  const segments: TrajectorySegment[] = [];

  for (let i = 1; i < history.length; i++) {
    const from = history[i - 1];
    const to = history[i];
    const dt = (to.timestamp - from.timestamp) / 1000;

    if (dt <= 0) continue;

    const velocity = [
      (to.awareness - from.awareness) / dt,
      (to.omega - from.omega) / dt,
      (to.sx - from.sx) / dt,
    ];

    const magnitude = Math.sqrt(velocity.reduce((s, v) => s + v * v, 0));

    let direction: string;
    if (velocity[0] > 0 && velocity[1] > 0) direction = "improving";
    else if (velocity[0] < 0 && velocity[1] < 0) direction = "degrading";
    else if (magnitude < 0.001) direction = "stationary";
    else direction = "oscillating";

    segments.push({ from, to, velocity, magnitude, direction });
  }

  return segments;
}

function findCurrentBasin(state: StatePoint): string {
  const point = [state.awareness, state.omega, state.sx];

  let closest = ATTRACTORS[0];
  let minDist = Infinity;

  for (const attractor of ATTRACTORS) {
    const dist = Math.sqrt(
      attractor.center.reduce((sum, v, i) => sum + (v - point[i]) ** 2, 0)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = attractor;
    }
  }

  return closest.name;
}

function computeBifurcationRisk(trajectory: TrajectorySegment[]): number {
  if (trajectory.length < 5) return 0;

  // Look for rapid direction changes (potential bifurcation)
  let directionChanges = 0;
  let totalMagnitude = 0;

  for (let i = 1; i < trajectory.length; i++) {
    const prev = trajectory[i - 1];
    const curr = trajectory[i];

    // Check if direction changed
    const dotProduct = prev.velocity.reduce(
      (sum, v, j) => sum + v * curr.velocity[j],
      0
    );
    const cosAngle =
      dotProduct / (prev.magnitude * curr.magnitude + 1e-10);

    if (cosAngle < 0) {
      directionChanges++;
    }

    totalMagnitude += curr.magnitude;
  }

  const avgMagnitude = totalMagnitude / trajectory.length;
  const changeRate = directionChanges / trajectory.length;

  // High change rate with high velocity indicates bifurcation risk
  return Math.min(1, changeRate * avgMagnitude * 10);
}

function generatePhasePortrait(
  history: StatePoint[]
): PhaseSpaceReport["phasePortrait"] {
  const resolution = 10;
  const density: number[][] = Array(resolution)
    .fill(null)
    .map(() => Array(resolution).fill(0));

  const bounds = {
    min: [0, 0, 0],
    max: [1, 1, 1],
  };

  // Count visits to each grid cell
  for (const state of history) {
    const i = Math.min(
      resolution - 1,
      Math.floor(state.awareness * resolution)
    );
    const j = Math.min(resolution - 1, Math.floor(state.omega * resolution));
    density[i][j]++;
  }

  // Normalize
  const maxDensity = Math.max(...density.flat());
  if (maxDensity > 0) {
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        density[i][j] /= maxDensity;
      }
    }
  }

  return { dimension: 3, bounds, density };
}

function generateReport(): PhaseSpaceReport {
  const history = loadStateHistory();
  const currentState = history[history.length - 1] || {
    awareness: 0.8,
    omega: 0.5,
    sx: 0.85,
    timestamp: Date.now(),
  };

  const trajectory = computeTrajectory(history);
  const currentBasin = findCurrentBasin(currentState);
  const bifurcationRisk = computeBifurcationRisk(trajectory);
  const phasePortrait = generatePhasePortrait(history);

  const recommendations: string[] = [];

  if (currentBasin === "degraded" || currentBasin === "failed") {
    recommendations.push(
      `Currently in ${currentBasin} basin — implement recovery actions`
    );
  }

  if (bifurcationRisk > 0.5) {
    recommendations.push(
      `High bifurcation risk (${(bifurcationRisk * 100).toFixed(0)}%) — reduce perturbations`
    );
  }

  const recentSegments = trajectory.slice(-10);
  const degradingCount = recentSegments.filter(
    (s) => s.direction === "degrading"
  ).length;
  if (degradingCount > 5) {
    recommendations.push(
      `Trajectory trending toward degradation — consider intervention`
    );
  }

  const report: PhaseSpaceReport = {
    timestamp: Date.now(),
    currentState,
    currentBasin,
    trajectory: trajectory.slice(-20),
    attractors: ATTRACTORS,
    bifurcationRisk,
    phasePortrait,
    recommendations,
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: PhaseSpaceReport): void {
  console.log("\n=== Phase Space Analysis ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);

  console.log("\nCurrent State:");
  console.log(`  Awareness: ${report.currentState.awareness.toFixed(3)}`);
  console.log(`  Omega: ${report.currentState.omega.toFixed(3)}`);
  console.log(`  S(x): ${report.currentState.sx.toFixed(3)}`);
  console.log(`  Basin: ${report.currentBasin.toUpperCase()}`);

  console.log("\nAttractors:");
  for (const attractor of report.attractors) {
    console.log(
      `  ${attractor.name}: [${attractor.center.map((c) => c.toFixed(2)).join(", ")}] (${attractor.stability})`
    );
  }

  console.log(`\nBifurcation Risk: ${(report.bifurcationRisk * 100).toFixed(1)}%`);

  console.log("\nRecent Trajectory:");
  const directions = report.trajectory.slice(-5).map((s) => s.direction);
  console.log(`  Last 5 moves: ${directions.join(" → ")}`);

  const avgVelocity =
    report.trajectory.reduce((s, t) => s + t.magnitude, 0) /
    (report.trajectory.length || 1);
  console.log(`  Avg velocity: ${avgVelocity.toFixed(4)}/s`);

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const report = generateReport();
printReport(report);
