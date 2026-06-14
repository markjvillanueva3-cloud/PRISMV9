---
title: "Source-lock blind spot: dispatcher model defaults survived the Blackwell retirement"
name: source-lock-blind-spot-dispatcher-model-defaults
kind: lesson
status: authored
category: lessons
domain: ai-routing
source_refs: 3
related:
  - reference_cascade_defaults_retired_model_2026_06_09
  - reference_blackwell_model_retirement_2026_06_04
  - reference_model_retired_test_stale_2026_06_08
  - reference_grep_guard_must_police_call_and_array_positions_2026_06_04
---

# Source-lock blind spot: dispatcher model defaults survived the Blackwell retirement

**Slot charlie · 2026-06-09 · commit `U-BW-DISPATCHER-SCAN`**

## The bug

`prism_ai`'s `two_pass_cascade` + `cascade_run` actions (`mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts`) defaulted their cascade tiers to `qwen2.5-coder:3b / :7b / :14b` — the small-GPU roster that `U-BW-RESEARCH-REFINE` (2026-06-04) **retired** (`ollama rm`'d from the 96GB RTX PRO 6000 Blackwell). Live `/api/tags` pulls only `qwen2.5-coder:1.5b / :32b`, `gpt-oss:20b / :120b`, four VLMs, and `nomic-embed` — **none of 3b/7b/14b**. So every cascade default requested a model that isn't installed → the cascade **silently failed** (a plausible contributor to the chronic <30% Ollama offload take-rate).

## Why it survived the retirement sweep — the real lesson

The anti-revert **source-lock** `scripts/no-retired-llm-refs.test.mjs` fails the moment any executable code re-introduces a retired tag. But its `SCAN_DIRS` was `scripts + .claude/{hooks,helpers,scripts} + mcp-server/src/engines` — **not `mcp-server/src/tools/dispatchers`**. The dispatcher tree was the one executable surface the lock never looked at. The U-BW sweep retired the tags everywhere it *looked*; the gap was a surface outside its gaze.

Compounding it: the cascade actions **bypass `ModelRoutingEngine`** (they call `OllamaClientEngine.generate()` directly via `makeOllamaTentacle`), so the catalog's pure-scorer install-gate — `DEFAULT_MODEL_CATALOG`, deliberately FLOOR-tiered so `route()` never prefers an unpulled model — never covered them either. **Two safety nets, both blind to the dispatcher default path.**

## The fix

1. Repoint the 5 cascade defaults to installed Blackwell tiers (`qwen2.5-coder:1.5b` / `gpt-oss:20b` / `qwen2.5-coder:32b`); per-tier `PRISM_TWOPASS_*` / `PRISM_CASCADE_*` env overrides unchanged.
2. **Extend the canonical guard, don't fork it** — add `mcp-server/src/tools/dispatchers` to `SCAN_DIRS` so the lock permanently polices every dispatcher. (A first-draft standalone test was deleted: reusing the battle-tested `isViolation` matcher + comment-strip + >50-file sanity floor beats a weaker parallel test, and it dodges the stale-snapshot trap — see [[reference_model_retired_test_stale_2026_06_08]].)

## Generalizable rules

- **A green grep-guard / source-lock is only trustworthy if its scan scope covers the surface you rely on it for.** A guard that is green *because it never looked* is a false ALL-CLEAR — worse than no guard. When trusting a lock, verify its `SCAN_DIRS` (or equivalent) includes the tree you care about.
- **The dispatcher tree is executable and must be policed like engines.** Retirement / deprecation sweeps that scan `engines` but not `dispatchers` leave a live default path uncovered.
- **A model default that bypasses the catalog must be validated against live `/api/tags`, not against `DEFAULT_MODEL_CATALOG`** — the catalog legitimately carries un-pulled capability declarations with FLOOR tiers; "is it pulled" is a different question than "is it declared."

## Verify

```bash
node --test scripts/no-retired-llm-refs.test.mjs   # 3/3, now scans dispatchers
```

Memory: [[reference_cascade_defaults_retired_model_2026_06_09]]. Context: [[reference_blackwell_model_retirement_2026_06_04]].
