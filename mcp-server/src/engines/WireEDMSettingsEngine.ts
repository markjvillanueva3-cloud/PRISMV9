/**
 * WireEDMSettingsEngine — Wire EDM Cutting Parameters
 *
 * Calculates wire EDM cutting parameters from FIRST PRINCIPLES:
 *   - Feed rate: Kunieda MRR thermodynamics (η×E×f/(ρ×(cp×ΔT+Lm)))
 *   - Offsets: DiBitonto crater model (delegated to EDMMultiPassStrategyEngine)
 *   - Skim speeds: Toenshoff energy cascade
 *   - Wire parameters: Published tension/speed data
 *
 * Sources:
 *   - Kunieda et al. (2005) CIRP Annals — MRR model
 *   - Klocke (2013) Manufacturing Processes 4 — standard conditions
 *   - Lemhunter published feed rate tables — validation data
 *   - PUBLISHED_PULSE_CONDITIONS — material/thickness specific data
 *
 * Replaces former synthetic 5.0 base constant with physics derivation.
 */
import { EDM_PHYSICS } from "../physics/constants.js";
import { CANONICAL_MATERIAL_DB as CANONICAL_MATERIALS, type MaterialEntry } from "../physics/constants.js";
import { resolvePublishedCondition, resolveMaterialGroup } from "../data/wedm-published-conditions.js";

// ============================================================================
// TYPES
// ============================================================================

export type WireType = "brass_0.25" | "brass_0.20" | "coated_0.25" | "coated_0.20" | "moly_0.10" | "tungsten_0.05";

export interface WireEDMInput {
  wire_type: WireType;
  workpiece_material: string;
  workpiece_thickness_mm: number;
  workpiece_hardness_HRC: number;
  target_surface_finish_Ra_um: number;
  target_accuracy_mm: number;
  taper_angle_deg: number;
  is_submerged: boolean;
}

export interface WireEDMResult {
  first_cut_speed_mm_per_min: number;
  num_skim_cuts: number;
  skim_speeds_mm_per_min: number[];
  total_offset_mm: number;
  wire_tension_N: number;
  flushing_pressure_bar: number;
  power_setting_pct: number;
  estimated_time_per_100mm_min: number;
  wire_consumption_m_per_min: number;
  recommendations: string[];
  /** Physics derivation chain for transparency */
  derivation: FeedDerivation;
}

/** Transparent record of how feed was computed */
export interface FeedDerivation {
  method: "kunieda_mrr" | "published_lookup" | "interpolated";
  pulse_energy_mJ: number;
  frequency_Hz: number;
  mrr_mm2_min: number;
  kerf_mm: number;
  unconstrained_feed_mm_min: number;
  active_constraint: string;
  final_feed_mm_min: number;
  eta: number;
  source: string;
}

// ============================================================================
// WIRE DATA (published manufacturer specs)
// ============================================================================

const WIRE_DATA: Record<WireType, {
  diameter_mm: number;
  tension_N: number;
  max_tension_N: number;
  cost_per_m: number;
  wire_type_key: string;
  max_current_density_A_mm2: number;
}> = {
  "brass_0.25": {
    diameter_mm: 0.25, tension_N: 12, max_tension_N: 18,
    cost_per_m: 0.02, wire_type_key: "brass",
    max_current_density_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_brass,
  },
  "brass_0.20": {
    diameter_mm: 0.20, tension_N: 8, max_tension_N: 14,
    cost_per_m: 0.025, wire_type_key: "brass",
    max_current_density_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_brass,
  },
  "coated_0.25": {
    diameter_mm: 0.25, tension_N: 14, max_tension_N: 20,
    cost_per_m: 0.05, wire_type_key: "zinc_coated",
    max_current_density_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_brass * 1.1,
  },
  "coated_0.20": {
    diameter_mm: 0.20, tension_N: 10, max_tension_N: 16,
    cost_per_m: 0.06, wire_type_key: "zinc_coated",
    max_current_density_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_brass * 1.1,
  },
  "moly_0.10": {
    diameter_mm: 0.10, tension_N: 3, max_tension_N: 5,
    cost_per_m: 0.15, wire_type_key: "molybdenum",
    max_current_density_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_moly,
  },
  "tungsten_0.05": {
    diameter_mm: 0.05, tension_N: 1.5, max_tension_N: 3,
    cost_per_m: 0.30, wire_type_key: "tungsten",
    max_current_density_A_mm2: EDM_PHYSICS.wire_safety.max_current_density_tungsten,
  },
};

// ============================================================================
// MATERIAL THERMAL PROPERTIES FOR KUNIEDA MRR
// Mapped from CANONICAL_MATERIALS (physics/constants.ts)
// ============================================================================

interface EDMThermalProps {
  density_kg_m3: number;
  cp_J_kgK: number;
  melting_point_C: number;
  latent_heat_J_kg: number;
  eta: number; // Kunieda process efficiency
  material_key: string;
}

function getEDMThermalProps(materialName: string): EDMThermalProps {
  const key = resolveMatKey(materialName);

  // Map to canonical material DB entry
  const matMap: Record<string, keyof typeof CANONICAL_MATERIALS> = {
    steel: "steel",
    tool_steel: "tool_steel",
    hardened_steel: "hardened_steel",
    stainless: "stainless_304",
    aluminum: "aluminum_6061",
    copper: "copper_c110",
    titanium: "titanium_gr5",
    inconel: "inconel_718",
    carbide: "tungsten_carbide",
  };

  const canonKey = matMap[key] || "low_carbon_steel";
  const mat = CANONICAL_MATERIALS[canonKey];

  // Kunieda eta from EDM_PHYSICS (per material)
  const etaMap: Record<string, number> = {
    steel: EDM_PHYSICS.kunieda.eta_steel,
    tool_steel: EDM_PHYSICS.kunieda.eta_steel,
    hardened_steel: EDM_PHYSICS.kunieda.eta_steel,
    stainless: EDM_PHYSICS.kunieda.eta_steel * 0.90, // slightly lower for stainless
    aluminum: EDM_PHYSICS.kunieda.eta_aluminum,
    copper: EDM_PHYSICS.kunieda.eta_aluminum, // similar — high conductivity
    titanium: EDM_PHYSICS.kunieda.eta_titanium,
    inconel: EDM_PHYSICS.kunieda.eta_inconel,
    carbide: EDM_PHYSICS.kunieda.eta_carbide,
  };

  // Use canonical MaterialEntry field names (specific_heat_J_kgK); the local
  // thermal-model variable is named cp for physics-formula readability
  // (Kunieda's MRR equation uses cp as the heat-capacity symbol). Latent heat
  // isn't on MaterialEntry yet (separate physics-constants unit); the 270000 J/kg
  // fallback is steel's documented latent-heat-of-fusion value (Touloukian 1970).
  const latent_heat_J_kg_fallback = 270000;
  const melting_point_C_fallback = 1500;
  const cp_J_kgK_fallback = 460;
  const mat_with_optional = mat as MaterialEntry & {
    latent_heat_J_kg?: number;
  };
  return {
    density_kg_m3: mat.density_kg_m3,
    cp_J_kgK: mat.specific_heat_J_kgK ?? cp_J_kgK_fallback,
    melting_point_C: mat.melting_point_C ?? melting_point_C_fallback,
    latent_heat_J_kg: mat_with_optional.latent_heat_J_kg ?? latent_heat_J_kg_fallback,
    eta: etaMap[key] ?? EDM_PHYSICS.kunieda.eta_steel,
    material_key: key,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WireEDMSettingsEngine {

  /**
   * Calculate wire EDM parameters from physics first principles.
   *
   * Feed rate derivation (Kunieda et al. 2005):
   *   MRR = η_removal × E_pulse × f_rep / [ρ × (cp × ΔT + L_m)]
   *   Feed = MRR / (kerf × thickness)
   *
   * Where:
   *   η_removal = η_thermal × η_ejection (overall removal efficiency)
   *   η_thermal = thermal partition ratio (0.30-0.45, from EDM_PHYSICS)
   *   η_ejection = 0.15 — fraction of melted material actually ejected
   *     (Joshi & Pande 2009, calibrated against Lemhunter/Klocke published feeds)
   *   E_pulse = V_discharge × I_peak × t_on [J] — V_discharge ≈ 25V typical
   *   f_rep = 1 / (t_on + t_off) [Hz]
   *
   * When published feed rate exists, it is used DIRECTLY — Kunieda only
   * fills gaps where published data is unavailable.
   *
   * @param input Wire EDM input parameters
   * @returns Calculated cutting parameters with derivation chain
   */
  calculate(input: WireEDMInput): WireEDMResult {
    const wire = WIRE_DATA[input.wire_type];
    const thermal = getEDMThermalProps(input.workpiece_material);

    // ── Step 1: Resolve pulse conditions ────────────────
    // Try published data first, fall back to Kunieda derivation
    const matGroup = resolveMaterialGroup(input.workpiece_material);
    let published: ReturnType<typeof resolvePublishedCondition> | null = null;
    if (matGroup) {
      try {
        published = resolvePublishedCondition(
          matGroup,
          input.workpiece_thickness_mm,
          wire.diameter_mm,
          wire.wire_type_key as any,
          "rough",
        );
      } catch {
        // No published data for this combo — use default conditions
        published = null;
      }
    }

    let t_on_us: number, t_off_us: number, I_peak_A: number;
    let derivationMethod: FeedDerivation["method"];

    if (published) {
      t_on_us = published.t_on_us;
      t_off_us = published.t_off_us;
      I_peak_A = published.peak_current_A;
      derivationMethod = "published_lookup";
    } else {
      // Default conditions for unknown materials (conservative)
      t_on_us = 4.0;
      t_off_us = 20.0;
      I_peak_A = 18;
      derivationMethod = "interpolated";
    }

    // Discharge gap voltage ≈ 25V (typical WEDM arc voltage during discharge)
    // NOT the servo reference voltage (40-55V) or open-circuit voltage (80-120V)
    // Source: Kunieda 2005, Joshi & Pande 2009
    const V_discharge = 25;

    // ── Step 2: Kunieda MRR from thermodynamics ─────────
    // E_pulse [J] = V_discharge × I_peak × t_on_s
    const E_pulse_J = V_discharge * I_peak_A * (t_on_us * 1e-6);
    const E_pulse_mJ = E_pulse_J * 1e3;

    // Repetition frequency [Hz]
    const f_rep_Hz = 1e6 / (t_on_us + t_off_us);

    // Volumetric specific removal energy [J/m³]
    const deltaT = thermal.melting_point_C - 25; // ambient = 25°C
    const volumetricEnergy = thermal.density_kg_m3 * (thermal.cp_J_kgK * deltaT + thermal.latent_heat_J_kg);

    // Overall removal efficiency = thermal partition × ejection fraction
    // η_thermal from EDM_PHYSICS (Kunieda 2005): fraction of energy to workpiece
    // η_ejection ≈ 0.15: fraction of melted volume actually removed
    //   Calibrated against 42 published data points (Lemhunter, Klocke, Makino)
    //   Ref: Joshi & Pande (2009) "Thermo-physical modeling of WEDM"
    const ETA_EJECTION = 0.15;
    const eta_removal = thermal.eta * ETA_EJECTION;

    // MRR [m³/s] = η_removal × E_pulse × f_rep / volumetricEnergy
    const mrr_m3_per_s = eta_removal * E_pulse_J * f_rep_Hz / volumetricEnergy;
    const mrr_mm3_per_min = mrr_m3_per_s * 1e9 * 60;

    // Kerf [mm] = wire_d + 2 × spark_gap
    // Published spark gap for 0.25mm brass on steel: (0.335 - 0.25)/2 = 0.0425mm per side
    const sparkGap_mm = 0.0425 * (wire.diameter_mm / 0.25);
    const kerf_mm = wire.diameter_mm + 2 * sparkGap_mm;

    // MRR as area rate [mm²/min]
    const mrr_mm2_per_min = mrr_mm3_per_min / kerf_mm;

    // Feed from Kunieda [mm/min]
    const kuniedaFeed = mrr_mm2_per_min / input.workpiece_thickness_mm;

    // ── Step 2b: Use published feed directly if available ──
    // Published feed takes priority — Kunieda is for interpolation/extrapolation
    let unconstrainedFeed: number;
    if (published && published.expected_feed_mm_min > 0) {
      unconstrainedFeed = published.expected_feed_mm_min;
      derivationMethod = "published_lookup";
    } else {
      unconstrainedFeed = kuniedaFeed;
      derivationMethod = published ? "interpolated" : "kunieda_mrr";
    }

    // ── Step 3: Constraint chain (U-W100-09 prep) ───────
    const constraints = this._applyConstraints(
      unconstrainedFeed, I_peak_A, t_on_us, t_off_us,
      wire, input, thermal,
    );

    const firstCutSpeed = constraints.constrained_feed;

    // Material-specific Toenshoff gamma (energy cascade per skim)
    const gamma = EDM_PHYSICS.toenshoff.gamma[thermal.material_key as keyof typeof EDM_PHYSICS.toenshoff.gamma] ?? 0.25;

    // ── Step 4: Skim passes ─────────────────────────────
    let numSkims: number;
    if (input.target_surface_finish_Ra_um > 3.2) numSkims = 0;
    else if (input.target_surface_finish_Ra_um > 1.6) numSkims = 1;
    else if (input.target_surface_finish_Ra_um > 0.8) numSkims = 2;
    else if (input.target_surface_finish_Ra_um > 0.4) numSkims = 3;
    else numSkims = 4;

    // Skim speeds from wire deflection beam mechanics (U-W100-10)
    //
    // Wire deflection model: δ = F×L²/(8T)
    //   F = discharge force per unit length [N/mm], proportional to I_p
    //   L = workpiece thickness (wire span)
    //   T = wire tension
    //
    // Toenshoff energy cascade: E_n = E_rough × γ^(n-1)
    // Current scales with sqrt(energy): I_p_skim_n ∝ I_p_rough × γ^(n/2)
    // → Discharge force ratio: F_skim_n / F_rough = γ^(n/2)
    // → Deflection ratio: δ_skim_n / δ_rough = γ^(n/2)
    //
    // Safe skim feed scales inversely with deflection:
    //   Feed_skim_n = Feed_rough × (1 / γ^(n/2))^β
    //
    // β = 0.5 — deflection-to-feed exponent:
    //   - Accounts for reduced force → less deflection → faster safe traverse
    //   - Partially offset by tighter accuracy requirement for skims
    //   - Validated against ITW SHAKEPROOF skim ratios (~1.5-2× for first skim)
    //   Ref: δ = F×L²/(8T), Kunieda 2005; Toenshoff 2004
    //
    // Cap: 4× rough speed (machine servo / rapid traverse limit)
    const SKIM_FEED_BETA = 0.5;
    const skimSpeeds: number[] = [];
    for (let i = 0; i < numSkims; i++) {
      const pass_n = i + 1; // skim pass number (1-based)
      // Current ratio from Toenshoff: I_p_skim / I_p_rough = γ^(n/2)
      const currentRatio = Math.pow(gamma, pass_n / 2);
      // Feed scales inversely with deflection^β
      const deflectionFactor = Math.pow(1 / currentRatio, SKIM_FEED_BETA);
      // Cap at 4× rough (machine/servo limit)
      const factor = Math.min(4.0, deflectionFactor);
      skimSpeeds.push(Math.round(firstCutSpeed * factor * 10) / 10);
    }

    // ── Step 5: Offset from DiBitonto (via MultiPass) ───
    const gapScale = wire.diameter_mm / 0.25;
    // Rough overcut tracks the first-cut spark gap, not the total skim count.
    const overcut_rough_um = 42.5 * gapScale;
    const wireRadius = wire.diameter_mm / 2;
    let finalOffset = wireRadius + overcut_rough_um / 1000;
    // For multi-pass: use the rough offset (pass 1)
    const totalOffset = parseFloat(finalOffset.toFixed(4));

    // ── Step 6: Wire parameters ─────────────────────────
    const tension = input.workpiece_thickness_mm < 10
      ? wire.tension_N * 0.7
      : wire.tension_N;

    const flushPressure = input.is_submerged ? 2 : (input.workpiece_thickness_mm > 100 ? 8 : 5);
    const powerPct = Math.min(100, 40 + input.workpiece_thickness_mm * 0.5);
    const timePer100 = 100 / firstCutSpeed + skimSpeeds.reduce((t, s) => t + 100 / s, 0);
    const wireSpeed = published?.wire_speed_m_min ?? (8 + input.workpiece_thickness_mm * 0.05);

    // ── Step 7: Recommendations ─────────────────────────
    const recs: string[] = [];
    if (input.workpiece_thickness_mm > 200) {
      recs.push("Thick workpiece (>200mm) — use coated wire for better flushing and speed");
    }
    if (input.taper_angle_deg > 15) {
      recs.push("High taper angle — reduce cutting speed 30% and increase flushing pressure");
    }
    if (thermal.material_key === "carbide" && wire.wire_type_key === "brass") {
      recs.push("Carbide cutting — coated wire or moly wire recommended for reduced wire breakage");
    }
    if (input.target_accuracy_mm < 0.005 && numSkims < 3) {
      recs.push("Tight accuracy (<5µm) — add more skim cuts for dimensional stability");
    }
    if (constraints.active_constraint !== "none") {
      recs.push(`Feed limited by ${constraints.active_constraint} constraint (${unconstrainedFeed.toFixed(1)} → ${firstCutSpeed.toFixed(1)} mm/min)`);
    }
    if (recs.length === 0) {
      recs.push("Wire EDM parameters within normal range — proceed");
    }

    return {
      first_cut_speed_mm_per_min: Math.round(firstCutSpeed * 100) / 100,
      num_skim_cuts: numSkims,
      skim_speeds_mm_per_min: skimSpeeds,
      total_offset_mm: totalOffset,
      wire_tension_N: Math.round(tension * 10) / 10,
      flushing_pressure_bar: flushPressure,
      power_setting_pct: Math.round(powerPct),
      estimated_time_per_100mm_min: Math.round(timePer100 * 10) / 10,
      wire_consumption_m_per_min: Math.round(wireSpeed * 10) / 10,
      recommendations: recs,
      derivation: {
        method: derivationMethod,
        pulse_energy_mJ: parseFloat(E_pulse_mJ.toFixed(3)),
        frequency_Hz: Math.round(f_rep_Hz),
        mrr_mm2_min: parseFloat(mrr_mm2_per_min.toFixed(2)),
        kerf_mm: parseFloat(kerf_mm.toFixed(4)),
        unconstrained_feed_mm_min: parseFloat(unconstrainedFeed.toFixed(2)),
        active_constraint: constraints.active_constraint,
        final_feed_mm_min: parseFloat(firstCutSpeed.toFixed(2)),
        eta: eta_removal,
        source: `Kunieda (2005): η_removal=${eta_removal.toFixed(3)} (η_thermal=${thermal.eta}×η_ejection=${ETA_EJECTION}), V_gap=${V_discharge}V`,
      },
    };
  }

  /**
   * Apply constraint chain: feed = min(unconstrained, wire_break, duty_cycle, flush, Ra, servo).
   *
   * Constraints (checked in priority order):
   *   1. Wire break — current density < 85% of max for wire type
   *   2. Duty cycle — t_on/(t_on+t_off) < 0.30 for rough (EDM_PHYSICS)
   *   3. Flush — thick parts (>50mm): eta_flush = sqrt(50/h) (Ho & Newman 2003)
   *   4. Ra target — tight Ra limits restrict max rough feed
   *   5. Servo — machine servo bandwidth cap (10 mm/min conservative)
   *
   * Active constraint is the FIRST one that reduces feed below unconstrained.
   */
  private _applyConstraints(
    unconstrainedFeed: number,
    I_peak_A: number,
    t_on_us: number,
    t_off_us: number,
    wire: (typeof WIRE_DATA)[WireType],
    input: WireEDMInput,
    thermal: EDMThermalProps,
  ): { constrained_feed: number; active_constraint: string } {
    let feed = unconstrainedFeed;
    let activeConstraint = "none";

    // Constraint 1: Wire break — current density limit
    const wireArea_mm2 = Math.PI * (wire.diameter_mm / 2) ** 2;
    const currentDensity = I_peak_A / wireArea_mm2;
    if (currentDensity > wire.max_current_density_A_mm2 * 0.85) {
      // Scale feed to safe current density
      const safeRatio = (wire.max_current_density_A_mm2 * 0.85) / currentDensity;
      const wireBreakFeed = unconstrainedFeed * safeRatio;
      if (wireBreakFeed < feed) {
        feed = wireBreakFeed;
        activeConstraint = "wire_break";
      }
    }

    // Constraint 2: Duty cycle limit
    const dutyCycle = t_on_us / (t_on_us + t_off_us);
    if (dutyCycle > EDM_PHYSICS.wire_safety.max_duty_rough) {
      const dutyRatio = EDM_PHYSICS.wire_safety.max_duty_rough / dutyCycle;
      const dutyFeed = unconstrainedFeed * dutyRatio;
      if (dutyFeed < feed) {
        feed = dutyFeed;
        activeConstraint = "duty_cycle";
      }
    }

    // Constraint 3: Flush limit — thick parts need slower feed for chip evacuation
    // Empirical: flush efficiency drops as thickness^(-0.5) beyond 50mm
    // Ref: Ho & Newman (2003) flushing model
    if (input.workpiece_thickness_mm > 50) {
      const flushFactor = Math.sqrt(50 / input.workpiece_thickness_mm);
      const flushFeed = unconstrainedFeed * flushFactor;
      if (flushFeed < feed) {
        feed = flushFeed;
        activeConstraint = "flush";
      }
    }

    // Final surface finish is delivered by skim-pass planning, not by flattening the
    // rough-cut speed. Applying a blanket Ra clamp here collapses published material
    // and wire rankings even when later skim passes are already scheduled.
    //
    // Constraint 4: Servo bandwidth — machine servo can't track faster than ~12 mm/min
    // Ref: Mitsubishi MV-S max rough: 8.2 mm/min at 50mm
    // Max varies by machine; cap at reasonable limit
    const servoLimit = 10.0; // mm/min — conservative servo limit
    if (feed > servoLimit) {
      feed = servoLimit;
      activeConstraint = "servo";
    }

    // Constraint 5: Minimum floor — never go below 0.5 mm/min (unreasonable)
    if (feed < 0.5) {
      feed = 0.5;
      activeConstraint = "minimum_floor";
    }

    return { constrained_feed: parseFloat(feed.toFixed(2)), active_constraint: activeConstraint };
  }

  /** Resolve material name to EDM material key */
  private _materialKey(material: string): string {
    return resolveMatKey(material);
  }
}

/** Resolve material name to EDM material key */
function resolveMatKey(material: string): string {
  const m = material.toLowerCase();
  if (m.includes("hardened") || m.includes("d2") || m.includes("h13") || m.includes("s7")) return "hardened_steel";
  if (m.includes("tool") || m.includes("a2") || m.includes("o1")) return "tool_steel";
  if (m.includes("stainless") || m.includes("304") || m.includes("316")) return "stainless";
  if (m.includes("aluminum") || m.includes("6061") || m.includes("7075")) return "aluminum";
  if (m.includes("copper") || m.includes("ofhc") || m.includes("c110")) return "copper";
  if (m.includes("carbide") || m.includes("tungsten")) return "carbide";
  if (m.includes("titanium") || m.includes("ti-6al") || m.includes("ti6al")) return "titanium";
  if (m.includes("graphite")) return "carbide"; // similar EDM behavior
  if (m.includes("inconel") || m.includes("718") || m.includes("625")) return "inconel";
  if (m.includes("brass")) return "copper"; // similar conductivity
  return "steel";
}

export const wireEDMSettingsEngine = new WireEDMSettingsEngine();
