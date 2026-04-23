/**
 * OutcomeTraceEngine — U-LEARN-09
 * ================================
 *
 * Convenience layer that, given a prediction + observed outcome, both:
 *   1. Appends a (s, a, r, s') experience tuple to PolicyExperienceLedger.
 *   2. Writes the corresponding MLLineage edges linking prediction ↔ outcome
 *      ↔ model_checkpoint, so traceback / traceforward queries work later.
 *
 * This is the "one-call" API callers will actually use when closing a job.
 * Without it, callers would have to coordinate three engines (PolicyLedger +
 * MLLineage + OutcomeCaptureBus) for every recorded outcome — which is
 * exactly the coupling the Utilization Architect scrutiny flagged.
 *
 * @module engines/OutcomeTraceEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-09
 */

import {
  RecordOutcomeTraceInputSchema,
  type RecordOutcomeTraceInput,
} from "../schemas/policyExperienceSchema.js";
import {
  policyExperienceLedgerEngine,
  PolicyExperienceLedgerEngine,
  type AppendResult,
} from "./PolicyExperienceLedgerEngine.js";
import {
  mlLineageEngine,
  MLLineageEngine,
} from "./MLLineageEngine.js";

export interface RecordTraceResult {
  ok: boolean;
  experience_id: string;
  reward_total: number;
  edges_created: string[];
  warnings: string[];
}

export class OutcomeTraceEngine {
  constructor(
    private readonly ledger: PolicyExperienceLedgerEngine = policyExperienceLedgerEngine,
    private readonly lineage: MLLineageEngine = mlLineageEngine,
  ) {}

  /**
   * Record an observed outcome for a prediction. One call performs:
   *   (a) append experience tuple to PolicyExperienceLedger
   *   (b) link(prediction → outcome_event) relation=validated_by
   *   (c) if model_checkpoint_id: link(prediction → model_checkpoint) relation=produced_by
   *
   * Any individual step failure is captured in `warnings[]` but never
   * thrown — partial progress is better than silent failure for
   * downstream IQL / calibration consumers.
   */
  record(input: RecordOutcomeTraceInput): RecordTraceResult {
    const parsed = RecordOutcomeTraceInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        experience_id: "",
        reward_total: 0,
        edges_created: [],
        warnings: [`schema validation failed: ${parsed.error.message}`],
      };
    }
    const data = parsed.data;
    const warnings: string[] = [];
    const edgesCreated: string[] = [];

    // (a) experience tuple
    const tupleRes: AppendResult = this.ledger.append({
      lineage_id: data.lineage_id,
      domain: data.domain,
      state: data.state,
      action_record: data.action_record,
      reward_components: data.reward_components,
      next_state: data.next_state,
      terminal: data.terminal,
      metadata: {
        ...(data.metadata ?? {}),
        prediction_id: data.prediction_id,
        outcome_event_id: data.outcome_event_id,
        model_checkpoint_id: data.model_checkpoint_id,
      },
    });
    if (!tupleRes.ok) warnings.push(`experience append failed: ${tupleRes.warning}`);

    // (b) prediction → outcome_event  (validated_by)
    const edgeOutcome = this.lineage.link({
      from: { kind: "prediction", id: data.prediction_id },
      to: { kind: "outcome_event", id: data.outcome_event_id },
      relation: "validated_by",
      lineage_id: data.lineage_id,
      metadata: { reward_total: tupleRes.reward_total },
    });
    if (edgeOutcome.ok) edgesCreated.push(edgeOutcome.edge_id);
    else warnings.push(`validated_by edge failed: ${edgeOutcome.warning}`);

    // (c) prediction → model_checkpoint  (produced_by) — only if caller supplied
    if (data.model_checkpoint_id) {
      const edgeModel = this.lineage.link({
        from: { kind: "prediction", id: data.prediction_id },
        to: { kind: "model_checkpoint", id: data.model_checkpoint_id },
        relation: "produced_by",
        lineage_id: data.lineage_id,
      });
      if (edgeModel.ok) edgesCreated.push(edgeModel.edge_id);
      else warnings.push(`produced_by edge failed: ${edgeModel.warning}`);
    }

    return {
      ok: tupleRes.ok && warnings.length === 0,
      experience_id: tupleRes.experience_id,
      reward_total: tupleRes.reward_total,
      edges_created: edgesCreated,
      warnings,
    };
  }

  static getSelfAwareness() {
    return {
      name: "OutcomeTraceEngine",
      version: "1.0.0",
      milestone: "PSAU P2.5-LEARN U-LEARN-09",
      capabilities: ["record"],
      dependencies: ["PolicyExperienceLedgerEngine", "MLLineageEngine"],
      dataSourcesUsed: ["state/policy/experience.jsonl", "state/lineage/edges.jsonl"],
    };
  }
}

export const outcomeTraceEngine = new OutcomeTraceEngine();
