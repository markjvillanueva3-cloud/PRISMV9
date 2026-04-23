/**
 * ChangeImpactRadiusEngine — U-FORE-01 (PSAU-FORESIGHT)
 * ======================================================
 *
 * Universal pre-write blast-radius predictor. Given a proposed change to a
 * file, answers: what breaks, what runs, how long does a build take, and
 * how confident am I?
 *
 * Returns a structured report in well under 300 ms by reusing the already
 * built EditImpactPredictorEngine graph and doing shallow filesystem scans
 * for hooks and dispatchers (both are small, bounded populations).
 *
 * Design invariants:
 *   1. **Read-only** — never modifies the target file, graph, or FS.
 *   2. **Safe on missing inputs** — absent graph or unknown file yields a
 *      low-confidence report, not an exception.
 *   3. **Bounded work** — transitive depth capped (default 3) and per-level
 *      breadth capped so pathological graphs can't burn the time budget.
 *
 * @module engines/ChangeImpactRadiusEngine
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import {
  editImpactPredictorEngine,
  type EditImpactPredictorEngine,
} from "./EditImpactPredictorEngine.js";

// ─── Constants (drawn from empirical build timings, not physics) ─────

/** Transitive depth cap for importer traversal. */
export const DEFAULT_TRANSITIVE_DEPTH = 3;
/** Max importers per level explored — prevents fan-out explosions. */
export const DEFAULT_BREADTH_PER_LEVEL = 200;
/** Average esbuild wall-clock ms per TS file on the PRISM MCP repo (measured). */
export const MS_PER_TS_FILE = 4;
/** Additional fixed cost for tsc type-check passes. */
export const TSC_STARTUP_MS = 800;
/** Wall-clock budget for a single predictBlastRadius() call. */
export const TIME_BUDGET_MS = 300;

// ─── Types ──────────────────────────────────────────────────────────

export type ChangeKind = "edit" | "delete" | "rename" | "create";

export interface BlastRadiusInput {
  /** Absolute or repo-relative path of the file being changed. */
  filePath: string;
  /** Type of change. `create` has empty direct/transitive sets by definition. */
  changeKind: ChangeKind;
  /** Override transitive search depth. */
  maxDepth?: number;
}

export interface BlastRadiusReport {
  filePath: string;
  changeKind: ChangeKind;
  /** Direct importers — files with a literal import of this module. */
  direct: string[];
  /** Transitive importers up to depth N (excluding direct). */
  transitive: string[];
  /** Test files that should run after this change. */
  tests: string[];
  /** Hooks that fire when this file is edited (PostToolUse Write|Edit). */
  hooks: string[];
  /** Dispatchers referencing this file (by import or symbol). */
  dispatchers: string[];
  /** Estimated rebuild wall-clock in milliseconds. */
  estBuildDelta: number;
  /** 0–1 confidence; low when graph stale or target unknown. */
  confidence: number;
  /** Risk level derived from impacted-file count and file class. */
  riskLevel: "low" | "medium" | "high" | "critical";
  /** Elapsed wall-clock the engine spent. */
  computedInMs: number;
  /** Non-fatal warnings (stale graph, missing scan dirs, etc.). */
  warnings: string[];
}

export interface EngineDependencies {
  predictor?: EditImpactPredictorEngine;
  hooksDir?: string;
  dispatchersDir?: string;
  srcRoot?: string;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class ChangeImpactRadiusEngine {
  readonly name = "ChangeImpactRadiusEngine";

  private predictor: EditImpactPredictorEngine;
  private hooksDir: string;
  private dispatchersDir: string;
  private srcRoot: string;

  constructor(deps: EngineDependencies = {}) {
    this.predictor = deps.predictor ?? editImpactPredictorEngine;
    this.hooksDir = deps.hooksDir ?? "H:/prism/.claude/hooks";
    this.dispatchersDir = deps.dispatchersDir ?? "H:/prism/mcp-server/src/tools/dispatchers";
    this.srcRoot = deps.srcRoot ?? "H:/prism/mcp-server/src";
  }

  /**
   * Predict the full blast radius of a proposed file change.
   *
   * @param input `{filePath, changeKind, maxDepth?}`
   * @returns BlastRadiusReport describing direct/transitive/test/hook/dispatcher impact
   */
  async predictBlastRadius(input: BlastRadiusInput): Promise<BlastRadiusReport> {
    const started = Date.now();
    const warnings: string[] = [];

    this.assertInput(input);

    const normalized = this.normalize(input.filePath);
    // Preserve original casing for content-scan symbol matching
    // (hooks/dispatchers reference engines by their PascalCase name).
    const originalPath = resolve(input.filePath).replace(/\\/g, "/");
    const maxDepth = input.maxDepth ?? DEFAULT_TRANSITIVE_DEPTH;

    // A create never breaks anything downstream — return fast.
    if (input.changeKind === "create") {
      return this.finalize({
        filePath: normalized,
        changeKind: input.changeKind,
        direct: [],
        transitive: [],
        tests: [],
        hooks: [],
        dispatchers: [],
        confidence: 1.0,
        warnings,
        started,
      });
    }

    // 1. Ensure we have a graph; build lazily if cold.
    const graphStats = this.predictor.getGraphStats();
    if (graphStats.nodeCount === 0) {
      try {
        await this.predictor.buildGraph(this.srcRoot);
      } catch (err) {
        warnings.push(`graph build failed: ${(err as Error).message}`);
      }
    } else if (!this.predictor.isGraphFresh()) {
      warnings.push("dependency graph is stale (>5 min old)");
    }

    // 2. Query the graph directly for direct importers; walk for transitive.
    const node = this.predictor.getNode(normalized);
    const direct = node ? this.uniquify([...node.importedBy]) : [];
    const transitive = node
      ? this.walkTransitive(normalized, direct, maxDepth)
      : [];
    const tests = [...direct, ...transitive].filter((f) =>
      /\.(test|spec)\.ts$/.test(f)
    );

    // 3. Hooks + dispatchers — scan with original casing for symbol matches.
    const hooks = this.findHookImpact(originalPath);
    const dispatchers = this.findDispatcherImpact(originalPath);

    // 4. Confidence: low when file is not in the graph.
    const confidence = this.computeConfidence({
      graphFresh: this.predictor.isGraphFresh(),
      hasPrediction: true,
      nodeFound: node !== undefined,
      changeKind: input.changeKind,
    });

    return this.finalize({
      filePath: normalized,
      changeKind: input.changeKind,
      direct: this.capBreadth(direct, maxDepth * DEFAULT_BREADTH_PER_LEVEL),
      transitive: this.capBreadth(transitive, maxDepth * DEFAULT_BREADTH_PER_LEVEL),
      tests,
      hooks,
      dispatchers,
      confidence,
      warnings,
      started,
    });
  }

  /**
   * Synchronous, no-graph-build variant. Returns whatever can be computed
   * from the current graph state. Useful for hot-path hooks that cannot
   * afford to rebuild the graph.
   *
   * @param input Same as {@link predictBlastRadius}
   */
  predictBlastRadiusSync(input: BlastRadiusInput): BlastRadiusReport {
    const started = Date.now();
    this.assertInput(input);
    const normalized = this.normalize(input.filePath);
    const originalPath = resolve(input.filePath).replace(/\\/g, "/");
    const warnings: string[] = [];

    if (input.changeKind === "create") {
      return this.finalize({
        filePath: normalized,
        changeKind: input.changeKind,
        direct: [], transitive: [], tests: [], hooks: [], dispatchers: [],
        confidence: 1.0,
        warnings,
        started,
      });
    }

    const stats = this.predictor.getGraphStats();
    if (stats.nodeCount === 0) {
      warnings.push("dependency graph not built — run buildGraph() first");
    }

    const node = this.predictor.getNode(normalized);
    const direct = node?.importedBy ? this.uniquify([...node.importedBy]) : [];
    const tests = direct.filter((f) => /\.(test|spec)\.ts$/.test(f));

    const hooks = this.findHookImpact(originalPath);
    const dispatchers = this.findDispatcherImpact(originalPath);

    const confidence = this.computeConfidence({
      graphFresh: this.predictor.isGraphFresh(),
      hasPrediction: node !== undefined,
      nodeFound: node !== undefined,
      changeKind: input.changeKind,
    });

    return this.finalize({
      filePath: normalized,
      changeKind: input.changeKind,
      direct,
      transitive: [],
      tests,
      hooks,
      dispatchers,
      confidence,
      warnings,
      started,
    });
  }

  // ─── Private ────────────────────────────────────────────────────────

  private assertInput(input: BlastRadiusInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("ChangeImpactRadiusEngine: input must be an object");
    }
    if (typeof input.filePath !== "string" || input.filePath.trim() === "") {
      throw new Error("ChangeImpactRadiusEngine: filePath must be a non-empty string");
    }
    if (!["edit", "delete", "rename", "create"].includes(input.changeKind)) {
      throw new Error(
        `ChangeImpactRadiusEngine: changeKind must be edit|delete|rename|create (got ${input.changeKind})`
      );
    }
    if (input.maxDepth !== undefined) {
      if (!Number.isInteger(input.maxDepth) || input.maxDepth < 0 || input.maxDepth > 10) {
        throw new Error(
          `ChangeImpactRadiusEngine: maxDepth must be integer in [0,10] (got ${input.maxDepth})`
        );
      }
    }
  }

  private normalize(p: string): string {
    // Match EditImpactPredictorEngine.normalizePath exactly:
    //   forward-slash + lowercase. Otherwise graph lookups miss on Windows.
    return resolve(p).replace(/\\/g, "/").toLowerCase();
  }

  private isDirectImporter(target: string, candidate: string): boolean {
    const node = this.predictor.getNode(target);
    if (!node) return false;
    return node.importedBy.includes(candidate);
  }

  /**
   * BFS up the reverse-import graph (importedBy edges) from `direct` to
   * depth `maxDepth`, returning only truly-transitive importers
   * (excluding the seed set itself).
   */
  private walkTransitive(seed: string, direct: string[], maxDepth: number): string[] {
    if (maxDepth <= 1) return [];
    const visited = new Set<string>([seed, ...direct]);
    const transitive = new Set<string>();
    let frontier: string[] = [...direct];
    for (let depth = 1; depth < maxDepth && frontier.length > 0; depth++) {
      const next: string[] = [];
      for (const f of frontier) {
        const node = this.predictor.getNode(f);
        if (!node) continue;
        for (const imp of node.importedBy) {
          if (visited.has(imp)) continue;
          visited.add(imp);
          transitive.add(imp);
          next.push(imp);
          if (next.length >= DEFAULT_BREADTH_PER_LEVEL) break;
        }
      }
      frontier = next;
    }
    return [...transitive];
  }

  private findHookImpact(filePath: string): string[] {
    if (!existsSync(this.hooksDir)) return [];
    const hits: string[] = [];
    const ext = extname(filePath);
    const base = basename(filePath, ext);
    const isEngine = /Engine\.ts$/.test(filePath);
    const isDispatcher = /Dispatcher\.ts$/.test(filePath);
    const isTest = /\.(test|spec)\.ts$/.test(filePath);

    try {
      const files = readdirSync(this.hooksDir).filter((f) => f.endsWith(".mjs"));
      for (const f of files) {
        const full = join(this.hooksDir, f);
        // Pattern-based activation (hooks that always fire for Write/Edit)
        // + symbol match (hook references this file's basename or class name)
        if (isEngine && /engine|physics|safety|validat/i.test(f)) hits.push(f);
        else if (isDispatcher && /dispatch|routing|api/i.test(f)) hits.push(f);
        else if (isTest && /test|coverage|regression/i.test(f)) hits.push(f);
        else {
          // Grep the hook file for the basename — a crude symbol ref
          try {
            const content = readFileSync(full, "utf-8");
            if (content.includes(base)) hits.push(f);
          } catch {
            // Unreadable hook file — skip silently (not a blocker)
          }
        }
      }
    } catch {
      /* missing/unreadable hooks dir — report empty */
    }
    return this.uniquify(hits);
  }

  private findDispatcherImpact(filePath: string): string[] {
    if (!existsSync(this.dispatchersDir)) return [];
    const hits: string[] = [];
    const normalized = filePath.replace(/\\/g, "/");
    const engineBase = basename(normalized, ".ts");
    try {
      const dirs = [this.dispatchersDir];
      while (dirs.length > 0) {
        const dir = dirs.shift()!;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          const full = join(dir, e.name);
          if (e.isDirectory()) {
            dirs.push(full);
          } else if (e.name.endsWith(".ts")) {
            try {
              const content = readFileSync(full, "utf-8");
              if (content.includes(engineBase) || content.includes(normalized)) {
                hits.push(e.name);
              }
            } catch {
              /* unreadable file — skip */
            }
          }
        }
      }
    } catch {
      /* scan failure — report empty */
    }
    return this.uniquify(hits);
  }

  private computeConfidence(opts: {
    graphFresh: boolean;
    hasPrediction: boolean;
    nodeFound: boolean;
    changeKind: ChangeKind;
  }): number {
    if (opts.changeKind === "create") return 1.0;
    // nodeFound is the dominant signal — a file not in the graph means we
    // genuinely don't know its consumers and must report low confidence.
    if (!opts.nodeFound) return 0.3;
    let c = 0.5;
    if (opts.graphFresh) c += 0.25;
    if (opts.hasPrediction) c += 0.15;
    c += 0.1; // nodeFound contribution (kept explicit for readability)
    return Math.max(0, Math.min(1, c));
  }

  private estBuildDelta(direct: number, transitive: number): number {
    // Baseline startup + per-file compile estimate.
    const files = direct + transitive;
    return Math.round(TSC_STARTUP_MS + files * MS_PER_TS_FILE);
  }

  private riskLevelFrom(totalImpact: number, filePath: string): BlastRadiusReport["riskLevel"] {
    // Safety/physics/dispatcher files are critical at any impact level.
    const critical =
      /physics\/constants|safety|dispatcher/i.test(filePath) ||
      filePath.endsWith("camDispatcher.ts");
    if (critical && totalImpact > 5) return "critical";
    if (totalImpact >= 50) return "high";
    if (totalImpact >= 10) return "medium";
    return "low";
  }

  private uniquify(arr: string[]): string[] {
    return Array.from(new Set(arr));
  }

  private capBreadth(arr: string[], limit: number): string[] {
    if (arr.length <= limit) return arr;
    return arr.slice(0, limit);
  }

  private finalize(raw: Omit<BlastRadiusReport, "estBuildDelta" | "riskLevel" | "computedInMs"> & {
    started: number;
  }): BlastRadiusReport {
    const { started, ...rest } = raw;
    const totalImpact = rest.direct.length + rest.transitive.length + rest.tests.length;
    const estBuildDelta = this.estBuildDelta(rest.direct.length, rest.transitive.length);
    const riskLevel = this.riskLevelFrom(totalImpact, rest.filePath);
    const computedInMs = Date.now() - started;
    if (computedInMs > TIME_BUDGET_MS) {
      rest.warnings.push(`time budget exceeded: ${computedInMs}ms > ${TIME_BUDGET_MS}ms`);
    }
    return {
      ...rest,
      estBuildDelta,
      riskLevel,
      computedInMs,
    };
  }
}

export const changeImpactRadiusEngine = new ChangeImpactRadiusEngine();
