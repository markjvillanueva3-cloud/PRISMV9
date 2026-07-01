---
title: FLEET-OLLAMA-ROUTING activation + MCP heap-divergence (2026-06-10, slot:tango)
type: learning
tags: [ollama, routing, rag, hybrid, cag, lora, mcp, heap, oom, commit-pressure, blackwell]
created: 2026-06-10
related:
  - "[[ai-synergy-audit-ms0]]"
  - "[[reference_ai_systems_6unit_complete_2026_06_11]]"
  - "[[reference_api_ratelimit_wsl_commit_2026_06_08]]"
  - "[[reference_mcp_boot_heap_oom_2026_06_09]]"
---

# FLEET-OLLAMA-ROUTING activation + MCP heap-divergence

Four units shipped on the `/goal` "improve AI systems (NN/GNN/LoRA/CAG/RAG/hybrids)
across all galaxies + synergize" + an operator pivot to "raise limits causing
api/oom errors". The theme: **charlie's 6-unit AI stack already BUILT the substrate;
this work ACTIVATED + tuned the dormant parts.**

## Units
- **U-FLOR-MODEL-EXPAND** (`a06de59033`) — registered the two newly-pulled installed
  models (qwen3-coder:30b, deepseek-r1:32b) in the cost-router `TIER_PREFERENCES.best`.
- **U-FLOR-HYBRID-DEFAULT** (`52b83b819f`, 3-of-3 PASS) — flipped the galaxy-reasoning-
  bridge dense/hybrid RAG arm from **opt-in → ON-by-default** via a pure `resolveDenseMode`
  predicate + R12 honest `dense-degraded` status. The fail-soft catch preserves the
  "no embed service ⇒ no regression" guarantee, so on-by-default is safe.
  **Live-validated:** `sources:[CLAUDE.md, retrieved-hybrid:5, ai-synergy-audit]` on
  the default path (was `retrieved:5` sparse). One bridge ⇒ all 34 galaxies.
- **U-FLOR-CODER-DEFAULT** (`904c32c193`) — `OllamaHookBridgeEngine` code hooks
  (ai_feature/code_explain/pattern_match/validation) repointed qwen2.5-coder:32b →
  **qwen3-coder:30b** (30B-A3B MoE). `defaultModel` stays 32b as the **install-gate
  floor** (`resolveInstalledModel` → candidate if installed, else default). 64/64 tests.
- **U-FLOR-MCP-HEAP** (`806423f1e5`) — see lesson below.

## LESSON 1 — a shared default drifts when one consumer overrides it
`ensure-heap-floor.mjs` once "unified" the MCP daemon + supervisor spawn-heap floors at
4096MB. Later the **supervisor** bumped to `PRISM_MCP_HEAP_FLOOR_MB || 24576` (24GB) but
the **daemon** kept calling `ensureHeapFloor(NODE_OPTIONS)` with **no floor** → the 4096
default. The paths re-diverged silently: a daemon-launched `:3100` got 4GB and OOM'd under
multi-agent load (the recurring outage) while a supervisor-launched one got 24GB. **Fix:**
the daemon now reads the SAME env → one knob tunes both. *When you raise a shared default
in one consumer, grep every other consumer of that default — they did not move with you.*

## LESSON 2 — verify the error CLASS before raising a limit (don't repeat a wrong dx)
Operator: "raise limits causing api errors — I used to launch more agents." A prior
*WSL-cap* diagnosis of this exact symptom was **proven wrong**
([[reference_api_ratelimit_wsl_commit_2026_06_08]]). Re-verified live: the "API error"
is **local ECONNREFUSED at high host commit** (190/291GB = 65.5%), NOT an Anthropic 429,
and the old ~88GB NIM committer is already gone. Real levers = **commit headroom**
(raise the H: pagefile — 2.7TB free, only 64GB now) + **bound Ollama resident models**
(the 54.7GB qwen2.5-coder:32b dominates commit). NOT the fix: WSL cap (verified correct),
`CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` (raising it spawns more agents → MORE commit + MORE
server-throttle). A third class — Anthropic "Server is temporarily limiting requests" on
wide fan-out — is fixed by *pacing*, not bigger local caps. *Three error classes wear the
same "API error" label; the fix for each is different, and one is the opposite of another.*
