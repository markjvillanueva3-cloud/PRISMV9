# FEATURE-ROUTING-GRAPH-MS0/U-OCTOPUS-DEEPSEEK-VOICE-FIX — [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-DEEPSEEK-VOICE-FIX (slot:alpha): 3rd-arm P1 -- scrub DEEPSEEK_API_KEY in the consensus test isolation + round-trip lock

**Commit:** `cc5f0d452e8e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T23:31:27-05:00
**Tags:** feature-routing-graph-ms0, u-octopus-deepseek-voice-fix, auto-distilled

## Subject
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-DEEPSEEK-VOICE-FIX (slot:alpha): 3rd-arm P1 -- scrub DEEPSEEK_API_KEY in the consensus test isolation + round-trip lock

## Body
```
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-OCTOPUS-DEEPSEEK-VOICE-FIX (slot:alpha): 3rd-arm P1 -- scrub DEEPSEEK_API_KEY in the consensus test isolation + round-trip lock

3-of-3 arm B caught a P1 both per-file arms missed (R12 -- my '39 tests unchanged' was a CONDITIONAL
keyless-host pass): U-OCTOPUS-DEEPSEEK-VOICE added a DEEPSEEK_API_KEY-gated voice but did NOT add the
key to MultiModelConsensusEngine.test.ts's _VENDOR_KEYS hermetic-isolation scrub. On a host with
DEEPSEEK_API_KEY set (exactly the host the operator is provisioning), the existing voice-count +
dual-Ollama assertions would break AND ~10 ask() orchestration tests would fire REAL network calls to
api.deepseek.com (violating the no-network unit-test rule).

- FIX: add 'DEEPSEEK_API_KEY' to _VENDOR_KEYS (matches the GEMINI/GOOGLE/XAI precedent; the scrub
  exists precisely to keep voice counts deterministic regardless of the runner's shell).
- R15 round-trip lock (closes arm B's P2): 2 new ask()-level tests -- (1) DEEPSEEK_API_KEY set ->
  DeepSeek joins as the 'deepseek' voice + dualOllama suppressed (codex+deepseek+1 ollama); (2) no
  key -> no deepseek voice (back-compat). The wire is now pinned THROUGH ask(), not just at the engine.

PROOF: 41/41 pass BOTH keyless AND with DEEPSEEK_API_KEY=synthetic set (the exact failing condition
arm B reproduced) -- the scrub neutralizes the key, no network fires. tsc 0.
```

## Files touched (2)
- mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts | 52 +++++++++++++++++++++++++++++++++++++++++++++-------
- 1 file changed, 45 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cc5f0d452e8e`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-ROUTING-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._