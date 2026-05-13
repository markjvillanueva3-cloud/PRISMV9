// tier: T0
/**
 * allow-superseding.mjs — Phase 1 Tier 5B
 *
 * PreTool hook that requires reasonCode for forced re-extractions.
 * Ensures intentional superseding has documented justification.
 */

import * as fs from "fs";
import * as path from "path";

const SUPERSEDE_LOG_PATH = "mcp-server/data/state/supersede-log.json";

// Valid reason codes for re-extraction
const VALID_REASONS = [
  "CORRUPTED_DATA",      // Original extraction had errors
  "INCOMPLETE_EXTRACT",  // Original missed content
  "SCHEMA_CHANGE",       // Need different output format
  "SOURCE_UPDATED",      // Source document was revised
  "QUALITY_IMPROVEMENT", // Better extraction technique available
  "MERGE_DUPLICATES"     // Consolidating multiple partial extracts
];

function hasSupersedingFlag(command) {
  return command.includes("--force-extract") ||
         command.includes("--supersede") ||
         command.includes("--re-extract");
}

function extractReasonCode(command) {
  const match = command.match(/--reason[=\s]+([A-Z_]+)/i);
  return match ? match[1].toUpperCase() : null;
}

export default async function allowSuperseding({ tool, input }) {
  // Check Bash tool for forced extractions
  if (tool !== "Bash") return undefined;

  const command = input?.command || "";
  if (!hasSupersedingFlag(command)) return undefined;

  const reasonCode = extractReasonCode(command);

  if (!reasonCode) {
    return {
      decision: "block",
      reason: `
╔══════════════════════════════════════════════════════════════╗
║            ALLOW SUPERSEDING — Phase 1 Tier 5B                ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Force re-extract requires --reason flag             ║
║                                                              ║
║ Valid reason codes:                                          ║
║   CORRUPTED_DATA      - Original extraction had errors       ║
║   INCOMPLETE_EXTRACT  - Original missed content              ║
║   SCHEMA_CHANGE       - Need different output format         ║
║   SOURCE_UPDATED      - Source document was revised          ║
║   QUALITY_IMPROVEMENT - Better technique available           ║
║   MERGE_DUPLICATES    - Consolidating partial extracts       ║
║                                                              ║
║ Example: --force-extract --reason=SOURCE_UPDATED             ║
╚══════════════════════════════════════════════════════════════╝
`
    };
  }

  if (!VALID_REASONS.includes(reasonCode)) {
    return {
      decision: "block",
      reason: `
╔══════════════════════════════════════════════════════════════╗
║            ALLOW SUPERSEDING — Phase 1 Tier 5B                ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Invalid reason code: ${reasonCode.slice(0,26).padEnd(26)}║
║                                                              ║
║ Valid codes: ${VALID_REASONS.slice(0,3).join(", ").padEnd(43)}║
║              ${VALID_REASONS.slice(3).join(", ").padEnd(43)}║
╚══════════════════════════════════════════════════════════════╝
`
    };
  }

  // Log the superseding action
  const logPath = path.join(process.cwd(), SUPERSEDE_LOG_PATH);
  try {
    let log = { supersedings: [] };
    if (fs.existsSync(logPath)) {
      log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    }

    log.supersedings.push({
      timestamp: new Date().toISOString(),
      reasonCode,
      command: command.slice(0, 200),
      agent: process.env.CLAUDE_AGENT_ID || "unknown"
    });

    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
  } catch {
    // Log failure shouldn't block
  }

  return undefined;
}

export const metadata = {
  id: "allow-superseding",
  phase: "1.5B",
  priority: 25,
  event: "PreTool"
};
