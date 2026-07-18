---
title: Golf (fleet-hygiene) Context Inventory — 2026-06-11
type: reference
galaxy: fleet-hygiene
slot: golf
created: 2026-06-11
tags: [fleet-hygiene, reaper, context-inventory, roi-queue, agent-tier, ollama-miner]
---

# Golf / fleet-hygiene — Context Inventory (2026-06-11)

Full categorized record: memory [[reference_golf_inventory_of_record_2026_06_11]] · handoff-mine + Ollama-miner appendix `state/shared/specs/GOLF-CONTEXT-INVENTORY-2026-06-11.md`.

Built two ways for cross-validation: ultracode Workflow `wf_2c7ce362` (4 miners over git+memories+dormant-audit+AI-posture, opus synth) **and** `wf_cc1f3500-64f` (6 sonnet agents over the 46 `HANDOFF-golf-*.md`) + the now-operational Ollama galaxy-miner (`mine-galaxy-transcripts.mjs --galaxy fleet-hygiene`, 23 sessions).

## Two governing facts
1. **Reaper is DISABLED** (operator, 2026-06-11) — `PRISM_FLEET_REAPER_DISABLE=1` + `PRISM_GOLF_GUARDIAN_DISABLE=1`. `stale-node-hunter findStaleOrphanedNodes` (`01220f8a5f`) was reaping **legit idle fleet node.exe** (RSS=0/sub-5MB). Do NOT re-launch until hardened (cmdline-allowlist + age-floor + ancestry-depth). [[feedback_reapers_disabled_2026_06_11]]
2. **AGENT-TIER-MS0 is built but stranded** — Ollama→Haiku→Sonnet→Opus tier router (U-AT01-03, 20 tests) on `slot/golf` only; not merged/wired to live. The operator-requested cost/offload lever.

## ROI-ranked queue (head)
1. Harden `stale-node-hunter` → re-enable reaper (golf core duty offline).
2. Merge + wire **AGENT-TIER-MS0** to live (pure activation; the offload lever).
3. **U-MCP-FACTORY-REFACTOR** (P0, live MCP leak; factory-per-session; first attempt reverted).
4. **U-RAG-1** index key-unify + locking (operator decision; blocks RAG-3 + GNN feed; 369MB index integrity).
5. GIT-INFRA push (corrupt tree `e36809bbd2`, real-terminal fsck).
6. L8-P0/P1/P2-MS2 · U-FD02→05 · U-SR05/06 · U-BIBRYAM-1/4/6.

## Stale-claim corrections (shipped, do NOT re-queue)
INFRA-CONSENSUS-WIRE-MS0 (8 commits) · INFRA-AGI-ROUTER-MS2 (13) · U-BIBRYAM-3 noise-filter · gpt-oss:120b pull (present in `/api/tags`).

## AI-systems (india/zulu) status
Reasoning bridge **live** (`galaxy-reasoning-bridge.mjs fleet-hygiene`, qwen2.5-coder:32b, hybrid RAG over the galaxy brain). Golf now emits LoRA pairs (`state/shared/lora/bridge-reasoning/fleet-hygiene.jsonl`). 6 documented improvements (reasonForGalaxy wiring, capability-probe model gate, LoRA emit, GNN active-pool feed, octopus-outcomes publish, zulu cross-slot work-orders) in the memory of record.

## See also
[[fleet-reaper-ms1]] · [[fleet-task-health-ms0]] · [[ai-synergy-audit-ms0]] · [[feedback_golf_owns_reaper]]
