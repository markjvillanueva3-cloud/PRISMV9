/**
 * h-drive-delta-scan.ts — USSH Phase 4
 * =====================================
 *
 * Detects external changes on H: drive (JM DIE program archive).
 * Surfaces new/modified/deleted files since last scan.
 *
 * Usage: npx tsx scripts/h-drive-delta-scan.ts [--full] [--path=H:/PRISM/JM DIE]
 *
 * Outputs:
 *   - New files not in extraction log
 *   - Modified files (timestamp change)
 *   - Deleted files (in log but missing)
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

const STATE_DIR = path.join(process.cwd(), "data/state");
const SCAN_STATE_FILE = path.join(STATE_DIR, "h-drive-scan-state.json");
const DELTA_REPORT_FILE = path.join(STATE_DIR, "h-drive-delta-report.json");

interface FileEntry {
  path: string;
  size: number;
  mtime: number;
  hash?: string;
}

interface ScanState {
  lastScan: number;
  rootPath: string;
  files: Record<string, FileEntry>;
  totalFiles: number;
  totalSize: number;
}

interface DeltaReport {
  timestamp: number;
  rootPath: string;
  scanDuration: number;
  newFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  summary: {
    total: number;
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  recommendations: string[];
}

function loadScanState(): ScanState | null {
  try {
    if (fs.existsSync(SCAN_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SCAN_STATE_FILE, "utf-8"));
    }
  } catch {}
  return null;
}

function saveScanState(state: ScanState): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(SCAN_STATE_FILE, JSON.stringify(state, null, 2));
}

async function scanDirectory(rootPath: string, fullScan: boolean): Promise<DeltaReport> {
  const startTime = Date.now();
  console.log(`Scanning ${rootPath}...`);

  const previousState = loadScanState();
  const previousFiles = previousState?.files || {};

  // Scan current files
  const patterns = ["**/*.MIN", "**/*.mcx*", "**/*.MCX", "**/*.NC", "**/*.nc", "**/*.tap"];
  const currentFiles: Record<string, FileEntry> = {};

  let scannedCount = 0;
  let totalSize = 0;

  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, {
        cwd: rootPath,
        nocase: true,
        absolute: false
      });

      for (const file of files) {
        const fullPath = path.join(rootPath, file);
        try {
          const stats = fs.statSync(fullPath);
          currentFiles[file] = {
            path: file,
            size: stats.size,
            mtime: stats.mtimeMs
          };
          scannedCount++;
          totalSize += stats.size;

          if (scannedCount % 1000 === 0) {
            console.log(`  Scanned ${scannedCount} files...`);
          }
        } catch {}
      }
    } catch (err) {
      console.warn(`  Warning: Could not scan pattern ${pattern}`);
    }
  }

  console.log(`  Total: ${scannedCount} files, ${(totalSize / 1024 / 1024).toFixed(1)} MB`);

  // Compute deltas
  const newFiles: string[] = [];
  const modifiedFiles: string[] = [];
  const deletedFiles: string[] = [];

  // Find new and modified
  for (const [filePath, entry] of Object.entries(currentFiles)) {
    const prev = previousFiles[filePath];
    if (!prev) {
      newFiles.push(filePath);
    } else if (prev.mtime !== entry.mtime || prev.size !== entry.size) {
      modifiedFiles.push(filePath);
    }
  }

  // Find deleted
  for (const filePath of Object.keys(previousFiles)) {
    if (!currentFiles[filePath]) {
      deletedFiles.push(filePath);
    }
  }

  const unchanged = scannedCount - newFiles.length - modifiedFiles.length;

  // Save new state
  const newState: ScanState = {
    lastScan: Date.now(),
    rootPath,
    files: currentFiles,
    totalFiles: scannedCount,
    totalSize
  };
  saveScanState(newState);

  // Generate recommendations
  const recommendations: string[] = [];

  if (newFiles.length > 0) {
    recommendations.push(
      `${newFiles.length} new files detected — consider running /pdf-learn or extraction pipeline`
    );
  }

  if (modifiedFiles.length > 10) {
    recommendations.push(
      `${modifiedFiles.length} modified files — validate extraction log is current`
    );
  }

  if (deletedFiles.length > 0) {
    recommendations.push(
      `${deletedFiles.length} files deleted — update extraction log to mark superseded`
    );
  }

  const report: DeltaReport = {
    timestamp: Date.now(),
    rootPath,
    scanDuration: Date.now() - startTime,
    newFiles: newFiles.slice(0, 100), // Limit for report size
    modifiedFiles: modifiedFiles.slice(0, 100),
    deletedFiles: deletedFiles.slice(0, 100),
    summary: {
      total: scannedCount,
      new: newFiles.length,
      modified: modifiedFiles.length,
      deleted: deletedFiles.length,
      unchanged
    },
    recommendations
  };

  fs.writeFileSync(DELTA_REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: DeltaReport): void {
  console.log("\n=== H: Drive Delta Scan Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Root Path: ${report.rootPath}`);
  console.log(`Scan Duration: ${(report.scanDuration / 1000).toFixed(1)}s`);

  console.log("\nSummary:");
  console.log(`  Total files: ${report.summary.total}`);
  console.log(`  New: ${report.summary.new}`);
  console.log(`  Modified: ${report.summary.modified}`);
  console.log(`  Deleted: ${report.summary.deleted}`);
  console.log(`  Unchanged: ${report.summary.unchanged}`);

  if (report.newFiles.length > 0) {
    console.log("\nNew Files (first 10):");
    for (const file of report.newFiles.slice(0, 10)) {
      console.log(`  + ${file}`);
    }
    if (report.newFiles.length > 10) {
      console.log(`  ... and ${report.newFiles.length - 10} more`);
    }
  }

  if (report.modifiedFiles.length > 0) {
    console.log("\nModified Files (first 10):");
    for (const file of report.modifiedFiles.slice(0, 10)) {
      console.log(`  ~ ${file}`);
    }
    if (report.modifiedFiles.length > 10) {
      console.log(`  ... and ${report.modifiedFiles.length - 10} more`);
    }
  }

  if (report.deletedFiles.length > 0) {
    console.log("\nDeleted Files (first 10):");
    for (const file of report.deletedFiles.slice(0, 10)) {
      console.log(`  - ${file}`);
    }
    if (report.deletedFiles.length > 10) {
      console.log(`  ... and ${report.deletedFiles.length - 10} more`);
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
const fullScan = args.includes("--full");
const pathArg = args.find(a => a.startsWith("--path="));
const rootPath = pathArg ? pathArg.split("=")[1] : "H:/PRISM/JM DIE";

// Check if path exists
if (!fs.existsSync(rootPath)) {
  console.log(`Path not found: ${rootPath}`);
  console.log("This script requires access to the H: drive.");
  console.log("Run with --path=<path> to specify an alternative location.");
  process.exit(1);
}

scanDirectory(rootPath, fullScan).then(printReport);
