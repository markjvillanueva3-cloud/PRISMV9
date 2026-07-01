---
name: reference_ollama_task_router_dedup_2026_06_09
description: "U-OAB-U8 (task->model router) was a DUPLICATE of the existing OllamaTaskOffloaderEngine.ts — caught by the pre-write dedup gate; corrected scope for the Ollama auto-routing build"
type: reference
galaxy: hermes-zulu
source: prism-memory
synced: 2026-06-27T20:30:46.682Z
aliases: reference_ollama_task_router_dedup_2026_06_09
---


# Ollama task-router was a duplicate — dedup catch (2026-06-09, slot:bravo)

The ultracode workflow synthesis for the Ollama-autorun goal proposed **U-OAB-U8 `scripts/lib/ollama-task-router.mjs`** — a frozen task-class→model TABLE + `classifyTask`/`selectModel` + safety deny-list. The **pre-write graph dedup gate** flagged `ollama-auto-router` / `ollama-task-offloader`, and verification against MAIN (not the stale slot worktree, per [[reference_bravo_verify_against_main_not_worktree_2026_05_29]]) found the conflict:

**`mcp-server/src/engines/OllamaTaskOffloaderEngine.ts` ALREADY does task→model routing** — it has `classifyTask(task)`, `selectModel(category)`, the same `gpt-oss:120b / gpt-oss:20b / qwen2.5-coder:32b` roster (with avgLatencyMs + capabilities; qwen:7b/:14b RETIRED 2026-06-04), and `KEEP_ON_CLAUDE_PATTERNS` checked FIRST (safety: create/edit/refactor/reasoning/physics → cloud). It selects by capability + ascending latency. So a hardcoded frozen-table `.mjs` sibling would be a **fork** (R7: two routers that drift = worst outcome). U8 draft was REMOVED uncommitted (never shipped).

## Corrected scope for the Ollama auto-routing build
- **DO NOT** ship a parallel `.mjs` routing table. The canonical router is `OllamaTaskOffloaderEngine.ts`.
- **Single-source problem:** the per-class table lives in the compiled `.ts` engine, NOT a data artifact; `route-config.json` only carries the floor (`mode:auto, model:qwen2.5-coder:32b`). The `.mjs` script layer (U5b/U6/U7 + the offload-enforce hook) can't import the `.ts` engine at runtime. Clean reconciliation = extract the routing table to a shared `.json` both layers read — a **MAIN-TREE change**, GATED (slot/bravo-only + stale tree). Defer to go-live.
- **Genuinely net-new (no duplicate), still buildable on slot/bravo:**
  - **U10 capability probe** — per-model a/b/c (loads / correct-output-not-just-200 / auto-selected). No existing per-model probe (there's `OllamaOffloadDashboard` + `isAvailable`, not this). Highest-value remaining piece: directly proves "the most powerful local LLMs actively run + auto-run per task."
  - **U9 co-residency** — `RECOMMENDED_ENV` + keep_alive hints + hard-reason mutex. New, but env can't be APPLIED without the gated service edit (lower standalone value).
- **UNVERIFIED finding to check at go-live:** does `OllamaTaskOffloaderEngine.selectModel` (sorts by latency) ever route a tool-LOOP task to qwen2.5-coder:32b, which text-emits and does NOT do structured tool_calls (verified [[reference_ollama_tool_agent_findings_2026_06_09]])? If "capable" isn't constrained to the gpt-oss family for tool tasks, that's a latent silent-break. NOT confirmed — read the capability→category mapping before claiming.

Lesson: even a multi-agent ultracode synthesis can propose a duplicate — the workflow agents read the route-config + the `.mjs` siblings but did NOT find the `.ts` engine. Always run the dedup gate against MAIN before building the "foundation" unit, not after. The build-incorporation spine (U5b/U5c/U6/U7) is committed + isolated on slot/bravo; the routing half is mostly an EXISTING engine, not a greenfield build.
