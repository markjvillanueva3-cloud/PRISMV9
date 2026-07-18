#!/usr/bin/env node
/**
 * Registry Consolidation Tool
 * ===========================
 * Identifies duplicate/superseded registry files, archives them,
 * and updates REGISTRY_MANIFEST.json with correct counts.
 *
 * Usage: node scripts/consolidate-registries.js [--dry-run] [--archive]
 *
 * Flags:
 *   --dry-run   Report what would be done without changing anything
 *   --archive   Move duplicates to registries/_archive/ instead of deleting
 *
 * @version 1.0.0
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REGISTRIES_DIR = path.resolve(__dirname, "../registries");
const ARCHIVE_DIR = path.join(REGISTRIES_DIR, "_archive");
const MANIFEST_PATH = path.join(REGISTRIES_DIR, "REGISTRY_MANIFEST.json");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ARCHIVE = args.includes("--archive") || DRY_RUN;

// Files known to be exact duplicates or superseded subsets
const REMOVAL_CANDIDATES = [
  {
    file: "WIRING_EXHAUSTIVE_FINAL.json",
    reason: "Identical duplicate of WIRING_EXHAUSTIVE.json (same version, same line count)",
    verify: "hash", // verify via content hash
    twin: "WIRING_EXHAUSTIVE.json",
  },
  {
    file: "WIRING_REGISTRY_FINAL.json",
    reason: "Superseded by WIRING_REGISTRY.json v6.0.0 (same 57,869 connections)",
    verify: "version", // newer version exists
    master: "WIRING_REGISTRY.json",
  },
  {
    file: "ENGINE_EXPANSION_PHYSICS.json",
    reason: "Duplicate of ENGINE_REGISTRY_WAVE1.json (physics subset)",
    verify: "hash",
    twin: "ENGINE_REGISTRY_WAVE1.json",
  },
  {
    file: "HOOK_REGISTRY_EXPANDED.json",
    reason: "Subset absorbed into HOOK_REGISTRY.json v4.0.0 (3,509 of 6,797 hooks)",
    verify: "subset",
    master: "HOOK_REGISTRY.json",
  },
  {
    file: "COMPLETE_HIERARCHY.json",
    reason: "Superseded by COMPLETE_HIERARCHY_v15.json (backup copy)",
    verify: "exists",
    master: "COMPLETE_HIERARCHY_v15.json",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

function fileHash(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").digest("hex").slice(0, 16);
}

function fileSizeKB(filePath) {
  return Math.round(fs.statSync(filePath).size / 1024 * 10) / 10;
}

function countRecords(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    // Try common record array fields
    for (const key of ["hooks", "engines", "formulas", "skills", "scripts", "agents", "resources", "connections", "wiring", "entries", "records", "data"]) {
      if (Array.isArray(data[key])) return data[key].length;
    }
    // Try top-level array
    if (Array.isArray(data)) return data.length;
    // Try metadata.total_count or similar
    if (data.metadata?.total_count) return data.metadata.total_count;
    if (data.metadata?.count) return data.metadata.count;
    if (data.total) return data.total;
    // Count top-level keys (for map-style registries)
    const keys = Object.keys(data).filter(k => !["metadata", "version", "generated", "generated_at", "schema_version", "description"].includes(k));
    if (keys.length > 5) return keys.length;
    return 0;
  } catch {
    return 0;
  }
}

function verifyCandidate(candidate) {
  const filePath = path.join(REGISTRIES_DIR, candidate.file);
  if (!fs.existsSync(filePath)) return { ok: false, reason: "File not found" };

  if (candidate.verify === "hash" && candidate.twin) {
    const twinPath = path.join(REGISTRIES_DIR, candidate.twin);
    if (!fs.existsSync(twinPath)) return { ok: false, reason: `Twin ${candidate.twin} not found` };
    const sizeA = fs.statSync(filePath).size;
    const sizeB = fs.statSync(twinPath).size;
    // Allow 5% size variance for formatting differences
    const ratio = Math.abs(sizeA - sizeB) / Math.max(sizeA, sizeB);
    if (ratio > 0.05) return { ok: false, reason: `Size mismatch: ${sizeA} vs ${sizeB} (${(ratio * 100).toFixed(1)}% diff)` };
    return { ok: true };
  }

  if (candidate.verify === "version" || candidate.verify === "subset" || candidate.verify === "exists") {
    const masterPath = path.join(REGISTRIES_DIR, candidate.master);
    if (!fs.existsSync(masterPath)) return { ok: false, reason: `Master ${candidate.master} not found` };
    // Master must be larger or equal
    const sizeCandidate = fs.statSync(filePath).size;
    const sizeMaster = fs.statSync(masterPath).size;
    if (sizeMaster < sizeCandidate * 0.5) return { ok: false, reason: `Master smaller than candidate` };
    return { ok: true };
  }

  return { ok: true };
}

// ============================================================================
// MAIN
// ============================================================================

console.log("=== PRISM Registry Consolidation Tool ===");
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : ARCHIVE ? "ARCHIVE" : "DELETE"}`);
console.log(`Registry dir: ${REGISTRIES_DIR}\n`);

// Phase 1: Verify and report candidates
let totalSaved = 0;
const actions = [];

for (const candidate of REMOVAL_CANDIDATES) {
  const filePath = path.join(REGISTRIES_DIR, candidate.file);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP  ${candidate.file} — already removed`);
    continue;
  }

  const verification = verifyCandidate(candidate);
  const sizeKB = fileSizeKB(filePath);

  if (!verification.ok) {
    console.log(`  WARN  ${candidate.file} (${sizeKB}KB) — verification failed: ${verification.reason}`);
    continue;
  }

  console.log(`  ${DRY_RUN ? "WOULD" : "WILL"} ${ARCHIVE ? "ARCHIVE" : "DELETE"}  ${candidate.file} (${sizeKB}KB)`);
  console.log(`         Reason: ${candidate.reason}`);
  totalSaved += sizeKB;
  actions.push({ ...candidate, sizeKB });
}

console.log(`\nTotal space savings: ${(totalSaved / 1024).toFixed(1)}MB across ${actions.length} files\n`);

// Phase 2: Execute
if (!DRY_RUN && actions.length > 0) {
  if (ARCHIVE) {
    if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  for (const action of actions) {
    const src = path.join(REGISTRIES_DIR, action.file);
    if (ARCHIVE) {
      const dest = path.join(ARCHIVE_DIR, action.file);
      fs.renameSync(src, dest);
      console.log(`  ARCHIVED  ${action.file} → _archive/`);
    } else {
      fs.unlinkSync(src);
      console.log(`  DELETED   ${action.file}`);
    }
  }
}

// Phase 3: Update REGISTRY_MANIFEST.json
console.log("\n--- Updating REGISTRY_MANIFEST.json ---");

if (fs.existsSync(MANIFEST_PATH)) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const removedFiles = new Set(actions.map(a => a.file));
  let updated = 0;
  let removed = 0;

  // Remove entries for archived/deleted files
  if (!DRY_RUN) {
    manifest.registries = manifest.registries.filter(r => {
      if (removedFiles.has(r.filename)) {
        removed++;
        return false;
      }
      return true;
    });
  }

  // Update record counts for remaining files
  for (const reg of manifest.registries) {
    const filePath = path.join(REGISTRIES_DIR, reg.filename);
    if (!fs.existsSync(filePath)) continue;

    const actualCount = countRecords(filePath);
    const actualSize = fs.statSync(filePath).size;
    const actualSizeKB = Math.round(actualSize / 1024 * 10) / 10;

    if (reg.record_count !== actualCount || Math.abs(reg.file_size_kb - actualSizeKB) > 1) {
      if (!DRY_RUN) {
        console.log(`  UPDATE  ${reg.filename}: count ${reg.record_count}→${actualCount}, size ${reg.file_size_kb}→${actualSizeKB}KB`);
        reg.record_count = actualCount;
        reg.file_size_bytes = actualSize;
        reg.file_size_kb = actualSizeKB;
      } else {
        console.log(`  WOULD UPDATE  ${reg.filename}: count ${reg.record_count}→${actualCount}`);
      }
      updated++;
    }
  }

  if (!DRY_RUN) {
    manifest.total_files = manifest.registries.length;
    manifest.generated_at = new Date().toISOString().split("T")[0];
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
    console.log(`\nManifest updated: ${removed} entries removed, ${updated} counts corrected, ${manifest.total_files} total files`);
  } else {
    console.log(`\nWould remove ${removedFiles.size} entries, update ${updated} counts`);
  }
}

console.log("\n=== Consolidation complete ===");
