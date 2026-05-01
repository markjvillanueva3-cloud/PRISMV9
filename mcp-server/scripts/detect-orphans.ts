/**
 * detect-orphans.ts — USSH Phase 4
 * ==================================
 *
 * Surfaces orphaned engines with no imports/references.
 * Identifies wiring gaps across the 59 touchpoints.
 *
 * Usage: npx tsx scripts/detect-orphans.ts [--fix] [--verbose]
 *
 * Categories:
 *   - Engine without dispatcher import
 *   - Action without schema
 *   - Schema without action
 *   - Skill without hook anchor
 *   - Hook without registration
 */

import fs from "fs";
import path from "path";
import { glob } from "glob";

const STATE_DIR = path.join(process.cwd(), "data/state");
const REPORT_FILE = path.join(STATE_DIR, "orphan-report.json");
const ENGINES_DIR = path.join(process.cwd(), "src/engines");
const DISPATCHERS_DIR = path.join(process.cwd(), "src/tools/dispatchers");
const HOOKS_DIR = path.join(process.cwd(), "src/hooks");
const SKILLS_DIR = path.join(process.env.USERPROFILE || "", ".claude/commands");

interface OrphanEntry {
  type: "engine" | "action" | "schema" | "skill" | "hook";
  name: string;
  file: string;
  reason: string;
  severity: "high" | "medium" | "low";
  suggestion?: string;
}

interface OrphanReport {
  timestamp: number;
  totalOrphans: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  orphans: OrphanEntry[];
  recommendations: string[];
}

async function findOrphanedEngines(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  // Get all engine files
  const engineFiles = await glob("**/*Engine.ts", { cwd: ENGINES_DIR });
  const engineNames = new Set(engineFiles.map(f => path.basename(f, ".ts")));

  // Get all dispatcher files and extract imports
  const dispatcherFiles = await glob("**/*Dispatcher.ts", { cwd: DISPATCHERS_DIR });
  const importedEngines = new Set<string>();

  for (const file of dispatcherFiles) {
    try {
      const content = fs.readFileSync(path.join(DISPATCHERS_DIR, file), "utf-8");
      const importMatches = content.matchAll(/from\s+["']\.\.\/\.\.\/engines\/(\w+)\.js["']/g);
      for (const match of importMatches) {
        importedEngines.add(match[1]);
      }
    } catch {}
  }

  // Check index.ts exports
  try {
    const indexContent = fs.readFileSync(path.join(ENGINES_DIR, "index.ts"), "utf-8");
    const exportMatches = indexContent.matchAll(/from\s+["']\.\/(\w+)\.js["']/g);
    for (const match of exportMatches) {
      importedEngines.add(match[1]);
    }
  } catch {}

  // Find orphans
  for (const engineName of engineNames) {
    if (!importedEngines.has(engineName) && !engineName.includes("index")) {
      orphans.push({
        type: "engine",
        name: engineName,
        file: `src/engines/${engineName}.ts`,
        reason: "No dispatcher or index.ts imports this engine",
        severity: "medium",
        suggestion: `Add export to engines/index.ts or wire to appropriate dispatcher`
      });
    }
  }

  return orphans;
}

async function findOrphanedActions(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  const dispatcherFiles = await glob("**/*Dispatcher.ts", { cwd: DISPATCHERS_DIR });

  for (const file of dispatcherFiles) {
    try {
      const content = fs.readFileSync(path.join(DISPATCHERS_DIR, file), "utf-8");

      // Extract z.enum actions
      const enumMatch = content.match(/z\.enum\(\[([\s\S]*?)\]\)/);
      if (!enumMatch) continue;

      const actions = enumMatch[1].match(/"([^"]+)"/g)?.map(a => a.replace(/"/g, "")) || [];

      // Extract switch cases
      const switchCases = new Set<string>();
      const caseMatches = content.matchAll(/case\s+"([^"]+)":/g);
      for (const match of caseMatches) {
        switchCases.add(match[1]);
      }

      // Find actions without switch cases
      for (const action of actions) {
        if (!switchCases.has(action)) {
          orphans.push({
            type: "action",
            name: action,
            file: `src/tools/dispatchers/${file}`,
            reason: "Action in z.enum but no switch case handler",
            severity: "high",
            suggestion: `Add case "${action}": handler in routeAction switch`
          });
        }
      }
    } catch {}
  }

  return orphans;
}

async function findOrphanedHooks(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  // Check for hook files not in registry
  const hookFiles = await glob("**/*.ts", { cwd: HOOKS_DIR });

  try {
    const registryPath = path.join(HOOKS_DIR, "hookRegistration.ts");
    if (fs.existsSync(registryPath)) {
      const registryContent = fs.readFileSync(registryPath, "utf-8");

      for (const file of hookFiles) {
        const hookName = path.basename(file, ".ts");
        if (hookName === "index" || hookName === "hookRegistration") continue;

        if (!registryContent.includes(hookName)) {
          orphans.push({
            type: "hook",
            name: hookName,
            file: `src/hooks/${file}`,
            reason: "Hook file not registered in hookRegistration.ts",
            severity: "medium",
            suggestion: `Add ${hookName} to allHooks[] in hookRegistration.ts`
          });
        }
      }
    }
  } catch {}

  return orphans;
}

async function findOrphanedSkills(): Promise<OrphanEntry[]> {
  const orphans: OrphanEntry[] = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    return orphans;
  }

  const skillFiles = await glob("*.md", { cwd: SKILLS_DIR });

  for (const file of skillFiles) {
    try {
      const content = fs.readFileSync(path.join(SKILLS_DIR, file), "utf-8");

      // Check if skill references any engines
      const hasEngineRef = content.includes("Engine") || content.includes("mcp-server");

      if (!hasEngineRef) {
        orphans.push({
          type: "skill",
          name: file.replace(".md", ""),
          file: `~/.claude/commands/${file}`,
          reason: "Skill has no engine or dispatcher references",
          severity: "low",
          suggestion: "Verify skill is properly wired to backend engines"
        });
      }
    } catch {}
  }

  return orphans;
}

async function generateReport(): Promise<OrphanReport> {
  const allOrphans: OrphanEntry[] = [];

  console.log("Scanning for orphaned engines...");
  allOrphans.push(...await findOrphanedEngines());

  console.log("Scanning for orphaned actions...");
  allOrphans.push(...await findOrphanedActions());

  console.log("Scanning for orphaned hooks...");
  allOrphans.push(...await findOrphanedHooks());

  console.log("Scanning for orphaned skills...");
  allOrphans.push(...await findOrphanedSkills());

  // Count by type and severity
  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const orphan of allOrphans) {
    byType[orphan.type] = (byType[orphan.type] || 0) + 1;
    bySeverity[orphan.severity] = (bySeverity[orphan.severity] || 0) + 1;
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if ((byType.engine || 0) > 10) {
    recommendations.push(`${byType.engine} orphan engines — run gen-engine-exports.mjs to auto-wire`);
  }

  if ((byType.action || 0) > 5) {
    recommendations.push(`${byType.action} orphan actions — add missing switch cases`);
  }

  if ((bySeverity.high || 0) > 0) {
    recommendations.push(`${bySeverity.high} HIGH severity orphans require immediate attention`);
  }

  const report: OrphanReport = {
    timestamp: Date.now(),
    totalOrphans: allOrphans.length,
    byType,
    bySeverity,
    orphans: allOrphans,
    recommendations
  };

  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

function printReport(report: OrphanReport): void {
  console.log("\n=== Orphan Detection Report ===");
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Total Orphans: ${report.totalOrphans}`);

  console.log("\nBy Type:");
  for (const [type, count] of Object.entries(report.byType)) {
    console.log(`  ${type}: ${count}`);
  }

  console.log("\nBy Severity:");
  for (const [sev, count] of Object.entries(report.bySeverity)) {
    console.log(`  ${sev}: ${count}`);
  }

  if (report.orphans.length > 0) {
    console.log("\nOrphans (first 20):");
    for (const orphan of report.orphans.slice(0, 20)) {
      const icon = orphan.severity === "high" ? "!" : orphan.severity === "medium" ? "?" : ".";
      console.log(`  [${icon}] ${orphan.type}: ${orphan.name}`);
      console.log(`      ${orphan.reason}`);
      if (orphan.suggestion) {
        console.log(`      → ${orphan.suggestion}`);
      }
    }

    if (report.orphans.length > 20) {
      console.log(`  ... and ${report.orphans.length - 20} more`);
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
generateReport().then(printReport);
