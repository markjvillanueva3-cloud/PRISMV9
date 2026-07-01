---
name: reference_cascade_defaults_retired_model_2026_06_09
description: "prism_ai's two_pass_cascade + cascade_run actions (aiReasoningDispatcher.ts) defaulted to the RETIRED qwen2.5-coder :3b/:7b/:14b small-GPU roster — un-pulled on the 96GB Blackwell → every cascade default requested a missing model and silently failed. Survived the U-BW retirement sweep because the no-retired-llm-refs.test.mjs source-lock scanned engines but NOT mcp-server/src/tools/dispatchers. Fix: repoint defaults to installed tiers (1.5b/gpt-oss:20b/32b) + add the dispatcher dir to SCAN_DIRS so the lock covers every dispatcher. Commit U-BW-DISPATCHER-SCAN."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.505Z
aliases: reference_cascade_defaults_retired_model_2026_06_09
---


**2026-06-09 (slot CHARLIE, synergy /goal — the literal #1 named surface: "synergize ollama, make sure we pulled correct models relative to gpu").**

**FINDING — a retired-model default that silently failed, hidden by a source-lock blind spot.** The `prism_ai` reasoning dispatcher's `two_pass_cascade` + `cascade_run` actions (`mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`) defaulted their cascade tiers to `qwen2.5-coder:3b` / `:7b` / `:14b` — the small-GPU roster RETIRED by U-BW-RESEARCH-REFINE (2026-06-04, `ollama rm`'d from the Blackwell host). Live `/api/tags` on this RTX PRO 6000 Blackwell (97887 MiB) pulls **qwen2.5-coder:1.5b + :32b, gpt-oss:20b + :120b, 4 VLMs, nomic-embed** — none of 3b/7b/14b. So every cascade default requested a model that isn't installed → the cascade silently failed (a plausible contributor to the chronic <30% Ollama offload take-rate the SessionStart banner reports at 0.4%).

**WHY IT SURVIVED the U-BW retirement sweep (the real lesson):** the anti-revert **source-lock** `scripts/no-retired-llm-refs.test.mjs` (the test that fails when any executable code re-introduces a retired tag) scanned `SCAN_DIRS = scripts + .claude/{hooks,helpers,scripts} + mcp-server/src/engines` — but **NOT `mcp-server/src/tools/dispatchers`**. The dispatcher tree was the one executable surface the lock never saw. The sweep retired the tags everywhere it LOOKED; the dispatcher was outside its gaze. Compounding: the cascade actions bypass `ModelRoutingEngine` (they call `OllamaClientEngine.generate()` directly via `makeOllamaTentacle`), so the catalog's pure-scorer install-gate (`DEFAULT_MODEL_CATALOG`, FLOOR-tiered so route() never prefers an unpulled model) never covered them either. Two safety nets, both blind to the dispatcher default path.

**FIX (commit `U-BW-DISPATCHER-SCAN`, 2 files):**
1. `aiReasoningDispatcher.ts` — repoint the 5 defaults to INSTALLED tiers: two_pass `cheap=qwen2.5-coder:1.5b / strong=qwen2.5-coder:32b`; cascade `cheap=qwen2.5-coder:1.5b / mid=gpt-oss:20b / strong=qwen2.5-coder:32b`. Per-tier `PRISM_TWOPASS_*` / `PRISM_CASCADE_*` env overrides unchanged.
2. `no-retired-llm-refs.test.mjs` — add `mcp-server/src/tools/dispatchers` to `SCAN_DIRS`. **Reuse the canonical guard, don't fork** (R8): I first drafted a standalone `ai-cascade-default-models.test.mjs`, then deleted it — extending the battle-tested lock (executable-position discrimination via `isViolation`, comment-strip, >50-file sanity floor) is strictly better than a weaker parallel test, and it now covers EVERY dispatcher. Also dodges india's stale-snapshot trap ([[reference_model_retired_test_stale_2026_06_08]]) — the lock asserts "no retired tag in executable position," never "this exact installed model must be present."

**HOW TO APPLY:** (1) When a source-lock / grep-guard exists, **verify its SCAN scope covers the surface you're policing** before trusting it — a guard that's green because it never looked is worse than no guard (cry-wolf's inverse: false-ALL-CLEAR). (2) The cascade actions bypass the model catalog, so "is this model pulled" is the only invariant that matters for them — validate cascade defaults against live `/api/tags`, not `DEFAULT_MODEL_CATALOG` (which legitimately carries un-pulled capability declarations with FLOOR tiers). (3) Blackwell installed roster as of 2026-06-09: coder 1.5b/32b · gpt-oss 20b/120b · VLMs qwen3-vl:8b(+instruct)/qwen2.5vl:7b/llama3.2-vision:11b/moondream · nomic-embed.

Related: [[reference_blackwell_model_retirement_2026_06_04]], [[reference_model_retired_test_stale_2026_06_08]], [[reference_grep_guard_must_police_call_and_array_positions_2026_06_04]], [[feedback_always_capture_lessons]].
