/**
 * Registry Consolidation Tool
 * ===========================
 * Identifies and removes duplicate/superseded registry files,
 * then updates REGISTRY_MANIFEST.json with correct counts.
 *
 * Usage: node scripts/consolidate_registries.js [--dry-run] [--archive]
 *
 * --dry-run: Report what would be removed without deleting
 * --archive: Move to registries/_archive/ instead of deleting
 */

const fs = require("fs");
const path = require("path");

const REGISTRY_DIR = path.resolve(__dirname, "../registries");
const ARCHIVE_DIR = path.join(REGISTRY_DIR, "_archive");
const MANIFEST_PATH = path.join(REGISTRY_DIR, "REGISTRY_MANIFEST.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ARCHIVE = args.includes("--archive");

// Files confirmed as exact duplicates or subsets of their master
const REMOVABLE = [
  {
    file: "WIRING_EXHAUSTIVE_FINAL.json",
    reason: "Identical duplicate of WIRING_EXHAUSTIVE.json (same version, same line count)",
  },
  {
    file: "WIRING_REGISTRY_FINAL.json",
    reason: "Superseded by WIRING_REGISTRY.json v6.0.0 (same 57,869 connections)",
  },
  {
    file: "ENGINE_EXPANSION_PHYSICS.json",
    reason: "Duplicate of ENGINE_REGISTRY_WAVE1.json (physics subset)",
  },
  {
    file: "HOOK_REGISTRY_EXPANDED.json",
    reason: "Proper subset — content absorbed into HOOK_REGISTRY.json v4.0.0",
  },
  {
    file: "COMPLETE_HIERARCHY.json",
    reason: "Superseded backup (COMPLETE_HIERARCHY_v15 is authoritative, neither loaded at runtime)",
  },
  {
    file: "COMPLETE_HIERARCHY_v15.json",
    reason: "24MB archive — not loaded by any MCP server code at runtime",
  },
];

// Wave files that are subsets of their master (conditional removal)
const WAVE_SUBSETS = [
  { file: "FORMULA_REGISTRY_WAVE1.json", master: "FORMULA_REGISTRY.json", reason: "Wave 1 subset (71 formulas) — master has 499" },
  { file: "FORMULA_REGISTRY_WAVE2.json", master: "FORMULA_REGISTRY.json", reason: "Wave 2 subset (94 formulas) — master has 499" },
  { file: "FORMULA_REGISTRY_WAVE3.json", master: "FORMULA_REGISTRY.json", reason: "Wave 3 subset (171 formulas) — master has 499" },
  { file: "ENGINE_REGISTRY_WAVE1.json", master: "ENGINE_REGISTRY.json", reason: "Wave 1 subset (121 engines) — master has 447" },
  { file: "ENGINE_REGISTRY_WAVE2.json", master: "ENGINE_REGISTRY.json", reason: "Wave 2 subset — master has 447" },
];

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

function countRecords(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Try common record count patterns
    if (Array.isArray(data)) return data.length;
    if (data.hooks && Array.isArray(data.hooks)) return data.hooks.length;
    if (data.engines && Array.isArray(data.engines)) return data.engines.length;
    if (data.formulas && Array.isArray(data.formulas)) return data.formulas.length;
    if (data.scripts && Array.isArray(data.scripts)) return data.scripts.length;
    if (data.skills && Array.isArray(data.skills)) return data.skills.length;
    if (data.agents && Array.isArray(data.agents)) return data.agents.length;
    if (data.connections && Array.isArray(data.connections)) return data.connections.length;
    if (data.wirings && Array.isArray(data.wirings)) return data.wirings.length;
    // Count top-level keys for flat registries
    if (data.records) return data.records.length;
    if (data.entries) return data.entries.length;
    // For resource registries with multiple sections
    if (data.hooks && data.skills && data.scripts) {
      return (data.hooks?.length || 0) + (data.skills?.length || 0) +
             (data.scripts?.length || 0) + (data.agents?.length || 0) +
             (data.resources?.length || 0);
    }
    // Fallback: count top-level entries
    const keys = Object.keys(data).filter(k => !["version", "generated", "metadata", "meta", "stats", "summary", "description"].includes(k));
    for (const k of keys) {
      if (Array.isArray(data[k])) return data[k].length;
    }
    return 0;
  } catch {
    return 0;
  }
}

function removeOrArchive(filePath) {
  if (DRY_RUN) return;
  if (ARCHIVE) {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    const dest = path.join(ARCHIVE_DIR, path.basename(filePath));
    fs.renameSync(filePath, dest);
  } else {
    fs.unlinkSync(filePath);
  }
}

function updateManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const files = fs.readdirSync(REGISTRY_DIR).filter(f => f.endsWith(".json") && f !== "REGISTRY_MANIFEST.json");

  manifest.registries = files.map(filename => {
    const filePath = path.join(REGISTRY_DIR, filename);
    const size = getFileSize(filePath);
    const count = countRecords(filePath);
    // Try to determine type from filename
    let type = "UNKNOWN";
    if (/hook/i.test(filename)) type = "HOOK";
    else if (/engine/i.test(filename)) type = "ENGINE";
    else if (/formula/i.test(filename)) type = "FORMULA";
    else if (/wiring/i.test(filename)) type = "WIRING";
    else if (/skill/i.test(filename)) type = "SKILL";
    else if (/script/i.test(filename)) type = "SCRIPT";
    else if (/agent/i.test(filename)) type = "AGENT";
    else if (/resource/i.test(filename)) type = "RESOURCE";
    else if (/material|database/i.test(filename)) type = "DATABASE";
    else if (/hierarchy|architecture|taxonomy/i.test(filename)) type = "ARCHITECTURE";
    else if (/alias/i.test(filename)) type = "ALIAS";
    else if (/capability/i.test(filename)) type = "CAPABILITY";
    else if (/type.*system/i.test(filename)) type = "TYPE";
    else if (/validator/i.test(filename)) type = "VALIDATOR";
    else if (/constant/i.test(filename)) type = "CONSTANT";
    else if (/synergy|matrix/i.test(filename)) type = "MATRIX";
    else if (/mcp/i.test(filename)) type = "MCP";
    else if (/test|ilp/i.test(filename)) type = "TEST";

    return {
      filename,
      type,
      record_count: count,
      file_size_bytes: size,
      file_size_kb: Math.round(size / 1024 * 10) / 10,
    };
  }).sort((a, b) => a.filename.localeCompare(b.filename));

  manifest.total_files = manifest.registries.length;
  manifest.generated_at = new Date().toISOString().split("T")[0];

  if (!DRY_RUN) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  }

  return manifest;
}

// === MAIN ===
console.log("=== PRISM Registry Consolidation Tool ===");
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : ARCHIVE ? "ARCHIVE" : "DELETE"}\n`);

let totalSaved = 0;
let removedCount = 0;

console.log("--- Exact Duplicates / Superseded Files ---");
for (const entry of REMOVABLE) {
  const filePath = path.join(REGISTRY_DIR, entry.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${entry.file} (already removed)`);
    continue;
  }
  const size = getFileSize(filePath);
  console.log(`  ${DRY_RUN ? "WOULD REMOVE" : ARCHIVE ? "ARCHIVE" : "REMOVE"}: ${entry.file} (${(size / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`    Reason: ${entry.reason}`);
  removeOrArchive(filePath);
  totalSaved += size;
  removedCount++;
}

console.log("\n--- Wave Subsets (already consolidated into master) ---");
for (const entry of WAVE_SUBSETS) {
  const filePath = path.join(REGISTRY_DIR, entry.file);
  const masterPath = path.join(REGISTRY_DIR, entry.master);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${entry.file} (already removed)`);
    continue;
  }
  if (!fs.existsSync(masterPath)) {
    console.log(`  SKIP: ${entry.file} (master ${entry.master} not found)`);
    continue;
  }
  const size = getFileSize(filePath);
  console.log(`  ${DRY_RUN ? "WOULD REMOVE" : ARCHIVE ? "ARCHIVE" : "REMOVE"}: ${entry.file} (${(size / 1024).toFixed(0)}KB)`);
  console.log(`    Reason: ${entry.reason}`);
  removeOrArchive(filePath);
  totalSaved += size;
  removedCount++;
}

console.log("\n--- Updating REGISTRY_MANIFEST.json ---");
const manifest = updateManifest();
console.log(`  Total registry files: ${manifest.total_files}`);

console.log("\n=== Summary ===");
console.log(`  Files removed: ${removedCount}`);
console.log(`  Space saved: ${(totalSaved / 1024 / 1024).toFixed(1)}MB`);
console.log(`  Manifest updated: ${!DRY_RUN}`);
if (DRY_RUN) console.log("\n  Run without --dry-run to apply changes.");
if (ARCHIVE) console.log(`  Archived files moved to: ${ARCHIVE_DIR}`);
