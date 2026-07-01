---
name: reference-ollama-cost-routing
description: "U-P4-OLLAMA-COST-ROUTING (SYSTEM-VIZ-BRAIN-MS0). Cost-aware Ollama model selection via category→tier→model decision. Replaces hardcoded preference list in ollama-task-offloader's selectBestModel. Completes Phase 4 (3/3)."
source: prism-memory
synced: 2026-05-18T01:02:09.627Z
aliases: reference_ollama_cost_routing
---


# ollama-cost-routing — category-aware Ollama model tiering

User directive (SYSTEM-VIZ-BRAIN-MS0/U-P4-OLLAMA-COST-ROUTING): the existing `ollama-task-offloader.mjs` UserPromptSubmit hook's `selectBestModel()` returned the first match from a SINGLE hardcoded preference list `[qwen2.5-coder:7b, qwen2.5-coder:14b, codellama:7b, deepseek-coder:6.7b, llama3.2:3b]` — applied identically to a trivial 1-line classify and a 1k-line scaffold. No tier awareness, no cost proxy. This unit closes the gap.

## Files (shipped across 2 commits)

- **`831d04c2b` — lib + offloader wiring** (this session, slot bravo claude-a61bbf34)
  - `.claude/hooks/lib/ollama-cost-router.mjs` — NEW pure `routeModelForTask({category, available}) → {model, tier, reason}` + frozen `TIER_PREFERENCES` / `CATEGORY_TIER` / `TIER_ORDER` constants. ~125 lines.
  - `.claude/hooks/ollama-task-offloader.mjs` — 3 surgical edits: import `routeModelForTask`, remove legacy `selectBestModel` (left a 3-line pointer comment, NOT dead code), propagate `route.tier` + `route.reason` into `recordOllamaEvent` extras as `modelTier` + `modelReason`. FLEET-REAPER-MS1 routing-hint extras preserved by spread-merging both signals (`costExtras` always present; hint fields layered on top when `hintFlippedOutcome`).
- **`173f6305b` — test (peer-absorbed)** (peer slot's merge commit, NOT this chat)
  - `.claude/hooks/__tests__/ollama-cost-router.test.mjs` — 22 `node:test` hermetic cases, 135ms green. Uses node's built-in test runner because the repo's vitest harness is currently broken (`vitest/config` resolve fail, documented in [[reference_fleet_reaper_ms1]]).

## Tier ladder + algorithm

| Tier | Params | Models | Categories |
|------|--------|--------|------------|
| `cheap` | <4B | qwen2.5-coder:1.5b → llama3.2:3b → qwen2.5:3b → phi3:mini | format_convert · prism_inventory · prism_introspect · classification |
| `balanced` | 4-8B | qwen2.5-coder:7b → codellama:7b → deepseek-coder:6.7b → qwen2.5:7b | summary · explanation · documentation · git_summary · prism_audit · search_synthesis · (default fallback for unknown categories) |
| `strong` | 13-15B | qwen2.5-coder:14b → deepseek-r1:14b → qwen2.5:14b → deepseek-coder:33b-instruct | (no default; reached only via escalation from balanced) |
| `best` | 30B+ | qwen2.5-coder:32b → deepseek-coder-v2:16b → qwen2.5:32b | (no default; reached only via escalation) |

**Algorithm (load-bearing invariant):**
1. Resolve category → target tier (default `balanced`).
2. Search target tier's preference list first-match-wins.
3. **Escalate UP only** when target tier is empty: cheap → balanced → strong → best.
4. **Never de-escalate** — if a balanced task only finds a cheap model installed, return `{model: cheap-model, tier: "fallback"}` so the caller can audit the mismatch. Returning `{tier: "cheap"}` would silently downgrade quality.
5. Last-resort fallback to `available[0]` with `tier: "fallback"` preserves prior "pick something" behaviour.

## Live host (verified 2026-05-15 via `/api/tags`)

Installed on MarkV: `qwen2.5-coder:7b`, `qwen2.5-coder:14b`, `qwen2.5-coder:32b`, `deepseek-r1:14b`, `llama3.2-vision:11b`, `nomic-embed-text:latest`. NO cheap-tier models installed — every cheap task escalates to balanced on this host (intentional; tested explicitly in `live-host coverage` test case).

`deepseek-r1:14b` is in strong tier preferences after `qwen2.5-coder:14b` (per [[reference_local_llm_routing]] — reasoning workhorse).

## Per-file scrutiny gate verdict (3-file cohesive build)

**Reviewer A (subagent_type=code-analyzer)**: PASS. Walked escalation loop bounds (no off-by-one, every branch reachable), verified `{model, tier}` consistency invariant (always set from same TIER_ORDER[i] iteration), confirmed FLEET-REAPER hint extras preserved when hint flipped, confirmed `route.model` null-deref impossible at offloader's use site (gated by `isOllamaAvailable`). 2× P2/P3 deferrals (dashboard `fallback` alert not yet wired; null-model `(null)` rendering theoretically possible but unreachable).

**Reviewer B (subagent_type=reviewer, independent)**: PASS. Mental-walked the "never de-escalate" test fixture line by line, confirmed `Object.freeze` covers all mutation paths (top + inner arrays), confirmed no remaining caller of `selectBestModel`, confirmed test's KEEP-IN-SYNC deepEqual is the load-bearing CATEGORY_TIER guard. 1× P2 (test asserts membership not direction — but deepEqual locks the table, so it catches direction-flips too).

All P0/P1: zero. All P2/P3 deferred to handoff. Ship cleared.

## Telemetry surface

Every offload event now carries `extras: { modelTier, modelReason, ... }`. The dashboard at `scripts/ollama-offload-dashboard.mjs` reads `events[].extras` — additive change, no consumer iterates keys exhaustively, no breakage. Future audit query: count `events[].extras.modelTier === "fallback"` per host to surface un-curated installs.

## 6th shared-tree commit-collision-absorption of this session

The peer's `173f6305b` merge commit absorbed my test file (255 lines) BUT not the lib it imports — leaving HEAD with a broken import for ~7 minutes until `831d04c2b` repaired it. Same pattern as [[reference_u_ppl_d5_bridge_shipped]]. Mitigation: stage with `PRISM_GIT_ADD_LANE_DISABLE=1` (slot drift defeated the lane guard), commit with `[MAIN]` prefix to override `worktree-commit-route`. Tolerate one absorption, re-stage promptly. Fork to a slot worktree before any 2+ unit run per [[feedback_conflict_fork_rule]].

## Knobs

- `OLLAMA_URL` — unchanged from offloader (default `http://127.0.0.1:11434`).
- No new env knobs added — tier table is part of the library, not env-tunable.

## Related

- [[reference_token_budget_telemetry]] — sibling unit in SYSTEM-VIZ-BRAIN-MS0/Phase 4 (token-budget JSONL telemetry, same per-file scrutiny pattern, same per-session slot-pinning)
- [[reference_fleet_reaper_ms1]] — the Phase 2 coordinator whose `loadRoutingHint()` contract this unit had to preserve when refactoring the offloader's event extras
- [[reference_ollama_pipeline_ms0_2026_05_15]] — the OLLAMA-PIPELINE-MS0 milestone the offloader already serves (no conflict; this is additive)
- [[reference_local_llm_routing]] — current host's actual model install (informs the tier preference order)
- [[feedback_parallel_scrutiny_per_file]] — gate doctrine satisfied here
- [[feedback_conflict_fork_rule]] — the shared-tree absorption pattern this unit hit (6th time this session)
- [[feedback_reflect_all_changes_post_update]] — close-out 4-surface rule


## Related
[[dispatchers/prism_inventory|prism_inventory]] • [[dispatchers/prism_introspect|prism_introspect]] • [[dispatchers/prism_audit|prism_audit]] • [[skills/hooks|/hooks]] • [[skills/lib|/lib]] • [[skills/ollama-cost-router|/ollama-cost-router]] • [[skills/ollama-task-offloader|/ollama-task-offloader]] • [[skills/config|/config]] • [[skills/api|/api]] • [[skills/tags|/tags]]