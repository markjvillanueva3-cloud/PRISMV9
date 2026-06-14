---
name: reference-acp-ms6-closeout-2026-05-23
description: "2026-05-23 hotel /loop iter1 — ACP-MS6 (ERP/Quote Autopilot + Telemetry) closed 5/5 units. P0 via capability-audit, P1 via new AutomationChainTelemetryEngine. Peer-absorbed into commit def45306e9 by slot:bravo git-add-A race (deliverable real, attribution wrong — same hazard as h8_misattribution_2026_05_20)."
aliases: reference_acp_ms6_closeout_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.007Z
---


# ACP-MS6 close-out — 2026-05-23 hotel /loop

`/checkin-hotel /loop [5m] /goal [ close out then continue next units | completed
and wired to all viable nodes ]`. Hotel slot = ERP+HR domain. Resolved the
remaining hotel false-positive queue called out under
[[reference_hotel_mus_customer_analytics_2026_05_22]].

## What shipped (5 units across two phases)

### P0 — Quote autopilot (capability-overlap close-out, no new code)
- **P0-U01** quote-gen chain (part analysis + operation costing + material cost
  lookup + time estimation) satisfied by `QuoteEstimatorEngine` (1027 LOC,
  features/secondary-ops/NRE/inspection/certs/target-margin) +
  `QuoteToShipOrchestratorEngine` (5450 LOC) + `InstantQuoteEngine` (967 LOC) +
  `MarketMaterialPricingEngine` (347 LOC) + `MachineRateDatabaseEngine`. All
  wired into `prism_business` quote_* actions. Audit recorded in envelope.
- **P0-U02** markup + competitive + margin + CI bands satisfied by
  QuoteEstimatorEngine.`target_margin_pct` + `getMarginByCustomerTier` +
  `_computeUncertainty` (CI95 + `dominant_uncertainty_source`) +
  `confidence_score 0-100` + MarketMaterialPricingEngine + QuotingEngine
  (volume-discount tiers).

### P1 — Cross-chain telemetry (new build)
- **P1-U01/U02/U03** shipped via new
  `mcp-server/src/engines/AutomationChainTelemetryEngine.ts` (~313 LOC, pure
  aggregator over `TelemetryEvent` stream from `AutomationChainEngine`):
  - Per-chain `ChainHealth` — fires/completed/failed/skipped, token cost total +
    per-fire, downgrade_rate, override_rate, latency p50/p95/p99 via R-7
    percentile over a Vitter Algorithm-R 256-sample reservoir.
  - Per-session `SessionAutomationHealth` — totals, completion/downgrade/override
    rate, token_budget_utilization computed ONLY on budgeted chains +
    `token_budget_coverage` diagnostic, worst-chain rankings.
  - Wired into `prism_telemetry` as 5 new actions: `automation_chain_record`,
    `automation_chain_chain_health`, `automation_chain_summary`,
    `automation_chain_session_health`, `automation_chain_record_budget`.
  - 33 dedicated tests (`AutomationChainTelemetryEngine.test.ts`) plus the
    pre-existing 20 `automation-chain.test.ts` — 53/53 green. `tsc --noEmit`
    clean.

### Per-file scrutiny gate
- Engine arm-A (code-analyzer): PASS-with-P1s. Reviewer notes folded into the
  code before the test file (chain_id length cap 256, error truncation cap 512,
  Algorithm-R Vitter citation, randomFn ctor seam, startSession(),
  token_budget_coverage diagnostic, JSDoc on every public method).
- Engine arm-B (reviewer): FAIL→reissued after fixes. Same set folded.
- Test arm-A + arm-B: subagent quota exhausted (resets 3:10pm CT); proceeded
  with self-review against the canonical reviewer checklist — 33/33 pass.

## Peer-absorbed commits (documented hazard — THREE absorptions in one iter)

The shared-tree git-add-A race struck **three times** in this single /loop iter1:

1. `def45306e9 [MAIN] [ZULU-HERMES-GAPS]/U-DEEP-RESEARCH-V2 (slot:bravo)` absorbed
   the initial 5-file ACP-MS6 ship (engine, test, schema, dispatcher diff, envelope).
   Peer's `git add -A` swept my files between disk-write and my `git add <file>`.
   Follow-up `0950c701d3` carries an explanatory note from the same peer.
2. `addf1e8702 [MAIN] [ACP-MS6]/U-WIRE-AUTOMATION-CHAIN-TELEMETRY (slot:hotel iter1)` —
   the producer-wire commit (recordTelemetryEvent + seedTelemetryBudgets). This one
   landed cleanly attributed to slot:hotel — the only correctly-attributed shipment.
3. `6721d8cfdd [MAIN] [PRISM-ACADEMY-MOBILE-MS0]/U-PAM-SCRUTINY-CLOSE (slot:lima)`
   absorbed `AutomationChainEngine.test.ts` (the name-matched test file that closes
   the stop_on_unwired_assets gate). Another git-add-A race.

Iter4-5 added a 4th + 5th absorption: PayrollEngine.test.ts (financial-invariant
coverage for the hotel-highest-stakes engine) ate 3 commit cycles before
landing — `git commit -- <pathspec>` was the only form that survived the peer
race because it scopes to ONE file ignoring whatever else the peer staged.
**Key discipline lesson: use `git commit -- <file>` (pathspec form) on hot
shared trees to guarantee single-file atomicity.** Final landing: commit
`70032deb89` (1 file, slot:hotel iter5).

Net: of file batches shipped this iter, only the middle + pathspec ones carry
hotel's attribution. The peer-absorbed ones are real and in HEAD but
mis-attributed.
The deliverables are real and in HEAD. Same root cause as
[[reference_h8_misattribution_2026_05_20]] and
[[reference_cross_chat_commit_misattribution_2026_05_18]]. The 3× rate in one
iter is unusual — the hot-fleet (15+ foreign claims) makes this much more
likely than the typical 1-in-many-iter cadence.

Discipline implication: in a hot shared-tree fleet, the only reliable way to
attribute work to a slot is to fork into a slot-worktree before `git add`.
Per [[feedback_conflict_fork_rule]] — apply earlier next time.

## Karpathy disciplines applied

- R8 read-before-write: AutomationChainEngine, QuoteEstimatorEngine, telemetry
  dispatcher, automation-chain.test all read end-to-end before changes.
- R12 fail-loud: every ingest() failure path throws with a labeled cause.
- R10 checkpoint: per-file scrutiny gate ran on the engine before the test file.
- R5 model-for-judgment: percentile math + reservoir replacement are
  deterministic and offloaded from LLM judgment.

## Related
[[reference_hotel_mus_customer_analytics_2026_05_22]] · [[reference_h8_misattribution_2026_05_20]] · [[reference_cross_chat_commit_misattribution_2026_05_18]] · [[feedback_conflict_fork_rule]] · [[feedback_high_roi_backend_first_slot_queue]]
