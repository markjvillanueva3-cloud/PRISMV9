---
name: prompt-rewriter-fix-2026-05-24
description: "Fixed silently-broken prompt-rewriter-ollama (200/200 skip rate) — smallest-first cascade, 15s timeout, model+prompt caches, PSN-feed sidecar, and fail-loud health-warn companion hook"
aliases: reference_prompt_rewriter_fix_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.123Z
---


2026-05-24 alpha (slot:alpha, commit on slot/alpha). User asked "make sure it's working" — investigation found `prompt-rewriter-ollama.mjs` was **100% silently skipping** for hours (200/200 last calls failed; 106 ollama-offline + 94 timeout; rewrite=null on every entry). Classic R12 violation — the hook was designed to silently no-op on every failure path, so the user never knew the system was dead.

## Root causes

1. **WALL_TIMEOUT_MS=3000 was a hard ceiling** — even healthy `qwen2.5-coder:7b` averages 2s on a chat call, plus `/api/tags` adds 50-200ms; under 16-chat fleet load Ollama GPU contention pushes that to 5-10s.
2. **MODEL_PREFERENCE cascade was inverted** — tried `qwen2.5-coder:32b` (~15s) before `7b`; the cascade *itself* burned the entire 3s budget before the chat call.
3. **No model or prompt cache** — re-probed `/api/tags` every prompt; re-rewrote identical `/loop` re-fires.
4. **Operator-level state hidden** — Ollama `/api/chat` is dead RIGHT NOW (curl reproduces a >60s hang for a trivial 4-token reply) but the rewriter just degraded silently. No surface to the user.

## Fix (U-PRF01) — `prompt-rewriter-ollama.mjs`

- `WALL_TIMEOUT_MS=15000` (was 3000); settings.json harness timeout `16000` to give 1s buffer
- `MODEL_PREFERENCE` smallest-first (`1.5b → 3b → 7b → ... → 32b`)
- Per-session model cache at `state/shared/dashboards/ollama-rewriter-model-cache.json` (TTL 30 min)
- Prompt-hash dedup cache at `state/shared/dashboards/ollama-rewriter-prompt-cache.json` (TTL 10 min) — `/loop` re-fires reuse prior rewrite
- **PSN synergy**: successful rewrites with `confidence ≥ 0.75` append `goal + acceptance_criteria + scope` to `state/shared/dashboards/rewriter-psn-feed.jsonl` — picked up by `stop-obsidian-memory-feed` cycle, then master-index regen surfaces it on future prompts

## Fix (U-PRF02) — `prompt-rewriter-health-warn.mjs` (NEW)

UserPromptSubmit hook. Reads rewriter JSONL log, computes skip-rate across last `PRISM_REWRITER_HEALTH_WINDOW=50` entries, injects 1-line warning when rate ≥ `PRISM_REWRITER_HEALTH_FLOOR=0.85`. Wired in settings.json immediately after rewriter. 7 tests cover `summarizeRecent` contract.

Live smoke right now emits: *"⚠ prompt-rewriter-ollama is silently broken — Last 50 calls: 50 skipped (100%). Top reason: timeout (50/50)."* — exactly the R12 fail-loud the user needed.

## Operator action (out of code scope)

Ollama `/api/chat` and `/api/generate` are hung. `curl /api/tags` returns 200 (just metadata) but actual inference timed out >60s. Likely NIM GPU contention per [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] and the 16-chat fleet thrash pattern. Recovery: restart Ollama daemon or free GPU (check `nvidia-smi` for stuck NIM containers at ports 8000/8010/8020).

## Commit

`slot/alpha` — [PSN-PROMPT-REWRITER-FIX]/U-PRF01-U-PRF02. 3 files, 292 insertions, 16 deletions, 7/7 tests.

## Open follow-ups

- Once Ollama recovers, verify rewriter actually emits a rewrite block (smoke from session real prompt — should land in `cache/prompt-rewrites.jsonl` with non-null `rewrite`)
- Wire `rewriter-psn-feed.jsonl` consumer (next iter) — the file is written but no consumer reads it yet; `stop-obsidian-memory-feed` would need to be taught the new path

Linked: [[feedback_ollama_token_routing]] · [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] · [[reference_psn_injection_dedup_lib_2026_05_23]] (sibling injection-dedup pattern from same session)
