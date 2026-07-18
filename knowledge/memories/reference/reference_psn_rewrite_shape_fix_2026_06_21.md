---
name: reference_psn_rewrite_shape_fix_2026_06_21
description: "PSN savings aggregate miscounted 349 structured-OBJECT prompt rewrites as misses (string-only check) -> rewriter reported 100% dead. Fixed object->hit (0 savings, augmentation not compression). CORRECTS the 2026-06-19 \"rewriter fully dead, 0h is honest\" memory."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.135Z
aliases: reference_psn_rewrite_shape_fix_2026_06_21
---


# PSN prompt-rewrites shape miscount FIXED + R12 correction of prior memory (2026-06-21, slot:alpha)

**Commits:** `6b78070b28` (fix) + `9b593fc6b4` (3-of-3 P2 hardening). File: `scripts/lib/psn-savings-aggregate.mjs` (LIVE H:/prism copy per the cross-tree caveat) + `scripts/__tests__/psn-savings-aggregate.test.mjs` (14/14). 3-of-3 PASS.

**Bug.** `summarizeJsonl` credited a `prompt-rewrites` HIT only when `rewrite` was a non-empty STRING. The live rewriter (`.claude/hooks/prompt-rewriter-ollama.mjs:365`) writes `rewrite` as a STRUCTURED OBJECT on success (`{goal,scope,acceptance_criteria,implicit_constraints,file_paths,variability_axes,confidence}`). So all **349** real structured rewrites in `.claude/cache/prompt-rewrites.jsonl` (2035 lines) were classified as misses -> the SessionStart savings headline reported the rewriter as `0h` (100% dead). Same under-reporting bug class as the ollama-offload visibility/success-rate work this session.

**R12 CORRECTION of [[reference_prompt_rewriter_dead_and_loopdirective_skip_2026_06_19]].** That memory concluded `rewriter 0h ... is HONEST, not a measurement bug` because "every prompt-rewrites.jsonl line is rewrite:null". That was WRONG — it sampled only recent null lines and missed the 349 object successes. The rewriter is NOT fully dead: it produces real structured rewrites whenever a chat model is warm; the `0h` was a genuine shape-mismatch measurement bug, AND separately the rewriter is hampered by `no-model` skips when the coder model isn't resident. Both true. (Verified live this session: `qwen2.5-coder:32b` IS resident in `/api/ps` and `pickLoadedChatModel` returns it, so the no-model floods predate the keep_alive warmth.)

**Fix (3-shape classification, honest).** (1) non-empty STRING -> hit + `(rawLen-newLen)/4` compression savings (legacy, kept). (2) non-skip non-empty OBJECT with NO `skip_reason` -> HIT, `savedTokens += 0` -- the structured rewrite is injected as `additionalContext` (augmentation, NOT input substitution; the raw prompt remains authoritative), so crediting a char-delta would be the exact R12 OVER-credit [[reference_psn_aggregate_schema_mismatch_2026_06_12]] warns about. (3) `null` / `""` / `{skip:true}` / `{}` / object-with-`skip_reason` (e.g. low-confidence self-reject, logged with full object at prompt-rewriter-ollama.mjs:357) -> miss. LIVE before/after: prompt-rewrites `hits 0 -> 349`, `savedTokens` stays honest `0`.

**Doc-accuracy note (3-of-3 arm C P2#1, NOT a code defect).** The live SessionStart headline is built by `stop-psn-savings-aggregate.mjs` from a **500KB tail-read** window (lines 36/68), so it surfaces only the recent slice (~27h) for prompt-rewrites, NOT the full-history 349. The "349" is the full-file figure. Raising/streaming that tail-read cap is a separate deferred unit.

**Lesson.** A savings/telemetry classifier must match the producer's ACTUAL output shape -- a string-only check silently zeroed a feature that emits objects. Verify the producer's emit shape (read the writer) before trusting a "feature is dead" headline (sibling of the ollama ask-hermes invisibility + the "existence != content" doctrine). And when correcting a metric, count the real activity (hit) but NEVER fabricate the savings number (under-credit > over-credit for a trust metric).

**Deferred (next):** (1) raise/stream the 500KB tail-read so the live headline reflects full history. (2) revive the rewriter's `no-model` path (it needs a warm chat model; keep_alive now holds qwen2.5-coder:32b, but the 8s WALL_TIMEOUT_MS is borderline for a 32b chat rewrite -- and the hook may block the prompt, so a timeout bump needs latency validation). (3) decide whether prompt-rewrites belongs in the SAVINGS aggregate at all vs a separate "grounding activity" metric (it saves 0 input tokens by design).
