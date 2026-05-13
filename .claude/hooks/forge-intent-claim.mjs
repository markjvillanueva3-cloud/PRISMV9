// tier: T0
/**
 * forge-intent-claim.mjs — Phase 1 Tier 5D
 *
 * PreTool hook that requires ForgeIntentClaim before creating
 * new engines, hooks, skills, or scripts.
 */

import * as fs from "fs";
import * as path from "path";

const INTENT_CLAIMS_PATH = "mcp-server/data/state/forge-intent-claims.json";

const FORGEABLE_PATTERNS = [
  { pattern: /src\/engines\/.*Engine\.ts$/, type: "engine" },
  { pattern: /\.claude\/hooks\/.*\.mjs$/, type: "hook" },
  { pattern: /\.claude\/commands\/.*\.md$/, type: "skill" },
  { pattern: /scripts\/.*\.ts$/, type: "script" }
];

function getForgeableType(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  for (const { pattern, type } of FORGEABLE_PATTERNS) {
    if (pattern.test(normalized)) return type;
  }
  return null;
}

export default async function forgeIntentClaim({ tool, input }) {
  // Only check Write tool (new file creation)
  if (tool !== "Write") return undefined;

  const filePath = input?.file_path || input?.path || "";
  const forgeType = getForgeableType(filePath);

  if (!forgeType) return undefined;

  // Check if file already exists (edit vs create)
  const fullPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(fullPath)) return undefined; // Editing existing file is OK

  // New file creation - check for intent claim
  const claimsPath = path.join(process.cwd(), INTENT_CLAIMS_PATH);
  const currentAgent = process.env.CLAUDE_AGENT_ID || "unknown";
  const fileName = path.basename(filePath);

  if (!fs.existsSync(claimsPath)) {
    return {
      decision: "block",
      reason: `
╔══════════════════════════════════════════════════════════════╗
║            FORGE INTENT CLAIM — Phase 1 Tier 5D               ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Creating new ${forgeType.padEnd(41)}║
║                                                              ║
║ File: ${fileName.slice(0,50).padEnd(50)}║
║                                                              ║
║ Before creating, you must:                                   ║
║ 1. Run /dedup to check for existing similar artifacts        ║
║ 2. Register intent via ForgeIntentClaimEngine                ║
║                                                              ║
║ This prevents duplication and ensures coordination.          ║
╚══════════════════════════════════════════════════════════════╝
`
    };
  }

  try {
    const claims = JSON.parse(fs.readFileSync(claimsPath, "utf-8"));
    const claim = claims.intents?.find(i =>
      i.agentId === currentAgent &&
      i.targetPath === filePath &&
      i.status === "approved"
    );

    if (!claim) {
      return {
        decision: "block",
        reason: `
╔══════════════════════════════════════════════════════════════╗
║            FORGE INTENT CLAIM — Phase 1 Tier 5D               ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: No approved intent claim for this ${forgeType.padEnd(15)}║
║                                                              ║
║ File: ${fileName.slice(0,50).padEnd(50)}║
║                                                              ║
║ Run /dedup first, then register your intent.                 ║
║ See: ForgeIntentClaimEngine.registerIntent()                 ║
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
  id: "forge-intent-claim",
  phase: "1.5D",
  priority: 35,
  event: "PreTool"
};
