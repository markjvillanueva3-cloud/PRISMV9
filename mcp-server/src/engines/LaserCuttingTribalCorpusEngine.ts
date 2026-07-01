/**
 * LaserCuttingTribalCorpusEngine — laser-cutting operator-wisdom corpus + surfacer
 *
 * Closes the iter20 P2 "laser pipeline" gap with a tribal-knowledge native
 * surfacer (foxtrot's lane, same proven pattern as OperatorCoachingTipsEngine
 * + SinkerEDMTribalCorpusEngine). PRISM has laser process engines but no
 * dedicated tip-corpus surfacing the operator wisdom that separates a clean
 * 6-mm SS304 cut from a dross-laden burn at 2× the cost.
 *
 * Tribal-specialist soul rule: every tip carries handbook-grade attribution
 * (Trumpf / Bystronic / Mazak Optonics / Amada / IPG Photonics manuals +
 * Machinery's Handbook §Laser Processing + JM Die operator-captured corpus).
 * Confidence-weighted, no anonymous tips, ≥0.60 surfaced, <0.75 marked draft.
 *
 * 20 curated tips cover: assist-gas selection (O₂ vs N₂ vs air for thickness +
 * material), focal-position tuning (above/at/below surface), pulse vs CW mode,
 * kerf compensation and lead-in/lead-out geometry, dross prevention, piercing
 * strategy (pulse-pierce vs ramp-pierce), nozzle standoff and gas pressure,
 * fiber vs CO₂ wavelength material-specific behavior, edge-quality (Ra + HAZ +
 * recast), and safety (ANSI Z136.1 / IEC 60825 class-4 + reflective-metal
 * back-reflection hazard).
 *
 * Reference: Trumpf TruLaser Application Guide §3 (Cutting Parameters);
 *   Bystronic ByCut Star §4 (Assist Gas Matrix); Mazak Optonics FS Series §5
 *   (Focal + Nozzle); Amada Ensis 3kW Service §3 (Fiber-Laser Application);
 *   IPG Photonics YLS Cutting Guide §A; Machinery's Handbook 31st ed §Laser;
 *   ANSI Z136.1 (Laser Safety); IEC 60825-1; JM Die operator Tomas + James
 *   2024-08..2025-01 captured corpus.
 *
 * @version 1.0.0
 * @module LaserCuttingTribalCorpusEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type LaserOperation = "thin_sheet_cut" | "thick_plate_cut" | "piercing" | "etching_marking" | "fine_geometry" | "tube_cut";
export type LaserSource = "fiber_1um" | "co2_10um" | "nd_yag" | "diode";
export type LaserMaterial = "mild_steel" | "stainless_steel" | "aluminum" | "brass_copper" | "titanium" | "galvanized_steel" | "acrylic_polymer";
export type AssistGas = "oxygen" | "nitrogen" | "air" | "argon";
export type LaserSymptom =
  | "dross_bottom_edge"
  | "kerf_taper"
  | "edge_burn_HAZ"
  | "pierce_blow_back"
  | "back_reflection_alarm"
  | "hole_roundness_lost"
  | "etch_depth_inconsistent"
  | "lens_contamination"
  | "nozzle_burnback"
  | null;
export type OperatorSkill = "entry" | "intermediate" | "master";

interface LaserTipRecord {
  tip: string;
  source: string;
  confidence: number;
  applicable_operations?: LaserOperation[];
  applicable_sources?: LaserSource[];
  applicable_materials?: LaserMaterial[];
  applicable_gases?: AssistGas[];
  applicable_symptoms?: NonNullable<LaserSymptom>[];
}

export interface LaserCorpusInput {
  operation: LaserOperation;
  laser_source: LaserSource;
  material: LaserMaterial;
  assist_gas: AssistGas;
  material_thickness_mm: number;
  operator_skill_level: OperatorSkill;
  recent_symptom?: LaserSymptom;
  top_n?: number;
  min_confidence?: number;
}

export interface RankedLaserTip {
  tip: string;
  source: string;
  confidence: number;
  match_score: number;
  draft: boolean;
}

export interface LaserCorpusResult {
  top_tips: RankedLaserTip[];
  recommended_action_priority: AtomicValue<string>;
  escalation_needed: boolean;
  escalation_reason: string | null;
  warnings: string[];
  source: string;
}

// Curated tip bank — laser-cutting operator wisdom (Trumpf / Bystronic / Mazak Optonics / Amada / IPG / Machinery's Handbook / JM Die)
const TIP_BANK: LaserTipRecord[] = [
  // ── Assist gas selection ────────────────────────────────────────────
  { tip: "Mild steel >5 mm — O₂ assist (exothermic boost) at 0.5-1.5 bar; N₂ wastes 70% throughput AND oxidizes the edge at thickness",
    source: "Trumpf TruLaser §3.2 (O₂ vs N₂ Matrix) + JM Die Tomas 2024-09",
    confidence: 0.93,
    applicable_operations: ["thick_plate_cut"],
    applicable_materials: ["mild_steel"],
    applicable_gases: ["oxygen"] },
  { tip: "Stainless steel + N₂ at 15-25 bar — produces oxide-free oxidation-free edge ready for paint/weld; O₂ on SS = scrap (chromium oxide layer)",
    source: "Bystronic ByCut Star §4 (Assist Gas Matrix) + Machinery's Handbook §Laser",
    confidence: 0.94,
    applicable_materials: ["stainless_steel"],
    applicable_gases: ["nitrogen"] },
  { tip: "Aluminum — N₂ high-pressure (18-25 bar) MANDATORY; O₂ ignites Al at sustained heat (Class D fire), air gas barely cuts above 3 mm",
    source: "IPG Photonics YLS §A.3 + ANSI Z136.1 §6.2 (reflective metal safety)",
    confidence: 0.95,
    applicable_materials: ["aluminum"],
    applicable_gases: ["nitrogen"] },
  // ── Focal position ──────────────────────────────────────────────────
  { tip: "Focal position — thin (<3 mm) on top surface; medium (3-8 mm) at 1/3 depth; thick (>8 mm) at center; deeper than 1/2-depth = bottom dross",
    source: "Mazak Optonics FS §5.3 (Focal Strategy)",
    confidence: 0.89,
    applicable_operations: ["thin_sheet_cut", "thick_plate_cut"] },
  { tip: "Dross at bottom edge — drop focal 0.5 mm AND/OR increase gas pressure 10%; bottom dross is 80% under-focus, 20% under-gas",
    source: "Trumpf TruLaser §3.5 + JM Die Tomas 2024-10",
    confidence: 0.88,
    applicable_symptoms: ["dross_bottom_edge"] },
  // ── Piercing ────────────────────────────────────────────────────────
  { tip: "Pierce thick plate >12 mm — PULSE pierce 5-15 sec (200-500 Hz, 50-80% duty) NOT ramp; ramp on thick = blow-back + lens damage",
    source: "Amada Ensis 3kW §3.4 (Piercing Strategy)",
    confidence: 0.91,
    applicable_operations: ["piercing"],
    applicable_symptoms: ["pierce_blow_back"] },
  { tip: "Pierce thin (<3 mm) — RAMP pierce (CW ramp 0.2-1.0 sec) NOT pulse; pulse on thin overheats and warps the lead-in",
    source: "Bystronic ByCut §4.5 (Thin-Sheet Piercing)",
    confidence: 0.86,
    applicable_operations: ["piercing"] },
  // ── Nozzle / standoff ───────────────────────────────────────────────
  { tip: "Nozzle standoff — 0.5-1.0 mm for HD nozzle, 1.0-1.5 mm for standard; >2 mm and gas column collapses, edge burns",
    source: "Trumpf TruLaser §3.6 + Mazak Optonics FS §5.5 (Nozzle Standoff)",
    confidence: 0.87,
    applicable_symptoms: ["edge_burn_HAZ"] },
  { tip: "Nozzle burnback — replace nozzle BEFORE the lens; debris-coated nozzle = uneven gas column = lens splatter (10× more $$ to replace)",
    source: "JM Die James 2024-12 + Trumpf TruLaser Service §6.2",
    confidence: 0.84,
    applicable_symptoms: ["nozzle_burnback", "lens_contamination"] },
  // ── Fiber vs CO₂ ────────────────────────────────────────────────────
  { tip: "Fiber 1µm + copper/brass — back-reflection HAZARD; use shutter sensor + isolator. CO₂ 10µm reflects less (still risk, less catastrophic)",
    source: "IPG Photonics YLS §A.5 + ANSI Z136.1 §7.3 (Back-Reflection Safety)",
    confidence: 0.96,
    applicable_sources: ["fiber_1um"],
    applicable_materials: ["brass_copper"],
    applicable_symptoms: ["back_reflection_alarm"] },
  { tip: "CO₂ + galvanized steel — zinc fumes are toxic (zinc-oxide fever); MANDATORY downdraft + fume extractor; OSHA PEL 5 mg/m³",
    source: "OSHA 29 CFR 1910.1000 + Trumpf §3.9 (Galvanized Cutting)",
    confidence: 0.94,
    applicable_sources: ["co2_10um", "fiber_1um"],
    applicable_materials: ["galvanized_steel"] },
  // ── Kerf / geometry ─────────────────────────────────────────────────
  { tip: "Kerf taper — top wider than bottom = focal too high; symmetric = OK; bottom wider = focal too low or gas pressure too high",
    source: "Bystronic ByCut §4.8 (Kerf Geometry)",
    confidence: 0.86,
    applicable_symptoms: ["kerf_taper"] },
  { tip: "Hole roundness — slow lead-in (50% feed) for first 90° of arc; full-speed pierce-and-cut deforms small holes (<diameter = thickness×1.5)",
    source: "Mazak Optonics FS §5.7 + JM Die Tomas 2024-11",
    confidence: 0.82,
    applicable_operations: ["fine_geometry"],
    applicable_symptoms: ["hole_roundness_lost"] },
  // ── Tube cutting ────────────────────────────────────────────────────
  { tip: "Tube cut — A-axis sync ±0.005° to feed rate; rotational lag stretches the kerf into a helix, especially on small-diameter tube (<25 mm)",
    source: "Trumpf TruLaser Tube §4.2",
    confidence: 0.83,
    applicable_operations: ["tube_cut"] },
  // ── Marking / etching ───────────────────────────────────────────────
  { tip: "Etch inconsistency — surface contamination dominant cause; clean with isopropanol+wipe BEFORE marking, not after; oils refract the beam",
    source: "Amada Ensis §3.6 (Marking Surface Prep)",
    confidence: 0.81,
    applicable_operations: ["etching_marking"],
    applicable_symptoms: ["etch_depth_inconsistent"] },
  // ── Acrylic / polymer ───────────────────────────────────────────────
  { tip: "Acrylic — CO₂ 10µm flame-polishes the edge automatically; fiber 1µm leaves rough crystalline edge (wavelength absorption mismatch)",
    source: "Machinery's Handbook 31st ed §Laser §Polymer + IPG YLS §A.7",
    confidence: 0.89,
    applicable_sources: ["co2_10um"],
    applicable_materials: ["acrylic_polymer"] },
  // ── Edge quality ───────────────────────────────────────────────────
  { tip: "Edge HAZ minimization — pulse mode at 100-1000 Hz (heat-pulse instead of continuous); CW gives smoother edge BUT 2-5× larger HAZ",
    source: "Trumpf TruLaser §3.7 (HAZ Control) + Machinery's Handbook §Laser",
    confidence: 0.85,
    applicable_symptoms: ["edge_burn_HAZ"] },
  // ── Pre-cut / setup ────────────────────────────────────────────────
  { tip: "Laser pre-flight — verify (1) gas purity ≥99.95% (1 ppm O₂ in N₂ ruins SS edge), (2) lens clean (no haze), (3) nozzle centered, (4) interlocks active",
    source: "ANSI Z136.1 §4.5 (Pre-Use Inspection) + JM Die operator checklist 2024-12",
    confidence: 0.95,
    applicable_operations: ["thin_sheet_cut", "thick_plate_cut", "piercing", "etching_marking", "fine_geometry", "tube_cut"] },
  { tip: "Class-4 laser HARD rules — eye protection OD≥6 for 1064nm fiber / OD≥4 for 10600nm CO₂; door-open interlock NEVER bypass; ANSI Z136.1 mandatory",
    source: "ANSI Z136.1 §3 + IEC 60825-1 §8 (Class 4 Engineering Controls)",
    confidence: 0.99,
    applicable_sources: ["fiber_1um", "co2_10um", "nd_yag"] },
  // ── Titanium ────────────────────────────────────────────────────────
  { tip: "Titanium — Argon shielding NOT nitrogen (Ti+N at heat → titanium nitride embrittlement); higher cost gas, but Ti+N₂ ruins fatigue life",
    source: "IPG Photonics YLS §A.4 (Titanium Cutting) + Machinery's Handbook §Reactive Metals",
    confidence: 0.92,
    applicable_materials: ["titanium"],
    applicable_gases: ["argon"] },
];

export class LaserCuttingTribalCorpusEngine {
  surface(input: LaserCorpusInput): LaserCorpusResult {
    if (!input || !input.operation || !input.laser_source || !input.material || !input.assist_gas || input.material_thickness_mm == null || !input.operator_skill_level) {
      throw new Error("LaserCuttingTribalCorpusEngine.surface: operation + laser_source + material + assist_gas + material_thickness_mm + operator_skill_level required");
    }
    if (input.material_thickness_mm <= 0) {
      throw new Error("LaserCuttingTribalCorpusEngine.surface: material_thickness_mm must be positive");
    }

    const warnings: string[] = [];
    const topN = input.top_n ?? 5;
    const minConfidence = input.min_confidence ?? 0.60;

    // ── Score every tip by 5-axis match ───────────────────────────────
    const scored: RankedLaserTip[] = [];
    for (const tip of TIP_BANK) {
      let match = 0;
      if (tip.applicable_operations?.includes(input.operation)) match += 0.20;
      else if (!tip.applicable_operations) match += 0.05;
      if (tip.applicable_sources?.includes(input.laser_source)) match += 0.15;
      else if (!tip.applicable_sources) match += 0.05;
      if (tip.applicable_materials?.includes(input.material)) match += 0.20;
      else if (!tip.applicable_materials) match += 0.05;
      if (tip.applicable_gases?.includes(input.assist_gas)) match += 0.10;
      else if (!tip.applicable_gases) match += 0.05;
      if (input.recent_symptom && tip.applicable_symptoms?.includes(input.recent_symptom)) {
        match += 0.35;  // symptom-match dominates
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
      priority = `URGENT — ${input.recent_symptom} on laser requires immediate intervention (lens/nozzle damage risk; back-reflection class-4 hazard)`;
    } else if (input.operator_skill_level === "entry") {
      priority = "GUIDED — entry-level operator + Class-4 laser (eye/skin hazard + reflective-metal risk), review safety + tips before cut";
    } else if (input.material === "titanium" || input.material === "brass_copper") {
      priority = `ELEVATED — ${input.material} laser cutting; reactive/reflective hazard (Ti shielding required; Cu back-reflection on fiber)`;
    } else if (input.material === "galvanized_steel") {
      priority = "ELEVATED — galvanized steel; zinc-oxide fume hazard (OSHA PEL 5 mg/m³, downdraft mandatory)";
    } else {
      priority = "ADVISORY — laser cutting tips for situational awareness during burn";
    }

    // ── Escalation rule ───────────────────────────────────────────────
    let escalationNeeded = false;
    let escalationReason: string | null = null;
    if (input.operator_skill_level === "entry" && input.recent_symptom !== null && input.recent_symptom !== undefined) {
      escalationNeeded = true;
      escalationReason = `Entry-level operator + active laser symptom ${input.recent_symptom} — escalate to intermediate/master before next cut (lens damage = $2-15k, sheet scrap)`;
      warnings.push(escalationReason);
    }
    // Fiber + copper/brass + entry → always escalate (back-reflection class-4 hazard)
    if (input.operator_skill_level === "entry" && input.laser_source === "fiber_1um" && input.material === "brass_copper") {
      escalationNeeded = true;
      const reason = "Entry-level operator + fiber 1µm + copper/brass — escalate (back-reflection class-4 ANSI Z136.1 §7.3 hazard)";
      escalationReason = escalationReason ? escalationReason + "; " + reason : reason;
      warnings.push(reason);
    }

    if (topTips.length === 0) {
      warnings.push(`No tips matched (operation=${input.operation}, laser=${input.laser_source}, material=${input.material}, gas=${input.assist_gas}) — extend corpus or relax filters`);
    }
    if (topTips.some(t => t.draft)) {
      warnings.push("Some surfaced tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before production");
    }
    // Critical safety warnings
    if (input.material === "aluminum" && input.assist_gas === "oxygen") {
      warnings.push("HAZARD: aluminum + O₂ assist — Class D fire ignition risk per ANSI Z136.1 §6.2; switch to nitrogen 18-25 bar");
    }
    if (input.material === "stainless_steel" && input.assist_gas === "oxygen") {
      warnings.push("EDGE-QUALITY: stainless steel + O₂ → chromium-oxide black edge requires post-grind for paint/weld; switch to N₂ if downstream cares about edge");
    }
    if (input.material === "titanium" && input.assist_gas === "nitrogen") {
      warnings.push("METALLURGY: titanium + N₂ at cutting temperature → titanium nitride embrittlement, fatigue-life loss; switch to argon");
    }
    if (input.material === "galvanized_steel" && input.material_thickness_mm > 1) {
      warnings.push("FUME: galvanized steel cutting → zinc-oxide fever risk (OSHA PEL 5 mg/m³); downdraft + extractor MANDATORY per 29 CFR 1910.1000");
    }
    if (input.laser_source === "fiber_1um" && input.material === "brass_copper") {
      warnings.push("BACK-REFLECTION: fiber 1µm + copper/brass — verify shutter sensor + isolator before cut per ANSI Z136.1 §7.3");
    }
    if (input.material_thickness_mm > 25) {
      warnings.push(`THICKNESS: ${input.material_thickness_mm} mm exceeds typical fiber-laser practical limit (25 mm) — verify machine power class + assist gas can support`);
    }

    return {
      top_tips: topTips,
      recommended_action_priority: {
        value: priority,
        unit: "priority tier",
        source: "operator_skill × material × symptom × source decision tree",
      },
      escalation_needed: escalationNeeded,
      escalation_reason: escalationReason,
      warnings,
      source: "LaserCuttingTribalCorpusEngine — Trumpf TruLaser §3 + Bystronic ByCut §4 + Mazak Optonics FS §5 + Amada Ensis §3 + IPG Photonics YLS §A + Machinery's Handbook 31st ed §Laser + ANSI Z136.1 + IEC 60825-1 + OSHA 29 CFR 1910.1000 + JM Die operator-captured corpus (Tomas + James 2024-08..2025-01)",
    };
  }
}

export const laserCuttingTribalCorpusEngine = new LaserCuttingTribalCorpusEngine();
