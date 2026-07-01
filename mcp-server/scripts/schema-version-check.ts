#!/usr/bin/env npx tsx
/**
 * PRISM Schema Version Check
 * ==========================
 * CI script that compares current schemas to a baseline and detects changes.
 * Outputs warnings for minor changes and errors for breaking changes.
 *
 * Usage:
 *   npx tsx scripts/schema-version-check.ts [--update-baseline] [--strict]
 *
 * Options:
 *   --update-baseline  Update the baseline with current schema fingerprints
 *   --strict           Treat warnings as errors (for pre-release checks)
 *
 * Exit codes:
 *   0 - No breaking changes detected
 *   1 - Breaking changes detected
 *   2 - Script error
 *
 * @version 1.0.0
 * @date 2026-04-12
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOT_DIR = path.resolve(import.meta.dirname || __dirname, "..");
const BASELINE_FILE = path.join(ROOT_DIR, "data", "state", "schema-baseline.json");
const CHANGELOG_FILE = path.join(ROOT_DIR, "data", "schema-changelog.json");

// Schema files to track (relative to src/schemas/)
const TRACKED_SCHEMAS = [
  "actionSchemaTypes.ts",
  "healthSchema.ts",
  "coordinationTypes.ts",
  "roadmapSchema.ts",
  "tolerances.ts",
  "safetyCalcSchema.ts",
];

// ============================================================================
// TYPES
// ============================================================================

interface SchemaFingerprint {
  file: string;
  hash: string;
  exports: string[];
  last_modified: string;
}

interface SchemaBaseline {
  version: string;
  created_at: string;
  updated_at: string;
  fingerprints: Record<string, SchemaFingerprint>;
}

interface ChangeDetection {
  file: string;
  type: "added" | "removed" | "modified";
  severity: "breaking" | "warning" | "info";
  details: string;
}

// ============================================================================
// FINGERPRINTING
// ============================================================================

/**
 * Generate a simple hash for file contents.
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `h_${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Extract export names from a TypeScript file.
 */
function extractExports(content: string): string[] {
  const exports: string[] = [];

  // Match: export const/type/interface/function NAME
  const patterns = [
    /export\s+(?:const|let|var)\s+(\w+)/g,
    /export\s+type\s+(\w+)/g,
    /export\s+interface\s+(\w+)/g,
    /export\s+function\s+(\w+)/g,
    /export\s+class\s+(\w+)/g,
    /export\s+enum\s+(\w+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      if (!exports.includes(match[1])) {
        exports.push(match[1]);
      }
    }
  }

  return exports.sort();
}

/**
 * Generate fingerprint for a schema file.
 */
function fingerprintFile(filePath: string): SchemaFingerprint | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const stats = fs.statSync(filePath);

  return {
    file: path.basename(filePath),
    hash: hashContent(content),
    exports: extractExports(content),
    last_modified: stats.mtime.toISOString(),
  };
}

// ============================================================================
// CHANGE DETECTION
// ============================================================================

/**
 * Detect breaking changes between fingerprints.
 */
function detectBreakingChanges(
  oldFp: SchemaFingerprint,
  newFp: SchemaFingerprint
): ChangeDetection[] {
  const changes: ChangeDetection[] = [];

  // Check for removed exports (breaking)
  const removedExports = oldFp.exports.filter(e => !newFp.exports.includes(e));
  for (const removed of removedExports) {
    changes.push({
      file: newFp.file,
      type: "modified",
      severity: "breaking",
      details: `Removed export: "${removed}"`,
    });
  }

  // Check for added exports (non-breaking, info)
  const addedExports = newFp.exports.filter(e => !oldFp.exports.includes(e));
  for (const added of addedExports) {
    changes.push({
      file: newFp.file,
      type: "modified",
      severity: "info",
      details: `Added export: "${added}"`,
    });
  }

  // Hash change without export changes = internal modification
  if (oldFp.hash !== newFp.hash && removedExports.length === 0 && addedExports.length === 0) {
    changes.push({
      file: newFp.file,
      type: "modified",
      severity: "warning",
      details: "Internal changes detected (implementation modified)",
    });
  }

  return changes;
}

// ============================================================================
// BASELINE MANAGEMENT
// ============================================================================

/**
 * Load existing baseline or create empty one.
 */
function loadBaseline(): SchemaBaseline {
  if (fs.existsSync(BASELINE_FILE)) {
    const content = fs.readFileSync(BASELINE_FILE, "utf-8");
    return JSON.parse(content);
  }

  return {
    version: "0.0.0",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fingerprints: {},
  };
}

/**
 * Save baseline to file.
 */
function saveBaseline(baseline: SchemaBaseline): void {
  const dir = path.dirname(BASELINE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
}

/**
 * Get current schema version from schemaVersioning.ts.
 */
function getCurrentVersion(): string {
  const versioningFile = path.join(ROOT_DIR, "src", "schemas", "schemaVersioning.ts");
  if (!fs.existsSync(versioningFile)) {
    return "0.0.0";
  }

  const content = fs.readFileSync(versioningFile, "utf-8");
  const match = content.match(/SCHEMA_VERSION\s*=\s*["'](\d+\.\d+\.\d+)["']/);
  return match ? match[1] : "0.0.0";
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const updateBaseline = args.includes("--update-baseline");
  const strictMode = args.includes("--strict");

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║        PRISM Schema Version Check                ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();

  const currentVersion = getCurrentVersion();
  console.log(`  Current schema version: ${currentVersion}`);
  console.log(`  Strict mode: ${strictMode ? "YES" : "NO"}`);
  console.log();

  // Load baseline
  const baseline = loadBaseline();
  console.log(`  Baseline version: ${baseline.version || "(none)"}`);
  console.log(`  Last updated: ${baseline.updated_at || "(never)"}`);
  console.log();

  // Generate current fingerprints
  const schemasDir = path.join(ROOT_DIR, "src", "schemas");
  const currentFingerprints: Record<string, SchemaFingerprint> = {};
  const allChanges: ChangeDetection[] = [];

  console.log("  Scanning schemas...");
  for (const schemaFile of TRACKED_SCHEMAS) {
    const filePath = path.join(schemasDir, schemaFile);
    const fp = fingerprintFile(filePath);

    if (fp) {
      currentFingerprints[schemaFile] = fp;
      console.log(`    [OK] ${schemaFile} (${fp.exports.length} exports)`);

      // Compare to baseline
      const baselineFp = baseline.fingerprints[schemaFile];
      if (baselineFp) {
        const changes = detectBreakingChanges(baselineFp, fp);
        allChanges.push(...changes);
      } else {
        allChanges.push({
          file: schemaFile,
          type: "added",
          severity: "info",
          details: "New schema file added to tracking",
        });
      }
    } else {
      console.log(`    [MISSING] ${schemaFile}`);
    }
  }

  // Check for removed files
  for (const file of Object.keys(baseline.fingerprints)) {
    if (!currentFingerprints[file]) {
      allChanges.push({
        file,
        type: "removed",
        severity: "breaking",
        details: "Schema file removed from codebase",
      });
    }
  }

  console.log();

  // Report changes
  const breakingChanges = allChanges.filter(c => c.severity === "breaking");
  const warnings = allChanges.filter(c => c.severity === "warning");
  const infos = allChanges.filter(c => c.severity === "info");

  if (allChanges.length === 0) {
    console.log("  [PASS] No schema changes detected.");
  } else {
    console.log("  Changes detected:");
    console.log();

    if (breakingChanges.length > 0) {
      console.log("  BREAKING CHANGES:");
      for (const change of breakingChanges) {
        console.log(`    [BREAK] ${change.file}: ${change.details}`);
      }
      console.log();
    }

    if (warnings.length > 0) {
      console.log("  WARNINGS:");
      for (const change of warnings) {
        console.log(`    [WARN] ${change.file}: ${change.details}`);
      }
      console.log();
    }

    if (infos.length > 0) {
      console.log("  INFO:");
      for (const change of infos) {
        console.log(`    [INFO] ${change.file}: ${change.details}`);
      }
      console.log();
    }
  }

  // Update baseline if requested
  if (updateBaseline) {
    const newBaseline: SchemaBaseline = {
      version: currentVersion,
      created_at: baseline.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fingerprints: currentFingerprints,
    };
    saveBaseline(newBaseline);
    console.log(`  [UPDATE] Baseline updated to version ${currentVersion}`);
    console.log(`           Saved to: ${BASELINE_FILE}`);
    console.log();
  }

  // Summary
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║                    SUMMARY                       ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Breaking changes: ${breakingChanges.length.toString().padEnd(29)}║`);
  console.log(`║  Warnings:         ${warnings.length.toString().padEnd(29)}║`);
  console.log(`║  Info:             ${infos.length.toString().padEnd(29)}║`);
  console.log("╚══════════════════════════════════════════════════╝");

  // Exit code
  if (breakingChanges.length > 0) {
    console.log();
    console.log("  [FAIL] Breaking changes detected. Update SCHEMA_VERSION and changelog.");
    process.exit(1);
  }

  if (strictMode && warnings.length > 0) {
    console.log();
    console.log("  [FAIL] Warnings in strict mode. Review changes before release.");
    process.exit(1);
  }

  console.log();
  console.log("  [PASS] Schema version check passed.");
  process.exit(0);
}

main().catch((error) => {
  console.error(`\nScript error: ${error.message}`);
  process.exit(2);
});
