/**
 * SFC combinatorial VALIDITY matrix -- which (operation x strategy x cut_type x
 * tool_material) cells are physically/practically real, so the sampler never
 * enumerates a nonsensical regime (e.g. a "trochoidal turning" cell or a
 * "CBN tap") silently.
 *
 * OSCAR-SFC-9AXIS-MS0 / U-CSFH-02-VALIDITY-MATRIX (slot:oscar, 2026-06-10).
 *
 * Layered on U-CSFH-01's axes (`./sfc-combinatorial-axes.ts`). PURE DATA +
 * deterministic predicates -- imports only TYPES + the axis arrays, never
 * `vitest` -- so the `CombinatorialCellSampler` (U-CSFH-04, a runtime engine) can
 * import it. (The stale plan table filed this under `__tests__/sfc/`; it lives in
 * `src/data/` instead -- same correction U-CSFH-01 made -- because an engine must
 * not depend on the test tree.)
 *
 * SCOPE (per the plan): exactly the 4 axes operation x strategy x cut_type x
 * tool_material. Material-vs-ISO compatibility (e.g. PCD only on non-ferrous, CBN
 * on hardened) is a DIFFERENT axis pairing and is intentionally NOT encoded here
 * -- it belongs to the per-cell gates (U-CSFH-05), where the ISO-group axis is in
 * scope. Conflating the two would over-restrict this matrix.
 *
 * Each rule states a real tooling/kinematics incompatibility with its reason, so
 * a dropped cell is auditable (never a silent filter). The rule tables are
 * `Record<Operation, ...>` so adding an operation to the axis is a COMPILE error
 * until a validity rule is supplied -- completeness is type-enforced.
 *
 * Sources: Machinery's Handbook (31st) operation taxonomy; Sandvik Coromant
 * tooling catalogues (grade-vs-operation availability); standard CAM toolpath
 * vocabulary (trochoidal/HSM/HPC/plunge/slot are milling-class strategies).
 */
import {
  OPERATIONS,
  STRATEGIES,
  CUT_TYPES,
  TOOL_MATERIALS,
  type Operation,
  type Strategy,
  type CutType,
  type ToolMaterial,
} from "./sfc-combinatorial-axes.js";

/** The 4-axis cell key this matrix validates. */
export interface CombinatorialCellKey {
  operation: Operation;
  strategy: Strategy;
  cut_type: CutType;
  tool_material: ToolMaterial;
}

/** Result of validating one cell -- `reasons` is empty iff valid. */
export interface ValidityResult {
  valid: boolean;
  /** One human-auditable reason per failed rule (empty when valid). */
  reasons: string[];
}

/**
 * RULE 1 -- toolpath strategy is a MILLING-class concept.
 * `trochoidal / hsm / hpc / plunge / slot / adaptive` describe how a rotating
 * tool sweeps a milled feature; a single-point (turning/boring) or axially-fed
 * (drill/tap/ream) tool has no such path. Non-milling ops therefore collapse the
 * strategy axis to the neutral `conventional`. Thread-milling is milling-class
 * but follows a fixed helix, so only `conventional` + `hsm` (speed regime) apply.
 */
export const OP_STRATEGIES: Record<Operation, ReadonlySet<Strategy>> = {
  milling: new Set<Strategy>(["conventional", "adaptive", "trochoidal", "hsm", "hpc", "plunge", "slot"]),
  thread_milling: new Set<Strategy>(["conventional", "hsm"]),
  turning: new Set<Strategy>(["conventional"]),
  drilling: new Set<Strategy>(["conventional"]),
  tapping: new Set<Strategy>(["conventional"]),
  reaming: new Set<Strategy>(["conventional"]),
  boring: new Set<Strategy>(["conventional"]),
};

/**
 * RULE 2 -- cut-type axis restricted for single-pass / finishing-only operations.
 * A tap forms the full thread in ONE pass (no rough/semi/finish S-F distinction)
 * -> `finishing` only. A reamer removes a small finishing allowance (you bore, not
 * "rough-ream", for stock removal) -> `semi_finishing` + `finishing`. All other
 * ops (incl. multi-pass thread-milling and rough/finish boring) keep all three.
 */
export const OP_CUT_TYPES: Record<Operation, ReadonlySet<CutType>> = {
  milling: new Set<CutType>(["roughing", "semi_finishing", "finishing"]),
  turning: new Set<CutType>(["roughing", "semi_finishing", "finishing"]),
  drilling: new Set<CutType>(["roughing", "semi_finishing", "finishing"]),
  boring: new Set<CutType>(["roughing", "semi_finishing", "finishing"]),
  thread_milling: new Set<CutType>(["roughing", "semi_finishing", "finishing"]),
  reaming: new Set<CutType>(["semi_finishing", "finishing"]),
  tapping: new Set<CutType>(["finishing"]),
};

/**
 * RULE 3 -- tool material must have standard tooling that EXISTS for the operation
 * (independent of whether that grade suits the workpiece material -- that is the
 * gates' ISO-compat check, not this one):
 *  - taps: HSS (powder-metal) or solid carbide only -- no insert-grade
 *    cermet/ceramic/CBN/PCD taps are manufactured.
 *  - drills: HSS + carbide (twist), PCD (non-ferrous/composite), and cermet
 *    (indexable cermet-tipped drills for cast iron, e.g. Kyocera/Sumitomo);
 *    CBN and ceramic twist drills are not a standard manufactured category.
 *  - reamers: HSS or solid carbide.
 *  - thread mills: solid carbide (HSS exists but uncommon).
 *  - turning / boring / milling: full single-point/insert grade range (all 6).
 */
export const OP_TOOL_MATERIALS: Record<Operation, ReadonlySet<ToolMaterial>> = {
  milling: new Set<ToolMaterial>(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]),
  turning: new Set<ToolMaterial>(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]),
  boring: new Set<ToolMaterial>(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]),
  drilling: new Set<ToolMaterial>(["carbide", "hss", "cermet", "pcd"]),
  reaming: new Set<ToolMaterial>(["carbide", "hss"]),
  tapping: new Set<ToolMaterial>(["carbide", "hss"]),
  thread_milling: new Set<ToolMaterial>(["carbide", "hss"]),
};

/**
 * Validate one cell against the three rule tables. Pure + deterministic -- same
 * key always yields the same verdict + reasons (order-stable: strategy, cut_type,
 * tool_material).
 */
export function validateCell(cell: CombinatorialCellKey): ValidityResult {
  const { operation, strategy, cut_type, tool_material } = cell;
  const reasons: string[] = [];

  if (!OP_STRATEGIES[operation].has(strategy)) {
    reasons.push(
      `strategy '${strategy}' is not applicable to operation '${operation}' ` +
        `(toolpath-strategy axis is milling-class; this op uses ` +
        `{${[...OP_STRATEGIES[operation]].join(", ")}})`,
    );
  }
  if (!OP_CUT_TYPES[operation].has(cut_type)) {
    reasons.push(
      `cut_type '${cut_type}' is not applicable to operation '${operation}' ` +
        `(single-pass/finishing op; allowed {${[...OP_CUT_TYPES[operation]].join(", ")}})`,
    );
  }
  if (!OP_TOOL_MATERIALS[operation].has(tool_material)) {
    reasons.push(
      `tool_material '${tool_material}' has no standard tooling for operation ` +
        `'${operation}' (available {${[...OP_TOOL_MATERIALS[operation]].join(", ")}})`,
    );
  }

  return { valid: reasons.length === 0, reasons };
}

/** Convenience boolean wrapper around {@link validateCell}. */
export function isValidCell(cell: CombinatorialCellKey): boolean {
  return validateCell(cell).valid;
}

/**
 * Enumerate the FULL op x strategy x cut x toolmat cross-product
 * (7 x 7 x 3 x 6 = 882 cells). Deterministic order
 * (operation -> strategy -> cut_type -> tool_material).
 */
export function enumerateAllCells(): CombinatorialCellKey[] {
  const cells: CombinatorialCellKey[] = [];
  for (const operation of OPERATIONS) {
    for (const strategy of STRATEGIES) {
      for (const cut_type of CUT_TYPES) {
        for (const tool_material of TOOL_MATERIALS) {
          cells.push({ operation, strategy, cut_type, tool_material });
        }
      }
    }
  }
  return cells;
}

/** The subset of {@link enumerateAllCells} that passes every validity rule. */
export function enumerateValidCells(): CombinatorialCellKey[] {
  return enumerateAllCells().filter(isValidCell);
}

/**
 * Partition any cell list into valid + invalid (the invalid side carries each
 * cell's reasons so the dropped regimes are auditable, never silently filtered).
 */
export function partitionCells(cells: CombinatorialCellKey[]): {
  valid: CombinatorialCellKey[];
  invalid: Array<{ cell: CombinatorialCellKey; reasons: string[] }>;
} {
  const valid: CombinatorialCellKey[] = [];
  const invalid: Array<{ cell: CombinatorialCellKey; reasons: string[] }> = [];
  for (const cell of cells) {
    const r = validateCell(cell);
    if (r.valid) valid.push(cell);
    else invalid.push({ cell, reasons: r.reasons });
  }
  return { valid, invalid };
}

/**
 * Whole-space stats (computed once over the 882-cell cross-product). Lets a
 * consumer assert the matrix is neither all-pass (no filtering) nor all-fail
 * (over-restriction) without re-enumerating.
 */
export const VALIDITY_STATS: { total: number; valid: number; invalid: number } = (() => {
  const all = enumerateAllCells();
  const valid = all.filter(isValidCell).length;
  return { total: all.length, valid, invalid: all.length - valid };
})();
