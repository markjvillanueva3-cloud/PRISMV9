// tier: T1
/**
 * omega-floor.mjs — Phase 1 Tier 5D Workflow Hook
 *
 * PreToolUse hook that blocks git commit when Omega score
 * is below the milestone floor.
 */

import * as fs from "fs";
import * as path from "path";

const OMEGA_FLOOR = 0.75;
const BASELINE_PATH = "mcp-server/data/state/BASELINE_INVENTORY.json";

function getOmegaScore() {
  try {
    const basePath = process.cwd();
    const baselinePath = path.join(basePath, BASELINE_PATH);
    
    if (!fs.existsSync(baselinePath)) return 1.0;
    
    const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
    return baseline.omega || baseline.Omega || 1.0;
  } catch {
    return 1.0;
  }
}

function isGitCommit(command) {
  return command && /git\s+commit/i.test(command);
}

export default async function omegaFloor({ tool, input }) {
  if (tool !== "Bash") return { allow: true };

  const command = input.command || "";
  if (!isGitCommit(command)) return { allow: true };

  const omega = getOmegaScore();
  
  if (omega >= OMEGA_FLOOR) {
    return { allow: true };
  }

  return {
    allow: false,
    message: `OMEGA FLOOR: Commit blocked. Omega ${omega.toFixed(2)} < ${OMEGA_FLOOR}. Fix tests/build first.`
  };
}

export const metadata = { id: "omega-floor", phase: "1", tier: "5D", event: "PreToolUse" };
