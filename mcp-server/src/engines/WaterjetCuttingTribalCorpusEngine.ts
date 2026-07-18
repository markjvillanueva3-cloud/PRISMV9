/**
 * WaterjetCuttingTribalCorpusEngine — abrasive-waterjet operator-wisdom corpus
 *
 * Closes the iter20 P2 "waterjet pipeline" gap. Same proven 5-axis tribal-
 * corpus pattern as iter44 / iter46 / iter47 — operation × material × abrasive
 * × pressure × symptom — surfacing the operator wisdom that separates a Q5
 * mirror-edge cut from a striated Q1 reject at 4× the abrasive cost.
 *
 * Tribal-specialist soul rule: every tip carries handbook-grade attribution
 * (Flow / OMAX / KMT / WARDJet / Bystronic AWJ + Machinery's Handbook §AWJ +
 * JM Die operator-captured corpus). Confidence-weighted; <0.75 = draft.
 *
 * Edge-quality classes Q1-Q5 (Zeng 1992; OMAX Quality Index): Q5 mirror-Ra
 * <0.4µm (slow); Q3 economic compromise; Q1 separation cut only.
 *
 * Reference: Flow Mach 4c §3 (Cutting Parameters); OMAX MaxiemAEM §4
 *   (Quality Index); KMT Streamline SL-V §5 (Pressure/Abrasive); WARDJet
 *   Z-Series §3 (Abrasive Handling); Bystronic ByJet §4 (Edge Quality);
 *   Machinery's Handbook 31st ed §AWJ; Zeng 1992 "Quality Classification";
 *   JM Die operator-captured corpus 2024-08..2025-01.
 *
 * @version 1.0.0
 * @module WaterjetCuttingTribalCorpusEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type WaterjetOperation = "thin_sheet_cut" | "thick_plate_cut" | "piercing" | "stack_cut" | "fine_geometry" | "bevel_cut" | "drilling";
export type WaterjetMaterial = "mild_steel" | "stainless_steel" | "aluminum" | "titanium" | "inconel" | "stone_glass" | "composite_carbon" | "rubber_foam";
export type Abrasive = "garnet_80_mesh" | "garnet_120_mesh" | "garnet_50_mesh" | "no_abrasive_pure";
export type PressureClass = "low_40ksi" | "standard_60ksi" | "high_87ksi" | "ultra_high_94ksi";
export type WaterjetSymptom =
  | "kerf_taper_excessive"
  | "edge_striation"
  | "abrasive_clogging"
  | "pierce_delamination"
  | "stream_deflection"
  | "blowback_thick_plate"
  | "orifice_wear"
  | "mixing_tube_wear"
  | "garnet_consumption_high"
  | null;
export type OperatorSkill = "entry" | "intermediate" | "master";

interface WaterjetTipRecord {
  tip: string;
  source: string;
  confidence: number;
  applicable_operations?: WaterjetOperation[];
  applicable_materials?: WaterjetMaterial[];
  applicable_abrasives?: Abrasive[];
  applicable_pressures?: PressureClass[];
  applicable_symptoms?: NonNullable<WaterjetSymptom>[];
}

export interface WaterjetCorpusInput {
  operation: WaterjetOperation;
  material: WaterjetMaterial;
  abrasive: Abrasive;
  pressure_class: PressureClass;
  material_thickness_mm: number;
  operator_skill_level: OperatorSkill;
  recent_symptom?: WaterjetSymptom;
  top_n?: number;
  min_confidence?: number;
}

export interface RankedWaterjetTip {
  tip: string;
  source: string;
  confidence: number;
  match_score: number;
  draft: boolean;
}

export interface WaterjetCorpusResult {
  top_tips: RankedWaterjetTip[];
  recommended_action_priority: AtomicValue<string>;
  escalation_needed: boolean;
  escalation_reason: string | null;
  warnings: string[];
  source: string;
}

const TIP_BANK: WaterjetTipRecord[] = [
  // Abrasive selection
  { tip: "Garnet 80 mesh = general-purpose default; 120 mesh for Ra <2.5µm finish; 50 mesh for thick plate (>50mm) — finer = better edge, slower cut",
    source: "Flow Mach 4c §3.2 (Abrasive Matrix) + OMAX MaxiemAEM §4.1",
    confidence: 0.92,
    applicable_abrasives: ["garnet_80_mesh", "garnet_120_mesh", "garnet_50_mesh"] },
  { tip: "Pure waterjet (no abrasive) — ONLY for rubber/foam/food/cardboard <12mm; metals and composites need garnet",
    source: "KMT Streamline §5.3 + Machinery's Handbook §AWJ",
    confidence: 0.94,
    applicable_abrasives: ["no_abrasive_pure"],
    applicable_materials: ["rubber_foam"] },
  // Pressure
  { tip: "60 ksi = standard; 87-94 ksi = 2× faster but 3× orifice wear ($150 vs $50/run); ultra-high only pays for production volume",
    source: "KMT Streamline §5.2 (Pressure Economics) + JM Die James 2024-12",
    confidence: 0.88,
    applicable_pressures: ["standard_60ksi", "high_87ksi", "ultra_high_94ksi"] },
  // Kerf taper
  { tip: "Kerf taper compensation — tilt head 0.5-2° per side based on Q-class; OMAX Tilt-A-Jet / Flow Dynamic Waterjet do this automatically",
    source: "OMAX MaxiemAEM §4.3 (Tilt-A-Jet) + Flow Mach 4c §3.6 (Dynamic Waterjet)",
    confidence: 0.91,
    applicable_symptoms: ["kerf_taper_excessive"] },
  // Edge striation
  { tip: "Edge striation (Q1-Q2 banding) — reduce feed rate 30-50% per Zeng 1992 quality model; striation = cut speed > stream-jet-energy-removal rate",
    source: "Zeng 1992 §4 + Bystronic ByJet §4.4",
    confidence: 0.89,
    applicable_symptoms: ["edge_striation"] },
  // Piercing
  { tip: "Pierce thick (>25mm) composites — LOW pressure dynamic pierce (40-60% of cutting pressure) 2-5 sec; full-power pierce delaminates carbon fiber",
    source: "Flow Mach 4c §3.5 + WARDJet Z-Series §3.7 (Composite Piercing)",
    confidence: 0.93,
    applicable_operations: ["piercing"],
    applicable_materials: ["composite_carbon"],
    applicable_symptoms: ["pierce_delamination"] },
  { tip: "Pierce stack (multi-layer) — increase pressure 10-20% AND use 80-mesh; layer-boundaries deflect the jet without enough energy",
    source: "OMAX MaxiemAEM §4.5 (Stack Cutting)",
    confidence: 0.85,
    applicable_operations: ["stack_cut", "piercing"] },
  // Wear parts
  { tip: "Orifice life — 60 ksi ≈ 100hr; 87 ksi ≈ 30hr; 94 ksi ≈ 20hr. Inspect Ra of leading edge of cut every 20hr; rising Ra = orifice wear",
    source: "KMT Streamline §5.6 (Orifice Wear Curve) + Flow Mach 4c §3.9",
    confidence: 0.87,
    applicable_symptoms: ["orifice_wear", "stream_deflection"] },
  { tip: "Mixing tube — ROCTEC 100/500 last 80-200hr; replace when ID grows >0.5mm above nominal (calipers + bore mic); worn tube = energy loss",
    source: "WARDJet Z-Series §3.5 + Boride ROCTEC Specifications",
    confidence: 0.86,
    applicable_symptoms: ["mixing_tube_wear"] },
  // Material-specific
  { tip: "Titanium — garnet 80 mesh + 60-87ksi; cold-cutting NO HAZ (huge advantage over plasma); ideal for aerospace post-machining",
    source: "Flow Mach 4c §3.7 (Titanium) + Machinery's Handbook §Reactive Metals",
    confidence: 0.92,
    applicable_materials: ["titanium"] },
  { tip: "Stainless — 87ksi + 80 mesh; deburr-friendly edge (no recast layer like laser); food/medical grade post-cut surface",
    source: "OMAX MaxiemAEM §4.7 + JM Die Tomas 2024-09",
    confidence: 0.88,
    applicable_materials: ["stainless_steel"] },
  { tip: "Stone/glass — 120 mesh + 40-60ksi (LOW pressure, prevents fracture); pierce at 30% pressure ramped 5-10 sec",
    source: "Flow Mach 4c §3.8 (Glass) + Bystronic ByJet §4.6 (Stone)",
    confidence: 0.86,
    applicable_materials: ["stone_glass"],
    applicable_pressures: ["low_40ksi", "standard_60ksi"] },
  // Geometry
  { tip: "Fine geometry (<5mm features) — slow feed by 50% on direction-change; jet lag offsets the cut path otherwise",
    source: "OMAX MaxiemAEM §4.8 (Sharp Corners)",
    confidence: 0.84,
    applicable_operations: ["fine_geometry"] },
  // Abrasive handling
  { tip: "Garnet hopper level — keep above 30% (anti-bridging); below 30%, hopper geometry causes inconsistent feed; rinse mineral fines every 100hr",
    source: "WARDJet Z-Series §3.4 (Abrasive Hopper) + JM Die James 2024-11",
    confidence: 0.83,
    applicable_symptoms: ["abrasive_clogging", "garnet_consumption_high"] },
  // Safety
  { tip: "Waterjet safety — eye protection MANDATORY (15-20 µm garnet rebound + 60ksi water = projectile); never reach under operating jet",
    source: "ANSI B11.10 §6 + KMT Streamline Safety Manual §2",
    confidence: 0.99 },
  // Setup
  { tip: "Pre-flight — verify (1) abrasive bin >30%, (2) orifice/mixing-tube serviced, (3) high-pressure circuit pressurized, (4) catcher water level, (5) emergency stops accessible",
    source: "Flow Mach 4c Pre-Use Inspection §3.0 + OMAX MaxiemAEM §4.0",
    confidence: 0.95,
    applicable_operations: ["thin_sheet_cut", "thick_plate_cut", "piercing", "stack_cut", "fine_geometry", "bevel_cut", "drilling"] },
  // Bevel
  { tip: "Bevel cut — Tilt-A-Jet/Dynamic Waterjet head ±45°; manual taper-comp impossible for full bevels >5° on production parts",
    source: "OMAX Tilt-A-Jet §4.4 + Flow Dynamic §3.6",
    confidence: 0.88,
    applicable_operations: ["bevel_cut"] },
  // Thick plate
  { tip: "Thick plate >100mm — reduce feed to <50 mm/min on first pass; underpass-overpass strategy 2-3 passes vs single slow plunge",
    source: "Flow Mach 4c §3.4 (Thick-Plate Strategy)",
    confidence: 0.85,
    applicable_operations: ["thick_plate_cut"],
    applicable_symptoms: ["blowback_thick_plate"] },
  // Composites
  { tip: "Composite/carbon-fiber — garnet 120 mesh + 60ksi NOT higher pressure; high pressure delaminates; AWJ is THE preferred method (no thermal damage)",
    source: "Machinery's Handbook §Composite + WARDJet §3.8",
    confidence: 0.91,
    applicable_materials: ["composite_carbon"] },
  // Drilling
  { tip: "Drilling small holes (<5mm) — pure-water pre-pierce then start abrasive; full-abrasive pierce blows out the entry corner",
    source: "OMAX MaxiemAEM §4.9 + Flow Mach 4c §3.5 (Small-Hole Drilling)",
    confidence: 0.83,
    applicable_operations: ["drilling"] },
];

export class WaterjetCuttingTribalCorpusEngine {
  surface(input: WaterjetCorpusInput): WaterjetCorpusResult {
    if (!input || !input.operation || !input.material || !input.abrasive || !input.pressure_class || input.material_thickness_mm == null || !input.operator_skill_level) {
      throw new Error("WaterjetCuttingTribalCorpusEngine.surface: operation + material + abrasive + pressure_class + material_thickness_mm + operator_skill_level required");
    }
    if (input.material_thickness_mm <= 0) {
      throw new Error("WaterjetCuttingTribalCorpusEngine.surface: material_thickness_mm must be positive");
    }

    const warnings: string[] = [];
    const topN = input.top_n ?? 5;
    const minConfidence = input.min_confidence ?? 0.60;

    const scored: RankedWaterjetTip[] = [];
    for (const tip of TIP_BANK) {
      let match = 0;
      if (tip.applicable_operations?.includes(input.operation)) match += 0.20;
      else if (!tip.applicable_operations) match += 0.05;
      if (tip.applicable_materials?.includes(input.material)) match += 0.20;
      else if (!tip.applicable_materials) match += 0.05;
      if (tip.applicable_abrasives?.includes(input.abrasive)) match += 0.15;
      else if (!tip.applicable_abrasives) match += 0.05;
      if (tip.applicable_pressures?.includes(input.pressure_class)) match += 0.10;
      else if (!tip.applicable_pressures) match += 0.05;
      if (input.recent_symptom && tip.applicable_symptoms?.includes(input.recent_symptom)) {
        match += 0.35;
      }

      const finalScore = match * tip.confidence;
      if (tip.confidence >= minConfidence && match >= 0.20) {
        scored.push({
          tip: tip.tip,
          source: tip.source,
          confidence: tip.confidence,
          match_score: Number(finalScore.toFixed(3)),
          draft: tip.confidence < 0.75,
        });
      }
    }

    scored.sort((a, b) => b.match_score - a.match_score);
    const topTips = scored.slice(0, topN);

    // Action priority
    let priority: string;
    if (input.recent_symptom !== null && input.recent_symptom !== undefined) {
      priority = `URGENT — ${input.recent_symptom} requires immediate intervention (orifice/mixing-tube wear → scrap risk + replacement cost)`;
    } else if (input.operator_skill_level === "entry") {
      priority = "GUIDED — entry-level operator, review safety + tips before cut (high-pressure jet hazard + abrasive cost)";
    } else if (input.material === "titanium" || input.material === "composite_carbon" || input.material === "stone_glass") {
      priority = `ELEVATED — ${input.material} cutting; specialized abrasive/pressure required (over-pressure delaminates composites; high pressure fractures stone)`;
    } else if (input.material_thickness_mm > 100) {
      priority = `ELEVATED — thick plate >${input.material_thickness_mm}mm; underpass-overpass strategy + slow feed required`;
    } else {
      priority = "ADVISORY — waterjet tips for situational awareness during cut";
    }

    // Escalation
    let escalationNeeded = false;
    let escalationReason: string | null = null;
    if (input.operator_skill_level === "entry" && input.recent_symptom !== null && input.recent_symptom !== undefined) {
      escalationNeeded = true;
      escalationReason = `Entry-level operator + active waterjet symptom ${input.recent_symptom} — escalate to intermediate/master before next cut (orifice $50-200 + scrapped plate)`;
      warnings.push(escalationReason);
    }
    // Entry + composite/stone → escalate (delamination/fracture cost)
    if (input.operator_skill_level === "entry" && (input.material === "composite_carbon" || input.material === "stone_glass")) {
      escalationNeeded = true;
      const reason = `Entry-level operator + ${input.material} — escalate (over-pressure delaminates/fractures, no recovery; pressure-class selection load-bearing)`;
      escalationReason = escalationReason ? escalationReason + "; " + reason : reason;
      warnings.push(reason);
    }

    if (topTips.length === 0) {
      warnings.push(`No tips matched (operation=${input.operation}, material=${input.material}, abrasive=${input.abrasive}) — extend corpus or relax filters`);
    }
    if (topTips.some(t => t.draft)) {
      warnings.push("Some surfaced tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before production");
    }
    // Specific safety/process warnings
    if (input.abrasive === "no_abrasive_pure" && input.material !== "rubber_foam") {
      warnings.push(`HAZARD: pure waterjet without abrasive on ${input.material} — won't cut hard materials; pressure ramps without progress → orifice damage. Switch to garnet 80 mesh.`);
    }
    if ((input.material === "stone_glass") && (input.pressure_class === "ultra_high_94ksi" || input.pressure_class === "high_87ksi")) {
      warnings.push(`FRACTURE: stone/glass + ${input.pressure_class} — too high; drop to 40-60ksi to prevent shock fracture per Flow Mach §3.8`);
    }
    if (input.material === "composite_carbon" && input.pressure_class === "ultra_high_94ksi") {
      warnings.push("DELAMINATION: composite + 94ksi — over-pressure delaminates fibers; drop to 60ksi standard + 120 mesh");
    }
    if (input.material_thickness_mm > 150) {
      warnings.push(`THICKNESS: ${input.material_thickness_mm} mm exceeds typical AWJ practical limit (150mm) — verify machine pump class + abrasive feed rate can support`);
    }

    return {
      top_tips: topTips,
      recommended_action_priority: {
        value: priority,
        unit: "priority tier",
        source: "operator_skill × material × symptom × thickness decision tree",
      },
      escalation_needed: escalationNeeded,
      escalation_reason: escalationReason,
      warnings,
      source: "WaterjetCuttingTribalCorpusEngine — Flow Mach 4c §3 + OMAX MaxiemAEM §4 + KMT Streamline §5 + WARDJet Z-Series §3 + Bystronic ByJet §4 + Machinery's Handbook 31st ed §AWJ + Zeng 1992 §4 + ANSI B11.10 + JM Die operator-captured corpus (Tomas + James 2024-08..2025-01)",
    };
  }
}

export const waterjetCuttingTribalCorpusEngine = new WaterjetCuttingTribalCorpusEngine();
