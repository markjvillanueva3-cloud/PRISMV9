# HERMES-CAPABILITY-C1/U-GOAL-DECOMPOSER — [MAIN-FORCE] [HERMES-CAPABILITY-C1]/U-GOAL-DECOMPOSER (slot:bravo): goal->SubtaskSchema decomposer (Ollama-injected) -- the C1 front-end

**Commit:** `31cd3ed86cd4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T13:54:02-05:00
**Tags:** hermes-capability-c1, u-goal-decomposer, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-CAPABILITY-C1]/U-GOAL-DECOMPOSER (slot:bravo): goal->SubtaskSchema decomposer (Ollama-injected) -- the C1 front-end

## Body
```
[MAIN-FORCE] [HERMES-CAPABILITY-C1]/U-GOAL-DECOMPOSER (slot:bravo): goal->SubtaskSchema decomposer (Ollama-injected) -- the C1 front-end

The last C1 piece: turns a raw goal into a validated FanoutPlanRequest (subtask DAG)
that project_governed_schedule + the hermes-multiwave-build executor consume. Before
this, a goal had to arrive ALREADY decomposed.

HermesGoalDecomposerEngine: pure buildDecomposePrompt/parseDecomposition/validateDecomposition
(Kahn cycle + missing-dep + self-dep + dup-id + schema) + async decompose with an INJECTED llm
(R5: reasoning->local model; engine stays IO-free + unit-testable). FAIL-LOUD (R12): empty goal /
no candidates / no llm / unparseable / invalid DAG / >20 subtasks all THROW -- never a fabricated plan.

Wired prism_session:hermes_decompose_goal (real Ollama via ollamaClientEngine; prompt_only bypasses
the LLM for a hermetic wiring path). Action count +1.

SCHEMA FIX (root-cause, 2-arm scrutiny arm-A P1): SubtaskSchema.depends_on now .default([]) -- a
FanoutPlanRequest returned over MCP is run through slimResponse (drops empty arrays), stripping every
leaf's depends_on:[]; the downstream FanoutPlanRequestSchema.parse in project_governed_schedule /
wave_loop_step then threw "Required" on every leaf. absent === leaf === [] is the correct semantics;
additive-only (z.infer output type stays string[], no consumer changes). Hardens EVERY schema consumer.

Tests: 27 engine unit (happy + >=3 failure + >=2 adversarial, fake-llm) + 4 dispatcher e2e incl. a
fail-first round-trip oracle that drives the LIVE decompose path (Ollama stubbed) and proves the
returned request survives slimResponse + re-parses with leaf depends_on intact. 207/207 across the
Hermes/Zulu+planner+scheduler suites; my tsc delta = 0 (the 81 project-wide errors are peer-introduced
CAD/electrode/fusion debt on the shared tree -- identical with my schema change reverted, none in my lane).
```

## Files touched (6)
- mcp-server/src/__tests__/HermesGoalDecomposerEngine.test.ts            | 211 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/sessionDispatcher.hermesDecompose.e2e.test.ts | 101 +++++++++++++++++++
- mcp-server/src/engines/HermesGoalDecomposerEngine.ts                   | 219 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/HermesParallelFanoutPlannerEngine.ts            |   8 +-
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                  |  46 +++++++++
- 5 files changed, 583 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 31cd3ed86cd4`
- Milestone envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-C1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._