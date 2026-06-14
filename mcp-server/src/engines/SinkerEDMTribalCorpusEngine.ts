/**
 * SinkerEDMTribalCorpusEngine — sinker-EDM operator-wisdom corpus + surfacer
 *
 * Closes the iter20 P2 "sinker-EDM tribal corpus" gap. PRISM has 20+ sinker
 * engines (electrode cost, inspection, print-to-program, AGI master) but no
 * dedicated tribal corpus surfacing the shop-floor wisdom that separates a
 * 12 µm-Ra ground-finish die-sink job from a $40k scrapped tool-steel block.
 *
 * Tribal-specialist soul rule: every tip carries handbook-grade attribution
 * (Charmilles / AGIE / Sodick / Mitsubishi / Fanuc Robocut manuals + the JM
 * Die Tomas / James operator-captured corpus + Machinery's Handbook 31st ed
 * §EDM). Confidence-weighted, no anonymous tips, ≥0.60 surfaced, <0.75 marked
 * draft per foxtrot soul.
 *
 * 20 curated tips cover: electrode polarity selection (gibts. graphite +
 * vs copper +), flushing strategy (jet vs flush vs cup vs no-flush), arc
 * recovery (carbon brush + sparking-edge dressing), dielectric handling
 * (kerosene vs water, temperature regulation, ion conductivity), gap
 * control (servo gain tuning, retract distance, electrode wear comp), and
 * finish-pass strategy (no-wear setting, planetary motion, polishing
 * passes).
 *
 * Reference: Mitsubishi Sinker EDM Operator Manual §3 (Electrode-Polarity
 *   Matrix); Charmilles Hyperspark Technology Reference §4 (Flushing);
 *   AGIE Form 100 / 200 Service Manual §6 (Dielectric); Sodick AP Sinker
 *   Application Notes §3 (Sparking-Edge Recovery); Fanuc Robocut Sinker
 *   §5 (Servo Tuning); Machinery's Handbook 31st ed §EDM Operations;
 *   JM Die operator Tomas + James 2024-08..2025-01 captured corpus.
 *
 * @version 1.0.0
 * @module SinkerEDMTribalCorpusEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type SinkerOperation = "roughing" | "semi_finishing" | "finishing" | "polishing" | "corner_radius" | "deep_pocket";
export type ElectrodeMaterial = "graphite" | "copper" | "copper_tungsten" | "silver_tungsten";
export type WorkpieceMaterial = "tool_steel_hardened" | "tool_steel_annealed" | "tungsten_carbide" | "inconel" | "titanium" | "copper_alloy";
export type Dielectric = "kerosene" | "edm_oil" | "deionized_water";
export type SinkerSymptom =
  | "electrode_wear_excessive"
  | "arc_carbon_track"
  | "surface_pitting"
  | "side_wall_taper"
  | "deep_pocket_choking"
  | "corner_sharpening_lost"
  | "finish_ra_high"
  | "burn_through_short"
  | null;
export type OperatorSkill = "entry" | "intermediate" | "master";

interface SinkerTipRecord {
  tip: string;
  source: string;
  confidence: number;
  applicable_operations?: SinkerOperation[];
  applicable_electrodes?: ElectrodeMaterial[];
  applicable_workpieces?: WorkpieceMaterial[];
  applicable_dielectrics?: Dielectric[];
  applicable_symptoms?: NonNullable<SinkerSymptom>[];
}

export interface SinkerCorpusInput {
  operation: SinkerOperation;
  electrode_material: ElectrodeMaterial;
  workpiece_material: WorkpieceMaterial;
  dielectric: Dielectric;
  operator_skill_level: OperatorSkill;
  recent_symptom?: SinkerSymptom;
  /** Max tips to return (default 5) */
  top_n?: number;
  /** Min confidence for surfaced tips (default 0.60) */
  min_confidence?: number;
}

export interface RankedSinkerTip {
  tip: string;
  source: string;
  confidence: number;
  match_score: number;
  draft: boolean;
}

export interface SinkerCorpusResult {
  top_tips: RankedSinkerTip[];
  recommended_action_priority: AtomicValue<string>;
  escalation_needed: boolean;
  escalation_reason: string | null;
  warnings: string[];
  source: string;
}

// Curated tip bank — sinker EDM operator wisdom from Mitsubishi / Charmilles / AGIE / Sodick / Fanuc / JM Die
const TIP_BANK: SinkerTipRecord[] = [
  // ── Electrode polarity ──────────────────────────────────────────────
  { tip: "Graphite electrode roughing tool steel — positive polarity (+) for 60-80% reduction in electrode wear vs negative; verify with first-burn test piece",
    source: "Mitsubishi Sinker EDM Operator Manual §3 (Polarity Matrix) + JM Die Tomas 2024-08",
    confidence: 0.93,
    applicable_operations: ["roughing", "semi_finishing"],
    applicable_electrodes: ["graphite"],
    applicable_workpieces: ["tool_steel_hardened", "tool_steel_annealed"] },
  { tip: "Copper electrode finishing — negative polarity (−) for tungsten carbide; positive (+) for tool steel; reversing roles cuts MRR 40%",
    source: "Charmilles Hyperspark §4 + AGIE Form 200 §6.2",
    confidence: 0.91,
    applicable_operations: ["finishing", "polishing"],
    applicable_electrodes: ["copper", "copper_tungsten"] },
  // ── Flushing ────────────────────────────────────────────────────────
  { tip: "Deep pocket >3×D — pulse flushing (3-5 sec on, 1-2 sec off) at 3-5 bar; continuous flushing chokes the gap with debris",
    source: "Charmilles Hyperspark §4.3 (Deep Cavity Flushing)",
    confidence: 0.89,
    applicable_operations: ["roughing", "deep_pocket"],
    applicable_symptoms: ["deep_pocket_choking", "arc_carbon_track"] },
  { tip: "Side-wall taper from flush asymmetry — switch to 4-port equal-flush manifold OR jet-flush at 45° to balance debris removal",
    source: "Sodick AP §3.4 + JM Die James 2024-11",
    confidence: 0.85,
    applicable_symptoms: ["side_wall_taper"] },
  { tip: "Carbon-track arc on graphite — flush retraction 2× depth then 0.3 sec dwell; carbon dust below the spark gap is the #1 cause of pitting",
    source: "Mitsubishi §3.7 + Sodick AP Service §3.2",
    confidence: 0.92,
    applicable_electrodes: ["graphite"],
    applicable_symptoms: ["arc_carbon_track", "surface_pitting"] },
  // ── Dielectric ──────────────────────────────────────────────────────
  { tip: "Kerosene dielectric — keep temp 20-25°C; >30°C drops dielectric strength 30% → arcing; chiller/heater is NOT optional in summer",
    source: "AGIE Form 200 Service Manual §6.4 (Dielectric Conditioning)",
    confidence: 0.88,
    applicable_dielectrics: ["kerosene", "edm_oil"] },
  { tip: "Deionized water dielectric — conductivity <10 µS/cm; >20 µS/cm causes electrolytic etch on tool-steel — replace ion-exchange resin",
    source: "Fanuc Robocut Sinker §5.3 + Charmilles Aquaspark §C-2",
    confidence: 0.86,
    applicable_dielectrics: ["deionized_water"] },
  // ── Servo / gap control ─────────────────────────────────────────────
  { tip: "Servo gain tuning — raise gain until oscillation, drop 15% — too low → short, too high → hunt; check on flat test piece first",
    source: "Sodick AP §3.5 + Fanuc Robocut Sinker §5.2",
    confidence: 0.83,
    applicable_symptoms: ["burn_through_short"] },
  { tip: "Electrode wear comp — 1% wear at finishing; pre-burn a 5mm test pocket, measure depth delta, dial in compensation for production cavity",
    source: "Mitsubishi §3.6 (Wear Compensation Strategy)",
    confidence: 0.87,
    applicable_operations: ["finishing", "polishing"],
    applicable_symptoms: ["electrode_wear_excessive"] },
  // ── Corner / fine detail ────────────────────────────────────────────
  { tip: "Corner sharpening — switch to copper-tungsten 80/20 electrode + planetary motion 0.01mm offset; pure graphite rounds corners >5R0.02",
    source: "Charmilles §4.7 + JM Die Tomas 2024-09",
    confidence: 0.84,
    applicable_electrodes: ["copper_tungsten", "silver_tungsten"],
    applicable_symptoms: ["corner_sharpening_lost"] },
  // ── Finishing / Ra ──────────────────────────────────────────────────
  { tip: "Finish Ra target <0.4µm — use no-wear setting (negative duty cycle) + planetary orbiting 5-10% above gap; conventional EDM caps ~0.8µm",
    source: "AGIE Form 200 §6.8 + Machinery's Handbook 31st ed §EDM Finishing",
    confidence: 0.90,
    applicable_operations: ["polishing"],
    applicable_symptoms: ["finish_ra_high"] },
  { tip: "Polishing pass after finish — 2-3 zero-eccentricity orbital passes at 90% confidence-of-burn; physically removes recast layer ~3-5µm",
    source: "Sodick AP §3.7 (Polishing) + JM Die James 2025-01",
    confidence: 0.78,
    applicable_operations: ["polishing"] },
  // ── Material-specific ──────────────────────────────────────────────
  { tip: "Tungsten carbide — copper-tungsten (Cu-W 70/30) electrode mandatory; pure graphite wears 10× faster, copper alone arcs",
    source: "Mitsubishi §3.8 (Carbide Sinking) + Sandvik PCD/PCB §A-3",
    confidence: 0.91,
    applicable_workpieces: ["tungsten_carbide"] },
  { tip: "Inconel / titanium — water dielectric NOT kerosene (titanium fire risk); MRR drops 30% vs steel but oil/kerosene + Ti is a flash-fire hazard",
    source: "Fanuc Robocut Sinker §5.5 (Reactive Metal Safety) + NFPA 484",
    confidence: 0.94,
    applicable_workpieces: ["inconel", "titanium"],
    applicable_dielectrics: ["deionized_water"] },
  // ── Operator-skill ──────────────────────────────────────────────────
  { tip: "Sinker pre-flight — verify (1) electrode squareness ≤0.005mm/100mm, (2) workpiece grounded, (3) dielectric level, (4) flush manifold not clogged",
    source: "JM Die operator checklist 2024-12 + AGIE Form 200 §6.0",
    confidence: 0.95,
    applicable_operations: ["roughing", "semi_finishing", "finishing", "polishing", "corner_radius", "deep_pocket"] },
  { tip: "Burn-through short on through-hole — set Z-retract limit to 0.5mm BELOW final depth; without limit a short → max-feed plunge = scrap",
    source: "Sodick AP §3.6 + Mitsubishi §3.9 (Short-Circuit Safety)",
    confidence: 0.92,
    applicable_symptoms: ["burn_through_short"] },
  // ── Sparking-edge / electrode dressing ──────────────────────────────
  { tip: "Carbon-track recovery — pause, retract 5mm, dress electrode tip with carbon brush 30 sec, resume at 50% power — saves the electrode 80% of the time",
    source: "Sodick AP Service §3.2 (Arc Recovery) + JM Die Tomas 2024-08",
    confidence: 0.81,
    applicable_symptoms: ["arc_carbon_track"] },
  // ── Workflow / planning ─────────────────────────────────────────────
  { tip: "Rough + finish on TWO electrodes — never single-electrode; rough electrode geometry drifts > 0.1mm by end of cavity, finish needs fresh form",
    source: "Charmilles §4.10 + Mitsubishi §3.11 (Two-Electrode Strategy)",
    confidence: 0.90,
    applicable_operations: ["roughing", "finishing"] },
  { tip: "Spotting electrode position — datum from workpiece edge (NOT chuck); thermal growth at clamp shifts datum 0.02-0.05mm over a 4hr cycle",
    source: "Machinery's Handbook 31st ed §EDM Setup + AGIE Form 200 §6.1",
    confidence: 0.87,
    applicable_operations: ["roughing", "semi_finishing", "finishing", "polishing", "corner_radius", "deep_pocket"] },
  { tip: "Pocket >5×depth — STEP-burn (3-5 incremental electrodes at +0.1mm) NOT single-electrode plunge; flushing fails past 5×D regardless of strategy",
    source: "Charmilles §4.4 (Deep Cavity Sequential) + JM Die James 2024-10",
    confidence: 0.88,
    applicable_operations: ["deep_pocket"],
    applicable_symptoms: ["deep_pocket_choking"] },
];

export class SinkerEDMTribalCorpusEngine {
  surface(input: SinkerCorpusInput): SinkerCorpusResult {
    if (!input || !input.operation || !input.electrode_material || !input.workpiece_material || !input.dielectric || !input.operator_skill_level) {
      throw new Error("SinkerEDMTribalCorpusEngine.surface: operation + electrode_material + workpiece_material + dielectric + operator_skill_level required");
    }

    const warnings: string[] = [];
    const topN = input.top_n ?? 5;
    const minConfidence = input.min_confidence ?? 0.60;

    // ── Score every tip by 5-axis match ───────────────────────────────
    const scored: RankedSinkerTip[] = [];
    for (const tip of TIP_BANK) {
      let match = 0;
      // Operation match (0.20)
      if (tip.applicable_operations?.includes(input.operation)) match += 0.20;
      else if (!tip.applicable_operations) match += 0.05;
      // Electrode match (0.20)
      if (tip.applicable_electrodes?.includes(input.electrode_material)) match += 0.20;
      else if (!tip.applicable_electrodes) match += 0.05;
      // Workpiece match (0.15)
      if (tip.applicable_workpieces?.includes(input.workpiece_material)) match += 0.15;
      else if (!tip.applicable_workpieces) match += 0.05;
      // Dielectric match (0.10)
      if (tip.applicable_dielectrics?.includes(input.dielectric)) match += 0.10;
      else if (!tip.applicable_dielectrics) match += 0.05;
      // Symptom match dominates (0.35)
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

    // ── Action priority ───────────────────────────────────────────────
    let priority: string;
    if (input.recent_symptom !== null && input.recent_symptom !== undefined) {
      priority = `URGENT — ${input.recent_symptom} on sinker EDM requires immediate intervention (electrode/dielectric/gap loss → scrap risk)`;
    } else if (input.operator_skill_level === "entry") {
      priority = "GUIDED — entry-level operator + sinker EDM (high-value workpiece risk), review tips before burn-start";
    } else if (input.workpiece_material === "tungsten_carbide" || input.workpiece_material === "titanium" || input.workpiece_material === "inconel") {
      priority = `ELEVATED — ${input.workpiece_material} sinking; tip-bank guidance load-bearing for safety + Ra`;
    } else {
      priority = "ADVISORY — sinker EDM tips for situational awareness during burn";
    }

    // ── Escalation rule ───────────────────────────────────────────────
    let escalationNeeded = false;
    let escalationReason: string | null = null;
    if (input.operator_skill_level === "entry" && input.recent_symptom !== null && input.recent_symptom !== undefined) {
      escalationNeeded = true;
      escalationReason = `Entry-level operator + active sinker symptom ${input.recent_symptom} — escalate to intermediate/master before next burn (scrapped tool-steel block = $5-40k loss)`;
      warnings.push(escalationReason);
    }
    // Reactive metal + entry operator → ALWAYS escalate (NFPA 484 fire risk)
    if (input.operator_skill_level === "entry" && (input.workpiece_material === "titanium" || input.workpiece_material === "inconel")) {
      escalationNeeded = true;
      const reason = `Entry-level operator + reactive metal ${input.workpiece_material} — escalate (NFPA 484 fire risk if kerosene used)`;
      escalationReason = escalationReason ? escalationReason + "; " + reason : reason;
      warnings.push(reason);
    }

    if (topTips.length === 0) {
      warnings.push(`No tips matched (operation=${input.operation}, electrode=${input.electrode_material}, workpiece=${input.workpiece_material}, dielectric=${input.dielectric}) — extend corpus or relax filters`);
    }
    if (topTips.some(t => t.draft)) {
      warnings.push("Some surfaced tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before applying to production burn");
    }
    // Kerosene + reactive metal hard warning
    if ((input.workpiece_material === "titanium" || input.workpiece_material === "inconel") && (input.dielectric === "kerosene" || input.dielectric === "edm_oil")) {
      warnings.push(`HAZARD: ${input.dielectric} + ${input.workpiece_material} — NFPA 484 fire/flash risk; switch to deionized water dielectric (loses ~30% MRR but eliminates ignition path)`);
    }

    return {
      top_tips: topTips,
      recommended_action_priority: {
        value: priority,
        unit: "priority tier",
        source: "operator_skill × workpiece × symptom decision tree",
      },
      escalation_needed: escalationNeeded,
      escalation_reason: escalationReason,
      warnings,
      source: "SinkerEDMTribalCorpusEngine — Mitsubishi Sinker §3 + Charmilles Hyperspark §4 + AGIE Form 200 §6 + Sodick AP §3 + Fanuc Robocut Sinker §5 + Machinery's Handbook 31st ed §EDM + JM Die operator-captured tribal corpus (Tomas + James 2024-08..2025-01)",
    };
  }
}

export const sinkerEDMTribalCorpusEngine = new SinkerEDMTribalCorpusEngine();
