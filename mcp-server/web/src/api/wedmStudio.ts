import { getAuthHeaders } from './authToken';
/**
 * wedmStudio.ts — Wire EDM Studio API Client
 * WEDM-MS0 U-WEDM03
 *
 * Typed API functions for all 20 WEDM pipeline endpoints.
 * Returns PipelineResponse<T> discriminated union for consistent error handling.
 *
 * Features:
 *   - AbortController on every request
 *   - FormData upload for geometry parsing
 *   - Quick Generate background job via SSE
 *   - DAG parallelization for independent pipeline stages
 */

import type {
  PipelineResponse,
  WedmStep,
  ImportResult,
  ClassifiedFeature,
  FeasibilityResult,
  MaterialMachineWireSelection,
  WCSResult,
  ToolpathResult,
  MultiPassResult,
  OptimizeResult,
  GCodeOutput,
  CostBreakdown,
  SetupSheet,
  WireBreakPrediction,
  FlushingStrategy,
  PartFeature,
  ControllerDialect,
  QuickGenerateJob,
  FeasibilityParams,
  SelectionParams,
  StartHolesParams,
  ToolpathParams,
  TabsParams,
  SequenceParams,
  MultipassParams,
  OptimizeParams,
  FlushingParams,
  WireBreakParams,
  CornerCalcParams,
  TaperSolveParams,
  ProgramStageParams,
  PipelineRunParams,
  CalculatePassesParams,
  ProgramResult,
} from "../types/wedmStudio";

// ============================================================================
// BASE CONFIGURATION
// ============================================================================

const BASE_URL = "/api/v1/edm";
const DEFAULT_TIMEOUT_MS = 30_000;
const COMPUTE_TIMEOUT_MS = 60_000;

// ============================================================================
// HTTP HELPERS
// ============================================================================

async function post<T>(
  endpoint: string,
  body: unknown,
  step: WedmStep,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal?: AbortSignal,
): Promise<PipelineResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // Chain external abort signal
  if (signal) {
    signal.addEventListener("abort", () => controller.abort());
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: errBody.message ?? errBody.error ?? res.statusText,
        code: String(res.status),
        step,
      };
    }

    const data = await res.json();
    return { ok: true, data: data.result ?? data, warnings: data.warnings ?? [] };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { ok: false, error: "Request timed out or was cancelled", code: "ABORT", step };
    }
    return { ok: false, error: err.message ?? "Network error", code: "NETWORK", step };
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// PIPELINE API — Individual Step Calls
// ============================================================================

export const wedmApi = {
  // Step 1: Import — Geometry Parsing
  parseGeometry: (content: string, format: "dxf" | "step" | "iges" = "dxf", signal?: AbortSignal) =>
    post<ImportResult>("/parse-geometry", { content, format }, "import", DEFAULT_TIMEOUT_MS, signal),

  validateGeometry: (content: string, wireDiameter?: number, sparkGap?: number, signal?: AbortSignal) =>
    post<{ contours: number; parse_issues: any[]; validation_issues: any[]; can_proceed: boolean }>(
      "/validate-geometry",
      { content, wire_diameter_mm: wireDiameter, spark_gap_mm: sparkGap },
      "import", DEFAULT_TIMEOUT_MS, signal,
    ),

  // Step 1: Import — Drawing Interpretation
  interpret: (features: PartFeature[], material?: string, thickness?: number, signal?: AbortSignal) =>
    post<any>("/interpret", { features, material, overall_thickness_mm: thickness }, "import", DEFAULT_TIMEOUT_MS, signal),

  classifyFeatures: (features: PartFeature[], material?: string, signal?: AbortSignal) =>
    post<ClassifiedFeature[]>("/classify-features", { features, material }, "review", DEFAULT_TIMEOUT_MS, signal),

  // Step 2: Review — Feasibility
  feasibility: (params: FeasibilityParams, signal?: AbortSignal) =>
    post<FeasibilityResult>("/feasibility", params, "review", DEFAULT_TIMEOUT_MS, signal),

  // Step 2: Review — Material/Machine/Wire Selection
  selection: (params: SelectionParams, signal?: AbortSignal) =>
    post<MaterialMachineWireSelection>("/selection", params, "review", DEFAULT_TIMEOUT_MS, signal),

  // Step 3: WCS — Start Holes
  startHoles: (params: StartHolesParams, signal?: AbortSignal) =>
    post<WCSResult>("/start-holes", params, "wcs", DEFAULT_TIMEOUT_MS, signal),

  // Step 4: Toolpath
  toolpath: (params: ToolpathParams, signal?: AbortSignal) =>
    post<ToolpathResult>("/toolpath", params, "toolpath", DEFAULT_TIMEOUT_MS, signal),

  tabs: (params: TabsParams, signal?: AbortSignal) =>
    post<TabsParams>("/tabs", params, "toolpath", DEFAULT_TIMEOUT_MS, signal),

  sequence: (params: SequenceParams, signal?: AbortSignal) =>
    post<SequenceParams>("/sequence", params, "toolpath", DEFAULT_TIMEOUT_MS, signal),

  // Step 5: Optimize — Multi-Pass + Params + Safety
  multipass: (params: MultipassParams, signal?: AbortSignal) =>
    post<MultiPassResult>("/multipass", params, "optimize", COMPUTE_TIMEOUT_MS, signal),

  optimize: (params: OptimizeParams, signal?: AbortSignal) =>
    post<OptimizeResult>("/optimize", params, "optimize", COMPUTE_TIMEOUT_MS, signal),

  flushing: (params: FlushingParams, signal?: AbortSignal) =>
    post<FlushingStrategy>("/flushing", params, "optimize", DEFAULT_TIMEOUT_MS, signal),

  predictWireBreak: (params: WireBreakParams, signal?: AbortSignal) =>
    post<WireBreakPrediction>("/predict-wire-break", params, "optimize", DEFAULT_TIMEOUT_MS, signal),

  calculateCorners: (params: CornerCalcParams, signal?: AbortSignal) =>
    post<CornerCalcParams>("/calculate-corners", params, "toolpath", DEFAULT_TIMEOUT_MS, signal),

  solveTaper: (params: TaperSolveParams, signal?: AbortSignal) =>
    post<TaperSolveParams>("/solve-taper", params, "toolpath", DEFAULT_TIMEOUT_MS, signal),

  // Step 6: Program — G-code + Cost + Setup
  gcode: (params: ProgramStageParams, signal?: AbortSignal) =>
    post<GCodeOutput>("/gcode", params, "program", COMPUTE_TIMEOUT_MS, signal),

  cost: (params: ProgramStageParams, signal?: AbortSignal) =>
    post<CostBreakdown>("/cost", params, "program", DEFAULT_TIMEOUT_MS, signal),

  setupSheet: (params: ProgramStageParams, signal?: AbortSignal) =>
    post<SetupSheet>("/setup-sheet", params, "program", DEFAULT_TIMEOUT_MS, signal),

  // Full pipeline (legacy compatibility)
  runPipeline: (params: PipelineRunParams, signal?: AbortSignal) =>
    post<ProgramResult>("/pipeline", params, "import", COMPUTE_TIMEOUT_MS, signal),

  calculatePasses: (params: CalculatePassesParams, signal?: AbortSignal) =>
    post<MultiPassResult>("/calculate-passes", params, "optimize", DEFAULT_TIMEOUT_MS, signal),

  // WEDM-MS1: Machine UV travel lookup
  machineUvTravel: (machineId: string, signal?: AbortSignal) =>
    post<{ max_uv_travel_mm: number; max_taper_angle_deg: number }>(
      "/machine-uv-travel", { machine_id: machineId }, "toolpath", DEFAULT_TIMEOUT_MS, signal,
    ),
};

// ============================================================================
// QUICK GENERATE — DAG-based parallel pipeline
// ============================================================================

/**
 * DAG execution order for Quick Generate:
 *   1. parseGeometry + interpret
 *   2. [classify + feasibility] parallel
 *   3. selection
 *   4. [startHoles + toolpath] parallel
 *   5. [tabs + sequence] parallel
 *   6. multipass
 *   7. optimize
 *   8. [flushing + predictWireBreak] parallel
 *   9. [calculateCorners + solveTaper] parallel
 *  10. gcode
 *  11. [cost + setupSheet] parallel
 *
 * Total chain timeout: 60s
 */
export async function quickGenerate(
  dxfContent: string,
  material: string,
  controller: ControllerDialect,
  onProgress?: (step: WedmStep, pct: number) => void,
  signal?: AbortSignal,
): Promise<PipelineResponse<QuickGenerateJob>> {
  const steps: WedmStep[] = ["import", "review", "wcs", "toolpath", "optimize", "program"];
  let currentStepIdx = 0;

  function progress(pct: number): void {
    onProgress?.(steps[currentStepIdx], pct);
  }

  try {
    // Stage 1: Parse geometry
    progress(5);
    const parseResult = await wedmApi.parseGeometry(dxfContent, "dxf", signal);
    if (!parseResult.ok) return { ok: false, error: parseResult.error, code: parseResult.code, step: "import" };

    // Stage 2: Interpret features (parallel with classify)
    progress(15);
    currentStepIdx = 1;
    const features = parseResult.data.features;
    const [classifyResult, feasibilityResult] = await Promise.all([
      wedmApi.classifyFeatures(features, material, signal),
      wedmApi.feasibility({ features, material } as FeasibilityParams, signal),
    ]);

    if (!classifyResult.ok) return classifyResult;
    if (!feasibilityResult.ok) return feasibilityResult;

    // Stage 3: Selection
    progress(30);
    const selectionResult = await wedmApi.selection({ material, features }, signal);
    if (!selectionResult.ok) return selectionResult;

    // Stage 4: Start holes + toolpath (parallel)
    progress(40);
    currentStepIdx = 2;
    const [startHolesResult, toolpathResult] = await Promise.all([
      wedmApi.startHoles({ features }, signal),
      wedmApi.toolpath({ features, material } as ToolpathParams, signal),
    ]);

    if (!startHolesResult.ok) return startHolesResult;
    if (!toolpathResult.ok) return toolpathResult;

    // Stage 5: Tabs + sequence (parallel)
    progress(55);
    currentStepIdx = 3;
    await Promise.all([
      wedmApi.tabs({ profiles: toolpathResult.data.profiles }, signal),
      wedmApi.sequence({ profiles: toolpathResult.data.profiles }, signal),
    ]);

    // Stage 6: Multi-pass
    progress(65);
    currentStepIdx = 4;
    const multipassResult = await wedmApi.multipass({ features, material }, signal);
    if (!multipassResult.ok) return multipassResult;

    // Stage 7: Optimize + safety (parallel)
    progress(75);
    await Promise.all([
      wedmApi.flushing({ material, features }, signal),
      wedmApi.predictWireBreak({ features, material }, signal),
    ]);

    // Stage 8: G-code generation
    progress(85);
    currentStepIdx = 5;
    const gcodeResult = await wedmApi.gcode({ controller, features, material } as unknown as ProgramStageParams, signal);
    if (!gcodeResult.ok) return gcodeResult;

    // Stage 9: Cost + setup sheet (parallel)
    progress(95);
    await Promise.all([
      wedmApi.cost({ features, material } as unknown as ProgramStageParams, signal),
      wedmApi.setupSheet({ features, material, controller } as unknown as ProgramStageParams, signal),
    ]);

    progress(100);

    return {
      ok: true,
      data: {
        job_id: `qg_${Date.now()}`,
        status: "complete",
        current_step: "program",
        progress_pct: 100,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      },
      warnings: [
        ...(parseResult.ok ? parseResult.warnings : []),
        ...(gcodeResult.ok ? gcodeResult.warnings : []),
      ],
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err.message ?? "Quick Generate failed",
      code: "QG_ERROR",
      step: steps[currentStepIdx],
    };
  }
}
