/**
 * pipelineOutcomeEmit.ts -- CLOSE-THE-LOOPS-MS0 (slot:india, 2026-06-29)
 *
 * One shared, fire-and-forget helper so generation pipelines that previously
 * generated-but-never-learned (setup-sheet, traveler, Fusion bridge, document
 * router) emit a DATA/provenance outcome record into the OutcomeTrace bus -> the
 * (s,a,r,s') experience ledger + MLLineage edges -> LoRA/GNN learning signal.
 *
 * Why a helper, not 4 inline copies (R15 build-once): the real
 * `RecordOutcomeTraceInputSchema` (policyExperienceSchema.ts) is non-trivial --
 * reward_components need an `objective` enum + `raw_value` + `sign_convention`
 * (NOT {name,value,weight}); action_record needs `engine_name` + numeric
 * `adapted`; state is a StateRef. Centralizing it means one tested surface
 * instead of four chances to build an invalid record.
 *
 * R12 INVARIANT: this emits deterministic DATA/provenance ONLY -- never NN
 * inference. It is a sidecar OFF the generation critical path: every call is
 * wrapped so a malformed payload or a ledger I/O failure can NEVER throw back
 * into the pipeline that called it (a setup sheet must still render even if the
 * learning bus is down).
 */
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { outcomeTraceEngine } from "./OutcomeTraceEngine.js";
import { OutcomeDomain } from "../schemas/outcomeEventSchema.js";
import type { RewardObjectiveT } from "../schemas/policyExperienceSchema.js";

export type OutcomeDomainValue = z.infer<typeof OutcomeDomain>;

export interface PipelineOutcomeEmitInput {
  /** Outcome domain -- one of the OutcomeDomain enum values. */
  domain: OutcomeDomainValue;
  /** The emitting engine's class name (action_record.engine_name). */
  engineName: string;
  /** Free-string outcome event id (e.g. "setup_sheet_generated"). */
  outcomeEventId: string;
  /** Optional stable prediction id (pair predicted<->actual later); default random. */
  predictionId?: string;
  /** Optional stable lineage id; default random. */
  lineageId?: string;
  /** Inline state features (stringly typed). */
  inline?: Record<string, unknown>;
  /** Structured state context (material/operation/machine/customer/tool_id...). */
  context?: Record<string, unknown>;
  /** Numeric action outputs (action_record.adapted) -- numbers only. */
  adapted?: Record<string, number>;
  /** Reward component. Default: a neutral "other" maximize signal of value 1. */
  reward?: {
    objective: RewardObjectiveT;
    raw_value: number;
    sign_convention: "maximize" | "minimize";
    weight?: number;
    raw_unit?: string;
  };
  /** Arbitrary provenance metadata. */
  metadata?: Record<string, unknown>;
}

export interface PipelineOutcomeEmitResult {
  emitted: boolean;
  experience_id?: string;
  reason?: string;
}

/**
 * Fire-and-forget emit of a DATA outcome record. NEVER throws.
 * Returns {emitted:true, experience_id} on success, {emitted:false, reason} otherwise.
 */
export function emitPipelineOutcome(o: PipelineOutcomeEmitInput): PipelineOutcomeEmitResult {
  try {
    const state: Record<string, unknown> = {};
    if (o.inline && Object.keys(o.inline).length > 0) state.inline = o.inline;
    if (o.context && Object.keys(o.context).length > 0) state.context = o.context;
    if (!state.inline && !state.context) state.inline = {}; // StateRef allows an empty inline dict

    const res = outcomeTraceEngine.record({
      lineage_id: o.lineageId ?? randomUUID(),
      domain: o.domain,
      prediction_id: o.predictionId ?? randomUUID(),
      outcome_event_id: o.outcomeEventId,
      state,
      action_record: {
        engine_name: o.engineName,
        baseline: {},
        adapted: o.adapted ?? {},
      },
      reward_components: [
        o.reward
          ? { weight: 1, ...o.reward }
          : { objective: "other", raw_value: 1, sign_convention: "maximize", weight: 1 },
      ],
      metadata: o.metadata,
    });

    return res.ok
      ? { emitted: true, experience_id: res.experience_id }
      : { emitted: false, reason: res.warnings.join("; ") || "record returned not-ok" };
  } catch (err) {
    // DATA sidecar off the critical path -- swallow, never rethrow into the pipeline.
    return { emitted: false, reason: `emit threw: ${(err as Error)?.message ?? String(err)}` };
  }
}
