# BACKEND-DEV-LOOP/U-BRIDGE-WIRE-VIDEO-LOCK — [LIMA] [BACKEND-DEV-LOOP]/U-BRIDGE-WIRE-VIDEO-LOCK: anti-regression test for iter15 wires [iter16]

**Commit:** `0772ad49b655` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T18:08:36-05:00
**Tags:** backend-dev-loop, u-bridge-wire-video-lock, auto-distilled

## Subject
[LIMA] [BACKEND-DEV-LOOP]/U-BRIDGE-WIRE-VIDEO-LOCK: anti-regression test for iter15 wires [iter16]

## Body
```
[LIMA] [BACKEND-DEV-LOOP]/U-BRIDGE-WIRE-VIDEO-LOCK: anti-regression test for iter15 wires [iter16]

iter15 wired 3 Video engines into prism_knowledge via 3 new learn_video_* actions. iter16 locks that wiring against future revert with a 16-case vitest suite that source-greps the dispatcher and asserts every load-bearing wire is present.

Per H:/.claude/rules/dispatchers.md ("Test action count anti-regression: never decrease total action count") — this is the canonical regression oracle for a wiring iter.

WHAT IT CHECKS

z.enum action registration (4 cases):
- Each of {learn_video_extract_actions, learn_video_replay, learn_video_pipeline_run} appears as a quoted literal in the dispatcher source (it.each, 3 cases).
- The 3 actions appear in order, contiguous, within ~200 chars (locks the cluster's readability).

Engine import + invocation wiring (9 cases — it.each × 3 actions × 3 facets):
- Each action's case body has `await import("../../engines/<Engine>.js")` exactly.
- Each case destructures the canonical singleton (videoActionExtractorEngine / videoReplayOrchestratorEngine / videoReplayPipelineEngine).
- Each case calls the documented method (processVideoForActions / replayFromVideo / runFullPipeline).

Dispatcher-convention compliance (3 cases):
- No @ts-nocheck snuck in (per dispatchers.md).
- All 3 action names are snake_case (no camelCase / kebab-case).
- The cluster carries the U-BRIDGE-WIRE-VIDEO section comment for archaeology.

DESIGN RATIONALE

Pure source-grep oracle, not a live MockMCPServer round-trip:
- The full Video engine pipeline requires ffmpeg + Anthropic API + Python-with-cadquery. Wiring them into a hermetic unit test is wasted effort — those are tested per-engine elsewhere.
- This iter's value is ANTI-REGRESSION on the wiring boundary, which a source-grep proves exactly.
- For full E2E coverage on a wire that crosses a subprocess boundary, use the iter14 pattern (real spawn with sandboxed tmpdir) — appropriate when the wire's behavior changes filesystem state.

16/16 vitest cases PASS in 178ms.

LESSON

Test cost grows with the wire's blast radius. iter11-14 needed a real-subprocess oracle because the watchdog WRITES filesystem state — hermetic tests miss the IO-boundary class. iter15-16 is a pure-dispatch wire — a source-grep is sufficient because if the wire becomes runtime-broken (engine method renamed, singleton removed) the grep fails BEFORE production sees it.

Right tool for the right wire. The iter10 75%-false-positive class doesn't apply here.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (2)
- .../knowledgeDispatcher.video-bridge.test.ts       | 143 +++++++++++++++++++++
- 1 file changed, 143 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0772ad49b655`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._