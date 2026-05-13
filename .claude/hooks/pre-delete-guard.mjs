// tier: T0
/**
 * pre-delete-guard.mjs — Phase 0.8 Delete Guard Hook
 *
 * PreToolUse hook that fires on Bash commands that delete engine files.
 * Requires orphan-scan + registry-archive before deletion.
 *
 * BLOCKS if dependents still reference the engine.
 *
 * @phase Universal 0.8 — Rename/Delete/Impact Protocol
 */

import fs from "fs";
import path from "path";

const ROOT = process.env.PRISM_ROOT || "H:/prism/mcp-server";
const ENGINE_USAGE_PATH = path.join(ROOT, "data/state/ENGINE_USAGE_INDEX.json");

export default async function preDeleteGuard(params) {
  const { tool_name, tool_input } = params;

  // Only check Bash commands
  if (tool_name !== "Bash") {
    return { decision: "allow" };
  }

  const command = tool_input?.command || "";

  // Check for file deletion commands targeting engines
  const deletePatterns = [
    /rm\s+.*[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts/,
    /del\s+.*[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts/,
    /Remove-Item\s+.*[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts/,
    /git\s+rm\s+.*[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts/,
  ];

  let engineName = null;
  for (const pattern of deletePatterns) {
    const match = command.match(pattern);
    if (match) {
      engineName = match[1];
      break;
    }
  }

  if (!engineName) {
    return { decision: "allow" };
  }

  // Check dependents
  try {
    if (fs.existsSync(ENGINE_USAGE_PATH)) {
      const usageIndex = JSON.parse(fs.readFileSync(ENGINE_USAGE_PATH, "utf-8"));
      const usage = usageIndex.engines?.[engineName];

      if (usage) {
        const dispatchers = usage.dispatchers || [];
        const skills = usage.skills || [];
        const hooks = usage.hooks || [];

        const blockingDependents = [
          ...dispatchers.map((d) => `dispatcher:${d}`),
          ...skills.map((s) => `skill:${s}`),
          ...hooks.map((h) => `hook:${h}`),
        ];

        if (blockingDependents.length > 0) {
          return {
            decision: "block",
            message: `DELETE GUARD: Cannot delete ${engineName} — ${blockingDependents.length} dependents still reference it:\n` +
              blockingDependents.slice(0, 10).map((d) => `  - ${d}`).join("\n") +
              (blockingDependents.length > 10 ? `\n  ... and ${blockingDependents.length - 10} more` : "") +
              `\n\nUse /delete ${engineName} for safe deletion with dependency check.`
          };
        }
      }
    }
  } catch {
    // Index not available, allow but warn
    return {
      decision: "allow",
      message: `WARNING: ENGINE_USAGE_INDEX.json not found. Cannot verify ${engineName} has no dependents.`
    };
  }

  // No blocking dependents, but remind about archival
  return {
    decision: "allow",
    message: `Deleting ${engineName}. Remember to:\n` +
      `1. Archive metadata to extraction-log.json\n` +
      `2. Update cross-session-asset-registry.json\n` +
      `3. Rebuild ENGINE_USAGE_INDEX and SIGNATURE_HASH_INDEX`
  };
}
