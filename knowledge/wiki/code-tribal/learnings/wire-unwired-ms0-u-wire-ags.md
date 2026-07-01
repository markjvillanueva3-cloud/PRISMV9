# WIRE-UNWIRED-MS0/U-WIRE-AGS — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-AGS: wire AutonomousGoalSynthesisEngine into prism_dev (1 compute action, engine-pair test already exists)

**Commit:** `ed7138561968` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T09:21:41-05:00
**Tags:** wire-unwired-ms0, u-wire-ags, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-AGS: wire AutonomousGoalSynthesisEngine into prism_dev (1 compute action, engine-pair test already exists)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-AGS: wire AutonomousGoalSynthesisEngine into prism_dev (1 compute action, engine-pair test already exists)

Wires 1 pure-compute goal-ranking action through prism_dev:
- ags_propose -> propose(gaps[], limit?) — ranks by Ψ×urgency×feasibility

Phase 0.18 U-AGI1 engine. Caller feeds gap descriptors (orphan
surfaces / Ψ deficits / failing tests / extraction candidates /
user-desires / peer-insights / other), engine ranks them by
score = psiImpact × urgency × feasibility (3-D priority product),
tiebreak by id ASC. Output is SUGGESTIONS not COMMANDS — caller
decides what to act on.

No DEFER list — single pure method, no state, no I/O.

DoS guards:
- gaps array: 1-1000 items
- id/origin: 1-256 chars; title: 1-512; tags: max 32 per gap (1-64 each)
- psiImpact: [0, 10]
- urgency: [0, 1]
- feasibility: [0, 1]
- limit: 0-1000 (0 = unlimited per engine line 64)

Engine throws on:
- duplicate gap id (engine line 70) — caught at dispatcher boundary
  and converted to error envelope, so LLM gets a clean
  {error, input_count} instead of a thrown exception bubbling out.
- empty/invalid fields (engine line 75-81) — Zod catches all these
  at the schema layer before reaching engine, so the throw paths
  remain as defense-in-depth.

Test coverage: 15/15 vitest PASS (dispatcher only — engine-pair from
autonomous-goal-synthesis-engine.test.ts):
- Zod schema validation (3 — required gaps + kind enum / range guards
  / DoS caps)
- propose behavior (9):
  - sort DESC by score with known values (HIGH 5.76 / MID 2.10 / LOW
    0.60)
  - score = psiImpact × urgency × feasibility algebraic invariant
    per-gap
  - limit=1 returns top-1 only
  - limit=0 returns ALL goals (engine 64 unlimited branch)
  - 7-GapKind variability all round-trip with distinct kinds
  - equal-score tiebreak by id ASC (A < B < C from B,A,C input)
  - duplicate id throw caught at dispatcher boundary -> error envelope
  - rationale string contains Ψ=N + urgency=N + feasibility=N + score
  - routing proof: wire score matches engine direct per-index
- error envelope (3 — missing gaps / empty array / >1000 DoS)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../dispatcher.autonomousGoalSynthesis.test.ts     | 214 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  23 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  23 ++-
- 3 files changed, 259 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ed7138561968`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._