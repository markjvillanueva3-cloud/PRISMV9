---
title: QUOTING-SYNERGY-MS0/U-QP-CLOSED-LOOP-OUTCOME-TELEMETRY
type: architecture
domain: quoting
slot: charlie
created: 2026-06-11
provenance_commit: edb4986a50
tests: 80/80
scrutiny: 3-of-3 PASS
---

# Quoting closed-loop full-distribution outcome telemetry (`feedOutcome`)

## Problem
`QuotingClosedLoopEngine.runCycle` is the quoting OODA controller (observe → measure → detect-drift → retrain → validate → promote/rollback → telemeter). Its only learning emission was `feedPSIDelta`, which fires **PROMOTED-only** — feeding the applied MAPE improvement back to the PSN. But the loop's *non-promotion* verdicts carry just as much signal: a high `WITHHELD_SYNTHETIC` rate means the training data is synthetic (a provenance problem); a high `ROLLED_BACK` rate means drift the calibration cannot fix; a steady `NO_DRIFT_NO_OP` means the model is healthy. None of that reached the PSN.

## Design
Strictly additive, zero-risk:

- New optional dep `feedOutcome?: (signal: CycleOutcomeSignal) => Promise<void>` on `ClosedLoopDeps`.
- The original `runCycle` body → `private static async computeCycle`. A new thin `static async runCycle(deps, options?)` wrapper (signature unchanged) calls `computeCycle`, then fires `feedOutcome(toOutcomeSignal(result))` inside a `try/catch`.
- **Fail-soft invariant:** the wrapper is strictly POST-compute; a thrown `feedOutcome` is swallowed (`log.warn` with `cycle_id` + `error`) and can NEVER alter a verdict, gate, or safety decision. Telemetry observes, never gates (R12 + charlie soul).
- `toOutcomeSignal(result)` — pure, total projection: `{ cycle_id, verdict, drift_detected, mape_delta, applied, provenance }`. `mape_delta = before.mape − after.mape`, null unless both accuracy reports exist; `applied` true ONLY for PROMOTED.

```
CycleOutcomeSignal {
  cycle_id: string
  verdict: PROMOTED | NO_DRIFT_NO_OP | ROLLED_BACK | WITHHELD_SYNTHETIC | INSUFFICIENT_DATA | STAGE_FAILED
  drift_detected: boolean
  mape_delta: number | null   // before − after; null if no after-accuracy
  applied: boolean            // true ONLY for PROMOTED
  provenance: real | synthetic | empty | error | null
}
```

## Wiring
`QuotingClosedLoopRunnerEngine.buildLiveDeps` wires `feedOutcome` to a JSONL ledger:
- `DEFAULT_OUTCOME_LEDGER_PATH = state/shared/quoting/quoting-cycle-outcomes.jsonl` (overridable via `outcomeLedgerPath`).
- Each call appends one line `{...signal, fed_at: <ISO>}`, `mkdir -p` first, `fs.appendFile` (append-only, single short line = safe under concurrent cycles).
- `feedPSIDelta` remains the PROMOTED-only applied-improvement channel (PSN `QuoteOutcomeFeedEngine`); `feedOutcome` is the full-distribution channel.

## Tests / evidence
+18 tests (engine 56 + runner 24 = 80/80 PASS), tsc clean. 3-of-3 scrutiny PASS:
- Arm A (holistic): `runCycle`→`computeCycle` rename byte-identical, no dropped logic; fail-soft never alters verdict; `toOutcomeSignal` pure+total.
- Arm B (test integrity): concrete assertions only; the fail-soft test genuinely fails if the wrapper lets the throw escape; append-not-truncate proven with ordering + null round-trip; 6→7 dep members.
- Arm C (analyst): no `.runCycle(` caller broke (signature preserved, `computeCycle` private); fires exactly once incl STAGE_FAILED; I/O append-only safe; fail-soft is intended not silent data loss (the active-factor write is a separate independently-handled channel).

## Deferred (follow-ups)
- **P2** ledger rotation — unbounded JSONL growth; mirror the `fleet-memory-history.jsonl` 512KB rotation pattern.
- **P2** telemetry-failure health surface — a persistent ledger-write failure degrades to a `log.warn` only; no fleet-visible freshness signal.
- **P3** explicit STAGE_FAILED-feeds-once test (structurally guaranteed by the unconditional wrapper, but no dedicated case).

## Provenance note
Shipped via provenance commit `edb4986a50` — the file diffs were swept into peer commit `b4bdf8f699` (slot bravo) by the shared main-tree index race; the `--allow-empty` commit records the U-ID so the close-out/audit chain isn't blind. See `feedback_no_git_stash_for_test_investigation_2026_05_21`.
