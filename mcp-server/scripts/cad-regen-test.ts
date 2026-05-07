#!/usr/bin/env npx ts-node
/**
 * CAD Regeneration Test Harness — U-CADC22
 *
 * Batch testing script for CAD regeneration validation.
 * Runs regeneration tests on N files, collects pass/fail stats, generates report.
 *
 * Usage:
 *   npx ts-node scripts/cad-regen-test.ts [options]
 *
 * Options:
 *   --dir <path>        Directory to scan for CAD files (required)
 *   --max <n>           Maximum files to test (default: 100)
 *   --sample <percent>  Sample percentage of corpus (default: 10)
 *   --output <path>     Output report path (default: ./cad-regen-report.json)
 *   --thresholds <json> Custom thresholds JSON
 *   --stop-on-fail      Stop on first failure
 *   --verbose           Verbose output
 *   --dry-run           Show what would be tested without running
 *
 * Examples:
 *   npx ts-node scripts/cad-regen-test.ts --dir ./cad-files --max 50
 *   npx ts-node scripts/cad-regen-test.ts --dir ./corpus --sample 10 --output report.json
 */
import * as fs from "node:fs";
import * as path from "node:path";
import {
  cadRegenerationTestEngine,
  type BatchTestResult,
  type ComparisonThresholds,
} from "../src/engines/CADRegenerationTestEngine.js";

// ── CLI Argument Parsing ─────────────────────────────────────────────────────

interface CliArgs {
  dir: string;
  max: number;
  sample: number;
  output: string;
  thresholds?: Partial<ComparisonThresholds>;
  stopOnFail: boolean;
  verbose: boolean;
  dryRun: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dir: "",
    max: 100,
    sample: 10,
    output: "./cad-regen-report.json",
    stopOnFail: false,
    verbose: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--dir":
        result.dir = args[++i] || "";
        break;
      case "--max":
        result.max = parseInt(args[++i] || "100", 10);
        break;
      case "--sample":
        result.sample = parseFloat(args[++i] || "10");
        break;
      case "--output":
        result.output = args[++i] || "./cad-regen-report.json";
        break;
      case "--thresholds":
        try {
          result.thresholds = JSON.parse(args[++i] || "{}");
        } catch {
          console.error("Invalid thresholds JSON");
          process.exit(1);
        }
        break;
      case "--stop-on-fail":
        result.stopOnFail = true;
        break;
      case "--verbose":
        result.verbose = true;
        break;
      case "--dry-run":
        result.dryRun = true;
        break;
      case "--help":
      case "-h":
        result.help = true;
        break;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
CAD Regeneration Test Harness — U-CADC22

Usage:
  npx ts-node scripts/cad-regen-test.ts [options]

Options:
  --dir <path>        Directory to scan for CAD files (required)
  --max <n>           Maximum files to test (default: 100)
  --sample <percent>  Sample percentage of corpus (default: 10)
  --output <path>     Output report path (default: ./cad-regen-report.json)
  --thresholds <json> Custom thresholds JSON
  --stop-on-fail      Stop on first failure
  --verbose           Verbose output
  --dry-run           Show what would be tested without running
  --help              Show this help

Thresholds JSON format:
  {
    "volumeDeltaPercent": 5,
    "bboxDeltaPercent": 2,
    "topologySimilarityMin": 0.8,
    "featureCountDeltaPercent": 20
  }

Examples:
  npx ts-node scripts/cad-regen-test.ts --dir ./cad-files --max 50
  npx ts-node scripts/cad-regen-test.ts --dir ./corpus --sample 10 --verbose
`);
}

// ── File Discovery ───────────────────────────────────────────────────────────

const CAD_EXTENSIONS = new Set([
  ".step", ".stp", ".iges", ".igs",
  ".sldprt", ".sldasm",
  ".ipt", ".iam",
  ".prt", ".asm",
  ".catpart", ".catproduct",
  ".x_t", ".x_b",
  ".sat", ".sab",
  ".3dm",
  ".f3d",
]);

function discoverCADFiles(dir: string, maxFiles: number, samplePercent: number): string[] {
  const allFiles: string[] = [];

  function scan(directory: string): void {
    if (allFiles.length >= maxFiles * 10) return; // Early exit if we have enough to sample

    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          // Skip common non-CAD directories
          if (!["node_modules", ".git", "BACKUP", "OLD", "ARCHIVE", "TEMP"].includes(entry.name)) {
            scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (CAD_EXTENSIONS.has(ext)) {
            allFiles.push(fullPath);
          }
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }

  scan(dir);

  // Sample the files
  const sampleSize = Math.min(
    maxFiles,
    Math.ceil(allFiles.length * (samplePercent / 100))
  );

  // Shuffle and take sample
  const shuffled = allFiles.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, sampleSize);
}

// ── Report Generation ────────────────────────────────────────────────────────

interface ReportSummary {
  harness: "cad-regen-test";
  version: "1.0.0";
  runDate: string;
  config: {
    directory: string;
    maxFiles: number;
    samplePercent: number;
    thresholds: ComparisonThresholds;
    stopOnFail: boolean;
  };
  results: BatchTestResult;
  summary: {
    totalFiles: number;
    passed: number;
    failed: number;
    errors: number;
    passRate: number;
    avgDurationMs: number;
    byMetric: {
      volume: { passed: number; failed: number };
      bbox: { passed: number; failed: number };
      topology: { passed: number; failed: number };
      featureCount: { passed: number; failed: number };
    };
  };
}

function generateReport(
  batchResult: BatchTestResult,
  config: CliArgs,
  thresholds: ComparisonThresholds
): ReportSummary {
  const byMetric = {
    volume: { passed: 0, failed: 0 },
    bbox: { passed: 0, failed: 0 },
    topology: { passed: 0, failed: 0 },
    featureCount: { passed: 0, failed: 0 },
  };

  let totalDuration = 0;

  for (const result of batchResult.results) {
    if (result.status === "error") continue;
    totalDuration += result.durationMs;

    // Volume
    if (result.metrics.volume.passed) byMetric.volume.passed++;
    else byMetric.volume.failed++;

    // BBox (any axis failure counts as bbox failure)
    const bboxPassed =
      result.metrics.bboxX.passed &&
      result.metrics.bboxY.passed &&
      result.metrics.bboxZ.passed;
    if (bboxPassed) byMetric.bbox.passed++;
    else byMetric.bbox.failed++;

    // Topology
    if (result.metrics.topology.passed) byMetric.topology.passed++;
    else byMetric.topology.failed++;

    // Feature count
    if (result.metrics.featureCount.passed) byMetric.featureCount.passed++;
    else byMetric.featureCount.failed++;
  }

  const nonErrorCount = batchResult.totalTests - batchResult.errors;

  return {
    harness: "cad-regen-test",
    version: "1.0.0",
    runDate: new Date().toISOString(),
    config: {
      directory: config.dir,
      maxFiles: config.max,
      samplePercent: config.sample,
      thresholds,
      stopOnFail: config.stopOnFail,
    },
    results: batchResult,
    summary: {
      totalFiles: batchResult.totalTests,
      passed: batchResult.passed,
      failed: batchResult.failed,
      errors: batchResult.errors,
      passRate: batchResult.passRate,
      avgDurationMs: nonErrorCount > 0 ? totalDuration / nonErrorCount : 0,
      byMetric,
    },
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args.dir) {
    console.error("Error: --dir is required");
    printHelp();
    process.exit(1);
  }

  if (!fs.existsSync(args.dir)) {
    console.error(`Error: Directory not found: ${args.dir}`);
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║        CAD Regeneration Test Harness — U-CADC22              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // Discover files
  console.log(`Scanning directory: ${args.dir}`);
  const files = discoverCADFiles(args.dir, args.max, args.sample);
  console.log(`Found ${files.length} CAD files to test`);
  console.log();

  if (files.length === 0) {
    console.log("No CAD files found. Exiting.");
    process.exit(0);
  }

  if (args.dryRun) {
    console.log("Dry run — files that would be tested:");
    for (const file of files.slice(0, 20)) {
      console.log(`  ${file}`);
    }
    if (files.length > 20) {
      console.log(`  ... and ${files.length - 20} more`);
    }
    process.exit(0);
  }

  // Set thresholds if provided
  const thresholds = cadRegenerationTestEngine.getThresholds();
  if (args.thresholds) {
    cadRegenerationTestEngine.setThresholds(args.thresholds);
    console.log("Custom thresholds applied");
  }

  console.log("Current thresholds:");
  console.log(`  Volume delta: ${thresholds.volumeDeltaPercent}%`);
  console.log(`  BBox delta: ${thresholds.bboxDeltaPercent}%`);
  console.log(`  Topology similarity: ${thresholds.topologySimilarityMin * 100}%`);
  console.log(`  Feature count delta: ${thresholds.featureCountDeltaPercent}%`);
  console.log();

  // Run batch test
  console.log("Running regeneration tests...");
  const startTime = Date.now();

  const batchResult = await cadRegenerationTestEngine.batch({
    paths: files,
    thresholds: args.thresholds,
    stopOnFirstFail: args.stopOnFail,
  });

  const elapsed = Date.now() - startTime;

  // Print summary
  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                         RESULTS                               ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();
  console.log(`Total tests: ${batchResult.totalTests}`);
  console.log(`  ✓ Passed:  ${batchResult.passed} (${(batchResult.passRate * 100).toFixed(1)}%)`);
  console.log(`  ✗ Failed:  ${batchResult.failed}`);
  console.log(`  ⚠ Errors:  ${batchResult.errors}`);
  console.log(`  Duration:  ${elapsed}ms (${(elapsed / 1000).toFixed(1)}s)`);
  console.log();

  // Verbose output
  if (args.verbose && batchResult.failed > 0) {
    console.log("Failed tests:");
    for (const result of batchResult.results) {
      if (result.status === "fail") {
        console.log(`  ${result.originalPath}`);
        console.log(`    Score: ${(result.overallScore * 100).toFixed(0)}%`);
        if (!result.metrics.volume.passed) {
          console.log(`    Volume: ${result.metrics.volume.deltaPercent.toFixed(1)}% delta (max ${result.metrics.volume.threshold}%)`);
        }
        if (!result.metrics.topology.passed) {
          console.log(`    Topology: ${(result.metrics.topology.jaccardSimilarity * 100).toFixed(0)}% similarity (min ${result.metrics.topology.threshold * 100}%)`);
        }
      }
    }
    console.log();
  }

  // Generate report
  const report = generateReport(batchResult, args, cadRegenerationTestEngine.getThresholds());
  fs.writeFileSync(args.output, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${args.output}`);

  // Exit with appropriate code
  process.exit(batchResult.failed > 0 || batchResult.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
