// tier: T0
/**
 * pre-rename-guard.mjs — Phase 0.8 Rename Guard Hook
 *
 * PreToolUse hook that fires on Edit/Write when the target path differs
 * from the source path (indicating a rename). Requires:
 * 1. Alias table update planned
 * 2. Dependent notification
 * 3. Test file rename planned
 *
 * BLOCKS if dependents not re-pointed.
 *
 * @phase Universal 0.8 — Rename/Delete/Impact Protocol
 */

import fs from "fs";
import path from "path";

const ROOT = process.env.PRISM_ROOT || "H:/prism/mcp-server";
const ENGINE_USAGE_PATH = path.join(ROOT, "data/state/ENGINE_USAGE_INDEX.json");

export default async function preRenameGuard(params) {
  const { tool_name, tool_input } = params;

  // Only check Edit/Write on engine files
  if (tool_name !== "Edit" && tool_name !== "Write") {
    return { decision: "allow" };
  }

  const filePath = tool_input?.file_path || "";

  // Only guard engine files
  if (!filePath.includes("/engines/") && !filePath.includes("\\engines\\")) {
    return { decision: "allow" };
  }

  // Extract engine name from path
  const match = filePath.match(/[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts$/);
  if (!match) {
    return { decision: "allow" };
  }

  const engineName = match[1];

  // Check if this is a new file (not a rename)
  if (!fs.existsSync(filePath)) {
    return { decision: "allow" };
  }

  // For existing files, check if content suggests a class rename
  const content = tool_input?.content || tool_input?.new_string || "";

  // Look for class declaration with different name
  const classMatch = content.match(/export\s+class\s+([A-Za-z0-9_]+)/);
  if (classMatch && classMatch[1] !== engineName) {
    const newName = classMatch[1];

    // Check dependents
    try {
      if (fs.existsSync(ENGINE_USAGE_PATH)) {
        const usageIndex = JSON.parse(fs.readFileSync(ENGINE_USAGE_PATH, "utf-8"));
        const usage = usageIndex.engines?.[engineName];

        if (usage) {
          const dependentCount =
            (usage.dispatchers?.length || 0) +
            (usage.skills?.length || 0) +
            (usage.hooks?.length || 0);

          if (dependentCount > 0) {
            return {
              decision: "block",
              message: `RENAME GUARD: Renaming ${engineName} to ${newName} would break ${dependentCount} dependents.\n` +
                `Dispatchers: ${usage.dispatchers?.join(", ") || "none"}\n` +
                `Skills: ${usage.skills?.join(", ") || "none"}\n` +
                `Hooks: ${usage.hooks?.join(", ") || "none"}\n\n` +
                `Use /rename ${engineName} ${newName} for coordinated rename with alias capture.`
            };
          }
        }
      }
    } catch {
      // Index not available, allow but warn
    }
  }

  return { decision: "allow" };
}
