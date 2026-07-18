/**
 * AdditiveManufacturingTribalCorpusEngine — 3D-printing operator-wisdom corpus
 *
 * 7th tribal-corpus engine completing the manufacturing process septet
 * (rough-coaching/sinker/laser/waterjet/grind/weld/AM). Same 5-axis pattern.
 *
 * Tribal-specialist soul: every tip carries handbook-grade attribution
 * (EOS / 3D Systems / Stratasys / Markforged / Formlabs / GE Additive +
 * ASTM F2792 + ISO/ASTM 52900 + JM Die operator corpus). Confidence-
 * weighted; <0.75 draft.
 *
 * Reference: EOS DMLS Process Guide §3-5; 3D Systems SLA Application
 *   Notes §A-B; Stratasys FDM Best Practices §4; Markforged Continuous
 *   Fiber §3; Formlabs SLA/SLS Guide §A; GE Additive EBM Operator
 *   Manual §5; ASTM F2792 (AM Terminology); ISO/ASTM 52900 (AM
 *   Categorization); ASTM F3303 (Powder Bed Fusion); Machinery's
 *   Handbook 31st ed §Additive; JM Die operator-captured corpus
 *   2024-08..2025-01.
 *
 * @version 1.0.0
 * @module AdditiveManufacturingTribalCorpusEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type AMProcess = "fdm_fff" | "sla_dlp" | "sls" | "dmls_slm" | "ebm" | "binder_jet" | "material_jet";
export type AMMaterial = "pla" | "abs" | "petg" | "nylon_pa12" | "carbon_fiber_reinforced" | "photopolymer_resin" | "stainless_316L" | "ti6al4v" | "inconel_718" | "aluminum_alsi10mg" | "tool_steel_h13";
export type LayerHeight = "ultra_fine_25um" | "fine_50um" | "standard_100um" | "draft_200um" | "coarse_300um";
export type AMSymptom =
  | "warping_delamination"
  | "porosity_pores"
  | "stair_step_visible"
  | "support_witness_marks"
  | "powder_cake_unfused"
  | "recoater_streaks"
  | "cracking_residual_stress"
  | "dimensional_shrinkage"
  | "first_layer_adhesion_failure"
  | "stringing_oozing"
  | null;
export type OperatorSkill = "entry" | "intermediate" | "master";

interface AMTipRecord {
  tip: string;
  source: string;
  confidence: number;
  applicable_processes?: AMProcess[];
  applicable_materials?: AMMaterial[];
  applicable_layers?: LayerHeight[];
  applicable_symptoms?: NonNullable<AMSymptom>[];
}

export interface AMCorpusInput {
  process: AMProcess;
  material: AMMaterial;
  layer_height: LayerHeight;
  build_height_mm: number;
  operator_skill_level: OperatorSkill;
  recent_symptom?: AMSymptom;
  top_n?: number;
  min_confidence?: number;
}

export interface RankedAMTip {
  tip: string;
  source: string;
  confidence: number;
  match_score: number;
  draft: boolean;
}

export interface AMCorpusResult {
  top_tips: RankedAMTip[];
  recommended_action_priority: AtomicValue<string>;
  escalation_needed: boolean;
  escalation_reason: string | null;
  warnings: string[];
  source: string;
}

const TIP_BANK: AMTipRecord[] = [
  // FDM fundamentals
  { tip: "FDM first layer — bed-level + Z-offset critical; squish first-layer 80-90% width for adhesion; under-squish lifts, over-squish elephant-foots",
    source: "Stratasys FDM Best Practices §4.2 (First Layer) + Markforged §3.3",
    confidence: 0.92,
    applicable_processes: ["fdm_fff"],
    applicable_symptoms: ["first_layer_adhesion_failure"] },
  { tip: "FDM ABS warping — enclosed heated chamber 60-90°C, brim or raft, ABS slurry adhesion on cold beds NOT recommended (modern PEI/textured-glass replaces)",
    source: "Stratasys FDM §4.5 (Warping Control) + JM Die Tomas 2024-10",
    confidence: 0.89,
    applicable_processes: ["fdm_fff"],
    applicable_materials: ["abs"],
    applicable_symptoms: ["warping_delamination"] },
  // SLA fundamentals
  { tip: "SLA resin — peel-force dominant failure; tilt 30-45° AND orient critical surface UP (DOWN faces have stronger stair-step + support witness)",
    source: "3D Systems SLA §A-3 (Orientation) + Formlabs SLA Guide §A.5",
    confidence: 0.90,
    applicable_processes: ["sla_dlp"],
    applicable_materials: ["photopolymer_resin"] },
  { tip: "SLA wash + cure — IPA wash 10-20 min (NOT longer — resin embrittlement); UV post-cure per resin spec; uncured resin = brittle parts that fail under load",
    source: "Formlabs SLA Guide §A.7 + 3D Systems SLA §A-5",
    confidence: 0.91,
    applicable_processes: ["sla_dlp"],
    applicable_materials: ["photopolymer_resin"] },
  // SLS / SLM
  { tip: "SLS nylon — powder refresh ratio 50/50 new/used; >60% used powder = brittle parts; preheat bed to 170°C (PA12) controls warp",
    source: "EOS DMLS §3.4 (Powder Management) + Formlabs SLS Guide §A.3",
    confidence: 0.88,
    applicable_processes: ["sls"],
    applicable_materials: ["nylon_pa12"] },
  // DMLS / SLM
  { tip: "DMLS stainless 316L — argon shield <500 ppm O₂; laser power 200-400W, scan speed 800-1200 mm/s; oxygen >1000 ppm = porosity + reduced ductility",
    source: "EOS DMLS Process Guide §3.6 (316L Parameters) + ASTM F3303",
    confidence: 0.93,
    applicable_processes: ["dmls_slm"],
    applicable_materials: ["stainless_316L"] },
  { tip: "Ti-6Al-4V DMLS — argon purity 99.99% MANDATORY (<100 ppm O₂); contour-scan post-fill for 20% better surface; HIP post-process for fatigue parts",
    source: "GE Additive EBM/SLM Manual §5.3 + ASTM F2924 (Ti6Al4V AM Spec)",
    confidence: 0.94,
    applicable_processes: ["dmls_slm", "ebm"],
    applicable_materials: ["ti6al4v"] },
  // Stair-step
  { tip: "Stair-step minimization — orient critical surface horizontal or vertical (45° angle is WORST); thinner layers reduce but slow build 2-4×",
    source: "ISO/ASTM 52900 §6 (Build Orientation) + Stratasys FDM §4.7",
    confidence: 0.87,
    applicable_symptoms: ["stair_step_visible"] },
  // Supports
  { tip: "Support strategy — minimize where possible; tree-supports cleaner than linear; ALWAYS-DOWN surface = visible witness, never on functional face",
    source: "Formlabs SLA Guide §A.6 + Markforged §3.5 (Supports)",
    confidence: 0.85,
    applicable_symptoms: ["support_witness_marks"] },
  // Porosity
  { tip: "Porosity DMLS — low laser power (lack-of-fusion porosity) OR high laser power (keyhole porosity); 200-400W typical Al/SS, sweep parameter window",
    source: "EOS DMLS §3.7 (Porosity Sources) + Machinery's Handbook §AM Porosity",
    confidence: 0.91,
    applicable_processes: ["dmls_slm"],
    applicable_symptoms: ["porosity_pores"] },
  // Powder handling
  { tip: "Powder safety — metal AM powder (Ti, Al, Inconel) is COMBUSTIBLE per NFPA 484; argon-purged sieving, no static, ESD-safe footwear, no spark sources",
    source: "NFPA 484 (Combustible Metals) + EOS Safety Manual §6",
    confidence: 0.99,
    applicable_processes: ["sls", "dmls_slm", "ebm", "binder_jet"],
    applicable_materials: ["stainless_316L", "ti6al4v", "inconel_718", "aluminum_alsi10mg", "tool_steel_h13"] },
  // Recoater
  { tip: "Recoater streaks — blade damage (carbon, silicone, ceramic); replace at first sign; spatter ejecta in build can dent blade → streak propagates whole build",
    source: "EOS DMLS Service Manual §4.5 + JM Die James 2024-11",
    confidence: 0.84,
    applicable_processes: ["dmls_slm"],
    applicable_symptoms: ["recoater_streaks"] },
  // Cracking / residual stress
  { tip: "Residual-stress cracking (DMLS) — alternate scan pattern (rotate 67°/layer), pre-heat 200°C, post-build stress-relief BEFORE removing supports from plate",
    source: "EOS DMLS §3.8 (Residual Stress) + ASTM F3303",
    confidence: 0.89,
    applicable_processes: ["dmls_slm"],
    applicable_symptoms: ["cracking_residual_stress"] },
  // Dimensional accuracy
  { tip: "Shrinkage compensation — DMLS metals 0.3-1.5% (Al higher than steel); SLS nylon 3-4%; SLA <0.5%; ALWAYS print test cube + measure before production part",
    source: "Machinery's Handbook §AM §Tolerances + EOS DMLS Calibration §3.9",
    confidence: 0.88,
    applicable_symptoms: ["dimensional_shrinkage"] },
  // PLA/PETG
  { tip: "PLA-PETG drying — hygroscopic filaments absorb water in <24hr; wet filament = popping, stringing, weak layers; food dehydrator 50°C 4-6hr restores",
    source: "Stratasys FDM Material Handling §4.9 + JM Die Tomas 2024-09",
    confidence: 0.87,
    applicable_processes: ["fdm_fff"],
    applicable_materials: ["pla", "petg"],
    applicable_symptoms: ["stringing_oozing"] },
  // Carbon-fiber reinforced
  { tip: "Carbon-fiber FDM — abrasive on brass nozzle (lasts hours); hardened-steel OR ruby nozzle MANDATORY; chopped-CF easier than continuous, lower strength",
    source: "Markforged Continuous Fiber §3.6 + Stratasys CF Best Practices",
    confidence: 0.90,
    applicable_processes: ["fdm_fff"],
    applicable_materials: ["carbon_fiber_reinforced"] },
  // EBM
  { tip: "EBM (Electron Beam Melt) — vacuum chamber + preheat to 700°C; reduces residual stress vs SLM, but only metals that don't sublime under vacuum",
    source: "GE Additive EBM Manual §5.5",
    confidence: 0.86,
    applicable_processes: ["ebm"] },
  // Binder jet
  { tip: "Binder jet — sintering shrinkage 15-20% predictable; metal infiltration (bronze) bridges porosity; faster + cheaper than DMLS but lower density",
    source: "Machinery's Handbook §Binder Jet + 3D Systems §A-8",
    confidence: 0.83,
    applicable_processes: ["binder_jet"] },
  // Safety
  { tip: "Resin handling (SLA) — uncured resin is sensitizing skin allergen; nitrile gloves (NOT latex), eye protection, ventilation; OSHA respirator if no extraction",
    source: "OSHA 29 CFR 1910.1200 + Formlabs Safety Data Sheets",
    confidence: 0.96,
    applicable_processes: ["sla_dlp"],
    applicable_materials: ["photopolymer_resin"] },
  // Pre-flight
  { tip: "AM pre-flight — verify (1) build plate level + clean, (2) material moisture-spec OK, (3) gas/vacuum levels (DMLS/EBM/SLM), (4) recoater + nozzle integrity, (5) build orientation reviewed",
    source: "ASTM F3303 §6 (Process Control) + EOS DMLS Pre-Use §3.0",
    confidence: 0.94 },
];

export class AdditiveManufacturingTribalCorpusEngine {
  surface(input: AMCorpusInput): AMCorpusResult {
    if (!input || !input.process || !input.material || !input.layer_height || input.build_height_mm == null || !input.operator_skill_level) {
      throw new Error("AdditiveManufacturingTribalCorpusEngine.surface: process + material + layer_height + build_height_mm + operator_skill_level required");
    }
    if (input.build_height_mm <= 0) {
      throw new Error("AdditiveManufacturingTribalCorpusEngine.surface: build_height_mm must be positive");
    }

    const warnings: string[] = [];
    const topN = input.top_n ?? 5;
    const minConfidence = input.min_confidence ?? 0.60;

    const scored: RankedAMTip[] = [];
    for (const tip of TIP_BANK) {
      let match = 0;
      if (tip.applicable_processes?.includes(input.process)) match += 0.20;
      else if (!tip.applicable_processes) match += 0.05;
      if (tip.applicable_materials?.includes(input.material)) match += 0.20;
      else if (!tip.applicable_materials) match += 0.05;
      if (tip.applicable_layers?.includes(input.layer_height)) match += 0.10;
      else if (!tip.applicable_layers) match += 0.05;
      if (input.recent_symptom && tip.applicable_symptoms?.includes(input.recent_symptom)) {
        match += 0.40;
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
    const isMetalAM = input.process === "dmls_slm" || input.process === "ebm" ||
                     ["stainless_316L", "ti6al4v", "inconel_718", "aluminum_alsi10mg", "tool_steel_h13"].includes(input.material);
    if (input.recent_symptom !== null && input.recent_symptom !== undefined) {
      priority = `URGENT — ${input.recent_symptom} requires immediate intervention (build scrap risk; metal AM scrap = $500-10k powder + machine-hours)`;
    } else if (input.operator_skill_level === "entry") {
      priority = "GUIDED — entry-level AM operator (combustible powder + uncured-resin allergen + thermal hazards), review safety + tips before build";
    } else if (input.material === "ti6al4v" || input.material === "inconel_718") {
      priority = `ELEVATED — ${input.material} AM; reactive metal powder (NFPA 484 combustible) + aerospace-spec parameter window (O₂ <100 ppm, HIP post-process)`;
    } else if (isMetalAM) {
      priority = `ELEVATED — metal AM (${input.material}); combustible-powder NFPA 484 + argon-purge protocol mandatory`;
    } else {
      priority = "ADVISORY — AM tips for situational awareness during build";
    }

    let escalationNeeded = false;
    let escalationReason: string | null = null;
    if (input.operator_skill_level === "entry" && input.recent_symptom !== null && input.recent_symptom !== undefined) {
      escalationNeeded = true;
      escalationReason = `Entry-level operator + active AM symptom ${input.recent_symptom} — escalate to intermediate/master before next build (metal-AM scrap $500-10k; cracking-residual-stress can fail under load post-build)`;
      warnings.push(escalationReason);
    }
    if (input.operator_skill_level === "entry" && (input.material === "ti6al4v" || input.material === "inconel_718")) {
      escalationNeeded = true;
      const reason = `Entry-level operator + ${input.material} — escalate (reactive metal powder NFPA 484 ignition hazard; argon purity + HIP post-process load-bearing)`;
      escalationReason = escalationReason ? escalationReason + "; " + reason : reason;
      warnings.push(reason);
    }

    if (topTips.length === 0) {
      warnings.push(`No tips matched (process=${input.process}, material=${input.material}) — extend corpus or relax filters`);
    }
    if (topTips.some(t => t.draft)) {
      warnings.push("Some surfaced tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before production");
    }
    // Specific hazard warnings
    if (isMetalAM) {
      warnings.push("COMBUSTIBLE: metal AM powder (Ti/Al/Inconel/SS) per NFPA 484 — argon-purged handling, ESD-safe, no sparks, no static during sieving");
    }
    if (input.material === "photopolymer_resin") {
      warnings.push("ALLERGEN: uncured photopolymer resin is sensitizing skin allergen — nitrile gloves, eye protection, no skin contact per OSHA 29 CFR 1910.1200");
    }
    if (input.build_height_mm > 300) {
      warnings.push(`BUILD HEIGHT: ${input.build_height_mm}mm exceeds typical desktop AM build volume — verify machine envelope + thermal-stability for long builds`);
    }
    if (input.process === "dmls_slm" && input.layer_height === "ultra_fine_25um") {
      warnings.push("PRODUCTIVITY: DMLS at 25µm layer height → ~4× build time vs 100µm. Justify only for critical surface-finish requirements; HIP can recover finish faster.");
    }

    return {
      top_tips: topTips,
      recommended_action_priority: {
        value: priority,
        unit: "priority tier",
        source: "operator_skill × process × material × symptom decision tree",
      },
      escalation_needed: escalationNeeded,
      escalation_reason: escalationReason,
      warnings,
      source: "AdditiveManufacturingTribalCorpusEngine — EOS DMLS Process Guide §3-5 + 3D Systems SLA §A-B + Stratasys FDM §4 + Markforged §3 + Formlabs SLA/SLS §A + GE Additive EBM §5 + ASTM F2792 + ASTM F2924 + ASTM F3303 + ISO/ASTM 52900 + Machinery's Handbook 31st ed §Additive + NFPA 484 + OSHA 29 CFR 1910.1200 + JM Die operator-captured corpus (Tomas + James 2024-08..2025-01)",
    };
  }
}

export const additiveManufacturingTribalCorpusEngine = new AdditiveManufacturingTribalCorpusEngine();
