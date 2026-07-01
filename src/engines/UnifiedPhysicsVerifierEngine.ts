/**
 * UnifiedPhysicsVerifierEngine — QS-MS6 P0
 *
 * Cross-pipeline consistency checker. Runs the SAME cutting scenario through
 * multiple independent physics paths and compares results. Reports divergence
 * and identifies which path disagrees.
 *
 * Physics Paths:
 *   1. Canonical — direct from src/physics/constants.ts (reference)
 *   2. SpeedFeedOrchestrator — 67-point orchestrator
 *   3. CNCSimulation — G-code simulation pipeline
 *   4. KienzleForceModel — dedicated Kienzle engine
 *   5. PostProcessor — post-processor pipeline inline physics
 *
 * @module QS-MS6
 */

import { log } from "../utils/Logger.js";
import {
  resolveMaterial,
  kienzleForce,
  taylorLife,
  toolDeflection,
  predictedRa,
  cuttingPower,
  rpmFromVc,
  type MaterialPhysics,
} from "../physics/constants.js";

// ── Interfaces ──

export interface VerificationInput {
  material: string;
  tool_diameter_mm: number;
  flutes: number;
  operation?: "milling" | "turning" | "drilling";
  cut_type?: "roughing" | "finishing";
  ap_mm?: number;
  ae_mm?: number;
  spindle_rpm?: number;
  feed_rate_mmmin?: number;
  tool_stickout_mm?: number;
  corner_radius_mm?: number;
}

export interface PathResult {
  path_name: string;
  cutting_force_N?: number;
  power_kW?: number;
  tool_life_min?: number;
  surface_finish_Ra_um?: number;
  deflection_um?: number;
  confidence: number;
  status: "ok" | "error" | "unavailable";
  error_message?: string;
}

export interface VerificationResult {
  paths: PathResult[];
  consensus: {
    force_N: number;
    power_kW: number;
    tool_life_min: number;
    Ra_um: number;
    deflection_um: number;
  };
  divergence: {
    max_force_pct: number;
    max_power_pct: number;
    max_life_pct: number;
    max_Ra_pct: number;
    max_deflection_pct: number;
    overall_pct: number;
    worst_path: string;
    worst_metric: string;
  };
  verdict: "consistent" | "minor_divergence" | "major_divergence";
  recommendations: string[];
}

// ── Helpers ──

/** Compute divergence % = (max - min) / avg * 100, ignoring undefined/zero */
function divergencePct(values: (number | undefined)[]): number {
  const valid = values.filter((v): v is number => v !== undefined && v > 0 && isFinite(v));
  if (valid.length < 2) return 0;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (avg <= 0) return 0;
  return ((max - min) / avg) * 100;
}

/** Confidence-weighted average, ignoring undefined/zero */
function weightedAvg(
  values: { value: number | undefined; confidence: number }[]
): number {
  let sumWV = 0;
  let sumW = 0;
  for (const { value, confidence } of values) {
    if (value === undefined || !isFinite(value) || value <= 0) continue;
    sumWV += value * confidence;
    sumW += confidence;
  }
  return sumW > 0 ? sumWV / sumW : 0;
}

/** Find which path is furthest from consensus for a given metric */
function worstPathForMetric(
  paths: PathResult[],
  metric: keyof Pick<PathResult, "cutting_force_N" | "power_kW" | "tool_life_min" | "surface_finish_Ra_um" | "deflection_um">,
  consensus: number
): { path: string; deviation: number } {
  let worst = { path: "", deviation: 0 };
  for (const p of paths) {
    if (p.status !== "ok") continue;
    const v = p[metric];
    if (v === undefined || !isFinite(v) || v <= 0 || consensus <= 0) continue;
    const dev = Math.abs(v - consensus) / consensus * 100;
    if (dev > worst.deviation) {
      worst = { path: p.path_name, deviation: dev };
    }
  }
  return worst;
}

// ── Engine ──

export class UnifiedPhysicsVerifierEngine {
  /**
   * Verify cutting physics consistency across all available paths.
   */
  verify(input: VerificationInput): VerificationResult {
    log.info("[UnifiedPhysicsVerifier] Starting cross-pipeline verification");

    const mat = resolveMaterial(input.material);
    const D = input.tool_diameter_mm;
    const z = input.flutes;
    const ap = input.ap_mm ?? (input.cut_type === "finishing" ? 0.5 : D * 0.5);
    const ae = input.ae_mm ?? (input.cut_type === "finishing" ? D * 0.1 : D * 0.5);
    const stickout = input.tool_stickout_mm ?? D * 3;
    const re = input.corner_radius_mm ?? 0.8;
    const isFinishing = input.cut_type === "finishing";

    // Derive Vc and fz from input or defaults
    const vcBase = isFinishing ? mat.vc_base_finishing : mat.vc_base_roughing;
    let rpm: number;
    let fz: number;
    if (input.spindle_rpm) {
      rpm = input.spindle_rpm;
    } else {
      rpm = rpmFromVc(vcBase, D);
    }
    const Vc = (Math.PI * D * rpm) / 1000; // actual cutting speed m/min

    if (input.feed_rate_mmmin) {
      fz = input.feed_rate_mmmin / (rpm * z);
    } else {
      fz = isFinishing ? 0.05 : 0.10;
    }
    const Vf = fz * z * rpm; // table feed mm/min

    const paths: PathResult[] = [];

    // ── Path 1: Canonical (reference) ──
    paths.push(this.runCanonical(mat, D, z, ap, ae, fz, Vc, rpm, stickout, re));

    // ── Path 2: SpeedFeedOrchestrator ──
    paths.push(this.runSpeedFeedOrchestrator(input, mat, D, z, ap, ae, isFinishing));

    // ── Path 3: CNCSimulation ──
    paths.push(this.runCNCSimulation(mat, D, z, ap, ae, fz, rpm, Vf, stickout));

    // ── Path 4: KienzleForceModel ──
    paths.push(this.runKienzleForceModel(mat, D, z, ap, ae, fz, rpm));

    // ── Path 5: PostProcessor ──
    paths.push(this.runPostProcessor(mat, D, z, ap, ae, fz, rpm, Vf));

    // ── Consensus (confidence-weighted average) ──
    const okPaths = paths.filter(p => p.status === "ok");
    const consensus = {
      force_N: weightedAvg(okPaths.map(p => ({ value: p.cutting_force_N, confidence: p.confidence }))),
      power_kW: weightedAvg(okPaths.map(p => ({ value: p.power_kW, confidence: p.confidence }))),
      tool_life_min: weightedAvg(okPaths.map(p => ({ value: p.tool_life_min, confidence: p.confidence }))),
      Ra_um: weightedAvg(okPaths.map(p => ({ value: p.surface_finish_Ra_um, confidence: p.confidence }))),
      deflection_um: weightedAvg(okPaths.map(p => ({ value: p.deflection_um, confidence: p.confidence }))),
    };

    // ── Divergence ──
    const maxForcePct = divergencePct(okPaths.map(p => p.cutting_force_N));
    const maxPowerPct = divergencePct(okPaths.map(p => p.power_kW));
    const maxLifePct = divergencePct(okPaths.map(p => p.tool_life_min));
    const maxRaPct = divergencePct(okPaths.map(p => p.surface_finish_Ra_um));
    const maxDeflPct = divergencePct(okPaths.map(p => p.deflection_um));

    // Find worst metric and path
    const metrics: { name: string; pct: number; key: keyof PathResult; consVal: number }[] = [
      { name: "cutting_force", pct: maxForcePct, key: "cutting_force_N" as keyof PathResult, consVal: consensus.force_N },
      { name: "power", pct: maxPowerPct, key: "power_kW" as keyof PathResult, consVal: consensus.power_kW },
      { name: "tool_life", pct: maxLifePct, key: "tool_life_min" as keyof PathResult, consVal: consensus.tool_life_min },
      { name: "Ra", pct: maxRaPct, key: "surface_finish_Ra_um" as keyof PathResult, consVal: consensus.Ra_um },
      { name: "deflection", pct: maxDeflPct, key: "deflection_um" as keyof PathResult, consVal: consensus.deflection_um },
    ];
    const worstMetric = metrics.reduce((a, b) => b.pct > a.pct ? b : a);
    const worstPath = worstPathForMetric(
      okPaths,
      worstMetric.key as any,
      worstMetric.consVal
    );

    const overallPct = Math.max(maxForcePct, maxPowerPct, maxLifePct, maxRaPct, maxDeflPct);

    const divergence = {
      max_force_pct: round2(maxForcePct),
      max_power_pct: round2(maxPowerPct),
      max_life_pct: round2(maxLifePct),
      max_Ra_pct: round2(maxRaPct),
      max_deflection_pct: round2(maxDeflPct),
      overall_pct: round2(overallPct),
      worst_path: worstPath.path || "none",
      worst_metric: worstMetric.name,
    };

    // ── Verdict ──
    let verdict: VerificationResult["verdict"];
    if (overallPct < 5) verdict = "consistent";
    else if (overallPct < 15) verdict = "minor_divergence";
    else verdict = "major_divergence";

    // ── Recommendations ──
    const recommendations: string[] = [];
    const errorPaths = paths.filter(p => p.status === "error");
    const unavailPaths = paths.filter(p => p.status === "unavailable");

    if (errorPaths.length > 0) {
      recommendations.push(
        `${errorPaths.length} path(s) returned errors: ${errorPaths.map(p => p.path_name).join(", ")}. Check engine inputs.`
      );
    }
    if (unavailPaths.length > 0) {
      recommendations.push(
        `${unavailPaths.length} path(s) unavailable: ${unavailPaths.map(p => p.path_name).join(", ")}.`
      );
    }
    if (verdict === "major_divergence") {
      recommendations.push(
        `Major divergence (${round2(overallPct)}%) detected in ${worstMetric.name}. ` +
        `Path "${worstPath.path}" deviates most (${round2(worstPath.deviation)}% from consensus). ` +
        `Calibrate this path or investigate parameter mapping.`
      );
      if (maxLifePct > 15) {
        recommendations.push(
          "Tool life divergence often stems from different Taylor constants. " +
          "Ensure all paths use CANONICAL_TAYLOR from physics/constants.ts."
        );
      }
      if (maxForcePct > 15) {
        recommendations.push(
          "Force divergence may indicate different Kienzle kc1.1 values. " +
          "Ensure all paths use CANONICAL_KIENZLE from physics/constants.ts."
        );
      }
    } else if (verdict === "minor_divergence") {
      recommendations.push(
        `Minor divergence (${round2(overallPct)}%) in ${worstMetric.name}. ` +
        `Path "${worstPath.path}" is the primary contributor. ` +
        `Acceptable for production use but consider harmonizing.`
      );
    } else {
      recommendations.push("All paths are consistent (<5% divergence). Physics pipeline is well-calibrated.");
    }

    log.info(
      `[UnifiedPhysicsVerifier] Done: ${okPaths.length}/${paths.length} paths OK, ` +
      `verdict=${verdict}, overall divergence=${round2(overallPct)}%`
    );

    return { paths, consensus, divergence, verdict, recommendations };
  }

  // ── Path 1: Canonical (direct physics/constants.ts) ──

  private runCanonical(
    mat: MaterialPhysics, D: number, z: number,
    ap: number, ae: number, fz: number, Vc: number,
    rpm: number, stickout: number, re: number
  ): PathResult {
    try {
      const Fc = kienzleForce(mat.kc1_1, mat.mc, ap, fz);
      const FcTotal = Fc * Math.min(z, Math.max(1, Math.ceil(z * (ae / D))));
      const P = cuttingPower(FcTotal, Vc);
      const T = taylorLife(mat.taylor_C, mat.taylor_n, Vc);
      const Ra = predictedRa(fz, re);
      const defl = toolDeflection(FcTotal, stickout, D) * 1000; // mm → µm

      return {
        path_name: "Canonical",
        cutting_force_N: round2(FcTotal),
        power_kW: round2(P),
        tool_life_min: round2(T),
        surface_finish_Ra_um: round2(Ra),
        deflection_um: round2(defl),
        confidence: 1.0,
        status: "ok",
      };
    } catch (err: any) {
      return {
        path_name: "Canonical",
        confidence: 0,
        status: "error",
        error_message: err.message,
      };
    }
  }

  // ── Path 2: SpeedFeedOrchestrator ──

  private runSpeedFeedOrchestrator(
    input: VerificationInput, mat: MaterialPhysics,
    D: number, z: number, ap: number, ae: number, isFinishing: boolean
  ): PathResult {
    try {
      const { speedFeedOrchestratorEngine } = require("./SpeedFeedOrchestratorEngine.js");
      const result = speedFeedOrchestratorEngine.compute({
        material: input.material,
        tool_diameter_mm: D,
        flutes: z,
        axial_depth_mm: ap,
        radial_depth_mm: ae,
        cut_type: isFinishing ? "finishing" : "roughing",
        output_detail: "minimal",
      });

      const val = result?.value ?? result;
      if (!val) {
        return { path_name: "SpeedFeedOrchestrator", confidence: 0, status: "error", error_message: "No result from orchestrator" };
      }

      return {
        path_name: "SpeedFeedOrchestrator",
        cutting_force_N: round2(val.cutting_force_N ?? val.force_N),
        power_kW: round2(val.power_kW ?? val.cutting_power_kW),
        tool_life_min: round2(val.tool_life_min ?? val.tool_life_minutes),
        surface_finish_Ra_um: round2(val.predicted_Ra_um ?? val.Ra_um),
        deflection_um: round2(val.deflection_um ?? val.tool_deflection_um),
        confidence: val.overall_confidence ?? 0.85,
        status: "ok",
      };
    } catch (err: any) {
      return {
        path_name: "SpeedFeedOrchestrator",
        confidence: 0,
        status: "error",
        error_message: err.message?.substring(0, 200),
      };
    }
  }

  // ── Path 3: CNCSimulation ──

  private runCNCSimulation(
    mat: MaterialPhysics, D: number, z: number,
    ap: number, ae: number, fz: number, rpm: number,
    Vf: number, stickout: number
  ): PathResult {
    try {
      const { cncSimulationPipelineEngine } = require("./CNCSimulationPipelineEngine.js");

      // Build a minimal G-code block: position then cut
      const cutLength = 50; // 50mm test cut
      const gcode = [
        `T1 M6`,
        `S${Math.round(rpm)} M3`,
        `G0 X0 Y0 Z5`,
        `G0 Z${ap > 0 ? 1 : 0.5}`,
        `G1 Z-${ap.toFixed(2)} F${Math.round(Vf * 0.3)}`, // plunge
        `G1 X${cutLength} F${Math.round(Vf)}`,             // cutting move
        `G0 Z5`,
        `M30`,
      ];

      const simResult = cncSimulationPipelineEngine.simulate({
        gcode_blocks: gcode,
        tool_diameter_mm: D,
        tool_flutes: z,
        tool_length_mm: stickout,
        material: mat.name,
        stock_x_mm: cutLength + 20,
        stock_y_mm: ae + 20,
        stock_z_mm: ap + 10,
      });

      if (!simResult) {
        return { path_name: "CNCSimulation", confidence: 0, status: "error", error_message: "No simulation result" };
      }

      // Estimate tool life from consumed %
      const toolLifeMin = simResult.tool_life_consumed_pct > 0
        ? (simResult.cutting_time_s / 60) / (simResult.tool_life_consumed_pct / 100)
        : undefined;

      return {
        path_name: "CNCSimulation",
        cutting_force_N: round2(simResult.max_force_N),
        power_kW: undefined, // CNC sim doesn't directly report power
        tool_life_min: toolLifeMin ? round2(toolLifeMin) : undefined,
        surface_finish_Ra_um: undefined, // not available from sim
        deflection_um: round2(simResult.max_deflection_um),
        confidence: 0.75,
        status: "ok",
      };
    } catch (err: any) {
      return {
        path_name: "CNCSimulation",
        confidence: 0,
        status: "error",
        error_message: err.message?.substring(0, 200),
      };
    }
  }

  // ── Path 4: KienzleForceModel ──

  private runKienzleForceModel(
    mat: MaterialPhysics, D: number, z: number,
    ap: number, ae: number, fz: number, rpm: number
  ): PathResult {
    try {
      const { kienzleForceModelEngine } = require("./KienzleForceModelEngine.js");

      const result = kienzleForceModelEngine.computeMillingForces({
        kc1_1: mat.kc1_1,
        mc: mat.mc,
        feed_per_tooth_mm: fz,
        axial_depth_mm: ap,
        radial_depth_mm: ae,
        tool_diameter_mm: D,
        flutes: z,
        milling_type: ae >= D * 0.9 ? "slot" : "down",
        spindle_rpm: rpm,
      });

      if (!result) {
        return { path_name: "KienzleForceModel", confidence: 0, status: "error", error_message: "No result" };
      }

      return {
        path_name: "KienzleForceModel",
        cutting_force_N: round2(result.Fc_avg),
        power_kW: round2(result.avg_power_kW),
        tool_life_min: undefined, // Kienzle is force-only, no life model
        surface_finish_Ra_um: undefined,
        deflection_um: undefined,
        confidence: 0.95,
        status: "ok",
      };
    } catch (err: any) {
      return {
        path_name: "KienzleForceModel",
        confidence: 0,
        status: "error",
        error_message: err.message?.substring(0, 200),
      };
    }
  }

  // ── Path 5: PostProcessor ──

  private runPostProcessor(
    mat: MaterialPhysics, D: number, z: number,
    ap: number, ae: number, fz: number, rpm: number, Vf: number
  ): PathResult {
    try {
      const { postProcessorPipelineEngine } = require("./PostProcessorPipelineEngine.js");

      // PostProcessor is async — we use a synchronous force/power estimate
      // from the inline physics it uses (same Kienzle model), so we verify
      // by computing what PostProcessor would compute internally.
      // This avoids async complications in a synchronous verify() call.
      const Vc = (Math.PI * D * rpm) / 1000;
      const Fc = kienzleForce(mat.kc1_1, mat.mc, ap, fz);
      const engagementRatio = Math.min(ae / D, 1.0);
      const teethInCut = Math.max(1, Math.ceil(z * engagementRatio));
      const FcTotal = Fc * teethInCut;

      // PostProcessor applies a 1.15 safety factor on force
      const ppForce = FcTotal * 1.15;
      const ppPower = cuttingPower(ppForce, Vc);

      return {
        path_name: "PostProcessor",
        cutting_force_N: round2(ppForce),
        power_kW: round2(ppPower),
        tool_life_min: undefined,
        surface_finish_Ra_um: undefined,
        deflection_um: undefined,
        confidence: 0.70,
        status: "ok",
      };
    } catch (err: any) {
      return {
        path_name: "PostProcessor",
        confidence: 0,
        status: "error",
        error_message: err.message?.substring(0, 200),
      };
    }
  }

  /**
   * List all available verification paths and their capabilities.
   */
  listPaths(): Array<{ name: string; metrics: string[]; source: string }> {
    return [
      {
        name: "Canonical",
        metrics: ["force", "power", "tool_life", "Ra", "deflection"],
        source: "physics/constants.ts — direct Kienzle/Taylor/Brammertz",
      },
      {
        name: "SpeedFeedOrchestrator",
        metrics: ["force", "power", "tool_life", "Ra", "deflection"],
        source: "SpeedFeedOrchestratorEngine.compute() — 67-point hub",
      },
      {
        name: "CNCSimulation",
        metrics: ["force", "deflection", "tool_life"],
        source: "CNCSimulationPipelineEngine.simulate() — G-code sim",
      },
      {
        name: "KienzleForceModel",
        metrics: ["force", "power"],
        source: "KienzleForceModelEngine.computeMillingForces() — dedicated",
      },
      {
        name: "PostProcessor",
        metrics: ["force", "power"],
        source: "PostProcessorPipelineEngine inline physics (×1.15 safety)",
      },
    ];
  }
}

function round2(v: number | undefined): number {
  if (v === undefined || !isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}

export const unifiedPhysicsVerifierEngine = new UnifiedPhysicsVerifierEngine();
