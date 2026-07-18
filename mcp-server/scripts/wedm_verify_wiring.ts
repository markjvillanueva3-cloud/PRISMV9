#!/usr/bin/env npx ts-node
/**
 * WEDM Verify Wiring Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Verifies all 256 WEDM actions are properly wired to dispatchers.
 * Identifies orphaned actions, missing handlers, and schema gaps.
 *
 * Usage: npx ts-node scripts/wedm_verify_wiring.ts
 */

import * as fs from "fs";
import * as path from "path";

interface ActionInfo {
  name: string;
  dispatcher: string;
  hasHandler: boolean;
  hasSchema: boolean;
  enginePath?: string;
  lineNumber?: number;
}

interface WiringReport {
  timestamp: string;
  summary: {
    totalActions: number;
    wiredActions: number;
    orphanedActions: number;
    missingSchemas: number;
    missingHandlers: number;
  };
  actions: ActionInfo[];
  dispatchers: Array<{
    name: string;
    path: string;
    actionCount: number;
    coverage: number;
  }>;
  issues: Array<{
    type: "orphan" | "no_schema" | "no_handler" | "duplicate";
    action: string;
    location: string;
    severity: "error" | "warning";
  }>;
  recommendations: string[];
}

async function scanDispatchers(dispatchersDir: string): Promise<Map<string, Set<string>>> {
  const dispatcherActions = new Map<string, Set<string>>();

  if (!fs.existsSync(dispatchersDir)) {
    console.log(`Dispatchers directory not found: ${dispatchersDir}`);
    return dispatcherActions;
  }

  const files = fs.readdirSync(dispatchersDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    const filePath = path.join(dispatchersDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Check if WEDM-related
    if (!content.toLowerCase().includes("wedm") && !content.toLowerCase().includes("edm")) {
      continue;
    }

    // Extract action names from z.enum
    const enumMatch = content.match(/z\.enum\s*\(\s*\[([\s\S]*?)\]\s*\)/);
    if (enumMatch) {
      const actionsStr = enumMatch[1];
      const actions = actionsStr.match(/["']([^"']+)["']/g)?.map((a) => a.replace(/["']/g, "")) ?? [];
      dispatcherActions.set(file, new Set(actions.filter((a) => a.toLowerCase().includes("wedm") || a.toLowerCase().includes("edm"))));
    }
  }

  return dispatcherActions;
}

async function scanEngines(enginesDir: string): Promise<Map<string, { path: string; methods: string[] }>> {
  const engineMethods = new Map<string, { path: string; methods: string[] }>();

  if (!fs.existsSync(enginesDir)) {
    return engineMethods;
  }

  const files = fs.readdirSync(enginesDir).filter((f) =>
    f.endsWith(".ts") && (f.toLowerCase().includes("wedm") || f.toLowerCase().includes("edm"))
  );

  for (const file of files) {
    const filePath = path.join(enginesDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract public methods
    const methods = (content.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*(?:Promise<)?[^{]+)?\s*\{/g) ?? [])
      .map((m) => m.match(/(?:async\s+)?(\w+)/)?.[1] ?? "")
      .filter((m) => m && !["constructor", "private", "get", "set"].includes(m));

    engineMethods.set(file, { path: filePath, methods });
  }

  return engineMethods;
}

async function scanSchemas(schemasDir: string): Promise<Set<string>> {
  const schemas = new Set<string>();

  if (!fs.existsSync(schemasDir)) {
    return schemas;
  }

  const files = fs.readdirSync(schemasDir).filter((f) => f.endsWith(".ts"));

  for (const file of files) {
    const filePath = path.join(schemasDir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract schema names
    const schemaMatches = content.match(/export\s+const\s+(\w+Schema)/g) ?? [];
    schemaMatches.forEach((m) => {
      const name = m.match(/(\w+Schema)/)?.[1];
      if (name) schemas.add(name);
    });
  }

  return schemas;
}

async function verifyWiring(
  dispatchersDir: string,
  enginesDir: string,
  schemasDir: string
): Promise<WiringReport> {
  console.log("\nScanning for WEDM action wiring...");

  const dispatcherActions = await scanDispatchers(dispatchersDir);
  const engineMethods = await scanEngines(enginesDir);
  const schemas = await scanSchemas(schemasDir);

  // Collect all actions
  const allActions: ActionInfo[] = [];
  const seenActions = new Set<string>();
  const issues: WiringReport["issues"] = [];

  for (const [dispatcher, actions] of dispatcherActions) {
    for (const action of actions) {
      if (seenActions.has(action)) {
        issues.push({
          type: "duplicate",
          action,
          location: dispatcher,
          severity: "warning",
        });
        continue;
      }
      seenActions.add(action);

      // Check for schema
      const schemaName = action
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("") + "Schema";
      const hasSchema = schemas.has(schemaName);

      // Check for handler (heuristic)
      let hasHandler = false;
      let enginePath: string | undefined;

      for (const [engineFile, data] of engineMethods) {
        const methodName = action.replace(/^wedm_/, "").replace(/_/g, "");
        if (data.methods.some((m) => m.toLowerCase().includes(methodName.toLowerCase()))) {
          hasHandler = true;
          enginePath = data.path;
          break;
        }
      }

      allActions.push({
        name: action,
        dispatcher,
        hasHandler,
        hasSchema,
        enginePath,
      });

      if (!hasSchema) {
        issues.push({
          type: "no_schema",
          action,
          location: dispatcher,
          severity: "warning",
        });
      }

      if (!hasHandler) {
        issues.push({
          type: "no_handler",
          action,
          location: dispatcher,
          severity: "error",
        });
      }
    }
  }

  // Check for orphaned engine methods
  const dispatchedMethods = new Set(
    allActions.map((a) => a.name.replace(/^wedm_/, "").replace(/_/g, "").toLowerCase())
  );

  for (const [engineFile, data] of engineMethods) {
    for (const method of data.methods) {
      if (!dispatchedMethods.has(method.toLowerCase()) && method.toLowerCase().includes("wedm")) {
        issues.push({
          type: "orphan",
          action: method,
          location: engineFile,
          severity: "warning",
        });
      }
    }
  }

  // Build dispatcher summary
  const dispatchers = Array.from(dispatcherActions.entries()).map(([name, actions]) => ({
    name,
    path: path.join(dispatchersDir, name),
    actionCount: actions.size,
    coverage: allActions.filter((a) => a.dispatcher === name && a.hasHandler).length / actions.size,
  }));

  // Generate recommendations
  const recommendations: string[] = [];

  const missingHandlers = issues.filter((i) => i.type === "no_handler").length;
  if (missingHandlers > 0) {
    recommendations.push(`Implement handlers for ${missingHandlers} actions without handlers`);
  }

  const missingSchemas = issues.filter((i) => i.type === "no_schema").length;
  if (missingSchemas > 0) {
    recommendations.push(`Add Zod schemas for ${missingSchemas} actions`);
  }

  const orphans = issues.filter((i) => i.type === "orphan").length;
  if (orphans > 0) {
    recommendations.push(`Review ${orphans} orphaned engine methods — wire to dispatchers or remove`);
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalActions: allActions.length,
      wiredActions: allActions.filter((a) => a.hasHandler).length,
      orphanedActions: orphans,
      missingSchemas,
      missingHandlers,
    },
    actions: allActions,
    dispatchers,
    issues,
    recommendations,
  };
}

function printReport(report: WiringReport): void {
  console.log("\n" + "=".repeat(70));
  console.log("WEDM ACTION WIRING VERIFICATION REPORT");
  console.log("=".repeat(70));
  console.log(`Generated: ${report.timestamp}`);

  console.log("\n--- Summary ---");
  console.log(`Total WEDM Actions: ${report.summary.totalActions}`);
  console.log(`Wired (with handlers): ${report.summary.wiredActions}`);
  console.log(`Missing Handlers: ${report.summary.missingHandlers}`);
  console.log(`Missing Schemas: ${report.summary.missingSchemas}`);
  console.log(`Orphaned Methods: ${report.summary.orphanedActions}`);

  console.log("\n--- Dispatchers ---");
  console.log("Dispatcher".padEnd(35) + "Actions".padEnd(10) + "Coverage");
  console.log("-".repeat(55));
  report.dispatchers.forEach((d) => {
    console.log(
      d.name.padEnd(35) +
      `${d.actionCount}`.padEnd(10) +
      `${(d.coverage * 100).toFixed(0)}%`
    );
  });

  if (report.issues.length > 0) {
    console.log("\n--- Issues ---");
    const errors = report.issues.filter((i) => i.severity === "error");
    const warnings = report.issues.filter((i) => i.severity === "warning");

    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      errors.slice(0, 10).forEach((e) => {
        console.log(`  [${e.type}] ${e.action} in ${e.location}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    if (warnings.length > 0) {
      console.log(`\nWarnings (${warnings.length}):`);
      warnings.slice(0, 10).forEach((w) => {
        console.log(`  [${w.type}] ${w.action} in ${w.location}`);
      });
      if (warnings.length > 10) {
        console.log(`  ... and ${warnings.length - 10} more`);
      }
    }
  }

  if (report.recommendations.length > 0) {
    console.log("\n--- Recommendations ---");
    report.recommendations.forEach((r) => console.log(`  → ${r}`));
  }

  console.log("\n" + "=".repeat(70));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: npx ts-node scripts/wedm_verify_wiring.ts");
    console.log("\nVerifies all WEDM actions are properly wired to dispatchers.");
    process.exit(0);
  }

  try {
    const baseDir = path.resolve(__dirname, "..");
    const dispatchersDir = path.join(baseDir, "src/tools/dispatchers");
    const enginesDir = path.join(baseDir, "src/engines");
    const schemasDir = path.join(baseDir, "src/schemas");

    const report = await verifyWiring(dispatchersDir, enginesDir, schemasDir);
    printReport(report);

    // Save report
    const reportPath = "wedm_wiring_report.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved: ${reportPath}`);

    const hasErrors = report.issues.some((i) => i.severity === "error");
    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

main();
