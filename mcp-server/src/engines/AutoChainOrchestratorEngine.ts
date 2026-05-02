/**
 * AutoChainOrchestratorEngine — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U02
 *
 * Wires SelfImprovementPatternEngine (AUTO-6 U-SI1) → AutoFixPipelineEngine
 * (AUTO-6 U-SI2) into a single end-to-end chain. Closes the gap identified
 * by Agent 5: pattern detection ran without ever feeding the fix pipeline,
 * so auto-fix never produced candidates against the live registry.
 *
 * Pipeline:
 *   1. SelfImprovementPatternEngine.compute() detects + ranks patterns,
 *      writing SELF_IMPROVEMENT_PATTERNS.json
 *   2. AutoFixPipelineEngine.compute() reads that file, generates fix
 *      candidates, writes AUTO_FIX_CANDIDATES.json
 *   3. Optionally auto-promotes candidates above a confidence floor
 *      (off by default — the human gate is the safety mechanism)
 *   4. Writes a unified summary to data/state/auto-fix-pipeline.json
 *
 * NOTE: This is a SOFTWARE META-ENGINEERING engine (orchestration). It
 * does not perform physics calculations.
 *
 * @module AutoChainOrchestratorEngine
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import { selfImprovementPatternEngine } from "./SelfImprovementPatternEngine.js";
import type { SelfImprovementReport } from "./SelfImprovementPatternEngine.js";
import { autoFixPipelineEngine } from "./AutoFixPipelineEngine.js";
import type { AutoFixReport, FixCandidate } from "./AutoFixPipelineEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AutoChainOptions {
  /**
   * Auto-promote any candidate whose source pattern has priority ≥ this floor.
   * Defaults to undefined (manual approval required for every candidate).
   */
  autoPromoteMinPriority?: number;
  /** Disable auto-promotion entirely (overrides autoPromoteMinPriority). */
  dryRun?: boolean;
}

export interface AutoChainReport {
  timestamp: string;
  patterns_report: {
    total_patterns: number;
    aggregate_priority: number;
    sources_read: string[];
    warnings: string[];
  };
  candidates_report: {
    candidates_generated: number;
    improvement_rate: number;
    warnings: string[];
  };
  /** Candidates auto-promoted by the orchestrator this run. */
  auto_promoted: Array<{
    fix_id: string;
    pattern_id: string;
    fix_type: string;
    source_priority: number;
  }>;
  persisted_to: string;
  /** Top-line health: 0..1 fraction of detected patterns now actionable. */
  chain_health: number;
}

// ============================================================================
// PATHS
// ============================================================================

const _dir = import.meta.dirname.replace(/\\/g, "/");
const MCP_ROOT = _dir.includes("/src/engines")
  ? path.resolve(import.meta.dirname, "../..")
  : path.resolve(import.meta.dirname, "..");
// Persisted to data/state/auto-fix-pipeline.json per envelope exit condition
const STATE_DIR = path.join(MCP_ROOT, "data", "state");
const PERSIST_PATH = path.join(STATE_DIR, "auto-fix-pipeline.json");

// ============================================================================
// ENGINE
// ============================================================================

export class AutoChainOrchestratorEngine {
  /**
   * Run the full self-improvement → auto-fix chain.
   * @param opts Optional auto-promotion controls
   * @returns AutoChainReport summarizing both stages + persistence path
   */
  run(opts: AutoChainOptions = {}): AutoChainReport {
    const t0 = Date.now();

    // Stage 1: pattern detection
    const patternsReport: SelfImprovementReport = selfImprovementPatternEngine.compute();

    // Stage 2: fix-candidate generation (reads patterns from disk)
    const candidatesReport: AutoFixReport = autoFixPipelineEngine.compute();

    // Stage 3: optional auto-promotion above the priority floor.
    // We only auto-promote when an explicit floor is set AND dryRun is not on.
    const promoted: AutoChainReport["auto_promoted"] = [];
    const floor = opts.autoPromoteMinPriority;
    if (!opts.dryRun && typeof floor === "number" && Number.isFinite(floor)) {
      const patternByID = new Map(patternsReport.patterns.map((p) => [p.id, p]));
      for (const c of candidatesReport.candidates) {
        if (c.status !== "candidate") continue;
        const sourcePattern = patternByID.get(c.pattern_id);
        if (!sourcePattern) continue;
        if (sourcePattern.priority < floor) continue;
        // Only auto-promote candidates that pass dry-run validation — never
        // promote engine/schema fixes (engine flags those dry_run_valid=false)
        if (!c.dry_run_valid) continue;

        const approved = autoFixPipelineEngine.approve(c.id);
        if (!approved) continue;
        const promotedCandidate = autoFixPipelineEngine.promote(c.id);
        if (!promotedCandidate) continue;

        promoted.push({
          fix_id: promotedCandidate.id,
          pattern_id: promotedCandidate.pattern_id,
          fix_type: promotedCandidate.fix_type,
          source_priority: sourcePattern.priority,
        });
      }
    }

    // chain_health: fraction of patterns that produced an actionable candidate.
    // 1.0 = every pattern has a fix; 0 = pattern detection found nothing.
    // Bounded to [0, 1].
    const chainHealth =
      patternsReport.total_patterns > 0
        ? Math.min(1, candidatesReport.candidates_generated / patternsReport.total_patterns)
        : 1;

    const report: AutoChainReport = {
      timestamp: new Date().toISOString(),
      patterns_report: {
        total_patterns: patternsReport.total_patterns,
        aggregate_priority: patternsReport.aggregate_priority,
        sources_read: patternsReport.sources_read,
        warnings: patternsReport.warnings,
      },
      candidates_report: {
        candidates_generated: candidatesReport.candidates_generated,
        improvement_rate: candidatesReport.improvement_rate,
        warnings: candidatesReport.warnings,
      },
      auto_promoted: promoted,
      persisted_to: PERSIST_PATH,
      chain_health: Math.round(chainHealth * 1000) / 1000,
    };

    this.persist(report);

    const elapsedMs = Date.now() - t0;
    log.info(
      `AutoChainOrchestrator: ${patternsReport.total_patterns} patterns → ` +
        `${candidatesReport.candidates_generated} candidates → ${promoted.length} ` +
        `auto-promoted, health=${report.chain_health}, ${elapsedMs}ms`,
    );

    return report;
  }

  /**
   * Read the last persisted chain report from disk.
   */
  read(): AutoChainReport | null {
    try {
      if (!fs.existsSync(PERSIST_PATH)) return null;
      return JSON.parse(fs.readFileSync(PERSIST_PATH, "utf-8")) as AutoChainReport;
    } catch (e) {
      log.warn(`AutoChainOrchestrator.read: ${(e as Error).message}`);
      return null;
    }
  }

  /**
   * Markdown summary suitable for setup-sheet / status overlay.
   */
  summary(): string {
    const r = this.read();
    if (!r) {
      return "AutoChain: no run yet (call prism_dev:auto_chain_run).";
    }
    const lines = [
      `# AutoChain Orchestrator`,
      ``,
      `**Updated**: ${r.timestamp}`,
      `**Chain health**: ${(r.chain_health * 100).toFixed(1)}%`,
      ``,
      `## Stage 1 — Pattern Detection`,
      `- Total patterns: ${r.patterns_report.total_patterns}`,
      `- Aggregate priority: ${r.patterns_report.aggregate_priority.toFixed(2)}`,
      `- Sources read: ${r.patterns_report.sources_read.join(", ") || "(none)"}`,
      ``,
      `## Stage 2 — Fix Pipeline`,
      `- Candidates generated: ${r.candidates_report.candidates_generated}`,
      `- Improvement rate: ${(r.candidates_report.improvement_rate * 100).toFixed(1)}%`,
      ``,
      `## Auto-promoted (this run)`,
      r.auto_promoted.length === 0
        ? `_(none — manual approval required)_`
        : r.auto_promoted
            .map((p) => `- ${p.fix_id} ← ${p.pattern_id} (${p.fix_type}, priority=${p.source_priority.toFixed(2)})`)
            .join("\n"),
      ``,
      `Persisted: \`${path.relative(MCP_ROOT, r.persisted_to)}\``,
    ];
    if (r.patterns_report.warnings.length || r.candidates_report.warnings.length) {
      lines.push(``, `## Warnings`);
      for (const w of r.patterns_report.warnings) lines.push(`- (patterns) ${w}`);
      for (const w of r.candidates_report.warnings) lines.push(`- (candidates) ${w}`);
    }
    return lines.join("\n");
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private persist(report: AutoChainReport): void {
    try {
      if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.writeFileSync(PERSIST_PATH, JSON.stringify(report, null, 2));
    } catch (e) {
      log.warn(`AutoChainOrchestrator.persist: ${(e as Error).message}`);
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const autoChainOrchestratorEngine = new AutoChainOrchestratorEngine();
