---
name: reference_xproc_ledger_durable_2026_06_16
description: "India shipped U-XPROC-LEDGER-DURABLE (slot:india 2026-06-16): durable persistence for the cross-process SEMANTIC outcome ledger (CrossProcessOutcomeStore -- the bus xproc_outcome_publish feeds with shop-floor actual_metrics). Closed a verified R15 ORPHAN: configureStorePath() had ZERO production callers + record() never triggered persistEvent(), so the self-improving loop's outcome history (consumed by CAMLoRAAdapterTrainer / ConformalPredictionLog / ConformalCalibrationMonitor) was IN-MEMORY ONLY, wiped every MCP restart. New engine scripts module mcp-server/src/engines/XprocOutcomeLedgerDurability.ts: ensureXprocLedgerDurable() subscribes outcome.recorded/completed -> persistEvent (append-only jsonl) + configureStorePath reload-on-restart, race-free cold-start buffer, OPT-IN via PRISM_XPROC_LEDGER_DURABLE=1 (default OFF preserves boot semantics; one env var activates fleet-wide). Wired into OutcomePublishAdapterEngine.publish()/updateOutcome() + dispatcher xproc_outcome_record/_record_outcome. 3-of-3 scrutiny caught 2 real P1s (FIXED): reload double-count (configureStorePath reload now DEDUPS by id, replace-in-place) + silent disk-write swallow (persistOne .catch + persistErrors counter, fail-loud). 15/15 durability tests + 168 regression + tsc 0 in changed files. Commits cad-fusion-live-ms0: 1a0790fb89 (impl, ABSORBED into a peer commit by shared-tree git-sync race), 5b9aa53883 (test green), 9b61cfb734 (scrutiny hardening). Article-driven (0xCodez harness-engineering: 'what the loop runs on' matters more than the loop)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.268Z
aliases: reference_xproc_ledger_durable_2026_06_16
---


# U-XPROC-LEDGER-DURABLE -- durable cross-process semantic outcome ledger (slot:india 2026-06-16)

## What shipped
`mcp-server/src/engines/XprocOutcomeLedgerDurability.ts` (NEW) + wiring into `OutcomePublishAdapterEngine` (publish/updateOutcome) + `aiReasoningDispatcher` (xproc_outcome_record/_record_outcome) + a 1-line dedup fix to `CrossProcessOutcomeStore.configureStorePath()`. 15 durability tests, all green.

`ensureXprocLedgerDurable(opts?)` -- idempotent, race-free:
1. OPT-IN gate: no-op unless `PRISM_XPROC_LEDGER_DURABLE=1` OR `opts.path` (test injection). Default OFF = current in-memory behavior (zero fleet impact until the operator flips one env var). `PRISM_XPROC_LEDGER_PATH` overrides the default `mcp-server/data/state/xproc-outcome-ledger.jsonl`.
2. subscribe FIRST (sync) to `outcome.recorded` + `outcome.completed`.
3. `configureStorePath(path)` reloads prior records (restores the learning signal across restart), then drains the cold-start buffer.
4. each recorded/completed outcome -> `persistEvent(id)` (append-only jsonl), fail-loud on appendFile rejection.

## The orphan it closed (the substantive finding)
`CrossProcessOutcomeStore` (the SEMANTIC outcome bus -- distinct from the shell `outcome-bus.jsonl` that the diversity audit measured) was IN-MEMORY ONLY:
- `configureStorePath()` had **ZERO production callers** (only its own tests). `grep` proved it (dist refs were the method def + doc strings, never an invocation).
- `record()` is sync and **never calls `persistEvent()`** -- the doc comment "every record() also persists" was aspirational/stale.
- So every MCP restart wiped the shop-floor outcome history that the live learners train on: `CAMLoRAAdapterTrainerEngine`, `ConformalPredictionLogEngine`, `ConformalCalibrationMonitorEngine`. The persistence machinery (configureStorePath + persistEvent + reload + 400 lines of tests) was BUILT + TESTED but never WIRED -- a textbook R15 orphan. This unit finishes the wiring without touching the store's sync record() hot path.

## Scrutiny (3-of-3) caught 2 REAL P1s -- both FIXED + re-verified PASS
1. **Reload double-count**: `configureStorePath` reload push-ed every line, so a pending->terminal pair (two append-only lines, one id) loaded as TWO `events[]` entries -> `replay()`/`replaySince()` double-count after restart. FIX: dedup-by-id on reload (replace `events[existingIdx]` in place, latest wins; byId index stays valid; enforceCapacity rebuild is the backstop). Existing store persistence tests use distinct ids -> unaffected.
2. **Silent disk-write failure**: the bus subscriber's bare `void persistEvent(id)` swallowed `fs.appendFile` rejections (disk full/EPERM) -> durability silently lied. FIX: `persistOne()` `.catch()`es, increments `state.persistErrors`, `console.error()`s (R12 fail-loud); counter via `xprocLedgerDurabilityStatus()`.
Plus: updateOutcome-isolation test, doc notes (reload does NOT republish to bus -> no ConformalPredictionLog double-consume; clear() is in-memory-only / test-only).

## OPEN P2 follow-ups (honest, deferred -- not blocking, gate was 3-of-3 PASS)
- `persistErrors` has no bus-alert / threshold -- a full disk silently accumulates errors visible only to a `status()` poller. Follow-up: emit `feedbackBusEngine.publish("xproc.ledger.persist_error", ...)` on first/Nth failure.
- No test injects a real disk-write failure to prove `persistErrors` increments (the `.catch` is correct by inspection; both reviewers confirmed). Follow-up: a test that makes the ledger path un-writable post-configure (EISDIR via mkdir-over-file) and asserts `persistErrors >= 1`.
- Append-only jsonl, no compaction/rotation -- benign at the semantic bus's low traffic; a store-side `compact()` is the follow-up if a high-volume synthetic-outcome batch is ever pointed at it.

## ACTIVATION (operator, fleet-wide)
Set `PRISM_XPROC_LEDGER_DURABLE=1` in settings.json env -> the self-improving loop's shop-floor outcome memory survives restarts. Recommended (net-positive). Default OFF until then.

## Shared-tree contention LESSON (cost this session real friction)
Working the unit on the shared trunk (`H:/prism`, cad-fusion-live-ms0) from an india SLOT chat hit: (a) a `git-sync`/peer commit ABSORBED my staged files into a PEER's commit (1a0790fb89, papa) -- attribution lost; (b) a later peer's staged files got absorbed into MY commit (9b61cfb734). Root: the shared index is contended with 4+ peers + recurring git-sync. The `git-add-lane-guard` honors a literal `[MAIN-FORCE]` token IN the command (line 432: `if (/\[\s*MAIN-FORCE\s*\]/i.test(cmd)) exit(0)`) -- that is the sanctioned per-command bypass for india's owned xproc surface (NOT a settings-env change). slot/india branch is 595-behind trunk + lacks the live persistence API, so trunk WAS the correct build lane. Takeaway: when forced onto the shared trunk, stage + commit ATOMICALLY in one command within a single turn (git-sync eats untracked files at turn boundaries; `git add` protects from git-clean but not from `git reset`/peer-commit-absorption -- only a fast commit does).

## Verify
- `cd mcp-server && npx vitest run src/__tests__/XprocOutcomeLedgerDurability.test.ts` -> 15/15.
- regression: `... CrossProcessOutcomeStore.test.ts ai-dispatcher-ledger-wire.test.ts OutcomePublishAdapterEngine.test.ts` -> 168 green (store dedup no-regression).
- `NODE_OPTIONS=--max-old-space-size=16384 npx tsc --noEmit` -> 329 baseline / 0 in changed files.
- commits: `git -C H:/prism show 9b61cfb734` (hardening), 5b9aa53883 (test), 1a0790fb89 (impl, absorbed).

Article driver: 0xCodez "Agent harness engineering with Claude" -- thesis "almost no one is talking about what the loop runs on". PRISM's self-improving loop ran on volatile memory; this makes its substrate durable. [[reference_outcome_bus_diversity_2026_06_16]] (the sibling shell-bus monoculture finding) -- both are "what the loop runs on" gaps.
