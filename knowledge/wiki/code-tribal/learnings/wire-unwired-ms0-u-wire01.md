# WIRE-UNWIRED-MS0/U-WIRE01 — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE01: wire BashCommandClassifierEngine → prism_dev bash_classify

**Commit:** `4db3bb203b0b` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T00:02:05-05:00
**Tags:** wire-unwired-ms0, u-wire01, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE01: wire BashCommandClassifierEngine → prism_dev bash_classify

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE01: wire BashCommandClassifierEngine → prism_dev bash_classify

BashCommandClassifierEngine was a truly-unwired backend dev-tool engine
(no dispatcher, no test, no consumer — confirmed via validate-unwired-signal
+ exact-name search across dispatchers/hooks/scripts/helpers).

- devDispatcher: new bash_classify action — classify a single command or a
  commands batch -> category + est. output tokens + token-efficient
  alternative. Fresh engine instance per call (no singleton-history leak).
- devActionSchemas: bash_classify Zod schema (command? / commands?).
- New test: 25 cases — engine-direct (happy + 3 failure + 3 adversarial
  + 5 variability + report/reset) and devDispatcher round-trip E2E. All pass;
  3 touched files tsc-clean (4 pre-existing devDispatcher errors unrelated).

Scoping: the 861-unwired pool fails its own validation gate (12% FP, FAIL);
only genuine non-duplicate backend-dev orphans wired, per
feedback_dont_wire_for_wiring_sake.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../__tests__/BashCommandClassifierEngine.test.ts  | 297 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  10 +
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  34 +++
- 3 files changed, 341 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4db3bb203b0b`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._