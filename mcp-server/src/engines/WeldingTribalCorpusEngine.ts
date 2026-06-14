/**
 * WeldingTribalCorpusEngine — TIG/MIG/Stick/Laser-weld operator-wisdom corpus
 *
 * 6th tribal-corpus engine in the iter44-iter50 series. Same proven 5-axis
 * pattern. Closes the iter20 P2 "welding tribal" gap (PRISM has welder studio
 * + 15+ welding engines but no dedicated operator-corpus surfacer).
 *
 * Tribal-specialist soul: every tip carries handbook-grade attribution
 * (Lincoln Electric / Miller / ESAB / Fronius / AWS handbook + Machinery's
 * Handbook §Welding + JM Die operator corpus). Confidence-weighted; <0.75 draft.
 *
 * Reference: Lincoln Electric Welding Procedures Handbook §3-7; Miller
 *   Electric Owner's Manual §4; ESAB GMAW/GTAW Process Guide §A-C; Fronius
 *   TIG Application Manual §3; AWS Welding Handbook 9th ed Vol 2 (Processes);
 *   AWS D1.1 (Structural Steel); AWS D17.1 (Aerospace); Machinery's Handbook
 *   31st ed §Welding; JM Die operator Tomas + James 2024-08..2025-01.
 *
 * @version 1.0.0
 * @module WeldingTribalCorpusEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type WeldProcess = "gtaw_tig" | "gmaw_mig" | "fcaw_flux_core" | "smaw_stick" | "laser_weld" | "resistance_spot" | "plasma_arc";
export type BaseMetal = "mild_steel" | "stainless_steel" | "aluminum" | "titanium" | "inconel" | "copper_alloy" | "galvanized_steel" | "dissimilar_metal";
export type ShieldGas = "argon_100" | "argon_co2_75_25" | "argon_o2_98_2" | "helium_argon_75_25" | "co2_100" | "argon_he_h2_specialty" | "no_gas_self_shielded";
export type WeldSymptom =
  | "porosity"
  | "undercut"
  | "lack_of_fusion"
  | "cracking_hot"
  | "cracking_cold"
  | "spatter_excessive"
  | "distortion"
  | "burn_through_thin"
  | "tungsten_inclusion"
  | "incomplete_penetration"
  | null;
export type OperatorSkill = "entry" | "intermediate" | "master";

interface WeldTipRecord {
  tip: string;
  source: string;
  confidence: number;
  applicable_processes?: WeldProcess[];
  applicable_metals?: BaseMetal[];
  applicable_gases?: ShieldGas[];
  applicable_symptoms?: NonNullable<WeldSymptom>[];
}

export interface WeldCorpusInput {
  process: WeldProcess;
  base_metal: BaseMetal;
  shield_gas: ShieldGas;
  base_thickness_mm: number;
  operator_skill_level: OperatorSkill;
  recent_symptom?: WeldSymptom;
  top_n?: number;
  min_confidence?: number;
}

export interface RankedWeldTip {
  tip: string;
  source: string;
  confidence: number;
  match_score: number;
  draft: boolean;
}

export interface WeldCorpusResult {
  top_tips: RankedWeldTip[];
  recommended_action_priority: AtomicValue<string>;
  escalation_needed: boolean;
  escalation_reason: string | null;
  warnings: string[];
  source: string;
}

const TIP_BANK: WeldTipRecord[] = [
  // TIG fundamentals
  { tip: "TIG aluminum — AC current with high-frequency start; pure argon shield; tungsten clean ball-shape (not pointed); 1/8\" tungsten for 1/8\" plate",
    source: "Miller Electric §4.3 (TIG Aluminum) + AWS Welding Handbook Vol 2 §GTAW",
    confidence: 0.93,
    applicable_processes: ["gtaw_tig"],
    applicable_metals: ["aluminum"],
    applicable_gases: ["argon_100"] },
  { tip: "TIG steel/stainless — DCEN (DC straight polarity) with sharpened 2% thoriated/ceriated tungsten; 1/16\" for thin, 3/32\" for plate",
    source: "Lincoln Procedures §3.4 (GTAW DCEN) + Fronius TIG §3.2",
    confidence: 0.92,
    applicable_processes: ["gtaw_tig"],
    applicable_metals: ["mild_steel", "stainless_steel"] },
  // MIG fundamentals
  { tip: "MIG steel — 75/25 Ar/CO₂ shield; pure CO₂ deeper penetration but more spatter; voltage to flatten bead crown, wire speed for fill",
    source: "ESAB GMAW Process Guide §B-2 + Lincoln Procedures §3.5",
    confidence: 0.90,
    applicable_processes: ["gmaw_mig"],
    applicable_metals: ["mild_steel"],
    applicable_gases: ["argon_co2_75_25", "co2_100"] },
  { tip: "MIG aluminum — push gun (NOT drag), spool gun or push-pull for >10ft cable run; standard wire feed birds-nests aluminum",
    source: "Miller §4.5 (MIG Aluminum) + ESAB §B-4",
    confidence: 0.91,
    applicable_processes: ["gmaw_mig"],
    applicable_metals: ["aluminum"] },
  // Defects: Porosity
  { tip: "Porosity — check gas flow 15-25 cfh (no draft from fan/door), clean base metal (no oil/paint/galvanizing), tighten gas-line fittings",
    source: "AWS Welding Handbook Vol 2 §Defects + Machinery's Handbook §Welding §Defects",
    confidence: 0.94,
    applicable_symptoms: ["porosity"] },
  // Defects: Cracking
  { tip: "Hot cracking — reduce restraint, preheat 100-200°C, lower amperage 10-15%; sulfur/phosphorus in base metal causes liquation cracks",
    source: "AWS D1.1 §3 (Hot Cracking) + Lincoln Procedures §6.2",
    confidence: 0.89,
    applicable_symptoms: ["cracking_hot"] },
  { tip: "Cold cracking (delayed hydrogen) — preheat per CE (carbon equivalent), use low-hydrogen electrodes E70XX or shielded TIG, ≥150°C interpass on high-C steel",
    source: "AWS D1.1 §3.5 (Cold Cracking) + Lincoln Welding Education Series",
    confidence: 0.91,
    applicable_symptoms: ["cracking_cold"],
    applicable_metals: ["mild_steel"] },
  // Defects: Undercut
  { tip: "Undercut — reduce travel speed 10-20% OR increase weave at edge; toe-side undercut from too-fast travel + too-high amperage combo",
    source: "AWS Welding Handbook Vol 2 §Defects + Lincoln Procedures §6.4",
    confidence: 0.86,
    applicable_symptoms: ["undercut"] },
  // Lack of fusion
  { tip: "Lack of fusion — clean joint surfaces, increase amperage 10-15%, slow travel, ensure proper gun angle (15° drag for MIG/stick)",
    source: "ESAB GMAW Process §C-3 + AWS Welding Handbook §Defects",
    confidence: 0.87,
    applicable_symptoms: ["lack_of_fusion", "incomplete_penetration"] },
  // Burn-through
  { tip: "Burn-through on thin sheet (<2mm) — pulse mode preferred; if constant-current, reduce amperage 30%, increase travel 30%, use copper backing bar",
    source: "Miller §4.7 (Thin Material) + ESAB GMAW §C-5",
    confidence: 0.88,
    applicable_symptoms: ["burn_through_thin"] },
  // Tungsten inclusion
  { tip: "Tungsten inclusion (TIG) — never touch tungsten to puddle/filler; lift-arc OR high-freq start; pure argon shield; sharpen tungsten away-from-tip direction",
    source: "Fronius TIG Application §3.5 + Miller §4.4",
    confidence: 0.89,
    applicable_processes: ["gtaw_tig"],
    applicable_symptoms: ["tungsten_inclusion"] },
  // Distortion
  { tip: "Distortion control — back-step welding, skip-weld pattern, balance heat input top/bottom on butt joints, jig/clamp aggressively for thin plate",
    source: "AWS Welding Handbook Vol 1 §Distortion + Machinery's Handbook §Welding §Distortion",
    confidence: 0.84,
    applicable_symptoms: ["distortion"] },
  // Spatter
  { tip: "Excessive MIG spatter — reduce voltage (too-cold/short-arc OR too-hot/globular); pulse spray for clean transfer; tighten wire reel drag",
    source: "Lincoln Procedures §3.6 + ESAB §B-3",
    confidence: 0.85,
    applicable_processes: ["gmaw_mig"],
    applicable_symptoms: ["spatter_excessive"] },
  // Titanium
  { tip: "Titanium TIG — argon trailing shield + back-purge MANDATORY; color check: silver=good, straw=acceptable, blue=borderline, white-powder=oxidized REJECT",
    source: "AWS D17.1 (Aerospace) + Fronius TIG §3.7 (Reactive Metals)",
    confidence: 0.95,
    applicable_processes: ["gtaw_tig"],
    applicable_metals: ["titanium"] },
  // Stainless
  { tip: "Stainless TIG — 98/2 Ar/O₂ OR 97/3 Ar/H₂ for better wetting on austenitic; back-purge for full-pen butt welds (prevents sugaring)",
    source: "AWS Welding Handbook Vol 4 §Stainless + Fronius §3.4",
    confidence: 0.88,
    applicable_processes: ["gtaw_tig"],
    applicable_metals: ["stainless_steel"],
    applicable_gases: ["argon_o2_98_2", "argon_he_h2_specialty"] },
  // Galvanized
  { tip: "Galvanized steel — grind off zinc 25mm back from weld (BOTH sides) OR use rod designed for zinc; ALWAYS downdraft + respirator (zinc fume = metal-fume fever)",
    source: "AWS Welding Handbook §Coated Metals + OSHA 29 CFR 1910.1000 Table Z-1",
    confidence: 0.94,
    applicable_metals: ["galvanized_steel"] },
  // Laser weld
  { tip: "Laser weld — focal position at surface for autogenous; below surface for keyhole; back-reflection guard on fiber when welding copper/brass",
    source: "AWS Welding Handbook §Laser Welding + IPG Photonics Welding Guide",
    confidence: 0.88,
    applicable_processes: ["laser_weld"] },
  // Dissimilar
  { tip: "Dissimilar metal joint — Schaeffler diagram for stainless/carbon-steel; nickel-base filler for hardened/heat-treatable joints; brittle intermetallics if wrong filler",
    source: "AWS Welding Handbook Vol 4 §Dissimilar + Lincoln Specialty Procedures",
    confidence: 0.89,
    applicable_metals: ["dissimilar_metal"] },
  // Safety / setup
  { tip: "Pre-weld setup — verify (1) ground clamp on workpiece (not table), (2) gas pressure 15-25 cfh, (3) electrode/wire matched to filler chart, (4) PPE auto-darkening helmet shade 9-13",
    source: "AWS D1.1 §6 (Setup) + JM Die operator checklist 2024-12 + ANSI Z49.1 (Welding Safety)",
    confidence: 0.96 },
  { tip: "Ventilation — local exhaust at arc + general room; OSHA PEL for Cr⁶⁺ stainless smoke 0.005 mg/m³ ENFORCEABLE; no respirator + stainless = chronic-exposure regulatory violation",
    source: "OSHA 29 CFR 1910.1026 (Chromium VI) + ANSI Z49.1 §4",
    confidence: 0.97,
    applicable_metals: ["stainless_steel"] },
];

export class WeldingTribalCorpusEngine {
  surface(input: WeldCorpusInput): WeldCorpusResult {
    if (!input || !input.process || !input.base_metal || !input.shield_gas || input.base_thickness_mm == null || !input.operator_skill_level) {
      throw new Error("WeldingTribalCorpusEngine.surface: process + base_metal + shield_gas + base_thickness_mm + operator_skill_level required");
    }
    if (input.base_thickness_mm <= 0) {
      throw new Error("WeldingTribalCorpusEngine.surface: base_thickness_mm must be positive");
    }

    const warnings: string[] = [];
    const topN = input.top_n ?? 5;
    const minConfidence = input.min_confidence ?? 0.60;

    const scored: RankedWeldTip[] = [];
    for (const tip of TIP_BANK) {
      let match = 0;
      if (tip.applicable_processes?.includes(input.process)) match += 0.20;
      else if (!tip.applicable_processes) match += 0.05;
      if (tip.applicable_metals?.includes(input.base_metal)) match += 0.20;
      else if (!tip.applicable_metals) match += 0.05;
      if (tip.applicable_gases?.includes(input.shield_gas)) match += 0.10;
      else if (!tip.applicable_gases) match += 0.05;
      if (input.recent_symptom && tip.applicable_symptoms?.includes(input.recent_symptom)) {
        match += 0.40;  // symptom dominates
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
      priority = `URGENT — ${input.recent_symptom} weld defect requires immediate intervention (structural rejection / re-weld cost)`;
    } else if (input.operator_skill_level === "entry") {
      priority = "GUIDED — entry-level welder, review tips + safety before arc start (UV-burn + fume + electrical-shock hazards)";
    } else if (input.base_metal === "titanium" || input.base_metal === "dissimilar_metal") {
      priority = `ELEVATED — ${input.base_metal} welding; specialty procedure (Ti back-purge AWS D17.1; dissimilar Schaeffler-diagram filler selection)`;
    } else if (input.base_metal === "galvanized_steel" || input.base_metal === "stainless_steel") {
      priority = `ELEVATED — ${input.base_metal} welding; fume hazard (zinc/Cr⁶⁺) — local exhaust + respirator MANDATORY`;
    } else {
      priority = "ADVISORY — welding tips for situational awareness during run";
    }

    let escalationNeeded = false;
    let escalationReason: string | null = null;
    if (input.operator_skill_level === "entry" && input.recent_symptom !== null && input.recent_symptom !== undefined) {
      escalationNeeded = true;
      escalationReason = `Entry-level welder + active defect ${input.recent_symptom} — escalate to intermediate/master (cold-cracking can fail under load weeks after weld; structural rejection cost)`;
      warnings.push(escalationReason);
    }
    if (input.operator_skill_level === "entry" && (input.base_metal === "titanium" || input.base_metal === "dissimilar_metal")) {
      escalationNeeded = true;
      const reason = `Entry-level welder + ${input.base_metal} — escalate (specialty procedure required; Ti color-check pass/fail AWS D17.1; dissimilar wrong filler = brittle intermetallics)`;
      escalationReason = escalationReason ? escalationReason + "; " + reason : reason;
      warnings.push(reason);
    }

    if (topTips.length === 0) {
      warnings.push(`No tips matched (process=${input.process}, metal=${input.base_metal}, gas=${input.shield_gas}) — extend corpus or relax filters`);
    }
    if (topTips.some(t => t.draft)) {
      warnings.push("Some surfaced tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before production");
    }
    // Specific hazard/process warnings
    if (input.base_metal === "galvanized_steel") {
      warnings.push("FUME HAZARD: galvanized welding → zinc-oxide fever risk; remove zinc 25mm from weld OR use zinc-rod + downdraft + respirator (OSHA 29 CFR 1910.1000)");
    }
    if (input.base_metal === "stainless_steel") {
      warnings.push("CARCINOGEN: stainless welding → hexavalent chromium (Cr⁶⁺) per OSHA 29 CFR 1910.1026 PEL 0.005 mg/m³; local exhaust + respirator MANDATORY");
    }
    if (input.base_metal === "titanium" && input.shield_gas !== "argon_100" && input.shield_gas !== "helium_argon_75_25") {
      warnings.push(`WRONG GAS: titanium + ${input.shield_gas} — pure argon (or He/Ar) required + back-purge per AWS D17.1; CO₂/O₂ shields cause oxide contamination`);
    }
    if (input.process === "gmaw_mig" && input.base_metal === "aluminum" && input.shield_gas !== "argon_100") {
      warnings.push(`WRONG GAS: MIG aluminum + ${input.shield_gas} — pure argon required (CO₂/O₂ causes severe spatter + brittle weld) per Miller §4.5`);
    }
    if (input.base_thickness_mm < 1) {
      warnings.push(`THIN MATERIAL: ${input.base_thickness_mm}mm — burn-through risk extreme; pulse mode or thinnest-rod TIG with copper backing bar required`);
    }

    return {
      top_tips: topTips,
      recommended_action_priority: {
        value: priority,
        unit: "priority tier",
        source: "operator_skill × metal × symptom × gas decision tree",
      },
      escalation_needed: escalationNeeded,
      escalation_reason: escalationReason,
      warnings,
      source: "WeldingTribalCorpusEngine — Lincoln Electric Welding Procedures §3-7 + Miller Electric §4 + ESAB GMAW/GTAW §A-C + Fronius TIG §3 + AWS Welding Handbook Vol 1+2+4 + AWS D1.1 + AWS D17.1 + Machinery's Handbook 31st ed §Welding + ANSI Z49.1 + OSHA 29 CFR 1910.1000 + OSHA 29 CFR 1910.1026 + JM Die operator-captured corpus (Tomas + James 2024-08..2025-01)",
    };
  }
}

export const weldingTribalCorpusEngine = new WeldingTribalCorpusEngine();
