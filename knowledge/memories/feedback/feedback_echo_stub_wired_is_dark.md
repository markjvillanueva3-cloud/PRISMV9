---
name: feedback_echo_stub_wired_is_dark
description: "A dispatcher case calling engine.method?.() with a \"method not callable\" fallback is dark, not wired (slot echo standing rule)"
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.424Z
aliases: feedback_echo_stub_wired_is_dark
---


**Rule:** "stub-wired ≠ wired." A single dispatcher case that calls `engine.method?.()` and falls back to a `"method not callable"` string is **dark-in-practice** — it returns a string, never executes the engine. Do not count it as wired in any coverage audit.

**Why:** the 5/21 post-processor audit's "11 dark engines" were really 2 wired + 8 stub-wired + 1 types — the stub-wired 8 are the actual leverage target (`WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}` + `LathePostProcessorAI` 73K + `LathePostGeneratorActiveLearning` + `JMDiePostProcessorLearning`). Treating them as wired hides the gap. **How to apply:** verify the method actually executes (real return shape, not a fallback string); wire the FULL method surface, not just one method. Re-measure: `grep -A1 "method not callable" camDispatcher.ts`. See [[reference_echo_stub_wired_dark_engines]].
