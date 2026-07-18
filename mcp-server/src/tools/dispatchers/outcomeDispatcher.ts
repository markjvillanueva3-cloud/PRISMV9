/**
 * outcomeDispatcher.ts — prism_outcome MCP dispatcher
 * =====================================================
 *
 * Exposes PRISM's closed-loop learning backbone as a single coherent
 * MCP tool surface. Wires all 9 previously-dormant Outcome engines:
 *
 *   capture_bus_record          → OutcomeCaptureBusEngine.record()
 *   capture_bus_query           → OutcomeCaptureBusEngine.query()
 *   capture_bus_stats           → OutcomeCaptureBusEngine.stats()
 *   capture_bus_flush           → OutcomeCaptureBusEngine.flushRetryQueue()
 *   outcome_log                 → OutcomeTrackingEngine.log()
 *   outcome_query               → OutcomeTrackingEngine.query()
 *   outcome_for_program         → OutcomeTrackingEngine.forProgram()
 *   outcome_stats               → OutcomeTrackingEngine.stats()
 *   outcome_trace_record        → OutcomeTraceEngine.record()
 *   outcome_publish             → OutcomePublishAdapterEngine.publish()
 *   outcome_publish_with_actuals→ OutcomePublishAdapterEngine.publishWithActuals()
 *   outcome_publish_failure     → OutcomePublishAdapterEngine.publishFailure()
 *   outcome_publish_override    → OutcomePublishAdapterEngine.publishOverride()
 *   outcome_update              → OutcomePublishAdapterEngine.updateOutcome()
 *   outcome_adapter_stats       → OutcomePublishAdapterEngine.stats()
 *   replay_subscribe            → OutcomeReplayBufferBridgeEngine.subscribeToOutcomes()
 *   replay_unsubscribe          → OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes()
 *   replay_status               → OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes()
 *   replay_configure            → OutcomeReplayBufferBridgeEngine.configure()
 *   replay_stats                → OutcomeReplayBufferBridgeEngine.stats()
 *   replay_sample_stratified    → OutcomeReplayBufferBridgeEngine.sampleStratified()
 *   replay_sample_prioritized   → OutcomeReplayBufferBridgeEngine.samplePrioritized()
 *   rl_bridge_subscribe         → OutcomeRLBridgeEngine.subscribeToOutcomes()
 *   rl_bridge_unsubscribe       → OutcomeRLBridgeEngine.unsubscribeFromOutcomes()
 *   rl_bridge_status            → OutcomeRLBridgeEngine.isSubscribedToOutcomes()
 *   rl_bridge_configure         → OutcomeRLBridgeEngine.configure()
 *   rl_bridge_stats             → OutcomeRLBridgeEngine.stats()
 *   rl_bridge_constants         → OutcomeRLBridgeEngine.constants()
 *   rl_bridge_replay            → OutcomeRLBridgeEngine.replayFromStore()
 *   rl_bridge_reset             → OutcomeRLBridgeEngine.reset()
 *   drift_subscribe             → OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes()
 *   drift_unsubscribe           → OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes()
 *   drift_status                → OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes()
 *   drift_configure             → OutcomeDriftCalibrationBridgeEngine.configure()
 *   drift_stats                 → OutcomeDriftCalibrationBridgeEngine.stats()
 *   episodic_subscribe          → OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes()
 *   episodic_unsubscribe        → OutcomeEpisodicMemoryBridgeEngine.unsubscribeFromOutcomes()
 *   episodic_status             → OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes()
 *   episodic_configure          → OutcomeEpisodicMemoryBridgeEngine.configure()
 *   episodic_stats              → OutcomeEpisodicMemoryBridgeEngine.stats()
 *   feedback_thumbs_up          -> FeedbackCollectorEngine.thumbsUp()
 *   feedback_thumbs_down        -> FeedbackCollectorEngine.thumbsDown()
 *   feedback_adjusted           -> FeedbackCollectorEngine.adjusted()
 *   feedback_aborted            -> FeedbackCollectorEngine.aborted()
 *   feedback_record_loose       -> FeedbackCollectorEngine.recordLoose()
 *   feedback_needs_attention    -> FeedbackCollectorEngine.programsNeedingAttention()
 *
 * Cross-wire note: outcome_trace_record, outcome_log, outcome_query, outcome_stats
 * are also handled as pass-throughs in aiReasoningDispatcher so callers already
 * using prism_ai don't need to migrate (§ENGINE WIRING — WIRE TO ALL SOURCES).
 *
 * @module tools/dispatchers/outcomeDispatcher
 * @milestone PSN-SYNERGY / OUTCOME-WIRING
 */

import { z } from "zod";
import {
  OutcomeBusRecordSchema,
  OutcomeBusQuerySchema,
  OutcomeInputSchema,
  OutcomeQuerySchema,
  OutcomeForProgramSchema,
  OutcomeStatsSchema,
  RecordOutcomeTraceInputSchema,
  OutcomePublishSchema,
  OutcomePublishWithActualsSchema,
  OutcomePublishFailureSchema,
  OutcomePublishOverrideSchema,
  OutcomeUpdateSchema,
  BridgeConfigureSchema,
  ReplayBufferSampleStratifiedSchema,
  ReplayBufferSamplePrioritizedSchema,
  RLBridgeReplaySchema,
  FeedbackThumbsUpSchema,
  FeedbackThumbsDownSchema,
  FeedbackAdjustedSchema,
  FeedbackAbortedSchema,
  FeedbackRecordLooseSchema,
  EmptyInputSchema,
} from "../../schemas/outcomeActionSchemas.js";
import type { FeedbackMeta } from "../../engines/FeedbackCollectorEngine.js";
import type { OutcomeInput } from "../../engines/OutcomeTrackingEngine.js";

// ─── Action enum (alphabetically sorted within logical groups) ────────────────

const CAPTURE_BUS_ACTIONS = [
  "capture_bus_flush",
  "capture_bus_query",
  "capture_bus_record",
  "capture_bus_stats",
] as const;

const TRACKING_ACTIONS = [
  "outcome_for_program",
  "outcome_log",
  "outcome_query",
  "outcome_stats",
] as const;

const TRACE_ACTIONS = ["outcome_trace_record"] as const;

const PUBLISH_ACTIONS = [
  "outcome_adapter_stats",
  "outcome_publish",
  "outcome_publish_failure",
  "outcome_publish_override",
  "outcome_publish_with_actuals",
  "outcome_update",
] as const;

const REPLAY_ACTIONS = [
  "replay_configure",
  "replay_sample_prioritized",
  "replay_sample_stratified",
  "replay_stats",
  "replay_status",
  "replay_subscribe",
  "replay_unsubscribe",
] as const;

const RL_BRIDGE_ACTIONS = [
  "rl_bridge_configure",
  "rl_bridge_constants",
  "rl_bridge_replay",
  "rl_bridge_reset",
  "rl_bridge_stats",
  "rl_bridge_status",
  "rl_bridge_subscribe",
  "rl_bridge_unsubscribe",
] as const;

const DRIFT_ACTIONS = [
  "drift_configure",
  "drift_stats",
  "drift_status",
  "drift_subscribe",
  "drift_unsubscribe",
] as const;

const EPISODIC_ACTIONS = [
  "episodic_configure",
  "episodic_stats",
  "episodic_status",
  "episodic_subscribe",
  "episodic_unsubscribe",
] as const;

// FeedbackCollector: operator-facing front door over OutcomeTracking (slot:papa).
const FEEDBACK_ACTIONS = [
  "feedback_aborted",
  "feedback_adjusted",
  "feedback_needs_attention",
  "feedback_record_loose",
  "feedback_thumbs_down",
  "feedback_thumbs_up",
] as const;

const ALL_ACTIONS = [
  ...CAPTURE_BUS_ACTIONS,
  ...TRACKING_ACTIONS,
  ...TRACE_ACTIONS,
  ...PUBLISH_ACTIONS,
  ...REPLAY_ACTIONS,
  ...RL_BRIDGE_ACTIONS,
  ...DRIFT_ACTIONS,
  ...EPISODIC_ACTIONS,
  ...FEEDBACK_ACTIONS,
] as const;

type OutcomeAction = (typeof ALL_ACTIONS)[number];

// ─── Input schema lookup ──────────────────────────────────────────────────────

const ACTION_SCHEMAS: Record<OutcomeAction, z.ZodTypeAny> = {
  capture_bus_record: OutcomeBusRecordSchema,
  capture_bus_query: OutcomeBusQuerySchema,
  capture_bus_stats: EmptyInputSchema,
  capture_bus_flush: EmptyInputSchema,
  outcome_log: OutcomeInputSchema,
  outcome_query: OutcomeQuerySchema,
  outcome_for_program: OutcomeForProgramSchema,
  outcome_stats: OutcomeStatsSchema,
  outcome_trace_record: RecordOutcomeTraceInputSchema,
  outcome_publish: OutcomePublishSchema,
  outcome_publish_with_actuals: OutcomePublishWithActualsSchema,
  outcome_publish_failure: OutcomePublishFailureSchema,
  outcome_publish_override: OutcomePublishOverrideSchema,
  outcome_update: OutcomeUpdateSchema,
  outcome_adapter_stats: EmptyInputSchema,
  replay_subscribe: EmptyInputSchema,
  replay_unsubscribe: EmptyInputSchema,
  replay_status: EmptyInputSchema,
  replay_configure: BridgeConfigureSchema,
  replay_stats: EmptyInputSchema,
  replay_sample_stratified: ReplayBufferSampleStratifiedSchema,
  replay_sample_prioritized: ReplayBufferSamplePrioritizedSchema,
  rl_bridge_subscribe: EmptyInputSchema,
  rl_bridge_unsubscribe: EmptyInputSchema,
  rl_bridge_status: EmptyInputSchema,
  rl_bridge_configure: BridgeConfigureSchema,
  rl_bridge_stats: EmptyInputSchema,
  rl_bridge_constants: EmptyInputSchema,
  rl_bridge_replay: RLBridgeReplaySchema,
  rl_bridge_reset: EmptyInputSchema,
  drift_subscribe: EmptyInputSchema,
  drift_unsubscribe: EmptyInputSchema,
  drift_status: EmptyInputSchema,
  drift_configure: BridgeConfigureSchema,
  drift_stats: EmptyInputSchema,
  episodic_subscribe: EmptyInputSchema,
  episodic_unsubscribe: EmptyInputSchema,
  episodic_status: EmptyInputSchema,
  episodic_configure: BridgeConfigureSchema,
  episodic_stats: EmptyInputSchema,
  feedback_thumbs_up: FeedbackThumbsUpSchema,
  feedback_thumbs_down: FeedbackThumbsDownSchema,
  feedback_adjusted: FeedbackAdjustedSchema,
  feedback_aborted: FeedbackAbortedSchema,
  feedback_record_loose: FeedbackRecordLooseSchema,
  feedback_needs_attention: EmptyInputSchema,
};

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the prism_outcome MCP tool on the server.
 * @param server — MCP server instance
 */
export function registerOutcomeDispatcher(server: any): void {
  server.tool(
    "prism_outcome",
    [
      "Outcome learning backbone dispatcher -- 46 actions across 9 engines.",
      "Covers: capture bus (record/query/stats/flush), per-program outcome tracking",
      "(log/query/stats), outcome tracing (experience tuple + MLLineage edges),",
      "outcome publish adapter (publish/update/failure/override), replay buffer",
      "(stratified + prioritized sampling), RL bridge (Q-learning/policy/bandit fan-out),",
      "drift+calibration bridge, episodic memory bridge, and operator feedback verbs",
      "(thumbs up/down, adjusted, aborted, record-loose, needs-attention).",
      "The backbone that makes PRISM's closed-loop learning actually close the loop.",
    ].join(" "),
    {
      action: z.enum(ALL_ACTIONS as unknown as [string, ...string[]]).describe(
        "Outcome engine action to invoke",
      ),
      params: z.record(z.string(), z.unknown()).optional().describe("Action-specific parameters"),
    },
    async ({
      action,
      params = {},
    }: {
      action: string;
      params?: Record<string, unknown>;
    }) => {
      // Validate params against the per-action schema before touching any engine.
      const schema = ACTION_SCHEMAS[action as OutcomeAction];
      if (schema) {
        const parsed = schema.safeParse(params);
        if (!parsed.success) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  ok: false,
                  error: "invalid_params",
                  action,
                  details: parsed.error.issues.map((i) => ({
                    path: i.path.join(".") || "(root)",
                    message: i.message,
                  })),
                }),
              },
            ],
          };
        }
      }

      let result: unknown;

      switch (action as OutcomeAction) {
        // ── Capture Bus ────────────────────────────────────────────────────
        case "capture_bus_record": {
          const { outcomeCaptureBusEngine } = await import(
            "../../engines/OutcomeCaptureBusEngine.js"
          );
          result = outcomeCaptureBusEngine.record(params as any);
          break;
        }
        case "capture_bus_query": {
          const { outcomeCaptureBusEngine } = await import(
            "../../engines/OutcomeCaptureBusEngine.js"
          );
          result = outcomeCaptureBusEngine.query(params as any);
          break;
        }
        case "capture_bus_stats": {
          const { outcomeCaptureBusEngine } = await import(
            "../../engines/OutcomeCaptureBusEngine.js"
          );
          result = { ok: true, stats: outcomeCaptureBusEngine.stats() };
          break;
        }
        case "capture_bus_flush": {
          const { outcomeCaptureBusEngine } = await import(
            "../../engines/OutcomeCaptureBusEngine.js"
          );
          result = { ok: true, ...outcomeCaptureBusEngine.flushRetryQueue() };
          break;
        }

        // ── Per-program Outcome Tracking ───────────────────────────────────
        case "outcome_log": {
          const { outcomeTrackingEngine } = await import(
            "../../engines/OutcomeTrackingEngine.js"
          );
          result = await outcomeTrackingEngine.log(params as any);
          break;
        }
        case "outcome_query": {
          const { outcomeTrackingEngine } = await import(
            "../../engines/OutcomeTrackingEngine.js"
          );
          result = { ok: true, records: await outcomeTrackingEngine.query(params as any) };
          break;
        }
        case "outcome_for_program": {
          const { outcomeTrackingEngine } = await import(
            "../../engines/OutcomeTrackingEngine.js"
          );
          const { programId } = params as { programId: string };
          result = { ok: true, records: await outcomeTrackingEngine.forProgram(programId) };
          break;
        }
        case "outcome_stats": {
          const { outcomeTrackingEngine } = await import(
            "../../engines/OutcomeTrackingEngine.js"
          );
          result = { ok: true, stats: await outcomeTrackingEngine.stats(params as any) };
          break;
        }

        // ── Outcome Trace (experience tuple + MLLineage) ───────────────────
        case "outcome_trace_record": {
          const { outcomeTraceEngine } = await import(
            "../../engines/OutcomeTraceEngine.js"
          );
          result = outcomeTraceEngine.record(params as any);
          break;
        }

        // ── Outcome Publish Adapter ────────────────────────────────────────
        case "outcome_publish": {
          const { OutcomePublishAdapterEngine } = await import(
            "../../engines/OutcomePublishAdapterEngine.js"
          );
          result = OutcomePublishAdapterEngine.publish(params);
          break;
        }
        case "outcome_publish_with_actuals": {
          const { OutcomePublishAdapterEngine } = await import(
            "../../engines/OutcomePublishAdapterEngine.js"
          );
          result = OutcomePublishAdapterEngine.publishWithActuals(params);
          break;
        }
        case "outcome_publish_failure": {
          const { OutcomePublishAdapterEngine } = await import(
            "../../engines/OutcomePublishAdapterEngine.js"
          );
          result = OutcomePublishAdapterEngine.publishFailure(params);
          break;
        }
        case "outcome_publish_override": {
          const { OutcomePublishAdapterEngine } = await import(
            "../../engines/OutcomePublishAdapterEngine.js"
          );
          result = OutcomePublishAdapterEngine.publishOverride(params);
          break;
        }
        case "outcome_update": {
          const { OutcomePublishAdapterEngine } = await import(
            "../../engines/OutcomePublishAdapterEngine.js"
          );
          result = OutcomePublishAdapterEngine.updateOutcome(params);
          break;
        }
        case "outcome_adapter_stats": {
          const { OutcomePublishAdapterEngine } = await import(
            "../../engines/OutcomePublishAdapterEngine.js"
          );
          result = { ok: true, stats: OutcomePublishAdapterEngine.stats() };
          break;
        }

        // ── Replay Buffer Bridge ───────────────────────────────────────────
        case "replay_subscribe": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = OutcomeReplayBufferBridgeEngine.subscribeToOutcomes();
          break;
        }
        case "replay_unsubscribe": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = OutcomeReplayBufferBridgeEngine.unsubscribeFromOutcomes();
          break;
        }
        case "replay_status": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = {
            ok: true,
            subscribed: OutcomeReplayBufferBridgeEngine.isSubscribedToOutcomes(),
          };
          break;
        }
        case "replay_configure": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = OutcomeReplayBufferBridgeEngine.configure(params);
          break;
        }
        case "replay_stats": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = { ok: true, stats: OutcomeReplayBufferBridgeEngine.stats() };
          break;
        }
        case "replay_sample_stratified": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = OutcomeReplayBufferBridgeEngine.sampleStratified(params);
          break;
        }
        case "replay_sample_prioritized": {
          const { OutcomeReplayBufferBridgeEngine } = await import(
            "../../engines/OutcomeReplayBufferBridgeEngine.js"
          );
          result = OutcomeReplayBufferBridgeEngine.samplePrioritized(params);
          break;
        }

        // ── RL Bridge ──────────────────────────────────────────────────────
        case "rl_bridge_subscribe": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = OutcomeRLBridgeEngine.subscribeToOutcomes();
          break;
        }
        case "rl_bridge_unsubscribe": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = OutcomeRLBridgeEngine.unsubscribeFromOutcomes();
          break;
        }
        case "rl_bridge_status": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = { ok: true, subscribed: OutcomeRLBridgeEngine.isSubscribedToOutcomes() };
          break;
        }
        case "rl_bridge_configure": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = OutcomeRLBridgeEngine.configure(params);
          break;
        }
        case "rl_bridge_stats": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = { ok: true, stats: OutcomeRLBridgeEngine.stats() };
          break;
        }
        case "rl_bridge_constants": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = { ok: true, constants: OutcomeRLBridgeEngine.constants() };
          break;
        }
        case "rl_bridge_replay": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          result = OutcomeRLBridgeEngine.replayFromStore(params);
          break;
        }
        case "rl_bridge_reset": {
          const { OutcomeRLBridgeEngine } = await import(
            "../../engines/OutcomeRLBridgeEngine.js"
          );
          OutcomeRLBridgeEngine.reset();
          result = { ok: true, reset: true };
          break;
        }

        // ── Drift + Calibration Bridge ─────────────────────────────────────
        case "drift_subscribe": {
          const { OutcomeDriftCalibrationBridgeEngine } = await import(
            "../../engines/OutcomeDriftCalibrationBridgeEngine.js"
          );
          result = OutcomeDriftCalibrationBridgeEngine.subscribeToOutcomes();
          break;
        }
        case "drift_unsubscribe": {
          const { OutcomeDriftCalibrationBridgeEngine } = await import(
            "../../engines/OutcomeDriftCalibrationBridgeEngine.js"
          );
          result = OutcomeDriftCalibrationBridgeEngine.unsubscribeFromOutcomes();
          break;
        }
        case "drift_status": {
          const { OutcomeDriftCalibrationBridgeEngine } = await import(
            "../../engines/OutcomeDriftCalibrationBridgeEngine.js"
          );
          result = {
            ok: true,
            subscribed: OutcomeDriftCalibrationBridgeEngine.isSubscribedToOutcomes(),
          };
          break;
        }
        case "drift_configure": {
          const { OutcomeDriftCalibrationBridgeEngine } = await import(
            "../../engines/OutcomeDriftCalibrationBridgeEngine.js"
          );
          result = OutcomeDriftCalibrationBridgeEngine.configure(params);
          break;
        }
        case "drift_stats": {
          const { OutcomeDriftCalibrationBridgeEngine } = await import(
            "../../engines/OutcomeDriftCalibrationBridgeEngine.js"
          );
          result = { ok: true, stats: OutcomeDriftCalibrationBridgeEngine.stats() };
          break;
        }

        // ── Episodic Memory Bridge ─────────────────────────────────────────
        case "episodic_subscribe": {
          const { OutcomeEpisodicMemoryBridgeEngine } = await import(
            "../../engines/OutcomeEpisodicMemoryBridgeEngine.js"
          );
          result = OutcomeEpisodicMemoryBridgeEngine.subscribeToOutcomes();
          break;
        }
        case "episodic_unsubscribe": {
          const { OutcomeEpisodicMemoryBridgeEngine } = await import(
            "../../engines/OutcomeEpisodicMemoryBridgeEngine.js"
          );
          result = OutcomeEpisodicMemoryBridgeEngine.unsubscribeFromOutcomes();
          break;
        }
        case "episodic_status": {
          const { OutcomeEpisodicMemoryBridgeEngine } = await import(
            "../../engines/OutcomeEpisodicMemoryBridgeEngine.js"
          );
          result = {
            ok: true,
            subscribed: OutcomeEpisodicMemoryBridgeEngine.isSubscribedToOutcomes(),
          };
          break;
        }
        case "episodic_configure": {
          const { OutcomeEpisodicMemoryBridgeEngine } = await import(
            "../../engines/OutcomeEpisodicMemoryBridgeEngine.js"
          );
          result = OutcomeEpisodicMemoryBridgeEngine.configure(params);
          break;
        }
        case "episodic_stats": {
          const { OutcomeEpisodicMemoryBridgeEngine } = await import(
            "../../engines/OutcomeEpisodicMemoryBridgeEngine.js"
          );
          result = { ok: true, stats: OutcomeEpisodicMemoryBridgeEngine.stats() };
          break;
        }

        // -- Feedback Collector (operator-facing front door over OutcomeTracking) --
        case "feedback_thumbs_up": {
          const { feedbackCollectorEngine } = await import(
            "../../engines/FeedbackCollectorEngine.js"
          );
          const { programId, meta } = params as {
            programId: string;
            meta?: FeedbackMeta;
          };
          result = await feedbackCollectorEngine.thumbsUp(programId, meta);
          break;
        }
        case "feedback_thumbs_down": {
          const { feedbackCollectorEngine } = await import(
            "../../engines/FeedbackCollectorEngine.js"
          );
          const { programId, reason, meta } = params as {
            programId: string;
            reason: string;
            meta?: FeedbackMeta;
          };
          result = await feedbackCollectorEngine.thumbsDown(programId, reason, meta);
          break;
        }
        case "feedback_adjusted": {
          const { feedbackCollectorEngine } = await import(
            "../../engines/FeedbackCollectorEngine.js"
          );
          const { programId, adjustments, meta } = params as {
            programId: string;
            adjustments?: OutcomeInput["adjustments"];
            meta?: FeedbackMeta;
          };
          result = await feedbackCollectorEngine.adjusted(programId, adjustments, meta);
          break;
        }
        case "feedback_aborted": {
          const { feedbackCollectorEngine } = await import(
            "../../engines/FeedbackCollectorEngine.js"
          );
          const { programId, reason, meta } = params as {
            programId: string;
            reason: string;
            meta?: FeedbackMeta;
          };
          result = await feedbackCollectorEngine.aborted(programId, reason, meta);
          break;
        }
        case "feedback_record_loose": {
          const { feedbackCollectorEngine } = await import(
            "../../engines/FeedbackCollectorEngine.js"
          );
          const { programId, loose, meta } = params as {
            programId: string;
            loose: string;
            meta?: FeedbackMeta;
          };
          result = await feedbackCollectorEngine.recordLoose(programId, loose, meta);
          break;
        }
        case "feedback_needs_attention": {
          const { feedbackCollectorEngine } = await import(
            "../../engines/FeedbackCollectorEngine.js"
          );
          result = {
            ok: true,
            programs: await feedbackCollectorEngine.programsNeedingAttention(),
          };
          break;
        }

        default: {
          // TypeScript exhaustiveness: this branch is unreachable at runtime
          // because the z.enum guard above already rejects unknown actions.
          result = { ok: false, error: "unknown_action", action };
        }
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    },
  );
}
