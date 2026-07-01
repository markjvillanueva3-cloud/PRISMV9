/**
 * LatheTribalIntegrationEngine — Lathe Tribal Knowledge → Lathe AI Bridge
 * =========================================================================
 * Wires shop-floor tribal knowledge for turning/lathe work into the lathe AI
 * system. This is the *integration* layer — the lathe analog of
 * MillTribalIntegrationEngine — that closes the gap between two engines that
 * never spoke to each other:
 *
 *   - TribalKnowledgeEngine     — the queryable tribal corpus (3,700+ tips)
 *   - LatheTribalInjectorEngine — the push-injector that feeds 4 downstream
 *                                  lathe engines (speed_feed, program_assembler,
 *                                  post_processor, quote_estimator)
 *
 * Before this engine, the injector required tips to be passed in by a caller
 * that knew how to source lathe-relevant knowledge; nothing did. This engine
 * IS that caller: it sources lathe tips (corpus query + curated JM Die signals)
 * and pushes them through the injector, so any lathe-related part of the PRISM
 * app reaches tribal knowledge through one dispatcher surface.
 *
 * Responsibilities:
 *   - sourceCorpusTips()    — pull lathe-relevant tips from the tribal corpus
 *   - integrateWithLatheAI()— source + convert + inject into the lathe AI
 *   - getAdjustment()       — tribal-derived rpm/feed/doc factors for an op
 *   - checkFailureModes()   — lathe-specific failure-mode lookup
 *   - getStatistics()       — coverage counts
 *
 * Design constraints:
 *   - Tribal tips are *supplementary* — they bias parameters, never override
 *     physics or safety. Adjustment factors are clamped to a sane band so
 *     compounded multipliers cannot produce a pathological recommendation.
 *   - Heuristics are *condition-gated*: a heuristic fires only when its real
 *     runtime condition (overhang ratio, slender part, interrupted cut, worn
 *     insert) holds — never merely because the operation type matches.
 *   - Corpus sourcing is dependency-injected (searchFn) so the heavy
 *     TribalKnowledgeEngine corpus can be faked in unit tests while a real
 *     end-to-end test still exercises the live corpus.
 *
 * @module engines/LatheTribalIntegrationEngine
 * @version 1.0.0
 * @milestone FEATURE-GAP-AUDIT-MS0 (U-GAP-LATHE-TRIBAL-WIRE)
 */

import { log } from "../utils/Logger.js";
import {
  tribalKnowledgeEngine,
  type KnowledgeTip,
  type KnowledgeSearchInput,
} from "./TribalKnowledgeEngine.js";
import {
  latheTribalInjectorEngine,
  type TribalTip,
  type InjectionContext,
  type InjectionResult,
  type InjectionTarget,
} from "./LatheTribalInjectorEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** ISO material group codes used across PRISM lathe physics. */
export type LatheMaterialIso = "P" | "M" | "K" | "N" | "S" | "H";

/** Canonical lathe operation taxonomy. */
export type LatheOperationType =
  | "turn_rough"
  | "turn_finish"
  | "face"
  | "bore"
  | "thread"
  | "part_off"
  | "groove"
  | "drill"
  | "knurl"
  | "chamfer";

/**
 * A curated tribal tip expressed as a training/adjustment signal — the lathe
 * analog of MillTribalIntegrationEngine's TribalTrainingSignal, extended with
 * lathe-specific knobs (sfm_max, css_rpm_cap).
 */
export interface LatheTribalSignal {
  tip_id: string;
  tip_title: string;
  signal_type: "positive" | "negative" | "constraint";
  affects_parameters: string[];
  material_iso?: LatheMaterialIso;
  operation_type?: LatheOperationType;
  adjustment: {
    rpm_factor?: number; // e.g. 0.8 = reduce spindle RPM 20%
    feed_factor?: number;
    doc_factor?: number; // depth-of-cut multiplier
    sfm_max?: number; // empirical surface-speed ceiling (ft/min)
    css_rpm_cap?: number; // constant-surface-speed RPM ceiling near centerline
  };
  confidence: number; // 0..1
  rationale: string;
}

/** Conditional expert heuristic — fires only when its runtime condition holds. */
export interface LatheExpertHeuristic {
  id: string;
  condition: string;
  action: string;
  applies_to_material?: LatheMaterialIso[]; // optional scope filter
  applies_to_operation?: LatheOperationType[]; // optional scope filter
  adjustment: { rpm?: number; feed?: number; doc?: number };
  confidence: number;
  source: string;
}

/** A known lathe failure mode and the parameter bias that prevents it. */
export interface LatheFailureMode {
  id: string;
  description: string;
  symptoms: string[];
  cause: string;
  prevention: { rpm?: number; feed?: number; doc?: number };
  material?: LatheMaterialIso;
  operation?: LatheOperationType;
  severity: "low" | "medium" | "high" | "critical";
}

/**
 * Runtime conditions for heuristic evaluation. A heuristic fires only when its
 * specific condition value is present and crosses its threshold — operation
 * type alone never triggers a heuristic.
 */
export interface LatheRuntimeConditions {
  /** Boring-bar (or tool) overhang ratio = length / diameter. */
  overhangRatio?: number;
  /** Unsupported part length / diameter ratio (no tailstock / steady rest). */
  partLengthDiameterRatio?: number;
  /** True when the OD cut is interrupted (cross-hole, flat, keyway). */
  interruptedCut?: boolean;
  /** Measured insert flank wear VB in millimetres. */
  insertWearVbMm?: number;
}

/** Result of getAdjustment(). */
export interface LatheTribalAdjustment {
  rpm_factor: number;
  feed_factor: number;
  doc_factor: number;
  /** Most restrictive empirical surface-speed ceiling (ft/min), or null. */
  sfm_max: number | null;
  /** Most restrictive constant-surface-speed RPM clamp, or null. */
  css_rpm_cap: number | null;
  warnings: string[];
  tips_applied: string[];
  clamped: boolean;
}

/** Result of integrateWithLatheAI() — the wiring output. */
export interface LatheTribalIntegrationResult {
  targets: Record<InjectionTarget, InjectionResult>;
  corpus_tips_sourced: number;
  curated_tips_used: number;
  /** Distinct tribal tips fed into the injector. */
  total_tips: number;
  /** Sum of per-target injections (each of the 4 targets scores the same set). */
  total_target_injections: number;
  context: InjectionContext;
  summary: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Lower/upper bound for a compounded multiplicative adjustment factor. */
const FACTOR_MIN = 0.25;
const FACTOR_MAX = 2.5;

/** Boring-bar overhang ratio (length/diameter) past which deflection dominates. */
const BORING_OVERHANG_RATIO_LIMIT = 4;

/** Unsupported part length/diameter ratio past which the part deflects/tapers. */
const UNSUPPORTED_PART_LD_LIMIT = 3;

/** Insert flank wear VB (mm) past which an M/S edge rubs and work-hardens. */
const INSERT_WEAR_VB_LIMIT_MM = 0.3;

/** Cap on retained integrateWithLatheAI() audit ids (bounded memory). */
const MAX_INTEGRATION_RUNS = 2000;

/** Canonical lathe operation set — used to validate caller input. */
const LATHE_OPERATIONS: ReadonlySet<string> = new Set<LatheOperationType>([
  "turn_rough",
  "turn_finish",
  "face",
  "bore",
  "thread",
  "part_off",
  "groove",
  "drill",
  "knurl",
  "chamfer",
]);

/** Canonical ISO material group set — used to validate caller input. */
const LATHE_MATERIALS: ReadonlySet<string> = new Set<LatheMaterialIso>([
  "P",
  "M",
  "K",
  "N",
  "S",
  "H",
]);

/** Keyword set used to pull lathe-relevant tips from the tribal corpus. */
const LATHE_CORPUS_KEYWORDS = [
  "lathe",
  "turning",
  "facing",
  "boring",
  "threading",
  "single-point",
  "parting",
  "cut-off",
  "cutoff",
  "grooving",
  "knurl",
  "chuck",
  "tailstock",
  "steady rest",
  "bar feed",
  "constant surface speed",
  "od turn",
  "id turn",
] as const;

// ============================================================================
// JM DIE LATHE TRIBAL KNOWLEDGE — curated shop-floor signals
// ============================================================================
// Real turning tribal knowledge spanning all six ISO material groups and the
// core lathe operations. Each tip carries the rationale that makes it tribal
// knowledge rather than a textbook constant.
const JM_DIE_LATHE_TIPS: LatheTribalSignal[] = [
  // ── P — steel ────────────────────────────────────────────────────────────
  {
    tip_id: "JM-LATHE-001",
    tip_title: "4140/4340 alloy steel rough turning: derate feed 15%",
    signal_type: "constraint",
    affects_parameters: ["feed"],
    material_iso: "P",
    operation_type: "turn_rough",
    adjustment: { feed_factor: 0.85 },
    confidence: 0.9,
    rationale:
      "Pre-hardened alloy steel loads the insert nose; standard feeds chip the edge before the pass completes.",
  },
  {
    tip_id: "JM-LATHE-002",
    tip_title: "Steel parting: ramp feed in, then chip-break to kill bird-nests",
    signal_type: "negative",
    affects_parameters: ["feed"],
    material_iso: "P",
    operation_type: "part_off",
    adjustment: { feed_factor: 0.75 },
    confidence: 0.93,
    rationale:
      "Continuous stringy chips wrap the part and the turret. Lower entry feed plus a chip-break groove forces short chips.",
  },
  {
    tip_id: "JM-LATHE-003",
    tip_title: "Steel finish turning: light DOC removes roughing deflection marks",
    signal_type: "positive",
    affects_parameters: ["doc", "feed"],
    material_iso: "P",
    operation_type: "turn_finish",
    adjustment: { doc_factor: 0.4, feed_factor: 0.8 },
    confidence: 0.88,
    rationale:
      "A spring/finish pass at light DOC removes the deflection witness left by roughing and holds the diameter.",
  },

  // ── M — stainless ─────────────────────────────────────────────────────────
  {
    tip_id: "JM-LATHE-004",
    tip_title: "304/316 stainless: never dwell — work-hardening glazes the surface",
    signal_type: "constraint",
    affects_parameters: ["feed", "rpm"],
    material_iso: "M",
    operation_type: "turn_rough",
    adjustment: { feed_factor: 1.05, sfm_max: 350 },
    confidence: 0.95,
    rationale:
      "Austenitic stainless work-hardens the instant the tool stops cutting. Keep a positive feed and cap SFM so the edge stays in fresh material.",
  },
  {
    tip_id: "JM-LATHE-005",
    tip_title: "Stainless single-point threading: add spring passes, slow it down",
    signal_type: "constraint",
    affects_parameters: ["rpm"],
    material_iso: "M",
    operation_type: "thread",
    adjustment: { rpm_factor: 0.7 },
    confidence: 0.9,
    rationale:
      "Stainless threads tear if pushed; extra spring passes at reduced RPM clean the flank without work-hardening it.",
  },
  {
    tip_id: "JM-LATHE-006",
    tip_title: "Stainless boring: sharp positive inserts, evacuate the chip",
    signal_type: "positive",
    affects_parameters: ["feed", "doc"],
    material_iso: "M",
    operation_type: "bore",
    adjustment: { feed_factor: 0.9, doc_factor: 0.85 },
    confidence: 0.87,
    rationale:
      "A trapped chip in a stainless bore re-cuts and work-hardens; sharp positive geometry and through-coolant clear it.",
  },

  // ── K — cast iron ─────────────────────────────────────────────────────────
  {
    tip_id: "JM-LATHE-007",
    tip_title: "Gray cast iron: run dry, expect abrasive flank wear",
    signal_type: "positive",
    affects_parameters: ["rpm"],
    material_iso: "K",
    operation_type: "turn_rough",
    adjustment: { rpm_factor: 0.95, sfm_max: 450 },
    confidence: 0.86,
    rationale:
      "Graphite in cast iron self-lubricates; coolant only thermally shocks the insert. Sand inclusions abrade the flank — plan tool life accordingly.",
  },
  {
    tip_id: "JM-LATHE-008",
    tip_title: "Cast iron facing: take the abrasive scale skin in one deeper, slower pass",
    signal_type: "constraint",
    affects_parameters: ["doc", "feed"],
    material_iso: "K",
    operation_type: "face",
    adjustment: { doc_factor: 1.1, feed_factor: 0.85 },
    confidence: 0.83,
    rationale:
      "Cast scale is harder and more abrasive than the parent iron; one deeper, slower pass keeps the edge below the scale instead of skating on it.",
  },

  // ── N — aluminum / non-ferrous ────────────────────────────────────────────
  {
    tip_id: "JM-LATHE-009",
    tip_title: "6061 aluminum turning: push SFM, polished sharp positive inserts",
    signal_type: "positive",
    affects_parameters: ["rpm", "feed"],
    material_iso: "N",
    operation_type: "turn_rough",
    adjustment: { rpm_factor: 1.3, feed_factor: 1.2 },
    confidence: 0.91,
    rationale:
      "Aluminum cuts cleanly at high surface speed; polished uncoated inserts with sharp positive rake prevent built-up edge.",
  },
  {
    tip_id: "JM-LATHE-010",
    tip_title: "Aluminum parting: high feed and sharp tool beat a slow grind",
    signal_type: "positive",
    affects_parameters: ["feed"],
    material_iso: "N",
    operation_type: "part_off",
    adjustment: { feed_factor: 1.25 },
    confidence: 0.85,
    rationale:
      "A slow parting feed in aluminum builds up on the edge and welds; a brisk feed with a sharp blade throws a clean chip.",
  },

  // ── S — titanium / superalloy ─────────────────────────────────────────────
  {
    tip_id: "JM-LATHE-011",
    tip_title: "Ti-6Al-4V turning: low SFM, flood coolant is mandatory",
    signal_type: "constraint",
    affects_parameters: ["rpm"],
    material_iso: "S",
    operation_type: "turn_rough",
    adjustment: { rpm_factor: 0.55, sfm_max: 180 },
    confidence: 0.96,
    rationale:
      "Titanium has low thermal conductivity — heat stays at the edge. High SFM burns the insert; dry titanium chips can ignite. Flood coolant, low SFM, rigid setup.",
  },
  {
    tip_id: "JM-LATHE-012",
    tip_title: "Superalloy turning: feed up, speed down, never let the edge rub",
    signal_type: "constraint",
    affects_parameters: ["rpm", "feed"],
    material_iso: "S",
    operation_type: "turn_finish",
    adjustment: { rpm_factor: 0.5, feed_factor: 1.1, sfm_max: 120 },
    confidence: 0.92,
    rationale:
      "Inconel/Waspaloy work-harden under a rubbing edge; carry a real chip load at very low SFM so the tool cuts rather than burnishes.",
  },

  // ── H — hardened ──────────────────────────────────────────────────────────
  {
    tip_id: "JM-LATHE-013",
    tip_title: "Hard turning >45 HRC: CBN, light DOC, finish pass only",
    signal_type: "constraint",
    affects_parameters: ["doc", "rpm"],
    material_iso: "H",
    operation_type: "turn_finish",
    adjustment: { doc_factor: 0.3, rpm_factor: 0.8, sfm_max: 500 },
    confidence: 0.94,
    rationale:
      "Hardened steel is finished, not roughed, on the lathe. CBN with a light DOC produces the white-layer-free finish; deep cuts shatter the insert.",
  },
  {
    tip_id: "JM-LATHE-014",
    tip_title: "Hard turning: keep coolant consistent or run fully dry",
    signal_type: "negative",
    affects_parameters: ["rpm"],
    material_iso: "H",
    operation_type: "turn_finish",
    adjustment: { rpm_factor: 0.9 },
    confidence: 0.88,
    rationale:
      "Intermittent coolant thermally cycles a CBN edge and cracks it; commit to flood or dry, never on-and-off.",
  },

  // ── Operation-centric (material-agnostic) ─────────────────────────────────
  // JM-LATHE-015 carries NO adjustment factors on purpose: it is the standing
  // boring caution surfaced on every bore op, while the *conditional* derate
  // lives in heuristic LHEUR-001 (gated on the actual overhang ratio). Keeping
  // the factor in only one place prevents a double-derate when both fire.
  {
    tip_id: "JM-LATHE-015",
    tip_title: "Boring bar past 4xD overhang: deflection scales with the cube of overhang",
    signal_type: "constraint",
    affects_parameters: [],
    operation_type: "bore",
    adjustment: {},
    confidence: 0.93,
    rationale:
      "Boring-bar deflection scales with the cube of overhang. Past 4xD a steel bar chatters unless DOC and feed come down; the conditional derate applies once the overhang ratio is supplied.",
  },
  {
    tip_id: "JM-LATHE-016",
    tip_title: "CSS facing/parting: cap RPM so the spindle does not overspeed at center",
    signal_type: "constraint",
    affects_parameters: ["rpm"],
    operation_type: "face",
    adjustment: { css_rpm_cap: 3000 },
    confidence: 0.95,
    rationale:
      "Under constant surface speed the commanded RPM climbs toward infinity as the tool nears the centerline. A G50/G96 RPM clamp prevents spindle overspeed and part ejection.",
  },
  {
    tip_id: "JM-LATHE-017",
    tip_title: "Drilling on the lathe: spot first, peck deep holes",
    signal_type: "constraint",
    affects_parameters: ["feed", "doc"],
    operation_type: "drill",
    adjustment: { feed_factor: 0.85, doc_factor: 0.8 },
    confidence: 0.9,
    rationale:
      "A centerline drill walks without a spot; past 3xD the chip packs. Peck cycles clear the flute and stop drill breakage.",
  },
  {
    tip_id: "JM-LATHE-018",
    tip_title: "Knurling: slow RPM, firm infeed, do not change coolant mid-form",
    signal_type: "positive",
    affects_parameters: ["rpm"],
    operation_type: "knurl",
    adjustment: { rpm_factor: 0.4 },
    confidence: 0.82,
    rationale:
      "Knurling is a forming operation, not a cutting one. Low RPM with steady pressure forms a clean diamond; changing conditions mid-form double-tracks the pattern.",
  },
];

// ============================================================================
// LATHE EXPERT HEURISTICS — condition-gated
// ============================================================================
// Each heuristic fires ONLY when its runtime condition (see heuristicTriggered)
// is met — an operation/material match is a scope *filter*, never the trigger.
const LATHE_HEURISTICS: LatheExpertHeuristic[] = [
  {
    id: "LHEUR-001",
    condition: "Boring-bar overhang ratio > 4xD",
    action: "Reduce DOC 40% and feed 20%",
    applies_to_operation: ["bore"],
    adjustment: { doc: 0.6, feed: 0.8 },
    confidence: 0.9,
    source: "Shop floor — long boring bars chatter; cut the load to keep them quiet",
  },
  {
    id: "LHEUR-002",
    condition: "Unsupported part length/diameter ratio > 3 (no tailstock/steady rest)",
    action: "Reduce DOC 30% and feed 15%, or add a tailstock/steady rest",
    adjustment: { doc: 0.7, feed: 0.85 },
    confidence: 0.88,
    source: "Slender parts deflect away from the tool and taper without support",
  },
  {
    id: "LHEUR-003",
    condition: "Interrupted cut on the OD (cross-hole, flat, keyway)",
    action: "Reduce feed 25% through the interruption",
    applies_to_operation: ["turn_rough", "turn_finish"],
    adjustment: { feed: 0.75 },
    confidence: 0.91,
    source: "Interrupted cuts shock the insert — ease the feed through the gap",
  },
  {
    id: "LHEUR-004",
    condition: "Stainless or superalloy cut with a worn (VB > 0.3 mm) insert",
    action: "Index the insert — a worn edge rubs and work-hardens M/S material",
    applies_to_material: ["M", "S"],
    adjustment: { feed: 0.9 },
    confidence: 0.89,
    source: "A rubbing edge glazes austenitic and nickel alloys faster than it cuts",
  },
];

// ============================================================================
// LATHE FAILURE MODES
// ============================================================================
const LATHE_FAILURE_MODES: LatheFailureMode[] = [
  {
    id: "LFAIL-001",
    description: "Bird-nesting — stringy chips wrap the part and turret",
    symptoms: ["Long continuous chip", "Chip wrapped around workpiece", "Surface drag marks"],
    cause: "Continuous-cut steel with no chip breaker and too low a feed",
    prevention: { feed: 0.8 },
    material: "P",
    operation: "turn_rough",
    severity: "high",
  },
  {
    id: "LFAIL-002",
    description: "Parting tool dig-in / blade snap",
    symptoms: ["Sudden squeal then snap", "Blade fragment in part", "Scrapped part"],
    cause: "Parting blade below center height or feed paused mid-cut",
    prevention: { feed: 0.85, rpm: 0.9 },
    operation: "part_off",
    severity: "critical",
  },
  {
    id: "LFAIL-003",
    description: "Thread crash / pull-out at the shoulder",
    symptoms: ["Tool buried at thread end", "Torn final thread", "Z-overrun alarm"],
    cause: "No pull-out groove or insufficient thread relief at the shoulder",
    prevention: { feed: 0.9 },
    operation: "thread",
    severity: "critical",
  },
  {
    id: "LFAIL-004",
    description: "Boring-bar chatter from excessive overhang",
    symptoms: ["Howling inside the bore", "Wavy bore wall", "Oversize/tapered ID"],
    cause: "Boring bar extended past 4xD without a damped/carbide bar",
    prevention: { doc: 0.6, feed: 0.8 },
    operation: "bore",
    severity: "high",
  },
  {
    id: "LFAIL-005",
    description: "Stainless work-hardening glaze",
    symptoms: ["Shiny burnished band", "Rapid flank wear", "Rising cutting force"],
    cause: "Tool dwelled or rubbed austenitic stainless instead of cutting it",
    prevention: { feed: 1.1, rpm: 0.85 },
    material: "M",
    severity: "medium",
  },
  {
    id: "LFAIL-006",
    description: "Titanium chip fire",
    symptoms: ["Sparks/flame at the chip", "Discolored chips", "Smoke"],
    cause: "Dry cutting or insufficient coolant on titanium at elevated SFM",
    prevention: { rpm: 0.55 },
    material: "S",
    operation: "turn_rough",
    severity: "critical",
  },
];

// ============================================================================
// LATHE TRIBAL INTEGRATION ENGINE
// ============================================================================

export class LatheTribalIntegrationEngine {
  private readonly signals: LatheTribalSignal[] = [...JM_DIE_LATHE_TIPS];
  private readonly heuristics: LatheExpertHeuristic[] = [...LATHE_HEURISTICS];
  private readonly failureModes: LatheFailureMode[] = [...LATHE_FAILURE_MODES];
  /** one run id per integrateWithLatheAI() call this process (bounded) */
  private readonly integrationRuns: string[] = [];

  // --------------------------------------------------------------------------
  // CORPUS SOURCING
  // --------------------------------------------------------------------------

  /**
   * Pull lathe-relevant tips from the tribal corpus and map them to the
   * injector's TribalTip shape.
   *
   * @param context - lathe machining context used to bias the corpus query
   * @param searchFn - corpus search function (injected for testability;
   *                    defaults to the live TribalKnowledgeEngine)
   * @returns deduplicated lathe-relevant TribalTip array
   */
  sourceCorpusTips(
    context: InjectionContext = {},
    searchFn: (input: KnowledgeSearchInput) => KnowledgeTip[] = (input) =>
      tribalKnowledgeEngine.search(input),
  ): TribalTip[] {
    const byId = new Map<string, TribalTip>();

    // Build the keyword set: standing lathe vocabulary + caller keywords.
    const queries = new Set<string>(LATHE_CORPUS_KEYWORDS);
    if (context.operation) queries.add(context.operation.toLowerCase());
    for (const k of context.keywords ?? []) {
      if (typeof k === "string" && k.trim()) queries.add(k.toLowerCase().trim());
    }

    for (const query of queries) {
      let hits: KnowledgeTip[];
      try {
        hits = searchFn({ query, limit: 8 }) ?? [];
      } catch (err) {
        log.warn(`[LatheTribalIntegration] corpus search failed for '${query}': ${err}`);
        continue;
      }
      if (!Array.isArray(hits)) {
        log.warn(`[LatheTribalIntegration] corpus search for '${query}' returned a non-array`);
        continue;
      }
      for (const tip of hits) {
        if (!tip || typeof tip.id !== "string") continue;
        if (byId.has(tip.id)) continue;
        if (!this.isLatheRelevant(tip)) continue;
        byId.set(tip.id, this.knowledgeTipToTribalTip(tip));
      }
    }

    return [...byId.values()];
  }

  // --------------------------------------------------------------------------
  // INTEGRATION — the wiring
  // --------------------------------------------------------------------------

  /**
   * Source lathe tribal knowledge and inject it into the lathe AI system.
   *
   * Combines curated JM Die lathe signals with corpus-sourced tips, then pushes
   * the merged set through LatheTribalInjectorEngine.injectAll() so all four
   * downstream lathe engines (speed_feed, program_assembler, post_processor,
   * quote_estimator) receive ranked, context-scored tribal tips.
   *
   * @param context - lathe machining context (material, operation, machine ...)
   * @param options - injection tuning; `limitPerTarget` caps tips per target,
   *                   `minRelevance` is the injector relevance floor,
   *                   `includeCorpus` toggles corpus sourcing (default true),
   *                   `searchFn` injects a corpus search fn for testing
   * @returns integration result with per-target injection breakdown
   */
  integrateWithLatheAI(
    context: InjectionContext = {},
    options: {
      limitPerTarget?: number;
      minRelevance?: number;
      includeCorpus?: boolean;
      searchFn?: (input: KnowledgeSearchInput) => KnowledgeTip[];
    } = {},
  ): LatheTribalIntegrationResult {
    const includeCorpus = options.includeCorpus !== false;

    // 1. Curated lathe signals → TribalTip, filtered to the context.
    const curated = this.signals
      .filter((s) => this.signalInScope(s, context))
      .map((s) => this.signalToTribalTip(s));

    // 2. Corpus-sourced lathe tips (optional).
    const corpus = includeCorpus
      ? this.sourceCorpusTips(context, options.searchFn)
      : [];

    // 3. Merge, curated wins on id collision (it carries the rationale).
    const merged = new Map<string, TribalTip>();
    for (const t of corpus) merged.set(t.id, t);
    for (const t of curated) merged.set(t.id, t);
    const allTips = [...merged.values()];

    // 4. Push into the lathe AI via the injector.
    const targets = latheTribalInjectorEngine.injectAll(allTips, context, {
      limitPerTarget: options.limitPerTarget ?? 5,
      minRelevance: options.minRelevance,
    });

    // Each of the 4 targets scores the SAME merged set; the sum below counts
    // per-target injections, not distinct tips (that is `total_tips`).
    const targetInjections = (Object.values(targets) as InjectionResult[]).reduce(
      (sum, r) => sum + r.total_tips_injected,
      0,
    );

    // Track exactly one run id per call (not the four per-target audit ids).
    const runId = `lti_run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.integrationRuns.push(runId);
    if (this.integrationRuns.length > MAX_INTEGRATION_RUNS) {
      this.integrationRuns.splice(0, this.integrationRuns.length - MAX_INTEGRATION_RUNS);
    }

    return {
      targets,
      corpus_tips_sourced: corpus.length,
      curated_tips_used: curated.length,
      total_tips: allTips.length,
      total_target_injections: targetInjections,
      context,
      summary:
        `Fed ${allTips.length} distinct lathe tribal tip(s) ` +
        `(${curated.length} curated + ${corpus.length} corpus) into the lathe AI; ` +
        `${targetInjections} injection(s) across 4 targets.`,
    };
  }

  // --------------------------------------------------------------------------
  // ADJUSTMENT CALCULATION
  // --------------------------------------------------------------------------

  /**
   * Compute the tribal-knowledge parameter bias for a lathe operation.
   *
   * Curated signals that match the material/operation and heuristics whose
   * runtime condition holds are compounded multiplicatively; the final factors
   * are clamped to [0.25, 2.5] so stacked tips cannot produce a pathological
   * recommendation. Tribal output is advisory — it biases physics-derived
   * parameters, it never replaces them. An unrecognized material or operation
   * is reported as a warning rather than silently yielding neutral factors.
   *
   * @param materialIso - ISO material group of the workpiece (P/M/K/N/S/H)
   * @param operationType - lathe operation being performed
   * @param conditions - runtime conditions that gate the expert heuristics
   * @returns rpm/feed/doc factors, SFM/CSS ceilings, warnings and applied ids
   */
  getAdjustment(
    materialIso: LatheMaterialIso | string,
    operationType: LatheOperationType | string,
    conditions: LatheRuntimeConditions = {},
  ): LatheTribalAdjustment {
    let rpmFactor = 1.0;
    let feedFactor = 1.0;
    let docFactor = 1.0;
    let sfmMax: number | null = null;
    let cssRpmCap: number | null = null;
    const warnings: string[] = [];
    const tipsApplied: string[] = [];

    // Normalize caller input so case/whitespace variants ("BORE", " bore",
    // "p") still match the canonical curated taxonomy.
    const material = String(materialIso).trim().toUpperCase();
    const operation = String(operationType).trim().toLowerCase();

    // R12: surface unrecognized inputs rather than silently doing nothing.
    if (!LATHE_MATERIALS.has(material)) {
      warnings.push(
        `Material '${materialIso}' is not a recognized ISO group (P/M/K/N/S/H) — ` +
          `material-specific tribal signals were skipped.`,
      );
    }
    if (!LATHE_OPERATIONS.has(operation)) {
      warnings.push(
        `Operation '${operationType}' is not a recognized lathe operation — ` +
          `operation-specific tribal signals were skipped.`,
      );
    }

    // Curated signals: apply when material and operation both match (a missing
    // field on the signal means "applies to all").
    for (const s of this.signals) {
      if (s.material_iso && s.material_iso !== material) continue;
      if (s.operation_type && s.operation_type !== operation) continue;

      if (s.adjustment.rpm_factor) rpmFactor *= s.adjustment.rpm_factor;
      if (s.adjustment.feed_factor) feedFactor *= s.adjustment.feed_factor;
      if (s.adjustment.doc_factor) docFactor *= s.adjustment.doc_factor;
      if (s.adjustment.sfm_max !== undefined) {
        sfmMax = sfmMax === null ? s.adjustment.sfm_max : Math.min(sfmMax, s.adjustment.sfm_max);
      }
      if (s.adjustment.css_rpm_cap !== undefined) {
        cssRpmCap =
          cssRpmCap === null
            ? s.adjustment.css_rpm_cap
            : Math.min(cssRpmCap, s.adjustment.css_rpm_cap);
      }
      if (s.signal_type === "negative" || s.signal_type === "constraint") {
        warnings.push(s.rationale);
      }
      tipsApplied.push(s.tip_id);
    }

    // Heuristics: apply only when the real runtime condition holds.
    for (const h of this.heuristics) {
      if (!this.heuristicTriggered(h, material, operation, conditions)) continue;
      if (h.adjustment.rpm) rpmFactor *= h.adjustment.rpm;
      if (h.adjustment.feed) feedFactor *= h.adjustment.feed;
      if (h.adjustment.doc) docFactor *= h.adjustment.doc;
      warnings.push(`${h.condition} → ${h.action}`);
      tipsApplied.push(h.id);
    }

    // Clamp compounded factors into the acceptable band.
    const clampedRpm = this.clampFactor(rpmFactor);
    const clampedFeed = this.clampFactor(feedFactor);
    const clampedDoc = this.clampFactor(docFactor);
    const clamped =
      clampedRpm !== rpmFactor || clampedFeed !== feedFactor || clampedDoc !== docFactor;
    if (clamped) {
      warnings.push(
        "Compounded tribal factors were clamped to [0.25, 2.5] — review the stacked tips.",
      );
    }

    return {
      rpm_factor: clampedRpm,
      feed_factor: clampedFeed,
      doc_factor: clampedDoc,
      sfm_max: sfmMax,
      css_rpm_cap: cssRpmCap,
      warnings,
      tips_applied: tipsApplied,
      clamped,
    };
  }

  // --------------------------------------------------------------------------
  // FAILURE MODES
  // --------------------------------------------------------------------------

  /**
   * Return the lathe failure modes relevant to a material/operation pair.
   * A failure mode with no material/operation field is universal and always
   * returned.
   *
   * The `prevention` factors on each returned failure mode are advisory —
   * for operator display; they are NOT auto-applied by getAdjustment().
   *
   * @param materialIso - ISO material group of the workpiece
   * @param operationType - lathe operation being performed
   * @returns matching failure modes, critical ones first
   */
  checkFailureModes(
    materialIso?: LatheMaterialIso | string,
    operationType?: LatheOperationType | string,
  ): LatheFailureMode[] {
    const sevRank: Record<LatheFailureMode["severity"], number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return this.failureModes
      .filter((fm) => {
        if (fm.material && materialIso && fm.material !== materialIso) return false;
        if (fm.operation && operationType && fm.operation !== operationType) return false;
        return true;
      })
      .sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
  }

  // --------------------------------------------------------------------------
  // STATISTICS
  // --------------------------------------------------------------------------

  /**
   * Coverage statistics for the curated lathe tribal corpus.
   *
   * @returns counts by material, operation and severity plus run total
   */
  getStatistics(): {
    total_signals: number;
    total_heuristics: number;
    total_failure_modes: number;
    integration_runs: number;
    by_material: Record<string, number>;
    by_operation: Record<string, number>;
    critical_failure_modes: number;
  } {
    const byMaterial: Record<string, number> = {};
    const byOperation: Record<string, number> = {};

    for (const s of this.signals) {
      if (s.material_iso) byMaterial[s.material_iso] = (byMaterial[s.material_iso] ?? 0) + 1;
      if (s.operation_type) byOperation[s.operation_type] = (byOperation[s.operation_type] ?? 0) + 1;
    }

    return {
      total_signals: this.signals.length,
      total_heuristics: this.heuristics.length,
      total_failure_modes: this.failureModes.length,
      integration_runs: this.integrationRuns.length,
      by_material: byMaterial,
      by_operation: byOperation,
      critical_failure_modes: this.failureModes.filter((f) => f.severity === "critical").length,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /** Clamp a compounded multiplicative factor into the acceptable band. */
  private clampFactor(f: number): number {
    if (!Number.isFinite(f) || f <= 0) return 1.0;
    return Math.max(FACTOR_MIN, Math.min(FACTOR_MAX, f));
  }

  /**
   * True when a heuristic's runtime condition holds. An operation/material
   * scope filter narrows *where* the heuristic is eligible; the actual trigger
   * is always a concrete runtime value (overhang, slenderness, interruption,
   * insert wear) — never the operation type alone.
   */
  private heuristicTriggered(
    h: LatheExpertHeuristic,
    materialIso: string,
    operationType: string,
    c: LatheRuntimeConditions,
  ): boolean {
    // Scope filters — if declared, the context must match.
    if (h.applies_to_material && !h.applies_to_material.includes(materialIso as LatheMaterialIso)) {
      return false;
    }
    if (
      h.applies_to_operation &&
      !h.applies_to_operation.includes(operationType as LatheOperationType)
    ) {
      return false;
    }
    // Runtime condition.
    switch (h.id) {
      case "LHEUR-001":
        return (
          c.overhangRatio !== undefined &&
          Number.isFinite(c.overhangRatio) &&
          c.overhangRatio > BORING_OVERHANG_RATIO_LIMIT
        );
      case "LHEUR-002":
        return (
          c.partLengthDiameterRatio !== undefined &&
          Number.isFinite(c.partLengthDiameterRatio) &&
          c.partLengthDiameterRatio > UNSUPPORTED_PART_LD_LIMIT
        );
      case "LHEUR-003":
        return c.interruptedCut === true;
      case "LHEUR-004":
        return (
          c.insertWearVbMm !== undefined &&
          Number.isFinite(c.insertWearVbMm) &&
          c.insertWearVbMm > INSERT_WEAR_VB_LIMIT_MM
        );
      default:
        return false;
    }
  }

  /** True when a corpus tip's text/tags reference lathe/turning work. */
  private isLatheRelevant(tip: KnowledgeTip): boolean {
    const haystack = (
      (tip.title ?? "") +
      " " +
      (tip.body ?? "") +
      " " +
      (tip.tags ?? []).join(" ") +
      " " +
      (tip.operation_types ?? []).join(" ")
    ).toLowerCase();
    return LATHE_CORPUS_KEYWORDS.some((kw) => haystack.includes(kw));
  }

  /** Map a corpus KnowledgeTip into the injector's TribalTip shape. */
  private knowledgeTipToTribalTip(k: KnowledgeTip): TribalTip {
    // KnowledgeTip.confidence is documented 0–100; map into the injector's 0–1.
    const conf = Number.isFinite(k.confidence) ? k.confidence / 100 : 0.5;
    // evidence/usage → 1..10 priority; never crashes on missing fields.
    const evidence = (k.evidence_count ?? 0) + (k.usage_count ?? 0);
    const priority = Math.max(1, Math.min(10, 4 + Math.round(Math.log2(evidence + 1))));
    return {
      id: k.id,
      content: k.body ? `${k.title} — ${k.body}` : k.title,
      category: k.category,
      confidence: Math.max(0, Math.min(1, conf)),
      tags: [...(k.tags ?? []), ...(k.auto_tags ?? [])],
      keywords: [...(k.operation_types ?? []), ...(k.material_groups ?? [])],
      priority,
      source_customer: this.parseCustomer(k.source),
    };
  }

  /** Extract a customer name from a "customer:NAME" provenance string. */
  private parseCustomer(source: string | undefined): string | undefined {
    if (!source) return undefined;
    const m = source.match(/customer:\s*([A-Za-z0-9 _-]+)/i);
    return m ? m[1].trim() : undefined;
  }

  /** Convert a curated lathe signal into the injector's TribalTip shape. */
  private signalToTribalTip(s: LatheTribalSignal): TribalTip {
    const priority =
      s.signal_type === "constraint" ? 9 : s.signal_type === "negative" ? 8 : 6;
    return {
      id: s.tip_id,
      content: `${s.tip_title} — ${s.rationale}`,
      category: s.signal_type === "constraint" ? "safety" : "speeds_feeds",
      confidence: Math.max(0, Math.min(1, s.confidence)),
      tags: ([s.material_iso, s.operation_type, s.signal_type] as (string | undefined)[]).filter(
        (x): x is string => typeof x === "string",
      ),
      keywords: [s.operation_type, ...s.affects_parameters, "lathe", "turning"].filter(
        (x): x is string => typeof x === "string",
      ),
      priority,
    };
  }

  /**
   * True when a curated signal is in scope for an injection context.
   * Hard-excludes an unambiguous ISO-material-group mismatch (the six groups
   * are a fixed enum) and — when the caller passes a *recognized* lathe
   * operation — an operation mismatch. Universal signals (no material_iso or
   * no operation_type) and non-canonical operation strings stay candidates;
   * the injector's scoreTip() then does the final relevance ranking.
   */
  private signalInScope(s: LatheTribalSignal, ctx: InjectionContext): boolean {
    // Normalize so case/whitespace context variants still gate correctly.
    const iso = ctx.iso_group ? String(ctx.iso_group).trim().toUpperCase() : undefined;
    const op = ctx.operation ? String(ctx.operation).trim().toLowerCase() : undefined;
    if (iso && s.material_iso && s.material_iso !== iso) return false;
    if (op && LATHE_OPERATIONS.has(op) && s.operation_type && s.operation_type !== op) {
      return false;
    }
    return true;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheTribalIntegrationEngine = new LatheTribalIntegrationEngine();
