/**
 * WiringPotentialEngine — Orphan-to-Dispatcher Recommendation
 * ===========================================================
 *
 * Analyzes an orphan engine (built but unwired) and ranks candidate
 * dispatchers it should be wired into. Combines three signals:
 *
 *   1. **Semantic relevance** — regex heuristic over the engine name
 *      (mirrors orphan-inventory.mjs DISPATCHER_HEURISTICS so operator
 *      and engine agree on hints).
 *   2. **Capacity headroom** — reads `state/shared/DISPATCHER_CAPACITY.json`
 *      (CLEANUP-MS0/U-CLEANUP-F7 output). Dispatchers at ≥100% capacity
 *      are EXCLUDED outright; 80-99% are flagged `warn` and penalized;
 *      <80% are `ok` and full credit.
 *   3. **Documentation depth** — pre-joined wikiEntries[] + memoryEntries[]
 *      from the system-graph (already attached by MasterIndexEngine);
 *      engines with prior docs score higher because the wiring rationale
 *      is already partially written.
 *
 * Routes search through `masterIndexEngine.query()` — does NOT reimplement
 * graph traversal or BM25 (CLAUDE.md anti-duplication rule). Reads
 * pre-joined `node.knowledge.wikiEntries[]` + `node.knowledge.memoryEntries[]`
 * from `MasterIndexHit.wikiEntries` / `.memoryEntries`.
 *
 * Output is a ranked list of `WiringCandidate`s with per-candidate
 * `rationale[]` (1-2 line natural language reasons). The top candidate
 * is the recommended wiring target; subsequent candidates are fallbacks.
 *
 * Reserved for the **rationale-synthesis layer** (per U-CLEANUP-C1 spec) —
 * downstream consumers (C4 `/wiring-potential` skill, C5 watchdog→wiring
 * trigger) compose this engine's output into operator-facing messages.
 * This engine itself stays pure-functional + read-only.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-C1.
 *
 * @milestone CLEANUP-MS0 / U-CLEANUP-C1
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";
import {
  masterIndexEngine,
  type MasterIndexHit,
  type MasterIndexResult,
} from "./MasterIndexEngine.js";

// ─── semantic constants (NOT magic numbers) ────────────────────────────────

/** Capacity ratio classes — must match F7 build-dispatcher-capacity thresholds. */
export const CAPACITY_OK_MAX = 0.80;     // <80%   → ok (full credit)
export const CAPACITY_WARN_MAX = 1.00;   // 80-99% → warn (half credit)
                                          // ≥100%   → critical (excluded)

/** Score weights — sum to 1.0. */
export const W_SEMANTIC = 0.45;
export const W_CAPACITY = 0.40;
export const W_DOCS_DEPTH = 0.15;

/** Default top-K candidates returned. */
export const DEFAULT_TOP_K = 3;
/** Hard ceiling on top-K (large N is wasteful — operator only acts on 1-3). */
export const MAX_TOP_K = 10;
/** Minimum semantic confidence to include a heuristic candidate. */
export const MIN_HEURISTIC_CONFIDENCE = 0.30;
/** docsDepth saturates here — more wiki entries don't help past this. */
export const DOCS_DEPTH_SATURATION = 10;
/** Default F7 capacity report path (read-only). */
export const DEFAULT_CAPACITY_PATH = "state/shared/DISPATCHER_CAPACITY.json";

// ─── dispatcher heuristics (mirrors orphan-inventory.mjs) ──────────────────
// Source-of-truth divergence is intentional — both consumers can be edited
// independently; the regex set is small enough to keep in sync by hand.
// Confidence is a weak prior used when no MasterIndex hit dominates.

interface Heuristic {
  re: RegExp;
  dispatcher: string;
  reason: string;
  /** Base confidence for this rule before MasterIndex re-weighting. */
  baseConfidence: number;
}

const DISPATCHER_HEURISTICS: Heuristic[] = [
  { re: /\b(kienzle|cutting.?force|specific.?energy|chip.?load|mrr|tool.?force)\b/i, dispatcher: "prism_calc", reason: "force/physics", baseConfidence: 0.85 },
  { re: /\b(speed.?feed|sfm|rpm|chip.?thinning)\b/i, dispatcher: "prism_calc", reason: "speed/feed", baseConfidence: 0.85 },
  { re: /\b(taylor|tool.?life|wear|weibull)\b/i, dispatcher: "prism_calc", reason: "tool-life", baseConfidence: 0.85 },
  { re: /\b(thermal|heat|temperature|cryogenic)\b/i, dispatcher: "prism_calc", reason: "thermal", baseConfidence: 0.75 },
  { re: /\b(deflection|stiffness|cantilever|natural.?frequency)\b/i, dispatcher: "prism_calc", reason: "mechanics", baseConfidence: 0.80 },
  { re: /\b(chatter|stability.?lobe|regen|damping)\b/i, dispatcher: "prism_calc", reason: "stability", baseConfidence: 0.80 },
  { re: /\b(surface.?finish|ra\b|roughness|integrity)\b/i, dispatcher: "prism_calc", reason: "surface", baseConfidence: 0.75 },
  { re: /\b(safety|collision|envelope|s\(x\))\b/i, dispatcher: "prism_safety", reason: "safety gate", baseConfidence: 0.90 },
  { re: /\b(lathe|turning|okuma|mazak|grooving|threading.?cycle)\b/i, dispatcher: "prism_turning", reason: "turning domain", baseConfidence: 0.85 },
  { re: /\b(5.?axis|multi.?axis|tilt|swivel)\b/i, dispatcher: "prism_5axis", reason: "5-axis", baseConfidence: 0.90 },
  // NOTE: "5axis" rule MUST precede "mill" rule — a "Mill5AxisFoo" engine
  // belongs in prism_5axis, not prism_cam. Order is load-bearing.
  { re: /\b(mill|milling|3.?axis|2\.5d)\b/i, dispatcher: "prism_cam", reason: "milling domain", baseConfidence: 0.75 },
  { re: /\b(wedm|wire.?edm|sodick)\b/i, dispatcher: "prism_cam", reason: "wire-EDM (cam tree)", baseConfidence: 0.80 },
  { re: /\b(grind|sinker.?edm|laser|waterjet)\b/i, dispatcher: "prism_cam", reason: "specialty machining", baseConfidence: 0.75 },
  { re: /\b(cad|geometry|feature.?recogn|step|iges|dxf|stl|nurbs)\b/i, dispatcher: "prism_cad", reason: "CAD/geometry", baseConfidence: 0.80 },
  { re: /\b(post|gcode|fanuc|haas|siemens|controller)\b/i, dispatcher: "prism_cam", reason: "post-processor", baseConfidence: 0.70 },
  { re: /\b(quote|cost|estimat|business|invoice|erp)\b/i, dispatcher: "prism_intelligence", reason: "business/ERP", baseConfidence: 0.70 },
  { re: /\b(material|registry|tribal|catalog|database)\b/i, dispatcher: "prism_data", reason: "data/registry", baseConfidence: 0.75 },
  { re: /\b(memory|recall|qdrant|embed|semantic)\b/i, dispatcher: "prism_memory", reason: "memory layer", baseConfidence: 0.80 },
  { re: /\b(hook|coordination|chat.?bus|claim)\b/i, dispatcher: "prism_session", reason: "session/coordination", baseConfidence: 0.75 },
  { re: /\b(reason|deep.?learn|ml|neural|trans?former|llm)\b/i, dispatcher: "prism_ai", reason: "reasoning/ML", baseConfidence: 0.80 },
  { re: /\b(test|vitest|fixture|mock)\b/i, dispatcher: "prism_dev", reason: "dev/test", baseConfidence: 0.70 },
  { re: /\b(monitor|metric|telemetry|dashboard)\b/i, dispatcher: "prism_telemetry", reason: "telemetry", baseConfidence: 0.75 },
];

// ─── types ─────────────────────────────────────────────────────────────────

const InputSchema = z
  .string()
  .min(1, "engineName must be non-empty")
  .max(200, "engineName must be ≤200 chars");

export type CapacityClass = "ok" | "warn" | "critical";

export interface WiringCandidate {
  dispatcher: string;
  score: number;              // [0,1] — composite ranking score
  headroomRatio: number;      // 0..N from F7 (1.0 = at capacity)
  capacityClass: CapacityClass;
  semanticConfidence: number; // [0,1]
  docsDepth: number;          // raw count of wiki + memory entries
  rationale: string[];        // 1-3 short lines explaining the rank
}

export interface WiringPotentialReport {
  engineName: string;
  topCandidate: WiringCandidate | null;
  candidates: WiringCandidate[];
  warnings: string[];
  generatedAt: string;
}

export interface WiringPotentialOpts {
  /** Override path to F7 DISPATCHER_CAPACITY.json. */
  capacityFile?: string;
  /** Inject pre-parsed capacity report (DI for tests). */
  capacityReport?: CapacityReport | null;
  /** Inject master index (DI for tests). */
  masterIndex?: { query: typeof masterIndexEngine.query };
  /** Cap candidates returned (default DEFAULT_TOP_K, max MAX_TOP_K). */
  topK?: number;
  /** Drop candidates below this semantic confidence (default 0). */
  minConfidence?: number;
}

/**
 * Shape of F7's `state/shared/DISPATCHER_CAPACITY.json` — schema v1.
 *
 * F7 emits rows keyed by `name`, with values in `<x>Dispatcher` form
 * (e.g. "calcDispatcher", "camDispatcher"). This engine's heuristic
 * emits dispatcher names in `prism_<x>` form (e.g. "prism_calc",
 * "prism_cam"). The lookup must NORMALIZE F7's row names into the
 * `prism_<x>` form so the heuristic ↔ capacity join works. See
 * `normalizeF7DispatcherName` below — silent join failure here is
 * the class-A bug reviewer C caught in U-CLEANUP-C1 scrutiny gate.
 */
export interface CapacityRow {
  /** F7's row name, e.g. "calcDispatcher". MUST match F7's actual output. */
  name: string;
  actions: number;
  ratio: number;
  status: CapacityClass;
}

export interface CapacityReport {
  schemaVersion: number;
  generatedAt: string;
  ceiling: number;
  rows: CapacityRow[];
}

/**
 * Convert F7's row-name form (`calcDispatcher`) to the `prism_<x>`
 * dispatcher-id form the heuristic emits. F7 row names are camelCase
 * `<short>Dispatcher`; we strip the suffix and prepend `prism_`.
 *
 *   "calcDispatcher"     → "prism_calc"
 *   "camDispatcher"      → "prism_cam"
 *   "aiReasoningDispatcher" → "prism_ai_reasoning"
 *   "prism_calc"         → "prism_calc" (idempotent — already normalized)
 *   "calc"               → "prism_calc" (bare short name)
 *
 * Returns the lowercase normalized form. Exported so tests + downstream
 * consumers can verify the join key without re-deriving it.
 */
export function normalizeF7DispatcherName(rowName: string): string {
  if (!rowName || typeof rowName !== "string") return "";
  const trimmed = rowName.trim();
  if (trimmed.length === 0) return "";
  // Already in prism_<x> form? Pass through unchanged.
  if (trimmed.startsWith("prism_")) return trimmed.toLowerCase();
  // Strip "Dispatcher" suffix if present.
  const suffixRe = /Dispatcher$/;
  const stripped = suffixRe.test(trimmed) ? trimmed.replace(suffixRe, "") : trimmed;
  // Convert camelCase → snake_case (aB → a_B), lowercase.
  const snake = stripped
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
  return `prism_${snake}`;
}

// ─── implementation ────────────────────────────────────────────────────────

/**
 * Read the F7 capacity report from disk. Returns null if missing or
 * malformed; the engine treats either as "no capacity signal" (all
 * candidates get neutral capacity scores). Never throws.
 */
function readCapacityReport(filePath: string): CapacityReport | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.schemaVersion !== 1 ||
      !Array.isArray(parsed.rows)
    ) {
      return null;
    }
    return parsed as CapacityReport;
  } catch {
    return null;
  }
}

/**
 * Tokenize an engine name into a space-separated lowercase string so
 * the heuristic regexes (which rely on `\b` word boundaries) fire on
 * camelCase + snake_case + kebab-case all alike.
 *
 *   "KienzleCuttingForceEngine"   → "kienzle cutting force engine"
 *   "okuma_turning_post_engine"   → "okuma turning post engine"
 *   "5-axis-tilt-Engine"          → "5 axis tilt engine"
 *   "BVHRayCastEngine"            → "bvh ray cast engine" (ACR boundary handled)
 *
 * Without this, `\b(kienzle)\b` against "KienzleCuttingForceEngine" fails
 * because the char after 'e' is 'C' (both \w → no `\b`).
 */
export function tokenizeEngineName(name: string): string {
  return name
    // Insert space at camelCase boundaries: aB → a B
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    // Insert space at ACR-then-Word boundary: ABCDef → ABC Def
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    // Insert space at letter→digit boundary: Mill5 → Mill 5
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    // Insert space at digit→letter boundary: 5Axis → 5 Axis (low-case form)
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    // Normalize separators
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Apply DISPATCHER_HEURISTICS to engineName. Returns ALL matching rules
 * (not just first) — a name like "DeepLearnNeuralCAMEngine" can match
 * both `prism_ai` (reasoning/ML) and `prism_cam` (cam). Caller decides
 * how to combine when multiple dispatchers fire.
 *
 * Matches against the tokenized form (camelCase → space-separated) so
 * the `\b` word boundaries in the regex patterns fire correctly.
 */
function heuristicCandidates(engineName: string): Array<{
  dispatcher: string;
  reason: string;
  confidence: number;
}> {
  const tokenized = tokenizeEngineName(engineName);
  const out: Array<{ dispatcher: string; reason: string; confidence: number }> = [];
  const seen = new Set<string>();
  for (const h of DISPATCHER_HEURISTICS) {
    if (h.re.test(tokenized) && !seen.has(h.dispatcher)) {
      out.push({
        dispatcher: h.dispatcher,
        reason: h.reason,
        confidence: h.baseConfidence,
      });
      seen.add(h.dispatcher);
    }
  }
  return out;
}

/**
 * Classify a capacity ratio. Mirrors F7's bucketing so the engine and
 * the F7 report agree on labels.
 */
function classifyCapacity(ratio: number): CapacityClass {
  if (!Number.isFinite(ratio) || ratio < 0) return "ok"; // missing → neutral
  if (ratio >= CAPACITY_WARN_MAX) return "critical";
  if (ratio >= CAPACITY_OK_MAX) return "warn";
  return "ok";
}

/**
 * Capacity component of the composite score. Higher headroom → higher
 * score. Critical = 0 (excluded upstream, but this is the floor).
 */
function capacityScore(ratio: number, klass: CapacityClass): number {
  if (klass === "critical") return 0;
  if (!Number.isFinite(ratio) || ratio < 0) return 0.5; // neutral when unknown
  // Headroom: 0 actions → 1.0; at-capacity (1.0 ratio) → 0.0 (but excluded
  // first); use a linear scale so warn-band (0.8-1.0) still produces small
  // positive scores rather than a discontinuous step.
  return Math.max(0, 1 - ratio);
}

/**
 * Docs-depth component. Saturates at DOCS_DEPTH_SATURATION so a
 * 20-wiki-entry engine doesn't dominate a 5-wiki-entry one when both
 * have plenty of docs.
 */
function docsScore(docCount: number): number {
  if (!Number.isFinite(docCount) || docCount <= 0) return 0;
  return Math.min(1, docCount / DOCS_DEPTH_SATURATION);
}

/**
 * Extract MasterIndex-derived signal for a single engine query. We
 * collect:
 *   - hits matching engineName by id/label → docsDepth (sum wiki+mem)
 *   - top utilization across those hits (used as a tie-breaker)
 *   - any related action hits whose dispatcher == one of our heuristic
 *     candidates (boosts that candidate's confidence).
 */
function extractIndexSignal(
  res: MasterIndexResult | null,
  engineName: string,
): {
  docsDepth: number;
  matchedHit: MasterIndexHit | null;
  relatedDispatchers: Set<string>;
} {
  if (!res || !Array.isArray(res.hits) || res.hits.length === 0) {
    return { docsDepth: 0, matchedHit: null, relatedDispatchers: new Set() };
  }
  const lowerName = engineName.toLowerCase();
  let matchedHit: MasterIndexHit | null = null;
  let docsDepth = 0;
  const relatedDispatchers = new Set<string>();

  for (const h of res.hits) {
    // Find the hit corresponding to the engine itself (label/id contains name).
    const labelLow = (h.label || "").toLowerCase();
    const idLow = (h.id || "").toLowerCase();
    if (
      !matchedHit &&
      (labelLow.includes(lowerName) || idLow.includes(lowerName))
    ) {
      matchedHit = h;
      docsDepth =
        (h.wikiEntries?.length ?? 0) + (h.memoryEntries?.length ?? 0);
    }
    // Surface dispatchers from related action hits.
    if (h.source === "action" && h.fullAction) {
      const disp = h.fullAction.split(":")[0];
      if (disp) relatedDispatchers.add(disp);
    }
  }

  return { docsDepth, matchedHit, relatedDispatchers };
}

/**
 * WiringPotentialEngine — public API.
 *
 * Singleton instance is `wiringPotentialEngine`. Construct manually when
 * you need a different capacity file or a mocked master index (tests).
 */
export class WiringPotentialEngine {
  constructor(
    private readonly defaultOpts: {
      capacityFile?: string;
      masterIndex?: { query: typeof masterIndexEngine.query };
      repoRoot?: string;
    } = {},
  ) {}

  /**
   * Resolve the capacity report once per analyze() call. Honors
   * (in order): opts.capacityReport (direct), opts.capacityFile,
   * defaultOpts.capacityFile, DEFAULT_CAPACITY_PATH resolved against
   * defaultOpts.repoRoot (or process.cwd()).
   */
  private resolveCapacity(opts: WiringPotentialOpts): CapacityReport | null {
    if (opts.capacityReport !== undefined) return opts.capacityReport;
    const explicit = opts.capacityFile ?? this.defaultOpts.capacityFile;
    if (explicit) return readCapacityReport(explicit);
    const root = this.defaultOpts.repoRoot ?? process.cwd();
    return readCapacityReport(path.resolve(root, DEFAULT_CAPACITY_PATH));
  }

  /**
   * Analyze a single orphan engine and return a ranked wiring report.
   *
   * @param engineName  Engine name (e.g., "GCodeTemplateEngine"). Validated
   *                    against InputSchema; throws ZodError on bad input.
   * @param opts        See WiringPotentialOpts. All fields optional.
   * @returns           WiringPotentialReport (always — never null, may have
   *                    `candidates: []` if no heuristic + no index hit fired).
   */
  public async analyze(
    engineName: string,
    opts: WiringPotentialOpts = {},
  ): Promise<WiringPotentialReport> {
    const validated = InputSchema.parse(engineName);
    const warnings: string[] = [];
    const generatedAt = new Date().toISOString();

    const capacity = this.resolveCapacity(opts);
    if (!capacity) {
      warnings.push(
        `DISPATCHER_CAPACITY.json unavailable — capacity signal disabled (all candidates get neutral 0.5)`,
      );
    }
    // Build capacity lookup keyed by the NORMALIZED prism_<x> form,
    // matching what `heuristicCandidates` emits. F7 writes rows with
    // `name: "calcDispatcher"` (etc.) — without normalization the join
    // silently misses every row in production. See class-A bug found
    // in 3-of-3 scrutiny gate, U-CLEANUP-C1 fix-up.
    const capacityIndex = new Map<string, CapacityRow>();
    if (capacity) {
      for (const r of capacity.rows) {
        const key = normalizeF7DispatcherName(r.name);
        if (key.length > 0) capacityIndex.set(key, r);
      }
    }

    // 1) Heuristic candidates from engine name.
    const heuristic = heuristicCandidates(validated);

    // 2) MasterIndex signal — never reimplement search.
    const mi = opts.masterIndex ?? this.defaultOpts.masterIndex ?? masterIndexEngine;
    let indexResult: MasterIndexResult | null = null;
    try {
      indexResult = await mi.query(validated, {
        sources: ["graph_node", "engine", "action"],
        limit: 8,
      });
    } catch (err) {
      warnings.push(
        `masterIndex.query failed (${(err as Error).message}) — falling back to heuristic only`,
      );
    }
    const indexSignal = extractIndexSignal(indexResult, validated);

    // 3) Merge heuristic + index-derived dispatchers into one set, scoring each.
    const candidateMap = new Map<string, WiringCandidate>();
    const minConf = opts.minConfidence ?? MIN_HEURISTIC_CONFIDENCE;

    for (const h of heuristic) {
      if (h.confidence < minConf) continue;
      const row = capacityIndex.get(h.dispatcher);
      const ratio = row?.ratio ?? -1;
      const klass = row ? row.status : classifyCapacity(ratio);
      if (klass === "critical") {
        warnings.push(
          `excluded ${h.dispatcher} (capacity ${(ratio * 100).toFixed(0)}% ≥ 100%)`,
        );
        continue;
      }
      // Boost if MasterIndex's related-actions set also names this dispatcher.
      const boost = indexSignal.relatedDispatchers.has(h.dispatcher) ? 0.10 : 0;
      const semanticConf = Math.min(1, h.confidence + boost);
      const docsDepth = indexSignal.docsDepth;
      const score =
        W_SEMANTIC * semanticConf +
        W_CAPACITY * capacityScore(ratio, klass) +
        W_DOCS_DEPTH * docsScore(docsDepth);

      const rationale: string[] = [
        `name pattern "${h.reason}" → ${h.dispatcher} (heuristic, conf ${h.confidence.toFixed(2)})`,
      ];
      if (row) {
        rationale.push(
          `${h.dispatcher} at ${(ratio * 100).toFixed(0)}% capacity (${klass})`,
        );
      } else {
        rationale.push(`${h.dispatcher} capacity unknown (no F7 signal)`);
      }
      if (boost > 0) {
        rationale.push(`related MasterIndex actions also point to ${h.dispatcher}`);
      }
      if (docsDepth > 0) {
        rationale.push(
          `${docsDepth} pre-joined wiki/memory entry(ies) — partial rationale already documented`,
        );
      }

      candidateMap.set(h.dispatcher, {
        dispatcher: h.dispatcher,
        score,
        headroomRatio: ratio,
        capacityClass: klass,
        semanticConfidence: semanticConf,
        docsDepth,
        rationale,
      });
    }

    // Index-only candidates (dispatchers MasterIndex surfaced but heuristic
    // missed). Lower base confidence since the engine name didn't pattern-match.
    for (const disp of indexSignal.relatedDispatchers) {
      if (candidateMap.has(disp)) continue;
      const row = capacityIndex.get(disp);
      const ratio = row?.ratio ?? -1;
      const klass = row ? row.status : classifyCapacity(ratio);
      if (klass === "critical") {
        warnings.push(
          `excluded ${disp} (capacity ${(ratio * 100).toFixed(0)}% ≥ 100%, MasterIndex-derived)`,
        );
        continue;
      }
      const semanticConf = 0.40; // index-only, weaker than heuristic match
      if (semanticConf < minConf) continue;
      const docsDepth = indexSignal.docsDepth;
      const score =
        W_SEMANTIC * semanticConf +
        W_CAPACITY * capacityScore(ratio, klass) +
        W_DOCS_DEPTH * docsScore(docsDepth);
      candidateMap.set(disp, {
        dispatcher: disp,
        score,
        headroomRatio: ratio,
        capacityClass: klass,
        semanticConfidence: semanticConf,
        docsDepth,
        rationale: [
          `MasterIndex related actions → ${disp} (no name heuristic match)`,
          row
            ? `${disp} at ${(ratio * 100).toFixed(0)}% capacity (${klass})`
            : `${disp} capacity unknown (no F7 signal)`,
        ],
      });
    }

    // Rank.
    const all = Array.from(candidateMap.values()).sort(
      (a, b) =>
        b.score - a.score ||
        a.headroomRatio - b.headroomRatio || // prefer more headroom on tie
        a.dispatcher.localeCompare(b.dispatcher), // stable
    );
    const k = Math.min(
      MAX_TOP_K,
      Math.max(1, opts.topK ?? DEFAULT_TOP_K),
    );
    const candidates = all.slice(0, k);

    if (candidates.length === 0) {
      warnings.push(
        `no candidate survived filtering (heuristic=${heuristic.length}, indexRelated=${indexSignal.relatedDispatchers.size})`,
      );
    }

    return {
      engineName: validated,
      topCandidate: candidates[0] ?? null,
      candidates,
      warnings,
      generatedAt,
    };
  }

  /**
   * Analyze many engines in one call. Runs serially (each analyze() is
   * fast — ~5-15 ms once MasterIndex graph is cached) so we don't
   * thrash the cache or burn FDs on parallel reads.
   */
  public async analyzeBatch(
    engineNames: string[],
    opts: WiringPotentialOpts = {},
  ): Promise<WiringPotentialReport[]> {
    if (!Array.isArray(engineNames)) {
      throw new Error("analyzeBatch: engineNames must be an array");
    }
    const out: WiringPotentialReport[] = [];
    for (const n of engineNames) {
      out.push(await this.analyze(n, opts));
    }
    return out;
  }
}

/** Default singleton for callers that don't need DI. */
export const wiringPotentialEngine = new WiringPotentialEngine();
export default wiringPotentialEngine;
