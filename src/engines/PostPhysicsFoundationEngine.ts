/**
 * PostPhysicsFoundationEngine — Pipeline Phase 0-1 Integration
 * (Context Resolution + Physics Foundation)
 *
 * Wires every PRISM physics engine into the post-generation pipeline so that
 * every program gets physics-optimized before G-code formatting.
 *
 * Consolidates POST-ULT-MS8 U01–U08:
 *   U01  CatalogContextResolver   — machine/tool/material/holder from catalogs
 *   U02  UltimateSpeedFeedInteg.  — optimal S/F per operation
 *   U03  StabilityLobeInteg.      — chatter-free RPM zones (Altintas & Budak 1995)
 *   U04  DeflectionLimitInteg.    — Euler-Bernoulli cantilever δ = FL³/(3EI)
 *   U05  ThermalBudgetInteg.      — Loewen-Shaw heat partition, coating limits
 *   U06  PowerTorqueBudgetInteg.  — machine torque-speed curve, MRR cap
 *   U07  WearLifePrediction       — Taylor V·T^n = C, cost vs productivity
 *   U08  PartDeflectionInteg.     — thin wall/floor engagement limits
 *
 * References:
 *   Altintas (2012) — Manufacturing Automation, Ch.3-5
 *   Altintas & Budak (1995) — Analytical prediction of stability lobes
 *   Kienzle (1952) — Specific cutting force model
 *   Taylor (1907) — Tool life equation
 *   Loewen & Shaw (1954) — Heat partition in metal cutting
 *   ISO 3002 — Basic quantities in cutting and grinding
 *
 * Actions: resolve_context, calculate_physics, full_foundation
 *
 * @module engines/PostPhysicsFoundationEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

export interface PhysicsFoundationInput {
  // Context (partial — engine resolves the rest)
  machine_brand?: string;
  machine_model?: string;
  material?: string;
  material_iso?: ISOGroup;
  material_hardness_hrc?: number;

  // Per-operation data
  operations: OperationPhysicsInput[];

  // Options
  aggressiveness?: number;                // 0-100, default 50
  optimization_target?: "balanced" | "productivity" | "tool_life" | "surface_finish";
  enable_stability_lobes?: boolean;       // default true
  enable_deflection?: boolean;            // default true
  enable_thermal?: boolean;               // default true
}

export interface OperationPhysicsInput {
  operation_index: number;
  tool_number: number;
  tool_diameter_mm: number;
  tool_flutes?: number;
  tool_material?: "carbide" | "hss" | "ceramic" | "cbn" | "pcd";
  tool_coating?: string;
  tool_length_mm?: number;
  tool_stickout_mm?: number;
  holder_type?: string;

  operation_type:
    | "roughing"
    | "finishing"
    | "semi_finishing"
    | "drilling"
    | "tapping"
    | "boring"
    | "slotting"
    | "profiling"
    | "adaptive"
    | "trochoidal";

  // Current CAM parameters (what user programmed)
  cam_rpm: number;
  cam_feed_mmmin: number;
  cam_doc_mm?: number;
  cam_woc_mm?: number;
  coolant?: "flood" | "mist" | "tsc" | "mql" | "air" | "none";

  // Geometry hints
  wall_thickness_mm?: number;
  pocket_depth_mm?: number;
  max_engagement_deg?: number;
}

export interface PhysicsFoundationResult {
  operations: OperationPhysicsResult[];
  machine_context: ResolvedMachineContext;
  material_context: ResolvedMaterialContext;
  warnings: string[];
  overall_confidence: number; // 0-1
}

export interface OperationPhysicsResult {
  operation_index: number;

  // Optimized parameters
  recommended_rpm: number;
  recommended_feed_mmmin: number;
  recommended_doc_mm?: number;
  recommended_woc_mm?: number;

  // Delta from CAM
  rpm_delta_percent: number;
  feed_delta_percent: number;

  // Physics results
  cutting_force_N: number;
  specific_cutting_force_Nmm2: number;
  power_required_kW: number;
  power_available_kW: number;
  power_utilization_percent: number;
  torque_required_Nm: number;
  torque_available_Nm: number;

  // Stability
  is_stable: boolean;
  stability_margin_percent: number;
  chatter_free_rpm_zones: Array<{ min: number; max: number }>;

  // Deflection
  tool_deflection_mm: number;
  part_deflection_mm?: number;
  deflection_ok: boolean;

  // Thermal
  cutting_temp_C: number;
  coating_limit_C: number;
  thermal_ok: boolean;

  // Wear / Life
  predicted_tool_life_min: number;
  tool_life_consumed_percent: number;

  // Confidence
  confidence: number;
  confidence_factors: string[];

  // Alternatives
  conservative: { rpm: number; feed: number; note: string };
  aggressive: { rpm: number; feed: number; note: string };

  explanations: string[];
}

export interface ResolvedMachineContext {
  brand: string;
  model: string;
  controller: string;
  max_rpm: number;
  max_power_kW: number;
  max_torque_Nm: number;
  base_torque_rpm: number;
  axis_rapids: Record<string, number>;
  accel_g: Record<string, number>;
  resolved_from: string;
}

export interface ResolvedMaterialContext {
  name: string;
  iso_group: string;
  hardness_hrc: number;
  kc1_1: number;
  mc: number;
  density_kg_m3: number;
  thermal_conductivity: number;
  resolved_from: string;
}

// ============================================================================
// CONSTANTS — Material & Machine Databases
// ============================================================================

/** Kienzle specific cutting force constants by ISO group */
const KC_ISO: Record<string, { kc1_1: number; mc: number }> = {
  P: { kc1_1: 1800, mc: 0.25 },
  M: { kc1_1: 2100, mc: 0.25 },
  K: { kc1_1: 1100, mc: 0.25 },
  N: { kc1_1: 700, mc: 0.25 },
  S: { kc1_1: 2800, mc: 0.22 },
  H: { kc1_1: 3200, mc: 0.20 },
};

/** Material thermal and physical properties by ISO group */
const MATERIAL_PROPS: Record<
  string,
  {
    density_kg_m3: number;
    thermal_conductivity_Wm_K: number;
    specific_heat_Jkg_K: number;
    melting_range_C: [number, number];
    hardness_hrc_default: number;
    taylor_n: number;
    taylor_C_mpm: number;
  }
> = {
  P: {
    density_kg_m3: 7850,
    thermal_conductivity_Wm_K: 50,
    specific_heat_Jkg_K: 486,
    melting_range_C: [1425, 1540],
    hardness_hrc_default: 25,
    taylor_n: 0.25,
    taylor_C_mpm: 350,
  },
  M: {
    density_kg_m3: 8000,
    thermal_conductivity_Wm_K: 16,
    specific_heat_Jkg_K: 500,
    melting_range_C: [1375, 1450],
    hardness_hrc_default: 28,
    taylor_n: 0.22,
    taylor_C_mpm: 200,
  },
  K: {
    density_kg_m3: 7200,
    thermal_conductivity_Wm_K: 46,
    specific_heat_Jkg_K: 460,
    melting_range_C: [1130, 1250],
    hardness_hrc_default: 22,
    taylor_n: 0.28,
    taylor_C_mpm: 400,
  },
  N: {
    density_kg_m3: 2700,
    thermal_conductivity_Wm_K: 205,
    specific_heat_Jkg_K: 900,
    melting_range_C: [580, 660],
    hardness_hrc_default: 8,
    taylor_n: 0.40,
    taylor_C_mpm: 800,
  },
  S: {
    density_kg_m3: 4510,
    thermal_conductivity_Wm_K: 7,
    specific_heat_Jkg_K: 520,
    melting_range_C: [1600, 1670],
    hardness_hrc_default: 36,
    taylor_n: 0.20,
    taylor_C_mpm: 120,
  },
  H: {
    density_kg_m3: 7800,
    thermal_conductivity_Wm_K: 42,
    specific_heat_Jkg_K: 480,
    melting_range_C: [1420, 1530],
    hardness_hrc_default: 55,
    taylor_n: 0.18,
    taylor_C_mpm: 100,
  },
};

/** Coating temperature limits (°C) */
const COATING_TEMP_LIMITS: Record<string, number> = {
  TiN: 600,
  TiCN: 450,
  TiAlN: 900,
  AlTiN: 1000,
  AlCrN: 1100,
  nACo: 1200,
  nACRo: 1100,
  DLC: 350,
  CVD_diamond: 700,
  PCD: 700,
  uncoated_carbide: 500,
  uncoated_hss: 300,
  ceramic: 1200,
  cbn: 1300,
};

/** Material name → ISO group resolution */
const MATERIAL_ISO_MAP: Record<string, ISOGroup> = {
  steel: "P",
  "carbon steel": "P",
  "alloy steel": "P",
  "1018": "P",
  "1045": "P",
  "4140": "P",
  "4340": "P",
  "8620": "P",
  "stainless steel": "M",
  "stainless": "M",
  "304": "M",
  "316": "M",
  "316L": "M",
  "17-4": "M",
  "17-4PH": "M",
  "duplex": "M",
  "cast iron": "K",
  "gray iron": "K",
  "ductile iron": "K",
  "CGI": "K",
  aluminum: "N",
  aluminium: "N",
  "6061": "N",
  "7075": "N",
  "2024": "N",
  brass: "N",
  copper: "N",
  bronze: "N",
  titanium: "S",
  "Ti-6Al-4V": "S",
  "Ti64": "S",
  inconel: "S",
  "inconel 718": "S",
  waspaloy: "S",
  hastelloy: "S",
  "hardened steel": "H",
  "tool steel": "H",
  "D2": "H",
  "H13": "H",
  "A2": "H",
  "S7": "H",
  "M2": "H",
};

/** Default machine specs by brand (common VMC platforms) */
const MACHINE_DEFAULTS: Record<
  string,
  {
    controller: string;
    max_rpm: number;
    max_power_kW: number;
    max_torque_Nm: number;
    base_torque_rpm: number;
    rapids: Record<string, number>;
    accel: Record<string, number>;
  }
> = {
  haas: {
    controller: "Haas NGC",
    max_rpm: 8100,
    max_power_kW: 22.4,
    max_torque_Nm: 122,
    base_torque_rpm: 2000,
    rapids: { X: 25400, Y: 25400, Z: 25400 },
    accel: { X: 0.5, Y: 0.5, Z: 0.5 },
  },
  dmg: {
    controller: "Siemens 840D",
    max_rpm: 14000,
    max_power_kW: 28,
    max_torque_Nm: 120,
    base_torque_rpm: 2500,
    rapids: { X: 40000, Y: 40000, Z: 40000 },
    accel: { X: 0.8, Y: 0.8, Z: 0.8 },
  },
  mazak: {
    controller: "Mazatrol SmoothAi",
    max_rpm: 12000,
    max_power_kW: 30,
    max_torque_Nm: 160,
    base_torque_rpm: 1800,
    rapids: { X: 42000, Y: 42000, Z: 42000 },
    accel: { X: 1.0, Y: 1.0, Z: 1.0 },
  },
  okuma: {
    controller: "OSP-P500",
    max_rpm: 15000,
    max_power_kW: 26,
    max_torque_Nm: 119,
    base_torque_rpm: 2000,
    rapids: { X: 40000, Y: 40000, Z: 40000 },
    accel: { X: 0.7, Y: 0.7, Z: 0.7 },
  },
  makino: {
    controller: "Makino Pro6",
    max_rpm: 20000,
    max_power_kW: 26,
    max_torque_Nm: 80,
    base_torque_rpm: 3500,
    rapids: { X: 56000, Y: 56000, Z: 56000 },
    accel: { X: 1.2, Y: 1.2, Z: 1.2 },
  },
  hermle: {
    controller: "Heidenhain TNC640",
    max_rpm: 18000,
    max_power_kW: 35,
    max_torque_Nm: 130,
    base_torque_rpm: 2800,
    rapids: { X: 45000, Y: 45000, Z: 45000 },
    accel: { X: 1.0, Y: 1.0, Z: 1.0 },
  },
  fanuc: {
    controller: "Fanuc 31i-B5",
    max_rpm: 10000,
    max_power_kW: 22,
    max_torque_Nm: 130,
    base_torque_rpm: 1600,
    rapids: { X: 36000, Y: 36000, Z: 36000 },
    accel: { X: 0.6, Y: 0.6, Z: 0.6 },
  },
  default: {
    controller: "Generic",
    max_rpm: 10000,
    max_power_kW: 18,
    max_torque_Nm: 100,
    base_torque_rpm: 2000,
    rapids: { X: 30000, Y: 30000, Z: 30000 },
    accel: { X: 0.5, Y: 0.5, Z: 0.5 },
  },
};

/** Typical stiffness by holder type (N/m) for stability analysis */
const HOLDER_STIFFNESS: Record<string, number> = {
  ER_collet: 8e6,
  hydraulic: 15e6,
  shrink_fit: 20e6,
  milling_chuck: 12e6,
  weldon: 10e6,
  power_chuck: 6e6,
  default: 10e6,
};

/** Coolant effectiveness multiplier for thermal model */
const COOLANT_FACTORS: Record<string, number> = {
  flood: 0.55,
  mist: 0.70,
  tsc: 0.40,
  mql: 0.65,
  air: 0.85,
  none: 1.0,
};

// ============================================================================
// ENGINE
// ============================================================================

export class PostPhysicsFoundationEngine {
  // ─────────────────────────────────────────────────────────────────────────
  // U01: Catalog Context Resolver
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resolve machine, tool, material, and holder context from PRISM catalogs.
   * Accepts partial input and infers the rest using built-in databases.
   */
  resolveContext(input: PhysicsFoundationInput): {
    machine: ResolvedMachineContext;
    material: ResolvedMaterialContext;
  } {
    // ── Machine resolution ──
    const brandKey = (input.machine_brand ?? "").toLowerCase().trim();
    const machSpec = MACHINE_DEFAULTS[brandKey] ?? MACHINE_DEFAULTS["default"];
    const resolvedFrom = MACHINE_DEFAULTS[brandKey]
      ? "catalog_exact"
      : "defaults";

    const machine: ResolvedMachineContext = {
      brand: input.machine_brand ?? "Generic",
      model: input.machine_model ?? "VMC",
      controller: machSpec.controller,
      max_rpm: machSpec.max_rpm,
      max_power_kW: machSpec.max_power_kW,
      max_torque_Nm: machSpec.max_torque_Nm,
      base_torque_rpm: machSpec.base_torque_rpm,
      axis_rapids: { ...machSpec.rapids },
      accel_g: { ...machSpec.accel },
      resolved_from: resolvedFrom,
    };

    // ── Material resolution ──
    let iso: ISOGroup = input.material_iso ?? "P";
    let materialResolved = "defaults";

    if (input.material) {
      const matKey = input.material.toLowerCase().trim();
      // Try exact match first, then partial
      if (MATERIAL_ISO_MAP[matKey]) {
        iso = MATERIAL_ISO_MAP[matKey];
        materialResolved = "catalog_exact";
      } else {
        // Partial match: check if any key is contained in the material string
        for (const [key, group] of Object.entries(MATERIAL_ISO_MAP)) {
          if (matKey.includes(key) || key.includes(matKey)) {
            iso = group;
            materialResolved = "catalog_similar";
            break;
          }
        }
      }
    } else if (input.material_iso) {
      materialResolved = "catalog_exact";
    }

    const matProps = MATERIAL_PROPS[iso];
    const kcData = KC_ISO[iso];

    // Adjust kc1_1 for hardness if provided
    let kc1_1_adj = kcData.kc1_1;
    const hrc = input.material_hardness_hrc ?? matProps.hardness_hrc_default;
    if (input.material_hardness_hrc !== undefined) {
      // Empirical: kc increases ~1.5% per HRC above baseline
      const hrcDelta = hrc - matProps.hardness_hrc_default;
      kc1_1_adj = kcData.kc1_1 * (1 + 0.015 * hrcDelta);
    }

    const material: ResolvedMaterialContext = {
      name: input.material ?? `ISO ${iso} (default)`,
      iso_group: iso,
      hardness_hrc: hrc,
      kc1_1: kc1_1_adj,
      mc: kcData.mc,
      density_kg_m3: matProps.density_kg_m3,
      thermal_conductivity: matProps.thermal_conductivity_Wm_K,
      resolved_from: materialResolved,
    };

    return { machine, material };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U02: Ultimate Speed & Feed Integration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate optimal spindle speed and feed rate for a given operation
   * using the resolved material/machine context. Provides conservative,
   * balanced, and aggressive parameter sets with confidence scoring.
   */
  private calculateSpeedFeed(
    op: OperationPhysicsInput,
    machine: ResolvedMachineContext,
    material: ResolvedMaterialContext,
    aggressiveness: number,
    target: string
  ): {
    rpm: number;
    feed_mmmin: number;
    fz: number;
    vc_mpm: number;
    confidence: number;
    factors: string[];
  } {
    const iso = material.iso_group as ISOGroup;
    const matProps = MATERIAL_PROPS[iso];
    const flutes = op.tool_flutes ?? 4;
    const d = op.tool_diameter_mm;

    // ── Base cutting speed from ISO group + operation type ──
    const baseVcMap: Record<string, Record<string, number>> = {
      P: {
        roughing: 200, finishing: 280, semi_finishing: 240,
        adaptive: 250, trochoidal: 260, slotting: 160,
        profiling: 220, drilling: 100, tapping: 30, boring: 160,
      },
      M: {
        roughing: 120, finishing: 180, semi_finishing: 150,
        adaptive: 150, trochoidal: 160, slotting: 100,
        profiling: 140, drilling: 60, tapping: 20, boring: 100,
      },
      K: {
        roughing: 220, finishing: 300, semi_finishing: 260,
        adaptive: 260, trochoidal: 280, slotting: 180,
        profiling: 240, drilling: 120, tapping: 35, boring: 180,
      },
      N: {
        roughing: 500, finishing: 800, semi_finishing: 650,
        adaptive: 600, trochoidal: 700, slotting: 400,
        profiling: 600, drilling: 200, tapping: 50, boring: 300,
      },
      S: {
        roughing: 50, finishing: 80, semi_finishing: 65,
        adaptive: 60, trochoidal: 70, slotting: 40,
        profiling: 60, drilling: 25, tapping: 10, boring: 40,
      },
      H: {
        roughing: 80, finishing: 140, semi_finishing: 110,
        adaptive: 100, trochoidal: 120, slotting: 60,
        profiling: 100, drilling: 40, tapping: 15, boring: 60,
      },
    };

    const vcBase = baseVcMap[iso]?.[op.operation_type] ?? 200;

    // ── Tool material multiplier ──
    const toolMatMult: Record<string, number> = {
      carbide: 1.0,
      hss: 0.35,
      ceramic: 1.6,
      cbn: 1.8,
      pcd: 2.0,
    };
    const tmMult = toolMatMult[op.tool_material ?? "carbide"] ?? 1.0;

    // ── Hardness correction ──
    // Higher hardness → lower speed
    const hardnessCorr =
      1 - 0.01 * Math.max(0, material.hardness_hrc - matProps.hardness_hrc_default);

    // ── Aggressiveness factor (maps 0-100 to 0.7-1.3) ──
    const aggFactor = 0.7 + (aggressiveness / 100) * 0.6;

    // ── Target bias ──
    let targetMult = 1.0;
    if (target === "productivity") targetMult = 1.15;
    else if (target === "tool_life") targetMult = 0.80;
    else if (target === "surface_finish") targetMult = 0.85;

    // ── Final cutting speed ──
    let vc = vcBase * tmMult * hardnessCorr * aggFactor * targetMult;

    // ── RPM from cutting speed ──
    // n = (Vc × 1000) / (π × d)
    let rpm = (vc * 1000) / (Math.PI * d);
    rpm = Math.min(rpm, machine.max_rpm);
    rpm = Math.round(rpm / 10) * 10; // round to nearest 10

    // Recalculate actual Vc after RPM clamping
    vc = (Math.PI * d * rpm) / 1000;

    // ── Feed per tooth ──
    const baseFzMap: Record<string, number> = {
      P: 0.10,
      M: 0.08,
      K: 0.12,
      N: 0.15,
      S: 0.06,
      H: 0.05,
    };
    let fz = baseFzMap[iso] ?? 0.10;

    // Scale fz with diameter (larger tools → larger fz)
    fz *= Math.pow(d / 10, 0.4);

    // Operation type modifier
    if (op.operation_type === "finishing") fz *= 0.5;
    else if (op.operation_type === "semi_finishing") fz *= 0.7;
    else if (op.operation_type === "slotting") fz *= 0.8;
    else if (op.operation_type === "adaptive" || op.operation_type === "trochoidal")
      fz *= 1.1;

    fz *= aggFactor;
    if (target === "surface_finish") fz *= 0.65;
    else if (target === "tool_life") fz *= 0.85;

    // ── Feed rate (mm/min) ──
    const feed_mmmin = Math.round(fz * flutes * rpm);

    // ── Confidence scoring ──
    const factors: string[] = [];
    let confidence = 0.85;

    if (machine.resolved_from === "defaults") {
      confidence -= 0.15;
      factors.push("machine_from_defaults");
    }
    if (material.resolved_from === "defaults") {
      confidence -= 0.15;
      factors.push("material_from_defaults");
    }
    if (!op.tool_material) {
      confidence -= 0.05;
      factors.push("tool_material_assumed_carbide");
    }
    if (!op.tool_flutes) {
      confidence -= 0.05;
      factors.push("flutes_assumed_4");
    }
    if (op.tool_coating) {
      confidence += 0.03;
      factors.push("coating_specified");
    }
    if (op.cam_doc_mm && op.cam_woc_mm) {
      confidence += 0.05;
      factors.push("engagement_known");
    }

    confidence = Math.max(0.2, Math.min(1.0, confidence));

    return { rpm, feed_mmmin, fz, vc_mpm: vc, confidence, factors };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U03: Stability Lobe Integration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compute chatter-free RPM zones using simplified Altintas & Budak (1995):
   *   a_lim = -1 / (2 × Ks × Re[G(jω)])
   * Simplified as: a_lim = (2 × Fc_max) / (Ks × N_teeth)
   * with RPM-dependent lobe variation.
   */
  private stabilityLobeAnalysis(
    rpm: number,
    doc_mm: number,
    op: OperationPhysicsInput,
    material: ResolvedMaterialContext
  ): {
    is_stable: boolean;
    stability_margin_percent: number;
    chatter_free_zones: Array<{ min: number; max: number }>;
    max_stable_doc_mm: number;
  } {
    const flutes = op.tool_flutes ?? 4;
    const d = op.tool_diameter_mm;
    const kc = material.kc1_1;

    // Holder / system stiffness
    const holderKey = op.holder_type ?? "default";
    const k_sys =
      HOLDER_STIFFNESS[holderKey] ?? HOLDER_STIFFNESS["default"];

    // Tool stiffness contribution (cantilever approximation)
    // k_tool = 3EI / L³ where I = πd⁴/64, E = 600 GPa (carbide)
    const E_tool =
      op.tool_material === "hss" ? 200e9 : 600e9; // Pa
    const stickout =
      (op.tool_stickout_mm ?? op.tool_length_mm ?? d * 4) / 1000; // m
    const I_tool = (Math.PI * Math.pow(d / 1000, 4)) / 64; // m⁴
    const k_tool = (3 * E_tool * I_tool) / Math.pow(stickout, 3); // N/m

    // Combined stiffness (series)
    const k_combined = 1 / (1 / k_sys + 1 / k_tool);

    // Natural frequency estimate: f_n = (1/2π) × √(k/m)
    // Effective mass ≈ tool mass + 0.24 × holder equivalent mass
    const rho_tool =
      op.tool_material === "carbide" ? 14500 : 7850; // kg/m³
    const tool_volume =
      Math.PI * Math.pow(d / 2000, 2) * stickout; // m³
    const m_eff = rho_tool * tool_volume * 1.3; // +30% for holder contribution
    const f_n = (1 / (2 * Math.PI)) * Math.sqrt(k_combined / Math.max(m_eff, 0.001));

    // Damping ratio (typical 0.02-0.05)
    const zeta = 0.03;

    // ── Stability limit calculation ──
    // Altintas & Budak: a_lim = -1 / (2 × Ks_avg × Re[G(jωc)])
    // For simplified single-mode: a_lim = k_combined / (Ks × flutes)
    // With lobe modulation at lobes near RPM:
    const Ks = kc * 1e6; // N/m² (kc is in N/mm²)
    const a_lim_base =
      k_combined / (Ks * flutes) * 1000; // convert m → mm

    // Lobe modulation: stability varies with RPM/f_n ratio
    // Lobes occur at RPM_lobe = 60 × f_n / (N × (k + ε))  for integer k
    // Between lobes → stability improves
    const toothPassFreq = (rpm * flutes) / 60;
    const freqRatio = toothPassFreq / Math.max(f_n, 100);

    // Phase angle between successive teeth
    const epsilon = freqRatio - Math.floor(freqRatio);
    // Stability improvement factor at sweet spots (between lobes)
    const lobeFactor = 1 + 2 * zeta * Math.abs(Math.sin(Math.PI * epsilon));

    const a_lim = a_lim_base * lobeFactor;

    const is_stable = doc_mm <= a_lim;
    const stability_margin =
      a_lim > 0 ? ((a_lim - doc_mm) / a_lim) * 100 : -100;

    // ── Find chatter-free RPM zones (top 5 stable pockets) ──
    const zones: Array<{ min: number; max: number }> = [];
    const maxSearchRPM = Math.min(rpm * 2, 30000);
    const stepRPM = 100;

    let zoneStart = -1;
    for (let testRPM = 500; testRPM <= maxSearchRPM; testRPM += stepRPM) {
      const tpf = (testRPM * flutes) / 60;
      const fr = tpf / Math.max(f_n, 100);
      const eps = fr - Math.floor(fr);
      const lf = 1 + 2 * zeta * Math.abs(Math.sin(Math.PI * eps));
      const testAlim = a_lim_base * lf;

      if (testAlim >= doc_mm) {
        if (zoneStart < 0) zoneStart = testRPM;
      } else {
        if (zoneStart >= 0) {
          zones.push({ min: zoneStart, max: testRPM - stepRPM });
          zoneStart = -1;
        }
      }
    }
    if (zoneStart >= 0) {
      zones.push({ min: zoneStart, max: maxSearchRPM });
    }

    // Keep only top 5 widest zones
    zones.sort((a, b) => (b.max - b.min) - (a.max - a.min));
    const topZones = zones.slice(0, 5);
    topZones.sort((a, b) => a.min - b.min);

    return {
      is_stable,
      stability_margin_percent: Math.round(stability_margin * 10) / 10,
      chatter_free_zones: topZones,
      max_stable_doc_mm: Math.round(a_lim * 1000) / 1000,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U04: Deflection Limit Integration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Euler-Bernoulli cantilever beam deflection:
   *   δ = F × L³ / (3 × E × I)
   * where I = π × d⁴ / 64
   *
   * Enforces 0.05mm maximum. Reduces DOC/feed if exceeded.
   */
  private toolDeflectionCheck(
    cuttingForce_N: number,
    op: OperationPhysicsInput
  ): {
    deflection_mm: number;
    ok: boolean;
    max_force_for_limit_N: number;
    reduction_factor: number;
  } {
    const d = op.tool_diameter_mm / 1000; // m
    const E =
      (op.tool_material ?? "carbide") === "hss" ? 200e9 : 600e9; // Pa
    const L =
      (op.tool_stickout_mm ?? op.tool_length_mm ?? op.tool_diameter_mm * 4) /
      1000; // m
    const I = (Math.PI * Math.pow(d, 4)) / 64; // m⁴

    // δ = F × L³ / (3 × E × I)
    const deflection_m = (cuttingForce_N * Math.pow(L, 3)) / (3 * E * I);
    const deflection_mm = deflection_m * 1000;

    const MAX_DEFLECTION_MM = 0.05;
    const ok = deflection_mm <= MAX_DEFLECTION_MM;

    // Maximum force before exceeding deflection limit
    const max_force =
      (MAX_DEFLECTION_MM / 1000) * ((3 * E * I) / Math.pow(L, 3));

    // If over limit, reduction factor to apply to DOC/feed
    const reduction_factor = ok
      ? 1.0
      : Math.sqrt(max_force / Math.max(cuttingForce_N, 0.1));

    return {
      deflection_mm: Math.round(deflection_mm * 10000) / 10000,
      ok,
      max_force_for_limit_N: Math.round(max_force),
      reduction_factor: Math.round(reduction_factor * 1000) / 1000,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U05: Thermal Budget Integration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Loewen-Shaw heat partition model (simplified):
   *   T = T_ambient + (1 - β) × Fc × Vc / (ρ × c × Q_coolant)
   *
   * β = heat partition to chip (0.5-0.8 typical)
   * Ensures tool-chip interface temp stays below coating limits.
   */
  private thermalBudgetCheck(
    cuttingForce_N: number,
    vc_mpm: number,
    op: OperationPhysicsInput,
    material: ResolvedMaterialContext
  ): {
    cutting_temp_C: number;
    coating_limit_C: number;
    thermal_ok: boolean;
    max_vc_for_thermal_mpm: number;
  } {
    const iso = material.iso_group as ISOGroup;
    const matProps = MATERIAL_PROPS[iso];

    const T_ambient = 25; // °C

    // Heat partition ratio β (fraction to chip)
    // Higher conductivity workpiece → less heat to tool
    const beta = Math.min(
      0.85,
      0.50 + 0.3 * (matProps.thermal_conductivity_Wm_K / 50)
    );

    // Vc in m/s
    const vc_ms = vc_mpm / 60;

    // Coolant effectiveness
    const coolantFactor =
      COOLANT_FACTORS[op.coolant ?? "flood"] ?? COOLANT_FACTORS["flood"];

    // Simplified Loewen-Shaw:
    // Power into tool interface = (1-β) × Fc × Vc
    // Temperature rise ≈ power / (thermal mass flow rate)
    // We use a calibrated empirical model:
    // T_rise = C_thermal × (1-β) × Fc × vc_ms × coolantFactor / (k × √(vc_ms × d/1000))
    // where C_thermal is calibrated to match experimental data
    const d_m = op.tool_diameter_mm / 1000;
    const k_wp = matProps.thermal_conductivity_Wm_K;

    const thermalDenom = k_wp * Math.sqrt(Math.max(vc_ms * d_m, 1e-6));
    const C_thermal = 0.35; // empirical calibration constant
    const T_rise =
      C_thermal *
      (1 - beta) *
      cuttingForce_N *
      vc_ms *
      coolantFactor /
      Math.max(thermalDenom, 0.01);

    const cutting_temp = T_ambient + T_rise;

    // Resolve coating limit
    let coating = op.tool_coating?.toLowerCase().replace(/[\s-]/g, "_") ?? "";
    if (!coating) {
      // Infer from tool material
      if (op.tool_material === "ceramic") coating = "ceramic";
      else if (op.tool_material === "cbn") coating = "cbn";
      else if (op.tool_material === "pcd") coating = "CVD_diamond";
      else if (op.tool_material === "hss") coating = "uncoated_hss";
      else coating = "TiAlN"; // default carbide coating
    }
    const coating_limit =
      COATING_TEMP_LIMITS[coating] ??
      COATING_TEMP_LIMITS["TiAlN"] ??
      900;

    const thermal_ok = cutting_temp <= coating_limit;

    // Max Vc that keeps temp below coating limit
    const maxTrise = coating_limit - T_ambient;
    const max_vc_ms =
      maxTrise > 0
        ? (maxTrise * Math.max(thermalDenom, 0.01)) /
          (C_thermal * (1 - beta) * Math.max(cuttingForce_N, 1) * coolantFactor)
        : vc_ms;
    const max_vc_mpm = max_vc_ms * 60;

    return {
      cutting_temp_C: Math.round(cutting_temp),
      coating_limit_C: coating_limit,
      thermal_ok,
      max_vc_for_thermal_mpm: Math.round(max_vc_mpm),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U06: Power & Torque Budget Integration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verify cutting parameters against machine torque-speed curve.
   * Cap MRR at machine limits. Uses spindle motor constant-torque /
   * constant-power regions.
   *
   * P = Fc × Vc / (60 × 1000 × η)  where η = 0.80-0.90
   * T = P × 9549 / n
   */
  private powerTorqueCheck(
    cuttingForce_N: number,
    vc_mpm: number,
    rpm: number,
    machine: ResolvedMachineContext
  ): {
    power_required_kW: number;
    power_available_kW: number;
    power_utilization_pct: number;
    torque_required_Nm: number;
    torque_available_Nm: number;
    torque_utilization_pct: number;
    is_safe: boolean;
    max_force_at_limit_N: number;
  } {
    const eta = 0.85; // spindle mechanical efficiency

    // Required power: P = Fc × Vc / (60000 × η)  [kW]
    const P_required = (cuttingForce_N * vc_mpm) / (60000 * eta);

    // Required torque: T = P × 9549 / n  [Nm]
    const T_required = rpm > 0 ? (P_required * 9549) / rpm : 0;

    // Available torque from torque-speed curve
    // Below base RPM: constant torque
    // Above base RPM: constant power → torque falls off
    const T_available =
      rpm <= machine.base_torque_rpm
        ? machine.max_torque_Nm
        : Math.min(
            machine.max_torque_Nm,
            (machine.max_power_kW * 9549) / rpm
          );

    // Available power
    const P_available =
      rpm <= machine.base_torque_rpm
        ? Math.min(
            machine.max_power_kW,
            (machine.max_torque_Nm * rpm) / 9549
          )
        : machine.max_power_kW;

    const powerUtil = P_available > 0 ? (P_required / P_available) * 100 : 0;
    const torqueUtil =
      T_available > 0 ? (T_required / T_available) * 100 : 0;

    // Safe if both under 95%
    const is_safe = powerUtil <= 95 && torqueUtil <= 95;

    // Max force before hitting either limit
    const maxForcePower =
      P_available > 0
        ? (P_available * 60000 * eta) / Math.max(vc_mpm, 1)
        : Infinity;
    const maxForceTorque =
      T_available > 0 && rpm > 0
        ? (T_available * rpm) / (9549 / (60000 * eta / Math.max(vc_mpm, 1)))
        : Infinity;
    const max_force = Math.min(maxForcePower, maxForceTorque);

    return {
      power_required_kW: Math.round(P_required * 100) / 100,
      power_available_kW: Math.round(P_available * 100) / 100,
      power_utilization_pct: Math.round(powerUtil * 10) / 10,
      torque_required_Nm: Math.round(T_required * 100) / 100,
      torque_available_Nm: Math.round(T_available * 100) / 100,
      torque_utilization_pct: Math.round(torqueUtil * 10) / 10,
      is_safe,
      max_force_at_limit_N: Math.round(max_force),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U07: Wear & Life Prediction
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Taylor tool life: V × T^n = C
   *   T_life = (C / V)^(1/n)
   *
   * n = 0.18-0.50 depending on tool/work material combination
   * C = constant from material database
   *
   * Optimizes speed for cost vs productivity trade-off.
   */
  private wearLifePrediction(
    vc_mpm: number,
    op: OperationPhysicsInput,
    material: ResolvedMaterialContext,
    target: string
  ): {
    predicted_life_min: number;
    consumed_percent: number;
    optimal_vc_cost_mpm: number;
    optimal_vc_prod_mpm: number;
  } {
    const iso = material.iso_group as ISOGroup;
    const matProps = MATERIAL_PROPS[iso];

    // Tool material adjustments to Taylor constants
    let n = matProps.taylor_n;
    let C = matProps.taylor_C_mpm;

    // Adjust for tool material
    if (op.tool_material === "hss") {
      n *= 0.8;
      C *= 0.3;
    } else if (op.tool_material === "ceramic") {
      n *= 1.2;
      C *= 1.8;
    } else if (op.tool_material === "cbn") {
      n *= 1.3;
      C *= 2.2;
    } else if (op.tool_material === "pcd") {
      n *= 1.4;
      C *= 2.5;
    }
    // carbide = baseline (multiplier 1.0)

    // Coating bonus to Taylor C
    const coatingBonus: Record<string, number> = {
      TiAlN: 1.3,
      AlTiN: 1.4,
      AlCrN: 1.5,
      nACo: 1.6,
      TiN: 1.1,
      TiCN: 1.15,
      DLC: 1.2,
    };
    const coatKey = op.tool_coating ?? "";
    C *= coatingBonus[coatKey] ?? 1.0;

    // Hardness adjustment: higher hardness reduces C
    const hrcDelta = material.hardness_hrc - matProps.hardness_hrc_default;
    C *= Math.pow(0.98, Math.max(0, hrcDelta));

    // Taylor: T = (C / V)^(1/n)
    const T_life = Math.pow(C / Math.max(vc_mpm, 1), 1 / n);

    // Estimated cutting time for this operation (based on typical part)
    // Without part geometry, estimate 5 min per operation
    const estimatedCutTime = 5; // min
    const consumed = (estimatedCutTime / Math.max(T_life, 0.1)) * 100;

    // Gilbert's optimum cutting speed for minimum cost:
    // V_cost = C / ((1/n - 1) × (Tc + Ct/Cm))^n
    // Where Tc = tool change time, Ct = tool cost per edge, Cm = machine rate
    // Use reasonable defaults
    const Tc = 2; // min tool change
    const Ct_over_Cm = 3; // tool cost / machine rate ratio in minutes
    const costExponent = (1 / n - 1) * (Tc + Ct_over_Cm);
    const optimal_vc_cost =
      costExponent > 0 ? C / Math.pow(costExponent, n) : vc_mpm;

    // Maximum production rate speed (ignore tool cost):
    // V_prod = C / ((1/n - 1) × Tc)^n
    const prodExponent = (1 / n - 1) * Tc;
    const optimal_vc_prod =
      prodExponent > 0 ? C / Math.pow(prodExponent, n) : vc_mpm * 1.2;

    return {
      predicted_life_min: Math.round(T_life * 10) / 10,
      consumed_percent: Math.round(consumed * 10) / 10,
      optimal_vc_cost_mpm: Math.round(optimal_vc_cost),
      optimal_vc_prod_mpm: Math.round(optimal_vc_prod),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // U08: Part Deflection Integration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Thin wall and floor deflection analysis.
   * Reduces engagement for walls thinner than 3× tool diameter.
   *
   * Wall modeled as fixed-free plate:
   *   δ_wall ≈ F × h³ / (E_wp × t³ × w)  (simplified plate bending)
   *
   * Where h = wall height (pocket_depth), t = wall thickness, w = engaged length
   */
  private partDeflectionCheck(
    cuttingForce_N: number,
    op: OperationPhysicsInput,
    material: ResolvedMaterialContext
  ): {
    part_deflection_mm: number | undefined;
    ok: boolean;
    max_engagement_factor: number;
    recommendation: string;
  } {
    if (op.wall_thickness_mm === undefined) {
      return {
        part_deflection_mm: undefined,
        ok: true,
        max_engagement_factor: 1.0,
        recommendation: "No wall thickness provided — skipping part deflection analysis",
      };
    }

    const t = op.wall_thickness_mm; // mm
    const d = op.tool_diameter_mm; // mm
    const h = op.pocket_depth_mm ?? (d * 2); // mm (default 2×d if not given)

    // Workpiece Young's modulus (simplified by ISO group)
    const E_wp_GPa: Record<string, number> = {
      P: 200, M: 200, K: 170, N: 70, S: 114, H: 210,
    };
    const E_wp = (E_wp_GPa[material.iso_group] ?? 200) * 1e3; // MPa

    // Engaged cutting length along wall = doc
    const doc = op.cam_doc_mm ?? d; // mm

    // Wall deflection (cantilever plate approximation):
    // δ = F × h³ / (3 × E × I_wall)
    // I_wall = w × t³ / 12, w = doc (engaged length)
    const I_wall = (doc * Math.pow(t, 3)) / 12; // mm⁴
    const delta_wall =
      I_wall > 0
        ? (cuttingForce_N * Math.pow(h, 3)) / (3 * E_wp * I_wall)
        : 999;

    // Acceptable deflection for thin walls: typically 0.02-0.05mm
    // Tighter for finishing
    const MAX_WALL_DEFL =
      op.operation_type === "finishing" ? 0.02 : 0.05;
    const ok = delta_wall <= MAX_WALL_DEFL;

    // If wall < 3× tool diameter, limit engagement
    let engagementFactor = 1.0;
    let recommendation = "";

    if (t < 3 * d) {
      // Progressive reduction: thinner wall → less engagement
      const ratio = t / (3 * d);
      engagementFactor = Math.max(0.15, ratio);
      recommendation = `Thin wall (${t}mm < 3×${d}mm). Reduce radial engagement to ${Math.round(engagementFactor * 100)}%`;
    }

    if (!ok) {
      // Calculate force reduction needed
      const forceRatio = MAX_WALL_DEFL / Math.max(delta_wall, 0.001);
      engagementFactor = Math.min(engagementFactor, Math.sqrt(forceRatio));
      recommendation += recommendation
        ? `. Wall deflection ${delta_wall.toFixed(3)}mm exceeds ${MAX_WALL_DEFL}mm limit — reduce DOC/WOC`
        : `Wall deflection ${delta_wall.toFixed(3)}mm exceeds ${MAX_WALL_DEFL}mm limit — reduce DOC/WOC by ${Math.round((1 - engagementFactor) * 100)}%`;
    }

    if (ok && !recommendation) {
      recommendation = `Wall deflection ${delta_wall.toFixed(3)}mm within ${MAX_WALL_DEFL}mm limit`;
    }

    return {
      part_deflection_mm: Math.round(delta_wall * 10000) / 10000,
      ok,
      max_engagement_factor: Math.round(engagementFactor * 1000) / 1000,
      recommendation,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core: Kienzle Cutting Force Model
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Kienzle cutting force:
   *   Fc = kc1.1 × b × h^(1-mc)
   *
   * Where b = axial DOC (ap), h = feed per tooth (fz), kc1.1 and mc from material.
   */
  private kienzleForce(
    fz_mm: number,
    doc_mm: number,
    woc_mm: number,
    material: ResolvedMaterialContext,
    flutes: number,
    d: number
  ): {
    Fc_N: number;
    kc_Nmm2: number;
    Fc_per_tooth_N: number;
    mrr_cm3min?: number;
  } {
    const h = Math.max(fz_mm, 0.001); // chip thickness ≈ fz (simplified)
    const b = doc_mm; // width of cut in engagement direction

    // Specific cutting force: kc = kc1.1 × h^(-mc)
    const kc = material.kc1_1 * Math.pow(h, -material.mc); // N/mm²

    // Force per tooth: Fc_tooth = kc × b × h
    const Fc_tooth = kc * b * h; // N

    // Total cutting force (all teeth in cut simultaneously)
    // Number of teeth in cut depends on engagement angle
    const engagementAngle = Math.acos(
      Math.max(-1, Math.min(1, 1 - (2 * woc_mm) / d))
    );
    const teethInCut = Math.max(1, (flutes * engagementAngle) / (2 * Math.PI));
    const Fc = Fc_tooth * teethInCut;

    return {
      Fc_N: Math.round(Fc * 10) / 10,
      kc_Nmm2: Math.round(kc),
      Fc_per_tooth_N: Math.round(Fc_tooth * 10) / 10,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: calculate_physics
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate full physics for all operations given resolved context.
   * This is the main workhorse that runs U02-U08 for each operation.
   */
  calculatePhysics(input: PhysicsFoundationInput): PhysicsFoundationResult {
    const { machine, material } = this.resolveContext(input);
    const warnings: string[] = [];
    const aggressiveness = input.aggressiveness ?? 50;
    const target = input.optimization_target ?? "balanced";
    const enableStability = input.enable_stability_lobes !== false;
    const enableDeflection = input.enable_deflection !== false;
    const enableThermal = input.enable_thermal !== false;

    if (machine.resolved_from === "defaults") {
      warnings.push(
        `Machine resolved from defaults — specify machine_brand for better accuracy`
      );
    }
    if (material.resolved_from === "defaults") {
      warnings.push(
        `Material resolved from defaults — specify material or material_iso for better accuracy`
      );
    }

    const opResults: OperationPhysicsResult[] = [];
    let totalConfidence = 0;

    for (const op of input.operations) {
      const result = this.processOperation(
        op,
        machine,
        material,
        aggressiveness,
        target,
        enableStability,
        enableDeflection,
        enableThermal,
        warnings
      );
      opResults.push(result);
      totalConfidence += result.confidence;
    }

    const overall_confidence =
      input.operations.length > 0
        ? Math.round((totalConfidence / input.operations.length) * 100) / 100
        : 0;

    return {
      operations: opResults,
      machine_context: machine,
      material_context: material,
      warnings,
      overall_confidence,
    };
  }

  /**
   * Process a single operation through all physics modules (U02-U08).
   */
  private processOperation(
    op: OperationPhysicsInput,
    machine: ResolvedMachineContext,
    material: ResolvedMaterialContext,
    aggressiveness: number,
    target: string,
    enableStability: boolean,
    enableDeflection: boolean,
    enableThermal: boolean,
    warnings: string[]
  ): OperationPhysicsResult {
    const explanations: string[] = [];
    const flutes = op.tool_flutes ?? 4;
    const d = op.tool_diameter_mm;

    // ── U02: Speed & Feed ──
    const sf = this.calculateSpeedFeed(
      op,
      machine,
      material,
      aggressiveness,
      target
    );

    let rpm = sf.rpm;
    let feed = sf.feed_mmmin;
    let fz = sf.fz;
    let vc = sf.vc_mpm;
    let doc = op.cam_doc_mm ?? d * 0.5;
    let woc = op.cam_woc_mm ?? d * 0.5;

    explanations.push(
      `Speed/Feed: Vc=${vc.toFixed(0)} m/min → RPM=${rpm}, Fz=${fz.toFixed(3)}mm → F=${feed} mm/min`
    );

    // ── Kienzle cutting force ──
    const force = this.kienzleForce(fz, doc, woc, material, flutes, d);
    explanations.push(
      `Kienzle: kc=${force.kc_Nmm2} N/mm², Fc=${force.Fc_N}N (${force.Fc_per_tooth_N}N/tooth)`
    );

    // ── U03: Stability Lobe Analysis ──
    let stabilityResult = {
      is_stable: true,
      stability_margin_percent: 100,
      chatter_free_zones: [{ min: 500, max: machine.max_rpm }] as Array<{
        min: number;
        max: number;
      }>,
      max_stable_doc_mm: doc * 2,
    };

    if (enableStability) {
      stabilityResult = this.stabilityLobeAnalysis(rpm, doc, op, material);

      if (!stabilityResult.is_stable) {
        // Try to find a stable RPM in the nearest chatter-free zone
        let adjusted = false;
        for (const zone of stabilityResult.chatter_free_zones) {
          if (Math.abs(zone.min - rpm) < rpm * 0.3 || Math.abs(zone.max - rpm) < rpm * 0.3) {
            // Pick the RPM in this zone closest to our target
            const newRPM =
              Math.abs(zone.min - rpm) < Math.abs(zone.max - rpm)
                ? zone.min
                : zone.max;
            explanations.push(
              `Stability: Chatter at RPM=${rpm}. Shifted to stable zone RPM=${newRPM} (margin: ${stabilityResult.stability_margin_percent}%)`
            );
            rpm = newRPM;
            vc = (Math.PI * d * rpm) / 1000;
            feed = Math.round(fz * flutes * rpm);
            adjusted = true;

            // Re-check stability at new RPM
            stabilityResult = this.stabilityLobeAnalysis(rpm, doc, op, material);
            break;
          }
        }

        if (!adjusted) {
          // Reduce DOC to max stable DOC
          const newDoc = Math.min(doc, stabilityResult.max_stable_doc_mm * 0.9);
          explanations.push(
            `Stability: No nearby stable RPM zone. Reducing DOC from ${doc.toFixed(2)}mm to ${newDoc.toFixed(2)}mm`
          );
          doc = newDoc;
          // Recompute stability
          stabilityResult = this.stabilityLobeAnalysis(rpm, doc, op, material);
        }
      } else {
        explanations.push(
          `Stability: OK — margin ${stabilityResult.stability_margin_percent}%, max stable DOC=${stabilityResult.max_stable_doc_mm.toFixed(2)}mm`
        );
      }
    }

    // Recompute force after any DOC adjustment
    const finalForce = this.kienzleForce(fz, doc, woc, material, flutes, d);

    // ── U04: Tool Deflection ──
    let deflResult = {
      deflection_mm: 0,
      ok: true,
      max_force_for_limit_N: Infinity,
      reduction_factor: 1.0,
    };

    if (enableDeflection) {
      deflResult = this.toolDeflectionCheck(finalForce.Fc_N, op);

      if (!deflResult.ok) {
        const rf = deflResult.reduction_factor;
        explanations.push(
          `Deflection: ${deflResult.deflection_mm}mm exceeds 0.05mm limit. Reducing feed/DOC by factor ${rf.toFixed(2)}`
        );
        // Reduce feed and DOC
        fz *= rf;
        feed = Math.round(fz * flutes * rpm);
        doc *= rf;
        // Recheck
        const reducedForce = this.kienzleForce(fz, doc, woc, material, flutes, d);
        deflResult = this.toolDeflectionCheck(reducedForce.Fc_N, op);
      } else {
        explanations.push(
          `Deflection: ${deflResult.deflection_mm}mm — OK (limit 0.05mm)`
        );
      }
    }

    // ── U05: Thermal Budget ──
    let thermalResult = {
      cutting_temp_C: 25,
      coating_limit_C: 900,
      thermal_ok: true,
      max_vc_for_thermal_mpm: 9999,
    };

    if (enableThermal) {
      thermalResult = this.thermalBudgetCheck(
        finalForce.Fc_N,
        vc,
        op,
        material
      );

      if (!thermalResult.thermal_ok) {
        // Reduce cutting speed to stay within thermal limit
        const newVc = Math.min(vc, thermalResult.max_vc_for_thermal_mpm * 0.95);
        explanations.push(
          `Thermal: ${thermalResult.cutting_temp_C}°C exceeds coating limit ${thermalResult.coating_limit_C}°C. Reducing Vc from ${vc.toFixed(0)} to ${newVc.toFixed(0)} m/min`
        );
        vc = newVc;
        rpm = Math.round((vc * 1000) / (Math.PI * d) / 10) * 10;
        rpm = Math.min(rpm, machine.max_rpm);
        vc = (Math.PI * d * rpm) / 1000;
        feed = Math.round(fz * flutes * rpm);
        // Recheck thermal
        thermalResult = this.thermalBudgetCheck(
          finalForce.Fc_N,
          vc,
          op,
          material
        );
      } else {
        explanations.push(
          `Thermal: ${thermalResult.cutting_temp_C}°C — OK (coating limit ${thermalResult.coating_limit_C}°C)`
        );
      }
    }

    // ── U06: Power & Torque Budget ──
    const powerResult = this.powerTorqueCheck(
      finalForce.Fc_N,
      vc,
      rpm,
      machine
    );

    if (!powerResult.is_safe) {
      // Reduce feed to bring power/torque within limits
      const powerRatio = Math.min(
        powerResult.power_available_kW / Math.max(powerResult.power_required_kW, 0.01),
        powerResult.torque_available_Nm / Math.max(powerResult.torque_required_Nm, 0.01)
      );
      const reductionFactor = Math.sqrt(powerRatio * 0.9); // 90% of limit
      fz *= reductionFactor;
      feed = Math.round(fz * flutes * rpm);
      explanations.push(
        `Power/Torque: ${powerResult.power_required_kW}kW/${powerResult.torque_required_Nm}Nm exceeds limits. Reduced feed by factor ${reductionFactor.toFixed(2)}`
      );
      warnings.push(
        `Op${op.operation_index}: Power budget exceeded — feed reduced`
      );
    } else {
      explanations.push(
        `Power: ${powerResult.power_required_kW}kW / ${powerResult.power_available_kW}kW (${powerResult.power_utilization_pct}%). ` +
          `Torque: ${powerResult.torque_required_Nm}Nm / ${powerResult.torque_available_Nm}Nm (${powerResult.torque_utilization_pct}%)`
      );
    }

    // ── U07: Wear & Life ──
    const wearResult = this.wearLifePrediction(vc, op, material, target);
    explanations.push(
      `Tool life: ${wearResult.predicted_life_min} min (Taylor V·T^n=C). ` +
        `Cost-optimal Vc=${wearResult.optimal_vc_cost_mpm} m/min, ` +
        `Productivity-optimal Vc=${wearResult.optimal_vc_prod_mpm} m/min`
    );

    // ── U08: Part Deflection ──
    const partDefl = this.partDeflectionCheck(
      finalForce.Fc_N,
      op,
      material
    );

    if (partDefl.part_deflection_mm !== undefined) {
      if (!partDefl.ok) {
        // Apply engagement reduction
        woc *= partDefl.max_engagement_factor;
        explanations.push(
          `Part deflection: ${partDefl.recommendation}`
        );
        warnings.push(
          `Op${op.operation_index}: ${partDefl.recommendation}`
        );
      } else {
        explanations.push(`Part deflection: ${partDefl.recommendation}`);
      }
    }

    // ── Build alternatives ──
    const conservativeFactor = 0.75;
    const aggressiveFactor = 1.25;

    const conservative = {
      rpm: Math.round(rpm * conservativeFactor / 10) * 10,
      feed: Math.round(feed * conservativeFactor * 0.85),
      note: `Conservative: −25% RPM, −36% feed. Maximizes tool life, minimizes chatter risk`,
    };

    const aggressive = {
      rpm: Math.min(Math.round(rpm * aggressiveFactor / 10) * 10, machine.max_rpm),
      feed: Math.round(feed * aggressiveFactor * 1.1),
      note: `Aggressive: +25% RPM, +37% feed. Maximizes MRR but increases wear and thermal load`,
    };

    // ── Deltas from CAM ──
    const rpm_delta =
      op.cam_rpm > 0
        ? ((rpm - op.cam_rpm) / op.cam_rpm) * 100
        : 0;
    const feed_delta =
      op.cam_feed_mmmin > 0
        ? ((feed - op.cam_feed_mmmin) / op.cam_feed_mmmin) * 100
        : 0;

    if (Math.abs(rpm_delta) > 5 || Math.abs(feed_delta) > 5) {
      explanations.push(
        `CAM delta: RPM ${rpm_delta > 0 ? "+" : ""}${rpm_delta.toFixed(1)}%, Feed ${feed_delta > 0 ? "+" : ""}${feed_delta.toFixed(1)}%`
      );
    }

    // ── Merge confidence factors ──
    let confidence = sf.confidence;
    const confFactors = [...sf.factors];

    if (!enableStability) confFactors.push("stability_disabled");
    if (!enableDeflection) confFactors.push("deflection_disabled");
    if (!enableThermal) confFactors.push("thermal_disabled");
    if (!stabilityResult.is_stable) {
      confidence -= 0.1;
      confFactors.push("stability_marginal");
    }
    if (!deflResult.ok) {
      confidence -= 0.1;
      confFactors.push("deflection_adjusted");
    }
    if (!thermalResult.thermal_ok) {
      confidence -= 0.1;
      confFactors.push("thermal_adjusted");
    }
    confidence = Math.max(0.15, Math.min(1.0, confidence));

    return {
      operation_index: op.operation_index,

      recommended_rpm: rpm,
      recommended_feed_mmmin: feed,
      recommended_doc_mm: Math.round(doc * 1000) / 1000,
      recommended_woc_mm: Math.round(woc * 1000) / 1000,

      rpm_delta_percent: Math.round(rpm_delta * 10) / 10,
      feed_delta_percent: Math.round(feed_delta * 10) / 10,

      cutting_force_N: finalForce.Fc_N,
      specific_cutting_force_Nmm2: finalForce.kc_Nmm2,
      power_required_kW: powerResult.power_required_kW,
      power_available_kW: powerResult.power_available_kW,
      power_utilization_percent: powerResult.power_utilization_pct,
      torque_required_Nm: powerResult.torque_required_Nm,
      torque_available_Nm: powerResult.torque_available_Nm,

      is_stable: stabilityResult.is_stable,
      stability_margin_percent: stabilityResult.stability_margin_percent,
      chatter_free_rpm_zones: stabilityResult.chatter_free_zones,

      tool_deflection_mm: deflResult.deflection_mm,
      part_deflection_mm: partDefl.part_deflection_mm,
      deflection_ok: deflResult.ok && partDefl.ok,

      cutting_temp_C: thermalResult.cutting_temp_C,
      coating_limit_C: thermalResult.coating_limit_C,
      thermal_ok: thermalResult.thermal_ok,

      predicted_tool_life_min: wearResult.predicted_life_min,
      tool_life_consumed_percent: wearResult.consumed_percent,

      confidence: Math.round(confidence * 100) / 100,
      confidence_factors: confFactors,

      conservative,
      aggressive,
      explanations,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: full_foundation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Full pipeline Phase 0-1: resolve context + calculate physics for all
   * operations in one call. This is the primary entry point for the
   * post-processing pipeline.
   */
  fullFoundation(input: PhysicsFoundationInput): PhysicsFoundationResult {
    log.info(
      `PostPhysicsFoundation: Processing ${input.operations.length} operations ` +
        `(material=${input.material ?? input.material_iso ?? "auto"}, ` +
        `machine=${input.machine_brand ?? "auto"}, ` +
        `target=${input.optimization_target ?? "balanced"}, ` +
        `aggressiveness=${input.aggressiveness ?? 50})`
    );

    const result = this.calculatePhysics(input);

    // Summary logging
    for (const op of result.operations) {
      const deltaStr =
        Math.abs(op.rpm_delta_percent) > 1 || Math.abs(op.feed_delta_percent) > 1
          ? ` | delta: RPM ${op.rpm_delta_percent > 0 ? "+" : ""}${op.rpm_delta_percent}%, F ${op.feed_delta_percent > 0 ? "+" : ""}${op.feed_delta_percent}%`
          : "";
      log.info(
        `  Op${op.operation_index}: RPM=${op.recommended_rpm} F=${op.recommended_feed_mmmin} ` +
          `| Fc=${op.cutting_force_N}N P=${op.power_required_kW}kW ` +
          `| stable=${op.is_stable} defl=${op.tool_deflection_mm}mm temp=${op.cutting_temp_C}°C ` +
          `| life=${op.predicted_tool_life_min}min conf=${op.confidence}${deltaStr}`
      );
    }

    log.info(
      `PostPhysicsFoundation: Complete — overall confidence ${result.overall_confidence}, ` +
        `${result.warnings.length} warnings`
    );

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACTION: resolve_context (standalone)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Standalone context resolution — resolve machine/material without
   * running physics calculations. Useful for pipeline pre-check.
   */
  resolveContextAction(input: PhysicsFoundationInput): {
    machine: ResolvedMachineContext;
    material: ResolvedMaterialContext;
    warnings: string[];
  } {
    const { machine, material } = this.resolveContext(input);
    const warnings: string[] = [];

    if (machine.resolved_from === "defaults") {
      warnings.push(
        `Machine '${input.machine_brand ?? "unknown"}' not in catalog — using generic defaults`
      );
    }
    if (material.resolved_from === "defaults") {
      warnings.push(
        `Material not resolved from catalog — using ISO ${material.iso_group} defaults`
      );
    }

    log.info(
      `PostPhysicsFoundation: Context resolved — ` +
        `machine=${machine.brand} ${machine.model} (${machine.resolved_from}), ` +
        `material=${material.name} ISO-${material.iso_group} (${material.resolved_from})`
    );

    return { machine, material, warnings };
  }

  /** Supported actions for this engine. */
  getSupportedActions(): string[] {
    return ["resolve_context", "calculate_physics", "full_foundation"];
  }
}

export const postPhysicsFoundationEngine = new PostPhysicsFoundationEngine();
