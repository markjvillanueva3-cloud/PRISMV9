#!/usr/bin/env node
// tier: T1
/**
 * OrphanDetectionHook — Detect and prevent orphaned assets
 *
 * Phase 0.9 from AGI proximity plan. Monitors for:
 *   - Deletes that would create orphans (dependents lose their dependency)
 *   - Creates without proper wiring (new assets with no dispatcher)
 *   - Existing orphans in the codebase
 *
 * Integrates with ImpactAnalysisEngine for dependency tracking.
 */

import * as fs from "fs";
import * as path from "path";
import { isBootstrapActive, isDowngradedGate } from "./bootstrap-mode.mjs";

// Read hook input from stdin
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => main(input));

async function main(rawInput) {
  try {
    const hookInput = JSON.parse(rawInput);
    const result = await processHook(hookInput);
    emit(result);
  } catch (error) {
    emit({ decision: "allow", reason: `Orphan detection hook error: ${error.message}` });
  }
}

// Claude Code PreToolUse expects `hookSpecificOutput.permissionDecision`.
// Keep the internal helpers returning `{ decision, reason }` for readability
// and only translate at the boundary.
function emit(result) {
  // Phase 0.16 U-OP1: honor BOOTSTRAP_MODE.flag — degrade deny to warn-only
  // for Phase 0.9 orphan-detection during first-boot provisioning. Flag is
  // auto-removed by phase-0-11-exit-gate after retrofit completes.
  let dec = (result && result.decision) === "deny" ? "deny" : "allow";
  let reason = result && result.reason;
  if (dec === "deny" && isBootstrapActive() && isDowngradedGate("0.9")) {
    dec = "allow";
    reason = `⚠️ BOOTSTRAP WARN-ONLY (0.9): ${reason || "orphan detection would have blocked"}`;
  }
  const out = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: dec,
    },
  };
  if (reason) {
    out.hookSpecificOutput.permissionDecisionReason = reason;
  }
  console.log(JSON.stringify(out));
}

async function processHook(hookInput) {
  const { hook_type, tool_name, tool_input } = hookInput;

  // Only process PreToolUse for Edit/Write tools
  if (hook_type !== "PreToolUse") {
    return { decision: "allow" };
  }

  // Check for delete operations
  if (tool_name === "Bash") {
    return checkBashForDeletes(tool_input);
  }

  // Check for file writes that create new assets
  if (tool_name === "Write") {
    return checkWriteForOrphan(tool_input);
  }

  // Check for edits that remove exports
  if (tool_name === "Edit") {
    return checkEditForExportRemoval(tool_input);
  }

  return { decision: "allow" };
}

function checkBashForDeletes(toolInput) {
  const command = toolInput?.command || "";

  // Detect file deletion commands
  const deletePatterns = [
    /\brm\s+(?!-rf?\s+node_modules).*\.ts\b/,
    /\bgit\s+rm\b.*\.ts\b/,
    /\bdel\s+.*\.ts\b/,
  ];

  for (const pattern of deletePatterns) {
    if (pattern.test(command)) {
      // Extract the file being deleted
      const fileMatch = command.match(/([A-Z][a-zA-Z]+Engine)\.ts/);
      if (fileMatch) {
        const engineName = fileMatch[1];

        // Check if this is a critical asset
        const criticalAssets = [
          "SafetyEngine",
          "KienzleForceModelEngine",
          "TaylorToolLifeEngine",
          "DuplicationGuardEngine",
          "TransactionLogEngine",
        ];

        if (criticalAssets.includes(engineName)) {
          return {
            decision: "deny",
            reason: `BLOCKED: Cannot delete critical asset "${engineName}". This engine is protected.`,
          };
        }

        // Warn about potential orphan creation
        return {
          decision: "allow",
          reason: `WARNING: Deleting "${engineName}" may create orphans. Run impact analysis first.`,
        };
      }
    }
  }

  return { decision: "allow" };
}

function checkWriteForOrphan(toolInput) {
  const filePath = toolInput?.file_path || "";
  const content = toolInput?.content || "";

  // Check if creating a new engine
  if (filePath.includes("/engines/") && filePath.endsWith(".ts")) {
    const fileName = path.basename(filePath, ".ts");

    // Skip index files and non-engine files
    if (fileName === "index" || !fileName.endsWith("Engine")) {
      return { decision: "allow" };
    }

    // Check if the content exports something
    const hasExport = /export\s+(class|const|function|interface)/.test(content);
    if (!hasExport) {
      return {
        decision: "allow",
        reason: `NOTE: New engine "${fileName}" has no exports. May become orphan.`,
      };
    }

    // Check if content mentions any dispatcher
    const dispatcherMention = /dispatcher|Dispatcher/.test(content);
    if (!dispatcherMention) {
      return {
        decision: "allow",
        reason: `NOTE: New engine "${fileName}" created. Remember to wire to dispatcher.`,
      };
    }
  }

  return { decision: "allow" };
}

function checkEditForExportRemoval(toolInput) {
  const filePath = toolInput?.file_path || "";
  const oldString = toolInput?.old_string || "";
  const newString = toolInput?.new_string || "";

  // Check if removing an export from an engine
  if (filePath.includes("/engines/") && filePath.endsWith(".ts")) {
    // Check if removing export statement
    const hasExportBefore = /export\s+(const|class|function)\s+\w+/.test(oldString);
    const hasExportAfter = /export\s+(const|class|function)\s+\w+/.test(newString);

    if (hasExportBefore && !hasExportAfter) {
      const match = oldString.match(/export\s+(?:const|class|function)\s+(\w+)/);
      const exportName = match ? match[1] : "unknown";

      return {
        decision: "allow",
        reason: `WARNING: Removing export "${exportName}" may break dependent files. Run impact analysis.`,
      };
    }

    // Check if completely removing a singleton export
    const singletonRemoval = /export\s+const\s+\w+Engine\s*=/.test(oldString) &&
                            !/export\s+const\s+\w+Engine\s*=/.test(newString);
    if (singletonRemoval) {
      return {
        decision: "allow",
        reason: `WARNING: Removing singleton export may create orphaned imports.`,
      };
    }
  }

  return { decision: "allow" };
}
