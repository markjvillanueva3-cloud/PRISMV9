---
name: system-synergy-loop-golf-2026-06-08
description: "Golf /loop /goal \"synergize the whole system node-by-node\". Progress ledger — iter1 fixed the Ollama cheap-tier roster gap on the 96GB Blackwell. Surface queue + per-iteration findings for loop continuity."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.961Z
aliases: reference_system_synergy_loop_golf_2026_06_08
---


2026-06-08 (slot golf, ultracode). /loop [10m] /goal: synergize ollama+docker+qdrant+obsidian+PSN+/system-viz+galaxies+frontend/backend+claude.md+memories+wiki+tribal+awareness+gsd+tdd+skills+scripts+hooks — clear = everything wired/tested/validated/synergized node-by-node. Cron job `2da3ccfc` (every 10m, session-only, 7-day expiry). loop-state target 20.

**Hardware (the "correct models relative to" baseline):** RTX PRO 6000 Blackwell **96GB VRAM**, **128GB RAM**, NVMe, OLLAMA_MODELS=`H:/Tools/ollama/models` (2TB free).

## Iter 1 — Ollama model-roster fitness (DONE, validated)
**Gap found:** cost-router (`.claude/hooks/lib/ollama-cost-router.mjs` TIER_PREFERENCES) `cheap` + `balanced` tiers referenced ZERO installed models → the down-walk escalated trivial classify/format/inventory tasks UP to `gpt-oss:20b` (14GB) — exactly the "32B for a one-word classify is pure latency waste" the tiering exists to avoid. `balanced` is intentionally promoted→strong on Blackwell (by design, fine); but `cheap` is NEVER promoted, so the missing cheap model was the real bug.
**Fix:** pulled `qwen2.5-coder:1.5b` (~1GB, 16s via the now-fixed resilient-pull). **Validated:** all 4 cheap categories now route to qwen2.5-coder:1.5b (tier=cheap, "target tier", not escalated); live smoke classified correctly at **221 tok/s**.
**Roster now complete (no zero-coverage tier):** cheap=qwen2.5-coder:1.5b · balanced→strong(promo) · strong=gpt-oss:20b · best=gpt-oss:120b · coder=qwen2.5-coder:32b · embed=nomic-embed-text · vision=qwen3-vl:8b(+instruct)/qwen2.5vl:7b/llama3.2-vision:11b/moondream:1.8b. 10 models, ~127GB on disk, all fit the 96GB GPU individually + 128GB RAM.

## Surface queue (next iterations — one concrete unit each, wire→test→validate)
- **docker** — verify compose services up (postgres/prism-server/prometheus/ollama/qdrant); `DOCKER_RUNTIME_STATE.json`. MCP was DOWN (:3100 ECONNREFUSED) at iter1.
- **qdrant** — vector store reachable + collections populated (prism-memory); embed pipeline live (nomic 768-d).
- **obsidian vault / PSN** — 11-leg health (memory auto-feed Stop hook, octopus consensus ledger).
- **/system-viz** — graph staleness (8.2h stale at iter1 — regen); ghost roosts.
- **galaxies / frontend / backend** — 90 unwired engines (see [[reference_unwired_engine_gap_audit_2026_06_08]]); 2 frontend merges pending.
- **claude.md / memories / wiki / tribal / awareness** — wiki↔tribal coverage 83.7% (6401 missing embeds); doc-drift.
- **gsd / tdd / skills / scripts / hooks** — hook errors fixed this session (hookify + dangling refs); tdd coverage.

## Doctrine
Each iter: ONE concrete unit to completion (real test + live validation), commit `[MAIN] [SYSTEM-SYNERGY]/U-...`, checkpoint here, loop-state tick. Don't boil the ocean per turn (context re-injects ~50% baseline each fire). Builds on [[gptoss-harmony-synergy-bug-golf-2026-06-08]].
