// tier: T4
/**
 * svi-inject.mjs — Phase 0.14 SVI Session Injection
 *
 * SessionStart hook that injects current SVI/Ψ summary into session context.
 * Runs after awareness-bootstrap per HOOK_ORDER_REGISTRY.
 */

import * as fs from "fs";
import * as path from "path";

const SVI_PATH = "state/shared/SVI.json";
const SVI_WATCH_PATH = "state/shared/SVI-watch-status.json";

export default async function sviInject({ session }) {
  const basePath = process.cwd();

  // Read SVI data
  let svi = { psi: 0, surfaces: [] };
  const sviPath = path.join(basePath, SVI_PATH);
  if (fs.existsSync(sviPath)) {
    try {
      svi = JSON.parse(fs.readFileSync(sviPath, "utf-8"));
    } catch { /* use defaults */ }
  }

  // Read watch status for blockers
  let watch = { blockers: [] };
  const watchPath = path.join(basePath, SVI_WATCH_PATH);
  if (fs.existsSync(watchPath)) {
    try {
      watch = JSON.parse(fs.readFileSync(watchPath, "utf-8"));
    } catch { /* use defaults */ }
  }

  // Format compact summary (3 lines max per Phase 0.14 spec)
  const psiPercent = ((svi.psi || 0) * 100).toFixed(1);
  const topBlockers = (watch.blockers || []).slice(0, 3);

  const summary = [
    `Ψ=${psiPercent}%`,
    topBlockers.length > 0
      ? `Top blockers: ${topBlockers.map((b) => b.name || b).join(", ")}`
      : "No critical blockers",
  ].join(" | ");

  // Inject into session context
  return {
    inject: {
      sviSummary: summary,
      psi: svi.psi,
      blockers: topBlockers,
    },
    message: `SVI injected: ${summary}`,
  };
}

// Hook metadata for HOOK_ORDER_REGISTRY
export const metadata = {
  id: "svi-inject",
  phase: "0.14",
  priority: 2,
  dependsOn: ["awareness-bootstrap"],
  event: "SessionStart",
};
