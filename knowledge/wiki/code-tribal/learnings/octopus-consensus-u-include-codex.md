# OCTOPUS-CONSENSUS/U-INCLUDE-CODEX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-INCLUDE-CODEX (slot:bravo): add includeCodex flag + adopt in all local-only octopus callers

**Commit:** `d1fafa2e1f39` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T03:47:24-05:00
**Tags:** octopus-consensus, u-include-codex, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-INCLUDE-CODEX (slot:bravo): add includeCodex flag + adopt in all local-only octopus callers

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OCTOPUS-CONSENSUS]/U-INCLUDE-CODEX (slot:bravo): add includeCodex flag + adopt in all local-only octopus callers

THE GAP (content-verified via octopus-runs.jsonl): MultiModelConsensusEngine
called codex UNCONDITIONALLY (line 452/568, no includeCodex flag, unlike
includeClaude/includeGrok/includeGemini). So every local-only octopus caller had
to neutralize codex with the PRISM_CODEX_BIN sentinel-bin hack -> a phantom
{id:openai, verdict:failed:spawn-enoent} voice in EVERY local-only run, dragging
consensus toward single-voice. Worse: consensus-queue-drain (fires on every Stop
across the ~10-session fleet) set includeClaude:false but could NOT disable codex
-> on any host with the codex CLI installed it made a REAL ChatGPT-subscription
call per drained entry -- the exact rate-limit amplifier the drain claims to kill.

FIX (R11-consistent, back-compat):
- Engine: includeCodex?:boolean (default true). Guards the openai pool-push +
  the codex call. Mirrors includeGrok/includeGemini exactly.
- Runner (octopus-first-live-record): includeCodex:false (clean disable; keeps
  the PRISM_CODEX_BIN sentinel as defense-in-depth).
- Drain (consensus-queue-drain): includeCodex:false in buildDrainVoiceBound ->
  its local-only guarantee is now real. ALSO added the missing isDirect main
  guard (import was running a live drain as a side effect; mirrors the runner).

WIRE: flows through dispatchOctopus askOverrides -> ask(). TEST: +2 engine tests
(skip + back-compat), +1 runner assertion, +new drain test (3); 37/37 engine,
17/17 runner, 3/3 drain. VALIDATE (live, local-only): new octopus-runs.jsonl
entry = [{id:ollama,answered}] with a real consensus answer -- codex voice ABSENT
(was failed:spawn-enoent in every prior run). dist rebuilt; my files tsc-clean
(14 pre-existing errors are in unrelated cad/algorithms files, not mine).
```

## Files touched (7)
- .claude/scripts/consensus-queue-drain.mjs                  | 21 +++++++++++++++++----
- .claude/scripts/consensus-queue-drain.test.mjs             | 37 +++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts | 28 ++++++++++++++++++++++++++++
- mcp-server/src/engines/MultiModelConsensusEngine.ts        | 21 +++++++++++++++++----
- scripts/octopus-first-live-record.mjs                      |  4 ++++
- scripts/octopus-first-live-record.test.mjs                 |  1 +
- 6 files changed, 104 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d1fafa2e1f39`
- Milestone envelope: `mcp-server/data/milestones/OCTOPUS-CONSENSUS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._