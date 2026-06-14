/**
 * ToolpathStrategyEngine — meta-strategy router for mill-domain toolpaths.
 *
 * STUB-RESCUE (slot:bravo 2026-05-27, U-STUB-HUNT-08, mill-galaxy). Original
 * was a 17-line U-EFF25 stub returning {ok:false, strategy:"fallback"}.
 * millDispatcher routes 4 actions here (generate / generateRest /
 * generateHSM / generateTrochoidal). Real implementation surfaces strategy
 * recommendations + canonical parameter envelopes by operation + feature.
 *
 * Defers all force/power validation to MillingForceEngine (canonical Kienzle)
 * — never inlines physics per bravo-soul rule.
 *
 * @version 2.0.0 — restored from stub
 */
import type { ToolGeometry } from "./MillingForceEngine.js";
import type { ISOGroup } from "../physics/constants.js";

const TROCHOIDAL_STEPOVER_PCT = 0.10;
const HSM_STEPOVER_PCT = 0.10;
const HSM_AXIAL_DEPTH_FACTOR = 1.5;       // ap = 1.5 × d (high axial / low radial)
const ADAPTIVE_STEPOVER_PCT = 0.30;
const ROUGH_STEPOVER_PCT = 0.50;
const FINISH_STEPOVER_PCT = 0.05;
const REST_STEPOVER_PCT = 0.25;

export type Operation = "rough" | "rest" | "semi" | "finish" | "hsm" | "trochoidal";
export type Feature = "pocket" | "contour" | "slot" | "face" | "3d-surface" | "thread";

export interface BaseInput {
  iso_group?: ISOGroup;
  material?: string;
  tool: ToolGeometry;
  feature?: Feature;
}

export interface ToolpathStrategy {
  strategy: string;
  feature: Feature;
  operation: Operation;
  parameters: {
    stepover_pct: number;
    stepover_mm: number;
    doc_mm: number;
    woc_mm: number;
    lead_in: string;
    direction: "climb" | "conventional";
  };
  rationale: string;
}

function defaultFeature(input: BaseInput): Feature {
  return input.feature ?? "pocket";
}

function lead(strat: string): string {
  if (strat === "trochoidal") return "tangent-arc";
  if (strat === "hsm") return "ramp-helix";
  return "ramp";
}

function buildStrategy(operation: Operation, input: BaseInput, stepoverPct: number, docFactor: number): ToolpathStrategy {
  const d = input.tool.diameter_mm;
  const feature = defaultFeature(input);
  const stepover_mm = d * stepoverPct;
  return {
    strategy: operation,
    feature,
    operation,
    parameters: {
      stepover_pct: stepoverPct,
      stepover_mm,
      doc_mm: d * docFactor,
      woc_mm: stepover_mm,
      lead_in: lead(operation),
      direction: "climb",
    },
    rationale: `${operation} on ${feature} Ø${d}mm: stepover ${(stepoverPct * 100).toFixed(0)}% of d (${stepover_mm.toFixed(2)} mm), climb-mill`,
  };
}

export class ToolpathStrategyEngine {
  /** Generic strategy generator — routes by operation field. */
  generate(input: BaseInput & { operation?: Operation }): ToolpathStrategy {
    if (!input?.tool) throw new Error("ToolpathStrategyEngine.generate: tool required");
    const op = input.operation ?? "rough";
    switch (op) {
      case "rough": return buildStrategy("rough", input, ROUGH_STEPOVER_PCT, 0.5);
      case "semi":  return buildStrategy("semi", input, ADAPTIVE_STEPOVER_PCT, 0.4);
      case "finish": return buildStrategy("finish", input, FINISH_STEPOVER_PCT, 0.2);
      case "rest": return this.generateRest(input);
      case "hsm": return this.generateHSM(input);
      case "trochoidal": return this.generateTrochoidal(input);
      default: throw new Error(`ToolpathStrategyEngine.generate: unknown operation '${op}'`);
    }
  }

  /** Rest machining — narrow stepover to remove cusps from previous tool. */
  generateRest(input: BaseInput): ToolpathStrategy {
    if (!input?.tool) throw new Error("ToolpathStrategyEngine.generateRest: tool required");
    const r = buildStrategy("rest", input, REST_STEPOVER_PCT, 0.3);
    r.rationale = `rest machining on ${r.feature} — narrow stepover removes residual material left by previous tool`;
    return r;
  }

  /** High-speed machining — high axial, low radial, climb. */
  generateHSM(input: BaseInput): ToolpathStrategy {
    if (!input?.tool) throw new Error("ToolpathStrategyEngine.generateHSM: tool required");
    const r = buildStrategy("hsm", input, HSM_STEPOVER_PCT, HSM_AXIAL_DEPTH_FACTOR);
    r.parameters.lead_in = "ramp-helix";
    r.rationale = `HSM on ${r.feature}: low radial (${(HSM_STEPOVER_PCT * 100).toFixed(0)}%), high axial (${(HSM_AXIAL_DEPTH_FACTOR * 100).toFixed(0)}% × d), constant engagement angle`;
    return r;
  }

  /** Trochoidal — circular slotting for chip control + reduced engagement. */
  generateTrochoidal(input: BaseInput): ToolpathStrategy {
    if (!input?.tool) throw new Error("ToolpathStrategyEngine.generateTrochoidal: tool required");
    const r = buildStrategy("trochoidal", input, TROCHOIDAL_STEPOVER_PCT, 1.0);
    r.parameters.lead_in = "tangent-arc";
    r.feature = "slot";
    r.rationale = `trochoidal slot on Ø${input.tool.diameter_mm}mm: ${(TROCHOIDAL_STEPOVER_PCT * 100).toFixed(0)}% stepover, full-d axial; reduces engagement angle vs straight slot`;
    return r;
  }
}

export const toolpathStrategyEngine = new ToolpathStrategyEngine();
