/**
 * CapabilityCensusEngine — MXU-MS0 U1-U6
 *
 * Live capability census that scans the PRISM file system:
 *   1. Enumerates all engine files
 *   2. Scans dispatchers for action→engine references
 *   3. Scans skills for engine usage
 *   4. Scans test files for coverage
 *   5. Produces the full CapabilityCensus via UtilizationContractEngine
 *
 * This engine does the actual file I/O. UtilizationContractEngine
 * is the pure logic layer that maps and scores capabilities.
 */

import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../constants.js";
import { utilizationContractEngine } from "./UtilizationContractEngine.js";
import type { CapabilityCensus, UtilizationReport } from "./UtilizationContractEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MCP_ROOT = PATHS.MCP_SERVER;
const ENGINES_DIR = path.join(MCP_ROOT, "src", "engines");
const DISPATCHERS_DIR = path.join(MCP_ROOT, "src", "tools", "dispatchers");
const TESTS_DIR = path.join(MCP_ROOT, "src", "__tests__");
const SKILLS_DIR = PATHS.SKILLS_DIR;

// ============================================================================
// ENGINE
// ============================================================================

export class CapabilityCensusEngine {

  /**
   * Scan engine files from disk.
   */
  scanEngines(enginesDir: string = ENGINES_DIR): string[] {
    try {
      const files = fs.readdirSync(enginesDir)
        .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".spec.ts") && f !== "index.ts");

      // Also scan subdirectories (e.g., hypermill/)
      const subdirs = fs.readdirSync(enginesDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const dir of subdirs) {
        const subFiles = fs.readdirSync(path.join(enginesDir, dir.name))
          .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"));
        files.push(...subFiles.map(f => `${dir.name}/${f}`));
      }

      return files.map(f => f.replace(/\.ts$/, ""));
    } catch {
      return [];
    }
  }

  /**
   * Scan dispatchers for action→engine references.
   * Returns a Map of action_name → [engine_names_referenced].
   */
  scanDispatchers(dispatchersDir: string = DISPATCHERS_DIR): {
    actions: Map<string, string[]>;
    dispatcherCount: number;
    totalActions: number;
  } {
    const actions = new Map<string, string[]>();
    let dispatcherCount = 0;
    let totalActions = 0;

    try {
      const files = fs.readdirSync(dispatchersDir)
        .filter(f => f.endsWith(".ts"));

      dispatcherCount = files.length;

      for (const file of files) {
        const content = fs.readFileSync(path.join(dispatchersDir, file), "utf-8");
        const dispName = file.replace(/Dispatcher\.ts$/, "").replace(/\.ts$/, "");

        // Extract action names from ACTIONS array
        const actionsMatch = content.match(/ACTIONS\s*=\s*\[([^\]]+)\]/);
        if (actionsMatch) {
          const actionList = actionsMatch[1]
            .match(/"([^"]+)"/g)
            ?.map(s => s.replace(/"/g, "")) || [];

          totalActions += actionList.length;

          // For each action, find which engines it imports
          for (const action of actionList) {
            const engines: string[] = [];

            // Look for import patterns near the action case
            const importPattern = /import\("\.\.\/\.\.\/engines\/([^"]+?)\.js"\)/g;
            let importMatch;
            while ((importMatch = importPattern.exec(content)) !== null) {
              engines.push(importMatch[1]);
            }

            // Deduplicate
            const unique = [...new Set(engines)];
            if (unique.length > 0) {
              actions.set(`${dispName}.${action}`, unique);
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return { actions, dispatcherCount, totalActions };
  }

  /**
   * Scan skill files for skill names.
   */
  scanSkills(skillsDir: string = SKILLS_DIR): string[] {
    try {
      if (!fs.existsSync(skillsDir)) return [];
      const files = fs.readdirSync(skillsDir, { withFileTypes: true });
      return files
        .filter(f => f.isDirectory())
        .map(f => f.name);
    } catch {
      return [];
    }
  }

  /**
   * Scan test files.
   */
  scanTests(testsDir: string = TESTS_DIR): string[] {
    try {
      return fs.readdirSync(testsDir)
        .filter(f => f.endsWith(".test.ts") || f.endsWith(".spec.ts"));
    } catch {
      return [];
    }
  }

  /**
   * Run the full live census.
   */
  runLiveCensus(): CapabilityCensus {
    const engineNames = this.scanEngines();
    const { actions, dispatcherCount, totalActions } = this.scanDispatchers();
    const skillNames = this.scanSkills();
    const testFiles = this.scanTests();

    return utilizationContractEngine.runCensus(
      engineNames,
      actions,
      skillNames,
      testFiles,
      dispatcherCount,
      totalActions,
    );
  }

  /**
   * Run census and return just the report (lighter output).
   */
  runLiveReport(): UtilizationReport {
    return this.runLiveCensus().report;
  }

  /**
   * Save census to disk as JSON.
   */
  saveCensus(outputPath: string): { ok: boolean; path: string; summary: string } {
    const census = this.runLiveCensus();
    const report = census.report;

    // Slim output — just report + top gaps
    const output = {
      timestamp: report.timestamp,
      total_engines: report.total_engines,
      total_dispatchers: report.total_dispatchers,
      total_actions: report.total_actions,
      total_skills: report.total_skills,
      wiring_summary: report.wiring_summary,
      utilization_pct: report.utilization_pct,
      domain_breakdown: report.domain_breakdown,
      top_gaps: report.gaps.slice(0, 30),
      top_dark_engines: report.top_dark_engines,
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    return {
      ok: true,
      path: outputPath,
      summary: `Census: ${report.total_engines} engines, ${report.utilization_pct}% utilization, ${report.wiring_summary.dark} dark, ${report.gaps.length} gaps`,
    };
  }
}

export const capabilityCensusEngine = new CapabilityCensusEngine();
