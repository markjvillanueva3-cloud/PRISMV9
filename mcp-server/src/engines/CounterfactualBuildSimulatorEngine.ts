/**
 * CounterfactualBuildSimulatorEngine — U-FORE-05 (PSAU-FORESIGHT)
 * ================================================================
 *
 * "What if I did this?" simulator for a BuildPlan (U-FORE-02).
 * Applies the plan's planned file writes into an in-memory overlay,
 * then inspects the hypothetical post-apply state WITHOUT touching disk:
 *
 *   - Scans every overlay file with GapPredictorEngine (U-FORE-03)
 *   - Detects likely type errors via lightweight pattern heuristics
 *   - Walks imports for circular-dependency cycles on the overlay
 *   - Lists affected test files so a real test runner can focus
 *   - Estimates the token footprint of the change
 *   - Rolls up a pass/fail verdict with confidence
 *
 * Intentionally NOT spawning a real tsc/vitest worker in this first
 * implementation — those bring non-trivial platform overhead and the
 * heuristics cover the common pre-commit gotchas the user wants caught
 * BEFORE hitting disk. The returned shape matches the spec so a full
 * worker-backed pass can drop in later without API churn.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  InMemoryFileOverlayEngine,
} from "./InMemoryFileOverlayEngine.js";
import { gapPredictorEngine, type GapFinding } from "./GapPredictorEngine.js";
import type { BuildStep } from "./AtomicStepDecomposerEngine.js";

export interface SimulationPlan {
  unitId: string;
  steps: BuildStep[];
  /** Optional map from target path → planned file contents. */
  plannedContent?: Record<string, string>;
}

export interface TypeErrorHint {
  filePath: string;
  message: string;
}

export interface SimulationReport {
  unitId: string;
  wouldPass: boolean;
  failingTests: string[];
  typeErrors: TypeErrorHint[];
  circularImports: string[][];
  gapFindings: GapFinding[];
  tokenDelta: number;
  filesTouched: number;
  confidence: number;
  elapsedMs: number;
  warnings: string[];
}

const TOKEN_CHARS_PER_TOKEN = 4;
const MAX_CYCLE_DEPTH = 200;

export class CounterfactualBuildSimulatorEngine {
  readonly name = "CounterfactualBuildSimulatorEngine";

  constructor(
    private readonly overlayFactory: () => InMemoryFileOverlayEngine = () =>
      new InMemoryFileOverlayEngine()
  ) {}

  /**
   * Simulate a plan against an in-memory overlay.
   *
   * @param plan  Plan with steps + optional plannedContent map.
   * @returns     Report of what would happen; zero disk writes.
   */
  simulate(plan: SimulationPlan): SimulationReport {
    this.assertPlan(plan);
    const started = Date.now();
    const warnings: string[] = [];
    const overlay = this.overlayFactory();
    const planned = plan.plannedContent ?? {};

    // Apply each planned write into the overlay.
    for (const [p, content] of Object.entries(planned)) {
      try {
        overlay.write(p, content);
      } catch (e) {
        warnings.push(
          `Overlay rejected ${p}: ${(e as Error).message ?? String(e)}`
        );
      }
    }

    const entries = overlay.entries();
    const gapFindings: GapFinding[] = [];
    const typeErrors: TypeErrorHint[] = [];
    const siblings = entries.map(([p]) => p);

    for (const [p, entry] of entries) {
      if (entry.op === "delete") continue;
      const content = entry.content ?? "";
      const report = gapPredictorEngine.scan({
        filePath: p,
        content,
        siblings,
      });
      for (const f of report.findings) gapFindings.push(f);
      typeErrors.push(...this.scanTypeErrorHints(p, content));
    }

    const circularImports = this.detectCircularImports(overlay);
    const failingTests = this.identifyLikelyFailingTests(overlay, gapFindings);
    const diff = overlay.diff();
    const tokenDelta = Math.round(
      (diff.totalBytesAdded - diff.totalBytesRemoved) / TOKEN_CHARS_PER_TOKEN
    );

    const confidence = this.computeConfidence({
      typeErrors: typeErrors.length,
      circulars: circularImports.length,
      findings: gapFindings.length,
      files: entries.length,
      warnings: warnings.length,
    });

    const wouldPass =
      typeErrors.length === 0 &&
      circularImports.length === 0 &&
      gapFindings.filter((f) => f.severity >= 4).length === 0;

    return {
      unitId: plan.unitId,
      wouldPass,
      failingTests,
      typeErrors,
      circularImports,
      gapFindings,
      tokenDelta,
      filesTouched: entries.length,
      confidence,
      elapsedMs: Date.now() - started,
      warnings,
    };
  }

  /**
   * Render a short human-readable summary of the simulation report.
   */
  summarize(report: SimulationReport): string {
    const verdict = report.wouldPass ? "WOULD PASS" : "WOULD FAIL";
    const lines = [
      `Simulation ${verdict} — unit ${report.unitId}`,
      `  files touched: ${report.filesTouched} | token Δ: ${report.tokenDelta}`,
      `  confidence: ${(report.confidence * 100).toFixed(0)}% | elapsed: ${report.elapsedMs}ms`,
    ];
    if (report.typeErrors.length > 0) {
      lines.push(`  type-error hints: ${report.typeErrors.length}`);
    }
    if (report.circularImports.length > 0) {
      lines.push(`  circular import cycles: ${report.circularImports.length}`);
    }
    if (report.gapFindings.length > 0) {
      lines.push(`  gap findings: ${report.gapFindings.length}`);
    }
    if (report.warnings.length > 0) {
      lines.push(`  warnings: ${report.warnings.join("; ")}`);
    }
    return lines.join("\n");
  }

  // ─── Heuristic analyzers ──────────────────────────────────────────

  private scanTypeErrorHints(filePath: string, content: string): TypeErrorHint[] {
    const out: TypeErrorHint[] = [];
    if (!/\.tsx?$/.test(filePath)) return out;

    // Very cheap signals that usually produce tsc errors.
    const patterns: Array<{ rx: RegExp; msg: string }> = [
      { rx: /:\s*unknown\s*;[\s\S]{0,60}?\.\w+\s*\(/,
        msg: "method call on 'unknown' (narrow first)" },
      { rx: /as\s+unknown\s+as\s+\w+/, msg: "double assertion 'as unknown as X'" },
      { rx: /export\s+function\s+\w+\([^)]*\):\s*Promise<\s*>/,
        msg: "empty Promise<> generic" },
      { rx: /\bnew\s+Error\s*\(\s*["`']not\s+implemented/i,
        msg: "stub 'not implemented' throw" },
    ];
    for (const { rx, msg } of patterns) {
      if (rx.test(content)) out.push({ filePath, message: msg });
    }

    // Relative imports without an explicit extension (eg "./foo" vs "./foo.js").
    // Do this in code — the regex version mis-handled lazy-match positions.
    const importRx = /\bimport\s+[^;]*?\s+from\s+["'](\.[^"']*)["']/g;
    let m: RegExpExecArray | null;
    while ((m = importRx.exec(content))) {
      const spec = m[1];
      if (!/\.(ts|tsx|js|jsx|mjs|cjs|json)$/.test(spec)) {
        out.push({ filePath, message: `relative import missing extension: ${spec}` });
      }
    }
    return out;
  }

  private detectCircularImports(
    overlay: InMemoryFileOverlayEngine
  ): string[][] {
    const graph = new Map<string, string[]>();
    for (const [p, entry] of overlay.entries()) {
      if (entry.op === "delete" || !/\.tsx?$/.test(p)) continue;
      const content = entry.content ?? "";
      const imports = this.extractRelativeImports(p, content);
      graph.set(p, imports);
    }

    const cycles: string[][] = [];
    const visitState = new Map<string, "visiting" | "done">();

    const dfs = (node: string, trail: string[]) => {
      if (trail.length > MAX_CYCLE_DEPTH) return;
      const state = visitState.get(node);
      if (state === "done") return;
      if (state === "visiting") {
        const idx = trail.indexOf(node);
        if (idx >= 0) cycles.push(trail.slice(idx).concat([node]));
        return;
      }
      visitState.set(node, "visiting");
      trail.push(node);
      for (const next of graph.get(node) ?? []) {
        if (graph.has(next)) dfs(next, trail);
      }
      trail.pop();
      visitState.set(node, "done");
    };

    for (const node of graph.keys()) {
      if (visitState.get(node) !== "done") dfs(node, []);
    }

    // Dedupe cycles by rotation
    const seen = new Set<string>();
    const unique: string[][] = [];
    for (const c of cycles) {
      const key = [...c].sort().join("|");
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(c);
      }
    }
    return unique;
  }

  private extractRelativeImports(filePath: string, content: string): string[] {
    const out: string[] = [];
    const rx = /from\s+["'](\.[^"']+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(content))) {
      const spec = m[1];
      const resolved = this.resolveRelativeImport(filePath, spec);
      if (resolved) out.push(resolved);
    }
    return out;
  }

  private resolveRelativeImport(from: string, spec: string): string | null {
    const base = path.dirname(from);
    const resolved = path.posix.normalize(
      path.posix.join(base.replace(/\\/g, "/"), spec.replace(/\.js$/, ".ts"))
    );
    if (/\.(ts|tsx)$/.test(resolved)) return resolved;
    return resolved + ".ts";
  }

  private identifyLikelyFailingTests(
    overlay: InMemoryFileOverlayEngine,
    gapFindings: GapFinding[]
  ): string[] {
    const failing = new Set<string>();
    // Any test file with a severity-4+ finding is a likely failure
    for (const f of gapFindings) {
      if (f.severity >= 4 && /\.test\.ts$/.test(f.filePath)) {
        failing.add(f.filePath);
      }
    }
    // Any test file that imports from a deleted source file is likely broken
    const deleted = new Set<string>();
    for (const [p, e] of overlay.entries()) {
      if (e.op === "delete") deleted.add(p);
    }
    if (deleted.size > 0) {
      for (const t of overlay.impactedTestFiles()) {
        try {
          const tContent = overlay.read(t);
          if (!tContent) continue;
          if (Array.from(deleted).some((d) => tContent.includes(path.basename(d, ".ts")))) {
            failing.add(t);
          }
        } catch { /* ignore read errors */ }
      }
    }
    return Array.from(failing);
  }

  private computeConfidence(stats: {
    typeErrors: number;
    circulars: number;
    findings: number;
    files: number;
    warnings: number;
  }): number {
    if (stats.files === 0) return 0.5;
    let c = 0.9;
    c -= Math.min(stats.typeErrors * 0.05, 0.3);
    c -= Math.min(stats.circulars * 0.1, 0.3);
    c -= Math.min(stats.findings * 0.02, 0.2);
    c -= Math.min(stats.warnings * 0.05, 0.2);
    return Math.max(0, Math.min(1, c));
  }

  private assertPlan(plan: unknown): asserts plan is SimulationPlan {
    if (!plan || typeof plan !== "object") {
      throw new Error(
        "CounterfactualBuildSimulatorEngine.simulate: plan must be an object"
      );
    }
    const rec = plan as Partial<SimulationPlan>;
    if (typeof rec.unitId !== "string" || rec.unitId.trim() === "") {
      throw new Error(
        "CounterfactualBuildSimulatorEngine.simulate: plan.unitId required"
      );
    }
    if (!Array.isArray(rec.steps)) {
      throw new Error(
        "CounterfactualBuildSimulatorEngine.simulate: plan.steps must be an array"
      );
    }
  }
}

export const counterfactualBuildSimulatorEngine =
  new CounterfactualBuildSimulatorEngine();
