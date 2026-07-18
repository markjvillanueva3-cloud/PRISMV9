# WIRE-UNWIRED-MS0/U-WIRE-WPNA — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WPNA: wire WEDMProgramNeuralAnalysisEngine into prism_dev (4 actions + engine test)

**Commit:** `9b6a0ddf51be` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:43:42-05:00
**Tags:** wire-unwired-ms0, u-wire-wpna, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WPNA: wire WEDMProgramNeuralAnalysisEngine into prism_dev (4 actions + engine test)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-WPNA: wire WEDMProgramNeuralAnalysisEngine into prism_dev (4 actions + engine test)

Wires the WEDM program neural-analysis engine — composes the WEDM
program parser + physics models + neural pattern matcher + risk
assessor + reasoning chain into a unified analysis surface. Engine had
no test file; this commit ships both.

4 read-only actions through prism_dev:
  wpna_validate_order        sync — validateOperationOrder(ecodes[])
                             OrderValidation with violations[], cascades,
                             m-code timing checks.
  wpna_predict_break_risk    sync — predictWireBreakRisk(WEDMParams)
                             risk_score 0-100 + factors[] contributions.
  wpna_optimize_parameters   sync — optimizeParameters(params, mat?, thick?)
                             bound-based optimization vs material/thickness.
  wpna_analyze_program       async — analyzeProgram(content, opts?)
                             full pipeline: parse + validate + risk + patterns.

DEFER: suggestImprovements(analysis) — accepts complex nested
       Partial<ProgramAnalysis> tree (pattern_matches[], anti_patterns[]).
       Class=fictional-template-injection — caller could inject fake
       pattern data flowing into improvement output. Surface only when
       validated tree schema co-developed.

Wire-level invariants:
  - slimResponse drops empty arrays — explicit counts (violation_count,
    factor_count, change_count, etc.) computed from engine result BEFORE
    slim, so callers get real counts even when arrays are stripped.
  - has_predicted_breaks discriminator for optional risk field.
  - is_valid / risk_level / score top-level for fast LLM routing.

Tests: 46/46 PASS (26 dispatcher + 20 engine-direct).
       Schema validates: DoS caps (ecodes ≤ 50, programContent ≤ 1MB,
       physical dims), enum guards (pass_type), required fields.
       7th read-source-first catch: engine's skim/rough detection uses
       LAST-DIGIT heuristic (rough = ends in '1' OR matches /E\d{3}$/,
       skim = ends in 2|3|4|5) — E2200 ends in '0', neither. Fixture
       corrected to E1222/E1221 to actually trigger skim-before-rough.

WIRE-UNWIRED-MS0 progress: 22->23 wires this session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (5)
- .../WEDMProgramNeuralAnalysisEngine.test.ts        | 205 +++++++++++++
- .../dispatcher.wedmProgramNeuralAnalysis.test.ts   | 333 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  61 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  75 ++++-
- 4 files changed, 673 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9b6a0ddf51be`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._