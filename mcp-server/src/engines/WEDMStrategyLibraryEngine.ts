/**
 * WEDMStrategyLibraryEngine — Wire EDM Cutting Strategy Library
 * =============================================================
 * Defines 15 canonical WEDM cutting strategies covering rough, skim, corner,
 * taper, flush modes, material-specific, and section-thickness variants.
 *
 * Each strategy carries:
 *   - Material suitability ratings with speed/power factors
 *   - Thickness applicability range
 *   - Typical pulse parameters (on_time, off_time, peak_current, gap_voltage, wire_tension)
 *   - Expert tips from JM Die shop floor experience
 *
 * Strategy selection AI uses a weighted scoring model:
 *   - Material match     (weight 0.35)
 *   - Thickness fit      (weight 0.25)
 *   - Ra target match    (weight 0.25)
 *   - Pass compatibility (weight 0.15)
 *
 * Physics references:
 *   - Klocke (2013) Manufacturing Processes 4, Springer, Chapter 8
 *   - Toenshoff et al. (2004) CIRP Annals 53/2 — skim energy cascade
 *   - Kunieda et al. (2005) CIRP Annals 54/2 — MRR model
 *   - Mitsubishi FA Advance Series Application Notes (FA-20S, FA-S)
 *   - JM Die Company shop floor tribal knowledge (D2/A2/S7/M2 tool steel)
 *
 * JM Die Shop context:
 *   - Machine: Mitsubishi FA-20S with M800 controller
 *   - Primary materials: D2, A2, S7, M2, H13 tool steel; WC-Co carbide
 *   - Standard wire: 0.25mm brass
 *   - Typical work: punch/die profiles, cold heading inserts
 *
 * @module engines/WEDMStrategyLibraryEngine
 * @milestone WEDM-AWARE-MS5
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type StrategyCategory =
  | "roughing"
  | "finishing"
  | "geometry"
  | "dielectric"
  | "flushing"
  | "thickness"
  | "material";

export interface MaterialSuitability {
  /** Material identifier: "steel", "tool_steel", "carbide", "stainless", "aluminum", "titanium", "inconel", "copper" */
  material_type: string;
  /** 0.0 (incompatible) → 1.0 (ideal) */
  suitability: number;
  /** Multiplier on base cutting speed (1.0 = reference) */
  speed_factor: number;
  /** Multiplier on base power level (1.0 = reference) */
  power_factor: number;
}

export interface ThicknessRange {
  /** Minimum workpiece thickness in mm */
  min_mm: number;
  /** Maximum workpiece thickness in mm */
  max_mm: number;
}

export interface TypicalParams {
  /** Pulse on-time in microseconds */
  on_time_us: number;
  /** Pulse off-time in microseconds */
  off_time_us: number;
  /** Peak current in amperes */
  peak_current_A: number;
  /** Gap voltage in volts */
  gap_voltage_V: number;
  /** Wire tension in Newtons */
  wire_tension_N: number;
}

export interface WEDMCuttingStrategy {
  /** Unique identifier (snake_case) */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the strategy purpose and use case */
  description: string;
  /** Strategy functional category */
  category: StrategyCategory;
  /** Material suitability ratings for this strategy */
  material_suitability: MaterialSuitability[];
  /** Workpiece thickness applicability range */
  thickness_range: ThicknessRange;
  /** Representative pulse/electrical parameters for this strategy */
  typical_params: TypicalParams;
  /** Expert tips from JM Die shop floor and published sources */
  tips: string[];
}

export interface StrategySelectionInput {
  /** Material identifier (e.g. "D2", "tool_steel", "carbide", "stainless") */
  material: string;
  /** Workpiece thickness in mm */
  thickness_mm: number;
  /** Target surface roughness Ra in µm */
  target_ra_um: number;
  /** Desired number of passes (1 = rough only, 2 = rough + skim1, etc.) */
  passes: number;
}

export interface StrategyRecommendation {
  /** Rank 1 = best match */
  rank: number;
  /** The recommended strategy */
  strategy: WEDMCuttingStrategy;
  /** Overall score 0.0 – 1.0 */
  score: number;
  /** Per-factor score breakdown */
  score_breakdown: {
    material_score: number;
    thickness_score: number;
    ra_score: number;
    pass_score: number;
  };
  /** Human-readable rationale */
  rationale: string;
}

// ============================================================================
// STRATEGY LIBRARY — 15 Canonical WEDM Cutting Strategies
// ============================================================================

/**
 * 15 canonical Wire EDM cutting strategies.
 * Parameters derived from Klocke (2013), Mitsubishi FA application notes,
 * and JM Die shop floor tribal knowledge.
 */
export const WEDM_CUTTING_STRATEGIES: WEDMCuttingStrategy[] = [
  // ─── ROUGHING ───────────────────────────────────────────────────────────
  {
    id: "rough_cut",
    name: "Rough Cut",
    description:
      "Main material removal pass. Maximum MRR with high power. Sets kerf and primary geometry. " +
      "Typically leaves 0.10–0.20mm stock for skim passes.",
    category: "roughing",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 1.0,  power_factor: 1.0  },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.90, power_factor: 1.0  },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.85, power_factor: 1.0  },
      { material_type: "carbide",     suitability: 0.8, speed_factor: 0.50, power_factor: 0.90 },
      { material_type: "aluminum",    suitability: 1.0, speed_factor: 1.60, power_factor: 0.85 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.70, power_factor: 0.95 },
      { material_type: "inconel",     suitability: 0.8, speed_factor: 0.60, power_factor: 1.0  },
      { material_type: "copper",      suitability: 0.9, speed_factor: 1.20, power_factor: 0.90 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 300.0 },
    typical_params: {
      on_time_us:      8.0,
      off_time_us:    24.0,
      peak_current_A: 20.0,
      gap_voltage_V:  60.0,
      wire_tension_N:  14.0,
    },
    tips: [
      "Keep duty cycle ≤ 30% (rough_cut): on_time / (on_time + off_time) per Mitsubishi FA specs",
      "Flush pressure 10–14 bar on both upper/lower nozzles during rough cut",
      "Reduce speed by 15% if wire break alarm frequency increases",
      "Use 0.25mm brass wire for stock ≤ 100mm; coated 0.25mm for stock > 100mm",
      "Rough cut offset = wire_radius + spark_gap + skim_stock (typically 0.18–0.22mm total)",
    ],
  },

  // ─── FINISHING — SKIM PASSES ────────────────────────────────────────────
  {
    id: "skim_1",
    name: "Skim 1 — First Finishing Pass",
    description:
      "First finishing pass after rough cut. Medium power, ~25% of rough energy per Toenshoff (2004). " +
      "Removes recast layer from rough, improves geometry accuracy to ±0.008mm.",
    category: "finishing",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 0.40, power_factor: 0.25 },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.35, power_factor: 0.25 },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.32, power_factor: 0.22 },
      { material_type: "carbide",     suitability: 0.9, speed_factor: 0.20, power_factor: 0.20 },
      { material_type: "aluminum",    suitability: 1.0, speed_factor: 0.55, power_factor: 0.25 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.28, power_factor: 0.22 },
      { material_type: "inconel",     suitability: 0.8, speed_factor: 0.25, power_factor: 0.22 },
      { material_type: "copper",      suitability: 0.9, speed_factor: 0.45, power_factor: 0.25 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 300.0 },
    typical_params: {
      on_time_us:      3.5,
      off_time_us:    14.0,
      peak_current_A:  8.0,
      gap_voltage_V:  45.0,
      wire_tension_N:  16.0,
    },
    tips: [
      "Skim 1 offset ≈ rough offset − 0.06mm; removes majority of recast layer",
      "Reduce flush pressure to 6–8 bar to avoid deforming thin sections",
      "Increase wire tension by 2N vs rough cut for improved straightness",
      "Expected Ra after skim_1: 0.8–1.6µm for tool steel per Klocke (2013)",
      "If part has taper, verify UV compensation is active during skim passes",
    ],
  },

  {
    id: "skim_2",
    name: "Skim 2 — Second Finishing Pass",
    description:
      "Second finishing pass. Lower power (~6% of rough energy). Removes remaining recast, " +
      "achieves Ra 0.4–0.8µm for tool steels. Offset reduced by further 0.03mm.",
    category: "finishing",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 0.25, power_factor: 0.06 },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.22, power_factor: 0.06 },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.20, power_factor: 0.05 },
      { material_type: "carbide",     suitability: 0.9, speed_factor: 0.12, power_factor: 0.05 },
      { material_type: "aluminum",    suitability: 0.9, speed_factor: 0.35, power_factor: 0.06 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.18, power_factor: 0.05 },
      { material_type: "inconel",     suitability: 0.8, speed_factor: 0.15, power_factor: 0.05 },
      { material_type: "copper",      suitability: 0.8, speed_factor: 0.30, power_factor: 0.06 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 250.0 },
    typical_params: {
      on_time_us:      1.8,
      off_time_us:    10.0,
      peak_current_A:  4.0,
      gap_voltage_V:  35.0,
      wire_tension_N:  17.0,
    },
    tips: [
      "Skim 2 offset ≈ skim_1 offset − 0.03mm; nominal 0.005–0.010mm stock removal",
      "Flush pressure 4–6 bar; too high causes vibration striae on finished surface",
      "Wire speed can be reduced 10% — lower heat input at this energy level",
      "Check for Z-axis error compensation if part height > 80mm",
      "Expected Ra after skim_2: 0.4–0.8µm for D2 tool steel",
    ],
  },

  {
    id: "skim_3",
    name: "Skim 3 — Third Finishing Pass",
    description:
      "Third finishing pass. Very low power (~1.5% of rough). Achieves Ra 0.2–0.4µm. " +
      "Used for precision dies and punch profiles requiring tight tolerance.",
    category: "finishing",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 0.15, power_factor: 0.015 },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.13, power_factor: 0.015 },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.12, power_factor: 0.013 },
      { material_type: "carbide",     suitability: 0.9, speed_factor: 0.07, power_factor: 0.012 },
      { material_type: "aluminum",    suitability: 0.7, speed_factor: 0.20, power_factor: 0.015 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.10, power_factor: 0.013 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 0.09, power_factor: 0.012 },
      { material_type: "copper",      suitability: 0.7, speed_factor: 0.18, power_factor: 0.015 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 200.0 },
    typical_params: {
      on_time_us:      0.9,
      off_time_us:     8.0,
      peak_current_A:  2.0,
      gap_voltage_V:  28.0,
      wire_tension_N:  18.0,
    },
    tips: [
      "Skim 3 offset ≈ skim_2 offset − 0.015mm; near-zero stock removal",
      "Dielectric conductivity must be ≤ 5 µS/cm for clean skim_3 discharge",
      "Temperature-stable room essential: 1°C variation → 0.002mm dimensional shift",
      "JM Die uses skim_3 for D2 punch profiles destined for Alcoa, SFS fastener dies",
      "Expected Ra after skim_3: 0.2–0.4µm; recast layer < 5µm",
    ],
  },

  {
    id: "skim_4",
    name: "Skim 4 — Mirror Finish",
    description:
      "Fourth finishing pass for mirror finish. Minimum power, spark conditioning mode. " +
      "Achieves Ra < 0.2µm. Used for aerospace, medical, and precision gauge applications.",
    category: "finishing",
    material_suitability: [
      { material_type: "steel",       suitability: 0.9, speed_factor: 0.08, power_factor: 0.005 },
      { material_type: "tool_steel",  suitability: 0.9, speed_factor: 0.07, power_factor: 0.005 },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.06, power_factor: 0.004 },
      { material_type: "carbide",     suitability: 0.8, speed_factor: 0.04, power_factor: 0.004 },
      { material_type: "aluminum",    suitability: 0.5, speed_factor: 0.10, power_factor: 0.005 },
      { material_type: "titanium",    suitability: 0.7, speed_factor: 0.05, power_factor: 0.004 },
      { material_type: "inconel",     suitability: 0.6, speed_factor: 0.05, power_factor: 0.004 },
      { material_type: "copper",      suitability: 0.5, speed_factor: 0.08, power_factor: 0.005 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 150.0 },
    typical_params: {
      on_time_us:      0.5,
      off_time_us:     7.0,
      peak_current_A:  1.0,
      gap_voltage_V:  22.0,
      wire_tension_N:  18.0,
    },
    tips: [
      "Mirror finish requires dielectric conductivity ≤ 2 µS/cm (ultra-pure DI water)",
      "Verify wire straightness: bow > 0.005mm will leave striation marks",
      "Machine must be thermally stable for ≥ 4 hours before skim_4 run",
      "Only practical for part heights ≤ 100mm; taller sections lose parallelism",
      "AMS 2628 aerospace recast limit (zero recast) typically met after skim_4",
    ],
  },

  // ─── GEOMETRY-SPECIFIC ──────────────────────────────────────────────────
  {
    id: "corner_strategy",
    name: "Corner Strategy",
    description:
      "Reduced power and feed for sharp internal/external corners. Prevents overcut " +
      "and wire vibration artifacts at corners < 0.5mm radius. Achieves ±0.003mm at corners.",
    category: "geometry",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 0.60, power_factor: 0.70 },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.55, power_factor: 0.70 },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.50, power_factor: 0.65 },
      { material_type: "carbide",     suitability: 0.8, speed_factor: 0.30, power_factor: 0.60 },
      { material_type: "aluminum",    suitability: 1.0, speed_factor: 0.80, power_factor: 0.70 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.45, power_factor: 0.65 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 0.40, power_factor: 0.65 },
      { material_type: "copper",      suitability: 0.9, speed_factor: 0.70, power_factor: 0.70 },
    ],
    thickness_range: { min_mm: 0.5, max_mm: 300.0 },
    typical_params: {
      on_time_us:      2.5,
      off_time_us:    12.0,
      peak_current_A:  6.0,
      gap_voltage_V:  40.0,
      wire_tension_N:  16.0,
    },
    tips: [
      "Activate corner slow-down on Mitsubishi M800: G50 S<radius> for radii < 0.3mm",
      "Reduce peak current by 30% and feed by 40% within 0.5mm of corner vertex",
      "Use tangent arc lead-in/lead-out rather than perpendicular entry at sharp corners",
      "Corner overcut = 0.002–0.005mm; compensate with negative corner offset in CAM",
      "For internal corners in D2 die profiles: extra skim pass at corner zone only",
    ],
  },

  {
    id: "taper_cut",
    name: "Taper Cut",
    description:
      "Angled cutting with UV-axis compensation for taper angles up to ±30°. " +
      "Uses 4-axis XY+UV interpolation. Critical for die clearance angles and progressive die sets.",
    category: "geometry",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 0.85, power_factor: 1.0  },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.78, power_factor: 1.0  },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.72, power_factor: 1.0  },
      { material_type: "carbide",     suitability: 0.7, speed_factor: 0.42, power_factor: 0.90 },
      { material_type: "aluminum",    suitability: 0.9, speed_factor: 1.10, power_factor: 0.90 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.60, power_factor: 0.95 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 0.50, power_factor: 0.95 },
      { material_type: "copper",      suitability: 0.8, speed_factor: 1.00, power_factor: 0.90 },
    ],
    thickness_range: { min_mm: 3.0, max_mm: 200.0 },
    typical_params: {
      on_time_us:      6.0,
      off_time_us:    20.0,
      peak_current_A: 16.0,
      gap_voltage_V:  55.0,
      wire_tension_N:  12.0,
    },
    tips: [
      "Lower wire tension for taper > 5° — excessive tension causes wire bow and taper error",
      "JM Die standard taper clearance: 0.5° per side for cold heading die clearance angles",
      "UV compensation must account for workpiece height: U = tan(α) × height_mm",
      "Verify UV zero calibration before taper cut — 0.001mm UV offset = 0.006° taper error at 100mm",
      "Rough cut taper, then skim passes with same taper angle — never skim at 0° after tapered rough",
    ],
  },

  // ─── DIELECTRIC MODE ────────────────────────────────────────────────────
  {
    id: "submerged",
    name: "Submerged Cut",
    description:
      "Full dielectric immersion (submerged tank mode). Maximizes flushing efficiency, " +
      "reduces thermal distortion, and improves surface finish vs open-bath cutting.",
    category: "dielectric",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 1.10, power_factor: 1.0  },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 1.05, power_factor: 1.0  },
      { material_type: "stainless",   suitability: 1.0, speed_factor: 1.00, power_factor: 1.0  },
      { material_type: "carbide",     suitability: 0.9, speed_factor: 0.55, power_factor: 0.90 },
      { material_type: "aluminum",    suitability: 0.9, speed_factor: 1.50, power_factor: 0.85 },
      { material_type: "titanium",    suitability: 1.0, speed_factor: 0.75, power_factor: 0.95 },
      { material_type: "inconel",     suitability: 0.9, speed_factor: 0.65, power_factor: 0.95 },
      { material_type: "copper",      suitability: 0.9, speed_factor: 1.20, power_factor: 0.90 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 300.0 },
    typical_params: {
      on_time_us:      7.0,
      off_time_us:    22.0,
      peak_current_A: 18.0,
      gap_voltage_V:  58.0,
      wire_tension_N:  14.0,
    },
    tips: [
      "Submerged cutting reduces thermal distortion by 40–60% vs jet flushing for thick sections",
      "Dielectric temperature must be controlled to 20±1°C for dimensional stability",
      "Allow 15-minute temperature soak after loading workpiece into submerged tank",
      "Speed advantage diminishes below 20mm stock height — jet flushing equally effective there",
      "Mitsubishi FA-20S: activate submerged mode with M66 code; disable lower flush nozzle",
    ],
  },

  // ─── FLUSHING MODE ──────────────────────────────────────────────────────
  {
    id: "flush_upper",
    name: "Upper Nozzle Flush",
    description:
      "Upper nozzle flush mode only. Used when lower nozzle access is blocked by fixturing " +
      "or workpiece geometry. Speed reduced due to single-direction flush.",
    category: "flushing",
    material_suitability: [
      { material_type: "steel",       suitability: 0.9, speed_factor: 0.75, power_factor: 0.90 },
      { material_type: "tool_steel",  suitability: 0.9, speed_factor: 0.68, power_factor: 0.90 },
      { material_type: "stainless",   suitability: 0.8, speed_factor: 0.64, power_factor: 0.88 },
      { material_type: "carbide",     suitability: 0.7, speed_factor: 0.38, power_factor: 0.82 },
      { material_type: "aluminum",    suitability: 0.9, speed_factor: 1.00, power_factor: 0.85 },
      { material_type: "titanium",    suitability: 0.7, speed_factor: 0.53, power_factor: 0.88 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 0.45, power_factor: 0.88 },
      { material_type: "copper",      suitability: 0.8, speed_factor: 0.90, power_factor: 0.88 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 80.0 },
    typical_params: {
      on_time_us:      6.0,
      off_time_us:    26.0,
      peak_current_A: 14.0,
      gap_voltage_V:  52.0,
      wire_tension_N:  15.0,
    },
    tips: [
      "Increase off-time by 30% vs standard to allow debris evacuation with single nozzle",
      "Limit thickness to ≤ 80mm for upper-flush-only; use submerged mode for thicker parts",
      "Upper nozzle pressure 12–15 bar when lower nozzle is disabled",
      "Wire break frequency increases 2–3× vs dual flush — monitor and reduce speed proactively",
      "Never use upper-flush-only for carbide > 25mm — debris accumulation causes shorts",
    ],
  },

  {
    id: "flush_lower",
    name: "Lower Nozzle Flush",
    description:
      "Lower nozzle flush only mode. Used for tall workpieces where upper nozzle cannot " +
      "reach surface, or for parts fixtured on their side. Uncommon — use submerged mode if possible.",
    category: "flushing",
    material_suitability: [
      { material_type: "steel",       suitability: 0.8, speed_factor: 0.70, power_factor: 0.88 },
      { material_type: "tool_steel",  suitability: 0.8, speed_factor: 0.63, power_factor: 0.88 },
      { material_type: "stainless",   suitability: 0.8, speed_factor: 0.60, power_factor: 0.86 },
      { material_type: "carbide",     suitability: 0.6, speed_factor: 0.35, power_factor: 0.80 },
      { material_type: "aluminum",    suitability: 0.8, speed_factor: 0.95, power_factor: 0.85 },
      { material_type: "titanium",    suitability: 0.6, speed_factor: 0.50, power_factor: 0.85 },
      { material_type: "inconel",     suitability: 0.6, speed_factor: 0.42, power_factor: 0.85 },
      { material_type: "copper",      suitability: 0.7, speed_factor: 0.85, power_factor: 0.86 },
    ],
    thickness_range: { min_mm: 5.0, max_mm: 100.0 },
    typical_params: {
      on_time_us:      6.5,
      off_time_us:    28.0,
      peak_current_A: 13.0,
      gap_voltage_V:  50.0,
      wire_tension_N:  15.0,
    },
    tips: [
      "Lower-only flush is the least preferred mode — only use when no alternative exists",
      "Increase off-time to 28–32µs to purge debris rising through cutting zone",
      "Taper cuts with lower-only flush are not recommended — debris distribution too uneven",
      "Consider re-fixturing to enable dual or submerged flushing mode instead",
      "JM Die: rarely uses lower-only; most setups allow dual flush for Mitsubishi FA-20S",
    ],
  },

  // ─── SECTION THICKNESS ──────────────────────────────────────────────────
  {
    id: "thin_section",
    name: "Thin Section Strategy",
    description:
      "Optimized for workpiece thickness < 5mm. Reduced energy, higher frequency. " +
      "Prevents wire bow, thermal distortion, and part deflection during cutting.",
    category: "thickness",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 2.20, power_factor: 0.40 },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 1.90, power_factor: 0.40 },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 1.70, power_factor: 0.38 },
      { material_type: "carbide",     suitability: 0.8, speed_factor: 1.00, power_factor: 0.35 },
      { material_type: "aluminum",    suitability: 1.0, speed_factor: 3.20, power_factor: 0.35 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 1.40, power_factor: 0.38 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 1.20, power_factor: 0.38 },
      { material_type: "copper",      suitability: 0.9, speed_factor: 2.50, power_factor: 0.38 },
    ],
    thickness_range: { min_mm: 0.2, max_mm: 5.0 },
    typical_params: {
      on_time_us:      1.5,
      off_time_us:     8.0,
      peak_current_A:  5.0,
      gap_voltage_V:  32.0,
      wire_tension_N:  10.0,
    },
    tips: [
      "Reduce wire tension to 8–12N for < 3mm parts — high tension bows thin work",
      "Use fine wire 0.20mm or 0.15mm for sections < 2mm for improved feature resolution",
      "Reduce flush pressure to 4–6 bar — thin parts can deflect under jet force",
      "Tab/slug weight becomes critical: even 1g slug can deflect a 2mm ×10mm part",
      "Expect 40–60% faster cutting speed vs standard; reduce energy 60% from base",
    ],
  },

  {
    id: "thick_section",
    name: "Thick Section Strategy",
    description:
      "Optimized for workpiece thickness > 50mm. High power, long off-time for " +
      "debris evacuation. Uses submerged or high-pressure flushing. Expects slower MRR.",
    category: "thickness",
    material_suitability: [
      { material_type: "steel",       suitability: 1.0, speed_factor: 0.55, power_factor: 1.0  },
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.50, power_factor: 1.0  },
      { material_type: "stainless",   suitability: 0.9, speed_factor: 0.45, power_factor: 1.0  },
      { material_type: "carbide",     suitability: 0.7, speed_factor: 0.28, power_factor: 0.90 },
      { material_type: "aluminum",    suitability: 1.0, speed_factor: 0.85, power_factor: 0.90 },
      { material_type: "titanium",    suitability: 0.8, speed_factor: 0.38, power_factor: 0.95 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 0.32, power_factor: 0.95 },
      { material_type: "copper",      suitability: 0.9, speed_factor: 0.65, power_factor: 0.92 },
    ],
    thickness_range: { min_mm: 50.0, max_mm: 400.0 },
    typical_params: {
      on_time_us:     12.0,
      off_time_us:    40.0,
      peak_current_A: 24.0,
      gap_voltage_V:  65.0,
      wire_tension_N:  16.0,
    },
    tips: [
      "Use coated wire (zinc-diffused) for stock > 100mm — better flushing and arc prevention",
      "Off-time must be ≥ 3× on_time for > 100mm to allow full debris evacuation",
      "Submerged mode strongly recommended for all thick-section work",
      "Expect 30–50% slower feed vs standard thickness — do not override auto-feed control",
      "Add programmed pauses every 500mm cut length for wire recooling in > 200mm stock",
    ],
  },

  // ─── MATERIAL-SPECIFIC ──────────────────────────────────────────────────
  {
    id: "carbide_strategy",
    name: "Carbide Strategy",
    description:
      "Tungsten carbide (WC-Co) specific strategy. Low efficiency (η=0.30 per Kunieda). " +
      "Reduced power, aggressive off-time, mandatory submerged flushing. " +
      "Requires copper or coated wire — brass wire erodes faster in carbide.",
    category: "material",
    material_suitability: [
      { material_type: "carbide",     suitability: 1.0, speed_factor: 1.0,  power_factor: 1.0  },
      { material_type: "tool_steel",  suitability: 0.3, speed_factor: 0.5,  power_factor: 0.5  },
      { material_type: "steel",       suitability: 0.2, speed_factor: 0.5,  power_factor: 0.5  },
      { material_type: "stainless",   suitability: 0.2, speed_factor: 0.5,  power_factor: 0.5  },
      { material_type: "aluminum",    suitability: 0.1, speed_factor: 0.5,  power_factor: 0.5  },
      { material_type: "titanium",    suitability: 0.2, speed_factor: 0.5,  power_factor: 0.5  },
      { material_type: "inconel",     suitability: 0.2, speed_factor: 0.5,  power_factor: 0.5  },
      { material_type: "copper",      suitability: 0.1, speed_factor: 0.5,  power_factor: 0.5  },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 80.0 },
    typical_params: {
      on_time_us:      3.0,
      off_time_us:    18.0,
      peak_current_A:  8.0,
      gap_voltage_V:  45.0,
      wire_tension_N:  13.0,
    },
    tips: [
      "WC-Co carbide: use coated 0.25mm wire — brass corrodes 3× faster than in steel",
      "Submerged flushing mandatory for carbide > 15mm — dry flushing causes cracking",
      "Expect 50–60% slower MRR vs D2 tool steel (η=0.30 vs η=0.40 per Kunieda 2005)",
      "JM Die: carbide used for tungsten/cobalt punch inserts — cutting inserts for fastener heading",
      "Do not exceed 8A peak current — carbide thermal shock risk at higher energy levels",
    ],
  },

  {
    id: "tool_steel_strategy",
    name: "Tool Steel Strategy",
    description:
      "Optimized for D2, A2, S7, M2 tool steels (annealed or hardened). JM Die primary material. " +
      "Balanced power for maximum MRR while maintaining Ra < 1.6µm after rough. " +
      "All 4 skim passes typically needed for punch/die profiles.",
    category: "material",
    material_suitability: [
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 1.0,  power_factor: 1.0  },
      { material_type: "steel",       suitability: 0.9, speed_factor: 1.05, power_factor: 1.0  },
      { material_type: "stainless",   suitability: 0.6, speed_factor: 0.90, power_factor: 0.95 },
      { material_type: "carbide",     suitability: 0.2, speed_factor: 0.50, power_factor: 0.80 },
      { material_type: "aluminum",    suitability: 0.3, speed_factor: 1.40, power_factor: 0.85 },
      { material_type: "titanium",    suitability: 0.4, speed_factor: 0.75, power_factor: 0.90 },
      { material_type: "inconel",     suitability: 0.3, speed_factor: 0.65, power_factor: 0.90 },
      { material_type: "copper",      suitability: 0.2, speed_factor: 1.20, power_factor: 0.85 },
    ],
    thickness_range: { min_mm: 5.0, max_mm: 200.0 },
    typical_params: {
      on_time_us:      7.5,
      off_time_us:    22.0,
      peak_current_A: 19.0,
      gap_voltage_V:  58.0,
      wire_tension_N:  14.0,
    },
    tips: [
      "D2 (62HRC): same E-code as annealed but reduce speed 8% due to higher hardness",
      "A2: similar to D2 but more prone to thermal cracking — use submerged for > 50mm",
      "S7 shock steel: excellent toughness but slightly higher Ra after rough — plan 4 skims",
      "M2 HSS: use slightly higher off-time (25µs) for improved debris evacuation vs D2",
      "JM Die: Mitsubishi FA E-code E10x.x families calibrated for D2 reference material",
    ],
  },

  {
    id: "hardened_strategy",
    name: "Hardened Material Strategy",
    description:
      "For materials > 58 HRC. Accounts for increased conductivity and harder HAZ removal. " +
      "Slightly lower MRR than annealed equivalent. Mandatory multiple skim passes " +
      "to fully remove brittle recast layer that forms at high hardness.",
    category: "material",
    material_suitability: [
      { material_type: "tool_steel",  suitability: 1.0, speed_factor: 0.88, power_factor: 0.95 },
      { material_type: "steel",       suitability: 0.9, speed_factor: 0.90, power_factor: 0.95 },
      { material_type: "carbide",     suitability: 0.8, speed_factor: 0.45, power_factor: 0.85 },
      { material_type: "stainless",   suitability: 0.7, speed_factor: 0.78, power_factor: 0.90 },
      { material_type: "inconel",     suitability: 0.7, speed_factor: 0.55, power_factor: 0.90 },
      { material_type: "titanium",    suitability: 0.6, speed_factor: 0.65, power_factor: 0.90 },
      { material_type: "aluminum",    suitability: 0.2, speed_factor: 1.00, power_factor: 0.80 },
      { material_type: "copper",      suitability: 0.2, speed_factor: 0.90, power_factor: 0.80 },
    ],
    thickness_range: { min_mm: 1.0, max_mm: 200.0 },
    typical_params: {
      on_time_us:      6.5,
      off_time_us:    22.0,
      peak_current_A: 17.0,
      gap_voltage_V:  56.0,
      wire_tension_N:  14.0,
    },
    tips: [
      "Reduce rough cut speed 8–12% for > 62HRC vs same material annealed",
      "Recast layer on hardened tool steel is more brittle and microcracks under stress — run 3+ skims",
      "Minimum 2 skim passes mandatory for any hardened part destined for fatigue-loaded service",
      "AMS 2628: zero-recast requirement for aerospace hardened parts means skim_4 standard",
      "JM Die: all D2/A2/M2 punch profiles are cut fully hardened (58–64 HRC)",
    ],
  },
];

// ============================================================================
// STRATEGY SELECTION SCORING
// ============================================================================

/**
 * Map an arbitrary material name to the nearest canonical WEDM material type.
 * Handles JM Die shorthand (D2, A2, S7, M2, H13 → tool_steel) and
 * generic names (carbide, WC-Co → carbide).
 */
function normalizeMaterial(material: string): string {
  const m = material.toLowerCase().trim();
  if (m.match(/^(d2|a2|s7|m2|m42|h13|o1|w1|tool.?steel|die.?steel)$/)) return "tool_steel";
  if (m.match(/^(carbide|wc|wc-co|tungsten.carbide|cemented.carbide|cermet)$/)) return "carbide";
  if (m.match(/^(stainless|ss|304|316|17-4|420|440c|inox)$/)) return "stainless";
  if (m.match(/^(steel|mild.?steel|1018|1045|4140|4340|low.?carbon)$/)) return "steel";
  if (m.match(/^(al|aluminum|aluminium|6061|7075|2024|6082)$/)) return "aluminum";
  if (m.match(/^(ti|titanium|ti-6al-4v|grade.?5|cp.?titanium)$/)) return "titanium";
  if (m.match(/^(inconel|in718|in625|in713|nickel.superalloy|hastelloy)$/)) return "inconel";
  if (m.match(/^(cu|copper|brass|bronze|beryllium.?copper)$/)) return "copper";
  return m; // pass through if unrecognized
}

/**
 * Score material match: 0.0–1.0.
 * Returns suitability from strategy's material_suitability table.
 */
function scoreMaterial(strategy: WEDMCuttingStrategy, normalizedMaterial: string): number {
  const match = strategy.material_suitability.find(
    (s) => s.material_type === normalizedMaterial
  );
  return match?.suitability ?? 0.1;
}

/**
 * Score thickness fit: 1.0 if within range, decays to 0 outside.
 */
function scoreThickness(strategy: WEDMCuttingStrategy, thickness_mm: number): number {
  const { min_mm, max_mm } = strategy.thickness_range;
  if (thickness_mm >= min_mm && thickness_mm <= max_mm) return 1.0;
  if (thickness_mm < min_mm) {
    const delta = min_mm - thickness_mm;
    return Math.max(0, 1.0 - delta / min_mm);
  }
  const delta = thickness_mm - max_mm;
  return Math.max(0, 1.0 - delta / max_mm);
}

/**
 * Score Ra target match.
 * Maps strategy category → expected Ra range, scores by proximity.
 */
const STRATEGY_RA_RANGES: Record<string, { min_um: number; max_um: number }> = {
  rough_cut:         { min_um: 2.0,  max_um: 6.4 },
  skim_1:            { min_um: 0.8,  max_um: 2.0 },
  skim_2:            { min_um: 0.4,  max_um: 0.9 },
  skim_3:            { min_um: 0.2,  max_um: 0.5 },
  skim_4:            { min_um: 0.05, max_um: 0.25 },
  corner_strategy:   { min_um: 0.4,  max_um: 1.6 },
  taper_cut:         { min_um: 1.6,  max_um: 4.0 },
  submerged:         { min_um: 1.0,  max_um: 3.2 },
  flush_upper:       { min_um: 1.6,  max_um: 4.0 },
  flush_lower:       { min_um: 1.6,  max_um: 4.0 },
  thin_section:      { min_um: 0.4,  max_um: 2.0 },
  thick_section:     { min_um: 2.0,  max_um: 6.4 },
  carbide_strategy:  { min_um: 0.6,  max_um: 2.0 },
  tool_steel_strategy: { min_um: 1.0, max_um: 3.2 },
  hardened_strategy: { min_um: 0.8,  max_um: 2.5 },
};

function scoreRa(strategyId: string, target_ra_um: number): number {
  const range = STRATEGY_RA_RANGES[strategyId];
  if (!range) return 0.5;
  if (target_ra_um >= range.min_um && target_ra_um <= range.max_um) return 1.0;
  if (target_ra_um < range.min_um) {
    // Target is finer than this strategy achieves — partial credit only
    const delta = range.min_um - target_ra_um;
    return Math.max(0, 1.0 - delta / range.min_um * 2);
  }
  // Target is coarser — this strategy is overkill (mild penalty)
  const delta = target_ra_um - range.max_um;
  return Math.max(0, 1.0 - delta / range.max_um);
}

/**
 * Score pass count compatibility.
 * Strategies suited to a given pass number score higher.
 */
const STRATEGY_PASS_FIT: Record<string, number[]> = {
  rough_cut:         [1, 2, 3, 4, 5],
  skim_1:            [2, 3, 4, 5],
  skim_2:            [3, 4, 5],
  skim_3:            [4, 5],
  skim_4:            [5],
  corner_strategy:   [2, 3, 4, 5],
  taper_cut:         [1, 2, 3],
  submerged:         [1, 2, 3, 4, 5],
  flush_upper:       [1, 2, 3],
  flush_lower:       [1, 2, 3],
  thin_section:      [1, 2, 3, 4],
  thick_section:     [1, 2, 3],
  carbide_strategy:  [1, 2, 3, 4, 5],
  tool_steel_strategy: [1, 2, 3, 4, 5],
  hardened_strategy: [2, 3, 4, 5],
};

function scorePass(strategyId: string, passes: number): number {
  const fitList = STRATEGY_PASS_FIT[strategyId];
  if (!fitList) return 0.5;
  return fitList.includes(passes) ? 1.0 : 0.3;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * WEDMStrategyLibraryEngine — Wire EDM Cutting Strategy Library
 *
 * Provides access to the 15 canonical WEDM strategies and an AI selection
 * method that scores and ranks strategies based on material, thickness,
 * target Ra, and planned pass count.
 */
export class WEDMStrategyLibraryEngine {
  private static instance: WEDMStrategyLibraryEngine;

  private constructor() {
    log.info("WEDMStrategyLibraryEngine: initialized with " + WEDM_CUTTING_STRATEGIES.length + " strategies");
  }

  /** Singleton accessor */
  static getInstance(): WEDMStrategyLibraryEngine {
    if (!WEDMStrategyLibraryEngine.instance) {
      WEDMStrategyLibraryEngine.instance = new WEDMStrategyLibraryEngine();
    }
    return WEDMStrategyLibraryEngine.instance;
  }

  /**
   * Look up a strategy by its unique id.
   * Returns undefined if not found.
   *
   * @param id - Strategy identifier (e.g. "rough_cut", "skim_1")
   */
  getStrategy(id: string): WEDMCuttingStrategy | undefined {
    return WEDM_CUTTING_STRATEGIES.find((s) => s.id === id);
  }

  /**
   * Return the full list of all 15 strategies.
   */
  listStrategies(): WEDMCuttingStrategy[] {
    return WEDM_CUTTING_STRATEGIES;
  }

  /**
   * Filter strategies by material type.
   * Returns strategies with suitability >= 0.6 for the given material.
   *
   * @param material - Material identifier (normalized automatically)
   */
  getStrategiesForMaterial(material: string): WEDMCuttingStrategy[] {
    const norm = normalizeMaterial(material);
    return WEDM_CUTTING_STRATEGIES.filter((s) => {
      const suit = s.material_suitability.find((m) => m.material_type === norm);
      return suit ? suit.suitability >= 0.6 : false;
    });
  }

  /**
   * Filter strategies whose thickness_range contains the given thickness.
   *
   * @param thickness_mm - Workpiece thickness in mm
   */
  getStrategiesForThickness(thickness_mm: number): WEDMCuttingStrategy[] {
    return WEDM_CUTTING_STRATEGIES.filter(
      (s) => thickness_mm >= s.thickness_range.min_mm && thickness_mm <= s.thickness_range.max_mm
    );
  }

  /**
   * AI strategy selector — scores and ranks all strategies for the given input.
   *
   * Scoring weights (per WEDM application notes):
   *   material_score  × 0.35
   *   thickness_score × 0.25
   *   ra_score        × 0.25
   *   pass_score      × 0.15
   *
   * @param input - Material, thickness, target Ra, and pass count
   * @returns Ranked list of strategy recommendations (best first)
   */
  selectStrategy(input: StrategySelectionInput): StrategyRecommendation[] {
    const { material, thickness_mm, target_ra_um, passes } = input;
    const normalizedMaterial = normalizeMaterial(material);

    const recommendations: StrategyRecommendation[] = WEDM_CUTTING_STRATEGIES.map((strategy) => {
      const material_score  = scoreMaterial(strategy, normalizedMaterial);
      const thickness_score = scoreThickness(strategy, thickness_mm);
      const ra_score        = scoreRa(strategy.id, target_ra_um);
      const pass_score      = scorePass(strategy.id, passes);

      const score =
        material_score  * 0.35 +
        thickness_score * 0.25 +
        ra_score        * 0.25 +
        pass_score      * 0.15;

      const rationale = this.buildRationale(strategy, normalizedMaterial, material_score, thickness_score, ra_score, pass_score);

      return {
        rank: 0, // filled after sort
        strategy,
        score: Math.round(score * 1000) / 1000,
        score_breakdown: {
          material_score:  Math.round(material_score  * 1000) / 1000,
          thickness_score: Math.round(thickness_score * 1000) / 1000,
          ra_score:        Math.round(ra_score        * 1000) / 1000,
          pass_score:      Math.round(pass_score      * 1000) / 1000,
        },
        rationale,
      };
    });

    // Sort descending by score, assign ranks
    recommendations.sort((a, b) => b.score - a.score);
    recommendations.forEach((r, i) => { r.rank = i + 1; });

    return recommendations;
  }

  /** Build a human-readable rationale string for a recommendation. */
  private buildRationale(
    strategy: WEDMCuttingStrategy,
    normalizedMaterial: string,
    material_score: number,
    thickness_score: number,
    ra_score: number,
    pass_score: number
  ): string {
    const parts: string[] = [];

    if (material_score >= 0.9) {
      parts.push(`Ideal for ${normalizedMaterial}`);
    } else if (material_score >= 0.6) {
      parts.push(`Good suitability for ${normalizedMaterial}`);
    } else {
      parts.push(`Limited suitability for ${normalizedMaterial}`);
    }

    if (thickness_score === 1.0) {
      parts.push("thickness within optimal range");
    } else if (thickness_score >= 0.7) {
      parts.push("thickness near applicable range");
    } else {
      parts.push("thickness outside recommended range");
    }

    if (ra_score >= 0.9) {
      parts.push("Ra target well matched");
    } else if (ra_score >= 0.5) {
      parts.push("Ra target approximately matched");
    } else {
      parts.push("Ra target mismatch");
    }

    if (pass_score === 1.0) {
      parts.push("pass count compatible");
    } else {
      parts.push("pass count marginal");
    }

    return parts.join("; ") + ".";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmStrategyLibraryEngine = WEDMStrategyLibraryEngine.getInstance();
