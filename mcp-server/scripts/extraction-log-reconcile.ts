/**
 * extraction-log-reconcile.ts — USSH Phase 4
 * ============================================
 *
 * Reconciles extraction log with file system state.
 * Marks moved/renamed/deleted source files as superseded.
 *
 * Usage: npx tsx scripts/extraction-log-reconcile.ts [--fix] [--verbose]
 *
 * Actions:
 *   - Verify extracted sources still exist
 *   - Mark missing sources as superseded
 *   - Detect potential renames via content hash
 *   - Update extraction log with current state
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";

const STATE_DIR = path.join(process.cwd(), "data/state");
const EXTRACTION_LOG = path.join(STATE_DIR, "extraction-log.json");
const RECONCILE_REPORT = path.join(STATE_DIR, "extraction-reconcile-report.json");

interface ExtractionEntry {
  sourceId: string;
  sourcePath: string;
  extractedAt: number;
  sha256?: string;
  assetsCreated: string[];
  status?: "active" | "superseded" | "missing" | "renamed";
  supersededBy?: string;
  supersededAt?: number;
}

interface ExtractionLog {
  schemaVersion: number;
  entries: ExtractionEntry[];
}

interface ReconcileReport {
  timestamp: number;
  totalEntries: number;
  verified: number;
  missing: number;
  superseded: number;
  potentialRenames: Array<{ old: string; new: string; confidence: number }>;
  actions: Array<{ action: string; entry: string; reason: string }>;
  recommendations: string[];
}

function loadExtractionLog(): ExtractionLog {
  try {
    if (fs.existsSync(EXTRACTION_LOG)) {
      return JSON.parse(fs.readFileSync(EXTRACTION_LOG, "utf-8"));
    }
  } catch {}

  return {
    schemaVersion: 1,
    entries: []
  };
}

function saveExtractionLog(log: ExtractionLog): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(EXTRACTION_LOG, JSON.stringify(log, null, 2));
}

function computeFileHash(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return null;
  }
}

async function reconcile(fix: boolean, verbose: boolean): Promise<ReconcileReport> {
  const log = loadExtractionLog();
  const actions: ReconcileReport["actions"] = [];
  const potentialRenames: ReconcileReport["potentialRenames"] = [];

  let verified = 0;
  let missing = 0;
  let superseded = 0;

  // Build hash index for rename detection
  const hashToPath: Map<string, string[]> = new Map();

  console.log("Building content hash index...");

  for (const entry of log.entries) {
    if (entry.sha256) {
      const paths = hashToPath.get(entry.sha256) || [];
      paths.push(entry.sourcePath);
      hashToPath.set(entry.sha256, paths);
    }
  }

  console.log(`Processing ${log.entries.length} extraction entries...`);

  for (const entry of log.entries) {
    // Skip already superseded
    if (entry.status === "superseded") {
      superseded++;
      continue;
    }

    // Check if source still exists
    const exists = fs.existsSync(entry.sourcePath);

    if (exists) {
      // Verify hash if available
      if (entry.sha256) {
        const currentHash = computeFileHash(entry.sourcePath);
        if (currentHash && currentHash !== entry.sha256) {
          actions.push({
            action: "content_changed",
            entry: entry.sourceId,
            reason: `Content hash changed from ${entry.sha256.slice(0, 8)} to ${currentHash?.slice(0, 8)}`
          });

          if (verbose) {
            console.log(`  Content changed: ${entry.sourcePath}`);
          }
        }
      }
      verified++;
    } else {
      // Source missing — check for potential rename
      if (entry.sha256) {
        const candidates = hashToPath.get(entry.sha256) || [];
        const otherCandidates = candidates.filter(p => p !== entry.sourcePath && fs.existsSync(p));

        if (otherCandidates.length > 0) {
          potentialRenames.push({
            old: entry.sourcePath,
            new: otherCandidates[0],
            confidence: 0.9
          });

          actions.push({
            action: "potential_rename",
            entry: entry.sourceId,
            reason: `May have been renamed to ${otherCandidates[0]}`
          });

          if (fix) {
            entry.status = "renamed";
            entry.supersededBy = otherCandidates[0];
            entry.supersededAt = Date.now();
          }
        } else {
          actions.push({
            action: "mark_missing",
            entry: entry.sourceId,
            reason: `Source file not found: ${entry.sourcePath}`
          });

          if (fix) {
            entry.status = "missing";
            entry.supersededAt = Date.now();
          }
        }
      } else {
        actions.push({
          action: "mark_missing",
          entry: entry.sourceId,
          reason: `Source file not found (no hash for rename detection)`
        });

        if (fix) {
          entry.status = "missing";
          entry.supersededAt = Date.now();
        }
      }

      missing++;
    }
  }

  // Save updated log if fixing
  if (fix && actions.length > 0) {
    saveExtractionLog(log);
    console.log(`Updated extraction log with ${actions.length} changes.`);
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (missing > 0 && !fix) {
    recommendations.push(`${missing} missing sources detected — run with --fix to update log`);
  }

  if (potentialRenames.length > 0) {
    recommendations.push(
      `${potentialRenames.length} potential renames detected — verify and update references`
    );
  }

  const staleEntries = log.entries.filter(
    e => e.extractedAt && Date.now() - e.extractedAt > 365 * 24 * 60 * 60 * 1000
  );
  if (staleEntries.length > 10) {
    recommendations.push(
      `${staleEntries.length} entries >1 year old — consider re-extraction for updates`
    );
  }

  const report: ReconcileReport = {
    timestamp: Date.now(),
    totalEntries: log.entries.length,
    verified,
    missing,
    superseded,
    potentialRenames,
    actions,
    recommendations
  };

  fs.writeFileSync(RECONCILE_REPORT, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: ReconcileReport): void {
  console.log("\n=== Extraction Log Reconciliation Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);

  console.log("\nSummary:");
  console.log(`  Total entries: ${report.totalEntries}`);
  console.log(`  Verified: ${report.verified}`);
  console.log(`  Missing: ${report.missing}`);
  console.log(`  Superseded: ${report.superseded}`);

  if (report.potentialRenames.length > 0) {
    console.log("\nPotential Renames:");
    for (const rename of report.potentialRenames.slice(0, 10)) {
      console.log(`  ${rename.old}`);
      console.log(`    → ${rename.new} (${(rename.confidence * 100).toFixed(0)}% confidence)`);
    }
    if (report.potentialRenames.length > 10) {
      console.log(`  ... and ${report.potentialRenames.length - 10} more`);
    }
  }

  if (report.actions.length > 0) {
    console.log("\nActions:");
    for (const action of report.actions.slice(0, 20)) {
      console.log(`  [${action.action}] ${action.entry}`);
      console.log(`    ${action.reason}`);
    }
    if (report.actions.length > 20) {
      console.log(`  ... and ${report.actions.length - 20} more`);
    }
  }

  if (report.recommendations.length > 0) {
    console.log("\nRecommendations:");
    for (const rec of report.recommendations) {
      console.log(`  → ${rec}`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const fix = args.includes("--fix");
const verbose = args.includes("--verbose");

reconcile(fix, verbose).then(printReport);
