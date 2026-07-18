# HERMES-UTIL/U-LOCAL-MODEL-AUDIT — [MAIN-FORCE] [HERMES-UTIL]/U-LOCAL-MODEL-AUDIT (slot:zulu): live model-utilization audit (ollama 17 models + hermes/grok). VERDICT: routing IS largely optimal -- qwen2.5-coder:32b (heavy floor), qwen3-coder:30b (newer coder wired 8x as PRISM_LOCAL_MEDIUM_MODEL), gpt-oss:120b (deepest reason, Blackwell unlock), VLM ensemble OCR. ONE real gap: BIG_VISION_PREFERENCE lists PHANTOM qwen3-vl:32b-instruct -> skips resident qwen3-vl:32b (best dense VLM) for accuracy-critical OCR; fix needs xray thinking-trap/A-B verify (routed). Struck void qwen2.5-coder:7b drift item. Canonical facts #4 + xray brief.

**Commit:** `8e4983aa14f5` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T12:04:06-05:00
**Tags:** hermes-util, u-local-model-audit, auto-distilled

## Subject
[MAIN-FORCE] [HERMES-UTIL]/U-LOCAL-MODEL-AUDIT (slot:zulu): live model-utilization audit (ollama 17 models + hermes/grok). VERDICT: routing IS largely optimal -- qwen2.5-coder:32b (heavy floor), qwen3-coder:30b (newer coder wired 8x as PRISM_LOCAL_MEDIUM_MODEL), gpt-oss:120b (deepest reason, Blackwell unlock), VLM ensemble OCR. ONE real gap: BIG_VISION_PREFERENCE lists PHANTOM qwen3-vl:32b-instruct -> skips resident qwen3-vl:32b (best dense VLM) for accuracy-critical OCR; fix needs xray thinking-trap/A-B verify (routed). Struck void qwen2.5-coder:7b drift item. Canonical facts #4 + xray brief.

## Body
```
[MAIN-FORCE] [HERMES-UTIL]/U-LOCAL-MODEL-AUDIT (slot:zulu): live model-utilization audit (ollama 17 models + hermes/grok). VERDICT: routing IS largely optimal -- qwen2.5-coder:32b (heavy floor), qwen3-coder:30b (newer coder wired 8x as PRISM_LOCAL_MEDIUM_MODEL), gpt-oss:120b (deepest reason, Blackwell unlock), VLM ensemble OCR. ONE real gap: BIG_VISION_PREFERENCE lists PHANTOM qwen3-vl:32b-instruct -> skips resident qwen3-vl:32b (best dense VLM) for accuracy-critical OCR; fix needs xray thinking-trap/A-B verify (routed). Struck void qwen2.5-coder:7b drift item. Canonical facts #4 + xray brief.
```

## Files touched (2)
- state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md | 3 ++-
- 1 file changed, 2 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- TIL]/U-LOCAL-MODEL-AUDIT (slot:zulu): live model-utilization audit (ollama 17 models + hermes/grok). VERDICT: routing IS largely optimal -- qwen2.5-coder:32b (heavy floor), qwen3-coder:30b (newer coder wired 8x as PRISM_LOCAL_MEDIUM_MODEL), gpt-oss:120b (deepest reason, Blackwell unlock), VLM ensemble OCR. ONE real gap: BIG_VISION_PREFERENCE lists PHANTOM qwen3-vl:32b-instruct -> skips resident qwen3

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8e4983aa14f5`
- Milestone envelope: `mcp-server/data/milestones/HERMES-UTIL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._