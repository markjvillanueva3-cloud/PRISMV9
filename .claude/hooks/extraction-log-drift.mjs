// tier: T4
/**
 * extraction-log-drift.mjs — Phase 1 Tier 5B
 *
 * PreTool hook that blocks if extraction log references deleted files.
 * Ensures extraction log integrity matches actual artifacts.
 */

import * as fs from "fs";
import * as path from "path";

const EXTRACTION_LOG_PATH = "mcp-server/data/state/extraction-log.json";
const CHECK_INTERVAL_MS = 300000; // Check every 5 minutes max

let lastCheckTime = 0;
let cachedDrift = null;

async function checkForDrift() {
  const now = Date.now();

  // Use cached result if recent
  if (cachedDrift !== null && now - lastCheckTime < CHECK_INTERVAL_MS) {
    return cachedDrift;
  }

  const logPath = path.join(process.cwd(), EXTRACTION_LOG_PATH);
  if (!fs.existsSync(logPath)) {
    cachedDrift = [];
    lastCheckTime = now;
    return cachedDrift;
  }

  try {
    const log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    const entries = log.extractions || [];
    const drift = [];

    for (const entry of entries) {
      // Check if output artifacts exist
      const outputs = entry.outputArtifacts || [];
      for (const artifact of outputs) {
        const artifactPath = path.join(process.cwd(), artifact);
        if (!fs.existsSync(artifactPath)) {
          drift.push({
            sourceId: entry.sourceId,
            missingArtifact: artifact
          });
        }
      }
    }

    cachedDrift = drift;
    lastCheckTime = now;
    return drift;
  } catch {
    cachedDrift = [];
    lastCheckTime = now;
    return [];
  }
}

export default async function extractionLogDrift({ tool, input }) {
  // Check on Read of extraction log
  if (tool !== "Read") return undefined;

  const filePath = input?.file_path || "";
  if (!filePath.includes("extraction-log")) return undefined;

  const drift = await checkForDrift();

  if (drift.length > 0) {
    const driftSummary = drift.slice(0, 3).map(d =>
      `  - ${d.sourceId}: missing ${path.basename(d.missingArtifact)}`
    ).join("\n");

    return {
      message: `
⚠️ EXTRACTION LOG DRIFT DETECTED — Phase 1 Tier 5B
${drift.length} extraction entries reference missing artifacts:
${driftSummary}${drift.length > 3 ? `\n  ... and ${drift.length - 3} more` : ""}

Run extraction-log-cleanup script to reconcile.
`
    };
  }

  return undefined;
}

export const metadata = {
  id: "extraction-log-drift",
  phase: "1.5B",
  priority: 75,
  event: "PostTool"
};
