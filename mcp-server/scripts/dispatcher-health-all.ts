#!/usr/bin/env npx ts-node
/**
 * Dispatcher Health — All Dispatchers
 *
 * Runs health checks on all 90 dispatchers in parallel.
 * Generates aggregate report at data/dispatcher-health/AGGREGATE.json
 *
 * Usage:
 *   npx ts-node scripts/dispatcher-health-all.ts
 *   npx ts-node scripts/dispatcher-health-all.ts --quick   # Skip smoke tests
 *   npx ts-node scripts/dispatcher-health-all.ts --json    # JSON output only
 *
 * @module scripts/dispatcher-health-all
 * @tier Tier 4 — Per-Dispatcher Health Scripts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  generateHealthReport,
  saveHealthReport,
  DispatcherHealthReport,
} from "./dispatcher-health-template";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DISPATCHERS_DIR = path.join(__dirname, "../src/tools/dispatchers");

interface AggregateReport {
  timestamp: string;
  totalDispatchers: number;
  totalActions: number;
  healthyActions: number;
  overallCoverage: {
    caseCoverage: number;
    schemaCoverage: number;
    testCoverage: number;
    skillCoverage: number;
  };
  dispatcherReports: {
    name: string;
    actions: number;
    healthy: number;
    coverage: number;
  }[];
  worstDispatchers: string[];
  recommendations: string[];
}

async function extractActionsFromDispatcher(filePath: string): Promise<readonly string[]> {
  const content = fs.readFileSync(filePath, "utf-8");

  // Look for ACTIONS array
  const actionsMatch = content.match(/const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  if (actionsMatch) {
    const actionStrings = actionsMatch[1].match(/"([^"]+)"/g);
    if (actionStrings) {
      return actionStrings.map(s => s.replace(/"/g, ""));
    }
  }

  // Fallback: look for case statements
  const caseMatches = content.matchAll(/case\s+"([^"]+)":/g);
  const actions = new Set<string>();
  for (const match of caseMatches) {
    actions.add(match[1]);
  }

  return Array.from(actions);
}

async function runAllHealthChecks(options: { quick?: boolean; json?: boolean }): Promise<AggregateReport> {
  const dispatcherFiles = fs.readdirSync(DISPATCHERS_DIR)
    .filter(f => f.endsWith("Dispatcher.ts") && !f.startsWith("_"))
    .map(f => ({
      name: f.replace(".ts", ""),
      path: path.join(DISPATCHERS_DIR, f),
    }));

  const reports: DispatcherHealthReport[] = [];

  if (!options.json) {
    console.log(`Checking ${dispatcherFiles.length} dispatchers...`);
  }

  for (const { name, path: dispPath } of dispatcherFiles) {
    try {
      const actions = await extractActionsFromDispatcher(dispPath);
      const report = await generateHealthReport(name, dispPath, actions, {
        runSmokeTests: !options.quick,
      });
      saveHealthReport(report);
      reports.push(report);

      if (!options.json) {
        const pct = (report.healthyActions / Math.max(report.totalActions, 1) * 100).toFixed(0);
        console.log(`  ${name}: ${report.healthyActions}/${report.totalActions} (${pct}%)`);
      }
    } catch (err: any) {
      if (!options.json) {
        console.log(`  ${name}: ERROR - ${err.message}`);
      }
    }
  }

  // Build aggregate
  const totalActions = reports.reduce((sum, r) => sum + r.totalActions, 0);
  const healthyActions = reports.reduce((sum, r) => sum + r.healthyActions, 0);
  const avgCase = reports.reduce((sum, r) => sum + r.coverage.caseCoverage, 0) / reports.length;
  const avgSchema = reports.reduce((sum, r) => sum + r.coverage.schemaCoverage, 0) / reports.length;
  const avgTest = reports.reduce((sum, r) => sum + r.coverage.testCoverage, 0) / reports.length;
  const avgSkill = reports.reduce((sum, r) => sum + r.coverage.skillCoverage, 0) / reports.length;

  const aggregate: AggregateReport = {
    timestamp: new Date().toISOString(),
    totalDispatchers: reports.length,
    totalActions,
    healthyActions,
    overallCoverage: {
      caseCoverage: avgCase,
      schemaCoverage: avgSchema,
      testCoverage: avgTest,
      skillCoverage: avgSkill,
    },
    dispatcherReports: reports.map(r => ({
      name: r.dispatcherName,
      actions: r.totalActions,
      healthy: r.healthyActions,
      coverage: r.healthyActions / Math.max(r.totalActions, 1),
    })),
    worstDispatchers: reports
      .filter(r => r.totalActions > 0)
      .sort((a, b) => (a.healthyActions / a.totalActions) - (b.healthyActions / b.totalActions))
      .slice(0, 10)
      .map(r => `${r.dispatcherName} (${(r.healthyActions / r.totalActions * 100).toFixed(0)}%)`),
    recommendations: [],
  };

  // Generate recommendations
  if (avgCase < 0.95) {
    aggregate.recommendations.push(`Case coverage ${(avgCase * 100).toFixed(0)}% — target 95%`);
  }
  if (avgSchema < 0.80) {
    aggregate.recommendations.push(`Schema coverage ${(avgSchema * 100).toFixed(0)}% — target 80%`);
  }
  if (avgTest < 0.50) {
    aggregate.recommendations.push(`Test coverage ${(avgTest * 100).toFixed(0)}% — target 50%`);
  }

  // Save aggregate
  const outPath = path.join(__dirname, "../data/dispatcher-health/AGGREGATE.json");
  fs.writeFileSync(outPath, JSON.stringify(aggregate, null, 2));

  return aggregate;
}

async function main() {
  const args = process.argv.slice(2);
  const quick = args.includes("--quick");
  const json = args.includes("--json");

  const aggregate = await runAllHealthChecks({ quick, json });

  if (json) {
    console.log(JSON.stringify(aggregate, null, 2));
  } else {
    console.log(`\n=== AGGREGATE HEALTH REPORT ===`);
    console.log(`Dispatchers: ${aggregate.totalDispatchers}`);
    console.log(`Actions: ${aggregate.healthyActions}/${aggregate.totalActions} healthy`);
    console.log(`\nOverall Coverage:`);
    console.log(`  Case handlers: ${(aggregate.overallCoverage.caseCoverage * 100).toFixed(0)}%`);
    console.log(`  Schemas: ${(aggregate.overallCoverage.schemaCoverage * 100).toFixed(0)}%`);
    console.log(`  Tests: ${(aggregate.overallCoverage.testCoverage * 100).toFixed(0)}%`);
    console.log(`  Skills: ${(aggregate.overallCoverage.skillCoverage * 100).toFixed(0)}%`);

    if (aggregate.worstDispatchers.length > 0) {
      console.log(`\nLowest Coverage Dispatchers:`);
      aggregate.worstDispatchers.forEach(d => console.log(`  - ${d}`));
    }

    if (aggregate.recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      aggregate.recommendations.forEach(r => console.log(`  - ${r}`));
    }

    console.log(`\nReports saved to: data/dispatcher-health/`);
  }
}

main().catch(console.error);
