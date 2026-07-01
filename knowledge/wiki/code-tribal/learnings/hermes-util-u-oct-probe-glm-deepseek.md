# HERMES-UTIL/U-OCT-PROBE-GLM-DEEPSEEK — [MAIN-FORCE] [HERMES-UTIL]/U-OCT-PROBE-GLM-DEEPSEEK (slot:zulu): octopus probe banner 5->7 voices + includeGLM consensus round-trip lock

**Commit:** `fa03e2607c99` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T07:44:04-05:00
**Tags:** hermes-util, u-oct-probe-glm-deepseek, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-OCT-PROBE-GLM-DEEPSEEK (slot:zulu): octopus probe banner 5->7 voices + includeGLM consensus round-trip lock

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-OCT-PROBE-GLM-DEEPSEEK (slot:zulu): octopus probe banner 5->7 voices + includeGLM consensus round-trip lock

The SessionStart octopus probe banner (buildBanner in octopus-provider-probe.mjs)
credited only 5 voices (Claude/Codex/Ollama/Grok/Gemini) while MultiModelConsensusEngine
now fans out to 7 -- it grew DeepSeek (DEEPSEEK_API_KEY) and GLM/Zhipu
(GLM_API_KEY||ZHIPU_API_KEY) cross-vendor voices. Same systematic undercount class
U-OCT-PROBE-GROK-CLI fixed for Grok. The two named fast-follows from U-GLM-CONSENSUS-WIRE
(122831a2ac): "Probe-banner GLM voice + dedicated includeGLM round-trip test".

- buildBanner: credit DeepSeek + GLM, denominator 5->7, "All 5 voices live"->"All 7",
  main() probe adds deepseekKeyPresent/glmKeyPresent (mirrors engine gates L498/L500).
  23/23 probe tests (5->7 bands + new DeepSeek/GLM crediting + the 5-core-host honestly-5/7 R9 bite).
  LIVE-validated: this host renders "READY (3/7 voices)" (was misreporting 3/5).
- includeGLM consensus round-trip lock THROUGH ask(): mkGLM(GLMResult) helper + 5 new
  tests (joins+dualOllama-suppressed / ZHIPU-alone OR-gate / keyless back-compat /
  includeGLM:false opt-out / fail-soft errored zhipu voice). GLM_API_KEY+ZHIPU_API_KEY
  added to the _VENDOR_KEYS hermetic scrub. 51/51 (was 46/46).

tsc clean. 2-arm per-file scrutiny PASS (no P0/P1/P2): both arms verified the 7-voice
count mirrors the engine fan-out, no machine-consumer parses the banner string (only
the LLM reads it), and the scrub is leak-safe. Serves "octopus utilization" visibility.
```

## Files touched (4)
- .claude/hooks/octopus-provider-probe.mjs                   |  42 ++++++++++++++++++++++-------
- .claude/hooks/octopus-provider-probe.test.mjs              | 104 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------
- mcp-server/src/__tests__/MultiModelConsensusEngine.test.ts | 105 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- 3 files changed, 224 insertions(+), 27 deletions(-)

## Lessons surfaced in commit body
- TIL]/U-OCT-PROBE-GLM-DEEPSEEK (slot:zulu): octopus probe banner 5->7 voices + includeGLM consensus round-trip lock
- tilization" visibility.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fa03e2607c99`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._