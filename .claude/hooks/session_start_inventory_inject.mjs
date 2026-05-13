#!/usr/bin/env node
// tier: T4
/**
 * session_start_inventory_inject.mjs — U-ACT04 Inventory Hydration
 *
 * Injects comprehensive inventory state at SessionStart (~4K tokens).
 * Queries state from 8 inventory domains and provides delta since last session.
 *
 * Inventory Engines Referenced:
 *   1. ContextInventoryEngine - Session context tracking
 *   2. ERPToolInventoryEngine - ERP/tool integration state
 *   3. InventoryAwareToolSelectorEngine - Tool selection intelligence
 *   4. InventoryEOQEngine - Economic order quantity state
 *   5. InventoryOptimizationEngine - Optimization metrics
 *   6. JMDieProgramInventoryEngine - JM Die program corpus
 *   7. PluginInventoryEngine - Plugin/extension state
 *   8. ToolInventoryOrchestratorEngine - Cross-engine orchestration
 *
 * State Sources (static files):
 *   - BASELINE_INVENTORY.json - Engine/action/formula counts
 *   - cross-session-asset-registry.json - Recently created assets
 *   - extraction-log.json - Extraction history
 *   - MASTER_INDEX_COMPACT.md - Asset listing
 */

import fs from "node:fs";
import path from "node:path";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const DOCS_DIR = "H:/prism/mcp-server/data/docs";
const LAST_SESSION_FILE = `${STATE_DIR}/LAST_SESSION_INVENTORY.json`;

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function computeDelta(current, last) {
  if (!last) return { firstSession: true };

  const delta = {};
  for (const key of Object.keys(current)) {
    if (typeof current[key] === "number" && typeof last[key] === "number") {
      const diff = current[key] - last[key];
      if (diff !== 0) {
        delta[key] = diff > 0 ? `+${diff}` : `${diff}`;
      }
    }
  }
  return Object.keys(delta).length > 0 ? delta : { noChanges: true };
}

function getRecentAssets(registry, limit = 5) {
  if (!registry?.assets) return [];

  return Object.entries(registry.assets)
    .map(([name, info]) => ({
      name,
      type: info.type || "asset",
      created: info.created_at,
    }))
    .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0))
    .slice(0, limit);
}

function getExtractionSummary(log) {
  if (!log?.extractions) return null;

  const completed = log.extractions.filter(e => e.status === "completed");
  const recent = completed.slice(-5);

  return {
    total: completed.length,
    recent: recent.map(e => e.source || e.name).filter(Boolean),
  };
}

function countMasterIndex(content) {
  // Count engines from MASTER_INDEX_COMPACT.md format
  const engineMatch = content.match(/Engines\s*\|\s*(\d+)/);
  const dispatcherMatch = content.match(/Dispatchers\s*\|\s*(\d+)/);
  const actionMatch = content.match(/Actions[^|]*\|\s*(\d+)/);
  const algorithmMatch = content.match(/Algorithms\s*\|\s*(\d+)/);

  return {
    engines: engineMatch ? parseInt(engineMatch[1]) : 0,
    dispatchers: dispatcherMatch ? parseInt(dispatcherMatch[1]) : 0,
    actions: actionMatch ? parseInt(actionMatch[1]) : 0,
    algorithms: algorithmMatch ? parseInt(algorithmMatch[1]) : 0,
  };
}

function main() {
  // Load state files
  const baseline = readJSON(`${STATE_DIR}/BASELINE_INVENTORY.json`);
  const registry = readJSON(`${STATE_DIR}/cross-session-asset-registry.json`);
  const extractionLog = readJSON(`${STATE_DIR}/extraction-log.json`);
  const masterIndex = readText(`${DOCS_DIR}/MASTER_INDEX_COMPACT.md`);
  const lastSession = readJSON(LAST_SESSION_FILE);

  // Build current inventory state
  const inv = baseline?.inventory || {};
  const masterCounts = countMasterIndex(masterIndex);

  const current = {
    engines: inv.engines?.files || masterCounts.engines || 0,
    dispatchers: inv.dispatchers || masterCounts.dispatchers || 0,
    actions: inv.actions || masterCounts.actions || 0,
    algorithms: inv.algorithms || masterCounts.algorithms || 0,
    formulas: inv.formulas?.registered || 0,
    skills: inv.skills || 0,
    hooks: inv.hooks?.registry || 0,
    tests: inv.test_count || 0,
    tribalTips: inv.tribal_tips || 0,
    materials: inv.materials || 0,
    tools: inv.tools || 0,
    machines: inv.machines || 0,
  };

  // Compute delta from last session
  const delta = computeDelta(current, lastSession);

  // Get recent assets to avoid duplication
  const recentAssets = getRecentAssets(registry, 5);

  // Get extraction summary
  const extractions = getExtractionSummary(extractionLog);

  // Save current state for next session delta
  try {
    fs.writeFileSync(LAST_SESSION_FILE, JSON.stringify(current, null, 2) + "\n");
  } catch { /* ignore write errors */ }

  // Build compact output (~4K tokens)
  const lines = [
    "## PRISM INVENTORY (SessionStart Injection)",
    "",
    "### Counts",
    `- Engines: ${current.engines}`,
    `- Dispatchers: ${current.dispatchers}`,
    `- Actions: ${current.actions}`,
    `- Algorithms: ${current.algorithms}`,
    `- Formulas: ${current.formulas}`,
    `- Skills: ${current.skills}`,
    `- Hooks: ${current.hooks}`,
    `- Tests: ${current.tests}`,
    "",
  ];

  // Add domain-specific counts
  if (current.tribalTips || current.materials || current.tools || current.machines) {
    lines.push("### Domain Data");
    if (current.tribalTips) lines.push(`- Tribal Tips: ${current.tribalTips}`);
    if (current.materials) lines.push(`- Materials: ${current.materials}`);
    if (current.tools) lines.push(`- Tools: ${current.tools}`);
    if (current.machines) lines.push(`- Machines: ${current.machines}`);
    lines.push("");
  }

  // Add delta
  if (!delta.firstSession && !delta.noChanges) {
    lines.push("### Delta (since last session)");
    for (const [key, value] of Object.entries(delta)) {
      lines.push(`- ${key}: ${value}`);
    }
    lines.push("");
  }

  // Add recent assets (duplication guard)
  if (recentAssets.length > 0) {
    lines.push("### Recently Created (avoid duplicating)");
    for (const asset of recentAssets) {
      lines.push(`- ${asset.type}: ${asset.name}`);
    }
    lines.push("");
  }

  // Add extraction history
  if (extractions?.recent?.length > 0) {
    lines.push("### Recent Extractions (already processed)");
    lines.push(extractions.recent.join(", "));
    lines.push("");
  }

  // Add enforcement reminder
  lines.push("### MANDATORY CHECKS");
  lines.push("1. DuplicationGuardEngine.checkBeforeCreating() — before ANY new asset");
  lines.push("2. PRISMSelfAwarenessEngine.recommendAIFeatures() — find existing solutions");
  lines.push("3. /dedup command — verify no similar exists");
  lines.push("");

  const output = {
    additionalContext: lines.join("\n"),
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      inventoryCounts: current,
      delta,
      recentAssets: recentAssets.length,
    },
  };

  console.log(JSON.stringify(output));
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
