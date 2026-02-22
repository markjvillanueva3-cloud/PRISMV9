/**
 * PRISM Manufacturing Intelligence - Decision Tree Engine
 * Pure-computation manufacturing decision logic with no async or registry dependencies.
 *
 * Consolidates scattered decision logic into 6 structured decision trees:
 *   1. selectToolType       — Material + Operation → Tool Type
 *   2. selectInsertGrade    — Material + Hardness + Condition → ISO Insert Grade
 *   3. selectCoolantStrategy — Material + Speed + Operation → Coolant Method
 *   4. selectWorkholding    — Part Geometry + Force → Fixture
 *   5. selectStrategy       — Feature + Constraints → Toolpath Strategy
 *   6. selectApproachRetract — Operation + Context → Entry/Exit Method
 *
 * @version 1.0.0
 * @module DecisionTreeEngine
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DecisionResult {
  reasoning: string[];
  confidence: number;
  warnings: string[];
}

export interface ToolTypeDecision extends DecisionResult {
  tool_type: string;
  geometry: {
    rake_angle?: string;
    relief_angle?: string;
    flutes?: number;
    nose_radius_mm?: number;
  };
  coating: string;
  holder_type: string;
  alternatives: Array<{ tool_type: string; note: string }>;
}

export interface InsertGradeDecision extends DecisionResult {
  grade: string;
  coating: string;
  substrate: string;
  speed_range_m_min: [number, number];
  alternatives: Array<{ grade: string; coating: string; note: string }>;
}

export interface CoolantDecision extends DecisionResult {
  strategy: string;
  pressure_bar: number;
  concentration_pct: number;
  flow_rate_note?: string;
  alternatives: Array<{ strategy: string; note: string }>;
}

export interface WorkholdingDecision extends DecisionResult {
  fixture_type: string;
  clamping_method: string;
  supports?: string[];
  estimated_clamp_force_n?: number;
  alternatives: Array<{ fixture_type: string; note: string }>;
}

export interface StrategyDecision extends DecisionResult {
  strategy: string;
  entry_method: string;
  passes: string;
  step_over?: string;
  alternatives: Array<{ strategy: string; note: string }>;
}

export interface ApproachRetractDecision extends DecisionResult {
  approach: { method: string; description: string; gcode_hint?: string };
  retract: { method: string; description: string; gcode_hint?: string };
  alternatives: Array<{ approach: string; retract: string; note: string }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DECISION_TREES: string[] = [
  "selectToolType",
  "selectInsertGrade",
  "selectCoolantStrategy",
  "selectWorkholding",
  "selectStrategy",
  "selectApproachRetract",
];

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Normalise a free-text material description to an ISO 513 group letter.
 * Accepts the ISO letter directly or common English names.
 */
export function normalizeISOGroup(input: string): string {
  const s = input.trim().toUpperCase();

  // Already a valid single letter
  if (/^[PMKNS H]$/.test(s)) return s;

  // Exact ISO prefix match (e.g. "P10", "M20")
  if (/^[PMKNSH]\d/.test(s)) return s[0];

  const name = input.trim().toLowerCase();

  if (/steel|carbon|alloy steel|low.alloy|high.strength/.test(name)) return "P";
  if (/stainless|duplex|austenitic|ferritic|martensitic/.test(name)) return "M";
  if (/cast.iron|grey.iron|gray.iron|ductile.iron|nodular/.test(name)) return "K";
  if (/alumin|copper|brass|bronze|zinc|magnesium|non.ferrous/.test(name)) return "N";
  if (/superalloy|nickel|titanium|inconel|hastelloy|waspaloy|rene/.test(name)) return "S";
  if (/harden|hardened|tool.steel|hrc|d2|h13|m2|carbide.*hard/.test(name)) return "H";

  // Fallback — return as-is upper-cased first letter; caller may warn
  return s.charAt(0);
}

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Throw a typed validation error. */
function requireParam(value: unknown, name: string): void {
  if (value === undefined || value === null || value === "") {
    throw new Error(`[DecisionTreeEngine] Missing required parameter: "${name}"`);
  }
}

// ============================================================================
// 1. selectToolType
// ============================================================================

export interface SelectToolTypeParams {
  material: string;
  operation: string;
  feature?: string;
  roughing_finishing?: "roughing" | "finishing" | "both";
}

export function selectToolType(params: SelectToolTypeParams): ToolTypeDecision {
  requireParam(params.material, "material");
  requireParam(params.operation, "operation");

  const iso = normalizeISOGroup(params.material);
  const op = params.operation.toLowerCase().trim();
  const feature = (params.feature ?? "").toLowerCase().trim();
  const phase = params.roughing_finishing ?? "both";
  const reasoning: string[] = [];
  const warnings: string[] = [];

  reasoning.push(`ISO material group resolved to: ${iso}`);
  reasoning.push(`Operation: ${op}${feature ? `, feature: ${feature}` : ""}`);

  // --- Turning ---
  if (op === "turning" || op === "turn") {
    const isRoughing = phase === "roughing" || phase === "both";
    const isFinishing = phase === "finishing";

    let insert = isFinishing ? "DNMG/VNMG" : "CNMG/WNMG";
    let nose = isFinishing ? 0.4 : 1.6;
    let rake = isFinishing ? "+5° positive" : "−5° to 0° neutral";
    let relief = "7°";
    let coating = "TiAlN PVD";
    let holder = "ISO external tool holder";
    const alternatives: ToolTypeDecision["alternatives"] = [];

    if (iso === "H") {
      insert = isFinishing ? "VNGA (CBN)" : "CNGA (CBN)";
      coating = "CBN / uncoated ceramic";
      holder = "rigid low-overhang holder";
      rake = "−5° to −7° negative";
      warnings.push("Hardened material: use CBN or ceramic inserts; minimise overhang.");
      reasoning.push("ISO H: selected CBN insert geometry.");
    } else if (iso === "S") {
      insert = isFinishing ? "DCMT (sharp edge)" : "CNMG (positive rake)";
      coating = "PVD TiAlN thin coating";
      rake = "+5° to +8° positive";
      warnings.push("Superalloy: keep tool sharp; use positive rake, PVD coating only.");
      reasoning.push("ISO S: positive rake and sharp edge critical to avoid BUE.");
    } else if (iso === "N") {
      coating = "Uncoated carbide or PCD";
      rake = "+10° to +15° high positive";
      warnings.push("Non-ferrous: PCD preferred at high speed; avoid coatings that promote BUE.");
      reasoning.push("ISO N: high positive rake, uncoated or PCD for clean chip formation.");
    } else if (iso === "K") {
      coating = "CVD Al₂O₃ or coated carbide";
      reasoning.push("ISO K: CVD coating preferred; abrasive wear dominant.");
    }

    reasoning.push(`Nose radius: ${nose} mm for ${phase} operation.`);

    if (isRoughing) {
      alternatives.push({ tool_type: "WNMG wide insert", note: "Stronger edge for interrupted cuts" });
    } else {
      alternatives.push({ tool_type: "VBMT/DCMT sharp insert", note: "Finest finish, reduced depth only" });
    }

    return {
      tool_type: "turning_insert",
      geometry: { rake_angle: rake, relief_angle: relief, nose_radius_mm: nose },
      coating,
      holder_type: holder,
      reasoning,
      confidence: iso === "P" || iso === "M" ? 0.92 : 0.82,
      warnings,
      alternatives,
    };
  }

  // --- Milling ---
  if (op === "milling" || op === "mill") {
    const alternatives: ToolTypeDecision["alternatives"] = [];

    // Face milling
    if (feature === "face" || feature === "facing") {
      const leadAngle = iso === "K" ? "90°" : "45°";
      reasoning.push(`Face milling: ${leadAngle} lead angle facemill selected.`);
      if (iso === "K") warnings.push("Cast iron: 90° lead angle reduces edge chipping.");
      alternatives.push({ tool_type: "endmill_spiral", note: "For small area face milling" });
      return {
        tool_type: "facemill",
        geometry: { rake_angle: "+5°", relief_angle: "7°" },
        coating: iso === "N" ? "Uncoated / PCD" : iso === "H" ? "PVD TiAlN" : "TiAlN PVD",
        holder_type: "shell mill arbor",
        reasoning,
        confidence: 0.90,
        warnings,
        alternatives,
      };
    }

    // Pocket / slot → endmill
    if (feature === "pocket" || feature === "slot" || feature === "") {
      let flutes: number;
      if (iso === "N") {
        flutes = 2;
        reasoning.push("ISO N: 2-flute for chip clearance in aluminium/non-ferrous.");
      } else if (iso === "S" || iso === "H") {
        flutes = 4;
        reasoning.push(`ISO ${iso}: 4-flute variable helix endmill; trochoidal path preferred.`);
        warnings.push("Use trochoidal/adaptive clearing to control radial engagement.");
      } else {
        flutes = 4;
        reasoning.push("Steel/stainless/cast iron: 4-flute endmill standard.");
      }
      alternatives.push({ tool_type: "carbide_ball_nose", note: "If 3D contours present" });
      alternatives.push({ tool_type: "corner_radius_endmill", note: "Improved strength vs sharp corner" });

      return {
        tool_type: "endmill",
        geometry: { rake_angle: iso === "N" ? "+15°" : "+5°", relief_angle: "10°", flutes },
        coating: iso === "N" ? "Uncoated or PCD" : iso === "H" ? "PVD AlCrN" : "TiAlN PVD",
        holder_type: "collet chuck (ER) or hydraulic",
        reasoning,
        confidence: 0.88,
        warnings,
        alternatives,
      };
    }

    // Profile milling
    if (feature === "profile") {
      reasoning.push("Profile milling: endmill with cutter compensation (G41/G42).");
      if (iso === "H") {
        reasoning.push("Hardened steel profile: CBN or ceramic-coated endmill with rigid setup.");
        warnings.push("Hardened material: use CBN-tipped or ceramic endmill; minimise overhang.");
      }
      return {
        tool_type: "endmill",
        geometry: { rake_angle: iso === "H" ? "−5°" : "+5°", relief_angle: "10°", flutes: iso === "N" ? 2 : 4 },
        coating: iso === "N" ? "Uncoated" : iso === "H" ? "CBN or PVD AlCrN" : "TiAlN PVD",
        holder_type: "shrink-fit or hydraulic chuck",
        reasoning,
        confidence: 0.87,
        warnings,
        alternatives: [{ tool_type: "tapered_endmill", note: "For draft-angle profiles" }],
      };
    }

    // Generic milling fallback
    reasoning.push("Generic milling: defaulting to 4-flute endmill.");
    return {
      tool_type: "endmill",
      geometry: { rake_angle: "+5°", relief_angle: "10°", flutes: 4 },
      coating: "TiAlN PVD",
      holder_type: "collet chuck (ER)",
      reasoning,
      confidence: 0.75,
      warnings,
      alternatives: [{ tool_type: "facemill", note: "If facing operation intended" }],
    };
  }

  // --- Drilling ---
  if (op === "drilling" || op === "drill") {
    const diameterHint = feature.match(/(\d+(?:\.\d+)?)\s*mm/);
    const diameter = diameterHint ? parseFloat(diameterHint[1]) : 0;
    const useIndexable = diameter > 20;
    reasoning.push(
      diameter > 0
        ? `Diameter ${diameter} mm → ${useIndexable ? "indexable drill" : "twist drill"}.`
        : "Diameter unknown; defaulting to twist drill (>20mm threshold for indexable)."
    );
    if (diameter === 0) warnings.push("Specify diameter in feature field for accurate tool selection.");
    return {
      tool_type: useIndexable ? "indexable_drill" : "twist_drill",
      geometry: { rake_angle: "+10°", relief_angle: "12°" },
      coating: iso === "N" ? "Uncoated" : "TiAlN PVD",
      holder_type: "drill chuck or collet",
      reasoning,
      confidence: diameter > 0 ? 0.90 : 0.70,
      warnings,
      alternatives: [
        { tool_type: useIndexable ? "solid_carbide_drill" : "indexable_drill", note: "If opposite diameter range applies" },
      ],
    };
  }

  // --- Boring ---
  if (op === "boring" || op === "bore") {
    reasoning.push("Boring: boring bar selected for precision diameter.");
    if (iso === "H") warnings.push("Hardened material boring: use CBN-tipped boring bar.");
    return {
      tool_type: "boring_bar",
      geometry: { rake_angle: "+5°", relief_angle: "7°", nose_radius_mm: 0.4 },
      coating: iso === "H" ? "CBN" : "TiAlN PVD",
      holder_type: "boring head / modular boring system",
      reasoning,
      confidence: 0.90,
      warnings,
      alternatives: [{ tool_type: "single_point_boring_bar", note: "Manual offset for fine diameter control" }],
    };
  }

  // --- Threading ---
  if (op === "threading" || op === "thread") {
    reasoning.push("Threading: evaluating tap vs thread mill.");
    const useThreadMill = iso === "H" || iso === "S";
    if (useThreadMill) {
      warnings.push("Hard/superalloy threading: thread mill strongly preferred over tap.");
    }
    return {
      tool_type: useThreadMill ? "thread_mill" : "tap",
      geometry: { rake_angle: useThreadMill ? "+5°" : "0°", relief_angle: "7°" },
      coating: iso === "H" ? "PVD TiAlN" : "steam oxide or TiN",
      holder_type: useThreadMill ? "collet chuck (ER)" : "tapping chuck with torque limiter",
      reasoning,
      confidence: 0.85,
      warnings,
      alternatives: [
        { tool_type: useThreadMill ? "single_point_thread_turning" : "thread_mill", note: "Alternative threading method" },
      ],
    };
  }

  // Fallback
  warnings.push(`Operation "${op}" not explicitly mapped; returning generic insert recommendation.`);
  return {
    tool_type: "generic_insert",
    geometry: {},
    coating: "TiAlN PVD",
    holder_type: "modular tool holder",
    reasoning,
    confidence: 0.50,
    warnings,
    alternatives: [],
  };
}

// ============================================================================
// 2. selectInsertGrade
// ============================================================================

export interface SelectInsertGradeParams {
  material: string;
  hardness_hrc?: number;
  operation: string;
  condition?: "stable" | "interrupted" | "heavy_interrupted";
}

export function selectInsertGrade(params: SelectInsertGradeParams): InsertGradeDecision {
  requireParam(params.material, "material");
  requireParam(params.operation, "operation");

  const iso = normalizeISOGroup(params.material);
  const condition = params.condition ?? "stable";
  const hrc = params.hardness_hrc ?? 0;
  const reasoning: string[] = [];
  const warnings: string[] = [];

  reasoning.push(`ISO group: ${iso}, condition: ${condition}${hrc > 0 ? `, HRC ${hrc}` : ""}`);

  type GradeRow = [string, string, string]; // [stable, interrupted, heavy_interrupted]
  const gradeMatrix: Record<string, GradeRow> = {
    P: ["P10-P15", "P20-P25", "P30-P40"],
    M: ["M10-M15", "M20-M25", "M30-M40"],
    K: ["K01-K10", "K20",     "K30"],
    N: ["N10",     "N20",     "N30"],
    S: ["S10-S15", "S20-S25", "S30"],
    H: ["H01-H10", "H10-H20", "H20-H30"],
  };

  const conditionIndex = condition === "stable" ? 0 : condition === "interrupted" ? 1 : 2;
  const row = gradeMatrix[iso] ?? gradeMatrix["P"];
  const grade = row[conditionIndex];

  reasoning.push(`ISO 513 grade selected: ${grade} for ${condition} cut.`);

  // Speed ranges per ISO group (m/min)
  const speedMap: Record<string, [number, number]> = {
    P: [150, 350],
    M: [80, 220],
    K: [100, 500],
    N: [200, 1500],
    S: [30, 80],
    H: [80, 200],
  };
  const speed_range = speedMap[iso] ?? [100, 300];

  // Coating logic
  let coating: string;
  let substrate: string;
  const alternatives: InsertGradeDecision["alternatives"] = [];

  if (iso === "P" || iso === "M") {
    if (condition === "stable") {
      coating = "PVD TiAlN";
      substrate = "Fine-grain cemented carbide";
      reasoning.push("Finishing/stable: PVD TiAlN for sharp edge retention.");
    } else {
      coating = "CVD Al₂O₃ + TiCN";
      substrate = "Tough cemented carbide";
      reasoning.push("Roughing/interrupted: CVD multilayer for thermal and abrasion resistance.");
    }
    alternatives.push({ grade: "P25", coating: "AlCrN PVD", note: "High-temp resistant alternative" });

  } else if (iso === "K") {
    if (condition === "stable") {
      coating = "CVD Al₂O₃";
      substrate = "Cemented carbide K grade";
      reasoning.push("Cast iron stable cut: CVD Al₂O₃ dominant for chemical stability.");
    } else {
      coating = "Uncoated ceramic or whisker-reinforced";
      substrate = "Ceramic SiAlON";
      reasoning.push("Interrupted cast iron: ceramic grade for high-speed stability.");
      warnings.push("Ceramic inserts brittle under shock; ensure rigid setup.");
    }
    alternatives.push({ grade: "K10", coating: "Uncoated fine carbide", note: "For moderate speed cast iron" });

  } else if (iso === "N") {
    coating = "Uncoated carbide";
    substrate = "Fine-grain uncoated carbide or PCD";
    reasoning.push("Non-ferrous: coatings can promote BUE; uncoated or PCD preferred.");
    if (condition === "heavy_interrupted") {
      warnings.push("Heavy interrupted non-ferrous: PCD may crack; use uncoated carbide.");
    }
    alternatives.push({ grade: "N10", coating: "PCD", note: "Best for high-volume Al production" });

  } else if (iso === "S") {
    coating = "PVD TiAlN (thin <3 µm)";
    substrate = "Fine-grain tough carbide";
    reasoning.push("Superalloy: thin PVD to maintain sharpness; avoid CVD thermal damage.");
    warnings.push("Superalloy: run lower Vc; monitor tool life closely — rapid notch wear.");
    alternatives.push({ grade: "S20", coating: "PVD AlCrN", note: "Better oxidation resistance for high temp" });

  } else if (iso === "H") {
    if (hrc > 55) {
      coating = "CBN uncoated or PVD coated CBN";
      substrate = "CBN (cubic boron nitride)";
      reasoning.push(`HRC ${hrc} >55: CBN insert required for hardened steel.`);
    } else if (hrc > 45) {
      coating = "PVD TiAlN on carbide";
      substrate = "Micro-grain carbide";
      reasoning.push(`HRC ${hrc} 45-55: coated carbide acceptable; CBN preferred.`);
      warnings.push("Consider upgrading to CBN if tool life is insufficient.");
    } else {
      coating = "PVD AlCrN";
      substrate = "Tough carbide";
      reasoning.push("HRC <45: coated carbide sufficient.");
    }
    alternatives.push({ grade: "H10", coating: "CBN", note: "Best life for >55 HRC" });

  } else {
    coating = "PVD TiAlN";
    substrate = "General-purpose cemented carbide";
    warnings.push(`ISO group "${iso}" not in matrix; defaulted to P-grade logic.`);
  }

  return {
    grade,
    coating,
    substrate,
    speed_range_m_min: speed_range,
    reasoning,
    confidence: gradeMatrix[iso] ? (condition === "stable" ? 0.92 : 0.85) : 0.60,
    warnings,
    alternatives,
  };
}

// ============================================================================
// 3. selectCoolantStrategy
// ============================================================================

export interface SelectCoolantStrategyParams {
  material: string;
  cutting_speed_m_min: number;
  operation: string;
  depth_of_cut_mm?: number;
  tool_has_coolant_through?: boolean;
  machine_has_tsc?: boolean;
}

export function selectCoolantStrategy(params: SelectCoolantStrategyParams): CoolantDecision {
  requireParam(params.material, "material");
  requireParam(params.cutting_speed_m_min, "cutting_speed_m_min");
  requireParam(params.operation, "operation");

  const iso = normalizeISOGroup(params.material);
  const vc = params.cutting_speed_m_min;
  const op = params.operation.toLowerCase().trim();
  const doc = params.depth_of_cut_mm ?? 0;
  const hasTSC = params.machine_has_tsc ?? false;
  const hasThrough = params.tool_has_coolant_through ?? false;
  const reasoning: string[] = [];
  const warnings: string[] = [];

  reasoning.push(`ISO group: ${iso}, Vc: ${vc} m/min, operation: ${op}`);

  const alternatives: CoolantDecision["alternatives"] = [];
  let strategy: string;
  let pressure_bar: number;
  let concentration_pct: number;
  let flow_rate_note: string | undefined;

  // Drilling always needs coolant
  const isDrilling = /drill|tap|ream/.test(op);
  if (isDrilling) {
    reasoning.push("Drilling/tapping/reaming: coolant mandatory for chip evacuation.");
    if (hasTSC && hasThrough) {
      strategy = "through_spindle";
      pressure_bar = 70;
      concentration_pct = 8;
      flow_rate_note = "TSC active through tool for chip flushing";
      reasoning.push("TSC available and tool supports through-coolant; using high-pressure TSC.");
    } else {
      strategy = "flood";
      pressure_bar = 20;
      concentration_pct = 8;
      flow_rate_note = "Direct flood nozzles into hole entrance";
      alternatives.push({ strategy: "through_spindle", note: "Recommended if TSC available" });
    }
    return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.93, warnings, alternatives };
  }

  // ISO H (hardened) — avoid thermal shock on CBN/ceramic
  if (iso === "H") {
    reasoning.push("ISO H: dry or MQL preferred to avoid thermal shock on CBN/ceramic.");
    strategy = "dry";
    pressure_bar = 0;
    concentration_pct = 0;
    alternatives.push({ strategy: "mql", note: "Minimal lubrication acceptable if chatter suppression needed" });
    warnings.push("Never use flood coolant on CBN/ceramic when intermittently interrupted — thermal shock risk.");
    return { strategy, pressure_bar, concentration_pct, reasoning, confidence: 0.88, warnings, alternatives };
  }

  // High speed (>300 m/min) → dry (except N)
  if (vc > 300) {
    if (iso === "N") {
      reasoning.push(`Vc=${vc} >300 m/min on non-ferrous: MQL preferred at high speed.`);
      strategy = "mql";
      pressure_bar = 6;
      concentration_pct = 0;
      flow_rate_note = "MQL 30-50 ml/hr oil mist";
      alternatives.push({ strategy: "dry", note: "Dry acceptable for thin chips at very high speed" });
    } else {
      reasoning.push(`Vc=${vc} >300 m/min: dry machining recommended (ceramic/CBN speed range).`);
      strategy = "dry";
      pressure_bar = 0;
      concentration_pct = 0;
      warnings.push("Ensure adequate chip evacuation via air blast if dry.");
      alternatives.push({ strategy: "mql", note: "MQL for marginal lubrication at high speed" });
    }
    return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.85, warnings, alternatives };
  }

  // ISO S (superalloy) — high pressure
  if (iso === "S") {
    if (hasTSC) {
      strategy = "through_spindle";
      pressure_bar = 70;
      concentration_pct = 8;
      flow_rate_note = "High-pressure TSC critical for chip breaking and heat removal";
      reasoning.push("ISO S: TSC at 70 bar recommended for superalloy heat management.");
    } else {
      strategy = "high_pressure";
      pressure_bar = 70;
      concentration_pct = 10;
      flow_rate_note = "External high-pressure coolant jets aimed at cutting zone";
      reasoning.push("ISO S: no TSC — external high-pressure (70 bar) directed at cutting zone.");
      warnings.push("TSC strongly preferred for superalloy; consider machine capability upgrade.");
    }
    alternatives.push({ strategy: "cryogenic", note: "LN2 cryogenic cooling for maximum tool life in Ti/Ni alloys" });
    return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.90, warnings, alternatives };
  }

  // ISO K (cast iron) — dry preferred
  if (iso === "K") {
    if (isDrilling) {
      strategy = "mql";
      pressure_bar = 6;
      concentration_pct = 0;
      flow_rate_note = "MQL for cast iron drilling chip evacuation";
    } else {
      strategy = "dry";
      pressure_bar = 0;
      concentration_pct = 0;
      flow_rate_note = "Air blast for graphite chip removal";
      reasoning.push("ISO K: dry preferred — graphite lubrication in cast iron; coolant can cause thermal cracking in ceramic.");
      alternatives.push({ strategy: "mql", note: "MQL if tool life insufficient dry" });
    }
    warnings.push("If using ceramic inserts on cast iron, avoid intermittent coolant application.");
    return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.87, warnings, alternatives };
  }

  // ISO M (stainless) — flood high concentration
  if (iso === "M") {
    strategy = "flood";
    pressure_bar = 20;
    concentration_pct = 10;
    flow_rate_note = "High-concentration emulsion (10%) for stainless; maximise flow";
    reasoning.push("ISO M: flood coolant at high concentration for stainless heat and BUE control.");
    alternatives.push({ strategy: "through_spindle", note: "TSC for deep features or slots in stainless" });
    if (doc > 4) warnings.push("Deep cut in stainless: increase coolant flow; monitor for BUE.");
    return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.90, warnings, alternatives };
  }

  // ISO N (non-ferrous) — MQL or flood light
  if (iso === "N") {
    strategy = "mql";
    pressure_bar = 5;
    concentration_pct = 0;
    flow_rate_note = "MQL 20-50 ml/hr; air blast for chip evacuation";
    reasoning.push("ISO N: MQL for non-ferrous prevents material adhesion and BUE.");
    alternatives.push({ strategy: "flood", note: "Flood at low concentration (5%) acceptable for roughing" });
    return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.85, warnings, alternatives };
  }

  // ISO P (steel) default — flood
  strategy = "flood";
  pressure_bar = 20;
  concentration_pct = 7;
  flow_rate_note = "Standard flood at 20 bar, 7% emulsion";
  reasoning.push("ISO P steel: standard flood coolant at 20 bar, 7% concentration.");
  alternatives.push({ strategy: "through_spindle", note: "TSC for drilling or deep pocket features" });
  if (doc > 5) warnings.push("Heavy depth of cut: increase coolant flow rate and concentration.");

  return { strategy, pressure_bar, concentration_pct, flow_rate_note, reasoning, confidence: 0.88, warnings, alternatives };
}

// ============================================================================
// 4. selectWorkholding
// ============================================================================

export interface SelectWorkholdingParams {
  part_geometry: "prismatic" | "cylindrical" | "thin_wall" | "complex" | "disc" | "long_shaft";
  cutting_force_n?: number;
  part_material?: string;
  quantity?: number;
  part_weight_kg?: number;
}

export function selectWorkholding(params: SelectWorkholdingParams): WorkholdingDecision {
  requireParam(params.part_geometry, "part_geometry");

  const geom = params.part_geometry;
  const force = params.cutting_force_n ?? 0;
  const qty = params.quantity ?? 1;
  const weight = params.part_weight_kg ?? 0;
  const reasoning: string[] = [];
  const warnings: string[] = [];

  reasoning.push(`Part geometry: ${geom}`);
  if (force > 0) reasoning.push(`Cutting force: ${force} N`);
  if (qty > 1) reasoning.push(`Quantity: ${qty} parts`);
  if (weight > 0) reasoning.push(`Part weight: ${weight} kg`);

  const alternatives: WorkholdingDecision["alternatives"] = [];
  let fixture_type: string;
  let clamping_method: string;
  let supports: string[] | undefined;
  let estimated_clamp_force_n: number | undefined;

  // Quantity modifiers
  const highQty = qty > 100;
  const veryHighQty = qty > 1000;
  if (veryHighQty) {
    warnings.push("Production volume >1000: consider hydraulic/pneumatic workholding for cycle time.");
    alternatives.push({ fixture_type: "hydraulic_modular_fixture", note: "Rapid loading for high production" });
  } else if (highQty) {
    warnings.push("Volume >100: dedicated fixture recommended over general-purpose setup.");
  }

  // Weight modifiers
  if (weight > 25) {
    warnings.push(`Part weight ${weight} kg: crane/hoist required for loading. Ensure adequate clamp force.`);
  }

  // Force adequacy check
  if (force > 5000) {
    warnings.push(`Cutting force ${force} N is high: verify clamp force adequacy before machining.`);
    estimated_clamp_force_n = Math.round(force * 2.5); // safety factor 2.5
    reasoning.push(`Estimated minimum clamp force: ${estimated_clamp_force_n} N (SF 2.5).`);
  }

  switch (geom) {
    case "prismatic": {
      const jaws = force > 3000 ? "8-inch or larger" : "6-inch";
      fixture_type = `machine_vise_${jaws.replace(/[^a-z0-9]/gi, "_")}`;
      clamping_method = "vise";
      reasoning.push(`Prismatic part: ${jaws} vise selected based on cutting force.`);
      if (qty > 50) {
        clamping_method = "vise_soft_jaws";
        reasoning.push("Medium-volume run: soft jaws for better contact and repeatability.");
      }
      alternatives.push({ fixture_type: "angle_plate_fixture", note: "For multi-face access" });
      alternatives.push({ fixture_type: "fixture_plate_with_clamps", note: "For large prismatic parts" });
      break;
    }

    case "cylindrical": {
      fixture_type = "three_jaw_chuck";
      clamping_method = "three_jaw_self_centering";
      reasoning.push("Cylindrical: 3-jaw chuck for general purpose turning/milling.");
      alternatives.push({ fixture_type: "collet_chuck", note: "Tighter tolerance (<0.01 mm TIR)" });
      alternatives.push({ fixture_type: "four_jaw_chuck", note: "Non-concentric or rectangular parts" });
      if (force > 4000) {
        warnings.push("High force on 3-jaw: verify jaw grip length; minimum 3× diameter engagement.");
      }
      break;
    }

    case "thin_wall": {
      fixture_type = "vacuum_fixture";
      clamping_method = "vacuum_suction";
      supports = ["edge_support_blocks", "internal_bladder_support", "low_melt_alloy_fill"];
      reasoning.push("Thin-wall: vacuum fixture minimises distortion; internal support critical.");
      warnings.push("Thin wall deflection risk: reduce cutting forces; verify part stiffness before clamping.");
      alternatives.push({ fixture_type: "custom_cradle_fixture", note: "For irregular thin-wall shapes" });
      alternatives.push({ fixture_type: "wax_potting_fixture", note: "Full support via low-melt alloy" });
      break;
    }

    case "complex": {
      fixture_type = "custom_fixture_plate";
      clamping_method = "dowel_pin_and_clamp";
      supports = ["locating_pins", "rest_pads", "strap_clamps"];
      reasoning.push("Complex geometry: custom fixture plate with dowel pins for precise datum location.");
      if (veryHighQty) {
        alternatives.push({ fixture_type: "modular_pallet_system", note: "Palletised fixture for automation" });
      }
      alternatives.push({ fixture_type: "tombstone_4th_axis", note: "Multi-face access on 4-axis" });
      break;
    }

    case "disc": {
      fixture_type = "faceplate_or_magnetic_chuck";
      clamping_method = "magnetic_or_faceplate_bolts";
      reasoning.push("Disc geometry: faceplate or magnetic chuck for flat-face clamping.");
      warnings.push("Magnetic chuck: verify part is ferromagnetic; demagnetise after machining.");
      alternatives.push({ fixture_type: "vacuum_chuck", note: "For non-ferrous disc parts" });
      alternatives.push({ fixture_type: "collet_fixture", note: "If disc has central bore" });
      break;
    }

    case "long_shaft": {
      fixture_type = "between_centers";
      clamping_method = "drive_dog_and_live_center";
      reasoning.push("Long shaft: between-centres with drive dog for runout control.");
      const ldRatio = force > 0 ? force / 100 : 0; // proxy; actual L/D would be better
      if (ldRatio > 8 || weight > 5) {
        supports = ["steady_rest", "follow_rest"];
        warnings.push("L/D >8 suspected: add steady rest or follow rest to prevent deflection.");
        reasoning.push("Long slender shaft: follow rest recommended if L/D >8.");
      }
      alternatives.push({ fixture_type: "three_jaw_chuck_with_tailstock", note: "For shorter shafts needing chuck grip" });
      break;
    }

    default: {
      fixture_type = "general_purpose_vise";
      clamping_method = "vise";
      warnings.push(`Unknown geometry "${geom}"; defaulted to general vise.`);
    }
  }

  return {
    fixture_type,
    clamping_method,
    supports,
    estimated_clamp_force_n,
    reasoning,
    confidence: geom !== "complex" ? 0.88 : 0.75,
    warnings,
    alternatives,
  };
}

// ============================================================================
// 5. selectStrategy
// ============================================================================

export interface SelectStrategyParams {
  feature: "pocket" | "slot" | "profile" | "face" | "hole" | "thread" | "3d_surface";
  material: string;
  depth_mm?: number;
  width_mm?: number;
  roughing_finishing?: string;
  wall_count?: number;
}

export function selectStrategy(params: SelectStrategyParams): StrategyDecision {
  requireParam(params.feature, "feature");
  requireParam(params.material, "material");

  const iso = normalizeISOGroup(params.material);
  const feature = params.feature;
  const depth = params.depth_mm ?? 0;
  const width = params.width_mm ?? 0;
  const phase = (params.roughing_finishing ?? "both").toLowerCase();
  const reasoning: string[] = [];
  const warnings: string[] = [];

  reasoning.push(`Feature: ${feature}, ISO group: ${iso}${depth > 0 ? `, depth: ${depth} mm` : ""}${width > 0 ? `, width: ${width} mm` : ""}`);

  const alternatives: StrategyDecision["alternatives"] = [];
  let strategy: string;
  let entry_method: string;
  let passes: string;
  let step_over: string | undefined;

  switch (feature) {
    case "pocket": {
      const deepPocket = depth > 0 && width > 0 && depth > 2 * width;
      const useTrochoidal = deepPocket || iso === "S" || iso === "H";

      if (useTrochoidal) {
        strategy = "trochoidal_adaptive";
        entry_method = "helical_ramp";
        passes = "constant_engagement_trochoidal";
        step_over = "10-15% tool diameter (trochoidal width)";
        reasoning.push(
          deepPocket
            ? "Deep pocket (D > 2×W): trochoidal to manage chip thinning and heat."
            : `ISO ${iso}: trochoidal mandatory to control radial engagement.`
        );
        alternatives.push({ strategy: "peel_milling", note: "Alternative adaptive strategy" });
      } else {
        strategy = "helical_entry_zigzag";
        entry_method = "helical_interpolation";
        passes = "zig_zag_with_island_skip";
        step_over = "40-60% tool diameter";
        reasoning.push("Standard pocket: helical entry + zig-zag passes.");
        alternatives.push({ strategy: "trochoidal_adaptive", note: "For improved tool life or harder materials" });
      }
      alternatives.push({ strategy: "offset_pocket", note: "Consistent chip load for soft materials" });
      break;
    }

    case "slot": {
      if (width > 0 && depth > 0 && Math.abs(width - depth) < 0.1) {
        // width ≈ tool diameter (slotting)
        strategy = "slotting_full_width";
        entry_method = "plunge_or_ramp";
        passes = "single_pass_reduced_feed";
        step_over = "100% — full slot width";
        reasoning.push("Slot width equals tool diameter: full-width slotting, reduce feed 30%.");
        warnings.push("Full-width slotting: reduce feed by 30%; monitor tool deflection.");
      } else {
        strategy = "side_milling_passes";
        entry_method = "helical_ramp";
        passes = "multiple_depth_steps_side_milling";
        step_over = "50% tool diameter radial";
        reasoning.push("Slot wider than tool: side milling passes with axial depth steps.");
      }
      alternatives.push({ strategy: "trochoidal_slot", note: "For hard materials or deep slots" });
      break;
    }

    case "profile": {
      if (phase === "roughing" || phase === "both") {
        strategy = "roughing_offset_passes";
        entry_method = "lead_in_arc";
        passes = "offset_contour_with_stock_allowance";
        reasoning.push("Profile roughing: offset passes leaving finish stock (0.3-0.5 mm).");
      } else {
        strategy = "single_pass_cutter_comp";
        entry_method = "arc_on_tangent_lead_in";
        passes = "single_finish_pass_G41_G42";
        reasoning.push("Profile finishing: single pass with cutter compensation G41/G42.");
      }
      alternatives.push({ strategy: "trochoidal_profile", note: "For harder materials or thin walls" });
      break;
    }

    case "face": {
      const largeArea = width > 100 || depth === 0;
      if (largeArea) {
        strategy = "face_mill_overlap_passes";
        entry_method = "rapid_to_start_position";
        passes = "parallel_overlap_passes_60pct";
        step_over = "60-75% face mill diameter";
        reasoning.push("Large face area: face mill with 60-75% overlap passes.");
      } else {
        strategy = "endmill_spiral_from_center";
        entry_method = "center_start_spiral_out";
        passes = "spiral_outward";
        step_over = "40% tool diameter";
        reasoning.push("Small face area: endmill spiral from centre outward.");
      }
      alternatives.push({ strategy: "face_mill_bi_directional", note: "Faster cycle; check surface finish requirements" });
      break;
    }

    case "hole": {
      const ldRatio = depth > 0 && width > 0 ? depth / width : 0;
      if (ldRatio > 8) {
        strategy = "gun_drill_or_deep_drill";
        entry_method = "pilot_drill_first";
        passes = "gun_drill_single_pass_with_high_pressure_coolant";
        reasoning.push(`L/D ratio ${ldRatio.toFixed(1)} >8: gun drill or pilot + deep drill strategy.`);
        warnings.push("L/D >8: high-pressure through-spindle coolant mandatory for chip evacuation.");
      } else if (ldRatio > 3) {
        strategy = "peck_drilling_G83";
        entry_method = "rapid_to_R_plane";
        passes = "peck_cycle_G83_Q_parameter";
        reasoning.push(`L/D ratio ${ldRatio.toFixed(1)} >3: peck drilling G83 for chip breaking.`);
        alternatives.push({ strategy: "chip_break_drilling_G73", note: "Partial retract if chip size controlled" });
      } else {
        strategy = "standard_drilling";
        entry_method = "rapid_to_R_plane";
        passes = "single_pass_G81";
        reasoning.push("Shallow hole (L/D ≤3): standard drilling cycle G81.");
        if (phase === "finishing") {
          alternatives.push({ strategy: "drill_then_ream", note: "For H7 tolerance holes" });
          alternatives.push({ strategy: "drill_then_bore", note: "For very precise diameter" });
        }
      }
      break;
    }

    case "thread": {
      const isInternal = true; // assume internal unless context provided
      if (width > 0 && width < 6) {
        strategy = "tapping_cycle";
        entry_method = "rapid_to_R_plane";
        passes = "synchronised_tap_cycle_G84";
        reasoning.push(`Small diameter <M6: tapping (G84) preferred.`);
        warnings.push("Use floating tap holder with torque limiter for small taps.");
        alternatives.push({ strategy: "thread_mill", note: "Use if blind hole or hard material" });
      } else {
        strategy = "thread_milling";
        entry_method = "helical_lead_in";
        passes = "single_lead_helix_per_pitch";
        reasoning.push("Thread mill: one tool for multiple pitches; no reversal required.");
        alternatives.push({ strategy: "single_point_thread_turn", note: "For external threads on lathe" });
        alternatives.push({ strategy: "tapping", note: "If straight tap acceptable and dia <M12" });
      }
      if (iso === "H" || iso === "S") {
        warnings.push("Hard/superalloy threading: thread mill strongly preferred; avoid tapping risk.");
      }
      break;
    }

    case "3d_surface": {
      strategy = "ball_nose_scallop_control";
      entry_method = "lead_in_safe_z_then_arc";
      passes = "parallel_or_radial_with_scallop_height_target";
      step_over = "Calculated from scallop height target (typically 0.01-0.05 mm)";
      reasoning.push("3D surface: ball-nose endmill with scallop height control.");
      reasoning.push("Stepover = 2 × sqrt(R² − (R−h)²) where h = scallop height.");
      alternatives.push({ strategy: "waterline_contouring", note: "For steep walls (>70°)" });
      alternatives.push({ strategy: "pencil_milling_cleanup", note: "Corner and fillet cleanup pass" });
      break;
    }

    default: {
      strategy = "standard_milling";
      entry_method = "ramp_or_helical";
      passes = "parallel_passes";
      warnings.push(`Feature "${feature}" not explicitly mapped; using generic strategy.`);
    }
  }

  return {
    strategy,
    entry_method,
    passes,
    step_over,
    reasoning,
    confidence: ["pocket", "hole", "profile", "face"].includes(feature) ? 0.90 : 0.83,
    warnings,
    alternatives,
  };
}

// ============================================================================
// 6. selectApproachRetract
// ============================================================================

export interface SelectApproachRetractParams {
  operation: string;
  material: string;
  wall_thickness_mm?: number;
  cutter_comp?: boolean;
  tool_type?: string;
}

export function selectApproachRetract(params: SelectApproachRetractParams): ApproachRetractDecision {
  requireParam(params.operation, "operation");
  requireParam(params.material, "material");

  const iso = normalizeISOGroup(params.material);
  const op = params.operation.toLowerCase().trim();
  const wallThick = params.wall_thickness_mm ?? 0;
  const cutterComp = params.cutter_comp ?? false;
  const toolType = (params.tool_type ?? "").toLowerCase();
  const reasoning: string[] = [];
  const warnings: string[] = [];

  reasoning.push(`Operation: ${op}, ISO: ${iso}${cutterComp ? ", cutter comp active" : ""}`);

  const alternatives: ApproachRetractDecision["alternatives"] = [];

  // --- Milling profile with cutter comp ---
  if ((op === "milling_profile" || op === "profile") && cutterComp) {
    const isThinWall = wallThick > 0 && wallThick < 3;
    const leadRadius = isThinWall ? Math.max(wallThick * 0.5, 1) : 5;
    reasoning.push(`Arc tangent lead-in: radius ${leadRadius} mm.`);
    if (isThinWall) {
      warnings.push(`Thin wall (${wallThick} mm): reduced lead-in radius ${leadRadius} mm to avoid overcut.`);
    }
    alternatives.push({ approach: "straight_plunge_comp_on", retract: "straight_retract", note: "Simpler but marks may appear at entry" });
    return {
      approach: {
        method: "arc_on_tangent",
        description: `Arc lead-in tangent to contour, radius ${leadRadius} mm (G02/G03)`,
        gcode_hint: `G${iso === "H" ? "01" : "03"} X... Y... R${leadRadius} ; lead-in arc`,
      },
      retract: {
        method: "arc_off_tangent",
        description: `Arc lead-out tangent to contour, radius ${leadRadius} mm`,
        gcode_hint: `G03 X... Y... R${leadRadius} ; lead-out arc then G40`,
      },
      reasoning,
      confidence: 0.91,
      warnings,
      alternatives,
    };
  }

  // --- Milling pocket ---
  if (op === "milling_pocket" || op === "pocket") {
    const useRamp = iso === "H" || iso === "S";
    reasoning.push(useRamp
      ? `ISO ${iso}: ramp entry to reduce shock load at entry.`
      : "Pocket: helical interpolation entry preferred.");
    if (useRamp) warnings.push("Hard/superalloy: avoid helical plunge — use ramp entry to reduce stress.");
    alternatives.push({
      approach: useRamp ? "helical_interpolation" : "ramp_entry",
      retract: "retract_safe_z",
      note: useRamp ? "Helical acceptable if tool is rigid and material softer than HRC45" : "Ramp if no room for helix"
    });
    return {
      approach: {
        method: useRamp ? "ramp_entry" : "helical_interpolation",
        description: useRamp
          ? "Ramped entry at 2-5° angle; avoid direct plunge"
          : "Helical interpolation to depth; helix radius ~75% tool radius",
        gcode_hint: useRamp
          ? "G01 Z-[depth] X+[step] F[ramp_feed] ; ramp at 2-5°"
          : "G03 X... Y... Z-[depth] R[helix_r] F[feed] ; helical interpolation",
      },
      retract: {
        method: "rapid_retract_safe_z",
        description: "Retract to safe Z clearance plane after pocket completion",
        gcode_hint: "G00 Z[safe_z] ; rapid retract",
      },
      reasoning,
      confidence: 0.90,
      warnings,
      alternatives,
    };
  }

  // --- Drilling ---
  if (/drill|tap|ream/.test(op)) {
    reasoning.push("Drilling: rapid to R-plane, then feed to depth, rapid retract.");
    alternatives.push({ approach: "slow_feed_to_surface", retract: "dwell_then_retract", note: "For high-tolerance holes — reduce shock" });
    return {
      approach: {
        method: "rapid_to_R_plane_then_feed",
        description: "Rapid to R-plane clearance, then controlled feed into workpiece",
        gcode_hint: "G98 G81 X... Y... Z-[depth] R[r_plane] F[feed] ; drill cycle",
      },
      retract: {
        method: "rapid_retract_G80",
        description: "Cancel cycle with G80; rapid retract to initial Z",
        gcode_hint: "G80 ; cancel canned cycle",
      },
      reasoning,
      confidence: 0.93,
      warnings,
      alternatives,
    };
  }

  // --- Turning ---
  if (op === "turning" || op === "turn") {
    reasoning.push("Turning: rapid to clearance, 45° diagonal approach, retract Z then X.");
    return {
      approach: {
        method: "rapid_to_clearance_then_diagonal",
        description: "Rapid to XZ clearance point; 45° diagonal feed to start of cut",
        gcode_hint: "G00 X[clearance] Z[start] ; G01 X[cut_start] Z[depth] F[feed]",
      },
      retract: {
        method: "retract_z_then_x",
        description: "Rapid Z retract first (clear part), then X retract to tool change position",
        gcode_hint: "G00 Z[clearance_z] ; G00 X[clearance_x]",
      },
      reasoning,
      confidence: 0.92,
      warnings,
      alternatives: [{ approach: "diagonal_rapid", retract: "simultaneous_xz_retract", note: "For faster cycle time on lathe" }],
    };
  }

  // --- Boring ---
  if (op === "boring" || op === "bore") {
    reasoning.push("Boring: rapid to R-plane, feed to depth, orient spindle and shift for non-dragging retract.");
    warnings.push("Fine boring bar: use spindle orient (M19) + shift before retract to avoid bore wall drag.");
    return {
      approach: {
        method: "rapid_to_R_plane_then_feed",
        description: "Rapid to R-plane; feed at boring feed rate to final depth",
        gcode_hint: "G76 P[tool_edge] Q[shift] R[stock] ; fine boring cycle",
      },
      retract: {
        method: "spindle_orient_then_shift_retract",
        description: "M19 spindle orient; shift tool away from bore wall; rapid retract",
        gcode_hint: "M19 ; G00 X+[shift] ; G00 Z[safe_z]",
      },
      reasoning,
      confidence: 0.88,
      warnings,
      alternatives: [{ approach: "boring_G85", retract: "G85_auto_retract", note: "G85 cycle retracts at feed rate — simpler but slower" }],
    };
  }

  // Generic fallback
  warnings.push(`Operation "${op}" not explicitly mapped; returning generic approach/retract.`);
  return {
    approach: {
      method: "rapid_to_clearance",
      description: "Rapid to safe clearance, then feed to workpiece",
    },
    retract: {
      method: "rapid_retract_safe_z",
      description: "Rapid retract to safe Z after operation",
    },
    reasoning,
    confidence: 0.55,
    warnings,
    alternatives: [],
  };
}

// ============================================================================
// REGISTRY & DISPATCHER
// ============================================================================

/** Metadata for each decision tree. */
export function listDecisionTrees(): Array<{
  name: string;
  description: string;
  required_params: string[];
  optional_params: string[];
}> {
  return [
    {
      name: "selectToolType",
      description: "Selects the appropriate tool type based on material ISO group and machining operation",
      required_params: ["material", "operation"],
      optional_params: ["feature", "roughing_finishing"],
    },
    {
      name: "selectInsertGrade",
      description: "Recommends an ISO 513 insert grade and coating for the given material and cutting condition",
      required_params: ["material", "operation"],
      optional_params: ["hardness_hrc", "condition"],
    },
    {
      name: "selectCoolantStrategy",
      description: "Determines the optimal coolant delivery method and parameters",
      required_params: ["material", "cutting_speed_m_min", "operation"],
      optional_params: ["depth_of_cut_mm", "tool_has_coolant_through", "machine_has_tsc"],
    },
    {
      name: "selectWorkholding",
      description: "Recommends a workholding fixture based on part geometry, cutting force, and quantity",
      required_params: ["part_geometry"],
      optional_params: ["cutting_force_n", "part_material", "quantity", "part_weight_kg"],
    },
    {
      name: "selectStrategy",
      description: "Selects the machining toolpath strategy for a given feature type and constraints",
      required_params: ["feature", "material"],
      optional_params: ["depth_mm", "width_mm", "roughing_finishing", "wall_count"],
    },
    {
      name: "selectApproachRetract",
      description: "Determines the approach and retract method for safe, mark-free entry and exit",
      required_params: ["operation", "material"],
      optional_params: ["wall_thickness_mm", "cutter_comp", "tool_type"],
    },
  ];
}

/**
 * Unified dispatcher — routes to the named decision tree with the given params.
 * Throws `[DecisionTreeEngine]` if the tree name is unrecognised.
 */
export function decide(tree: string, params: Record<string, unknown>): DecisionResult {
  switch (tree) {
    case "selectToolType":
      return selectToolType(params as unknown as SelectToolTypeParams);
    case "selectInsertGrade":
      return selectInsertGrade(params as unknown as SelectInsertGradeParams);
    case "selectCoolantStrategy":
      return selectCoolantStrategy(params as unknown as SelectCoolantStrategyParams);
    case "selectWorkholding":
      return selectWorkholding(params as unknown as SelectWorkholdingParams);
    case "selectStrategy":
      return selectStrategy(params as unknown as SelectStrategyParams);
    case "selectApproachRetract":
      return selectApproachRetract(params as unknown as SelectApproachRetractParams);
    default:
      throw new Error(
        `[DecisionTreeEngine] Unknown decision tree: "${tree}". ` +
        `Available: ${DECISION_TREES.join(", ")}`
      );
  }
}
