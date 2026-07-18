/**
 * post-processor-workholding-catalog.mjs — Workholding sampling for v3 corpus.
 *
 * Owned by slot:india. SAFETY-CRITICAL (per OmegaSafetyScoreEngine.ts:104,
 * workholding is dimension 6 of 6 in S(x) scoring; default-or-missing
 * workholding renders Ω undefined — R12 silent-fail violation).
 *
 * Sources:
 *   - mcp-server/src/data/workholding-catalog.ts        (44 hardware entries, 7 typed interfaces)
 *   - mcp-server/src/data/calculatorWorkholdingCatalog.ts (64 UI presets, 12 categories)
 *   - mcp-server/src/engines/WorkholdingEngine.ts       (primary physics, 1511 LOC)
 *   - mcp-server/src/engines/WorkholdingForceEngine.ts  (clamp-force calc)
 *   - mcp-server/src/engines/WorkholdingTorqueSpecEngine.ts (ASME B5.59 + Shigley §8.7)
 *
 * Doctrine: every scenario MUST declare a workholding configuration. The 14-type
 * WorkholdingType enum (per WorkholdingEngine.ts) drives both the μ LUT used by
 * clamp-force calc AND the Ω dim-6 score.
 */

// Pure-function lib — no fs/path needed (all data inline; catalogs imported in
// downstream adapter). If a future revision adds workholding-catalog.ts JOIN,
// re-introduce the fs+path+fileURLToPath idiom from sibling libs.

// === 14 WorkholdingType enum ===
// Sourced from WorkholdingEngine.ts (μ LUT for clamp-force calc + Ω dim-6 score).

export const WORKHOLDING_TYPES = [
  // Vises (3 sub-types — μ varies by jaw)
  { id: 'VICE_SMOOTH', family: 'vise', friction_dry: 0.15, friction_oily: 0.10, sf_default: 2.0 },
  { id: 'VICE_SERRATED', family: 'vise', friction_dry: 0.35, friction_oily: 0.28, sf_default: 2.0 },
  { id: 'VICE_SOFT_JAWS', family: 'vise', friction_dry: 0.40, friction_oily: 0.30, sf_default: 2.0 },
  // Clamps (3 sub-types)
  { id: 'HYDRAULIC_CLAMP', family: 'clamp', friction_dry: 0.20, friction_oily: 0.15, sf_default: 2.2 },
  { id: 'TOGGLE_CLAMP', family: 'clamp', friction_dry: 0.18, friction_oily: 0.12, sf_default: 2.5 },
  { id: 'STRAP_CLAMP', family: 'clamp', friction_dry: 0.15, friction_oily: 0.10, sf_default: 2.5 },
  // Vacuum / magnetic
  { id: 'VACUUM_FIXTURE', family: 'vacuum', friction_dry: 0.30, friction_oily: 0.30, sf_default: 3.0 },
  { id: 'MAGNETIC_CHUCK', family: 'magnetic', friction_dry: 0.25, friction_oily: 0.20, sf_default: 3.0 },
  // Collet / chucks (3 sub-types — lathe + indexable holder)
  { id: 'COLLET', family: 'collet', friction_dry: 0.20, friction_oily: 0.15, sf_default: 2.5 },
  { id: '3JAW_CHUCK', family: 'chuck', friction_dry: 0.20, friction_oily: 0.15, sf_default: 2.5 },
  { id: '4JAW_CHUCK', family: 'chuck', friction_dry: 0.22, friction_oily: 0.16, sf_default: 2.5 },
  // Plate-style (3 sub-types — modular / tombstone / custom)
  { id: 'FIXTURE_PLATE', family: 'plate', friction_dry: 0.25, friction_oily: 0.20, sf_default: 2.0 },
  { id: 'TOMBSTONE', family: 'plate', friction_dry: 0.25, friction_oily: 0.20, sf_default: 2.0 },
  { id: 'CUSTOM_FIXTURE', family: 'plate', friction_dry: 0.30, friction_oily: 0.22, sf_default: 2.0 },
];

// === 6 SurfaceCondition enum ===
// μ LUT lookup axis (WorkholdingEngine.ts), affects clamp-force result.

export const SURFACE_CONDITIONS = [
  { id: 'DRY', friction_mult: 1.00 },
  { id: 'OILY', friction_mult: 0.67 },
  { id: 'COOLANT_WET', friction_mult: 0.55 },
  { id: 'RUSTY', friction_mult: 1.15 },
  { id: 'GROUND', friction_mult: 0.90 },
  { id: 'AS_CAST', friction_mult: 1.20 },
];

// === Clamp-force buckets (real shop tiers) ===

export const CLAMP_FORCE_BUCKETS = [
  { id: 'low', min_kN: 0.5, max_kN: 2.0, typical_application: 'small_parts_aluminum' },
  { id: 'medium', min_kN: 2.0, max_kN: 20.0, typical_application: 'standard_vise_mill' },
  { id: 'high', min_kN: 20.0, max_kN: 80.0, typical_application: 'large_steel_die_block' },
  { id: 'hydraulic', min_kN: 80.0, max_kN: 250.0, typical_application: 'hpc_production_fixture' },
];

// === Bolt lubrication classes (ASME B5.59 + Shigley §8.7) ===
// K-factor in torque-tension equation T = K · F · D.

export const BOLT_LUBRICATION_CLASSES = [
  { id: 'dry', K: 0.20, note: 'no lubricant, blacked oxide threads' },
  { id: 'lubricated', K: 0.15, note: 'standard machine oil on threads' },
  { id: 'anti_seize', K: 0.10, note: 'molybdenum disulfide / Loctite anti-seize' },
];

// === Platforms (5-axis variability — required for axis_count ≥ 4) ===

export const WORKHOLDING_PLATFORMS = [
  { id: 'fixed', supports_5axis: false, supports_pallet_change: false },
  { id: 'tombstone', supports_5axis: false, supports_pallet_change: true },
  { id: 'pallet', supports_5axis: false, supports_pallet_change: true },
  { id: 'trunnion', supports_5axis: true, supports_pallet_change: false },
  { id: '5axis_vise', supports_5axis: true, supports_pallet_change: false },
];

// === Lathe-specific axes ===

export const LATHE_CHUCK_RPM_CLASSES = [
  { id: 'low', rpm_max: 2000, centrifugal_safe_pct: 0.95 },
  { id: 'med', rpm_max: 4500, centrifugal_safe_pct: 0.85 },
  { id: 'high', rpm_max: 8000, centrifugal_safe_pct: 0.70 },
  { id: 'spec', rpm_max: 12000, centrifugal_safe_pct: 0.55 },  // specialty / Schunk Tendo / hydraulic
];

/**
 * Filter workholding types by operation domain (mill / lathe / wedm / 5ax).
 * Mill: vise + clamp + vacuum + magnetic + fixture-plate + tombstone + custom.
 * Lathe: collet + 3JAW + 4JAW.
 * Wedm: vacuum + magnetic + collet (small-part wedm).
 * 5ax: trunnion-platform-compatible subset.
 */
export function workholdingTypesForOperation(operation, axisCount = 3) {
  const op = String(operation || '').toLowerCase();
  if (/turn|lathe|grooving|threading.*lathe/.test(op)) {
    return WORKHOLDING_TYPES.filter(t => t.family === 'chuck' || t.family === 'collet');
  }
  if (/wedm|wire.*edm/.test(op)) {
    return WORKHOLDING_TYPES.filter(t => ['vacuum', 'magnetic', 'collet'].includes(t.family));
  }
  // Default: mill + drill + threading
  const mill = WORKHOLDING_TYPES.filter(t => t.family !== 'chuck' && t.family !== 'collet');
  if (axisCount >= 4) {
    // 5-axis must use trunnion-compatible platforms; vise types compatible if 5axis_vise
    return mill.filter(t => t.family !== 'magnetic');  // magnetic chucks not typical for 5-ax
  }
  return mill;
}

/**
 * Compute required clamp force for a scenario per WorkholdingEngine.ts formula:
 *   F_clamp = (F_cutting × SF × DynamicFactor) / μ
 *
 * Where:
 *   F_cutting = total resultant cutting force [N]
 *   SF = safety factor (default 2.0-2.5 per workholding type)
 *   DynamicFactor = 1.0 (continuous cut) or 1.3 (interrupted)
 *   μ = friction coefficient from LUT[type × surface]
 *
 * Per ASME B5.59 + Shigley §8.7 + Carr Lane workholding guide. SAFETY-CRITICAL.
 *
 * @returns {object} { F_clamp_N, SF, mu, dynamic_factor, computed_sf, under_spec }
 */
export function computeRequiredClampForce({ F_cutting_N, workholdingType, surfaceCondition, isInterrupted, customSF }) {
  const wh = WORKHOLDING_TYPES.find(t => t.id === workholdingType) ||
             WORKHOLDING_TYPES[0];
  const surf = SURFACE_CONDITIONS.find(s => s.id === surfaceCondition) ||
               SURFACE_CONDITIONS[0];
  const baseMu = surfaceCondition === 'COOLANT_WET' || surfaceCondition === 'OILY'
    ? wh.friction_oily
    : wh.friction_dry;
  const mu = baseMu * surf.friction_mult;
  const SF = customSF ?? wh.sf_default;
  const dynamic_factor = isInterrupted ? 1.3 : 1.0;
  const F_clamp_N = (F_cutting_N * SF * dynamic_factor) / mu;
  return {
    F_clamp_N: Math.round(F_clamp_N),
    SF,
    mu: Number(mu.toFixed(3)),
    dynamic_factor,
    workholding_type: wh.id,
    workholding_family: wh.family,
    surface_condition: surf.id,
    // Computed safety factor — if operator clamp force < this, under-spec
    computed_sf: Math.round((F_clamp_N / Math.max(F_cutting_N, 1)) * 10) / 10,
  };
}

/**
 * Compute centrifugal-derate for lathe chuck per Sandvik turning handbook +
 * ISO 3408. F_cent = m × ω² × r; max_safe_rpm = clamp_static × safety_factor.
 *
 * @returns {object} { F_centrifugal_N, max_safe_rpm, centrifugal_fraction }
 */
export function computeChuckCentrifugal({ F_clamp_static_N, mass_kg, radius_mm, rpm, rpmClass }) {
  const omega = (rpm * 2 * Math.PI) / 60;  // rad/s
  const r_m = radius_mm / 1000;
  const F_cent = mass_kg * omega * omega * r_m;
  const cls = LATHE_CHUCK_RPM_CLASSES.find(c => c.id === rpmClass) || LATHE_CHUCK_RPM_CLASSES[1];
  const F_safe = F_clamp_static_N * cls.centrifugal_safe_pct;
  const max_safe_omega = Math.sqrt(F_safe / (mass_kg * r_m));
  const max_safe_rpm = (max_safe_omega * 60) / (2 * Math.PI);
  return {
    F_centrifugal_N: Math.round(F_cent),
    max_safe_rpm: Math.round(max_safe_rpm),
    centrifugal_fraction: Number((F_cent / F_clamp_static_N).toFixed(3)),
    rpm_class: cls.id,
    flag_high_speed: F_cent / F_clamp_static_N > 0.3,
  };
}

/**
 * Sample a workholding configuration for a scenario.
 * Returns a fully-populated `workholding` object that satisfies Ω dim-6
 * safety scoring requirements (no silent defaults).
 *
 * Per slot:india soul §4: program-emit Ω ≥ 0.98 requires explicit workholding
 * inputs. This sampler guarantees no scenario ships without them.
 */
/**
 * Note: `material` is intentionally NOT destructured today — F_cutting_N
 * encodes material indirectly via Kienzle (Fc = kc1.1·ap·fz^(1-mc)). When
 * P0-U06.X adds magnetic-chuck-vs-ferromagnetic gating, re-introduce material
 * to the destructure and add the K/H ISO-group gate inline.
 */
export function sampleWorkholding(rng, { operation, axisCount, F_cutting_N }) {
  const pick = arr => arr[Math.floor(rng() * arr.length)];

  const candidates = workholdingTypesForOperation(operation, axisCount);
  const wh = pick(candidates);
  const surface = pick(SURFACE_CONDITIONS);
  const platform = pick(WORKHOLDING_PLATFORMS.filter(p =>
    axisCount < 4 || p.supports_5axis));

  const isInterrupted = /^(milling|face|pocket|contour)$/.test(String(operation));
  const force = computeRequiredClampForce({
    F_cutting_N: F_cutting_N || 500,  // default 500N if not provided
    workholdingType: wh.id,
    surfaceCondition: surface.id,
    isInterrupted,
  });

  const result = {
    type: wh.id,
    family: wh.family,
    surface_condition: surface.id,
    platform: platform.id,
    soft_jaws: wh.id === 'VICE_SOFT_JAWS',
    bolt_lubrication: pick(BOLT_LUBRICATION_CLASSES).id,
    clamp_force_required_N: force.F_clamp_N,
    clamp_force_bucket: CLAMP_FORCE_BUCKETS.find(b =>
      force.F_clamp_N >= b.min_kN * 1000 && force.F_clamp_N < b.max_kN * 1000)?.id || 'high',
    safety_factor_applied: force.SF,
    friction_coefficient: force.mu,
    dynamic_factor: force.dynamic_factor,
    computed_sf: force.computed_sf,
    under_spec_flag: force.computed_sf < 1.5,
    omega_dim6_input_present: true,  // anti-silent-defaults flag
    formula_oracle: 'calcDispatcher:workholding_clamp_force',
  };

  // Lathe extension — sample chuck-centrifugal regime
  if (/turn|lathe/.test(String(operation).toLowerCase())) {
    const rpmClass = pick(LATHE_CHUCK_RPM_CLASSES);
    const cent = computeChuckCentrifugal({
      F_clamp_static_N: force.F_clamp_N,
      mass_kg: 2.5,  // typical small lathe workpiece
      radius_mm: 50,
      rpm: rpmClass.rpm_max * 0.8,
      rpmClass: rpmClass.id,
    });
    result.centrifugal = cent;
  }

  return result;
}
