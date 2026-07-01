# WIRE-UNWIRED-MS0/U-WIRE-MTI — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-MTI: wire MillTribalIntegrationEngine into prism_dev (3 actions)

**Commit:** `a2eb474f01f0` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T07:14:34-05:00
**Tags:** wire-unwired-ms0, u-wire-mti, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-MTI: wire MillTribalIntegrationEngine into prism_dev (3 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-MTI: wire MillTribalIntegrationEngine into prism_dev (3 actions)

Wires 3 pure-read tribal-knowledge accessors through prism_dev:
- mti_get_adjustment       -> getAdjustment(material, op, tool, dia)
- mti_check_failure_modes  -> checkFailureModes(material, op, rpm, feed, doc)
- mti_get_statistics       -> getStatistics()

DEFERRED — integrateWithTraining() mutates millNeuralNetworkEngine
training data via addTrainingSample(). ML-training-data-corruption
class: LLM-callable would let any chat poison the neural network's
training set with crafted tribal-tip payloads (similar to
fictional-template-injection but worse — the corruption persists in
trained model weights, not just in transient state).

Per-action contracts (verified by reading source first):
- getAdjustment iterates trainingSignals + heuristics + failure modes,
  multiplying rpm/feed/doc factors. Returns {rpm_factor, feed_factor,
  doc_factor, warnings[], tips_applied[]}. Echoed back with input args
  + count parity (warnings_count, tips_applied_count).
- checkFailureModes walks the failure-mode registry; returns matches
  array + count.
- getStatistics aggregates totals + per-material + per-op counts. Pure
  read (no I/O beyond the engine's in-memory arrays).

DoS guards:
- material_iso 1-8 chars, operation_type/tool_type 1-64 chars
- tool_diameter_mm 0<x<=500
- rpm <=200_000, feed <=50_000, doc <=1000

Test coverage: 15/15 vitest PASS. Zod schema validation (required
fields + cap rejection), variability floor (3 distinct material/op
combos + small vs large tool), 3 ROUTING PROOFs (wire <-> engine
contract parity with toBeCloseTo for floating-point factors), error
envelope on schema-reject paths.

Pre-existing tsc errors at MillTribalIntegrationEngine.ts:436-438
(TS18048 'possibly undefined' in applySignalToNeuralNetwork()) are
unreachable from this wire — they're inside integrateWithTraining()
which is DEFERRED, not wired.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.millTribalIntegration.test.ts       | 245 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  31 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  43 +++-
- 3 files changed, 318 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a2eb474f01f0`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._