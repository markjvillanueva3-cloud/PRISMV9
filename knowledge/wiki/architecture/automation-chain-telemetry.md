---
name: automation-chain-telemetry
description: "ACP-MS6 cross-chain automation telemetry — per-chain fire rates, token costs, latency percentiles, downgrade frequency, override rates, session health roll-up. Pure aggregator + lazy-import producer wire + 5 prism_telemetry actions."
tier: L8
status: built
shipped_at: 2026-05-23
slot: hotel
milestone: ACP-MS6
---

# AutomationChainTelemetry — cross-chain ACP telemetry stack (2026-05-23, slot:hotel)

Closes [[ACP-MS6]] P1-U01 (collection), P1-U02 (downgrade/override), P1-U03
(session roll-up). Sits next to the existing F3 [[telemetryengine]] but
operates at the **AutomationChain** layer, not the dispatcher layer.

## Pieces

| Piece | Path | Lines |
|---|---|---|
| **AutomationChainTelemetryEngine** (pure aggregator) | `mcp-server/src/engines/AutomationChainTelemetryEngine.ts` | ~313 |
| Engine tests (35 cases) | `mcp-server/src/__tests__/AutomationChainTelemetryEngine.test.ts` | 326 |
| AutomationChainEngine producer wires (`recordTelemetryEvent`, `seedTelemetryBudgets`) | `mcp-server/src/engines/AutomationChainEngine.ts` lines 388-440 | — |
| Name-matched engine test | `mcp-server/src/__tests__/AutomationChainEngine.test.ts` | 136 |
| Dispatcher actions (5) | `mcp-server/src/tools/dispatchers/telemetryDispatcher.ts` | +57 |
| Schemas | `mcp-server/src/schemas/telemetryActionSchemas.ts` | +34 |
| Envelope | `mcp-server/data/milestones/ACP-MS6.json` (status: complete) | — |

## Wire topology

```
AutomationChainEngine.recordTelemetryEvent(...)
       │  lazy `import("./AutomationChainTelemetryEngine.js")`
       ▼                                              ┌─ chainHealth()
AutomationChainTelemetryEngine.ingest(event) ───────►│   summary()
       ▲                                              │   sessionHealth()
       │                                              │   recordChainBudget()
prism_telemetry × 5 actions ──────────────────────────┴── chainBudget seed
  • automation_chain_record
  • automation_chain_record_budget
  • automation_chain_chain_health
  • automation_chain_summary
  • automation_chain_session_health

+ AutomationChainEngine.seedTelemetryBudgets()  [bootstrap registers 9 chains]
```

## Public API (per [[ACP-MS6]] unit→method mapping)

| ACP-MS6 unit | Spec capability | Method |
|---|---|---|
| P1-U01 | fire rates | `chainHealth().fires`, `summary()` |
| P1-U01 | token costs per chain | `chainHealth().token_cost_total`, `token_cost_per_fire` |
| P1-U01 | latency percentiles | `chainHealth().latency_p50_ms / p95 / p99` (R-7 over Vitter Algorithm-R 256-sample reservoir) |
| P1-U02 | downgrade frequency | `chainHealth().downgrade_rate` (failure-rate today; see contract note in `ingest()` JSDoc) |
| P1-U02 | user override rates | `chainHealth().override_rate` |
| P1-U02 | fail-closed triggers | `recent_errors[]` capped 5 × 512 chars |
| P1-U03 | per-session report | `sessionHealth()` full roll-up |
| P1-U03 | chain rankings | `sessionHealth().{best_chain_by_completion, worst_chain_by_downgrade, worst_chain_by_latency}` |
| P1-U03 | budget utilization | `sessionHealth().token_budget_utilization` (on budgeted-only chains) + `token_budget_coverage` diagnostic |

## Safety properties

- **R12 fail-loud** — every `ingest()` validation throws with labeled cause
  (chain_id length cap 256, error string cap 512, status enum, non-negative
  finite numerics).
- **Bounded memory** — reservoir = 256 latency samples × 9 chains = 2304 numbers
  max. `recent_errors` capped to 5 × 512 chars per chain.
- **Defensive copy** — every returned `ChainHealth` / `SessionAutomationHealth`
  is a fresh object; mutating it does not affect future calls.
- **Deterministic testing** — `randomFn` ctor seam lets tests inject a seeded
  PRNG; `reset()` + `startSession()` separate state drop from timestamp reset.
- **Hotel-soul (financial-invariant)** — tokens are money-adjacent. Every
  ingested event is captured (no silent drop); `token_budget_utilization`
  computes against budgeted-chain tokens only so partial budget recording
  doesn't inflate the metric.

## Per-file scrutiny pass

Arm-A (code-analyzer) PASS-with-P1s; Arm-B (reviewer) FAIL→reissued after P1s
folded. Reviewer findings folded before the test file: chain_id length cap,
error truncation, Vitter Algorithm-R citation, randomFn ctor seam,
startSession(), token_budget_coverage diagnostic, full JSDoc.

## Commits (triple peer-absorption — documented hazard)

- `def45306e9` (peer:bravo via git-add-A race) — initial 5-file ship
- `addf1e8702` (slot:hotel ✓ correctly attributed) — producer-wire methods
- `6721d8cfdd` (peer:lima via git-add-A race) — name-matched test file

Real owner: hotel slot. See [[reference_acp_ms6_closeout_2026_05_23]].

## Related

[[ACP-MS6]] · [[automation-chain]] · [[telemetryengine]] · [[prism_telemetry]] · [[reference_acp_ms6_closeout_2026_05_23]] · [[reference_h8_misattribution_2026_05_20]] · [[feedback_conflict_fork_rule]] · [[feedback_psn_definition]]
