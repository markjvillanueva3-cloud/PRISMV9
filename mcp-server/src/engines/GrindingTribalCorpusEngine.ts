/**
 * GrindingTribalCorpusEngine — grinding operator-wisdom corpus + surfacer
 *
 * Closes the iter20 P2 "grinding tribal" gap. Same proven 5-axis tribal-
 * corpus pattern as iter44/46/47/48 — operation × wheel × workpiece × coolant
 * × symptom. PRISM has grinder studio + 24 grind engines but no dedicated
 * tribal corpus surfacing the wisdom that separates a 0.2µm-Ra mirror finish
 * from a burned, micro-cracked work-hardened reject.
 *
 * Tribal-specialist soul rule: every tip carries handbook-grade attribution
 * (Norton / 3M / Saint-Gobain / Studer / United Grinding + Machinery's
 * Handbook §Grinding + Malkin & Guo 2008 + JM Die operator corpus). Confidence-
 * weighted; <0.75 = draft.
 *
 * Reference: Norton Grinding Wheel Application Guide §3 (Wheel Selection);
 *   3M Cubitron II Conventional Grain §A-2; Saint-Gobain Norton Bonding §4;
 *   Studer S30/S40 Cylindrical Grinding §5; United Grinding StuderJUNG §3
 *   (Profile Grinding); Machinery's Handbook 31st ed §Grinding §Surface;
 *   Malkin S, Guo C (2008) "Grinding Technology" §3 + §6 (Burn + Wheel
 *   Wear); JM Die operator-captured corpus 2024-08..2025-01.
 *
 * @version 1.0.0
 * @module GrindingTribalCorpusEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type GrindOperation = "surface_grind" | "cylindrical_grind" | "internal_grind" | "centerless_grind" | "profile_grind" | "creep_feed" | "tool_grind";
export type GrindWheel = "aluminum_oxide_friable" | "aluminum_oxide_tough" | "silicon_carbide" | "cbn" | "diamond" | "ceramic_cubitron2";
export type GrindWorkpiece = "soft_steel" | "tool_steel_hardened" | "stainless" | "aluminum" | "tungsten_carbide" | "ceramic_part" | "tool_steel_HSS" | "inconel_titanium";
export type GrindCoolant = "flood_oil" | "flood_water_soluble" | "mqL" | "dry";
export type GrindSymptom =
  | "workpiece_burn"
  | "wheel_glazing"
  | "wheel_loading"
  | "chatter_marks"
  | "ra_too_high"
  | "size_drift"
  | "edge_chipping"
  | "microcracks"
  | "wheel_wear_excessive"
  | null;
export type OperatorSkill = "entry" | "intermediate" | "master";

interface GrindTipRecord {
  tip: string;
  source: string;
  confidence: number;
  applicable_operations?: GrindOperation[];
  applicable_wheels?: GrindWheel[];
  applicable_workpieces?: GrindWorkpiece[];
  applicable_coolants?: GrindCoolant[];
  applicable_symptoms?: NonNullable<GrindSymptom>[];
}

export interface GrindCorpusInput {
  operation: GrindOperation;
  wheel: GrindWheel;
  workpiece: GrindWorkpiece;
  coolant: GrindCoolant;
  operator_skill_level: OperatorSkill;
  recent_symptom?: GrindSymptom;
  top_n?: number;
  min_confidence?: number;
}

export interface RankedGrindTip {
  tip: string;
  source: string;
  confidence: number;
  match_score: number;
  draft: boolean;
}

export interface GrindCorpusResult {
  top_tips: RankedGrindTip[];
  recommended_action_priority: AtomicValue<string>;
  escalation_needed: boolean;
  escalation_reason: string | null;
  warnings: string[];
  source: string;
}

const TIP_BANK: GrindTipRecord[] = [
  // Wheel selection
  { tip: "Hardened tool steel — CBN wheel (not Al₂O₃) at 60-80 m/s; 10× longer life vs aluminum oxide on Rc>55, holds form on profile grind",
    source: "Norton Grinding §3.2 + Malkin Guo 2008 §3.4 (CBN Application)",
    confidence: 0.94,
    applicable_workpieces: ["tool_steel_hardened"],
    applicable_wheels: ["cbn"] },
  { tip: "Tungsten carbide — diamond wheel ONLY (D107 typ); Al₂O₃/CBN wear too fast; 5-15 m/s wheel speed (slow vs steel)",
    source: "Saint-Gobain Norton Bonding §4.3 (Diamond) + Machinery's Handbook §Grinding §Carbide",
    confidence: 0.95,
    applicable_workpieces: ["tungsten_carbide"],
    applicable_wheels: ["diamond"] },
  { tip: "Stainless / Inconel — ceramic Cubitron II grain (3M); self-sharpening fracture pattern stays cool — Al₂O₃ glazes within hours",
    source: "3M Cubitron II Conventional Grain §A-2",
    confidence: 0.89,
    applicable_workpieces: ["stainless", "inconel_titanium"],
    applicable_wheels: ["ceramic_cubitron2"] },
  // Wheel dressing
  { tip: "Diamond single-point dress — 0.025-0.05 mm depth per pass, 100-200 mm/min traverse; aggressive dress = open structure for soft material; fine dress for finish",
    source: "Norton Grinding §3.7 + Studer S30 §5.4 (Dressing Strategy)",
    confidence: 0.88,
    applicable_symptoms: ["wheel_glazing", "wheel_loading", "ra_too_high"] },
  { tip: "Rotary diamond dresser — 80% wheel speed direction for sharper grain exposure; 60% for finer dress",
    source: "Studer S40 §5.5 (Rotary Diamond)",
    confidence: 0.84 },
  // Burn / thermal
  { tip: "Workpiece burn (rainbow/blue temper) — REDUCE depth-of-cut 30-50%, INCREASE coolant flow 50%, check wheel dress; burn = thermal damage, scrap unless re-temper possible",
    source: "Malkin Guo 2008 §6 (Grinding Burn) + Machinery's Handbook §Surface Integrity",
    confidence: 0.93,
    applicable_symptoms: ["workpiece_burn", "microcracks"] },
  { tip: "Creep-feed grinding — wheel speed 20-30 m/s (LOW vs 30-45 conventional); 1500-3000 mm³/(mm·s) MRR; full-pour coolant mandatory or burn-instant",
    source: "Malkin Guo 2008 §7 (Creep Feed) + United Grinding §3.4",
    confidence: 0.91,
    applicable_operations: ["creep_feed"] },
  // Coolant
  { tip: "Coolant penetration — direct nozzle at wheel/work contact arc (not just over wheel); 80 m/s coolant matches wheel velocity = effective film",
    source: "Malkin Guo 2008 §6.5 (Coolant Application)",
    confidence: 0.87 },
  { tip: "Oil coolant — 10× cooling for HSS tool grinding vs water-soluble; fire risk (flash >100°C); enclosed machine with mist extraction mandatory",
    source: "Norton Grinding §3.9 + JM Die Tomas 2024-10",
    confidence: 0.85,
    applicable_coolants: ["flood_oil"],
    applicable_workpieces: ["tool_steel_HSS"] },
  // Chatter
  { tip: "Chatter marks — REDUCE wheel speed 10%, INCREASE workpiece speed 20%, check spindle bearings, check rounding-quality of wheel after dress",
    source: "Studer S30/S40 §5.6 (Vibration Diagnosis)",
    confidence: 0.86,
    applicable_symptoms: ["chatter_marks"] },
  // Centerless
  { tip: "Centerless — regulating-wheel angle 1-3° controls feed-through; +/- 0.1° shifts feed rate visibly; through-feed vs in-feed mode by part geometry",
    source: "United Grinding §3.5 + Machinery's Handbook §Centerless",
    confidence: 0.83,
    applicable_operations: ["centerless_grind"] },
  // Internal
  { tip: "Internal grind — quill rigidity dominates; L/D < 4 quill (or bigger wheel); chatter at L/D>4 is inevitable",
    source: "Studer S40 §5.3 (Internal Geometry Limits)",
    confidence: 0.85,
    applicable_operations: ["internal_grind"] },
  // Profile
  { tip: "Profile grind — diamond-roll dress (form-true dresser, not single-point); single-point loses form within hours on production runs",
    source: "Norton Grinding §3.8 + StuderJUNG Profile §3.3",
    confidence: 0.87,
    applicable_operations: ["profile_grind"] },
  // Loading / glazing
  { tip: "Wheel loading on aluminum — soft Vitrified bond + open structure (Norton 38A 8-V), light dress every 10 parts, OR switch to silicon-carbide green",
    source: "Norton Grinding §3.4 (Soft-Material Grinding)",
    confidence: 0.88,
    applicable_workpieces: ["aluminum"],
    applicable_symptoms: ["wheel_loading"] },
  // Size control / dimensional drift
  { tip: "Size drift — thermal growth dominant; warm up 20 min before final pass; re-zero gauge between rough + finish; ±5µm/°C steel typical",
    source: "Studer S30 §5.7 (Thermal Stabilization) + ISO 230-3",
    confidence: 0.86,
    applicable_symptoms: ["size_drift"] },
  // Edge chipping
  { tip: "Edge chipping (carbide / hardened) — chamfered edge prep on wheel; ramp-in 0.5mm before full depth; abrupt entry chips edges",
    source: "Saint-Gobain Norton Bonding §4.5 + Malkin Guo §3.8",
    confidence: 0.82,
    applicable_symptoms: ["edge_chipping"],
    applicable_workpieces: ["tool_steel_hardened", "tungsten_carbide"] },
  // Wheel wear
  { tip: "Excessive wheel wear on Inconel — switch from Al₂O₃ to ceramic Cubitron II OR CBN; Inconel work-hardens against wheel, accelerating wear",
    source: "3M Cubitron II §A-3 + Malkin Guo §3.6",
    confidence: 0.89,
    applicable_workpieces: ["inconel_titanium"],
    applicable_symptoms: ["wheel_wear_excessive"] },
  // Safety
  { tip: "Wheel safety — RING-test before mount (clear ring = good, dull = cracked); maximum-RPM rating on wheel ≥ machine spindle; ANSI B7.1 mandatory",
    source: "ANSI B7.1 §6 (Wheel Safety) + Norton Safety Manual §2",
    confidence: 0.99 },
  // Setup
  { tip: "Pre-flight — verify (1) wheel ring-tested + within RPM rating, (2) dresser sharp, (3) coolant flow + concentration, (4) part squareness on chuck/centers",
    source: "Studer S30 Pre-Use §5.0 + JM Die operator checklist 2024-12",
    confidence: 0.94 },
  // Ceramic / fragile
  { tip: "Ceramic workpiece — diamond wheel + ultra-light depth-of-cut (<5µm/pass) + slow feed; ceramic fractures at high MRR, no recovery",
    source: "Norton Grinding §3.6 (Brittle Material) + Malkin Guo §3.9",
    confidence: 0.86,
    applicable_workpieces: ["ceramic_part"],
    applicable_wheels: ["diamond"] },
];

export class GrindingTribalCorpusEngine {
  surface(input: GrindCorpusInput): GrindCorpusResult {
    if (!input || !input.operation || !input.wheel || !input.workpiece || !input.coolant || !input.operator_skill_level) {
      throw new Error("GrindingTribalCorpusEngine.surface: operation + wheel + workpiece + coolant + operator_skill_level required");
    }

    const warnings: string[] = [];
    const topN = input.top_n ?? 5;
    const minConfidence = input.min_confidence ?? 0.60;

    const scored: RankedGrindTip[] = [];
    for (const tip of TIP_BANK) {
      let match = 0;
      if (tip.applicable_operations?.includes(input.operation)) match += 0.20;
      else if (!tip.applicable_operations) match += 0.05;
      if (tip.applicable_wheels?.includes(input.wheel)) match += 0.20;
      else if (!tip.applicable_wheels) match += 0.05;
      if (tip.applicable_workpieces?.includes(input.workpiece)) match += 0.20;
      else if (!tip.applicable_workpieces) match += 0.05;
      if (tip.applicable_coolants?.includes(input.coolant)) match += 0.10;
      else if (!tip.applicable_coolants) match += 0.05;
      if (input.recent_symptom && tip.applicable_symptoms?.includes(input.recent_symptom)) {
        match += 0.30;
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

    let priority: string;
    if (input.recent_symptom !== null && input.recent_symptom !== undefined) {
      priority = `URGENT — ${input.recent_symptom} requires immediate intervention (burn = scrap + re-temper; chatter = surface-finish reject)`;
    } else if (input.operator_skill_level === "entry") {
      priority = "GUIDED — entry-level operator + grinding (wheel-burst safety + thermal burn risk), review tips before start";
    } else if (input.workpiece === "tungsten_carbide" || input.workpiece === "ceramic_part") {
      priority = `ELEVATED — ${input.workpiece} grinding; brittle/specialized wheel required (diamond + light DOC mandatory)`;
    } else if (input.operation === "creep_feed") {
      priority = "ELEVATED — creep-feed grinding; thermal burn risk at high MRR, full-pour coolant mandatory";
    } else {
      priority = "ADVISORY — grinding tips for situational awareness during run";
    }

    let escalationNeeded = false;
    let escalationReason: string | null = null;
    if (input.operator_skill_level === "entry" && input.recent_symptom !== null && input.recent_symptom !== undefined) {
      escalationNeeded = true;
      escalationReason = `Entry-level operator + active grind symptom ${input.recent_symptom} — escalate to intermediate/master (burn/microcracks = thermal damage; tool-steel block scrap $500-5k)`;
      warnings.push(escalationReason);
    }
    if (input.operator_skill_level === "entry" && (input.workpiece === "tungsten_carbide" || input.workpiece === "ceramic_part")) {
      escalationNeeded = true;
      const reason = `Entry-level operator + ${input.workpiece} — escalate (brittle material chips/fractures; diamond wheel selection load-bearing)`;
      escalationReason = escalationReason ? escalationReason + "; " + reason : reason;
      warnings.push(reason);
    }

    if (topTips.length === 0) {
      warnings.push(`No tips matched (operation=${input.operation}, wheel=${input.wheel}, workpiece=${input.workpiece}) — extend corpus or relax filters`);
    }
    if (topTips.some(t => t.draft)) {
      warnings.push("Some surfaced tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before production");
    }
    // Wheel/workpiece mismatch hazards
    if (input.workpiece === "tungsten_carbide" && input.wheel !== "diamond") {
      warnings.push(`MISMATCH: tungsten_carbide + ${input.wheel} — switch to diamond wheel; Al₂O₃/CBN wear instantly on carbide`);
    }
    if (input.workpiece === "tool_steel_hardened" && (input.wheel === "aluminum_oxide_friable" || input.wheel === "aluminum_oxide_tough")) {
      warnings.push(`SUBOPTIMAL: hardened tool steel + Al₂O₃ — 10× shorter wheel life vs CBN; consider CBN for production`);
    }
    if (input.operation === "creep_feed" && input.coolant === "dry") {
      warnings.push("HAZARD: creep-feed grinding + dry — instant burn within seconds; full-pour coolant MANDATORY per Malkin Guo §7");
    }
    if (input.workpiece === "ceramic_part" && input.wheel !== "diamond") {
      warnings.push(`MISMATCH: ceramic + ${input.wheel} — diamond wheel required; ceramic fractures under Al₂O₃/CBN attempt`);
    }

    return {
      top_tips: topTips,
      recommended_action_priority: {
        value: priority,
        unit: "priority tier",
        source: "operator_skill × workpiece × symptom × operation decision tree",
      },
      escalation_needed: escalationNeeded,
      escalation_reason: escalationReason,
      warnings,
      source: "GrindingTribalCorpusEngine — Norton Grinding §3 + 3M Cubitron II §A + Saint-Gobain Norton Bonding §4 + Studer S30/S40 §5 + United Grinding §3 + Machinery's Handbook 31st ed §Grinding + Malkin Guo 2008 §3+§6+§7 + ANSI B7.1 + ISO 230-3 + JM Die operator-captured corpus (Tomas + James 2024-08..2025-01)",
    };
  }
}

export const grindingTribalCorpusEngine = new GrindingTribalCorpusEngine();
