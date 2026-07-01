# OLLAMA-STRESS/U-ALPHA-OLLAMA-NUMCTX-WIRE — [MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-WIRE (slot:alpha): wire the proven num_ctx fix into the fleet offload path (R15 complete)

**Commit:** `66a0154e7356` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T20:46:43-05:00
**Tags:** ollama-stress, u-alpha-ollama-numctx-wire, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-WIRE (slot:alpha): wire the proven num_ctx fix into the fleet offload path (R15 complete)

## Body
```
[MAIN-FORCE] [OLLAMA-STRESS]/U-ALPHA-OLLAMA-NUMCTX-WIRE (slot:alpha): wire the proven num_ctx fix into the fleet offload path (R15 complete)

The stress test PROVED a per-request num_ctx eliminates the concurrency wedge with
no capability tradeoff. Now WIRE it into the central offload tool so the whole fleet
benefits automatically.

scripts/ask-ollama.mjs::callModel now defaults num_ctx to defaultNumCtxForPrompt(
prompt, numPredict, system) when the caller doesn't pin it -- an input-sized estimate
(chars/3 overshoot + numPredict + 1024 margin, clamped [2048,131072]). PROVABLY
output-safe: num_ctx >= real token count -> the whole prompt fits -> byte-identical
output; only the KV-cache RESERVATION shrinks (131072 -> right-sized). So every short
mechanical offload now reserves ~2048 ctx (safe concurrency + freed VRAM) instead of
131072; long inputs scale up; large-context callers that pin num_ctx are untouched.

ask-ollama already had the num_ctx passthrough (both transports); this just defaults
it adaptively at the single callModel chokepoint -> all modes + both transports (direct
+ MCP local_generate) covered. +6 tests (apply + preserve-explicit + floor/scale/clamp/
overshoot/system-length); 56/56. Existing 50 byte-identical (no regression). LIVE offload
returns correct output through the adaptive ctx. wiki updated R15-complete.
```

## Files touched (3)
- .claude/hooks/__tests__/stop-force-handoff.test.mjs | Bin 5417 -> 7083 bytes
- .claude/hooks/stop-force-handoff.mjs                |  86 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------
- 2 files changed, 71 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 66a0154e7356`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-STRESS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._