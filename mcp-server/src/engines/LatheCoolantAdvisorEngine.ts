/**
 * LatheCoolantAdvisorEngine
 * ===========================
 *
 * Recommends a coolant delivery mode for a lathe operation given
 * ISO material group, tool material, operation type, and environment.
 *
 * Modes covered:
 *   - Flood (conventional, high flow, low pressure)
 *   - High-pressure (70-300 bar, chip breaking, thru-spindle)
 *   - Mist (compressed air + atomized fluid)
 *   - MQL (minimum quantity lubrication, 10-50 mL/h)
 *   - Dry (no coolant, CBN/ceramic hard turning)
 *   - Cryogenic (LN2, -196 °C, for Ni/Ti supers)
 *
 * Decision drivers:
 *   - Material machinability / ISO group (P/M/K/N/S/H)
 *   - Tool material (carbide / ceramic / CBN / HSS)
 *   - Operation type (rough/finish/drill/thread/part-off)
 *   - Chip control (long stringy vs fragmented)
 *   - Thermal sensitivity (titanium, nickel-base)
 *   - Shop sustainability / cost preference
 *
 * Canonical references:
 *   - Sandvik Coromant Technical Guide (2022) §§ 3.7, 9.4
 *   - Klocke F. "Manufacturing Processes 1" (2011) §3.9 coolant
 *   - Jawahir I. (CIRP 2011) "Sustainability in machining"
 *
 * @module engines/LatheCoolantAdvisorEngine
 * @milestone LATHE-PRO-MS5
 */

export type CoolantMode =
  | "flood"
  | "high_pressure"
  | "mist"
  | "mql"
  | "dry"
  | "cryogenic";

export type LatheIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

export type LatheOpType =
  | "roughing"
  | "finishing"
  | "drilling"
  | "threading"
  | "parting"
  | "grooving"
  | "boring";

export type ToolMat =
  | "carbide"
  | "ceramic"
  | "cbn"
  | "hss"
  | "diamond";

export interface CoolantAdvisorInput {
  iso_group: LatheIsoGroup;
  operation: LatheOpType;
  tool_material: ToolMat;
  /** Cutting speed Vc (m/min) — optional, affects high-pressure preference */
  Vc_m_min?: number;
  /** Depth of cut (mm) — affects chip control importance */
  ap_mm?: number;
  /** Deep hole drilling (L/D > 3) boosts HPC */
  deep_hole?: boolean;
  /** Hard turning (workpiece ≥ 45 HRC) */
  hard_turning?: boolean;
  /** Shop allows cryogenic LN2 infrastructure? */
  cryo_available?: boolean;
  /** Shop sustainability preference (dry/MQL boost) */
  sustainability_priority?: "low" | "medium" | "high";
  /** Through-spindle coolant plumbing present on lathe? */
  thru_spindle_available?: boolean;
}

export interface CoolantAdvisorResult {
  recommendation: CoolantMode;
  confidence: number;
  reasoning: string[];
  alternatives: Array<{
    mode: CoolantMode;
    score: number;
    note: string;
  }>;
  parameters: {
    pressure_bar?: number;
    flow_rate_lpm?: number;
    mql_ml_hr?: number;
    cryo_kg_hr?: number;
    concentration_pct?: number;
  };
  safety_notes: string[];
}

function scoreFlood(i: CoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 55; // universally applicable baseline

  if (i.iso_group === "P" || i.iso_group === "M") {
    score += 10;
    notes.push("Steel/stainless: flood handles thermal + chip flush");
  }
  if (i.iso_group === "K") {
    score -= 20;
    notes.push("Cast iron: dry preferred, flood creates grinding sludge");
  }
  if (i.iso_group === "N" && i.operation === "roughing") {
    score += 5; // aluminum roughing benefits from flood
  }
  if (i.hard_turning && i.tool_material === "cbn") {
    score -= 40;
    notes.push("Hard turning with CBN prefers dry — flood can crack insert");
  }
  if (i.tool_material === "ceramic") {
    score -= 25;
    notes.push("Ceramic thermal shock risk — prefer dry or MQL");
  }
  if (i.sustainability_priority === "high") {
    score -= 15;
    notes.push("High sustainability pref → reduce flood coolant usage");
  }
  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreHpc(i: CoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;
  if (!i.thru_spindle_available) {
    score -= 20;
    notes.push("No thru-spindle plumbing → external HPC only (reduced benefit)");
  }
  if (i.iso_group === "S") {
    score += 30;
    notes.push("Ni/Ti: HPC dramatically improves tool life (built-up edge control)");
  }
  if (i.iso_group === "M") {
    score += 20;
    notes.push("Stainless: HPC breaks stringy chips");
  }
  if (i.deep_hole || i.operation === "drilling") {
    score += 25;
    notes.push("Deep hole drilling: HPC is near-mandatory for chip evacuation");
  }
  if (i.operation === "parting" || i.operation === "grooving") {
    score += 15;
    notes.push("Parting/grooving benefits from HPC chip lift");
  }
  if ((i.Vc_m_min ?? 0) > 200) {
    score += 10;
  }
  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreMist(i: CoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 25;
  if (i.iso_group === "N") {
    score += 20;
    notes.push("Aluminum: mist cools + lubricates without flooding");
  }
  if (i.operation === "threading") {
    score += 10;
    notes.push("Threading: mist wets flanks without chip washout");
  }
  if (i.sustainability_priority === "high") {
    score += 10;
  }
  if (i.iso_group === "S" || i.hard_turning) {
    score -= 20;
    notes.push("Insufficient cooling for superalloys / hardened");
  }
  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreMql(i: CoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 30;
  if (i.iso_group === "N" || i.iso_group === "K") {
    score += 25;
    notes.push("Al/cast iron: MQL is industry-proven sustainable option");
  }
  if (i.sustainability_priority === "high") {
    score += 20;
  } else if (i.sustainability_priority === "medium") {
    score += 10;
  }
  if (i.iso_group === "S") {
    score -= 30;
    notes.push("Ni/Ti: MQL cannot absorb heat at cut zone");
  }
  if (i.operation === "drilling" && i.deep_hole) {
    score -= 20;
    notes.push("Deep holes: MQL insufficient to flush chips");
  }
  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreDry(i: CoolantAdvisorInput): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 20;
  if (i.iso_group === "K") {
    score += 40;
    notes.push("Cast iron: dry is canonical — graphite acts as lubricant");
  }
  if (i.hard_turning && i.tool_material === "cbn") {
    score += 35;
    notes.push("CBN hard turning: dry is preferred for thermal stability");
  }
  if (i.tool_material === "ceramic") {
    score += 25;
    notes.push("Ceramic: dry or MQL avoid thermal shock cracking");
  }
  if (i.iso_group === "S") {
    score -= 40;
    notes.push("Ni/Ti: dry accelerates wear catastrophically");
  }
  if (i.operation === "drilling" && i.deep_hole) {
    score -= 30;
  }
  return { score: Math.max(0, Math.min(100, score)), notes };
}

function scoreCryogenic(i: CoolantAdvisorInput): { score: number; notes: string[] } {
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
    if (i.hard_turning) {
      score += 10;
    }
    if (i.sustainability_priority !== "low") {
      score += 5; // no waste coolant stream
    }
  }
  return { score: Math.max(0, Math.min(100, score)), notes };
}

function defaultParameters(mode: CoolantMode, input: CoolantAdvisorInput): CoolantAdvisorResult["parameters"] {
  switch (mode) {
    case "flood":
      return {
        pressure_bar: 5,
        flow_rate_lpm: input.operation === "roughing" ? 60 : 30,
        concentration_pct: input.iso_group === "N" ? 7 : 8,
      };
    case "high_pressure":
      return {
        pressure_bar: input.operation === "drilling" ? 140 : 70,
        flow_rate_lpm: 20,
        concentration_pct: 8,
      };
    case "mist":
      return {
        pressure_bar: 3,
        flow_rate_lpm: 0.1,
      };
    case "mql":
      return {
        mql_ml_hr: input.operation === "roughing" ? 40 : 20,
      };
    case "dry":
      return {};
    case "cryogenic":
      return {
        cryo_kg_hr: 8,
      };
  }
}

function safetyNotes(mode: CoolantMode, input: CoolantAdvisorInput): string[] {
  const out: string[] = [];
  if (mode === "mist") out.push("Mist-exposure health risk — require enclosure + extraction");
  if (mode === "cryogenic") out.push("LN2 = asphyxiation + frostbite risk — O₂ monitor required");
  if (mode === "high_pressure") out.push("HPC > 100 bar — check hose crimp + insert clamping");
  if (mode === "dry" && input.iso_group === "N") out.push("Dry on aluminum: monitor built-up edge on tool");
  if (mode === "flood" && input.hard_turning) out.push("Flood during hard turning — monitor thermal shock cracks on insert");
  return out;
}

class LatheCoolantAdvisorEngineImpl {
  advise(input: CoolantAdvisorInput): CoolantAdvisorResult {
    const scores = [
      { mode: "flood" as CoolantMode, ...scoreFlood(input) },
      { mode: "high_pressure" as CoolantMode, ...scoreHpc(input) },
      { mode: "mist" as CoolantMode, ...scoreMist(input) },
      { mode: "mql" as CoolantMode, ...scoreMql(input) },
      { mode: "dry" as CoolantMode, ...scoreDry(input) },
      { mode: "cryogenic" as CoolantMode, ...scoreCryogenic(input) },
    ];
    scores.sort((a, b) => b.score - a.score);
    const top = scores[0]!;

    const confidence =
      scores.length >= 2
        ? Math.min(1, (top.score - scores[1]!.score) / 30 + 0.5)
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

  getStats(): {
    modes: CoolantMode[];
    factors_considered: string[];
  } {
    return {
      modes: ["flood", "high_pressure", "mist", "mql", "dry", "cryogenic"],
      factors_considered: [
        "iso_group",
        "operation",
        "tool_material",
        "Vc_m_min",
        "deep_hole",
        "hard_turning",
        "sustainability_priority",
        "thru_spindle_available",
      ],
    };
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const latheCoolantAdvisorEngine = new LatheCoolantAdvisorEngineImpl();
export type { LatheCoolantAdvisorEngineImpl };
