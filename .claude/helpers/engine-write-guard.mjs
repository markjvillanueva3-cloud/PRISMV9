#!/usr/bin/env node
/**
 * engine-write-guard.mjs — PreToolUse guard for engine file writes
 *
 * Runs before Write/Edit on engine files. Checks if the engine name
 * already exists in ENGINE_DIGEST.md or the asset registry.
 *
 * Returns JSON with:
 * - continue: false + stopReason to BLOCK
 * - additionalContext to WARN
 */

import fs from "node:fs";
import path from "node:path";

const ENGINE_DIGEST_PATH = "H:/prism/mcp-server/data/docs/ENGINE_DIGEST.md";
const MASTER_INDEX_PATH = "H:/prism/mcp-server/data/docs/MASTER_INDEX_COMPACT.md";
const ASSET_REGISTRY_PATH = "H:/prism/mcp-server/data/state/cross-session-asset-registry.json";

function extractEngineName(filePath) {
  const basename = path.basename(filePath, ".ts");
  if (!basename.endsWith("Engine")) return null;
  return basename;
}

function checkEngineDigest(engineName) {
  try {
    // Try MASTER_INDEX_COMPACT first (has engine list)
    let content;
    try {
      content = fs.readFileSync(MASTER_INDEX_PATH, "utf-8");
    } catch {
      content = fs.readFileSync(ENGINE_DIGEST_PATH, "utf-8");
    }

    const normalized = engineName.toLowerCase();

    // Look for engine names in list format: "- EngineName" or "// src/engines/EngineName.ts"
    const lines = content.split("\n");
    for (const line of lines) {
      // Match "- CuttingForceEngine" format from MASTER_INDEX_COMPACT
      let match = line.match(/^-\s+(\w+Engine)\b/);
      if (!match) {
        // Match "// src/engines/EngineName.ts" format from ENGINE_DIGEST
        match = line.match(/\/\/\s+src\/engines\/(\w+)\.ts/);
      }

      if (match) {
        const existing = match[1].toLowerCase();
        if (existing === normalized) {
          return { exact: true, name: match[1] };
        }
        // Fuzzy: check if 80% similar
        const similarity = jaccardSimilarity(existing, normalized);
        if (similarity > 0.8) {
          return { similar: true, name: match[1], similarity };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

function checkAssetRegistry(engineName) {
  try {
    const registry = JSON.parse(fs.readFileSync(ASSET_REGISTRY_PATH, "utf-8"));
    if (!registry.assets) return null;

    const normalized = engineName.toLowerCase();
    for (const [name, info] of Object.entries(registry.assets)) {
      if (info.type === "engine" && name.toLowerCase() === normalized) {
        return { exact: true, name, info };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(""));
  const setB = new Set(b.split(""));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

function main() {
  let input;
  try {
    input = JSON.parse(fs.readFileSync(0, "utf-8"));
  } catch {
    return;
  }

  const toolName = input.tool_name;
  const toolInput = input.tool_input || {};

  // Only check Write/Edit on engine files
  if (!["Write", "Edit"].includes(toolName)) return;

  const filePath = toolInput.file_path || toolInput.path || "";
  if (!filePath.includes("/engines/") && !filePath.includes("\\engines\\")) return;
  if (!filePath.endsWith(".ts")) return;

  const engineName = extractEngineName(filePath);
  if (!engineName) return;

  // Check if file already exists (editing existing is OK)
  if (fs.existsSync(filePath)) {
    // Existing file — allow edit
    return;
  }

  // NEW FILE — check for duplicates
  const digestMatch = checkEngineDigest(engineName);
  const registryMatch = checkAssetRegistry(engineName);

  if (digestMatch?.exact || registryMatch?.exact) {
    // HARD BLOCK
    console.log(JSON.stringify({
      continue: false,
      stopReason: `BLOCKED: Engine "${engineName}" already exists. Use the existing engine instead of creating a duplicate. Run /dedup to find alternatives.`,
      decision: "block",
      reason: `Duplicate engine: ${engineName}`,
    }));
    return;
  }

  if (digestMatch?.similar) {
    // SOFT WARNING
    console.log(JSON.stringify({
      systemMessage: `WARNING: "${engineName}" is ${Math.round(digestMatch.similarity * 100)}% similar to existing "${digestMatch.name}". Verify this isn't a duplicate before proceeding.`,
      additionalContext: `## POTENTIAL DUPLICATE DETECTED\n\nNew engine "${engineName}" is very similar to existing "${digestMatch.name}".\n\nBefore creating:\n1. Review the existing engine\n2. Consider extending it instead\n3. If truly different, proceed with a distinct name`,
    }));
    return;
  }
}

main();
