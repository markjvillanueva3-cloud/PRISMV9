---
name: feedback_auto_fix_and_blackwell_fleet_enforced
description: "Operator directive 2026-06-09 (FLEET-WIDE auto-enforced via hook): auto-fix/enhance issues inline as you come across them (don't defer), and build for the upgraded Blackwell box. Injected once/session by auto-fix-blackwell-doctrine-inject.mjs."
type: feedback
galaxy: ai-training
source: prism-memory
synced: 2026-06-27T20:30:46.399Z
aliases: feedback_auto_fix_and_blackwell_fleet_enforced
---


# Auto-fix inline + build-for-Blackwell — FLEET-WIDE auto-enforced (operator, 2026-06-09)

Operator directive (slot:india, 2026-06-09): *"automatically make adjustments and enhancements as you come across issues, remember that we upgraded pc specs — make this auto enforced fleet wide."*

Two behaviors every chat applies on every task:

1. **AUTO-FIX INLINE** — when you hit a bug / stale test / broken wiring / suboptimality DURING any task, fix it then-and-there. Do NOT defer it to a follow-up, do NOT merely report it. If the fix is net-beneficial and safe (incl. multi-chat: a peer-claimed surface → patch-sibling, don't fight for the tree), auto-build it. Same spirit as [[feedback_net_benefit_auto_build]].
2. **BUILD FOR BLACKWELL** — target the upgraded box: RTX PRO 6000 Blackwell 96GB + 9950X3D 32T + 136GB RAM + NVMe. Generous heaps (never fight a low default — e.g. node `--max-old-space-size`; a 384MB-heap OOM on a 136GB box is absurd), GPU-resident models, high concurrency. The gap is UTILIZATION, not capacity. Detail: [[feedback_build_for_blackwell_hardware]].

**Why:** Deferring small issues lets them rot and compound (the stale-test class — e.g. `pickModel` still asserting the retired `qwen2.5-coder:3b` long after BLACKWELL-MODEL-UPGRADE kept `:32b` as the floor). And building to pre-upgrade assumptions (small heaps, single-model, low concurrency) leaves the new hardware idle. Encoding this as a recalled memory alone is "when-relevant"; the operator wanted it *enforced*, every chat.

**How to apply:** The enforcement mechanism is `.claude/hooks/auto-fix-blackwell-doctrine-inject.mjs` (UserPromptSubmit, wired in settings.json after `master-index-precheck-inject`, mirrored C:→H:). It injects this doctrine ONCE per session per chat (session-gated, low-noise) so it anchors in context fleet-wide. Knob: `PRISM_AUTOFIX_DOCTRINE_DISABLE=1`. When you see the injected block, treat it as a live operator instruction: fix-as-you-go + size every build to the Blackwell box. Pairs with R13 (comprehensive route) + R15 (build it whole).

Live-validated 2026-06-09: hook registered in both settings.json (valid JSON), c-to-h-mirror confirmed, live-run emits the doctrine; 14/14 tests. Shipped in the same session as [[reference_local_llm_mcp_route_2026_06_09]] (the ask-ollama→MCP consumer wiring whose stale-test catch motivated formalizing this).
