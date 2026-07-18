#!/usr/bin/env node
/**
 * build-alias-table-index — index mapping engine aliases and renames
 *
 * Universal Phase 0.7. Creates ALIAS_TABLE_INDEX.json which maps old engine
 * names to their current names, supporting migration and backward compatibility.
 * Backs AwarenessQueryEngine.resolveAlias() for name resolution.
 *
 * Output: mcp-server/data/state/ALIAS_TABLE_INDEX.json
 *
 * @module scripts/build-alias-table-index
 * @phase Universal 0.7 Reverse Index Layer
 */

import { promises as fs } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), "..");
const ENGINES_DIR = path.join(ROOT, "src", "engines");
const OUTPUT_PATH = path.join(ROOT, "data", "state", "ALIAS_TABLE_INDEX.json");

// ============================================================================
// TYPES
// ============================================================================

export interface AliasEntry {
  alias: string;
  canonical: string;
  reason: string;
  deprecated: boolean;
  addedAt: string;
}

export interface AliasTableIndex {
  schemaVersion: number;
  lastUpdated: string;
  aliasCount: number;
  aliases: Record<string, AliasEntry>;
  byCanonical: Record<string, string[]>;
}

// ============================================================================
// KNOWN ALIASES (manually curated + auto-detected)
// ============================================================================

const KNOWN_ALIASES: Array<{ alias: string; canonical: string; reason: string }> = [
  // Common abbreviation patterns
  { alias: "KienzleEngine", canonical: "KienzleForceModelEngine", reason: "abbreviation" },
  { alias: "TaylorEngine", canonical: "TaylorToolLifeEngine", reason: "abbreviation" },
  { alias: "BayesianEngine", canonical: "BayesianToolLifeEngine", reason: "abbreviation" },

  // WEDM variations
  { alias: "WireEDMEngine", canonical: "WEDMCoreEngine", reason: "naming convention" },
  { alias: "EDMWireEngine", canonical: "WEDMCoreEngine", reason: "word order" },

  // Mill/Milling variations
  { alias: "MillEngine", canonical: "MillingCoreEngine", reason: "abbreviation" },
  { alias: "MillingEngine", canonical: "MillingCoreEngine", reason: "abbreviation" },

  // Lathe/Turning variations
  { alias: "LatheEngine", canonical: "LatheCoreEngine", reason: "abbreviation" },
  { alias: "TurningEngine", canonical: "TurningCoreEngine", reason: "abbreviation" },

  // Historical renames
  { alias: "ForceCalculatorEngine", canonical: "CuttingForceCalculatorEngine", reason: "renamed" },
  { alias: "ToolLifeEngine", canonical: "TaylorToolLifeEngine", reason: "renamed" },
  { alias: "SpeedFeedEngine", canonical: "SpeedFeedOptimizerEngine", reason: "renamed" },

  // Orchestrator variations
  { alias: "MillOrchestrator", canonical: "MillMasterOrchestratorFacadeEngine", reason: "abbreviation" },
  { alias: "LatheOrchestrator", canonical: "LatheMasterOrchestratorFacadeEngine", reason: "abbreviation" },
];

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================

/**
 * Scan engines directory to find actual engine names
 */
async function getCanonicalEngineNames(): Promise<Set<string>> {
  const names = new Set<string>();

  try {
    const files = await fs.readdir(ENGINES_DIR);
    for (const file of files) {
      if (file.endsWith(".ts") && !file.includes(".test.")) {
        const name = file.replace(".ts", "");
        names.add(name);
      }
    }
  } catch {
    // Directory not found
  }

  return names;
}

/**
 * Auto-detect potential aliases from engine naming patterns
 */
function generateAutoAliases(canonicalNames: Set<string>): AliasEntry[] {
  const autoAliases: AliasEntry[] = [];

  for (const canonical of canonicalNames) {
    // Generate short forms (remove "Engine" suffix variations)
    if (canonical.endsWith("Engine")) {
      const base = canonical.slice(0, -6);

      // Add without "Engine" as alias
      if (!canonicalNames.has(base)) {
        autoAliases.push({
          alias: base,
          canonical,
          reason: "auto-short-form",
          deprecated: false,
          addedAt: new Date().toISOString(),
        });
      }
    }

    // Handle "Core" engines - alias without Core
    if (canonical.includes("Core")) {
      const withoutCore = canonical.replace("Core", "");
      if (!canonicalNames.has(withoutCore)) {
        autoAliases.push({
          alias: withoutCore,
          canonical,
          reason: "auto-core-variant",
          deprecated: false,
          addedAt: new Date().toISOString(),
        });
      }
    }
  }

  return autoAliases;
}

/**
 * Build the complete alias table index
 */
export async function buildAliasTableIndex(opts: { verbose?: boolean } = {}): Promise<AliasTableIndex> {
  const canonicalNames = await getCanonicalEngineNames();

  if (opts.verbose) {
    console.log(`[build-alias-table-index] Found ${canonicalNames.size} canonical engine names`);
  }

  const aliases: Record<string, AliasEntry> = {};
  const byCanonical: Record<string, string[]> = {};

  // Add known aliases (only if canonical exists)
  for (const known of KNOWN_ALIASES) {
    if (canonicalNames.has(known.canonical)) {
      aliases[known.alias.toLowerCase()] = {
        alias: known.alias,
        canonical: known.canonical,
        reason: known.reason,
        deprecated: false,
        addedAt: "2026-04-01T00:00:00Z",
      };

      if (!byCanonical[known.canonical]) byCanonical[known.canonical] = [];
      byCanonical[known.canonical].push(known.alias);
    }
  }

  // Add auto-detected aliases
  const autoAliases = generateAutoAliases(canonicalNames);
  for (const auto of autoAliases) {
    const key = auto.alias.toLowerCase();
    if (!aliases[key]) {
      aliases[key] = auto;

      if (!byCanonical[auto.canonical]) byCanonical[auto.canonical] = [];
      byCanonical[auto.canonical].push(auto.alias);
    }
  }

  if (opts.verbose) {
    console.log(`  Known aliases: ${KNOWN_ALIASES.length}`);
    console.log(`  Auto-detected: ${autoAliases.length}`);
  }

  const index: AliasTableIndex = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    aliasCount: Object.keys(aliases).length,
    aliases,
    byCanonical,
  };

  if (opts.verbose) {
    console.log(`  Done. ${index.aliasCount} aliases indexed.`);
  }

  return index;
}

/**
 * Write index to disk
 */
export async function writeAliasTableIndex(index: AliasTableIndex): Promise<void> {
  const dir = path.dirname(OUTPUT_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(index, null, 2));
}

/**
 * Read index from disk
 */
export async function readAliasTableIndex(): Promise<AliasTableIndex | null> {
  try {
    const content = await fs.readFile(OUTPUT_PATH, "utf-8");
    return JSON.parse(content) as AliasTableIndex;
  } catch {
    return null;
  }
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const json = process.argv.includes("--json");

  console.log("[build-alias-table-index] Scanning...");
  const start = Date.now();
  const index = await buildAliasTableIndex({ verbose });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (json) {
    console.log(JSON.stringify(index, null, 2));
    return;
  }

  await writeAliasTableIndex(index);
  console.log(`[build-alias-table-index] Wrote ${OUTPUT_PATH} (${elapsed}s)`);

  console.log(`build-alias-table-index — ${index.aliasCount} aliases indexed`);
  console.log(`  canonical engines with aliases: ${Object.keys(index.byCanonical).length}`);
}

// Only run main when invoked directly
const invokedPath = process.argv[1] ? path.resolve(process.argv[1]).toLowerCase() : "";
const thisPath = fileURLToPath(import.meta.url).toLowerCase();
if (invokedPath === thisPath) {
  main().catch((err) => {
    console.error("build-alias-table-index failed:", err);
    process.exit(2);
  });
}
