#!/usr/bin/env npx tsx
/**
 * Phase Space Analyzer — Phase 0.25
 * ===================================
 * Analyzes session state trajectories through phase space.
 * Identifies attractors, basins, and bifurcation points.
 *
 * Theory: Dynamical systems, attractor basins, bifurcation
 * Usage: npx tsx scripts/phase_space_analyzer.ts
 */

import * as fs from "fs";
import * as path from "path";

interface StatePoint {
  awareness: number;
  omega: number;
  sx: number;
  timestamp: string;
}

interface Attractor {
  name: string;
  center: [number, number, number];
  basin: StatePoint[];
  stability: "stable" | "unstable" | "saddle";
}

interface PhaseSpaceReport {
  timestamp: string;
  totalPoints: number;
  trajectory: StatePoint[];
  attractors: Attractor[];
  currentBasin: string;
  bifurcationRisk: number;
  recommendations: string[];
}

const ATTRACTORS: Attractor[] = [
  {
    name: "healthy",
    center: [0.9, 1.0, 0.85],
    basin: [],
    stability: "stable",
  },
  {
    name: "degraded",
    center: [0.7, 0.6, 0.70],
    basin: [],
    stability: "stable",
  },
  {
    name: "failed",
    center: [0.4, 0.3, 0.50],
    basin: [],
    stability: "stable",
  },
];

function distance(p: StatePoint, center: [number, number, number]): number {
  return Math.sqrt(
    (p.awareness - center[0]) ** 2 +
      (p.omega - center[1]) ** 2 +
      (p.sx - center[2]) ** 2
  );
}

function classifyPoint(p: StatePoint): string {
  let closest = "unknown";
  let minDist = Infinity;

  for (const attractor of ATTRACTORS) {
    const d = distance(p, attractor.center);
    if (d < minDist) {
      minDist = d;
      closest = attractor.name;
    }
  }

  return minDist < 0.3 ? closest : "transition";
}

function computeBifurcationRisk(trajectory: StatePoint[]): number {
  if (trajectory.length < 10) return 0;

  const recentBasins = trajectory.slice(-10).map(classifyPoint);
  const transitions = recentBasins.filter((b, i) => i > 0 && b !== recentBasins[i - 1]).length;

  return Math.min(transitions / 5, 1);
}

function loadTrajectory(): StatePoint[] {
  const historyPath = path.join(process.cwd(), "data/state/session-state-history.json");
  try {
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, "utf-8"));
    }
  } catch {}

  return Array(20)
    .fill(null)
    .map((_, i) => ({
      awareness: 0.85 + Math.sin(i * 0.3) * 0.1,
      omega: 0.9 + Math.cos(i * 0.2) * 0.15,
      sx: 0.8 + Math.sin(i * 0.25) * 0.1,
      timestamp: new Date(Date.now() - (20 - i) * 60000).toISOString(),
    }));
}

async function main(): Promise<void> {
  console.log("=== Phase Space Analysis ===\n");

  const trajectory = loadTrajectory();

  for (const attractor of ATTRACTORS) {
    attractor.basin = trajectory.filter((p) => classifyPoint(p) === attractor.name);
  }

  const currentPoint = trajectory[trajectory.length - 1];
  const currentBasin = classifyPoint(currentPoint);
  const bifurcationRisk = computeBifurcationRisk(trajectory);

  console.log(`Trajectory points: ${trajectory.length}`);
  console.log(`\nCurrent state:`);
  console.log(`  awareness: ${currentPoint.awareness.toFixed(3)}`);
  console.log(`  omega: ${currentPoint.omega.toFixed(3)}`);
  console.log(`  S(x): ${currentPoint.sx.toFixed(3)}`);
  console.log(`  Basin: ${currentBasin}`);

  console.log("\nAttractor basins:");
  for (const attractor of ATTRACTORS) {
    const pct = trajectory.length > 0 ? ((attractor.basin.length / trajectory.length) * 100).toFixed(1) : "0";
    console.log(`  ${attractor.name}: ${attractor.basin.length} points (${pct}%)`);
  }

  console.log(`\nBifurcation risk: ${(bifurcationRisk * 100).toFixed(0)}%`);

  const recommendations: string[] = [];
  if (currentBasin === "degraded") {
    recommendations.push("System in degraded basin — take action to move toward healthy attractor");
  }
  if (currentBasin === "failed") {
    recommendations.push("CRITICAL: System in failed basin — immediate intervention required");
  }
  if (bifurcationRisk > 0.5) {
    recommendations.push("High bifurcation risk — system trajectory unstable");
  }
  if (currentBasin === "transition") {
    recommendations.push("System between basins — monitor closely");
  }

  if (recommendations.length > 0) {
    console.log("\nRecommendations:");
    recommendations.forEach((r) => console.log(`  ⚠ ${r}`));
  } else {
    console.log("\n✓ System stable in healthy basin");
  }

  const report: PhaseSpaceReport = {
    timestamp: new Date().toISOString(),
    totalPoints: trajectory.length,
    trajectory: trajectory.slice(-50),
    attractors: ATTRACTORS,
    currentBasin,
    bifurcationRisk,
    recommendations,
  };

  const outPath = path.join(process.cwd(), "data/state/phase-space-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved to ${outPath}`);
}

main().catch(console.error);
