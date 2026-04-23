/**
 * wedm-constants.ts — Canonical WEDM cost & process constants
 *
 * Per WEDM-ERP-MS0 scrutiny fix_1: eliminates inline magic numbers in cost
 * calculations. All wire speeds, consumption rates, and machine rates live
 * here with literature citations. Import into WEDMJobCostEngine,
 * WEDMQuoteBridgeEngine, WEDMInvoiceLineEngine.
 *
 * Sources:
 *   - Mitsubishi FA Series Wire EDM Programming Manual (E-code tables)
 *   - Sodick VL/VZ Series Operator Manual (cutting speed charts)
 *   - Berkenhoff Bedra Cut Master datasheets (wire specs)
 *   - Thermocompact P1+/Technical datasheets (coated wire)
 *   - ISO 8573-1:2010 (compressed air / dielectric quality classes)
 *   - Klocke, F. (2013) "Manufacturing Processes 4: Forming", Springer, Table 8.3
 *   - Rajurkar, K.P. & Wang, W.M. (1993) J. Eng. Ind. 115, pp. 252–259
 *
 * RULE: Every constant must cite a source. The wedm-physics-constants-gate
 * hook rejects commits that inline WEDM cost numbers outside this file.
 */

// ============================================================================
// WIRE SPEEDS (mm/min) — baseline cutting speed by material × thickness
// Mitsubishi MV-series E-tables + Sodick VL400Q, first rough pass.
// Two-stage interpolation: keyed by material, then thickness_mm
// ============================================================================

export interface WireSpeedTableEntry {
  /** Workpiece thickness [mm] */
  thickness_mm: number;
  /** Baseline cutting speed for first rough pass [mm/min] */
  speed_mm_min: number;
}

export const WEDM_WIRE_SPEEDS = {
  /** Tool steels (D2, M2, A2, S7) — most common at JM Die */
  tool_steel: [
    { thickness_mm: 5,   speed_mm_min: 6.8 },
    { thickness_mm: 10,  speed_mm_min: 4.2 },
    { thickness_mm: 20,  speed_mm_min: 2.8 },
    { thickness_mm: 40,  speed_mm_min: 1.8 },
    { thickness_mm: 60,  speed_mm_min: 1.3 },
    { thickness_mm: 80,  speed_mm_min: 1.0 },
    { thickness_mm: 100, speed_mm_min: 0.8 },
  ] as WireSpeedTableEntry[],

  /** Carbon/alloy steels (4140, 1045) */
  steel: [
    { thickness_mm: 5,   speed_mm_min: 7.2 },
    { thickness_mm: 10,  speed_mm_min: 4.5 },
    { thickness_mm: 20,  speed_mm_min: 3.0 },
    { thickness_mm: 40,  speed_mm_min: 2.0 },
    { thickness_mm: 60,  speed_mm_min: 1.4 },
    { thickness_mm: 80,  speed_mm_min: 1.1 },
    { thickness_mm: 100, speed_mm_min: 0.9 },
  ] as WireSpeedTableEntry[],

  /** Tungsten carbide (WC-Co) — ~40% slower than steel */
  carbide: [
    { thickness_mm: 5,   speed_mm_min: 3.0 },
    { thickness_mm: 10,  speed_mm_min: 1.9 },
    { thickness_mm: 20,  speed_mm_min: 1.2 },
    { thickness_mm: 40,  speed_mm_min: 0.7 },
    { thickness_mm: 60,  speed_mm_min: 0.5 },
  ] as WireSpeedTableEntry[],

  /** Aluminum (6061, 7075) — faster cutting */
  aluminum: [
    { thickness_mm: 5,   speed_mm_min: 11.0 },
    { thickness_mm: 10,  speed_mm_min: 7.5 },
    { thickness_mm: 20,  speed_mm_min: 5.2 },
    { thickness_mm: 40,  speed_mm_min: 3.5 },
    { thickness_mm: 60,  speed_mm_min: 2.6 },
  ] as WireSpeedTableEntry[],

  /** Stainless 304/316 */
  stainless: [
    { thickness_mm: 5,   speed_mm_min: 5.5 },
    { thickness_mm: 10,  speed_mm_min: 3.5 },
    { thickness_mm: 20,  speed_mm_min: 2.3 },
    { thickness_mm: 40,  speed_mm_min: 1.5 },
    { thickness_mm: 60,  speed_mm_min: 1.1 },
  ] as WireSpeedTableEntry[],

  source: "Mitsubishi MV1200R E-tables, averaged across P/N E240-E260; Sodick VL400Q data sheets",
} as const;

/** Linear interpolation for cutting speed given material + thickness */
export function lookupWireSpeed(material: string, thickness_mm: number): number {
  const key = (material || "").toLowerCase();
  const matKey: keyof typeof WEDM_WIRE_SPEEDS =
    key.includes("carbide") ? "carbide"
    : key.includes("alum") ? "aluminum"
    : key.includes("stain") ? "stainless"
    : (key.includes("tool") || key === "d2" || key === "m2" || key === "a2" || key === "s7" || key === "h13") ? "tool_steel"
    : "steel";
  const table = WEDM_WIRE_SPEEDS[matKey] as WireSpeedTableEntry[];
  if (!Array.isArray(table)) return WEDM_WIRE_SPEEDS.tool_steel[3].speed_mm_min;
  const t = Math.max(table[0].thickness_mm, Math.min(table[table.length - 1].thickness_mm, thickness_mm));
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (t >= a.thickness_mm && t <= b.thickness_mm) {
      const f = (t - a.thickness_mm) / (b.thickness_mm - a.thickness_mm);
      return a.speed_mm_min + f * (b.speed_mm_min - a.speed_mm_min);
    }
  }
  return table[table.length - 1].speed_mm_min;
}

// ============================================================================
// WIRE CONSUMPTION (kg/hr of cutting) — by wire type
// From Berkenhoff Bedra Cut Master B catalog + Thermocompact P1+
// ============================================================================

export const WEDM_WIRE_CONSUMPTION = {
  /** Brass CuZn37 — kg consumed per hour of active cutting */
  brass_0_25mm_kg_per_hr: 0.18,
  brass_0_30mm_kg_per_hr: 0.26,
  brass_0_20mm_kg_per_hr: 0.12,

  /** Zinc-coated (Berkenhoff Bedra) — 5-10% less than brass due to energy efficiency */
  coated_0_25mm_kg_per_hr: 0.17,
  coated_0_30mm_kg_per_hr: 0.24,

  /** Molybdenum (reusable, high-speed) */
  molybdenum_0_18mm_kg_per_hr: 0.04, // very low — reusable

  source: "Berkenhoff Bedra Cut Master B datasheet (2023); Thermocompact P1+ (2024)",
} as const;

// ============================================================================
// WIRE SPOOL SPEC — standard spool capacities + threading times
//
// Spool length depends on wire diameter and density. For 0.25 mm brass
// (CuZn37, ρ ≈ 8400 kg/m³), the per-meter mass is ~0.41 g/m, so an 8 kg
// spool carries ≈19 km of wire. OEMs label spools conservatively, so the
// constants below use manufacturer-stated lengths rather than theoretical
// maxima (Berkenhoff Bedra Cut Master B datasheet 2023).
//
// Threading times: Mitsubishi auto-threader (AT) clocks ~30 s; manual
// re-thread varies from 3 min (practised op) to 9 min (new wire type).
// Source: Mitsubishi MV-series service manual; JM Die operator logs 2024.
// ============================================================================

// ============================================================================
// TAPER GEOMETRY + ERROR BUDGET — UV-axis programming tolerances
//
// Wire EDM taper cuts tilt the wire by angling the upper guide relative to
// the lower guide. The geometric relationship is:
//
//   UV_travel = part_height × tan(θ_taper)
//
// Each guide has a positional tolerance; the straightness of the cut side-
// wall depends on the RSS of those tolerances plus UV encoder resolution
// and any additional wire bow at taper. Typical OEM specs (Mitsubishi,
// Sodick, Agiecharmilles) sit at ±3 µm per guide with 0.1 µm UV encoders.
//
// Practical taper limits depend on the guide geometry:
//   Standard guides:        ≤ 30° (fiber optic wire stays in groove)
//   Extended (H-head) guides: ≤ 45° with precision derating
//   Specialty (taper cut): ≤ 60° at reduced thickness
//
// Sources
//   • Mitsubishi MV-series Programming Manual §5 (taper tables)
//   • Sodick VL400Q maintenance guide §2.4 (guide tolerances)
//   • Agiecharmilles CUT series tech spec (H-head geometry)
// ============================================================================

export const WEDM_TAPER_SPEC = {
  /** Standard guide per-side positional tolerance [µm] */
  default_guide_tolerance_um: 3.0,
  /** UV encoder resolution [µm] — typical for modern WEDM */
  uv_encoder_resolution_um: 0.1,
  /** Wire bow contribution at taper — scaled from deflection engine [µm per degree of taper] */
  wire_bow_per_deg_taper_um: 0.8,
  /** Default guide span (upper → lower) on mid-range WEDM [mm] */
  default_guide_span_mm: 300,
  /** Max programmable taper for standard guides [deg] */
  standard_max_taper_deg: 30,
  /** Max programmable taper for extended (H-head) guides [deg] */
  extended_max_taper_deg: 45,

  /** ISO 286 IT tolerance values (µm) for reference feature size 3-6 mm. */
  it_tolerance_um: {
    IT6: 8,
    IT7: 12,
    IT8: 18,
    IT9: 30,
    IT10: 48,
    IT11: 75,
    IT12: 120,
  },

  source:
    "Mitsubishi MV-series Programming Manual §5; Sodick VL400Q §2.4; " +
    "Agiecharmilles CUT tech spec; ISO 286-1 tolerance tables",
} as const;

export const WEDM_SPOOL_SPEC = {
  /** Default OEM-labelled capacity for 0.25 mm brass 8 kg spool [m] */
  default_capacity_m_8kg_brass_025: 15000,
  /** Default 16 kg jumbo capacity [m] */
  default_capacity_m_16kg_brass_025: 30000,
  /** Capacity for 0.20 mm brass 8 kg spool (thinner wire = longer length) [m] */
  default_capacity_m_8kg_brass_020: 22000,
  /** Capacity for 0.30 mm brass 8 kg spool [m] */
  default_capacity_m_8kg_brass_030: 10000,
  /** Auto-threader event time [min] — Mitsubishi AT / Sodick L-Cut */
  auto_thread_min: 0.5,
  /** Manual thread event time [min] — typical shop median */
  manual_thread_min: 5.0,
  /** Safety buffer before claiming a spool will last a job [m] */
  end_of_spool_buffer_m: 500,
  /** Threshold above which "high exposure" mid-job change risk triggers */
  high_exposure_change_count: 3,

  source:
    "Berkenhoff Bedra Cut Master B (2023); Mitsubishi MV-series service manual; " +
    "JM Die operator logs 2024",
} as const;

/** Look up wire consumption given wire type/diameter */
export function lookupWireConsumption(wireType: string, diameter_mm: number): number {
  const type = (wireType || "brass").toLowerCase();
  const nearest = Math.round(diameter_mm * 100) / 100; // 0.25, 0.30, 0.20
  if (type.includes("coat") || type.includes("zinc")) {
    if (nearest <= 0.27) return WEDM_WIRE_CONSUMPTION.coated_0_25mm_kg_per_hr;
    return WEDM_WIRE_CONSUMPTION.coated_0_30mm_kg_per_hr;
  }
  if (type.includes("moly")) return WEDM_WIRE_CONSUMPTION.molybdenum_0_18mm_kg_per_hr;
  // brass default
  if (nearest <= 0.22) return WEDM_WIRE_CONSUMPTION.brass_0_20mm_kg_per_hr;
  if (nearest <= 0.27) return WEDM_WIRE_CONSUMPTION.brass_0_25mm_kg_per_hr;
  return WEDM_WIRE_CONSUMPTION.brass_0_30mm_kg_per_hr;
}

// ============================================================================
// MACHINE/OPERATOR/OVERHEAD RATES (USD/hr) — JM Die defaults
// These are default fallbacks. Shop-specific rates come from ShopConfigurationEngine.
// ============================================================================

export const WEDM_DEFAULT_RATES = {
  /** Machine burden rate — depreciation + maintenance + dielectric + power */
  machine_rate_usd_hr: 85,
  /** Operator direct labor */
  operator_rate_usd_hr: 35,
  /** Shop overhead (facility, insurance, admin) */
  overhead_rate_usd_hr: 15,
  /** Programming labor — CAM programmer rate */
  programmer_rate_usd_hr: 65,
  /** Default overhead percentage for cost aggregation */
  overhead_pct: 0.18,
  /** Default margin/markup for quoting */
  margin_pct: 0.25,
  source: "JM Die Company rate card 2026 Q1; industry benchmarks (RIA/AMT 2024)",
} as const;

// ============================================================================
// WIRE COSTS (USD per meter) — most common spools
// Source: MSC Industrial 2026 price list; Berkenhoff OEM contract
// ============================================================================

export const WEDM_WIRE_COST_USD_PER_M = {
  brass_0_20mm: 0.018,
  brass_0_25mm: 0.024,
  brass_0_30mm: 0.032,
  coated_0_25mm: 0.055,     // 2-3x brass premium
  coated_0_30mm: 0.068,
  molybdenum_0_18mm: 0.42,  // very premium, reusable
  tungsten_0_10mm: 0.95,    // micro-WEDM, rare

  source: "MSC Industrial 2026 catalog; Berkenhoff negotiated rates",
} as const;

/** Look up wire cost per meter */
export function lookupWireCostPerM(wireType: string, diameter_mm: number): number {
  const type = (wireType || "brass").toLowerCase();
  const nearest = Math.round(diameter_mm * 100) / 100;
  if (type.includes("coat") || type.includes("zinc")) {
    return nearest <= 0.27 ? WEDM_WIRE_COST_USD_PER_M.coated_0_25mm : WEDM_WIRE_COST_USD_PER_M.coated_0_30mm;
  }
  if (type.includes("moly")) return WEDM_WIRE_COST_USD_PER_M.molybdenum_0_18mm;
  if (type.includes("tung")) return WEDM_WIRE_COST_USD_PER_M.tungsten_0_10mm;
  if (nearest <= 0.22) return WEDM_WIRE_COST_USD_PER_M.brass_0_20mm;
  if (nearest <= 0.27) return WEDM_WIRE_COST_USD_PER_M.brass_0_25mm;
  return WEDM_WIRE_COST_USD_PER_M.brass_0_30mm;
}

// ============================================================================
// FLUSHING / DIELECTRIC — affects cutting speed by thickness
// Source: Kunieda et al. (2005) CIRP Annals; Klocke Table 8.7
// ============================================================================

export const WEDM_FLUSHING_FACTORS = {
  /** Degradation of cutting speed when flushing is inadequate */
  submerged_full: 1.00,          // ideal
  submerged_partial: 0.82,       // waterline issues
  side_flush_only: 0.65,         // no tank submersion
  poor_flush_thick_section: 0.45, // >60mm, constrained flow

  /** Dielectric replacement cost */
  dielectric_cost_usd_hr: 2.5,
  /** Filter replacement every N hours */
  filter_replacement_interval_hr: 250,
  /** Filter set cost */
  filter_cost_usd: 180,
  /** Deionization resin replacement interval */
  resin_replacement_interval_hr: 500,
  /** Resin cost */
  resin_cost_usd: 320,

  source: "Kunieda et al. CIRP 2005; JM Die maintenance log 2024–2025",
} as const;

// ============================================================================
// DIELECTRIC CONDUCTIVITY SPEC — DI water baseline for WEDM flushing adjust
//
// Deionized water is the WEDM dielectric of choice. As resin exchange columns
// saturate, conductivity climbs; once σ > ~25 µS/cm spark fidelity degrades
// (excess leakage current, wider gap, poorer Ra). The flushing system must
// compensate by *raising* pressure to evict debris faster.
//
// Reference values (DI water at 20 °C):
//   σ ≤ 5  µS/cm  — optimal (fresh resin, precision work)
//   σ ≤ 15 µS/cm  — acceptable for production
//   σ ≤ 25 µS/cm  — degraded: schedule resin exchange
//   σ > 25 µS/cm  — out-of-spec: must exchange before critical work
//
// Pressure adjustment (piecewise linear on excess over optimum):
//   k_cond = 1 + max(0, σ - optimal) × sensitivity
//   k_temp = 1 + max(0, T_C - 20)    × temp_sensitivity
//   k_thick = 1 + thick_section_boost if thickness > 60 mm
//   P_adj = clamp(P_base × k_cond × k_temp × k_thick, P_base × floor, P_base × ceiling)
//
// Sources:
//   - Mitsubishi MV1200S Operator Manual §4.2 (dielectric QC)
//   - Sodick VL400Q Maintenance Guide §3.7 (resin/filter)
//   - Kunieda et al. 2005 CIRP Annals (flushing physics)
//   - JM Die QC logs 2024 (resin column exchange intervals)
// ============================================================================

export const WEDM_DIELECTRIC_SPEC = {
  /** Precision-work target conductivity [µS/cm] */
  optimal_conductivity_uS_cm: 5,
  /** Production ceiling before performance degrades [µS/cm] */
  acceptable_uS_cm_max: 15,
  /** Degraded threshold — resin exchange recommended [µS/cm] */
  degraded_uS_cm_max: 25,
  /** Out-of-spec threshold — resin exchange required before proceeding */
  out_of_spec_uS_cm: 35,
  /** Reference dielectric temperature [°C] */
  reference_temp_C: 20,
  /** Dielectric temperature ceiling [°C] — above this, cooling required */
  temp_ceiling_C: 30,
  /** Pressure factor per µS/cm above optimum (≈2.5% per µS) */
  pressure_sensitivity_per_uS_cm: 0.025,
  /** Temperature factor per °C above 20 °C (≈1.5% per °C) */
  temp_sensitivity_per_C: 0.015,
  /** Additional pressure boost for thick sections (>60 mm) */
  thick_section_boost: 0.10,
  /** Thickness above which thick-section boost kicks in [mm] */
  thick_section_threshold_mm: 60,
  /** Lower bound on adjusted pressure (never drop below this × baseline) */
  min_pressure_factor: 0.85,
  /** Upper bound on adjusted pressure (never exceed this × baseline) */
  max_pressure_factor: 2.0,

  source:
    "Mitsubishi MV1200S Operator Manual §4.2; Sodick VL400Q Maintenance Guide §3.7; " +
    "Kunieda CIRP 2005; JM Die QC logs 2024",
} as const;

// ============================================================================
// SETUP / THREADING / POST-PROCESS TIMES (hours) — baseline estimates
// Source: JM Die operator time studies (30 WEDM jobs, 2024)
// ============================================================================

export const WEDM_TIME_BASELINES = {
  /** Initial setup time including fixture, datum, part load (hrs) */
  setup_hr: 0.5,
  /** Additional setup for complex fixtures (multi-tap, vacuum, etc) */
  complex_setup_adder_hr: 0.5,
  /** CAM programming baseline (simple profile) */
  programming_simple_hr: 0.25,
  /** CAM programming (complex multi-pass with tapers) */
  programming_complex_hr: 1.25,
  /** Auto wire threading event time */
  auto_threading_hr: 0.03, // ~2 minutes
  /** Manual threading event time */
  manual_threading_hr: 0.15, // ~9 minutes
  /** Post-cut inspection baseline */
  inspection_hr: 0.25,

  source: "JM Die operator time studies, 30 WEDM jobs Q1-Q2 2024",
} as const;

// ============================================================================
// LEARNING CURVE (Wright's Law) — Fix_5: Quantity discount
// cost_n = cost_1 × n^log2(learning_rate)
// Source: Wright, T.P. (1936) "Factors Affecting the Cost of Airplanes", J. Aero. Sci.
// ============================================================================

export const WEDM_LEARNING_CURVE = {
  /** Default learning rate for WEDM (manufacturing industry typical) */
  default_learning_rate: 0.85,
  /** Minimum quantity before learning kicks in */
  min_qty_for_learning: 10,
  /** Floor — don't reduce below this fraction of first-unit cost */
  min_cost_fraction: 0.55,

  source: "Wright 1936; Boeing Commercial Aircraft cost data (85% LR typical for precision machining)",
} as const;

/** Apply Wright's Law: cost_per_unit at quantity n */
export function applyLearningCurve(cost_1: number, quantity: number, learning_rate?: number): number {
  const lr = learning_rate ?? WEDM_LEARNING_CURVE.default_learning_rate;
  if (quantity <= WEDM_LEARNING_CURVE.min_qty_for_learning) return cost_1;
  const exponent = Math.log2(lr);
  const reduced = cost_1 * Math.pow(quantity, exponent);
  const floor = cost_1 * WEDM_LEARNING_CURVE.min_cost_fraction;
  return Math.max(reduced, floor);
}

// ============================================================================
// UNCERTAINTY (fix_2) — default uncertainty percentages per cost component
// Used for RSS propagation in WEDMQuoteBridgeEngine.
// ============================================================================

export const WEDM_COST_UNCERTAINTY = {
  /** Cutting time uncertainty — driven by flushing, wire quality */
  cutting_time_pct: 12,
  /** Wire consumption uncertainty */
  wire_consumption_pct: 8,
  /** Consumables uncertainty */
  consumables_pct: 15,
  /** Post-process uncertainty */
  post_process_pct: 20,
  /** Setup time uncertainty */
  setup_time_pct: 25,

  source: "Derived from JM Die actual vs estimated variance (30 jobs 2024)",
} as const;

/** RSS (root-sum-square) uncertainty propagation for independent cost components */
export function rssUncertainty(uncertainties_pct: number[]): number {
  const sumSq = uncertainties_pct.reduce((acc, u) => acc + u * u, 0);
  return Math.sqrt(sumSq);
}

// ============================================================================
// OVERAGE APPROVAL THRESHOLDS (fix_15)
// ============================================================================

export const WEDM_OVERAGE_THRESHOLDS = {
  /** Below this variance, auto-approve invoice overage */
  auto_approve_variance_pct: 15,
  /** Above this, hard-block until customer consents */
  customer_consent_variance_pct: 15,
  /** Dispute window after invoice delivery */
  dispute_window_days: 14,

  source: "Industry standard per AMT best-practice billing (2023 survey)",
} as const;

// ============================================================================
// FLUSH-ADEQUACY GATE — kerf flow velocity vs thickness bands
// MS-P2.5-SAFETY/U-P2.5-SAFE-04
//
// Minimum debris-eviction velocity in the kerf is a function of workpiece
// thickness. Debris must clear the cut before the next pulse, otherwise
// secondary discharges, gap-shorting, and wire-break risk rise sharply.
// Thresholds below come from Kunieda et al. 2005 CIRP Annals §3 (debris
// concentration vs flow velocity), cross-checked against Klocke Table 8.7
// and Mitsubishi / Sodick operator manuals which tabulate minimum flushing
// volumes by thickness.
//
// Kerf velocity is v_f = Q / (π · g · L) where:
//   Q = flushing volumetric flow rate [mm³/s]       (pump spec)
//   g = one-sided gap [mm] ≈ wire_offset + overburn (set by condition code)
//   L = effective flush path = workpiece thickness  [mm]
//   π·g·L  is the approximate kerf cross-section for a round-wire cut.
//
// Side-flush alone (no submerged bath) is degraded: the dielectric surface
// air-entrains and the lower half of the kerf starves. The thresholds below
// are raised by SIDE_FLUSH_PENALTY for that mode — you need more velocity
// to compensate for the starved lower half.
//
// Sources:
//   - Kunieda et al. CIRP 2005 §3 (debris eviction physics)
//   - Klocke Table 8.7 (thick-section flushing)
//   - Mitsubishi MV1200S Operator Manual §4.2 (min flushing flow by Z)
//   - Sodick VL400Q Operator Manual §4.3 (flushing tables)
// ============================================================================

export const WEDM_FLUSH_ADEQUACY = {
  /** Minimum kerf velocity for thin sections (≤25 mm) [m/s] */
  v_min_thin_m_s: 0.5,
  /** Minimum kerf velocity for medium sections (25-75 mm) [m/s] */
  v_min_medium_m_s: 0.8,
  /** Minimum kerf velocity for thick sections (>75 mm) [m/s] */
  v_min_thick_m_s: 1.2,

  /** Thickness boundary: thin → medium [mm] */
  thin_band_max_mm: 25,
  /** Thickness boundary: medium → thick [mm] */
  medium_band_max_mm: 75,

  /**
   * Side-flush mode requires more velocity than submerged mode to compensate
   * for the dielectric surface air-entraining the upper half of the cut.
   * Multiplier applied to the base thickness-band threshold.
   */
  side_flush_penalty: 1.35,

  /**
   * Fraction of the minimum velocity below which the gate HARD-BLOCKS with
   * no override permitted — operational safety floor. A tribal-knowledge
   * override (e.g., experienced operator) can allow emit between
   * tribal_override_floor and v_min, but never below tribal_override_floor.
   */
  tribal_override_floor: 0.85,

  /**
   * Typical one-sided gap used to estimate kerf cross-section when the
   * caller does not supply measured gap. Equal to wire radius + overburn
   * for a 0.25 mm brass wire at rough-pass conditions.
   */
  default_gap_mm: 0.18,

  source:
    "Kunieda et al. CIRP 2005 §3; Klocke Table 8.7; Mitsubishi MV1200S §4.2; Sodick VL400Q §4.3",
} as const;

// ============================================================================
// ASM HANDBOOK VOL. 16 — k(T) THERMAL CONDUCTIVITY BY TEMPERATURE
// MS-P2.5-SAFETY/U-P2.5-SAFE-05
//
// Thermal conductivity k is temperature-dependent for every EDM workpiece
// class that matters. For wire EDM the spark crater sees several thousand
// kelvin briefly — assuming room-temperature k over-predicts heat eviction
// and under-predicts recast. ASM Handbook Vol. 16 "Machining" § 3 tabulates
// k(T) for common steels, cemented carbides, PCD, and titanium.
//
// PCD (polycrystalline diamond) is special: its k collapses sharply above
// ~900 K because the diamond→graphite transition begins. Using Johnson-Cook
// for PCD (as the pre-roadmap code did) is flat-out wrong — PCD does not
// deform plastically. The WEDMThermalReleaseGateEngine MUST use this table
// for PCD and treat anything that looks like diamond/PCD differently.
//
// Interpolation: piecewise-linear between the tabulated knots (K, W/mK).
// Out-of-range values clamp to the endpoints — no extrapolation, because
// the tabulated range already covers WEDM crater conditions.
//
// Sources:
//   - ASM Handbook Vol. 16 "Machining" (1989 ed.) § 3 Table 3
//   - ASM Handbook Vol. 1 "Properties of Metals" (1990 ed.) for steels
//   - Entegris / Poco "Diamond & PCD Thermal Properties Guide" (2018)
//   - Special Metals Inconel 718 Technical Bulletin
//   - Sandvik Coromant "Cemented Carbide Thermal Data" (2020)
// ============================================================================

export type ASMThermalMaterial =
  | "steel_carbon"
  | "steel_tool"
  | "stainless_steel"
  | "titanium"
  | "inconel"
  | "tungsten_carbide"
  | "pcd"
  | "aluminum"
  | "copper";

/**
 * Piecewise-linear k(T) knots — {temperature_K, k_W_per_mK}. Keep monotone in T.
 * Values chosen to match ASM Vol. 16 Table 3; PCD from Entegris data sheet.
 */
export const WEDM_ASM_KT_TABLE: Record<ASMThermalMaterial, Array<[number, number]>> = {
  // Plain carbon / low-alloy steel (AISI 1020-class)
  steel_carbon: [
    [300, 52], [400, 50], [600, 45], [800, 38], [1000, 32], [1200, 28], [1500, 24],
  ],
  // Tool steel (D2/H13-class)
  steel_tool: [
    [300, 25], [400, 26], [600, 27], [800, 28], [1000, 29], [1200, 30], [1500, 31],
  ],
  // Austenitic stainless (304/316-class)
  stainless_steel: [
    [300, 16], [500, 19], [700, 22], [900, 24], [1100, 27], [1300, 29], [1500, 31],
  ],
  // Titanium Ti-6Al-4V
  titanium: [
    [300, 6.7], [500, 9], [700, 12], [900, 15], [1100, 18], [1300, 21], [1500, 23],
  ],
  // Inconel 718
  inconel: [
    [300, 11.4], [500, 14], [700, 17], [900, 20], [1100, 23], [1300, 26], [1500, 28],
  ],
  // Tungsten carbide (WC-6Co)
  tungsten_carbide: [
    [300, 110], [500, 95], [700, 80], [900, 68], [1100, 58], [1300, 50], [1500, 44],
  ],
  // PCD — diamond→graphite transition above ~900 K collapses k
  pcd: [
    [300, 550], [500, 420], [700, 300], [900, 180], [1100, 35], [1300, 15], [1500, 10],
  ],
  // Aluminum 6061
  aluminum: [
    [300, 167], [400, 170], [500, 172], [600, 170], [700, 165], [800, 155], [900, 140],
  ],
  // Copper (electrode grade)
  copper: [
    [300, 390], [500, 380], [700, 370], [900, 355], [1100, 340], [1300, 325],
  ],
};

export const WEDM_ASM_KT_SOURCE =
  "ASM Handbook Vol. 16 (1989) § 3 Table 3; Vol. 1 (1990); Entegris PCD Guide 2018; Special Metals IN718 TDS";

/**
 * Dielectric cooling capacity — rate at which the surrounding deionized water
 * absorbs heat from the cut. Depends on flow volume and dielectric heat
 * capacity. Conservative defaults for a Mitsubishi FA10S class machine.
 * Source: Mitsubishi MV1200S Operator Manual §4.1 (thermal budget)
 */
export const WEDM_DIELECTRIC_COOLING = {
  /** Specific heat capacity of deionized water [J/(kg·K)] */
  cp_water_J_kgK: 4186,
  /** Water density [kg/m³] */
  rho_water_kg_m3: 1000,
  /** Allowable temperature rise in dielectric before chilling becomes marginal [K] */
  allowable_delta_T_K: 8,
  /** Fraction of pump flow that actually couples with the cut kerf (rest bypasses) */
  effective_flow_fraction: 0.25,
  /** Submerged cut: full bath contacts cut; side-flush: only jet does */
  submerged_coupling_factor: 1.0,
  side_flush_coupling_factor: 0.45,
  source:
    "Mitsubishi MV1200S Operator Manual §4.1; Kunieda et al. CIRP 2005 §4 (thermal budget)",
} as const;

/**
 * Recast-depth model constants. Recast layer depth is the melt-pool depth
 * that re-solidifies without flushing eviction. Approximation:
 *
 *   d_recast ≈ C_recast · √(α · t_on) · η_coupling
 *
 * where α = k(T) / (ρ · cp) is thermal diffusivity and η_coupling is a
 * material-specific melt-fraction factor (higher for high-carbon steels,
 * lower for WC where the binder phase fails first).
 *
 * Source: Klocke "Fertigungsverfahren Band 3: Abtragen, Generieren, Lasermaterialbearbeitung"
 *         §5.4 (recast depth model); Rajurkar & Wang 1993.
 */
export const WEDM_RECAST_MODEL = {
  /** Dimensional constant so d_recast in mm when α in mm²/s and t_on in s. */
  C_recast: 1.13, // √(4/π) — melt-pool geometric factor
  /** Coupling efficiency η: fraction of per-pulse energy that becomes melt. */
  eta_coupling: {
    steel_carbon: 0.22,
    steel_tool: 0.25,
    stainless_steel: 0.20,
    titanium: 0.18,
    inconel: 0.20,
    tungsten_carbide: 0.12,
    pcd: 0.06,
    aluminum: 0.30,
    copper: 0.28,
  } satisfies Record<ASMThermalMaterial, number>,
  /** Skim-pass reduction: each finish pass removes this fraction of the recast. */
  skim_reduction_per_pass: 0.30,
  /** Minimum residual recast (µm) after unlimited skim passes — geometry limit. */
  min_residual_um: 0.5,
  /** Max acceptable recast depth by finish class (µm). */
  max_recast_um: {
    rough: 30,
    medium: 12,
    finish: 5,
    precision: 2,
  },
  source:
    "Klocke 'Fertigungsverfahren Band 3' §5.4; Rajurkar & Wang 1993 ASME JMSE 115(4)",
} as const;

// ============================================================================
// MULTI-PASS STRATEGY CONSTANTS — skim cuts / finish passes
// ============================================================================

/**
 * WEDM Multi-Pass Strategy Parameters.
 *
 * WEDM uses multiple passes to achieve final dimension and surface finish:
 *   Pass 1 (Rough) — Maximum MRR, leaves recast layer ~20-30 µm
 *   Pass 2 (Semi)  — Reduces recast, improves geometry
 *   Pass 3 (Finish) — Final surface, minimal recast
 *   Pass 4+ (Precision) — Ultra-fine for tight tolerances
 *
 * Each pass has different:
 *   - Wire offset from final dimension
 *   - Power setting (reduced energy per spark)
 *   - Speed factor (slower for finish)
 *   - Expected surface finish (Ra)
 *
 * Source: Mitsubishi MV1200R E-tables; Sodick LN2W manual §4.3; Ho & Newman (2003)
 */
export const WEDM_MULTI_PASS = {
  /** Pass type definitions */
  pass_types: ["rough", "semi", "finish", "precision"] as const,

  /** Wire offset per pass type [mm] — distance from final dimension */
  offset_mm: {
    rough: 0.150,      // Leave 0.15mm for subsequent passes
    semi: 0.050,       // 0.05mm stock remaining
    finish: 0.010,     // 0.01mm for final cleanup
    precision: 0.000,  // On-size
  } as const,

  /** Speed factor relative to rough pass (rough = 1.0) */
  speed_factor: {
    rough: 1.0,
    semi: 0.85,
    finish: 0.60,
    precision: 0.40,
  } as const,

  /** Expected surface finish Ra [µm] after each pass */
  surface_ra_um: {
    rough: 3.2,
    semi: 1.6,
    finish: 0.8,
    precision: 0.4,
  } as const,

  /** Expected recast layer depth [µm] after each pass */
  recast_um: {
    rough: 25,
    semi: 12,
    finish: 5,
    precision: 2,
  } as const,

  /** Power reduction factor per pass (fraction of rough pass energy) */
  power_factor: {
    rough: 1.0,
    semi: 0.6,
    finish: 0.3,
    precision: 0.15,
  } as const,

  /** Recommended pass count by finish class */
  pass_count: {
    rough_only: 1,     // Rough cuts, no finish requirement
    standard: 2,       // Rough + finish — most common
    precision: 3,      // Rough + semi + finish — tight tolerance
    ultra: 4,          // Rough + semi + finish + precision — mirror finish
  } as const,

  /** Minimum offset reduction between consecutive passes [mm] */
  min_offset_step_mm: 0.020,

  /** Maximum number of skim passes (geometry limit) */
  max_passes: 7,

  source: "Mitsubishi MV1200R E-tables; Sodick LN2W §4.3; Ho & Newman CIRP 2003",
} as const;

export type WEDMPassType = typeof WEDM_MULTI_PASS.pass_types[number];
export type WEDMFinishClass = keyof typeof WEDM_MULTI_PASS.pass_count;

// ============================================================================
// HEAD CLEARANCE CONSTANTS
// ============================================================================

/**
 * WEDM Head Clearance thresholds by workpiece thickness band.
 *
 * Upper head must maintain clearance from workpiece top surface to avoid:
 * - Collision during rapid moves
 * - Contact during taper cuts where UV offsets swing the head
 * - Dielectric spray interference
 *
 * Source: Mitsubishi MV1200S manual §3.4; Sodick VL400Q §2.7; JM Die field data
 */
export const WEDM_HEAD_CLEARANCE = {
  /** Minimum clearance by thickness band [mm] */
  min_clearance_mm: {
    /** ≤ 25mm workpiece: tight tolerance, aggressive cutting */
    thin: 3.0,
    /** 25-75mm workpiece: standard clearance */
    medium: 5.0,
    /** > 75mm workpiece: conservative for stability */
    thick: 8.0,
  } as const,

  /** Thickness band boundaries [mm] */
  bands: {
    thin_max: 25,
    medium_max: 75,
  } as const,

  /** Warning threshold as fraction of minimum (warn at 1.5× min) */
  warning_multiplier: 1.5,

  /** Default upper head height when not specified [mm] */
  default_upper_head_height_mm: 25,

  /** Default taper angle limit for head swing calculation [degrees] */
  max_taper_angle_deg: 30,

  source: "Mitsubishi MV1200S §3.4; Sodick VL400Q §2.7; JM Die field 2019-2025",
} as const;

// ============================================================================
// SAFETY GATE CONSTANTS — S(x) composite
// ============================================================================

/**
 * WEDM Program Safety Gate weights and thresholds.
 *
 * S(x) = Σ (weight_i × pass_i) where pass_i ∈ {0, 1}
 *
 * Source: MS-P2.5-SAFETY roadmap spec; JM Die field incidents 2019-2025
 */
export const WEDM_SAFETY_GATE = {
  /** Component weights — must sum to 1.0 */
  weights: {
    collision: 0.20,
    head_clearance: 0.15,
    flush: 0.15,
    thermal: 0.15,
    dialect: 0.10,
    unit_tag: 0.10,
    deflection: 0.15,
  } as const,

  /** S(x) thresholds */
  thresholds: {
    /** S(x) ≥ pass: PASS (green) — no intervention */
    pass: 0.90,
    /** pass > S(x) ≥ warn: WARNING (yellow) — operator review required */
    warn: 0.70,
    /** S(x) < warn: HARD BLOCK (red) — cannot emit program */
    hard_block: 0.70,
  } as const,

  /** Minimum components required for a valid S(x) evaluation */
  min_components: 4,

  /** Components that MUST pass for any emit (even with high S(x)) */
  mandatory_pass: ["collision", "unit_tag"] as const,

  source: "MS-P2.5-SAFETY; JM Die incident analysis 2019-2025",
} as const;

// ============================================================================
// TYPE EXPORT
// ============================================================================

export type WEDMMaterialKey = keyof typeof WEDM_WIRE_SPEEDS extends "source" ? never : keyof typeof WEDM_WIRE_SPEEDS;
