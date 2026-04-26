#!/usr/bin/env node
/**
 * ai-self-awareness-inject.mjs — Inject AI capability awareness at SessionStart
 *
 * Reads from BASELINE_INVENTORY.json and cross-session-asset-registry.json
 * to provide compact, token-efficient awareness of what PRISM can do.
 */

import fs from "node:fs";

const INVENTORY_PATH = "H:/prism/mcp-server/data/state/BASELINE_INVENTORY.json";
const REGISTRY_PATH = "H:/prism/mcp-server/data/state/cross-session-asset-registry.json";
const AI_STATS_PATH = "H:/prism/mcp-server/data/state/ai-intelligence-stats.json";

function readJSON(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function main() {
  const inventory = readJSON(INVENTORY_PATH);
  const registry = readJSON(REGISTRY_PATH);
  const aiStats = readJSON(AI_STATS_PATH);

  if (!inventory?.inventory) {
    console.log(JSON.stringify({ systemMessage: "AI awareness: inventory unavailable" }));
    return;
  }

  const inv = inventory.inventory;

  // Build compact awareness context
  const counts = [
    `${inv.engines?.files || 0} engines`,
    `${inv.dispatchers || 0} dispatchers`,
    `${inv.actions || 0} actions`,
    `${inv.formulas?.registered || 0} formulas`,
    `${inv.algorithms || 0} algorithms`,
    `${inv.tribal_tips || 0} tribal tips`,
    `${inv.skills || 0} skills`,
  ].join(", ");

  // Get recently created assets to avoid duplicates
  const recentAssets = [];
  if (registry?.assets) {
    const sorted = Object.entries(registry.assets)
      .sort(([, a], [, b]) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 10);
    for (const [name, info] of sorted) {
      recentAssets.push(`${info.type || "asset"}: ${name}`);
    }
  }

  // Get AI feature categories
  const aiFeatures = [];
  if (aiStats?.features) {
    const topFeatures = Object.entries(aiStats.features)
      .sort(([, a], [, b]) => (b.usage || 0) - (a.usage || 0))
      .slice(0, 5)
      .map(([name]) => name);
    aiFeatures.push(...topFeatures);
  }

  const awareness = [
    "## AI SELF-AWARENESS (AUTO-INJECTED)",
    `PRISM inventory: ${counts}`,
    "",
    "BEFORE CREATING anything new, you MUST:",
    "1. Check DuplicationGuardEngine.checkBeforeCreating() — blocks duplicates",
    "2. Search MASTER_INDEX_COMPACT.md for similar assets",
    "3. Call PRISMSelfAwarenessEngine.recommendAIFeatures() for existing solutions",
    "",
    recentAssets.length > 0 ? `Recently created (avoid duplicates): ${recentAssets.slice(0, 5).join(", ")}` : "",
    aiFeatures.length > 0 ? `Top AI features: ${aiFeatures.join(", ")}` : "",
    "",
    "USE EXISTING ENGINES. DO NOT REBUILD.",
  ].filter(Boolean).join("\n");

  console.log(JSON.stringify({
    additionalContext: awareness,
  }));
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
