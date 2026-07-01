/**
 * PipelineIRExecutorEngine -- PIPELINE-IR-MS0 / U-PIR03 (slot:bravo).
 *
 * Executes a declarative PipelineIR: converts+validates (via PipelineIRConverterEngine),
 * walks stages in topological order, resolves each stage's params (literals + refs into
 * prior stage outputs by dotted path), evaluates an optional `condition` gate, invokes
 * `dispatcher:action`, and honors the `onError` policy (abort | continue | retry).
 *
 * The dispatcher INVOKER is INJECTED -- `execute(ir, invoke, opts)` -- so the engine is
 * pure + testable without the live MCP layer. The current dispatcher wiring
 * (prism_orchestrate:execute_ir_pipeline) injects a DRY-RUN invoker that only RECORDS
 * the {dispatcher,action,params} each stage would invoke (zero actuation); live
 * cross-dispatcher routing is governance-gated (unsafe-fleet-control) and not yet
 * wired. Tests supply a deterministic mock invoker.
 *
 * No physics, no direct I/O (all side effects go through the injected invoker).
 */
import { PipelineIRConverterEngine, type ConvertError } from "./PipelineIRConverterEngine.js";
import type { ParamSpec, PipelineStage } from "../schemas/PipelineIR.js";

/** Routes one stage to its dispatcher:action. Returns the stage output (any shape) or throws. */
export type StageInvoker = (
  dispatcher: string,
  action: string,
  params: Record<string, unknown>,
) => Promise<unknown> | unknown;

export interface StageOutcome {
  stage: string;
  status: "ok" | "skipped" | "failed";
  attempts: number;
  output?: unknown;
  error?: string;
}

export type ExecuteResult =
  | { ok: false; phase: "convert"; convertErrors: ConvertError[] }
  | {
      ok: boolean;
      phase: "run";
      outputs: Record<string, unknown>;
      outcomes: StageOutcome[];
      executed: string[];
      skipped: string[];
      failed: string[];
    };

/** Resolve a dotted path (e.g. "result.value", "features.0") into a value; undefined if any hop is missing. */
export function resolvePath(obj: unknown, path?: string): unknown {
  if (path === undefined) return obj;
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/** Resolve a single ParamSpec to a concrete value against the accumulated stage outputs. */
function resolveParam(ps: ParamSpec, outputs: Record<string, unknown>): unknown {
  if ("value" in ps) return ps.value;
  // ref: pull the producing stage's output, then the optional dotted path into it.
  const base = outputs[ps.ref.stage];
  return resolvePath(base, ps.ref.path);
}

function resolveParams(stage: PipelineStage, outputs: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(stage.params ?? {})) out[k] = resolveParam(stage.params[k], outputs);
  return out;
}

/** A condition is truthy unless it resolves to false/null/undefined/0/"". */
function conditionPasses(stage: PipelineStage, outputs: Record<string, unknown>): boolean {
  if (!stage.condition) return true;
  return Boolean(resolveParam(stage.condition, outputs));
}

export class PipelineIRExecutorEngine {
  /**
   * Execute an IR pipeline.
   * @param raw     a PipelineIR (validated internally by the converter)
   * @param invoke  routes dispatcher:action -> output (injected; the side-effect boundary)
   * @returns convert-phase failure (bad graph) OR a run report with per-stage outcomes.
   */
  static async execute(raw: unknown, invoke: StageInvoker): Promise<ExecuteResult> {
    const conv = PipelineIRConverterEngine.convert(raw);
    if (!conv.ok) return { ok: false, phase: "convert", convertErrors: conv.errors };

    const stageById = new Map(conv.ir.stages.map((s) => [s.id, s]));
    const outputs: Record<string, unknown> = {};
    const outcomes: StageOutcome[] = [];
    const executed: string[] = [];
    const skipped: string[] = [];
    const failed: string[] = [];
    let aborted = false;

    for (const id of conv.order) {
      const stage = stageById.get(id)!;
      if (aborted) { skipped.push(id); outcomes.push({ stage: id, status: "skipped", attempts: 0 }); continue; }

      if (!conditionPasses(stage, outputs)) {
        skipped.push(id);
        outcomes.push({ stage: id, status: "skipped", attempts: 0 });
        continue;
      }

      const params = resolveParams(stage, outputs);
      const maxAttempts = stage.onError === "retry" ? stage.retries + 1 : 1;
      let attempts = 0;
      let lastErr: unknown;
      let succeeded = false;
      while (attempts < maxAttempts) {
        attempts++;
        try {
          const result = await invoke(stage.dispatcher, stage.action, params);
          outputs[id] = result;
          executed.push(id);
          outcomes.push({ stage: id, status: "ok", attempts, output: result });
          succeeded = true;
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!succeeded) {
        failed.push(id);
        outcomes.push({ stage: id, status: "failed", attempts, error: lastErr instanceof Error ? lastErr.message : String(lastErr) });
        // abort + retry-exhausted both stop the run; continue proceeds to the next stage.
        if (stage.onError !== "continue") aborted = true;
      }
    }

    return { ok: failed.length === 0, phase: "run", outputs, outcomes, executed, skipped, failed };
  }
}

export const pipelineIRExecutorEngine = PipelineIRExecutorEngine;
