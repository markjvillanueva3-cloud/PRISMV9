---
name: reference_post_ship_hermes-util-u-local-model-audit
description: Auto-distilled learnings from shipping HERMES-UTIL/U-LOCAL-MODEL-AUDIT (commit 8e4983aa1). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.892Z
aliases: reference_post_ship_hermes-util-u-local-model-audit
---


# HERMES-UTIL/U-LOCAL-MODEL-AUDIT

[MAIN-FORCE] [HERMES-UTIL]/U-LOCAL-MODEL-AUDIT (slot:zulu): live model-utilization audit (ollama 17 models + hermes/grok). VERDICT: routing IS largely optimal -- qwen2.5-coder:32b (heavy floor), qwen3-coder:30b (newer coder wired 8x as PRISM_LOCAL_MEDIUM_MODEL), gpt-oss:120b (deepest reason, Blackwell unlock), VLM ensemble OCR. ONE real gap: BIG_VISION_PREFERENCE lists PHANTOM qwen3-vl:32b-instruct -> skips resident qwen3-vl:32b (best dense VLM) for accuracy-critical OCR; fix needs xray thinking-trap/A-B verify (routed). Struck void qwen2.5-coder:7b drift item. Canonical facts #4 + xray brief.

**Shipped:** 2026-06-18T12:04:06-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[hermes-util-u-local-model-audit]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._