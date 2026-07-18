/**
 * CohortBridgeShimEngine — Stage 3 of the lego-stacking plan.
 *
 * Reads the Stage 2 COHORT-COMPAT-MATRIX.json artifact and exposes the
 * highest-ROI shim primitives that bridge MEDIUM-cost cohort pairs without
 * full engine rewrites. Two shims ship in this engine:
 *
 *   1. NodeNext path shim — bridges esm-plain (pre-NodeNext `.js` suffix)
 *      ↔ esm-js (NodeNext convention). Rewrites import specifiers so an
 *      esm-js consumer can import an esm-plain engine without code change.
 *      Covers the ~1,872-engine top bridge from the Stage 2 matrix.
 *
 *   2. Shape-coerce shim — adapts a source engine that exports {compute} to
 *      a target shape that expects {calculate} (or vice versa) by routing
 *      method calls through a thin proxy. Covers the mtime-q3 ↔ mtime-q4
 *      kind of bridge where domain + shape are 79% Jaccard but the method
 *      naming convention drifted between cohorts.
 *
 * This engine is the foundation Stage 4 (bridge-auto-wire --shims) reads
 * from when it emits 3-hop graph edges (oldNode → shim → newNode).
 *
 * R12 / fail-loud: every shim returned carries `mustHumanVerify:true` and
 * never executes engine code itself — it only RETURNS the shim spec so
 * the operator (or Stage 4 emitter) can inspect before instantiating.
 */

import * as path from "node:path";
import * as fs from "node:fs";

export interface NodeNextRewriteResult {
  original: string;
  rewritten: string;
  changed: boolean;
  reason: string;
}

export interface ShapeCoerceShimSpec {
  kind: "shape-coerce";
  fromShape: string;
  toShape: string;
  methodMap: Record<string, string>;
  mustHumanVerify: true;
}

export interface NodeNextShimSpec {
  kind: "nodenext-path";
  description: string;
  rewriteHelper: "applyNodeNextSuffix";
  mustHumanVerify: true;
}

export interface CohortBridgeSpec {
  fromCohort: string;
  toCohort: string;
  shims: Array<NodeNextShimSpec | ShapeCoerceShimSpec>;
  estimatedCombinedEngines: number;
  scoreSource: number;
  mustHumanVerify: true;
}

const COHORT_MATRIX_PATH_DEFAULT =
  "H:/prism/state/shared/specs/COHORT-COMPAT-MATRIX.json";

/**
 * Rewrite a single ESM import specifier so it satisfies NodeNext resolution.
 *
 * Rules (per Node.js NodeNext docs, deterministic):
 *   - relative paths (`./x` or `../x`) without an explicit extension get `.js`
 *   - already-suffixed paths are left alone
 *   - bare specifiers (no `./` or `../`) are left alone (package imports)
 *   - directory imports (`./dir`) become `./dir/index.js` only if the caller
 *     opts in via `assumeDirectoryIndex` — we default to false so we never
 *     rewrite ambiguously.
 */
export function applyNodeNextSuffix(
  spec: string,
  opts: { assumeDirectoryIndex?: boolean } = {},
): NodeNextRewriteResult {
  if (!spec || typeof spec !== "string") {
    return { original: String(spec), rewritten: String(spec), changed: false, reason: "empty-or-non-string" };
  }
  const isRelative = spec.startsWith("./") || spec.startsWith("../");
  if (!isRelative) {
    return { original: spec, rewritten: spec, changed: false, reason: "bare-specifier" };
  }
  if (/\.(?:js|mjs|cjs|json|ts|tsx|node)$/.test(spec)) {
    return { original: spec, rewritten: spec, changed: false, reason: "already-suffixed" };
  }
  if (opts.assumeDirectoryIndex && !path.basename(spec).includes(".")) {
    return { original: spec, rewritten: spec + "/index.js", changed: true, reason: "directory-index" };
  }
  return { original: spec, rewritten: spec + ".js", changed: true, reason: "added-js-suffix" };
}

/**
 * Rewrite every import specifier inside a source file's text. Pure function —
 * does NOT touch disk. Returns the rewritten text + per-import diff records.
 */
export function rewriteSourceImports(source: string): {
  rewritten: string;
  rewrites: NodeNextRewriteResult[];
} {
  if (typeof source !== "string") {
    throw new TypeError("rewriteSourceImports: source must be a string");
  }
  // Match `import ... from "X"` and `import("X")` and `export ... from "X"`.
  // Quoted specifier captured in group 1 or 2 (single vs double quoted).
  const re = /(?:import\s[\s\S]*?\bfrom\s+|export\s[\s\S]*?\bfrom\s+|import\(\s*)(["'])((?:\\\1|(?!\1).)*)\1/g;
  const rewrites: NodeNextRewriteResult[] = [];
  const rewritten = source.replace(re, (full, quote, spec) => {
    const r = applyNodeNextSuffix(spec);
    rewrites.push(r);
    if (!r.changed) return full;
    // Replace only the captured specifier inside the original match.
    return full.slice(0, full.length - spec.length - 1) + r.rewritten + quote;
  });
  return { rewritten, rewrites };
}

/**
 * Build a shape-coerce method map from two API shape suffix names. The
 * caller supplies the actual method-name correspondence; we just enforce
 * the structure + the mustHumanVerify flag.
 */
export function buildShapeCoerceShim(
  fromShape: string,
  toShape: string,
  methodMap: Record<string, string>,
): ShapeCoerceShimSpec {
  if (!fromShape || !toShape) throw new Error("buildShapeCoerceShim: fromShape and toShape required");
  if (!methodMap || Object.keys(methodMap).length === 0) {
    throw new Error("buildShapeCoerceShim: methodMap must have at least one entry");
  }
  return {
    kind: "shape-coerce",
    fromShape,
    toShape,
    methodMap: { ...methodMap },
    mustHumanVerify: true,
  };
}

/**
 * Read COHORT-COMPAT-MATRIX.json and return shim specs for the top-K
 * MEDIUM-cost bridges. Stage 4 consumes this output to emit synthetic
 * graph edges; humans consume it to know which shims to implement.
 */
export function recommendShimsForTopBridges(
  topK: number = 10,
  matrixPath: string = COHORT_MATRIX_PATH_DEFAULT,
): CohortBridgeSpec[] {
  if (!Number.isFinite(topK) || topK < 1) topK = 10;
  if (!fs.existsSync(matrixPath)) {
    throw new Error(`COHORT-COMPAT-MATRIX missing at ${matrixPath} — run scripts/batch-compat-scorer.mjs first`);
  }
  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
  const bridges = Array.isArray(matrix.topMediumCostBridges) ? matrix.topMediumCostBridges.slice(0, topK) : [];
  const profiles: Map<string, { topShape: string | null; era: string }> = new Map();
  if (Array.isArray(matrix.cohortProfiles)) {
    for (const p of matrix.cohortProfiles) {
      profiles.set(p.cohort, {
        topShape: p.topShapes?.[0]?.shape ?? null,
        era: p.era ?? "earlyESM",
      });
    }
  }
  return bridges.map((b: { from: string; to: string; total: number; combinedEngineCount: number; domain?: number; shape?: number }) => {
    const fromProf = profiles.get(b.from);
    const toProf = profiles.get(b.to);
    const shims: Array<NodeNextShimSpec | ShapeCoerceShimSpec> = [];

    // If either cohort is preESM, we DON'T propose a shim — those need rewrites,
    // not adapter wrappers. Fail-loud: Stage 4 will skip these.
    if (fromProf?.era === "preESM" || toProf?.era === "preESM") {
      return {
        fromCohort: b.from, toCohort: b.to,
        shims: [], // empty = "no shim viable, full rewrite required"
        estimatedCombinedEngines: b.combinedEngineCount,
        scoreSource: b.total,
        mustHumanVerify: true,
      };
    }

    // Import-style mismatch ⇒ NodeNext path shim
    if (fromProf?.era !== toProf?.era ||
        (fromProf?.era === "earlyESM" && toProf?.era === "earlyESM" && b.from !== b.to)) {
      shims.push({
        kind: "nodenext-path",
        description: "Rewrite import specifiers to add `.js` suffix for NodeNext resolution",
        rewriteHelper: "applyNodeNextSuffix",
        mustHumanVerify: true,
      });
    }

    // Shape mismatch ⇒ shape-coerce shim with empty methodMap (human fills)
    if (fromProf?.topShape && toProf?.topShape && fromProf.topShape !== toProf.topShape) {
      shims.push({
        kind: "shape-coerce",
        fromShape: fromProf.topShape,
        toShape: toProf.topShape,
        methodMap: {},
        mustHumanVerify: true,
      });
    }

    return {
      fromCohort: b.from,
      toCohort: b.to,
      shims,
      estimatedCombinedEngines: b.combinedEngineCount,
      scoreSource: b.total,
      mustHumanVerify: true,
    };
  });
}

export const cohortBridgeShimEngine = {
  applyNodeNextSuffix,
  rewriteSourceImports,
  buildShapeCoerceShim,
  recommendShimsForTopBridges,
};

export default cohortBridgeShimEngine;
