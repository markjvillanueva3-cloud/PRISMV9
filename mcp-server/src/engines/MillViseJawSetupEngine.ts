/**
 * MillViseJawSetupEngine
 * ========================
 *
 * Soft-jaw machining + grip-planning calculator for milling-machine vises
 * (Kurt 6"/8", Orange/SMW soft jaws, jaw plates with locating bushings).
 *
 * Mill parity for LatheChuckJawSetupEngine (LATHE-PRO-MS11) but with
 * fundamentally different physics:
 *   - Lathe failure mode: centrifugal jaw lift-off (rotating chuck)
 *   - Mill failure mode:  cutting-force shear / lift against vise grip
 *     (stationary part, oscillating cut force)
 *
 * Computes the *practical changeover math* the machinist must do when
 * prepping a new vise setup:
 *
 *   1. Soft-jaw step bore (or jaw-pocket) depth — enough to seat the
 *      part without bottoming, accounting for elastic spring-back
 *   2. Parallel selection — required height to clear vise bed + provide
 *      minimum jaw-grip overlap (per ISO 16156 / SME Vise Setup Guide)
 *   3. Workstop / Locator standoff — distance from movable-jaw face to
 *      part datum, for repeatable Z reference
 *   4. Cut-force / grip-force safety check — peak cut force (with
 *      direction) vs friction-limited grip force, per Kurt vise manual
 *      and Shigley §8 friction
 *   5. Anti-lift safety check — vertical component of cut force vs the
 *      jaw face area's effective hold-down (only friction holds part
 *      DOWN against the parallel; no positive Z constraint)
 *
 * Formulas:
 *   springback_mm   = (clamp_force_kN × 1e3) / (E × contact_area_mm²)  (elastic)
 *   grip_force_max  = clamp_force_kN × μ × 1000                        (Coulomb friction)
 *   grip_safety     = grip_force_max / peak_cut_force_n                (must be > MIN_GRIP_SAFETY)
 *   parallel_height_min = max(part_grip_overlap_min, dim_height - vise_jaw_height)
 *
 * Distinct from existing:
 *   - ChuckGripForceEngine     : lathe clamping-force physics (rotating)
 *   - FixtureStiffnessEngine   : generic fixture deflection
 *   - WorkholdingValidatorEngine (if present) : binary go/no-go gate
 *   - This engine              : practical mill jaw-prep math (bore,
 *                                parallels, workstops, friction safety)
 *
 * References:
 *   - ISO 16156 "Machine tools safety — Chucks" (applies to vises by analogy)
 *   - Kurt Manufacturing "DX6 Vise Owner's Manual" — clamp force vs handle torque
 *   - SME "Tool & Manufacturing Engineers Handbook" Vol 1 §16 Workholding
 *   - Shigley's "Mechanical Engineering Design" §8 Friction (Coulomb model)
 *   - Machinery's Handbook 31st Ed. — Workholding chapter (friction
 *     coefficients for jaw materials)
 *
 * @module engines/MillViseJawSetupEngine
 * @milestone MILL-PARITY-UPGRADE-MS0 / U-MILL-VISE-JAW-SETUP (iter72)
 */

// ═══════════════════════════════════════════════════════════════════════
// CONSTANTS — sourced + locked
// ═══════════════════════════════════════════════════════════════════════

/** Minimum grip-force/cut-force safety ratio (Kurt manual, SME Handbook). */
export const MIN_GRIP_SAFETY = 2.0;

/** Anti-lift safety margin (lift-force / friction-hold-down). */
export const MIN_ANTILIFT_SAFETY = 3.0;

/** ISO 16156-aligned minimum grip overlap as fraction of part-bottom contact dim (mm). */
export const MIN_GRIP_OVERLAP_RATIO = 0.20;

/** Minimum absolute grip overlap (mm) regardless of part size — vise jaw min contact. */
export const MIN_GRIP_OVERLAP_ABS_MM = 3;

/** Default friction coefficient for serrated steel jaws on milled steel part. */
export const DEFAULT_FRICTION_COEFFICIENT_STEEL_ON_STEEL = 0.30;

/** Default friction coefficient for soft (aluminum/brass) jaws on aluminum part. */
export const DEFAULT_FRICTION_COEFFICIENT_AL_ON_AL = 0.20;

/** Default jaw elastic modulus (MPa) — hardened tool steel. */
export const DEFAULT_JAW_MODULUS_MPA = 210_000;

/** Default jaw face contact area (mm²) — typical 6" Kurt vise jaw, 100×50 = 5000 mm². */
export const DEFAULT_JAW_CONTACT_AREA_MM2 = 5_000;

/** Standard parallel heights available (mm) — Kurt/Orange/SMW standard sets. */
export const STANDARD_PARALLEL_HEIGHTS_MM = [
  6.35, 9.525, 12.7, 15.875, 19.05, 25.4, 31.75, 38.1, 44.45, 50.8,
];

/** Default vise jaw height (mm) — 6" Kurt DX6 standard hard-jaw. */
export const DEFAULT_VISE_JAW_HEIGHT_MM = 31.75; // 1.25" hard jaw

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export type ViseJawMaterial =
  | "hard_steel_serrated"  // OEM hardened serrated steel (max grip, marks part)
  | "soft_steel"           // Machined soft steel jaws (custom contour)
  | "aluminum"             // Soft aluminum jaws (alu parts, no marking)
  | "brass"                // Brass jaws (brass / soft mat'l, no marking)
  | "machinable_wax"       // Wax jaws (delicate / decorative parts)
  | "step_jaw_soft";       // Step-machined soft-jaw with custom pocket

export interface MillViseJawInput {
  /** Part dimension being gripped (mm) — the dimension perpendicular to jaws */
  part_grip_dim_mm: number;
  /** Part dimension tolerance band (mm, total) */
  part_grip_tol_mm: number;
  /** Part height in vise — total Z dim (mm) */
  part_height_mm: number;
  /** Part contact bottom dim along jaws (mm) — for grip overlap calc */
  part_bottom_contact_mm?: number;
  /** Clamp force (kN) — typically 22-30 kN for 6" Kurt at full handle torque */
  clamp_force_kn: number;
  /** Jaw material — drives friction coefficient default */
  jaw_material: ViseJawMaterial;
  /** Friction coefficient override (if known from test) */
  friction_coefficient?: number;
  /** Jaw elastic modulus MPa (default DEFAULT_JAW_MODULUS_MPA) */
  jaw_modulus_mpa?: number;
  /** Jaw face contact area mm² (default DEFAULT_JAW_CONTACT_AREA_MM2) */
  jaw_contact_area_mm2?: number;
  /** Vise jaw height (mm) — Z dim of the jaw itself, default 31.75 (6" Kurt) */
  vise_jaw_height_mm?: number;
  /** Peak cutting force expected during op (N), horizontal component */
  peak_cut_force_horizontal_n: number;
  /** Peak cutting force vertical component (N) — Z-up lift force, e.g. climb mill */
  peak_cut_force_vertical_n?: number;
  /** Step pocket required? (soft jaw step-machined to part contour) */
  step_pocket_required?: boolean;
  /** Step Z depth (mm) from jaw top to pocket floor */
  step_pocket_z_mm?: number;
  /** Workstop / locator standoff from movable-jaw face (mm) */
  workstop_standoff_mm?: number;
  /** Has dowel-pin location holes? (zero clocking error) */
  has_dowel_locators?: boolean;
}

export interface MillViseJawResult {
  /** Bore / pocket dim for soft jaw to grip the part (mm) — accounts for springback */
  jaw_pocket_dim_mm: number;
  springback_mm: number;
  /** Required parallel height to clear vise bed AND give min grip overlap (mm) */
  parallel_height_required_mm: number;
  /** Nearest standard parallel ≥ required height */
  parallel_height_standard_mm: number;
  /** Effective grip overlap with that parallel (mm) */
  grip_overlap_effective_mm: number;
  /** Step-pocket Z depth if requested (mm) */
  step_pocket_depth_mm?: number;
  /** Friction coefficient used (resolved from override or default) */
  friction_coefficient_used: number;
  /** Max horizontal grip force (N) = clamp_force × μ × 2 jaws */
  max_grip_force_n: number;
  /** Grip safety ratio = max_grip_force / peak_cut_force_horizontal */
  grip_safety_ratio: number;
  grip_safe: boolean;
  /** Anti-lift safety ratio = friction_holddown / peak_cut_force_vertical */
  antilift_safety_ratio: number;
  antilift_safe: boolean;
  /** Workstop standoff resolved (if provided) */
  workstop_standoff_mm?: number;
  warnings: string[];
  reasoning: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// FRICTION COEFFICIENT TABLE
// ═══════════════════════════════════════════════════════════════════════

const FRICTION_TABLE: Record<ViseJawMaterial, number> = {
  hard_steel_serrated: 0.40, // Serrations bite the part
  soft_steel: DEFAULT_FRICTION_COEFFICIENT_STEEL_ON_STEEL,
  aluminum: DEFAULT_FRICTION_COEFFICIENT_AL_ON_AL,
  brass: 0.22,
  machinable_wax: 0.15,
  step_jaw_soft: DEFAULT_FRICTION_COEFFICIENT_STEEL_ON_STEEL, // contour grip + friction
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round3(n: number): number { return Math.round(n * 1000) / 1000; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
/** Nanometre precision for elastic-springback reporting (mm to 10 nm). */
function round8(n: number): number { return Math.round(n * 1e8) / 1e8; }

function findNextStandardParallel(required_mm: number): number {
  for (const p of STANDARD_PARALLEL_HEIGHTS_MM) {
    if (p >= required_mm) return p;
  }
  return STANDARD_PARALLEL_HEIGHTS_MM[STANDARD_PARALLEL_HEIGHTS_MM.length - 1];
}

// ═══════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════

class MillViseJawSetupEngineImpl {
  compute(i: MillViseJawInput): MillViseJawResult {
    this.validate(i);
    const reasoning: string[] = [];
    const warnings: string[] = [];

    const E = i.jaw_modulus_mpa ?? DEFAULT_JAW_MODULUS_MPA;
    const contactArea = Math.max(10, i.jaw_contact_area_mm2 ?? DEFAULT_JAW_CONTACT_AREA_MM2);
    const viseJawH = i.vise_jaw_height_mm ?? DEFAULT_VISE_JAW_HEIGHT_MM;
    const mu = typeof i.friction_coefficient === "number"
      ? i.friction_coefficient
      : FRICTION_TABLE[i.jaw_material];

    // ── 1. Elastic springback + jaw-pocket dim ─────────────────────────
    const force_n = i.clamp_force_kn * 1000;
    const springback_mm = force_n / (E * contactArea);
    // Pocket is slightly UNDER the part dim so the part seats with friction
    const jaw_pocket = round3(i.part_grip_dim_mm - 2 * springback_mm);

    // ── 2. Parallel-height selection ──────────────────────────────────
    // Required: part_height - vise_jaw_height = how much the part must
    // stick UP above the jaw top. The parallel must lift the part so
    // the cut zone is above the jaw, but grip overlap must remain ≥
    // MIN_GRIP_OVERLAP (the % of jaw height that contacts the part).
    const minGripOverlap = Math.max(
      MIN_GRIP_OVERLAP_ABS_MM,
      MIN_GRIP_OVERLAP_RATIO * (i.part_bottom_contact_mm ?? i.part_grip_dim_mm),
    );
    // Parallel raises the part: effective grip overlap = vise_jaw_h - parallel_h
    // (since the part sits on top of the parallel and the parallel itself
    // is between the part bottom and the vise bed).
    // We want: vise_jaw_h - parallel_h >= minGripOverlap
    //   → parallel_h <= vise_jaw_h - minGripOverlap
    // We also want: parallel_h + part_height > vise_jaw_h
    //   → parallel_h > vise_jaw_h - part_height
    // So required parallel = max(0, vise_jaw_h - part_height + 1mm clearance)
    const parallel_required = Math.max(0, viseJawH - i.part_height_mm + 1);
    const parallel_max_for_grip = viseJawH - minGripOverlap;
    if (parallel_required > parallel_max_for_grip) {
      warnings.push(
        `Required parallel height ${round2(parallel_required)}mm exceeds max-for-grip ${round2(parallel_max_for_grip)}mm — part is too short relative to vise jaw + min-grip-overlap`,
      );
    }
    const parallel_std = findNextStandardParallel(parallel_required);
    const grip_overlap_effective = round2(Math.min(i.part_height_mm, viseJawH - parallel_std));

    // ── 3. Step-pocket depth ──────────────────────────────────────────
    let step_pocket_depth: number | undefined;
    if (i.step_pocket_required) {
      step_pocket_depth = round2(Math.max(2, i.step_pocket_z_mm ?? 5));
    }

    // ── 4. Cut-force / grip-force friction check ──────────────────────
    // 2 jaws in opposition; total clamping normal force = 2 × clamp_force.
    // Friction limit = μ × N (per jaw, so 2 × μ × clamp_force)
    const max_grip_force_n = 2 * force_n * mu;
    const grip_safety_ratio = i.peak_cut_force_horizontal_n > 0
      ? max_grip_force_n / i.peak_cut_force_horizontal_n
      : Infinity;
    const grip_safe = grip_safety_ratio >= MIN_GRIP_SAFETY;
    if (!grip_safe) {
      warnings.push(
        `Grip safety ratio ${round2(grip_safety_ratio)} < ${MIN_GRIP_SAFETY} — peak cut force ${i.peak_cut_force_horizontal_n}N exceeds friction grip ${round2(max_grip_force_n)}N`,
      );
    }

    // ── 5. Anti-lift safety check (Z-up cut force vs friction holddown) ──
    // The part is held DOWN by gravity + the COMPONENT of clamp force that
    // resolves vertically due to the part-jaw contact geometry (typically
    // ~zero for flat-flat). Conservative: assume only friction × clamp
    // holds the part down against a climb-mill lift force.
    const lift_n = i.peak_cut_force_vertical_n ?? 0;
    const friction_holddown_n = 2 * force_n * mu * 0.5; // half the grip budget reserved against lift
    const antilift_ratio = lift_n > 0
      ? friction_holddown_n / lift_n
      : Infinity;
    const antilift_safe = antilift_ratio >= MIN_ANTILIFT_SAFETY;
    if (!antilift_safe) {
      warnings.push(
        `Anti-lift safety ratio ${round2(antilift_ratio)} < ${MIN_ANTILIFT_SAFETY} — vertical cut force ${lift_n}N risks lifting part out of vise; consider step-pocket or dowel locators`,
      );
    }

    // ── 6. Workstop / dowel-locator advisories ────────────────────────
    if (!i.has_dowel_locators && i.workstop_standoff_mm === undefined) {
      warnings.push(
        "No workstop standoff and no dowel locators specified — part Y-axis location relies on operator placement; consider workstop for repeatable WCS",
      );
    }
    if (i.workstop_standoff_mm !== undefined && i.workstop_standoff_mm < 0) {
      warnings.push(`workstop_standoff_mm ${i.workstop_standoff_mm} is negative — invalid`);
    }

    // ── 7. Pocket-vs-tolerance advisory ────────────────────────────────
    if (jaw_pocket < i.part_grip_dim_mm - i.part_grip_tol_mm) {
      warnings.push(
        `Jaw pocket ${jaw_pocket}mm tighter than minimum part dim (${i.part_grip_dim_mm - i.part_grip_tol_mm}mm) — verify smallest-part fit before run`,
      );
    }

    // ── Reasoning narration ────────────────────────────────────────────
    reasoning.push(`Springback ${round8(springback_mm)}mm at ${i.clamp_force_kn}kN → pocket ${jaw_pocket}mm (part ${i.part_grip_dim_mm}mm)`);
    reasoning.push(`μ=${mu} (${i.jaw_material}), max grip force ${round2(max_grip_force_n)}N, safety ratio ${round2(grip_safety_ratio)}`);
    reasoning.push(`Parallel: required ${round2(parallel_required)}mm → std ${parallel_std}mm, grip overlap ${grip_overlap_effective}mm (min ${round2(minGripOverlap)}mm)`);
    if (lift_n > 0) reasoning.push(`Anti-lift: ${round2(friction_holddown_n)}N / ${lift_n}N = ratio ${round2(antilift_ratio)}`);

    return {
      jaw_pocket_dim_mm: jaw_pocket,
      springback_mm: round8(springback_mm),
      parallel_height_required_mm: round2(parallel_required),
      parallel_height_standard_mm: parallel_std,
      grip_overlap_effective_mm: grip_overlap_effective,
      step_pocket_depth_mm: step_pocket_depth,
      friction_coefficient_used: mu,
      max_grip_force_n: round2(max_grip_force_n),
      grip_safety_ratio: round2(grip_safety_ratio),
      grip_safe,
      antilift_safety_ratio: round2(antilift_ratio),
      antilift_safe,
      workstop_standoff_mm: i.workstop_standoff_mm,
      warnings,
      reasoning,
    };
  }

  getStats(): { reference: string; friction_table: Record<ViseJawMaterial, number>; standard_parallels: number[] } {
    return {
      reference: "ISO 16156 chuck safety (vise analog); Kurt DX6 manual; SME Handbook §16; Shigley §8",
      friction_table: { ...FRICTION_TABLE },
      standard_parallels: [...STANDARD_PARALLEL_HEIGHTS_MM],
    };
  }

  private validate(i: MillViseJawInput): void {
    if (!i || typeof i !== "object") throw new TypeError("MillViseJawSetupEngine.compute: input required");
    if (!(i.part_grip_dim_mm > 0)) throw new TypeError("part_grip_dim_mm must be > 0");
    if (!(i.part_grip_tol_mm >= 0)) throw new TypeError("part_grip_tol_mm must be >= 0");
    if (!(i.part_height_mm > 0)) throw new TypeError("part_height_mm must be > 0");
    if (!(i.clamp_force_kn > 0)) throw new TypeError("clamp_force_kn must be > 0");
    if (!(i.peak_cut_force_horizontal_n >= 0)) throw new TypeError("peak_cut_force_horizontal_n must be >= 0");
    if (!FRICTION_TABLE[i.jaw_material]) throw new TypeError(`Unknown jaw_material: ${String(i.jaw_material)}`);
  }
}

export const millViseJawSetupEngine = new MillViseJawSetupEngineImpl();
export type { MillViseJawSetupEngineImpl };
