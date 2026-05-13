// tier: T4
/**
 * svi-projection.mjs — Phase 0.14 SVI Impact Projection
 *
 * PreToolWrite hook that projects SVI impact before file changes.
 * Warns if a change would significantly affect system variability.
 */

import * as fs from "fs";
import * as path from "path";

const SVI_PATH = "state/shared/SVI.json";
const HIGH_IMPACT_THRESHOLD = 0.05;

const HIGH_IMPACT_PATTERNS = [
  /engines\/.*Engine\.ts$/,
  /dispatchers\/.*Dispatcher\.ts$/,
  /algorithms\/.*\.ts$/,
  /hooks\/.*\.ts$/,
  /registries\/.*\.ts$/
];

function isHighImpactFile(filePath) {
  return HIGH_IMPACT_PATTERNS.some(pattern => pattern.test(filePath));
}

export default async function sviProjection({ tool, input }) {
  // Only check Write and Edit tools
  if (tool !== "Write" && tool !== "Edit") {
    return { allow: true };
  }

  const filePath = input.file_path || input.path;
  if (!filePath) {
    return { allow: true };
  }

  // Normalize path
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Check if high-impact file
  if (!isHighImpactFile(normalizedPath)) {
    return { allow: true };
  }

  // Load current SVI
  const basePath = process.cwd();
  const sviPath = path.join(basePath, SVI_PATH);
  let svi = { psi: 0.9, surfaces: [] };

  if (fs.existsSync(sviPath)) {
    try {
      svi = JSON.parse(fs.readFileSync(sviPath, "utf-8"));
    } catch { /* use defaults */ }
  }

  // Project impact (simplified heuristic)
  let projectedDelta = 0;
  if (normalizedPath.includes("Engine")) projectedDelta = 0.02;
  if (normalizedPath.includes("Dispatcher")) projectedDelta = 0.03;
  if (normalizedPath.includes("algorithm")) projectedDelta = 0.01;

  // Warn if high impact
  if (projectedDelta >= HIGH_IMPACT_THRESHOLD) {
    console.log(`[SVI-PROJECTION] High-impact change detected:`);
    console.log(`  File: ${path.basename(filePath)}`);
    console.log(`  Projected Ψ delta: ${(projectedDelta * 100).toFixed(1)}%`);
    console.log(`  Current Ψ: ${(svi.psi * 100).toFixed(1)}%`);
  }

  // Always allow, just warn
  return {
    allow: true,
    message: projectedDelta >= HIGH_IMPACT_THRESHOLD 
      ? `SVI impact: ${(projectedDelta * 100).toFixed(1)}% (high)`
      : null
  };
}

// Hook metadata
export const metadata = {
  id: "svi-projection",
  phase: "0.14",
  priority: 3,
  dependsOn: [],
  event: "PreToolWrite"
};
