// tier: T0
/**
 * claim-required.mjs — Phase 1 Tier 5D
 *
 * PreTool hook that blocks milestone/unit edits without a claim.
 * Prevents concurrent work conflicts on the same roadmap unit.
 */

import * as fs from "fs";
import * as path from "path";

const CLAIMS_PATH = "mcp-server/data/state/active-claims.json";
const ROADMAP_INDEX_PATH = "mcp-server/data/roadmap-index.json";

function getMilestoneFromPath(filePath) {
  // Extract milestone ID from file path if it matches roadmap pattern
  const match = filePath.match(/milestones\/([A-Z0-9-]+)\.json/i);
  return match ? match[1] : null;
}

export default async function claimRequired({ tool, input }) {
  // Only check Write/Edit to milestone files
  if (tool !== "Write" && tool !== "Edit") return undefined;

  const filePath = input?.file_path || input?.path || "";
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Only guard milestone files
  if (!normalizedPath.includes("milestones/")) return undefined;

  const milestoneId = getMilestoneFromPath(normalizedPath);
  if (!milestoneId) return undefined;

  // Check if we have an active claim
  const claimsPath = path.join(process.cwd(), CLAIMS_PATH);

  if (!fs.existsSync(claimsPath)) {
    // No claims file = allow (first-time setup)
    return undefined;
  }

  try {
    const claims = JSON.parse(fs.readFileSync(claimsPath, "utf-8"));
    const currentAgent = process.env.CLAUDE_AGENT_ID || "unknown";

    // Check if this milestone is claimed by someone else
    const claim = claims.activeClaims?.[milestoneId];

    if (claim && claim.agentId !== currentAgent) {
      return {
        decision: "block",
        reason: `
╔══════════════════════════════════════════════════════════════╗
║              CLAIM REQUIRED — Phase 1 Tier 5D                 ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Milestone ${milestoneId.padEnd(35)}      ║
║ is claimed by agent: ${claim.agentId.slice(0,40).padEnd(40)}║
║ since: ${claim.claimedAt?.slice(0,20).padEnd(50)}║
║                                                              ║
║ Wait for release or coordinate via AGENT_CHAT.md             ║
╚══════════════════════════════════════════════════════════════╝
`
      };
    }

    // Not claimed by someone else, check if WE have claimed it
    if (!claim) {
      return {
        decision: "block",
        reason: `
╔══════════════════════════════════════════════════════════════╗
║              CLAIM REQUIRED — Phase 1 Tier 5D                 ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: No active claim for ${milestoneId.padEnd(25)}      ║
║                                                              ║
║ You must claim a milestone before editing it:                ║
║   Run: /claim ${milestoneId}                                   ║
║                                                              ║
║ This prevents concurrent work conflicts.                     ║
╚══════════════════════════════════════════════════════════════╝
`
      };
    }
  } catch {
    // Parse error, allow
  }

  return undefined;
}

export const metadata = {
  id: "claim-required",
  phase: "1.5D",
  priority: 45,
  event: "PreTool"
};
