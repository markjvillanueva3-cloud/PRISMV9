# HERMES-UTIL/U-HERMES-DRIVE-RUNNER-WIRE — [MAIN-FORCE] [HERMES-UTIL]/U-HERMES-DRIVE-RUNNER-WIRE (slot:zulu): wire prism_session:autonomous_drive (gated, Ollama-backed) + round-trip E2E

**Commit:** `08ca8fe073cd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T11:27:56-05:00
**Tags:** hermes-util, u-hermes-drive-runner-wire, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-DRIVE-RUNNER-WIRE (slot:zulu): wire prism_session:autonomous_drive (gated, Ollama-backed) + round-trip E2E

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-HERMES-DRIVE-RUNNER-WIRE (slot:zulu): wire prism_session:autonomous_drive (gated, Ollama-backed) + round-trip E2E

R15 no-orphan: the HermesAutonomousDriveRunnerEngine (prior commit) is now
reachable through the dispatcher.

WIRE: new prism_session action `autonomous_drive` (enum + case). Gate-checked at
the dispatcher boundary (p.gate===true || PRISM_HERMES_AUTONOMOUS_DRIVE===1);
gated-off returns {ran:false, gated:true} WITHOUT importing/calling Ollama. When
armed, builds a real Ollama-backed executor (ollamaClientEngine.generate per
subtask, default model qwen2.5-coder:32b) + an Ollama decompose llm, then runs
the runner. Mirrors the existing schedule_wave / hermes_decompose_goal case style.

TEST: 4 round-trip E2E (hermetic -- stubs the Ollama singleton the case lazy-imports,
mirrors sessionDispatcher.hermesDecompose.e2e.test.ts):
- gate OFF (default) -> {ran:false, gated:true}, generate NOT called (the safety
  gate proven AT the dispatcher boundary, not just engine-side).
- gate ON (gate:true) -> drives a->b via Ollama, status complete, 1 generate/subtask.
- gate ON + Ollama failure (ok:false) -> subtask fails -> bounded status failed.
- env gate PRISM_HERMES_AUTONOMOUS_DRIVE=1 -> runs without the gate param.
14/14 (10 runner unit + 4 e2e). tsc clean.

The autonomous-build loop is now end-to-end: goal/DAG -> (gated) prism_session:
autonomous_drive -> decompose -> wave-schedule -> Ollama-execute each wave ->
self-correct -> aggregate. Heavy execution (Sonnet/Opus agents via a Workflow
agent() executor) plugs into the same injected seam.
```

## Files touched (3)
- mcp-server/src/__tests__/sessionDispatcher.autonomousDrive.e2e.test.ts | 118 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                  |  45 ++++++++++++++++
- 2 files changed, 163 insertions(+)

## Lessons surfaced in commit body
- TIL]/U-HERMES-DRIVE-RUNNER-WIRE (slot:zulu): wire prism_session:autonomous_drive (gated, Ollama-backed) + round-trip E2E

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 08ca8fe073cd`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._