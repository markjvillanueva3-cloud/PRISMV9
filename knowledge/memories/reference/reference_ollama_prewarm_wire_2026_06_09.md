---
name: reference_ollama_prewarm_wire_2026_06_09
description: "U-OLLAMA-PREWARM-WIRE (sierra 2026-06-09, cross-chat permission): wired the orphan ollama-prewarm-on-pipeline.mjs into settings.json. Pairs with T2 injector to complete the tool-call latency story. Verified-safe (detached unref'd curl, not an orphan)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.681Z
aliases: reference_ollama_prewarm_wire_2026_06_09
---


**U-OLLAMA-PREWARM-WIRE** (slot:sierra, 2026-06-09, after operator granted cross-chat permission). OLLAMA-SYNERGY backlog #8 — the latency partner to T2 ([[reference_ollama_synergy_audit_2026_06_09]]).

## What
`ollama-prewarm-on-pipeline.mjs` was an orphan (built+tested, 0 settings refs). Wired into `C:/Users/wompu/.claude/settings.json` UserPromptSubmit right after the T2 injector (timeout 8000, mirrored C->H). On a pipeline prompt (/forge*,/rgs,/scrutinize,/dedup,/deep-search,/pdf-learn,/close-out,/precompact) it fires a tiny detached `/api/generate` with keep_alive=10m to pre-warm the pipeline's model during the prompt->first-tool window, hiding the 3-5s cold-load. Pairs with T2: injector surfaces the routes, prewarm warms the model.

## Verified-safe BEFORE wiring (R8 — read the hook fully)
Advisory/never-block (always continue:true,suppressOutput); warmup is `spawn(curl, -m 30, {detached:true, stdio:ignore}).unref()` -> a bounded self-terminating curl, NOT a long-lived fleet-reaper orphan; keyword-gated (non-match=instant suppress); 10-min per-model cooldown stamp (no re-warm spam); ollama-down + already-warm guards; kill `PRISM_OLLAMA_PREWARM_DISABLE=1`. PIPELINE_MODELS map only to qwen2.5-coder:32b + nomic-embed-text.

## R12 catch (consistent with the T1 finding)
The audit recommended "align reasoning to gpt-oss:120b." REJECTED — gpt-oss family /api/generate returns an empty `.response` (harmony/thinking format) [[reference_viz_wiki_narrative_2026_06_09]], and prewarming 120b is 65GB+ VRAM for marginal benefit. Left PIPELINE_MODELS at qwen2.5-coder:32b (the validated workhorse). Do NOT "upgrade" it to gpt-oss without re-validating the response format.

## Validated live
Both settings valid JSON, 1 ref each (C+H). /rgs -> clean `{continue:true,suppressOutput:true}` + wrote `qwen2.5-coder_32b.iso` cooldown stamp (reached the warm path); plain prompt -> silent. Settings out-of-repo (not a git artifact). Spec: `state/shared/specs/OLLAMA-SYNERGY-AUDIT-2026-06-09.md` (#8 marked SHIPPED).

## Remaining backlog (cross-chat now permitted; see spec)
#3 distill-tribal Q-A LLM unblock (tribal creation, ~70K tok/re-distill — bigger build: add gated LLM Q-A path; stale "Ollama not loaded as of 2026-05-08" guard CONFIRMED live), #4 WeeklySynthesisEngine resolver, #5 wiki-NLI-lint, #6 memo-synth-schedule (FREEZE-gated), #7 memo-cache-consolidate, #10 CLAUDE.md 7b->32b doc-fix.
