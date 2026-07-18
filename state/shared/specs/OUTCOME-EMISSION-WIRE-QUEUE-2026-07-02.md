# Closed-Loop Outcome Backbone — VERIFIED STATE MAP (slot:india, 2026-07-02)

> **CORRECTION BANNER (R12/R8):** an earlier draft of this file (same session, uncommitted) claimed the
> outcome backbone was "STARVED / zero domain producers / dormant." **That was WRONG** — a shallow-grep
> artifact (I grepped only `OutcomePublishAdapterEngine.publish*` and missed the `publishOutcomeToFeedbackBus`
> path the mill/lathe/wedm/coordinator engines actually use). Reading the producers + the topic constants +
> the subscriber set in-code corrected it. This file now records the VERIFIED state. Lesson: never claim
> producer/consumer absence from a single-symbol grep — map producers → topic → subscribers.

## One-line truth
The closed-loop outcome→NN-training backbone is **BUILT and LIVE in-memory** (auto-fired at boot). The
**only genuine gap is durable persistence** — outcomes train the in-process net but do not accumulate a
cross-session corpus for GNN-refpool / LoRA. That switch is **operator-gated**.

## Verified architecture (all file:line read in-code 2026-07-02)

**Single convergence topic:** `feedbackBusEngine` topic string `"outcome.recorded"` (+ `"outcome.completed"`).
Multiple differently-NAMED constants all resolve to the SAME string:
- `domainAGIAdapterKit.ts:89` `ORCHESTRATE_OUTCOME_TOPIC = "outcome.recorded"`
- `FullSystemAICoordinatorEngine.ts:99` `COORDINATOR_OUTCOME_TOPIC = "outcome.recorded"`
- `MTConnectToOutcomeBridgeEngine.ts:78` `SHOPFLOOR_OUTCOME_TOPIC = "outcome.recorded"`
- `CrossProcessOutcomeStore.record()` publishes `"outcome.recorded"` (adapter path)

**Producers — WIRED (emit on their terminal path):**
| Galaxy | Engine:line | Emit call |
|--------|-------------|-----------|
| mill | `MillingAGIMasterEngine.ts:810` | `publishOutcome(event)` → `publishOutcomeToFeedbackBus` |
| lathe | `LatheAGIKnowledgeUnificationEngine.ts:1028`, `LathePrintProgramEmitterEngine.ts:781` | `publishOutcomeToFeedbackBus` |
| wedm | `WireEDMAGIOrchestrator.ts:1490` | `publishOutcome(event)` |
| coordinator | `FullSystemAICoordinatorEngine.ts:257/413` | `feedbackBusEngine.publish("outcome.recorded", …)` |
| quoting | `QuotingOutcomeCaptureWireEngine.ts` (charlie `ad80b50d24`, 2026-06-27) | producer wire |
| CAM | `CAMOutcomeCaptureWireEngine.ts` | producer wire |
| shop-floor | `MTConnectToOutcomeBridgeEngine.ts` | MTConnect → outcome.recorded |
| (canonical, newer) | `OutcomePublishAdapterEngine.ts` — Zod-validated, dispatcher-wired `prism_ai:xproc_outcome_publish*` | **0 domain callers** (redundant w/ the kit path above — mild convention split, NOT a gap) |

**Consumers — SUBSCRIBED:**
- `CrossProcessNeuralLearningEngine.ts:1446` — `subscribe("outcome.recorded")`, buffers, and `this.train(batch)`
  every `threshold` (default 16) records. Real online learning (+ experience-replay + EWC). **Auto-fired at
  boot:** `mcp-server/src/index.ts:482` (default-on, `PRISM_XPROC_AUTOFIRE`).
- 8 bridges: `OutcomeEpisodicMemoryBridge`, `OutcomeDriftCalibrationBridge`, `TribalKnowledgeOutcomeBridge`,
  `ConformalCalibrationMonitor`, `ConformalPredictionLog`, `OutcomeRLBridge` (`outcome.completed`),
  `OutcomeReplayBufferBridge`, `OutcomeFeedbackOverrideStore`.
- `XprocOutcomeLedgerDurability.ts:204-205` — subscribes `outcome.recorded`/`outcome.completed` → persists to
  `mcp-server/data/state/xproc-outcome-ledger.jsonl` **iff `PRISM_XPROC_LEDGER_DURABLE=1`**.

## THE gap (verified 2026-07-02)
- `PRISM_XPROC_LEDGER_DURABLE` is **unset** in every settings.json (C:, H:, project).
- `mcp-server/data/state/xproc-outcome-ledger.jsonl` **does not exist** — durable persistence has never fired.
- ⇒ Live in-process training works, but on process restart the accumulated outcome signal is **lost**; no
  growing on-disk corpus exists to feed the cross-session GNN ref-pool or LoRA datasets (the documented
  full-coverage deploy-gate lever). The loop is **live-but-amnesiac**.

## Recommended units (dependency order — R13)
1. **(OPERATOR decision) enable durable persistence** — set `PRISM_XPROC_LEDGER_DURABLE=1` in server env.
   Doctrine (`XprocOutcomeLedgerDurability.ts:19-23`) reserves this as an operator call (fleet-wide disk-write
   behavior). Low-risk + reversible (delete the jsonl / unset). This is the single highest-leverage india lever
   that is NOT GPU-gated. **Do not flip unilaterally — surface for operator sign-off.**
2. **(india, BLOCKED on #1)** `U-OEW-CONSUMER`: ingest `xproc-outcome-ledger.jsonl` → GNN ref-pool + LoRA
   dataset, filtered to real manufacturing outcomes (`request_summary` + `actual_metrics`, `outcome_kind` set).
   R13: do NOT build over an empty ledger — gated on #1 producing data.
3. **(optional, low-pri) convention unify** — migrate the AGI-kit producers to route through the Zod-validated
   `OutcomePublishAdapterEngine` (input validation at the publish boundary) instead of raw
   `publishOutcomeToFeedbackBus`. Cosmetic robustness, not a correctness gap; clone-not-fork per galaxy.

## Not gaps (do NOT "fix")
- `outcome-bus.jsonl` monoculture — that is the SEPARATE dev-telemetry shell bus (auto-tap hook), by design a
  tool-use log, NOT the manufacturing-outcome ledger. Its `outcome-bus-diversity-audit.mjs` gate is correct
  for what it measures; it is unrelated to training-signal coverage.
- "Zero producers" — FALSE (see producer table). The producers are wired; the adapter is merely redundant.
