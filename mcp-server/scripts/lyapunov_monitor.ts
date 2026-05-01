#!/usr/bin/env npx tsx
/**
 * Lyapunov Stability Monitor — Phase 0.25
 * ========================================
 * Monitors session state stability using Lyapunov function V(x) = x'Px.
 * Warns if V̇(x) > 0 (system becoming unstable).
 *
 * Theory: Lyapunov stability for dynamical systems
 * Usage: npx tsx scripts/lyapunov_monitor.ts
 */

import * as fs from "fs";
import * as path from "path";

interface SessionState {
  awareness: number;
  omega: number;
  sx: number;
  orphanCount: number;
  timestamp: string;
}

interface LyapunovReport {
  timestamp: string;
  currentState: SessionState;
  lyapunovValue: number;
  lyapunovDerivative: number;
  isStable: boolean;
  basin: "healthy" | "degraded" | "failed" | "unknown";
  recommendation: string;
}

const STATE_PATH = path.join(process.cwd(), "data/state/session-state-history.json");
const P_MATRIX = [
  [1.0, 0.2, 0.1],
  [0.2, 1.0, 0.15],
  [0.1, 0.15, 1.0],
];

function loadStateHistory(): SessionState[] {
  try {
    if (fs.existsSync(STATE_PATH)) {
      return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    }
  } catch {}
  return [];
}

function stateToVector(s: SessionState): number[] {
  return [s.awareness, s.omega, s.sx];
}

function computeLyapunov(x: number[]): number {
  let result = 0;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result += x[i] * P_MATRIX[i][j] * x[j];
    }
  }
  return result;
}

function detectBasin(x: number[]): "healthy" | "degraded" | "failed" | "unknown" {
  const attractors = {
    healthy: [0.9, 1.0, 0.85],
    degraded: [0.7, 0.6, 0.70],
    failed: [0.4, 0.3, 0.50],
  };

  let closest: "healthy" | "degraded" | "failed" = "healthy";
  let minDist = Infinity;

  for (const [basin, attractor] of Object.entries(attractors)) {
    const dist = Math.sqrt(
      x.reduce((sum, v, i) => sum + (v - attractor[i]) ** 2, 0)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = basin as "healthy" | "degraded" | "failed";
    }
  }

  return minDist < 0.3 ? closest : "unknown";
}

async function main(): Promise<void> {
  const history = loadStateHistory();

  if (history.length < 2) {
    console.log("Insufficient state history for Lyapunov analysis");
    return;
  }

  const current = history[history.length - 1];
  const previous = history[history.length - 2];

  const xCurrent = stateToVector(current);
  const xPrevious = stateToVector(previous);

  const vCurrent = computeLyapunov(xCurrent);
  const vPrevious = computeLyapunov(xPrevious);

  const dt = (new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime()) / 1000;
  const vDot = dt > 0 ? (vCurrent - vPrevious) / dt : 0;

  const isStable = vDot <= 0;
  const basin = detectBasin(xCurrent);

  const report: LyapunovReport = {
    timestamp: new Date().toISOString(),
    currentState: current,
    lyapunovValue: vCurrent,
    lyapunovDerivative: vDot,
    isStable,
    basin,
    recommendation: isStable
      ? "System stable, maintain current trajectory"
      : vDot > 0.1
        ? "WARNING: Rapid destabilization, consider intervention"
        : "Mild instability, monitor closely",
  };

  console.log("=== Lyapunov Stability Report ===");
  console.log(`State: awareness=${current.awareness.toFixed(2)}, omega=${current.omega.toFixed(2)}, S(x)=${current.sx.toFixed(2)}`);
  console.log(`V(x) = ${vCurrent.toFixed(4)}`);
  console.log(`V̇(x) = ${vDot.toFixed(6)} ${isStable ? "≤ 0 ✓" : "> 0 ⚠"}`);
  console.log(`Basin: ${basin}`);
  console.log(`Recommendation: ${report.recommendation}`);

  const outPath = path.join(process.cwd(), "data/state/lyapunov-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
}

main().catch(console.error);
