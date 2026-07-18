/**
 * RFQMatchScoringEngine — the Phase-0 PRODUCTION RFQ→supplier matcher of the PRISM manufacturing
 * networking marketplace (galaxy:business, slot:hotel). Joins an RFQ's requirements to the
 * {@link SupplierCapabilityProfileEngine} registry, HARD-FILTERS candidates by declared capability,
 * then RANKS the survivors by a multi-criteria TOPSIS decision into an EXPLAINED shortlist.
 *
 * This is explicitly the TOPSIS matcher — NOT a GNN. It is the deterministic, fully-auditable Phase-0
 * production matcher the marketplace ships first; a learned GNN re-ranker is a documented future layer
 * (see §MAIN-WIRING). Every ranking decision here is traceable to a profile field and a cited weight.
 *
 * PIPELINE (scoreShortlist):
 *   1. HARD FILTER — for every candidate call {@link SupplierCapabilityProfileEngine.canSatisfy}; drop
 *      any whose `capable===false`, but RECORD it in `excluded[]` with its `gaps` (fail-loud
 *      transparency — a dropped shop is surfaced with WHY, never silently discarded).
 *   2. SCORE — build a TOPSIS criteria matrix from the SURVIVORS' profile data + the canSatisfy margins
 *      (no physics force calc — pure, deterministic from the profile). Criteria + weights + benefit/cost
 *      directions come from {@link RFQ_MATCH_CRITERIA_DEFS} (imported, never inlined).
 *   3. RANK — feed the matrix to the reused {@link TOPSISEngine}; recover each survivor's closeness via
 *      the engine's own winner-selection (iterative peel-off — see {@link #rankByTopsis}); return a
 *      ranked shortlist with a human-readable `stampSummary` per shop.
 *
 * REUSES (never re-derives):
 *  - {@link SupplierCapabilityProfileEngine} — the capability registry + canSatisfy hard filter.
 *  - {@link TOPSISEngine} — the multi-criteria ranking math (vector normalization, weighted distance to
 *    ideal/anti-ideal, closeness). TOPSIS is NOT reimplemented here; this engine only builds the matrix
 *    and reads the engine's verdict.
 *  - the four criteria, their weights, and their benefit/cost directions from
 *    {@link ../data/rfq-match-weights.js} — the single source of truth for the ranking policy.
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - a bad RFQ shape THROWS via zod (unknown/typo'd process or material group surfaces through
 *    canSatisfy's own throw, so an impossible requirement is never silently scored as a miss).
 *  - an explicit `candidateSupplierIds` containing an UNKNOWN id THROWS (canSatisfy throws on a missing
 *    supplier) — a caller naming a phantom shop is a bug, not a no-match.
 *  - an EMPTY survivor set is a VALID outcome (no shop can do the job): returns an empty `shortlist`
 *    WITH the populated `excluded[]` and a `noMatch` reason — NOT a throw.
 *
 * §MAIN-WIRING (post golf-merge, in MAIN where the dispatcher is not stale):
 *  - wire scoreShortlist into businessDispatcher (the marketplace RFQ surface) — deferred per the
 *    WIRE-EXEMPT note below.
 *  - replace the geography distance proxy with a real zip/lat-long freight-distance model.
 *  - optionally re-rank the TOPSIS shortlist with a learned GNN (the Phase-1 layer).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import {
  SupplierCapabilityProfileEngine,
  type SupplierCapabilityProfile,
  type CapabilityVerdict,
} from "./SupplierCapabilityProfileEngine.js";
import { topsisEngine } from "./TOPSISEngine.js";
import {
  RFQ_MATCH_CRITERIA,
  RFQ_MATCH_WEIGHT_VECTOR,
  RFQ_MATCH_BENEFIT_VECTOR,
  CONFIDENCE_FLOOR,
  GEOGRAPHY_DEFAULT_SCORE,
  GEOGRAPHY_MATCH_SCORE,
  SPECIALIZATION_PRIMARY_SCORE,
  SPECIALIZATION_SECONDARY_SCORE,
  CERT_BONUS_PER_EXTRA,
  CERT_BONUS_CAP,
  BONUS_RELEVANT_CERTS,
  RFQ_MATCH_WEIGHTS_SCHEMA_VERSION,
} from "../data/rfq-match-weights.js";
import {
  ISO_MATERIAL_GROUPS,
  SUPPLIER_PROCESSES,
  materialGroupName,
  type IsoMaterialGroup,
  type SupplierProcess,
  type Certification,
} from "../data/supplier-capability-schema.js";

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/** A 3-axis bounding box in millimetres (all axes > 0). */
export interface PartEnvelopeMm {
  x: number;
  y: number;
  z: number;
}

/** The RFQ a buyer posts to the marketplace. */
export interface Rfq {
  rfqId: string;
  process: SupplierProcess;
  materialGroup: IsoMaterialGroup;
  /** the tolerance the job demands in mm (finite & > 0). */
  toleranceMm: number;
  partEnvelopeMm: PartEnvelopeMm;
  /** the order quantity (finite, integer, > 0) — carried for explanation/audit, not a hard filter here. */
  quantity: number;
  /** certifications the buyer requires every matched shop to hold (may be empty). */
  requiredCerts: Certification[];
  /** the buyer's preferred supplier region (boosts geography score on an exact match). */
  preferredRegion?: string;
}

/** Input to {@link RFQMatchScoringEngine.scoreShortlist}. */
export interface ScoreShortlistInput {
  rfq: Rfq;
  /** which suppliers to consider; default = all ACTIVE suppliers in the registry. */
  candidateSupplierIds?: string[];
}

/** The four per-criterion raw values that fed the TOPSIS matrix for one survivor (pre-normalization). */
export interface ShortlistCriteria {
  capabilityConfidence: number;
  certCoverage: number;
  geographyScore: number;
  processSpecialization: number;
}

/** One ranked supplier on the shortlist. */
export interface ShortlistEntry {
  supplierId: string;
  name: string;
  /** 1-based rank (1 = best fit). */
  rank: number;
  /** TOPSIS closeness coefficient in [0,1] (higher = closer to the ideal). */
  score: number;
  /** human-readable one-line "why this shop" summary. */
  stampSummary: string;
  /** the raw criterion values that produced the score (audit trail). */
  criteria: ShortlistCriteria;
}

/** One supplier dropped by the hard filter, with the gaps that disqualified it. */
export interface ExcludedEntry {
  supplierId: string;
  name: string;
  gaps: string[];
}

/** The result of an RFQ match. */
export interface ScoreShortlistResult {
  rfqId: string;
  /** the surviving suppliers, ranked best-first by TOPSIS closeness. */
  shortlist: ShortlistEntry[];
  /** every candidate the hard filter dropped, with the gaps that disqualified it. */
  excluded: ExcludedEntry[];
  /** how many candidates were evaluated by the hard filter. */
  candidatesEvaluated: number;
  /** how many survived the hard filter (=== shortlist.length). */
  survivors: number;
  /**
   * non-null ONLY when the shortlist is empty — the reason no shop matched (a valid outcome, surfaced
   * rather than thrown). null when at least one shop survived.
   */
  noMatch: string | null;
  schemaVersion: string;
}

// ============================================================================
// SCHEMA — z.input (NOT z.infer) so defaulted/optional fields stay optional for callers
// ============================================================================

const EnvelopeSchema = z.object({
  x: z.number().finite("rfq partEnvelopeMm.x must be finite").positive("rfq partEnvelopeMm.x must be > 0"),
  y: z.number().finite("rfq partEnvelopeMm.y must be finite").positive("rfq partEnvelopeMm.y must be > 0"),
  z: z.number().finite("rfq partEnvelopeMm.z must be finite").positive("rfq partEnvelopeMm.z must be > 0"),
});

const RfqSchema = z.object({
  rfqId: z.string().min(1, "rfq.rfqId is required"),
  process: z.string().min(1, "rfq.process is required"),
  materialGroup: z.string().min(1, "rfq.materialGroup is required"),
  toleranceMm: z.number().finite("rfq.toleranceMm must be finite").positive("rfq.toleranceMm must be > 0"),
  partEnvelopeMm: EnvelopeSchema,
  quantity: z.number().int("rfq.quantity must be an integer").positive("rfq.quantity must be > 0"),
  requiredCerts: z.array(z.string().min(1)).optional(),
  preferredRegion: z.string().min(1).optional(),
});

const ScoreShortlistSchema = z.object({
  rfq: RfqSchema,
  candidateSupplierIds: z.array(z.string().min(1)).optional(),
});
export type ScoreShortlistArgs = z.input<typeof ScoreShortlistSchema>;

// ============================================================================
// ENGINE
// ============================================================================

export class RFQMatchScoringEngine {
  /**
   * Match an RFQ to the supplier registry: hard-filter by declared capability, then rank the survivors
   * by multi-criteria TOPSIS into an explained shortlist.
   *
   * @param input the RFQ + optional explicit candidate list (default: all active suppliers).
   * @returns a {@link ScoreShortlistResult}: ranked `shortlist`, the `excluded` drops with their gaps,
   *          and (only when nobody survives) a `noMatch` reason.
   * @throws if the RFQ shape is invalid (zod), the RFQ names an unknown process/material group
   *         (canSatisfy throws), or an explicit candidateSupplierId is unknown (canSatisfy throws).
   */
  static scoreShortlist(input: ScoreShortlistArgs): ScoreShortlistResult {
    const parsed = ScoreShortlistSchema.parse(input); // throws on bad shape / non-positive / non-integer qty
    // Narrow the zod-parsed WIDE types (process/materialGroup parsed as z.string(); requiredCerts
    // optional) into the typed Rfq the scoring helpers consume. The enum strings are validated
    // downstream by canSatisfy's throw on a bad process/material/cert — so this cast is sound.
    const rfq: Rfq = {
      ...parsed.rfq,
      process: parsed.rfq.process as SupplierProcess,
      materialGroup: parsed.rfq.materialGroup as IsoMaterialGroup,
      requiredCerts: (parsed.rfq.requiredCerts ?? []) as Certification[],
    };
    const requiredCerts = rfq.requiredCerts;

    // resolve the candidate set: explicit ids, else all active suppliers.
    const candidateIds = RFQMatchScoringEngine.#resolveCandidates(parsed.candidateSupplierIds);

    const requirement = {
      process: rfq.process,
      materialGroup: rfq.materialGroup,
      toleranceMm: rfq.toleranceMm,
      partEnvelopeMm: rfq.partEnvelopeMm,
      requiredCerts,
    };

    // ---- Step 1: HARD FILTER ----
    const survivors: { profile: SupplierCapabilityProfile; verdict: CapabilityVerdict }[] = [];
    const excluded: ExcludedEntry[] = [];

    for (const id of candidateIds) {
      // canSatisfy THROWS on an unknown supplierId or a typo'd requirement enum — propagate (fail loud).
      const verdict = SupplierCapabilityProfileEngine.canSatisfy(id, requirement);
      const profile = SupplierCapabilityProfileEngine.getProfile(id);
      if (!profile) {
        // Unreachable in practice (canSatisfy would have thrown first), but never trust a null silently.
        throw new Error(`RFQMatchScoringEngine.scoreShortlist: supplier '${id}' vanished mid-match.`);
      }
      if (verdict.capable) {
        survivors.push({ profile, verdict });
      } else {
        excluded.push({ supplierId: id, name: profile.name, gaps: verdict.gaps });
      }
    }

    const candidatesEvaluated = candidateIds.length;

    // ---- Step 1b: NO SURVIVORS is a valid outcome (surface, do not throw) ----
    if (survivors.length === 0) {
      return {
        rfqId: rfq.rfqId,
        shortlist: [],
        excluded,
        candidatesEvaluated,
        survivors: 0,
        noMatch: RFQMatchScoringEngine.#noMatchReason(rfq, candidatesEvaluated, excluded),
        schemaVersion: RFQ_MATCH_WEIGHTS_SCHEMA_VERSION,
      };
    }

    // ---- Step 2: SCORE survivors into the TOPSIS criteria matrix ----
    const scored = survivors.map(({ profile, verdict }) => ({
      profile,
      verdict,
      criteria: RFQMatchScoringEngine.#scoreCriteria(profile, verdict, rfq, requiredCerts),
    }));

    // ---- Step 3: RANK via reused TOPSISEngine ----
    const ranked = RFQMatchScoringEngine.#rankByTopsis(scored);

    const shortlist: ShortlistEntry[] = ranked.map((r, i) => ({
      supplierId: r.profile.supplierId,
      name: r.profile.name,
      rank: i + 1,
      score: r.closeness,
      stampSummary: RFQMatchScoringEngine.#stampSummary(r.profile, r.verdict, rfq, requiredCerts),
      criteria: r.criteria,
    }));

    return {
      rfqId: rfq.rfqId,
      shortlist,
      excluded,
      candidatesEvaluated,
      survivors: shortlist.length,
      noMatch: null,
      schemaVersion: RFQ_MATCH_WEIGHTS_SCHEMA_VERSION,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Resolve the candidate id set: explicit (validated non-empty) or all active suppliers. */
  static #resolveCandidates(explicit: string[] | undefined): string[] {
    if (explicit !== undefined) {
      if (explicit.length === 0) {
        throw new Error(
          "RFQMatchScoringEngine.scoreShortlist: candidateSupplierIds was supplied but empty — " +
            "omit it to match against all active suppliers, or pass at least one id (an empty explicit " +
            "list is an ambiguous caller error, not a no-match).",
        );
      }
      // dedupe while preserving order (canSatisfy will throw on any unknown id).
      const seen = new Set<string>();
      const out: string[] = [];
      for (const id of explicit) {
        if (!seen.has(id)) {
          seen.add(id);
          out.push(id);
        }
      }
      return out;
    }
    return SupplierCapabilityProfileEngine.listSuppliers().map((s) => s.supplierId);
  }

  /**
   * Build the four raw criterion values for one SURVIVING supplier (every value is constructed so that
   * "more is better" — all four are TOPSIS benefit criteria). PURE — derived only from the profile +
   * the canSatisfy margins, no physics.
   */
  static #scoreCriteria(
    profile: SupplierCapabilityProfile,
    verdict: CapabilityVerdict,
    rfq: Rfq,
    requiredCerts: Certification[],
  ): ShortlistCriteria {
    // 1) capabilityConfidence — tolerance headroom ratio, floored. margin >= 0 by construction (capable).
    const headroomRatio = verdict.margins.toleranceMarginMm / rfq.toleranceMm; // in [0, 1)
    const capabilityConfidence = Math.max(CONFIDENCE_FLOOR, headroomRatio);

    // 2) certCoverage — 1.0 base (required certs met post-filter) + bonus per EXTRA relevant cert, capped.
    const requiredSet = new Set<Certification>(requiredCerts);
    const relevantSet = new Set<Certification>(BONUS_RELEVANT_CERTS);
    const extraCerts = profile.certifications.filter((c) => !requiredSet.has(c) && relevantSet.has(c));
    const certCoverage = Math.min(CERT_BONUS_CAP, 1.0 + extraCerts.length * CERT_BONUS_PER_EXTRA);

    // 3) geographyScore — exact preferred-region match = 1.0; otherwise the mid-scale distance proxy.
    const geographyScore =
      rfq.preferredRegion !== undefined &&
      profile.geography.region.toLowerCase() === rfq.preferredRegion.toLowerCase()
        ? GEOGRAPHY_MATCH_SCORE
        : GEOGRAPHY_DEFAULT_SCORE;

    // 4) processSpecialization — primary (first-declared) process = 1.0, else offered-but-secondary = 0.5.
    //    (A survivor always offers the process — it passed the hard filter — so it is never below 0.5.)
    const processSpecialization =
      profile.processes[0] === rfq.process ? SPECIALIZATION_PRIMARY_SCORE : SPECIALIZATION_SECONDARY_SCORE;

    return { capabilityConfidence, certCoverage, geographyScore, processSpecialization };
  }

  /**
   * Rank survivors by TOPSIS closeness, REUSING {@link TOPSISEngine} (never reimplementing its math).
   *
   * TOPSISEngine.calculate() surfaces only the single best alternative + spread, not a full closeness
   * vector. To produce a complete ranking we PEEL OFF the engine's winner iteratively: build the matrix
   * for the remaining survivors, ask the engine for its best, append it as the next rank, remove it, and
   * repeat down to the last shop. Every ordering decision (and thus every rank) is the ENGINE's own —
   * this code only assembles the decision matrix and reads `best_alternative_index` / `best_closeness`.
   *
   * SCORE CONSISTENCY: each peel pass re-normalizes over a different pool, so a raw per-pass closeness is
   * not on a single comparable scale. We therefore clamp each appended closeness to be NON-INCREASING
   * (≤ the previously-appended rank's score). This keeps the surfaced `score` monotonic with `rank`
   * (rank 1 is never numerically below rank 2) while every score remains an engine-produced closeness
   * coefficient — no value is fabricated, only bounded to respect the engine's own ordering.
   *
   * Special case n===1: a lone survivor IS the ideal (TOPSIS needs >=2 alternatives to discriminate; a
   * 1-row matrix makes it both ideal and anti-ideal → closeness 0/0). A sole capable shop is the best
   * fit by definition, so it gets closeness 1.0 — surfaced honestly, not a degenerate 0.
   */
  static #rankByTopsis(
    scored: { profile: SupplierCapabilityProfile; verdict: CapabilityVerdict; criteria: ShortlistCriteria }[],
  ): { profile: SupplierCapabilityProfile; verdict: CapabilityVerdict; criteria: ShortlistCriteria; closeness: number }[] {
    if (scored.length === 1) {
      const only = scored[0];
      return [{ ...only, closeness: 1.0 }];
    }

    const weights = [...RFQ_MATCH_WEIGHT_VECTOR];
    const isBenefit = [...RFQ_MATCH_BENEFIT_VECTOR];

    const toRow = (c: ShortlistCriteria): number[] => RFQ_MATCH_CRITERIA.map((k) => c[k]);

    // Working pool; we peel the engine's winner off each pass until one remains.
    const remaining = [...scored];
    const out: {
      profile: SupplierCapabilityProfile;
      verdict: CapabilityVerdict;
      criteria: ShortlistCriteria;
      closeness: number;
    }[] = [];

    let prevScore = Number.POSITIVE_INFINITY; // monotonic-non-increasing clamp ceiling

    const appendWinner = (
      winner: { profile: SupplierCapabilityProfile; verdict: CapabilityVerdict; criteria: ShortlistCriteria },
      rawCloseness: number,
    ): void => {
      const score = Math.min(rawCloseness, prevScore);
      prevScore = score;
      out.push({ ...winner, closeness: score });
    };

    while (remaining.length > 1) {
      const matrix = remaining.map((r) => toRow(r.criteria));
      const result = topsisEngine.calculate({ decision_matrix: matrix, weights, is_benefit: isBenefit });
      const bestIdx0 = result.best_alternative_index.value - 1; // engine returns 1-based
      if (bestIdx0 < 0 || bestIdx0 >= remaining.length) {
        throw new Error(
          `RFQMatchScoringEngine.#rankByTopsis: TOPSISEngine returned out-of-range best index ` +
            `${result.best_alternative_index.value} for ${remaining.length} alternatives.`,
        );
      }
      const winner = remaining.splice(bestIdx0, 1)[0];
      appendWinner(winner, result.best_closeness.value);
    }

    // The last shop in the pool is the worst-ranked. Read its closeness honestly from the ORIGINAL full
    // matrix (its worst_closeness), then clamp to stay non-increasing.
    const last = remaining[0];
    const fullMatrix = scored.map((r) => toRow(r.criteria));
    const fullResult = topsisEngine.calculate({ decision_matrix: fullMatrix, weights, is_benefit: isBenefit });
    appendWinner(last, fullResult.worst_closeness.value);

    return out;
  }

  /** A human-readable "why this shop" stamp (tolerance / material group / certs / headroom). */
  static #stampSummary(
    profile: SupplierCapabilityProfile,
    verdict: CapabilityVerdict,
    rfq: Rfq,
    requiredCerts: Certification[],
  ): string {
    const groupLabel = materialGroupName(rfq.materialGroup) ?? rfq.materialGroup;
    const headroomMm = verdict.margins.toleranceMarginMm;
    const certs = profile.certifications.length > 0 ? profile.certifications.join("+") : "no certs";
    const primary = profile.processes[0] === rfq.process ? "primary" : "secondary";
    return (
      `holds ${profile.bestToleranceMm}mm in ${rfq.materialGroup}-group (${groupLabel}), ` +
      `${headroomMm.toFixed(4)}mm tolerance headroom, ${certs}, ` +
      `${rfq.process} as ${primary} process` +
      (requiredCerts.length > 0 ? ` (meets required ${requiredCerts.join("+")})` : "")
    );
  }

  /** Build the noMatch reason string for an empty shortlist (always a surfaced reason, never silent). */
  static #noMatchReason(rfq: Rfq, evaluated: number, excluded: ExcludedEntry[]): string {
    if (evaluated === 0) {
      return (
        `No candidate suppliers to evaluate for RFQ '${rfq.rfqId}' ` +
        `(${rfq.process}/${rfq.materialGroup}, ${rfq.toleranceMm}mm) — the active supplier registry is empty.`
      );
    }
    return (
      `No supplier can satisfy RFQ '${rfq.rfqId}' ` +
      `(process '${rfq.process}', material group '${rfq.materialGroup}', tolerance ${rfq.toleranceMm}mm, ` +
      `part ${rfq.partEnvelopeMm.x}x${rfq.partEnvelopeMm.y}x${rfq.partEnvelopeMm.z}mm` +
      `${(rfq.requiredCerts ?? []).length > 0 ? `, certs ${(rfq.requiredCerts ?? []).join("+")}` : ""}) — ` +
      `all ${evaluated} evaluated candidate(s) were excluded by the hard capability filter.`
    );
  }

  /** TEST-ONLY: no internal state to clear (pure engine). Present for harness symmetry. */
  static __resetForTests(): void {
    /* RFQMatchScoringEngine holds no registry state; the supplier registry is reset via
       SupplierCapabilityProfileEngine.__resetForTests(). */
  }
}

export const rfqMatchScoringEngine = RFQMatchScoringEngine;

// Referenced so the imported taxonomy constants are part of this module's typed surface (and so a future
// material/process expansion that breaks the import is caught at compile time, not at first call).
export const RFQ_MATCH_SUPPORTED_PROCESSES: ReadonlyArray<SupplierProcess> = SUPPLIER_PROCESSES;
export const RFQ_MATCH_SUPPORTED_MATERIAL_GROUPS: ReadonlyArray<IsoMaterialGroup> = ISO_MATERIAL_GROUPS.map(
  (g) => g.group,
);
