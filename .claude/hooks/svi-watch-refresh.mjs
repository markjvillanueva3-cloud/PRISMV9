// tier: T4
/**
 * svi-watch-refresh.mjs — Phase 0.14 SVI Watch Refresh
 *
 * PostToolWrite hook that refreshes SVI watch status after changes.
 * Updates blockers and trend based on recent modifications.
 */

import * as fs from "fs";
import * as path from "path";

const SVI_WATCH_PATH = "state/shared/SVI-watch-status.json";
const TRANSACTION_LOG_PATH = "mcp-server/data/state/TRANSACTION_LOG.jsonl";

export default async function sviWatchRefresh({ tool, input, result }) {
  // Only trigger on successful Write/Edit
  if (tool !== "Write" && tool !== "Edit") {
    return;
  }

  if (result?.error) {
    return;
  }

  const basePath = process.cwd();
  const timestamp = new Date().toISOString();

  // Load current watch status
  const watchPath = path.join(basePath, SVI_WATCH_PATH);
  let watch = {
    lastRefresh: timestamp,
    blockers: [],
    trend: "stable",
    recentChanges: []
  };

  if (fs.existsSync(watchPath)) {
    try {
      watch = JSON.parse(fs.readFileSync(watchPath, "utf-8"));
    } catch { /* use defaults */ }
  }

  // Add to recent changes
  const filePath = input.file_path || input.path || "unknown";
  watch.recentChanges = [
    { file: path.basename(filePath), timestamp },
    ...(watch.recentChanges || []).slice(0, 9)
  ];
  watch.lastRefresh = timestamp;

  // Recalculate trend based on recent activity
  const recentCount = watch.recentChanges.length;
  if (recentCount > 5) {
    watch.trend = "active";
  } else if (recentCount < 2) {
    watch.trend = "stable";
  }

  // Write back
  fs.writeFileSync(watchPath, JSON.stringify(watch, null, 2));

  // Log to transaction ledger
  const txPath = path.join(basePath, TRANSACTION_LOG_PATH);
  const txEntry = JSON.stringify({
    type: "svi-watch-refresh",
    file: path.basename(filePath),
    trend: watch.trend,
    timestamp
  });
  fs.appendFileSync(txPath, txEntry + "\n");

  return { message: `SVI watch: ${watch.trend}` };
}

// Hook metadata
export const metadata = {
  id: "svi-watch-refresh",
  phase: "0.14",
  priority: 4,
  dependsOn: ["svi-projection"],
  event: "PostToolWrite"
};
