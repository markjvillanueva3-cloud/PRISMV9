# WIRE-UNWIRED-MS0/U-WIRE-EW — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-EW: wire ExtractionWiringEngine into prism_dev (1 read action + engine-pair test)

**Commit:** `cf2469c8674a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T08:12:46-05:00
**Tags:** wire-unwired-ms0, u-wire-ew, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-EW: wire ExtractionWiringEngine into prism_dev (1 read action + engine-pair test)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-EW: wire ExtractionWiringEngine into prism_dev (1 read action + engine-pair test)

Wires 1 pure-read stats accessor through prism_dev:
- ew_get_stats -> getStats() — reads WIRING_LOG file (last 500 entries),
                  parses JSONL, returns {total_wired, by_method,
                  by_consumer, recent_failures}

Pure read (filesystem read-only via readFileSync; no source-file or
state mutation in this code path).

DEFERRED (fictional-template-injection class — highest-risk on the
truly-unwired pool so far, alongside ForgeQuintEngine.forge()):
- applyWiring(action, content?): writes to user-supplied source files
  via wireTipInject / wireRegistryAdd / wireConfigUpdate /
  wireDirectImport / wireCodeGen helpers. LLM-callable would let any
  chat inject arbitrary content into ANY repo source file identified
  by a synthesized 'target_file' path.
- applyAll(actions[]): batch of applyWiring — same risk class.
- processQueue(): reads data/state/wiring-actions-queue.json and
  applies + writes results — same risk class plus queue mutation.

NOT WIRED IN THIS COMMIT (separate engine, OUT OF SCOPE) — sampled
LatheTransformerEngine from the same truly-unwired pool BUT skipped:
its surface is too thin for safe LLM-callable wiring. Only
computePositionalEncoding + detokenize are truly pure; tokenizeLine
MUTATES vocabulary entry.frequency at engine line 785 (ML-training-
data-corruption class — frequency stats are part of training
surface), and all inference methods read untrained random-init
weights (predictions would be noise presented as authority — for a
safety-critical CNC platform, ML model outputs must go through
explicit train→validate→serve→audit before LLM-callable exposure).
Documented as a re-evaluate-when-trained candidate.

Test coverage: 19/19 vitest PASS across both files:
- dispatcher.extractionWiring.test.ts (7 tests): Zod schema accept
  + extra-fields-ignored, 5 read-action tests (shape + count
  parity / recent_failures capped at 20 / routing proof total_wired
  / routing proof by_method+by_consumer key counts / idempotency).
  All slim-stripped-empty fields handled via nullish-coalesce.
- ExtractionWiringEngine.test.ts (12 tests): 5 shape contract
  tests (4 fields / integer total / positive-integer by_method
  values / positive-integer by_consumer values / 20-cap on
  recent_failures), 5 invariants (missing-log-fallback / sum
  by_method values = total_wired / sum by_consumer values =
  total_wired / idempotency / 500-line log-tail bound), 2
  failure-shape (each failure has action+success=false+method+
  changes_made / singleton smoke).

Cross-field invariants documented at line 482-484: total_wired
increments AND by_method[m]++ AND by_consumer[c]++ all fire on the
same success row, so sum(by_method values) === sum(by_consumer
values) === total_wired. Tests assert both.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../src/__tests__/ExtractionWiringEngine.test.ts   | 119 ++++++++++++++++++++
- .../__tests__/dispatcher.extractionWiring.test.ts  | 124 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  11 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  18 ++-
- 4 files changed, 271 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cf2469c8674a`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._