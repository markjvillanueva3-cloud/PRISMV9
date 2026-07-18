#!/usr/bin/env npx ts-node
/**
 * WEDM Retrofit Existing Engines Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Back-fills 119 existing WEDM engines into registries and indexes.
 * Ensures all WEDM assets are discoverable and properly categorized.
 *
 * Usage: npx ts-node scripts/wedm_retrofit_existing.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EngineMetadata {
  name: string;
  path: string;
  category: string;
  description: string;
  loc: number;
  actions: string[];
  dependencies: string[];
  exports: string[];
  indexed: boolean;
}

interface RetrofitReport {
  timestamp: string;
  dryRun: boolean;
  enginesFound: number;
  enginesIndexed: number;
  actionsFound: number;
  categories: Record<string, number>;
  missingDocs: string[];
  orphanedEngines: string[];
  newRegistryEntries: number;
  warnings: string[];
}

const WEDM_PATTERNS = [
  /wedm/i,
  /wire.*edm/i,
  /edm.*wire/i,
  /wire.*cut/i,
  /discharge.*machining/i,
  /spark.*erosion/i,
];

const ENGINE_CATEGORIES: Record<string, string[]> = {
  neural: ["Neural", "AI", "ML", "Learning", "Training", "Prediction"],
  physics: ["Force", "Kunieda", "Klocke", "Thermal", "MRR", "Physics"],
  programming: ["Program", "GCode", "Post", "Toolpath", "NC"],
  optimization: ["Optim", "Calibration", "Tuning", "Parameter"],
  quality: ["Quality", "Surface", "Finish", "Ra", "Inspection"],
  scheduling: ["Schedule", "Batch", "Queue", "Plan"],
  troubleshooting: ["Trouble", "Diagnos", "Debug", "Break", "Problem"],
  documentation: ["Doc", "Report", "Setup", "Sheet"],
  integration: ["Orchestrat", "Pipeline", "Workflow", "Complete"],
};

function categorizeEngine(name: string): string {
  for (const [category, patterns] of Object.entries(ENGINE_CATEGORIES)) {
    if (patterns.some((p) => name.includes(p))) {
      return category;
    }
  }
  return "general";
}

async function findWEDMEngines(enginesDir: string): Promise<EngineMetadata[]> {
  const engines: EngineMetadata[] = [];

  if (!fs.existsSync(enginesDir)) {
    console.log(`Directory not found: ${enginesDir}`);
    return engines;
  }

  const files = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    const filePath = path.join(enginesDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Check if WEDM-related
    const isWEDM = WEDM_PATTERNS.some((p) => p.test(file) || p.test(content));
    if (!isWEDM) continue;

    // Extract metadata
    const lines = content.split("\n");
    const loc = lines.length;

    // Find class name
    const classMatch = content.match(/class\s+(\w+Engine)/);
    const name = classMatch?.[1] ?? file.replace(".ts", "");

    // Find exports
    const exports = (content.match(/export\s+(?:const|class|function)\s+(\w+)/g) ?? [])
      .map((e) => e.split(/\s+/).pop() ?? "");

    // Find dependencies
    const imports = (content.match(/from\s+["']\.\.?\/[^"']+["']/g) ?? [])
      .map((i) => i.match(/\/(\w+)(?:\.js)?["']/)?.[1] ?? "");

    // Find action methods
    const actions = (content.match(/async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise/g) ?? [])
      .map((a) => a.match(/async\s+(\w+)/)?.[1] ?? "");

    // Check for JSDoc
    const hasJSDoc = content.includes("/**");

    engines.push({
      name,
      path: filePath,
      category: categorizeEngine(name),
      description: "", // Would extract from JSDoc
      loc,
      actions,
      dependencies: imports.filter((d) => d),
      exports: exports.filter((e) => e),
      indexed: false,
    });
  }

  return engines;
}

function generateRegistryEntries(engines: EngineMetadata[]): Record<string, any> {
  const registry: Record<string, any> = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    engines: {},
  };

  for (const engine of engines) {
    registry.engines[engine.name] = {
      path: engine.path.replace(/\\/g, "/"),
      category: engine.category,
      loc: engine.loc,
      actions: engine.actions,
      dependencies: engine.dependencies,
      exports: engine.exports,
    };
  }

  return registry;
}

async function runRetrofit(enginesDir: string, dryRun: boolean): Promise<RetrofitReport> {
  console.log(`\nScanning for WEDM engines in: ${enginesDir}`);
  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);

  const engines = await findWEDMEngines(enginesDir);

  // Categorize
  const categories: Record<string, number> = {};
  for (const engine of engines) {
    categories[engine.category] = (categories[engine.category] ?? 0) + 1;
  }

  // Find missing docs
  const missingDocs = engines
    .filter((e) => !fs.readFileSync(e.path, "utf-8").includes("/**"))
    .map((e) => e.name);

  // Find orphaned (no exports used)
  const allDeps = new Set(engines.flatMap((e) => e.dependencies));
  const orphaned = engines
    .filter((e) => !allDeps.has(e.name.replace("Engine", "")))
    .filter((e) => !e.exports.some((ex) => ex.startsWith("wedm") || ex.startsWith("edm")))
    .map((e) => e.name);

  // Total actions
  const totalActions = engines.reduce((sum, e) => sum + e.actions.length, 0);

  // Generate registry
  const registry = generateRegistryEntries(engines);

  if (!dryRun) {
    const registryPath = path.join(enginesDir, "../data/state/WEDM_ENGINE_REGISTRY.json");
    const registryDir = path.dirname(registryPath);
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
    console.log(`Registry written: ${registryPath}`);
  }

  const warnings: string[] = [];
  if (missingDocs.length > 10) {
    warnings.push(`${missingDocs.length} engines missing JSDoc documentation`);
  }
  if (orphaned.length > 5) {
    warnings.push(`${orphaned.length} engines appear orphaned (not imported elsewhere)`);
  }

  return {
    timestamp: new Date().toISOString(),
    dryRun,
    enginesFound: engines.length,
    enginesIndexed: engines.length,
    actionsFound: totalActions,
    categories,
    missingDocs: missingDocs.slice(0, 10),
    orphanedEngines: orphaned.slice(0, 10),
    newRegistryEntries: engines.length,
    warnings,
  };
}

function printReport(report: RetrofitReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM ENGINE RETROFIT REPORT");
  console.log("=".repeat(60));
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Mode: ${report.dryRun ? "DRY RUN (no changes made)" : "LIVE"}`);

  console.log("\n--- Summary ---");
  console.log(`WEDM Engines Found: ${report.enginesFound}`);
  console.log(`Total Actions: ${report.actionsFound}`);
  console.log(`Registry Entries: ${report.newRegistryEntries}`);

  console.log("\n--- By Category ---");
  for (const [cat, count] of Object.entries(report.categories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  if (report.missingDocs.length > 0) {
    console.log("\n--- Missing Documentation ---");
    report.missingDocs.forEach((e) => console.log(`  - ${e}`));
    if (report.missingDocs.length < report.enginesFound - 10) {
      console.log(`  ... and more`);
    }
  }

  if (report.orphanedEngines.length > 0) {
    console.log("\n--- Potentially Orphaned ---");
    report.orphanedEngines.forEach((e) => console.log(`  - ${e}`));
  }

  if (report.warnings.length > 0) {
    console.log("\n--- Warnings ---");
    report.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  console.log("\n" + "=".repeat(60));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("-n");

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx ts-node scripts/wedm_retrofit_existing.ts [options]");
    console.log("\nOptions:");
    console.log("  --dry-run, -n   Preview changes without writing files");
    process.exit(0);
  }

  try {
    const enginesDir = path.resolve(__dirname, "../src/engines");
    const report = await runRetrofit(enginesDir, dryRun);
    printReport(report);

    // Save report
    const reportPath = "wedm_retrofit_report.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${reportPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
