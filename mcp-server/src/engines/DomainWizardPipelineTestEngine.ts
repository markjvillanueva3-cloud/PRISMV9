/**
 * DomainWizardPipelineTestEngine — Axis 4 of /goal-5-axis (tango 2026-05-25)
 *
 * Stage-by-stage assertion driver for the three PRISM domain print-to-program
 * pipelines: mill, lathe, wire-EDM. Each domain's pipeline is wrapped in an
 * adapter callback; the harness drives the callback, captures per-stage
 * output, and asserts:
 *
 *   S1. Stage completeness    — every named stage emits a non-null, well-shaped output.
 *   S2. Stage ordering        — stages execute in declared order, no skipped stages.
 *   S3. Cross-stage invariants — values selected at stage N appear in stage N+M output
 *                                where the pipeline contract says they should
 *                                (e.g. tool_id from strategy stage appears in G-code stage).
 *   S4. Latency budget        — each stage completes under its declared budget; total
 *                                pipeline under the domain budget. Surfaces drift early.
 *   S5. Output non-emptiness  — final G-code / program lines > 0.
 *
 * Pure logic. No I/O. The engine does NOT import the per-domain pipeline
 * engines directly — adapter callbacks keep the harness composable + testable
 * without pulling in the full P2P-FULLSTACK dependency graph (which includes
 * the EDMDrawingInterpretationEngine + 6 strategy engines + post-processor
 * registry). Production wiring lives in the dispatcher layer.
 *
 * Complementary to (NOT a duplicate of) `PrintToProgramRegressionHarnessEngine`
 * (P2P-FULLSTACK-MS0/U-P2PFS59, sinker-EDM-only at v1.0): that engine validates
 * the *composite* pass/fail of a full fixture replay. This engine validates
 * per-stage transitions + cross-stage invariants — orthogonal lens.
 *
 * @module DomainWizardPipelineTestEngine
 * @version 1.0.0
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  uncertainty: number;
  source: string;
  confidence?: number;
}

// ============================================================================
// PIPELINE TYPES
// ============================================================================

export type WizardDomain = "mill" | "lathe" | "wire_edm";

export type CanonicalStageName =
  | "cad_parse"            // CAD or blueprint → feature set
  | "feature_recognize"    // Feature set → recognized features
  | "strategy_select"      // Features → strategy + tool selection
  | "toolpath_synthesize"  // Strategy → toolpath segments
  | "post_emit"            // Toolpath → controller-specific G-code
  | "gcode_validate";      // G-code → final validated program

export interface StageOutput {
  /** Canonical stage name (must match the pipeline's declared order). */
  stage: CanonicalStageName;
  /** Whatever the stage returned — opaque to the harness; consumers check shape. */
  payload: unknown;
  /** Wall-clock duration of this stage. */
  duration_ms: number;
  /** Per-stage warnings (advisory, not fatal). */
  warnings?: string[];
  /**
   * Optional cross-stage handoff tokens — fields the harness will check appear
   * in downstream stages. Example: `{ tool_id: "T01", strategy: "trochoidal" }`
   * emitted by `strategy_select` → harness asserts `T01` appears in `post_emit`.
   */
  handoff?: Record<string, string | number>;
}

export interface PipelineRunResult {
  stages: StageOutput[];
  /** Final program (e.g. G-code) — counted for S5 non-emptiness. */
  final_program?: string;
  /** Pipeline-level fatal error, if any (e.g. CAD parse threw). */
  error?: string;
}

export type PipelineAdapter = (input: unknown) => Promise<PipelineRunResult>;

export interface DomainContract {
  domain: WizardDomain;
  /** Stages this domain must produce, in order. Subset of CanonicalStageName. */
  required_stages: CanonicalStageName[];
  /** Max wall-clock budget for the entire pipeline (ms). */
  total_budget_ms: number;
  /** Per-stage budget (ms). Defaults to total_budget_ms/required_stages.length. */
  stage_budget_ms?: Partial<Record<CanonicalStageName, number>>;
  /**
   * Cross-stage handoff assertions. Each entry: "value emitted in handoff[key]
   * at stage `from` must appear in the payload of stage `to`." The harness
   * does a substring match on JSON.stringify(payload).
   */
  handoff_assertions?: Array<{
    from: CanonicalStageName;
    to: CanonicalStageName;
    handoff_key: string;
  }>;
}

export type StageVerdict = "ok" | "missing" | "out_of_order" | "over_budget" | "empty_payload";

export interface StageAssertion {
  stage: CanonicalStageName;
  verdict: StageVerdict;
  notes: string[];
  duration_ms?: number;
  budget_ms?: number;
}

export interface HandoffAssertion {
  from: CanonicalStageName;
  to: CanonicalStageName;
  handoff_key: string;
  handoff_value?: string | number;
  verdict: "ok" | "missing_handoff" | "not_propagated";
  notes: string[];
}

export type DomainRunVerdict = "pass" | "warn" | "fail";

export interface DomainRunReport {
  domain: WizardDomain;
  verdict: DomainRunVerdict;
  pipeline_error?: string;
  stage_assertions: StageAssertion[];
  handoff_assertions: HandoffAssertion[];
  final_program_lines: number;
  total_duration_ms: number;
  total_budget_ms: number;
  notes: string[];
}

export interface MultiDomainReport {
  reports: DomainRunReport[];
  total: number;
  pass: number;
  warn: number;
  fail: number;
  pass_rate: AtomicValue;
  duration_ms: number;
  source: string;
}

export interface RunDomainOptions {
  contract: DomainContract;
  adapter: PipelineAdapter;
  input?: unknown;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FULL_CONFIDENCE_SAMPLE_SIZE = 12; // 3 domains × 4 typical input variants
const WILSON_Z_95 = 1.96;

// Default domain contracts — minimal canonical 5-stage pipelines per domain.
// Real adapters may emit additional stages; the harness only checks `required_stages`.
export const MILL_CONTRACT: DomainContract = {
  domain: "mill",
  required_stages: [
    "cad_parse", "feature_recognize", "strategy_select",
    "toolpath_synthesize", "post_emit", "gcode_validate",
  ],
  total_budget_ms: 5000,
  handoff_assertions: [
    { from: "strategy_select", to: "post_emit", handoff_key: "tool_id" },
  ],
};

export const LATHE_CONTRACT: DomainContract = {
  domain: "lathe",
  required_stages: [
    "cad_parse", "feature_recognize", "strategy_select",
    "toolpath_synthesize", "post_emit", "gcode_validate",
  ],
  total_budget_ms: 5000,
  handoff_assertions: [
    { from: "strategy_select", to: "post_emit", handoff_key: "tool_id" },
  ],
};

export const WIRE_EDM_CONTRACT: DomainContract = {
  domain: "wire_edm",
  required_stages: [
    "cad_parse", "feature_recognize", "strategy_select",
    "toolpath_synthesize", "post_emit", "gcode_validate",
  ],
  total_budget_ms: 8000, // Wire EDM pipelines run longer due to multi-pass burn calc
  handoff_assertions: [
    { from: "strategy_select", to: "post_emit", handoff_key: "wire_diameter_mm" },
  ],
};

// ============================================================================
// HARNESS LOGIC
// ============================================================================

function assertStages(
  contract: DomainContract,
  stages: StageOutput[],
): StageAssertion[] {
  const assertions: StageAssertion[] = [];
  const defaultBudget = contract.total_budget_ms / contract.required_stages.length;

  for (let i = 0; i < contract.required_stages.length; i++) {
    const expected = contract.required_stages[i];
    const actual = stages[i];
    const budget = contract.stage_budget_ms?.[expected] ?? defaultBudget;
    const notes: string[] = [];

    if (!actual) {
      assertions.push({
        stage: expected, verdict: "missing", budget_ms: budget,
        notes: [`stage ${i} (${expected}) absent — pipeline truncated`],
      });
      continue;
    }

    if (actual.stage !== expected) {
      assertions.push({
        stage: expected, verdict: "out_of_order", budget_ms: budget,
        notes: [`expected '${expected}' at index ${i}, got '${actual.stage}'`],
      });
      continue;
    }

    if (actual.payload === null || actual.payload === undefined) {
      notes.push("payload is null/undefined");
      assertions.push({
        stage: expected, verdict: "empty_payload",
        duration_ms: actual.duration_ms, budget_ms: budget, notes,
      });
      continue;
    }

    if (typeof actual.payload === "object" && Object.keys(actual.payload as object).length === 0) {
      notes.push("payload is empty object");
      assertions.push({
        stage: expected, verdict: "empty_payload",
        duration_ms: actual.duration_ms, budget_ms: budget, notes,
      });
      continue;
    }

    if (actual.duration_ms > budget) {
      notes.push(`duration ${actual.duration_ms}ms > budget ${budget}ms`);
      assertions.push({
        stage: expected, verdict: "over_budget",
        duration_ms: actual.duration_ms, budget_ms: budget, notes,
      });
      continue;
    }

    assertions.push({
      stage: expected, verdict: "ok",
      duration_ms: actual.duration_ms, budget_ms: budget, notes,
    });
  }

  return assertions;
}

function assertHandoffs(
  contract: DomainContract,
  stages: StageOutput[],
): HandoffAssertion[] {
  const assertions: HandoffAssertion[] = [];
  if (!contract.handoff_assertions) return assertions;

  const stageByName = new Map<CanonicalStageName, StageOutput>();
  for (const s of stages) stageByName.set(s.stage, s);

  for (const h of contract.handoff_assertions) {
    const fromStage = stageByName.get(h.from);
    const toStage = stageByName.get(h.to);
    const notes: string[] = [];

    if (!fromStage || !toStage) {
      assertions.push({
        ...h, verdict: "missing_handoff",
        notes: [`stage '${!fromStage ? h.from : h.to}' missing — cannot verify handoff`],
      });
      continue;
    }

    const handoffValue = fromStage.handoff?.[h.handoff_key];
    if (handoffValue === undefined) {
      assertions.push({
        ...h, verdict: "missing_handoff",
        notes: [`handoff key '${h.handoff_key}' not emitted at '${h.from}'`],
      });
      continue;
    }

    // Substring match: does the downstream stage's payload (stringified) contain the handoff value?
    const toJson = JSON.stringify(toStage.payload);
    if (!toJson.includes(String(handoffValue))) {
      notes.push(`'${h.handoff_key}=${String(handoffValue)}' from '${h.from}' not found in '${h.to}' payload`);
      assertions.push({
        ...h, handoff_value: handoffValue, verdict: "not_propagated", notes,
      });
      continue;
    }

    assertions.push({
      ...h, handoff_value: handoffValue, verdict: "ok", notes,
    });
  }

  return assertions;
}

// ============================================================================
// ENGINE
// ============================================================================

export class DomainWizardPipelineTestEngine {
  async runDomain(opts: RunDomainOptions): Promise<DomainRunReport> {
    const { contract, adapter, input } = opts;
    const t0 = Date.now();
    let pipelineResult: PipelineRunResult;
    try {
      pipelineResult = await adapter(input);
    } catch (e) {
      return {
        domain: contract.domain,
        verdict: "fail",
        pipeline_error: e instanceof Error ? e.message : String(e),
        stage_assertions: [],
        handoff_assertions: [],
        final_program_lines: 0,
        total_duration_ms: Date.now() - t0,
        total_budget_ms: contract.total_budget_ms,
        notes: ["adapter threw before producing any stage output"],
      };
    }

    const totalDuration = Date.now() - t0;
    const stageAssertions = assertStages(contract, pipelineResult.stages);
    const handoffAssertions = assertHandoffs(contract, pipelineResult.stages);
    const finalLines = pipelineResult.final_program
      ? pipelineResult.final_program.split(/\r?\n/).filter((l) => l.trim().length > 0).length
      : 0;

    const stageFail = stageAssertions.some((a) =>
      a.verdict === "missing" || a.verdict === "out_of_order" || a.verdict === "empty_payload",
    );
    const stageWarn = stageAssertions.some((a) => a.verdict === "over_budget");
    const handoffFail = handoffAssertions.some((a) =>
      a.verdict === "missing_handoff" || a.verdict === "not_propagated",
    );
    const overBudgetTotal = totalDuration > contract.total_budget_ms;
    const emptyProgram = finalLines === 0;

    const notes: string[] = [];
    if (overBudgetTotal) notes.push(`total_duration ${totalDuration}ms > budget ${contract.total_budget_ms}ms`);
    if (emptyProgram) notes.push("final_program is empty (S5 violation)");
    if (pipelineResult.error) notes.push(`pipeline reported error: ${pipelineResult.error}`);

    let verdict: DomainRunVerdict;
    if (stageFail || handoffFail || emptyProgram || pipelineResult.error) {
      verdict = "fail";
    } else if (stageWarn || overBudgetTotal) {
      verdict = "warn";
    } else {
      verdict = "pass";
    }

    return {
      domain: contract.domain,
      verdict,
      pipeline_error: pipelineResult.error,
      stage_assertions: stageAssertions,
      handoff_assertions: handoffAssertions,
      final_program_lines: finalLines,
      total_duration_ms: totalDuration,
      total_budget_ms: contract.total_budget_ms,
      notes,
    };
  }

  async runAllDomains(
    runs: Array<{ contract: DomainContract; adapter: PipelineAdapter; input?: unknown }>,
  ): Promise<MultiDomainReport> {
    const t0 = Date.now();
    const reports: DomainRunReport[] = [];
    for (const r of runs) {
      reports.push(await this.runDomain(r));
    }
    const pass = reports.filter((r) => r.verdict === "pass").length;
    const warn = reports.filter((r) => r.verdict === "warn").length;
    const fail = reports.filter((r) => r.verdict === "fail").length;
    const n = reports.length;
    const passRate = n > 0 ? pass / n : 0;
    const wilsonHalfWidth = n > 0
      ? WILSON_Z_95 * Math.sqrt((passRate * (1 - passRate)) / n)
      : 1;
    const confidence = n > 0
      ? Math.min(1, Math.sqrt(n / FULL_CONFIDENCE_SAMPLE_SIZE))
      : 0;

    return {
      reports,
      total: n,
      pass,
      warn,
      fail,
      pass_rate: {
        value: Number(passRate.toFixed(4)),
        unit: "ratio",
        uncertainty: Number(wilsonHalfWidth.toFixed(4)),
        source: "pass / total; uncertainty = Wilson 95% half-width",
        confidence: Number(confidence.toFixed(4)),
      },
      duration_ms: Date.now() - t0,
      source: "DomainWizardPipelineTestEngine v1.0.0",
    };
  }
}

export const domainWizardPipelineTestEngine = new DomainWizardPipelineTestEngine();
