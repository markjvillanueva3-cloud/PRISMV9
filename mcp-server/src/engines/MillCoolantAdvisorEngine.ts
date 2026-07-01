/**
 * MillCoolantAdvisorEngine — recommends a coolant delivery mode for a mill operation
 *
 * Parity for LatheCoolantAdvisorEngine (LATHE-PRO-MS5). Where the Lathe advisor reasons
 * about turning/threading/parting/grooving, the Mill advisor reasons about milling-domain
 * operation types and adds the mill-canonical "air_blast" mode (compressed-air-only chip
 * evac for aluminum with sticky-chip risk) and an "adaptive_toolpath" decision input
 * (low-engagement HSM strategies need less coolant volume per tooth).
 *
 * Modes covered:
 *   - Flood             (conventional, high flow, low pressure)
 *   - High-pressure TSC (70-300 bar through-spindle/through-tool, deep pocket + chip evac)
 *   - Mist              (compressed air + atomized fluid)
 *   - MQL               (minimum quantity lubrication, 10-50 mL/h)
 *   - Air blast         (compressed-air-only, sticky-chip aluminum)  ← Mill-canonical
 *   - Dry               (no coolant, CBN/ceramic hardened-steel face milling)
 *   - Cryogenic         (LN2, -196 °C, for Ni/Ti superalloys)
 *
 * Decision drivers:
 *   - Material machinability / ISO group (P/M/K/N/S/H)
 *   - Tool material (carbide / ceramic / CBN / HSS / diamond)
 *   - Operation type (face/end-rough/end-finish/slot/contour/pocket/thread/drill/bore)
 *   - Engagement (high-engagement slotting vs low-engagement adaptive)
 *   - Tool overhang / chip evacuation difficulty (deep pockets, thin walls)
 *   - Thermal sensitivity (titanium, nickel-base, hardened tool steel)
 *   - Shop sustainability / cost preference
 *   - Through-spindle plumbing (TSC) availability
 *
 * Canonical references:
 *   - Sandvik Coromant Technical Guide (2022) §§ 3.7, 9.4 (mill coolant)
 *   - Klocke F. "Manufacturing Processes 1" (2011) §3.9 coolant
 *   - Jawahir I. (CIRP 2011) "Sustainability in machining"
 *   - Sutherland J.W. (ASME 1996) "Endmill coolant flow"
 *   - JM Die operator review (2026-05): air-blast preferred for aluminum HSM pockets
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-COOLANT-ADVISOR (iter58)
 * @version 1.0.0
 * @module MillCoolantAdvisorEngine
 */

export type MillCoolantMode =
  | "flood"
  | "high_pressure"
  | "mist"
  | "mql"
  | "air_blast"
  | "dry"
  | "cryogenic";

export type MillIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type MillOpType =
  | "face_milling"
  | "end_milling_rough"
  | "end_milling_finish"
  | "slot_milling"
  | "contour_milling"
  | "pocket_milling"
  | "thread_milling"
  | "drilling"
  | "boring";

export type MillToolMat =
  | "carbide"
  | "ceramic"
  | "cbn"
  | "hss"
  | "diamond";

export interface MillCoolantAdvisorInput {
  iso_group: MillIsoGroup;
  operation: MillOpType;
  tool_material: MillToolMat;
  /** Cutting speed Vc (m/min) — affects HPC preference */
  Vc_m_min?: number;
  /** Axial depth of cut (mm) — affects chip-control importance */
  ap_mm?: number;
  /** Radial engagement / stepover as fraction of tool diameter (0..1) */
  radial_engagement?: number;
  /** Deep pocket (depth/diameter > 3) boosts HPC */
  deep_pocket?: boolean;
  /** Deep hole drilling (L/D > 3) boosts HPC */
  deep_hole?: boolean;
  /** Adaptive / trochoidal toolpath in use (low engagement, low heat) */
  adaptive_toolpath?: boolean;
  /** Hardened workpiece (≥ 45 HRC) */
  hardened_workpiece?: boolean;
  /** Shop allows cryogenic LN2 infrastructure? */
  cryo_available?: boolean;
  /** Shop sustainability preference */
  sustainability_priority?: "low" | "medium" | "high";
  /** Through-spindle coolant plumbing present? (Haas TSC option, etc.) */
  thru_spindle_available?: boolean;
  /** Air-blast nozzle present? (mill-specific add-on) */
  air_blast_available?: boolean;
}

export interface MillCoolantAdvisorResult {
  recommendation: MillCoolantMode;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{ mode: MillCoolantMode; score: number; note: string }>;
  parameters: {
    pressure_bar?: number;
    flow_rate_lpm?: number;
    mql_ml_hr?: number;
    air_pressure_bar?: number;
    cryo_kg_hr?: number;
    concentration_pct?: number;
  };
  safety_notes: string[];
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function scoreFlood(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 55;
  if (i.iso_group === "P" || i.iso_group === "M") {
    score += 10;
    notes.push("Steel/stainless: flood handles thermal load + chip flush");
  }
  if (i.iso_group === "K") {
    score -= 30;
    notes.push("Cast iron: dry preferred — flood creates abrasive sludge in chip conveyor");
  }
  if (i.iso_group === "N" && i.operation === "end_milling_rough") {
    score += 5;
    notes.push("Aluminum roughing: flood washes chips before they re-cut");
  }
  if (i.tool_material === "ceramic") {
    score -= 30;
    notes.push("Ceramic: thermal shock risk — prefer dry or MQL");
  }
  if (i.hardened_workpiece && i.tool_material === "cbn") {
    score -= 35;
    notes.push("CBN on hardened steel: dry preferred — flood can crack insert");
  }
  if (i.sustainability_priority === "high") {
    score -= 15;
    notes.push("High sustainability pref → minimize flood usage");
  }
  // Mill-canonical: flood cannot reach the chip face in deep-hole drilling — TSC/HPC owns this.
  if (i.deep_hole && i.operation === "drilling") {
    score -= 20;
    notes.push("Deep-hole drilling: flood cannot reach chip face — TSC/HPC owns chip evac");
  }
  return { score: clamp(score), notes };
}

function scoreHpc(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;
  if (!i.thru_spindle_available) {
    score -= 25;
    notes.push("No TSC plumbing → external HPC only (reduced chip-evac benefit at tool tip)");
  }
  if (i.iso_group === "S") {
    score += 30;
    notes.push("Ni/Ti: HPC dramatically improves tool life (BUE control + heat removal)");
  }
  if (i.iso_group === "M") {
    score += 20;
    notes.push("Stainless: HPC breaks stringy chips inside pocket");
  }
  if (i.deep_pocket || i.deep_hole || i.operation === "drilling") {
    score += 25;
    notes.push("Deep pocket/hole: HPC near-mandatory for chip evacuation");
  }
  if (i.operation === "slot_milling") {
    score += 15;
    notes.push("Slotting (full radial engagement): HPC clears chips between flutes");
  }
  if ((i.Vc_m_min ?? 0) > 200) {
    score += 10;
  }
  if (i.adaptive_toolpath) {
    score += 5;
    notes.push("Adaptive toolpath: HPC helps clear shallow-engagement chip pile-up");
  }
  return { score: clamp(score), notes };
}

function scoreMist(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 25;
  if (i.iso_group === "N") {
    score += 20;
    notes.push("Aluminum: mist cools + lubricates without sticky-chip flooding");
  }
  if (i.operation === "thread_milling") {
    score += 10;
    notes.push("Thread milling: mist wets flanks without chip washout interruption");
  }
  if (i.sustainability_priority === "high") {
    score += 10;
  }
  if (i.iso_group === "S" || i.hardened_workpiece) {
    score -= 25;
    notes.push("Insufficient cooling for superalloys / hardened steel");
  }
  return { score: clamp(score), notes };
}

function scoreMql(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;
  if (i.iso_group === "N" || i.iso_group === "K") {
    score += 25;
    notes.push("Al/cast iron: MQL is industry-proven sustainable mill option");
  }
  if (i.sustainability_priority === "high") score += 20;
  else if (i.sustainability_priority === "medium") score += 10;
  if (i.iso_group === "S") {
    score -= 30;
    notes.push("Ni/Ti: MQL cannot absorb heat at cut zone");
  }
  if (i.operation === "drilling" && i.deep_hole) {
    score -= 20;
    notes.push("Deep holes: MQL insufficient to flush chips");
  }
  if (i.adaptive_toolpath && i.iso_group === "N") {
    score += 10;
    notes.push("Adaptive Al machining: MQL pairs well with low-engagement strategy");
  }
  return { score: clamp(score), notes };
}

function scoreAirBlast(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 20;
  if (!i.air_blast_available) {
    score -= 20;
    notes.push("No air-blast nozzle plumbed");
  }
  if (i.iso_group === "N") {
    score += 35;
    notes.push("Aluminum: air-blast clears sticky chips without coolant residue (JM Die preferred for HSM Al pockets)");
  }
  // Synergy: explicit air-blast plumbing + Al material together = JM-Die foxtrot canonical choice.
  // Tunes air_blast to outrank MQL for plumbed-air Al jobs where MQL would otherwise tie or win.
  if (i.iso_group === "N" && i.air_blast_available) {
    score += 10;
    notes.push("Plumbed air-blast + aluminum: JM-Die foxtrot canonical pairing (no coolant waste, no chip welding)");
  }
  if (i.iso_group === "K") {
    score += 20;
    notes.push("Cast iron: air-blast clears graphite dust without sludge generation");
  }
  if (i.adaptive_toolpath) {
    score += 15;
    notes.push("Adaptive toolpath: air-blast sufficient for low-engagement chip clear");
  }
  if (i.iso_group === "N" && i.adaptive_toolpath) {
    score += 10;
    notes.push("Adaptive Al + air-blast: foxtrot-canonical pairing for HSM pocket strategies");
  }
  if (i.sustainability_priority === "high") {
    score += 15;
    notes.push("High sustainability pref: air-blast eliminates coolant waste stream entirely");
  } else if (i.sustainability_priority === "medium") {
    score += 8;
  }
  if (i.iso_group === "S" || i.hardened_workpiece) {
    score -= 30;
    notes.push("Air-blast inadequate for superalloy / hardened-steel heat");
  }
  return { score: clamp(score), notes };
}

function scoreDry(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 20;
  if (i.iso_group === "K") {
    score += 40;
    notes.push("Cast iron: dry is canonical — graphite acts as built-in lubricant");
  }
  if (i.hardened_workpiece && i.tool_material === "cbn") {
    score += 35;
    notes.push("CBN milling hardened steel: dry preferred for thermal stability of insert");
  }
  if (i.tool_material === "ceramic") {
    score += 25;
    notes.push("Ceramic: dry or MQL avoid thermal-shock micro-cracking");
  }
  if (i.iso_group === "S") {
    score -= 40;
    notes.push("Ni/Ti: dry accelerates wear catastrophically");
  }
  if (i.operation === "drilling" && i.deep_hole) {
    score -= 30;
  }
  return { score: clamp(score), notes };
}

function scoreCryogenic(i: MillCoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 10;
  if (!i.cryo_available) {
    score -= 30;
    notes.push("No LN2 infrastructure — cryo infeasible");
  } else {
    if (i.iso_group === "S") {
      score += 50;
      notes.push("Ni/Ti: cryogenic LN2 gives 2-4× tool life vs flood");
    }
    if (i.hardened_workpiece) score += 10;
    if (i.sustainability_priority !== "low") score += 5;
  }
  return { score: clamp(score), notes };
}

function defaultParameters(mode: MillCoolantMode, input: MillCoolantAdvisorInput): MillCoolantAdvisorResult["parameters"] {
  switch (mode) {
    case "flood":
      return {
        pressure_bar: 5,
        flow_rate_lpm: input.operation === "end_milling_rough" || input.operation === "slot_milling" ? 60 : 30,
        concentration_pct: input.iso_group === "N" ? 7 : 8,
      };
    case "high_pressure":
      return {
        pressure_bar: input.deep_hole || input.deep_pocket ? 140 : 70,
        flow_rate_lpm: 20,
        concentration_pct: 8,
      };
    case "mist":
      return { pressure_bar: 3, flow_rate_lpm: 0.1 };
    case "mql":
      return { mql_ml_hr: input.operation === "end_milling_rough" ? 40 : 20 };
    case "air_blast":
      return { air_pressure_bar: 6 };
    case "dry":
      return {};
    case "cryogenic":
      return { cryo_kg_hr: 8 };
  }
}

function safetyNotes(mode: MillCoolantMode, input: MillCoolantAdvisorInput): string[] {
  const out: string[] = [];
  if (mode === "mist") out.push("Mist-exposure health risk — require enclosure + extraction");
  if (mode === "cryogenic") out.push("LN2 = asphyxiation + frostbite risk — O₂ monitor required");
  if (mode === "high_pressure") out.push("HPC > 100 bar — verify hose crimps + tool clamping torque");
  if (mode === "dry" && input.iso_group === "N") {
    out.push("Dry on aluminum: monitor built-up edge on flutes");
  }
  if (mode === "air_blast" && input.iso_group === "N" && input.deep_pocket) {
    out.push("Air-blast in deep Al pocket: monitor for chip-recutting + heat buildup");
  }
  if (mode === "flood" && input.hardened_workpiece) {
    out.push("Flood on hardened workpiece — monitor thermal-shock cracks on insert");
  }
  return out;
}

class MillCoolantAdvisorEngineImpl {
  advise(input: MillCoolantAdvisorInput): MillCoolantAdvisorResult {
    const scores = [
      { mode: "flood" as MillCoolantMode, ...scoreFlood(input) },
      { mode: "high_pressure" as MillCoolantMode, ...scoreHpc(input) },
      { mode: "mist" as MillCoolantMode, ...scoreMist(input) },
      { mode: "mql" as MillCoolantMode, ...scoreMql(input) },
      { mode: "air_blast" as MillCoolantMode, ...scoreAirBlast(input) },
      { mode: "dry" as MillCoolantMode, ...scoreDry(input) },
      { mode: "cryogenic" as MillCoolantMode, ...scoreCryogenic(input) },
    ];
    scores.sort((a, b) => b.score - a.score);
    const top = scores[0]!;
    const second = scores[1];
    const confidence = second
      ? Math.min(1, (top.score - second.score) / 30 + 0.5)
      : 0.7;

    return {
      recommendation: top.mode,
      confidence: round2(confidence),
      reasoning: top.notes,
      alternatives: scores.slice(1).map((s) => ({
        mode: s.mode,
        score: s.score,
        note: s.notes[0] ?? "",
      })),
      parameters: defaultParameters(top.mode, input),
      safety_notes: safetyNotes(top.mode, input),
    };
  }

  getStats(): { modes: MillCoolantMode[]; factors_considered: string[] } {
    return {
      modes: ["flood", "high_pressure", "mist", "mql", "air_blast", "dry", "cryogenic"],
      factors_considered: [
        "iso_group",
        "operation",
        "tool_material",
        "Vc_m_min",
        "ap_mm",
        "radial_engagement",
        "deep_pocket",
        "deep_hole",
        "adaptive_toolpath",
        "hardened_workpiece",
        "cryo_available",
        "sustainability_priority",
        "thru_spindle_available",
        "air_blast_available",
      ],
    };
  }
}

export const millCoolantAdvisorEngine = new MillCoolantAdvisorEngineImpl();
export type { MillCoolantAdvisorEngineImpl };
