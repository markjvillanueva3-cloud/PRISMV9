/**
 * MILL-MASTER-AI-WIRING / U0-BASELINE — shared fixtures
 *
 * Imported by:
 *   - MillMasterAIWiringBaseline.bench.ts (vitest bench reporter)
 *   - MillMasterAIWiringBaseline.test.ts (captures + writes baseline JSON)
 *
 * Not a test file itself — no test/bench blocks here.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U0-BASELINE)
 */

import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";

import { millingMachineIntelligenceEngine } from "../../engines/MillingMachineIntelligenceEngine.js";
import { millDeepLearningEngine } from "../../engines/MillDeepLearningEngine.js";
import { millComprehensiveNeuralEngine } from "../../engines/MillComprehensiveNeuralEngine.js";
import { millingProgramPatternEngine } from "../../engines/MillingProgramPatternEngine.js";
import { millingAIIntegrationEngine } from "../../engines/MillingAIIntegrationEngine.js";
import { millingHeadIntelligenceEngine } from "../../engines/MillingHeadIntelligenceEngine.js";
import { FiveAxisToolpathSynthesisEngine } from "../../engines/FiveAxisToolpathSynthesisEngine.js";
import { FiveAxisDecisionEngine } from "../../engines/FiveAxisDecisionEngine.js";
import { FiveAxisAIUltraIntelligenceEngine } from "../../engines/FiveAxisAIUltraIntelligenceEngine.js";
import { FiveAxisOrchestrationEngine } from "../../engines/FiveAxisOrchestrationEngine.js";
import { millTurnSwissPipelineEngine } from "../../engines/MillTurnSwissPipelineEngine.js";
import { millingDeepAIHardeningEngine } from "../../engines/MillingDeepAIHardeningEngine.js";
import { MillNeuralNetworkEngine } from "../../engines/MillNeuralNetworkEngine.js";

export const SAMPLE_COUNT = 100;
export const WARMUP_COUNT = 10;
export const SCHEMA_HASH_LEN = 16;
export const USEAI_ON_HARD_CEILING_MS = 2000; // from envelope global_contracts.latency_budgets_ms

const SIMPLE_DRILL_PROGRAM = `O01234 (BASELINE DRILL)
G21
G90 G54
T1 M6
S1000 M3
M8
G81 X0 Y0 Z-5 R2 F80
G80
M9
M30`;

const millNeuralForBench = new MillNeuralNetworkEngine();

export type Invocation = {
  engine_id: string;
  method: string;
  unit: string;
  invoke: () => unknown;
};

export const INVOCATIONS: Invocation[] = [
  {
    engine_id: "MillingMachineIntelligenceEngine",
    method: "recommendToolpath(op, controller, hasCam)",
    unit: "U1-SPIKE-MMI",
    invoke: () =>
      millingMachineIntelligenceEngine.recommendToolpath(
        "pocket milling",
        "hurco_winmax",
        true,
      ),
  },
  {
    engine_id: "MillDeepLearningEngine",
    method: "recommendSequence(features)",
    unit: "U7-DEEPLEARN-RETROFIT",
    invoke: () => millDeepLearningEngine.recommendSequence(["hole", "thread"]),
  },
  {
    engine_id: "MillComprehensiveNeuralEngine",
    method: "encodeFeatures(scenario)",
    unit: "U8-COMPNEURAL-RETROFIT",
    invoke: () =>
      millComprehensiveNeuralEngine.encodeFeatures({
        material: "P",
        tool_type: "FLAT_ENDMILL",
        holder_type: "COLLET_ER",
        machine: "HAAS_VF2",
        controller: "HAAS_NGC",
        kinematics: "AXIS_3_VMC",
        toolpath: "ADAPTIVE_CLEARING",
        build_quality: "CLASS_C",
        spindle: "TAPER_CAT40",
        tool_diameter_mm: 12,
        doc_mm: 3,
        woc_mm: 1.2,
        rpm: 4000,
        feed_mm_min: 1500,
      }),
  },
  {
    engine_id: "MillingProgramPatternEngine",
    method: "parseProgram(ncText)",
    unit: "U9-PROGPAT-RETROFIT",
    invoke: () => millingProgramPatternEngine.parseProgram(SIMPLE_DRILL_PROGRAM),
  },
  {
    engine_id: "MillingAIIntegrationEngine",
    method: "parseNaturalLanguageQuery(text)",
    unit: "U10-AIINT-RETROFIT",
    invoke: () =>
      millingAIIntegrationEngine.parseNaturalLanguageQuery(
        "rough a pocket in 4140 steel on the Okuma",
      ),
  },
  {
    engine_id: "MillingHeadIntelligenceEngine",
    method: "recommendMillingHead(ops, constraints)",
    unit: "U11-HEADINT-RETROFIT",
    invoke: () =>
      millingHeadIntelligenceEngine.recommendMillingHead(
        [{ type: "contour", angles: [0, 30, 60], powerRequired_kW: 18, interpolation: true }],
        { budget: "high", accuracy_mm: 0.02, production: false },
      ),
  },
  {
    engine_id: "FiveAxisToolpathSynthesisEngine",
    method: "synthesize(input)",
    unit: "U12-SYNTH-RETROFIT",
    invoke: () =>
      FiveAxisToolpathSynthesisEngine.synthesize({
        geometry: "freeform_surface",
        material: {
          name: "P20",
          iso_group: "P",
          kc11_mpa: 2200,
          mc: 0.25,
          density_kg_m3: 7850,
          thermal_conductivity_w_mk: 35,
          specific_heat_j_kgk: 460,
        },
        tool: {
          type: "ball_nose",
          diameter_mm: 6,
          flute_length_mm: 20,
          overall_length_mm: 60,
          flute_count: 4,
          helix_angle_deg: 35,
          material: "carbide",
        },
        machine: {
          machine_id: "BASELINE_5AX",
          kinematic_type: "table_table",
          primary_axis: "A",
          secondary_axis: "C",
          axis_limits: { a_min_deg: -120, a_max_deg: 120, c_min_deg: -360, c_max_deg: 360 },
          max_rotary_speed_deg_sec: 60,
          pivot_to_gauge_mm: 200,
          pivot_to_table_mm: 400,
          rtcp_enabled: true,
        },
        batch_size: 10,
        operator_skill: 3,
        prefer_novel: false,
        use_ai_reasoning: false,
      }),
  },
  {
    engine_id: "FiveAxisDecisionEngine",
    method: "decide(input)",
    unit: "U13-DECISION-RETROFIT",
    invoke: () =>
      FiveAxisDecisionEngine.decide({
        part_features: [
          {
            feature_type: "multi_face",
            required_orientations: [
              { i: 0, j: 0, k: 1 },
              { i: 1, j: 0, k: 0 },
              { i: 0, j: 1, k: 0 },
            ],
            surface_tolerance_mm: 0.02,
            max_depth_mm: 30,
            min_tool_length_mm: 60,
            has_undercuts: false,
            has_thin_walls: false,
            accessibility_score: 0.95,
          },
        ],
        machine: {
          machine_id: "BASELINE_OKUMA",
          type: "vmc_5ax",
          kinematic_type: "head_head",
          primary_axis: "B",
          secondary_axis: "C",
          axis_limits: { b_min_deg: -120, b_max_deg: 120, c_min_deg: -360, c_max_deg: 360 },
          max_rotary_speed_deg_sec: 60,
          rtcp_enabled: true,
          controller: "osp_p300",
        },
        tool: {
          type: "ball_nose",
          diameter_mm: 10,
          flute_length_mm: 30,
          overall_length_mm: 80,
          gauge_length_mm: 50,
        },
        material: "4140",
        batch_size: 10,
        operator_skill: 3,
        feed_rate_mm_per_min: 1500,
      }),
  },
  {
    engine_id: "FiveAxisAIUltraIntelligenceEngine",
    method: "parseNaturalLanguage(text)",
    unit: "U3-5AX-ULTRA",
    invoke: () =>
      FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
        "finish an aluminum impeller blade with Ra 0.8",
      ),
  },
  {
    engine_id: "FiveAxisOrchestrationEngine",
    method: "getDSLSyntaxExamples()",
    unit: "U4-5AX-ORCH",
    invoke: () => FiveAxisOrchestrationEngine.getDSLSyntaxExamples(),
  },
  {
    engine_id: "MillTurnSwissPipelineEngine",
    method: "calculateLiveTool(input)",
    unit: "U5-SWISS",
    invoke: () =>
      millTurnSwissPipelineEngine.calculateLiveTool({
        operation: "face_mill",
        workpiece_diameter_mm: 20,
        tool_diameter_mm: 10,
        material_iso: "P",
        spindle_speed_rpm: 5000,
        feed_mm_tooth: 0.05,
        axial_depth_mm: 2,
        radial_depth_mm: 5,
        offset_mm: 0,
        c_axis_resolution_deg: 0.001,
      }),
  },
  {
    engine_id: "MillingDeepAIHardeningEngine",
    method: "troubleshootMillingIssue(symptoms)",
    unit: "U6-HARDENING",
    invoke: () =>
      millingDeepAIHardeningEngine.troubleshootMillingIssue({
        symptoms: ["chatter", "poor_surface_finish"],
        material: "4140",
        operation: "rough_pocket",
        chatter_detected: true,
      }),
  },
  {
    engine_id: "MillNeuralNetworkEngine",
    method: "encodeFeatures(P, flat_endmill, face, ...)",
    unit: "U14-NEURAL-RETROFIT",
    invoke: () =>
      millNeuralForBench.encodeFeatures(
        "P",
        "flat_endmill",
        "face",
        10,
        5000,
        50,
        1,
        5,
        false,
        false,
      ),
  },
];

// Units every baseline must cover (cross-checked by the capture test).
export const EXPECTED_UNITS = [
  "U1-SPIKE-MMI",
  "U3-5AX-ULTRA",
  "U4-5AX-ORCH",
  "U5-SWISS",
  "U6-HARDENING",
  "U7-DEEPLEARN-RETROFIT",
  "U8-COMPNEURAL-RETROFIT",
  "U9-PROGPAT-RETROFIT",
  "U10-AIINT-RETROFIT",
  "U11-HEADINT-RETROFIT",
  "U12-SYNTH-RETROFIT",
  "U13-DECISION-RETROFIT",
  "U14-NEURAL-RETROFIT",
] as const;

// --- Stats + schema helpers ---------------------------------------------

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

export function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function schemaHash(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const t = typeof value;
  if (t !== "object") return t;
  if (Array.isArray(value)) {
    const sampleHash = value.length === 0 ? "empty" : schemaHash(value[0]);
    return createHash("sha256")
      .update(`array<${sampleHash}>`)
      .digest("hex")
      .slice(0, SCHEMA_HASH_LEN);
  }
  const keys = Object.keys(value as Record<string, unknown>).sort().join(",");
  return createHash("sha256").update(keys).digest("hex").slice(0, SCHEMA_HASH_LEN);
}

export function sampleFor(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 1);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).slice(0, 8)) {
      const v = (value as Record<string, unknown>)[k];
      if (v === null || typeof v !== "object") out[k] = v;
      else if (Array.isArray(v)) out[k] = `Array(${v.length})`;
      else out[k] = "{...}";
    }
    return out;
  }
  return value;
}

export type CapturedEntry = {
  engine_id: string;
  method: string;
  unit: string;
  status: "ok" | "unbaselineable";
  sample_count: number;
  warmup_count: number;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  mean_ms: number | null;
  stddev_ms: number | null;
  output_schema_hash: string | null;
  output_sample: unknown;
  error?: { class: string; message: string };
};

export function capture(inv: Invocation): CapturedEntry {
  const baseEntry = {
    engine_id: inv.engine_id,
    method: inv.method,
    unit: inv.unit,
    warmup_count: WARMUP_COUNT,
  };
  try {
    for (let i = 0; i < WARMUP_COUNT; i++) inv.invoke();
  } catch (err) {
    return {
      ...baseEntry,
      status: "unbaselineable",
      sample_count: 0,
      p50_ms: null,
      p95_ms: null,
      p99_ms: null,
      mean_ms: null,
      stddev_ms: null,
      output_schema_hash: null,
      output_sample: null,
      error: {
        class: (err as Error)?.constructor?.name ?? "Error",
        message: (err as Error)?.message ?? String(err),
      },
    };
  }

  const samples: number[] = [];
  let lastOutput: unknown = null;
  try {
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const t0 = performance.now();
      lastOutput = inv.invoke();
      samples.push(performance.now() - t0);
    }
  } catch (err) {
    return {
      ...baseEntry,
      status: "unbaselineable",
      sample_count: samples.length,
      p50_ms: null,
      p95_ms: null,
      p99_ms: null,
      mean_ms: null,
      stddev_ms: null,
      output_schema_hash: null,
      output_sample: null,
      error: {
        class: (err as Error)?.constructor?.name ?? "Error",
        message: (err as Error)?.message ?? String(err),
      },
    };
  }

  const sorted = [...samples].sort((a, b) => a - b);
  return {
    ...baseEntry,
    status: "ok",
    sample_count: SAMPLE_COUNT,
    p50_ms: percentile(sorted, 0.5),
    p95_ms: percentile(sorted, 0.95),
    p99_ms: percentile(sorted, 0.99),
    mean_ms: samples.reduce((a, b) => a + b, 0) / samples.length,
    stddev_ms: stddev(samples),
    output_schema_hash: schemaHash(lastOutput),
    output_sample: sampleFor(lastOutput),
  };
}
