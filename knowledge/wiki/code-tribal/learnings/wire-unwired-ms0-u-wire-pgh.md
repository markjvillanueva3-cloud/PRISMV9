# WIRE-UNWIRED-MS0/U-WIRE-PGH — [WIRE-UNWIRED-MS0]/U-WIRE-PGH+PFH: wire Parser Golden + Fuzz harness engines into prism_dev (11 actions)

**Commit:** `b966f39abf96` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T05:47:04-05:00
**Tags:** wire-unwired-ms0, u-wire-pgh, auto-distilled

## Subject
[WIRE-UNWIRED-MS0]/U-WIRE-PGH+PFH: wire Parser Golden + Fuzz harness engines into prism_dev (11 actions)

## Body
```
[WIRE-UNWIRED-MS0]/U-WIRE-PGH+PFH: wire Parser Golden + Fuzz harness engines into prism_dev (11 actions)

Two parser-regression engines wired (read methods only); write methods
(freeze/quarantineCase/liftQuarantine/addCorpusEntry/markCrash/clearAll)
DEFERRED — LLM-callable writes would let fictional golden sets silence
real regressions or inject fake crashes.

PGH (6 actions) — ParserGoldenHarnessEngine (U-LPR-PARSER-TESTS):
- pgh_list_golden: list cases [optional dialect filter]
- pgh_get_case: id → case (found:true|false)
- pgh_is_quarantined: id+now → 'no' | true
- pgh_list_quarantine: now → quarantined cases
- pgh_evaluate: ParserRun[] → EvaluationReport
  (total_runs, passed, hard_breaches, soft_breaches, missing_cases, new_cases)
- pgh_to_snapshot: full golden+quarantine state

PFH (5 actions) — ParserFuzzHarnessEngine (U-LPR-PARSER-FUZZ):
- pfh_list_corpus: list entries [optional dialect/category filter]
- pfh_get_corpus_entry: SHA → entry (found:true|false)
- pfh_list_crashes: list recorded crashes
- pfh_evaluate_batch: ParserObservation[] → FuzzBatchReport
- pfh_to_snapshot: full corpus+crashes state

Wire-safety doctrine:
- Schema enforces the exact ParserRun + ParserObservation shapes the
  engine requires (case_id+input_sha256+parse_ok+ast_sha256?+error_code?
  for runs; parser_id+input_sha256+dialect+parse_ok+observed_at+... for
  observations). The first cut used wrong field names ('observed_error',
  'parser_name', 'ok') and the engine silently returned empty/false
  reports — fixed by reading engine source then mirroring exact contract.
- count survivors + found:true|false + is_quarantined:'no'|true
  discriminators alongside potentially-empty arrays
- DoS guards: ≤10k runs/observations per evaluate call
- Engine throws on bad SHA → dispatcher catches + emits error envelope

Tests: 29/29 PASS (8 schema gates incl. DoS bounds + happy paths against
seeded golden/corpus + VARIABILITY across 3 dialects + 2 ROUTING PROOFs
(case_id set parity + SHA set parity) + concrete dialect+SHA+
input_len_bytes assertions on get_corpus_entry + snapshot.stringify()
contains seeded ids + report.passed=true on full match + 3 schema-reject).
```

## Files touched (4)
- .../__tests__/dispatcher.parserHarnesses.test.ts   | 363 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  76 +++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  | 106 +++++-
- 3 files changed, 544 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong field names ('observed_error',

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b966f39abf96`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._