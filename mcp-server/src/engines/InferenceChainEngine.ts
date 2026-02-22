/**
 * PRISM MCP Server - Inference Chain Engine (R3-MS4.5-T2)
 *
 * Server-side multi-step reasoning engine that reduces client context consumption
 * by chaining multiple reasoning steps internally. Each chain runs 2-3 API calls,
 * feeds each step's output as context to the next, and returns a summarized result.
 *
 * Architecture:
 *   action receives query → engine calls API 2-3 times internally → returns summarized result
 *   All internal API calls logged to state/inference-logs/{chain_id}.json
 *
 * Chain Patterns:
 *   sequential  - Each step's output feeds the next as {{previous_output}}
 *   parallel    - Steps with no depends_on run concurrently via parallelAPICalls()
 *   reduce      - Multiple parallel outputs merged into a final synthesis step
 *
 * Exports (6):
 *   runInferenceChain    - Orchestrates a multi-step reasoning chain
 *   analyzeAndRecommend  - 3-step manufacturing scenario analysis
 *   deepDiagnose         - 2-step failure scenario diagnosis
 *   listChainTypes       - Returns available chain type strings
 *   CHAIN_ACTIONS        - Array of action names
 *   Types (7 interfaces + 1 union type)
 *
 * Manufacturing Context:
 *   analyzeAndRecommend and deepDiagnose prompts include PRISM domain knowledge:
 *   ISO material groups (P/M/K/N/S/H), Kienzle cutting force model, Taylor tool life,
 *   common failure modes (chatter, built-up edge, thermal cracks, adhesion wear),
 *   and standard coolant strategies.
 */

import * as fs from "fs";
import * as path from "path";
// fileURLToPath removed — esbuild banner already declares it (duplicate causes crash)
import { parallelAPICalls, hasValidApiKey, getModelForTier } from "../config/api-config.js";

// __dirname shim: esbuild injects __dirname/__filename via banner for the bundled dist file.
// tsx also provides them. Use directly.
const _filename = __filename;
const _dirname = __dirname;

// ============================================================================
// Types
// ============================================================================

/** The execution pattern for a reasoning chain. */
export type ChainStepType = "sequential" | "parallel" | "reduce";

/**
 * A single reasoning step within an inference chain.
 * prompt_template may include {{variable_name}} placeholders which are
 * substituted from the InferenceChainConfig.input dictionary before the
 * API call is made. The special placeholder {{previous_output}} is
 * automatically populated with the preceding step's output text.
 */
export interface ChainStep {
  /** Unique name identifying this step within the chain. */
  name: string;
  /** Prompt template with {{variable}} placeholders. */
  prompt_template: string;
  /** Claude model tier to use for this step. */
  model_tier: "opus" | "sonnet" | "haiku";
  /** Maximum tokens for the response (default: 512). */
  max_tokens?: number;
  /** Sampling temperature 0.0-1.0 (default: 0.3). */
  temperature?: number;
  /**
   * Names of steps this step depends on (for parallel fan-out).
   * Steps with an empty or absent depends_on array run as early as possible.
   */
  depends_on?: string[];
}

/**
 * Configuration for a complete inference chain execution.
 */
export interface InferenceChainConfig {
  /** Auto-generated UUID if not provided. */
  chain_id?: string;
  /** Human-readable chain name for logging. */
  name: string;
  /** Ordered list of reasoning steps. */
  steps: ChainStep[];
  /** Template variable values for {{variable_name}} substitution. */
  input: Record<string, any>;
  /**
   * Output verbosity level:
   *   pointer  — only chain_id + status
   *   summary  — chain_id + final_output + total_tokens
   *   full     — everything including per-step results
   */
  response_level?: "pointer" | "summary" | "full";
  /** Write chain log to disk (default: true). */
  log_to_disk?: boolean;
  /** Global timeout for the entire chain in milliseconds (default: 30000). */
  timeout_ms?: number;
}

/** Result from a single step execution. */
export interface StepResult {
  step_name: string;
  model: string;
  tokens: { input: number; output: number };
  duration_ms: number;
  output: string;
  error?: string;
}

/**
 * Complete result from a runInferenceChain() call.
 * The step_results field is only populated when response_level is 'full'.
 */
export interface InferenceChainResult {
  chain_id: string;
  name: string;
  steps_completed: number;
  total_steps: number;
  total_tokens: { input: number; output: number };
  total_duration_ms: number;
  final_output: string;
  /** Populated only when response_level is 'full'. */
  step_results: StepResult[];
  status: "completed" | "partial" | "failed";
}

/** Result from analyzeAndRecommend(). */
export interface AnalysisResult {
  chain_id: string;
  problem_classification: string;
  recommendations: Array<{
    rank: number;
    solution: string;
    rationale: string;
    confidence: number;
  }>;
  total_tokens: { input: number; output: number };
}

/** Result from deepDiagnose(). */
export interface DiagnosisResult {
  chain_id: string;
  failure_mode: string;
  root_causes: Array<{
    cause: string;
    /** "high" | "medium" | "low" */
    probability: string;
  }>;
  remediation: Array<{
    priority: number;
    action: string;
    expected_outcome: string;
  }>;
  total_tokens: { input: number; output: number };
}

// ============================================================================
// Constants
// ============================================================================

/** All action names exported by this engine. */
export const CHAIN_ACTIONS = [
  "inference_chain",
  "analyze_and_recommend",
  "deep_diagnose",
  "list_chain_types",
] as const;

/** Available chain execution patterns. */
const CHAIN_TYPES: ChainStepType[] = ["sequential", "parallel", "reduce"];

/**
 * Log directory: resolves to C:\PRISM\state\inference-logs at runtime.
 * esbuild bundles to dist/index.js so __dirname = C:\PRISM\mcp-server\dist at runtime.
 * When running via tsx (source), _dirname = C:\PRISM\mcp-server\src\engines.
 */
function getLogDir(): string {
  // dist/index.js → go up two dirs to reach C:\PRISM, then state/inference-logs
  // src/engines/InferenceChainEngine.ts → go up three dirs
  const fromDist = path.join(_dirname, "../../state/inference-logs");
  const fromSrc  = path.join(_dirname, "../../../state/inference-logs");
  // Heuristic: if _dirname ends with "dist", we're in the bundled file
  const isBuilt = _dirname.endsWith("dist") || _dirname.includes(`${path.sep}dist`);
  return isBuilt ? fromDist : fromSrc;
}

const LOG_DIR = getLogDir();

/** PRISM manufacturing domain context injected into analyzeAndRecommend prompts. */
const MANUFACTURING_SYSTEM_PROMPT = `You are a PRISM manufacturing intelligence assistant with deep knowledge of:

MATERIAL GROUPS (ISO 513):
  P — Carbon/alloy steels (hardness 150-350 HB, kc1_1 typically 1400-1800 N/mm²)
  M — Stainless steels (austenitic/martensitic, work-hardens, kc1_1 1500-2000 N/mm²)
  K — Cast irons (grey/nodular/white, kc1_1 800-1200 N/mm², brittle chips)
  N — Non-ferrous (aluminium alloys, copper, kc1_1 400-800 N/mm², high speeds)
  S — Heat-resistant superalloys (Inconel, titanium, kc1_1 2000-3000 N/mm², low speeds)
  H — Hardened steels (50-70 HRC, kc1_1 2500-3500 N/mm², CBN/ceramic tools)

CUTTING PHYSICS:
  Cutting force (Kienzle): Fc = kc1_1 × b × h^(1-mc) × (1 - γ/100) where γ is rake angle
  Tool life (Taylor): Vc × T^n = C  (n ≈ 0.25 carbide, 0.1 HSS; C depends on material)
  MRR = Vc × fz × z × ap × ae  (all in consistent units)
  Surface finish Ra ≈ fz²/(8 × r_ε) for turning, ≈ 0.032 × (fz²/D) for milling

TOOL WEAR MODES:
  Flank wear (VB) — primary life criterion, max 0.3 mm (0.2 mm finishing)
  Crater wear (KT) — high temperatures, above critical Vc
  Built-up edge (BUE) — low-medium speeds in sticky materials (P, M groups)
  Thermal cracks — interrupted cuts, temperature cycling (harder materials)
  Adhesion wear — superalloys (S-group), requires high-pressure coolant

COOLANT STRATEGIES:
  Dry   — K/N groups, short operations, thermally stable materials
  MQL   — P/M groups moderate cutting, environmental preference
  Flood — standard for all groups, required for S/H groups
  TSC   — through-spindle coolant, deep holes, superalloys (>50 bar recommended)

Provide concise, technically accurate manufacturing recommendations.`;

/** PRISM failure diagnosis context. */
const DIAGNOSIS_SYSTEM_PROMPT = `You are a PRISM failure analysis expert specializing in CNC machining failures.

COMMON FAILURE MODES:
  Chatter (regenerative) — vibration amplitude grows each pass; check stability lobes
  Tool chipping — sudden impact load, too aggressive ap or ae, interrupted cut
  Premature flank wear — Vc too high, insufficient coolant, wrong grade
  Built-up edge (BUE) — temperature in 200-400°C range, increase or decrease Vc
  Thermal cracking — thermal cycling in interrupted cuts, check coolant coverage
  Work hardening — P/M group materials, dwell in cut, insufficient feed
  Adhesion/pickup — superalloys at medium speed, low fz, use high-pressure TSC
  Taper/dimensional drift — machine thermal growth, check coolant temperature stability
  Surface roughness regression — tool wear, instability, incorrect stepover

ALARM CODES (common):
  Fanuc: ALM 410/411/416 — servo overload; ALM 700 — spindle overload; ALM 300 — APC error
  Siemens: 25000-series — axis following error; 380500 — spindle drive fault
  Heidenhain: EE 500/501 — feed drive overtemperature; EE 400 — spindle fault

Always identify the failure mode first, then probable root causes with probability, then a prioritized remediation plan.`;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Generate a simple time-based chain ID.
 * Format: chain_{timestamp}_{4-char random hex}
 */
function generateChainId(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .padStart(4, "0");
  return `chain_${ts}_${rand}`;
}

/**
 * Substitute all {{variable_name}} placeholders in a template string
 * with corresponding values from the substitution map.
 * Unrecognised keys are left as-is.
 *
 * @param template  - String with {{key}} tokens
 * @param variables - Dictionary of key → value mappings
 * @returns Template with all recognised tokens replaced
 */
function substituteTemplate(
  template: string,
  variables: Record<string, any>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    if (key in variables) {
      const val = variables[key];
      return typeof val === "object" ? JSON.stringify(val) : String(val);
    }
    return _match; // leave unknown tokens intact
  });
}

/**
 * Ensure the inference-logs directory exists, creating it recursively if needed.
 */
function ensureLogDir(): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch {
    // Non-fatal: log to stderr and continue — disk logging is best-effort
    process.stderr.write(`[InferenceChainEngine] Could not create log dir: ${LOG_DIR}\n`);
  }
}

/**
 * Write the chain result JSON to disk under the inference-logs directory.
 * Failures are silently swallowed so they cannot interrupt the return value.
 *
 * @param chainId - Chain identifier used as the filename
 * @param data    - Arbitrary serialisable object to persist
 */
function writeChainLog(chainId: string, data: unknown): void {
  try {
    ensureLogDir();
    const filePath = path.join(LOG_DIR, `${chainId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    process.stderr.write(`[InferenceChainEngine] Log write failed for ${chainId}\n`);
  }
}

/**
 * Build a no-API-key graceful degradation result when hasValidApiKey() is false.
 */
function buildNoKeyResult(config: InferenceChainConfig): InferenceChainResult {
  const chainId = config.chain_id ?? generateChainId();
  return {
    chain_id: chainId,
    name: config.name,
    steps_completed: 0,
    total_steps: config.steps.length,
    total_tokens: { input: 0, output: 0 },
    total_duration_ms: 0,
    final_output:
      "ANTHROPIC_API_KEY not configured. Add your key to the .env file to enable inference chains.",
    step_results: [],
    status: "failed",
  };
}

/**
 * Apply response_level filtering to an InferenceChainResult.
 *   pointer  — returns only chain_id + status
 *   summary  — returns chain_id, name, final_output, total_tokens, status
 *   full     — returns the complete object (no change)
 */
function applyResponseLevel(
  result: InferenceChainResult,
  level: "pointer" | "summary" | "full",
): Partial<InferenceChainResult> {
  switch (level) {
    case "pointer":
      return { chain_id: result.chain_id, status: result.status };
    case "summary":
      return {
        chain_id: result.chain_id,
        name: result.name,
        final_output: result.final_output,
        total_tokens: result.total_tokens,
        status: result.status,
      };
    case "full":
    default:
      return result;
  }
}

// ============================================================================
// Dependency Graph & Wave Builder
// ============================================================================

/**
 * Build execution waves from step dependency graph via topological sort.
 * Steps with no dependencies go in wave 0. Steps depending only on wave-0
 * steps go in wave 1, etc. Steps within the same wave can run in parallel.
 *
 * Falls back to sequential execution (one step per wave) if:
 *   - No depends_on fields are present (preserves {{previous_output}} behavior)
 *   - Circular dependencies are detected
 */
function buildExecutionWaves(steps: ChainStep[]): ChainStep[][] {
  // Check if any step uses depends_on — if not, use sequential mode
  const anyDependencies = steps.some(
    (s) => s.depends_on && s.depends_on.length > 0,
  );
  if (!anyDependencies) {
    // Sequential fallback: each step is its own wave
    return steps.map((s) => [s]);
  }

  const stepMap = new Map<string, ChainStep>();
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>(); // dep → [steps that depend on it]

  for (const step of steps) {
    stepMap.set(step.name, step);
    inDegree.set(step.name, 0);
    dependents.set(step.name, []);
  }

  // Build edges
  for (const step of steps) {
    if (step.depends_on) {
      for (const dep of step.depends_on) {
        if (stepMap.has(dep)) {
          inDegree.set(step.name, (inDegree.get(step.name) ?? 0) + 1);
          dependents.get(dep)!.push(step.name);
        }
      }
    }
  }

  // Kahn's algorithm: topological sort into waves
  const waves: ChainStep[][] = [];
  const remaining = new Set(steps.map((s) => s.name));
  let safety = 0;

  while (remaining.size > 0 && safety++ < steps.length + 1) {
    // Find all steps with in-degree 0 (no unmet dependencies)
    const wave: ChainStep[] = [];
    for (const name of remaining) {
      if ((inDegree.get(name) ?? 0) === 0) {
        wave.push(stepMap.get(name)!);
      }
    }

    if (wave.length === 0) {
      // Circular dependency detected — dump remaining as sequential
      for (const name of remaining) {
        waves.push([stepMap.get(name)!]);
      }
      break;
    }

    waves.push(wave);

    // Remove completed steps and decrement in-degrees
    for (const step of wave) {
      remaining.delete(step.name);
      for (const depName of dependents.get(step.name) ?? []) {
        inDegree.set(depName, (inDegree.get(depName) ?? 0) - 1);
      }
    }
  }

  return waves;
}

// ============================================================================
// Core Engine Function
// ============================================================================

/**
 * Orchestrate a multi-step reasoning chain with dependency-aware parallel execution.
 *
 * Execution model:
 *   1. Steps are sorted into execution waves via topological sort on depends_on.
 *   2. Steps within the same wave run concurrently via parallelAPICalls().
 *   3. Each step receives outputs from its dependencies as {{step_name_output}}.
 *   4. If no depends_on fields exist, falls back to sequential execution with
 *      {{previous_output}} chaining.
 *   5. The last step's output (in execution order) is the chain's final_output.
 *
 * Timeout:
 *   If config.timeout_ms is set, the chain returns a partial result with
 *   status "partial" when the deadline is exceeded.
 *
 * Graceful degradation:
 *   - If hasValidApiKey() is false, returns a structured error without throwing.
 *   - If an individual step fails, it records the error and continues with an
 *     empty string output, setting status to "partial".
 *
 * @param config - Chain configuration including steps, input variables, and options
 * @returns InferenceChainResult (filtered by response_level if specified)
 */
export async function runInferenceChain(
  config: InferenceChainConfig,
): Promise<InferenceChainResult> {
  const chainStart = Date.now();
  const chainId = config.chain_id ?? generateChainId();
  const logToDisk = config.log_to_disk !== false;
  const timeoutMs = config.timeout_ms ?? 30000;

  // Guard: no API key
  if (!hasValidApiKey()) {
    const noKeyResult = buildNoKeyResult({ ...config, chain_id: chainId });
    if (logToDisk) writeChainLog(chainId, { config, result: noKeyResult });
    return noKeyResult;
  }

  const steps = config.steps;
  const completedSteps: StepResult[] = [];
  const stepOutputMap: Record<string, string> = {};
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let overallStatus: "completed" | "partial" | "failed" = "completed";
  let previousOutput = "";
  let timedOut = false;

  // Build execution waves from dependency graph
  const waves = buildExecutionWaves(steps);

  for (const wave of waves) {
    // Check timeout before each wave
    if (Date.now() - chainStart > timeoutMs) {
      timedOut = true;
      overallStatus = "partial";
      break;
    }

    if (wave.length === 1) {
      // Single step in wave: run directly (most common case)
      const step = wave[0];
      const vars: Record<string, any> = {
        ...config.input,
        previous_output: previousOutput,
      };

      // Inject dependency outputs
      if (step.depends_on) {
        for (const dep of step.depends_on) {
          if (dep in stepOutputMap) {
            vars[`${dep}_output`] = stepOutputMap[dep];
          }
        }
      }

      const prompt = substituteTemplate(step.prompt_template, vars);
      const model = getModelForTier(step.model_tier);
      const stepStart = Date.now();

      let stepOutput = "";
      let stepError: string | undefined;
      let inputTokens = 0;
      let outputTokens = 0;

      try {
        const responses = await parallelAPICalls([
          {
            system: MANUFACTURING_SYSTEM_PROMPT,
            user: prompt,
            model,
            maxTokens: step.max_tokens ?? 512,
            temperature: step.temperature ?? 0.3,
          },
        ]);

        const resp = responses[0];
        if (resp.error) {
          stepError = resp.error;
          overallStatus = "partial";
        } else {
          stepOutput = resp.text;
        }
        inputTokens = resp.tokens.input;
        outputTokens = resp.tokens.output;
      } catch (err) {
        stepError = err instanceof Error ? err.message : String(err);
        overallStatus = "partial";
      }

      const stepDuration = Date.now() - stepStart;
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      completedSteps.push({
        step_name: step.name,
        model,
        tokens: { input: inputTokens, output: outputTokens },
        duration_ms: stepDuration,
        output: stepOutput,
        ...(stepError !== undefined ? { error: stepError } : {}),
      });

      stepOutputMap[step.name] = stepOutput;
      previousOutput = stepOutput;
    } else {
      // Multiple steps in wave: run in parallel via parallelAPICalls
      const apiCalls = wave.map((step) => {
        const vars: Record<string, any> = {
          ...config.input,
          previous_output: previousOutput,
        };
        if (step.depends_on) {
          for (const dep of step.depends_on) {
            if (dep in stepOutputMap) {
              vars[`${dep}_output`] = stepOutputMap[dep];
            }
          }
        }
        const prompt = substituteTemplate(step.prompt_template, vars);
        const model = getModelForTier(step.model_tier);
        return {
          system: MANUFACTURING_SYSTEM_PROMPT,
          user: prompt,
          model,
          maxTokens: step.max_tokens ?? 512,
          temperature: step.temperature ?? 0.3,
        };
      });

      const waveStart = Date.now();

      try {
        const responses = await parallelAPICalls(apiCalls);

        for (let i = 0; i < wave.length; i++) {
          const step = wave[i];
          const resp = responses[i];
          const model = getModelForTier(step.model_tier);

          let stepOutput = "";
          let stepError: string | undefined;

          if (resp.error) {
            stepError = resp.error;
            overallStatus = "partial";
          } else {
            stepOutput = resp.text;
          }

          completedSteps.push({
            step_name: step.name,
            model,
            tokens: { input: resp.tokens.input, output: resp.tokens.output },
            duration_ms: Date.now() - waveStart,
            output: stepOutput,
            ...(stepError !== undefined ? { error: stepError } : {}),
          });

          totalInputTokens += resp.tokens.input;
          totalOutputTokens += resp.tokens.output;
          stepOutputMap[step.name] = stepOutput;
          previousOutput = stepOutput;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        overallStatus = "partial";
        for (const step of wave) {
          completedSteps.push({
            step_name: step.name,
            model: getModelForTier(step.model_tier),
            tokens: { input: 0, output: 0 },
            duration_ms: Date.now() - waveStart,
            output: "",
            error: errMsg,
          });
          stepOutputMap[step.name] = "";
        }
      }
    }
  }

  const finalOutput =
    completedSteps.length > 0
      ? completedSteps[completedSteps.length - 1].output
      : "";

  if (completedSteps.length === 0) {
    overallStatus = "failed";
  }

  const result: InferenceChainResult = {
    chain_id: chainId,
    name: config.name,
    steps_completed: completedSteps.filter((s) => !s.error).length,
    total_steps: steps.length,
    total_tokens: { input: totalInputTokens, output: totalOutputTokens },
    total_duration_ms: Date.now() - chainStart,
    final_output: timedOut
      ? finalOutput || "[Chain timed out before completion]"
      : finalOutput,
    step_results: completedSteps,
    status: overallStatus,
  };

  if (logToDisk) {
    writeChainLog(chainId, { config, result });
  }

  // Apply response level filtering
  const level = config.response_level ?? "full";
  const filtered = applyResponseLevel(result, level);

  return filtered as InferenceChainResult;
}

// ============================================================================
// High-Level Convenience: analyzeAndRecommend
// ============================================================================

/**
 * Run a 3-step manufacturing scenario analysis chain:
 *   Step 1 (Haiku): Extract key parameters and classify the problem domain.
 *   Step 2 (Haiku): Generate candidate solutions based on the classification.
 *   Step 3 (Haiku): Evaluate and rank candidates by criteria, assign confidence scores.
 *
 * All steps use Haiku for cost efficiency. The chain is designed to consume
 * minimal client context by running entirely server-side.
 *
 * @param params.scenario      - Natural language description of the manufacturing scenario
 * @param params.material      - Material identifier or description (optional)
 * @param params.machine       - Machine identifier or description (optional)
 * @param params.constraints   - Constraints such as cycle time, cost limits (optional)
 * @param params.response_level - Output verbosity (default: "summary")
 * @returns Structured AnalysisResult with ranked recommendations
 */
export async function analyzeAndRecommend(params: {
  scenario: string;
  material?: string;
  machine?: string;
  constraints?: string;
  response_level?: "pointer" | "summary" | "full";
}): Promise<AnalysisResult> {
  const chainId = generateChainId();

  if (!hasValidApiKey()) {
    return {
      chain_id: chainId,
      problem_classification: "API_KEY_MISSING",
      recommendations: [],
      total_tokens: { input: 0, output: 0 },
    };
  }

  const chainConfig: InferenceChainConfig = {
    chain_id: chainId,
    name: "analyze_and_recommend",
    response_level: "full",
    log_to_disk: true,
    input: {
      scenario: params.scenario,
      material: params.material ?? "unspecified",
      machine: params.machine ?? "unspecified",
      constraints: params.constraints ?? "none specified",
    },
    steps: [
      {
        name: "classify",
        model_tier: "haiku",
        max_tokens: 400,
        temperature: 0.2,
        prompt_template: `Analyze this manufacturing scenario and extract key parameters.

Scenario: {{scenario}}
Material: {{material}}
Machine: {{machine}}
Constraints: {{constraints}}

Provide a concise structured classification:
1. PROBLEM TYPE: (one of: cutting_parameters, tool_selection, workholding, process_planning, quality_issue, machine_selection)
2. MATERIAL GROUP: (ISO group P/M/K/N/S/H or unknown)
3. KEY PARAMETERS: (list 3-5 critical numerical or categorical parameters from the scenario)
4. COMPLEXITY: (simple/moderate/complex)
5. CLASSIFICATION SUMMARY: (1 sentence)`,
      },
      {
        name: "generate_solutions",
        model_tier: "haiku",
        max_tokens: 600,
        temperature: 0.4,
        depends_on: ["classify"],
        prompt_template: `Based on this manufacturing problem classification, generate 3-4 candidate solutions.

CLASSIFICATION:
{{classify_output}}

Original Scenario: {{scenario}}

For each candidate solution, provide:
- SOLUTION: (brief title)
- APPROACH: (2-3 sentences describing the technical approach)
- PARAMETERS: (specific values where applicable)
- TRADE-OFFS: (pros and cons)

Format each solution as: CANDIDATE [N]: ...`,
      },
      {
        name: "rank_solutions",
        model_tier: "haiku",
        max_tokens: 700,
        temperature: 0.2,
        depends_on: ["generate_solutions"],
        prompt_template: `Evaluate and rank these manufacturing solution candidates.

CANDIDATES:
{{generate_solutions_output}}

SCENARIO: {{scenario}}
CONSTRAINTS: {{constraints}}

Rank from best to worst. For each, provide:
RANK [N]:
- SOLUTION: (title from above)
- RATIONALE: (why this rank, 1-2 sentences)
- CONFIDENCE: (0.0-1.0, reflecting certainty given available information)
- RECOMMENDATION: (specific next action)

End with: RECOMMENDED_ACTION: (the single most important next step)`,
      },
    ],
  };

  const chainResult = await runInferenceChain(chainConfig);

  // Parse the final ranked output into structured recommendations
  const recommendations = parseRankedRecommendations(
    chainResult.final_output,
    chainResult.step_results.find((s) => s.step_name === "classify")?.output ?? "",
  );

  const classifyStep = chainResult.step_results.find((s) => s.step_name === "classify");
  const classificationText = classifyStep?.output ?? "";
  const classMatch = classificationText.match(/PROBLEM TYPE:\s*([^\n]+)/i);
  const groupMatch = classificationText.match(/MATERIAL GROUP:\s*([^\n]+)/i);
  const summaryMatch = classificationText.match(/CLASSIFICATION SUMMARY:\s*([^\n]+)/i);

  const problemClassification = [
    classMatch?.[1]?.trim(),
    groupMatch?.[1]?.trim() ? `ISO ${groupMatch[1].trim()}` : null,
    summaryMatch?.[1]?.trim(),
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    chain_id: chainId,
    problem_classification: problemClassification || classificationText.slice(0, 120),
    recommendations,
    total_tokens: chainResult.total_tokens,
  };
}

/**
 * Parse ranked recommendation text from rank_solutions step output.
 * Returns a best-effort array — gracefully handles multiple formatting variations:
 *   "RANK [1]:", "RANK 1:", "Rank 1:", "**1.**", "1)", "1.", "#1"
 */
function parseRankedRecommendations(
  rankedText: string,
  _classifyText: string,
): AnalysisResult["recommendations"] {
  const results: AnalysisResult["recommendations"] = [];
  if (!rankedText) return results;

  // Try multiple split patterns in order of specificity
  const splitPatterns = [
    /RANK\s*\[?\d+\]?\s*:/i,          // RANK [1]: or RANK 1:
    /\*\*\d+\.\*\*/,                   // **1.**
    /(?:^|\n)#\d+\s*[:\-]/m,          // #1: or #1 -
    /(?:^|\n)\d+\)\s*/m,              // 1) at line start
  ];

  let rankBlocks: string[] = [];
  for (const pattern of splitPatterns) {
    rankBlocks = rankedText.split(pattern).slice(1);
    if (rankBlocks.length > 0) break;
  }

  for (let i = 0; i < rankBlocks.length; i++) {
    const block = rankBlocks[i];

    // Solution: try multiple label patterns
    const solutionMatch =
      block.match(/SOLUTION:\s*([^\n]+)/i) ??
      block.match(/TITLE:\s*([^\n]+)/i) ??
      block.match(/^[\s\-]*([^\n]{5,80})/); // first meaningful line

    // Rationale: try multiple patterns
    const rationaleMatch =
      block.match(/RATIONALE:\s*([^\n]+(?:\n(?!CONFIDENCE|RECOMMENDATION)[^\n]+)*)/i) ??
      block.match(/REASON(?:ING)?:\s*([^\n]+)/i) ??
      block.match(/WHY:\s*([^\n]+)/i);

    // Confidence: try multiple patterns
    const confidenceMatch =
      block.match(/CONFIDENCE:\s*([\d.]+)/i) ??
      block.match(/SCORE:\s*([\d.]+)/i) ??
      block.match(/\((\d+(?:\.\d+)?)\s*(?:\/\s*1(?:\.0)?)?\)/); // (0.8) or (0.8/1.0)

    // Recommendation
    const recMatch = block.match(/RECOMMENDATION:\s*([^\n]+)/i);

    results.push({
      rank: i + 1,
      solution: solutionMatch?.[1]?.trim() ?? `Solution ${i + 1}`,
      rationale: (rationaleMatch?.[1]?.trim() ?? recMatch?.[1]?.trim() ?? "").replace(/\n/g, " "),
      confidence: confidenceMatch ? Math.min(1.0, Math.max(0.0, parseFloat(confidenceMatch[1]))) : 0.5,
    });
  }

  // Fallback: if no blocks found, try numbered list parsing (1. Solution ...)
  if (results.length === 0) {
    const numberedLines = rankedText.match(/(?:^|\n)\d+[\.\)]\s*[^\n]+/g);
    if (numberedLines && numberedLines.length > 0) {
      numberedLines.slice(0, 5).forEach((line, i) => {
        results.push({
          rank: i + 1,
          solution: line.replace(/^\s*\d+[\.\)]\s*/, "").trim().slice(0, 100),
          rationale: "",
          confidence: 0.5,
        });
      });
    }
  }

  // Final fallback: single entry with full text
  if (results.length === 0 && rankedText.trim()) {
    results.push({
      rank: 1,
      solution: "Analysis Result",
      rationale: rankedText.trim().slice(0, 300),
      confidence: 0.5,
    });
  }

  return results;
}

// ============================================================================
// High-Level Convenience: deepDiagnose
// ============================================================================

/**
 * Run a 2-step failure scenario diagnosis chain:
 *   Step 1 (Haiku): Identify failure mode and probable root causes with probabilities.
 *   Step 2 (Haiku): Generate prioritized remediation steps with expected outcomes.
 *
 * @param params.alarm_code    - CNC alarm code (e.g., "ALM 410", "25001")
 * @param params.symptoms      - Description of observed symptoms
 * @param params.machine_state - Machine state description (optional)
 * @param params.material      - Material being machined (optional)
 * @param params.operation     - Operation type (optional, e.g., "facing", "drilling")
 * @param params.response_level - Output verbosity (default: "summary")
 * @returns Structured DiagnosisResult with failure mode, root causes, and remediation
 */
export async function deepDiagnose(params: {
  alarm_code?: string;
  symptoms: string;
  machine_state?: string;
  material?: string;
  operation?: string;
  response_level?: "pointer" | "summary" | "full";
}): Promise<DiagnosisResult> {
  const chainId = generateChainId();

  if (!hasValidApiKey()) {
    return {
      chain_id: chainId,
      failure_mode: "API_KEY_MISSING",
      root_causes: [],
      remediation: [],
      total_tokens: { input: 0, output: 0 },
    };
  }

  const chainConfig: InferenceChainConfig = {
    chain_id: chainId,
    name: "deep_diagnose",
    response_level: "full",
    log_to_disk: true,
    input: {
      alarm_code: params.alarm_code ?? "none",
      symptoms: params.symptoms,
      machine_state: params.machine_state ?? "not specified",
      material: params.material ?? "not specified",
      operation: params.operation ?? "not specified",
    },
    steps: [
      {
        name: "identify_failure",
        model_tier: "haiku",
        max_tokens: 500,
        temperature: 0.2,
        prompt_template: `Analyze this CNC machining failure scenario and identify the failure mode and root causes.

ALARM CODE: {{alarm_code}}
SYMPTOMS: {{symptoms}}
MACHINE STATE: {{machine_state}}
MATERIAL: {{material}}
OPERATION: {{operation}}

Provide your analysis in this exact format:
FAILURE_MODE: (one primary failure mode)
ROOT_CAUSE_1: [cause text] | PROBABILITY: high/medium/low
ROOT_CAUSE_2: [cause text] | PROBABILITY: high/medium/low
ROOT_CAUSE_3: [cause text] | PROBABILITY: high/medium/low
CONTRIBUTING_FACTORS: (brief list of secondary factors)
URGENCY: critical/high/medium/low`,
      },
      {
        name: "generate_remediation",
        model_tier: "haiku",
        max_tokens: 600,
        temperature: 0.2,
        depends_on: ["identify_failure"],
        prompt_template: `Based on this failure analysis, generate a prioritized remediation plan.

FAILURE ANALYSIS:
{{identify_failure_output}}

Original scenario - Alarm: {{alarm_code}} | Symptoms: {{symptoms}}

Generate a step-by-step remediation plan. For each step use this format:
STEP_1: [action description] | EXPECTED_OUTCOME: [what this achieves]
STEP_2: [action description] | EXPECTED_OUTCOME: [what this achieves]
STEP_3: [action description] | EXPECTED_OUTCOME: [what this achieves]
STEP_4: [action description] | EXPECTED_OUTCOME: [what this achieves] (if needed)
PREVENTION: (how to prevent recurrence, 1-2 sentences)`,
      },
    ],
  };

  const chainResult = await runInferenceChain(chainConfig);

  // Parse step outputs into structured result
  const identifyStep = chainResult.step_results.find((s) => s.step_name === "identify_failure");
  const remediationStep = chainResult.step_results.find((s) => s.step_name === "generate_remediation");

  const identifyText = identifyStep?.output ?? "";
  const remediationText = remediationStep?.output ?? chainResult.final_output;

  const failureModeMatch = identifyText.match(/FAILURE_MODE:\s*([^\n]+)/i);
  const failureMode = failureModeMatch?.[1]?.trim() ?? "Unknown failure mode";

  const rootCauses = parseRootCauses(identifyText);
  const remediation = parseRemediation(remediationText);

  return {
    chain_id: chainId,
    failure_mode: failureMode,
    root_causes: rootCauses,
    remediation,
    total_tokens: chainResult.total_tokens,
  };
}

/**
 * Parse ROOT_CAUSE_N: ... | PROBABILITY: ... lines from identify_failure output.
 */
function parseRootCauses(text: string): DiagnosisResult["root_causes"] {
  const results: DiagnosisResult["root_causes"] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/ROOT_CAUSE_\d+:\s*(.+?)\s*\|\s*PROBABILITY:\s*(high|medium|low)/i);
    if (match) {
      results.push({
        cause: match[1].trim(),
        probability: match[2].toLowerCase(),
      });
    }
  }
  if (results.length === 0 && text.trim()) {
    // Fallback: extract any lines that look like causes
    const causeLines = text
      .split("\n")
      .filter((l) => l.trim().length > 10 && !l.match(/^(FAILURE_MODE|URGENCY|CONTRIBUTING)/i))
      .slice(0, 3);
    for (const l of causeLines) {
      results.push({ cause: l.replace(/ROOT_CAUSE_\d+:/i, "").trim(), probability: "medium" });
    }
  }
  return results;
}

/**
 * Parse STEP_N: ... | EXPECTED_OUTCOME: ... lines from generate_remediation output.
 */
function parseRemediation(text: string): DiagnosisResult["remediation"] {
  const results: DiagnosisResult["remediation"] = [];
  const lines = text.split("\n");
  for (const line of lines) {
    const match = line.match(/STEP_(\d+):\s*(.+?)\s*\|\s*EXPECTED_OUTCOME:\s*(.+)/i);
    if (match) {
      results.push({
        priority: parseInt(match[1], 10),
        action: match[2].trim(),
        expected_outcome: match[3].trim(),
      });
    }
  }
  if (results.length === 0 && text.trim()) {
    // Fallback: turn any numbered lines into remediation steps
    const numbered = text.match(/\d+\.\s*[^\n]+/g) ?? [];
    numbered.slice(0, 4).forEach((line, i) => {
      results.push({
        priority: i + 1,
        action: line.replace(/^\d+\.\s*/, "").trim(),
        expected_outcome: "Resolve or mitigate identified failure",
      });
    });
    if (results.length === 0) {
      results.push({
        priority: 1,
        action: text.trim().slice(0, 200),
        expected_outcome: "Address identified failure mode",
      });
    }
  }
  return results;
}

// ============================================================================
// Utility Exports
// ============================================================================

/**
 * Return the list of available chain execution pattern types.
 *
 * @returns Array of ChainStepType strings: ["sequential", "parallel", "reduce"]
 */
export function listChainTypes(): string[] {
  return [...CHAIN_TYPES];
}
