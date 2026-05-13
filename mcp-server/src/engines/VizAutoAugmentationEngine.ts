/**
 * VizAutoAugmentationEngine — AUTO-LEARNING-LOOP-MS0 / U-ALL05
 * =============================================================
 *
 * Converts U-ALL04 `SynergyClassifierEngine` verdicts (one per
 * researcher-subagent output bundle) into a system-viz augmentation
 * document — a json file the main `scripts/merge-augmentations.mjs`
 * pipeline picks up and folds into the live system-viz graph.
 *
 * Output contract (`AugmentationDocument`):
 *   {
 *     "schemaVersion": 1,
 *     "nodes": [
 *       { "id": "auto-research-<source>-<guid-hash>",
 *         "type": "auto-research-finding",
 *         "label": "...",
 *         "confidence": 0.78,
 *         "band": "high" | "med",
 *         "originGuid": "...",
 *         "originSource": "...",
 *         "addedAt": <epoch-ms>,
 *         "rubricSchemaVersion": <int>
 *       }, ...
 *     ],
 *     "edges": [
 *       { "from": "auto-research-...",
 *         "to": "<existingPrismNodeId>",
 *         "kind": "semantic_match" | "novelty_extends" | "duplicate_of",
 *         "weight": 0.78
 *       }, ...
 *     ]
 *   }
 *
 * Spec § U-ALL05 failure-mode coverage:
 *   - **node-id collision** with an existing PRISM viz node →
 *     engine prefixes every emitted id with `"auto-research-"` so
 *     collisions are namespace-safe by construction. A defensive
 *     dedup pass also rejects internal duplicates (same guid passed
 *     twice in one batch) at emit-time.
 *   - **graph oversize** (a 10 k-finding RSS burst) → hard cap at
 *     `MAX_NODES_PER_AUG` (default 1000); overflow nodes are
 *     reported in the result but NOT emitted to the augmentation
 *     file. The main graph's own filter (`confidence > 0.8`) then
 *     gates which augmented nodes actually surface in the live viz.
 *   - **schema-incompatible augmentation** → schema-versioned
 *     payload (`AUGMENTATION_SCHEMA_VERSION = 1`); the merger
 *     refuses to fold a document whose `schemaVersion` doesn't
 *     match its supported version. Adaptive schema bumps must
 *     emit a compat-shim alongside.
 *
 * Confidence floor — `emit()` filters at `confidence_threshold`
 * (default 0.5). The main graph applies its own stricter
 * `confidence > 0.8` filter; the engine emits the band-wide
 * superset so future-relaxation of the main-graph filter is a
 * pure config change.
 *
 * Band selection — only `high` and `med` verdicts produce nodes;
 * `low` and `none` are no-ops. This mirrors the spec line
 * "high/med synergy → add nodes to system-viz".
 *
 * Determinism + persistence — pure data. The engine emits an
 * AugmentationDocument from a batch of (verdict, item) pairs; the
 * CLI (`scripts/auto-viz-augment-sweep.mjs`, deferred to U-ALL09)
 * writes the document to
 * `state/shared/system-viz/auto-research-augmentation.json`. The
 * `scripts/merge-augmentations.mjs` merger (peer-owned per spec)
 * picks the file up.
 *
 * Idempotent — passing the same verdict batch produces a
 * byte-identical document (nodes + edges sorted by id; addedAt
 * read from `now()` so callers can inject a frozen clock for
 * deterministic snapshots).
 *
 * @milestone AUTO-LEARNING-LOOP-MS0 / U-ALL05
 */

import type { ClassifierVerdict } from "./SynergyClassifierEngine.js";

// ─── Public types ────────────────────────────────────────────────────

export interface AugmentationNode {
  /** Always prefixed `"auto-research-"` for collision-safe namespacing. */
  id: string;
  type: "auto-research-finding";
  /** Truncated to `LABEL_MAX_CHARS`. */
  label: string;
  /** ClassifierVerdict.score (in [0, 1]). */
  confidence: number;
  /** ClassifierVerdict.label restricted to "high" | "med". */
  band: "high" | "med";
  originGuid: string;
  originSource: string;
  addedAt: number;
  rubricSchemaVersion: number;
}

export type AugmentationEdgeKind = "semantic_match" | "novelty_extends" | "duplicate_of";

export interface AugmentationEdge {
  /** Source node id — always one of the emitted `auto-research-` nodes. */
  from: string;
  /** Target node id — an existing PRISM viz node (verified upstream). */
  to: string;
  kind: AugmentationEdgeKind;
  weight: number;
}

export interface AugmentationDocument {
  schemaVersion: number;
  nodes: AugmentationNode[];
  edges: AugmentationEdge[];
}

/**
 * One input bundle: a classifier verdict + the originating source
 * item (for label / guid / source slug) + optional pre-computed
 * edges to existing PRISM viz nodes.
 */
export interface AugmentationInput {
  verdict: ClassifierVerdict;
  /** From the originating `SourceItem`. */
  guid: string;
  source: string;
  title: string;
  /**
   * Optional edges. Caller is responsible for verifying that `to`
   * node ids exist in the main viz graph; the engine just records
   * them. `from` is filled in by the engine (it knows the emitted
   * node id).
   */
  edges?: Array<{
    to: string;
    kind: AugmentationEdgeKind;
    weight: number;
  }>;
}

export interface EmitResult {
  document: AugmentationDocument;
  /** Number of input items dropped because verdict was low/none. */
  filteredByBand: number;
  /** Dropped because confidence < threshold. */
  filteredByConfidence: number;
  /** Dropped because guid was already emitted this batch. */
  filteredByInternalDup: number;
  /** Dropped because oversize cap was hit. */
  filteredByOversize: number;
}

export interface EngineOpts {
  /**
   * Minimum confidence to emit a node. Default 0.5 — the engine
   * emits the band-wide superset; the main viz graph applies its
   * own stricter 0.8 cutoff during the merge pass.
   */
  confidence_threshold?: number;
  /** Hard cap on emitted nodes per batch. Default 1000. */
  max_nodes_per_aug?: number;
  /** Max chars for `label` before truncation. Default 200. */
  label_max_chars?: number;
  /** Wall-clock injection. Default `Date.now`. */
  now?: () => number;
}

// ─── Constants ──────────────────────────────────────────────────────

export const AUGMENTATION_SCHEMA_VERSION = 1;
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.5;
export const DEFAULT_MAX_NODES_PER_AUG = 1000;
export const DEFAULT_LABEL_MAX_CHARS = 200;

/**
 * Allow-list of edge kinds. Anything outside this set is rejected
 * at emit (rather than silently included), so a future merger
 * version doesn't break on an unknown kind.
 */
const VALID_EDGE_KINDS: ReadonlySet<AugmentationEdgeKind> = new Set([
  "semantic_match",
  "novelty_extends",
  "duplicate_of",
]);

// ─── Helpers ────────────────────────────────────────────────────────

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Build the namespace-safe node id. Deterministic per (source, guid)
 * pair — re-running with the same inputs produces the same id, so
 * the merger can dedup across cron cycles.
 */
function nodeIdFor(source: string, guid: string): string {
  // Keep the source slug literal (it's already kebab-case in the
  // U-ALL01 catalog), and slugify the guid (which can be a URL).
  // The merger relies on this exact prefix for namespace isolation.
  const slug = String(guid).replace(/[^a-z0-9-]/gi, "-").slice(0, 64);
  const src = String(source).replace(/[^a-z0-9-]/gi, "-").slice(0, 64);
  return `auto-research-${src}-${slug}`;
}

function truncate(s: string, max: number): string {
  if (typeof s !== "string") return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class VizAutoAugmentationEngine {
  readonly name = "VizAutoAugmentationEngine";

  private confidenceThreshold: number;
  private maxNodesPerAug: number;
  private labelMaxChars: number;
  private nowFn: () => number;

  constructor(opts: EngineOpts = {}) {
    this.confidenceThreshold = isFiniteNumber(opts.confidence_threshold)
      ? Math.min(1, Math.max(0, opts.confidence_threshold))
      : DEFAULT_CONFIDENCE_THRESHOLD;
    this.maxNodesPerAug = Math.max(1, Math.floor(opts.max_nodes_per_aug ?? DEFAULT_MAX_NODES_PER_AUG));
    this.labelMaxChars = Math.max(16, Math.floor(opts.label_max_chars ?? DEFAULT_LABEL_MAX_CHARS));
    this.nowFn = opts.now ?? Date.now;
  }

  getConfig(): { confidence_threshold: number; max_nodes_per_aug: number; label_max_chars: number } {
    return {
      confidence_threshold: this.confidenceThreshold,
      max_nodes_per_aug: this.maxNodesPerAug,
      label_max_chars: this.labelMaxChars,
    };
  }

  setConfig(patch: Partial<EngineOpts>): void {
    if (isFiniteNumber(patch.confidence_threshold)) {
      this.confidenceThreshold = Math.min(1, Math.max(0, patch.confidence_threshold));
    }
    if (isFiniteNumber(patch.max_nodes_per_aug)) {
      this.maxNodesPerAug = Math.max(1, Math.floor(patch.max_nodes_per_aug));
    }
    if (isFiniteNumber(patch.label_max_chars)) {
      this.labelMaxChars = Math.max(16, Math.floor(patch.label_max_chars));
    }
  }

  /**
   * Build an AugmentationDocument from a batch of classifier outputs.
   *
   * Filter ladder (in order, see `EmitResult` counters):
   *   1. Drop verdicts whose label is `low` / `none`.
   *   2. Drop verdicts whose `score` is below `confidence_threshold`.
   *   3. Dedup internal duplicates (same guid appearing twice in the
   *      same batch — emit only first).
   *   4. Cap at `max_nodes_per_aug`; overflow counted but not
   *      emitted.
   *
   * Nodes + edges are sorted by id for byte-identical reruns.
   */
  emit(inputs: ReadonlyArray<AugmentationInput>): EmitResult {
    const out: EmitResult = {
      document: {
        schemaVersion: AUGMENTATION_SCHEMA_VERSION,
        nodes: [],
        edges: [],
      },
      filteredByBand: 0,
      filteredByConfidence: 0,
      filteredByInternalDup: 0,
      filteredByOversize: 0,
    };
    if (!Array.isArray(inputs)) return out;

    const now = this.nowFn();
    const seenGuids = new Set<string>();
    const nodes: AugmentationNode[] = [];
    const edges: AugmentationEdge[] = [];

    for (const input of inputs) {
      if (!input || typeof input !== "object" || !input.verdict) {
        out.filteredByBand += 1;
        continue;
      }
      const v = input.verdict;
      if (v.label !== "high" && v.label !== "med") {
        out.filteredByBand += 1;
        continue;
      }
      if (!isFiniteNumber(v.score) || v.score < this.confidenceThreshold) {
        out.filteredByConfidence += 1;
        continue;
      }
      if (typeof input.guid !== "string" || input.guid.length === 0) {
        // Treat unparseable input as a confidence filter (safer than a "rejected" pile here).
        out.filteredByConfidence += 1;
        continue;
      }
      if (seenGuids.has(input.guid)) {
        out.filteredByInternalDup += 1;
        continue;
      }
      if (nodes.length >= this.maxNodesPerAug) {
        out.filteredByOversize += 1;
        continue;
      }
      seenGuids.add(input.guid);

      const id = nodeIdFor(input.source, input.guid);
      nodes.push({
        id,
        type: "auto-research-finding",
        label: truncate(input.title ?? "(untitled)", this.labelMaxChars),
        confidence: Math.min(1, Math.max(0, v.score)),
        band: v.label,
        originGuid: input.guid,
        originSource: input.source,
        addedAt: now,
        rubricSchemaVersion: isFiniteNumber(v.rubricSchemaVersion) ? v.rubricSchemaVersion : 0,
      });

      // Edges — drop any whose kind is unknown (defence against
      // future-version drift).
      if (Array.isArray(input.edges)) {
        for (const e of input.edges) {
          if (!e || typeof e !== "object") continue;
          if (typeof e.to !== "string" || e.to.length === 0) continue;
          if (!VALID_EDGE_KINDS.has(e.kind)) continue;
          if (!isFiniteNumber(e.weight)) continue;
          edges.push({
            from: id,
            to: e.to,
            kind: e.kind,
            weight: Math.min(1, Math.max(0, e.weight)),
          });
        }
      }
    }

    // Sort for byte-identical reruns.
    nodes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    edges.sort((a, b) => {
      const ka = `${a.from}|${a.to}|${a.kind}`;
      const kb = `${b.from}|${b.to}|${b.kind}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

    out.document.nodes = nodes;
    out.document.edges = edges;
    return out;
  }

  /**
   * Serialise an AugmentationDocument to a stable, sorted JSON string
   * with `\n` line endings. The CLI writes this to disk; this method
   * is the canonical contract for byte-identical equivalence checks
   * (used by tests to verify idempotence).
   */
  serialise(doc: AugmentationDocument): string {
    return `${JSON.stringify(doc, null, 2)}\n`;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────

/**
 * Production singleton. The dispatcher action
 * `prism_ai:viz_auto_augment` (this milestone, U-ALL07/U-ALL08
 * wiring batch) and the CLI (deferred to U-ALL09 cron landing) share
 * this instance.
 *
 * // WIRE-EXEMPT: dispatcher action lands in U-ALL07/U-ALL08. The
 * // CLI is deferred to U-ALL09. `stop-auto-wire.mjs` should
 * // suppress orphan warnings during the gap.
 */
export const vizAutoAugmentationEngine = new VizAutoAugmentationEngine();
