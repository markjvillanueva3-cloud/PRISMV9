/**
 * Dispatcher Health Script Template
 *
 * Each dispatcher gets one health script that:
 * 1. Enumerates all actions via ACTIONS array
 * 2. Runs smoke test on each action
 * 3. Reports coverage gaps (actions without tests/docs/skills)
 * 4. Emits JSON report to data/dispatcher-health/<name>-health.json
 *
 * Usage: npx ts-node scripts/dispatcher-<name>-health.ts
 *
 * @module scripts/dispatcher-health-template
 * @tier Tier 4 — Per-Dispatcher Health Scripts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ActionHealth {
  action: string;
  hasCase: boolean;
  hasSchema: boolean;
  hasTest: boolean;
  hasSkill: boolean;
  smokeTestPassed: boolean | null;
  smokeTestError?: string;
}

export interface DispatcherHealthReport {
  dispatcherName: string;
  dispatcherFile: string;
  timestamp: string;
  totalActions: number;
  healthyActions: number;
  coverage: {
    caseCoverage: number;
    schemaCoverage: number;
    testCoverage: number;
    skillCoverage: number;
    smokeTestCoverage: number;
  };
  actions: ActionHealth[];
  gaps: {
    missingCases: string[];
    missingSchemas: string[];
    missingTests: string[];
    missingSkills: string[];
    smokeTestFailures: string[];
  };
  recommendations: string[];
}

export async function generateHealthReport(
  dispatcherName: string,
  dispatcherPath: string,
  actions: readonly string[],
  options: {
    runSmokeTests?: boolean;
    testDispatcher?: (action: string, params: unknown) => Promise<unknown>;
  } = {}
): Promise<DispatcherHealthReport> {
  const report: DispatcherHealthReport = {
    dispatcherName,
    dispatcherFile: dispatcherPath,
    timestamp: new Date().toISOString(),
    totalActions: actions.length,
    healthyActions: 0,
    coverage: {
      caseCoverage: 0,
      schemaCoverage: 0,
      testCoverage: 0,
      skillCoverage: 0,
      smokeTestCoverage: 0,
    },
    actions: [],
    gaps: {
      missingCases: [],
      missingSchemas: [],
      missingTests: [],
      missingSkills: [],
      smokeTestFailures: [],
    },
    recommendations: [],
  };

  const dispatcherContent = fs.readFileSync(dispatcherPath, "utf-8");
  const schemaDir = path.join(path.dirname(dispatcherPath), "../schemas");
  const testDir = path.join(path.dirname(dispatcherPath), "../../__tests__");
  const skillsDir = "C:/Users/wompu/.claude/commands";

  for (const action of actions) {
    const health: ActionHealth = {
      action,
      hasCase: dispatcherContent.includes(`case "${action}"`),
      hasSchema: false,
      hasTest: false,
      hasSkill: false,
      smokeTestPassed: null,
    };

    // Check for schema
    const schemaPattern = new RegExp(`["']${action}["']\\s*:`);
    try {
      const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith(".ts"));
      for (const sf of schemaFiles) {
        const schemaContent = fs.readFileSync(path.join(schemaDir, sf), "utf-8");
        if (schemaPattern.test(schemaContent)) {
          health.hasSchema = true;
          break;
        }
      }
    } catch {}

    // Check for test
    const testPattern = new RegExp(`["']${action}["']|action.*${action}`);
    try {
      const testFiles = fs.readdirSync(testDir).filter(f =>
        f.includes(dispatcherName.replace("Dispatcher", "")) && f.endsWith(".test.ts")
      );
      for (const tf of testFiles) {
        const testContent = fs.readFileSync(path.join(testDir, tf), "utf-8");
        if (testPattern.test(testContent)) {
          health.hasTest = true;
          break;
        }
      }
    } catch {}

    // Check for skill mentioning this action
    try {
      const skillFiles = fs.readdirSync(skillsDir).filter(f => f.endsWith(".md"));
      for (const sf of skillFiles) {
        const skillContent = fs.readFileSync(path.join(skillsDir, sf), "utf-8");
        if (skillContent.includes(action)) {
          health.hasSkill = true;
          break;
        }
      }
    } catch {}

    // Run smoke test if requested
    if (options.runSmokeTests && options.testDispatcher) {
      try {
        await options.testDispatcher(action, {});
        health.smokeTestPassed = true;
      } catch (err: any) {
        health.smokeTestPassed = false;
        health.smokeTestError = err.message?.slice(0, 200);
        report.gaps.smokeTestFailures.push(action);
      }
    }

    // Track gaps
    if (!health.hasCase) report.gaps.missingCases.push(action);
    if (!health.hasSchema) report.gaps.missingSchemas.push(action);
    if (!health.hasTest) report.gaps.missingTests.push(action);
    if (!health.hasSkill) report.gaps.missingSkills.push(action);

    // Count as healthy if has case + schema
    if (health.hasCase && health.hasSchema) {
      report.healthyActions++;
    }

    report.actions.push(health);
  }

  // Calculate coverage
  const withCase = report.actions.filter(a => a.hasCase).length;
  const withSchema = report.actions.filter(a => a.hasSchema).length;
  const withTest = report.actions.filter(a => a.hasTest).length;
  const withSkill = report.actions.filter(a => a.hasSkill).length;
  const passedSmoke = report.actions.filter(a => a.smokeTestPassed === true).length;

  report.coverage = {
    caseCoverage: actions.length > 0 ? withCase / actions.length : 0,
    schemaCoverage: actions.length > 0 ? withSchema / actions.length : 0,
    testCoverage: actions.length > 0 ? withTest / actions.length : 0,
    skillCoverage: actions.length > 0 ? withSkill / actions.length : 0,
    smokeTestCoverage: options.runSmokeTests && actions.length > 0 ? passedSmoke / actions.length : 0,
  };

  // Generate recommendations
  if (report.gaps.missingCases.length > 0) {
    report.recommendations.push(`Add case handlers for: ${report.gaps.missingCases.slice(0, 5).join(", ")}${report.gaps.missingCases.length > 5 ? ` (+${report.gaps.missingCases.length - 5} more)` : ""}`);
  }
  if (report.gaps.missingSchemas.length > 0) {
    report.recommendations.push(`Add schemas for: ${report.gaps.missingSchemas.slice(0, 5).join(", ")}${report.gaps.missingSchemas.length > 5 ? ` (+${report.gaps.missingSchemas.length - 5} more)` : ""}`);
  }
  if (report.coverage.testCoverage < 0.5) {
    report.recommendations.push(`Test coverage ${(report.coverage.testCoverage * 100).toFixed(0)}% is below 50% threshold`);
  }

  return report;
}

export function saveHealthReport(report: DispatcherHealthReport): string {
  const outDir = path.join(__dirname, "../data/dispatcher-health");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, `${report.dispatcherName}-health.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return outPath;
}

export function printHealthSummary(report: DispatcherHealthReport): void {
  console.log(`\n=== ${report.dispatcherName} Health Report ===`);
  console.log(`Actions: ${report.healthyActions}/${report.totalActions} healthy`);
  console.log(`Coverage:`);
  console.log(`  Case handlers: ${(report.coverage.caseCoverage * 100).toFixed(0)}%`);
  console.log(`  Schemas: ${(report.coverage.schemaCoverage * 100).toFixed(0)}%`);
  console.log(`  Tests: ${(report.coverage.testCoverage * 100).toFixed(0)}%`);
  console.log(`  Skills: ${(report.coverage.skillCoverage * 100).toFixed(0)}%`);

  if (report.recommendations.length > 0) {
    console.log(`\nRecommendations:`);
    report.recommendations.forEach(r => console.log(`  - ${r}`));
  }
}
