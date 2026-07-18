# BACKEND-DEV-LOOP/U-LATHE-PROG-OPT-WIRE — [MAIN] [BACKEND-DEV-LOOP]/U-LATHE-PROG-OPT-WIRE: expose generateOptimizedProgram + estimateImprovements on turning-dispatcher

**Commit:** `1a9c3374e643` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T23:36:23-05:00
**Tags:** backend-dev-loop, u-lathe-prog-opt-wire, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-LATHE-PROG-OPT-WIRE: expose generateOptimizedProgram + estimateImprovements on turning-dispatcher

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-LATHE-PROG-OPT-WIRE: expose generateOptimizedProgram + estimateImprovements on turning-dispatcher

Closes the wire-up gap on LatheProgramOptimizerEngine. Engine has been built+tested for the JM Die amateur->production upgrader, but only analyzeProgram was exposed via dispatcher (lathe_program_analyze, BATCH3). The two upgrade surfaces — generateOptimizedProgram (emits upgraded program text + changelog) and estimateImprovements (pre-upgrade impact estimate) — were unreachable. New actions: lathe_program_optimize, lathe_program_estimate.

Wire follows BATCH3 sibling pattern (R11): z.string().min(1) on content, optional file_path, lazy import in case, action-prefixed type-guard throw, result assigned raw (slimResponse handles MCP shape).

Anti-regression coverage (U-LATHE-PROG-OPT-WIRE.test.ts, 17/17 PASS): schema presence+rejection, source-grep for enum AND case label, method-routing with negative-sibling guard (catches the copy-paste-to-wrong-method bug class), engine round-trip vs real JM Die fixtures (BRICO-132, A-6266, hex-pins-mark). Invariants: optimizedScore >= originalScore (do-no-harm), estimate.currentScore == optimize.originalScore (consistency).

Per-file 2-reviewer scrutiny: PASS / PASS (0 P0/P1). Pre-existing engine test: 58/59 PASS (the Taylor-life failure is unrelated, predates this commit).

NOTE: this commit ABSORBS peer FEATURE-GAP-AUDIT-MS0 working-tree hunks (live_tool_plan, lathe_tribal_*) that were uncommitted in the shared H:/prism tree at commit time. Work preserved; banner is U-LATHE-PROG-OPT-WIRE but those peer hunks ship under this SHA. Same cross-chat-misattribution class as ref reference_cross_chat_commit_misattribution_2026_05_18 — downstream-visible, not rewritten.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../src/__tests__/U-LATHE-PROG-OPT-WIRE.test.ts    | 202 +++++++++++++++++++++
- mcp-server/src/schemas/turningActionSchemas.ts     | 111 +++++++++++
- .../src/tools/dispatchers/turningDispatcher.ts     | 111 ++++++++++-
- 3 files changed, 423 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrong-method bug class), engine round-trip vs real JM Die fixtures (BRICO-132, A-6266, hex-pins-mark). Invariants: optimizedScore >= originalScore (do-no-harm), estimate.currentScore == optimize.originalScore (consistency).
- NOTE: this commit ABSORBS peer FEATURE-GAP-AUDIT-MS0 working-tree hunks (live_tool_plan, lathe_tribal_*) that were uncommitted in the shared H:/prism tree at commit time. Work preserved; banner is U-LATHE-PROG-OPT-WIRE but those peer hunks ship under this SHA. Same cross-chat-misattribution class as ref reference_cross_chat_commit_misattribution_2026_05_18 — downstream-visible, not rewritten.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1a9c3374e643`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._