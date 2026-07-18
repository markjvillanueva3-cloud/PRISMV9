---
name: reference_highvalue_discovery_2026_06_08
description: "Ultracode discovery (workflow wi5silr6x, slot:alpha) — ranked 11-item PRISM build queue across token-savings/context-retention/local-LLM-Blackwell. Meta-theme: infra is built+firing but conservative defaults (suggest-not-act, no-dedup, single-not-batch, Claude-only) tuned for the OLD PC leave value on the table. Spec: state/shared/specs/HIGHVALUE-DISCOVERY-2026-06-08.md."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.607Z
aliases: reference_highvalue_discovery_2026_06_08
---


**High-value system-improvement discovery (2026-06-08, slot:alpha, ultracode workflow `wi5silr6x`).** The /goal requirement-(5) deliverable — 3 evidence-grounded lenses (token-savings · context-retention · local-LLM/Blackwell) + synthesis, ~1.0M subagent tokens, 50 repo tool-uses. Full ranked queue: **`state/shared/specs/HIGHVALUE-DISCOVERY-2026-06-08.md`**.

## Meta-theme (the key insight)
Infrastructure is built + firing, but **conservative defaults — suggest-not-act, no-dedup, single-not-batch, concurrency=4, Claude-only — were tuned for the OLD memory-pressured PC.** Blackwell (RTX PRO 6000 96GB) + resident local LLMs + the proven `injection-dedup` lib invalidate those assumptions. **Most of the queue is flipping defaults the infra already supports, not new builds.**

## Top items
- **#1 (cleanest first ship):** adopt `injection-dedup` in 9 per-slot domain injectors + `psn-leg-state-inject` (10 hooks, all import it 0×) — direct ×10 replication of THIS session's `U-SLOT-DOMAIN-DEDUP`. ~5–12K tok/slot/session.
- **#3 (SINGLE BIGGEST LEVER):** flip `ollama-route-pretooluse` to `mode:"auto"` (one config flag) → fleet offload 11%→30%+ target, ~3M tokens. Live: 599 fires, 592 kept, 2 auto-routed already saved 34.5K.
- **#2:** wire the orphaned MEMORY_SEED reader into `session-start-auto-resume` (producer built, 0 consumers — every Stop distills it, resume discards 100%).
- **#6:** compact-resume `--terminal`→`--slot` fix (can silently resume a peer's handoff + 921-file scan-storm) — the refined "F2" lead.
- **#7:** batch embeddings via `/api/embed` on Blackwell (unblocks GNN ref-pool growth). **#8:** extend F3 semantic recall to prompt/SessionStart turns (currently Edit-only).

## Dependency order
#1 → #2 → #3 → #4(reuses #1) → #5(reuses #3) → #6(after #2) → #7 → #8(extends F3) → #9 → #10 → #11. Before #8, converge F3 onto A6's int8 sidecar (see [[reference_memo_semantic_recall_f3_2026_06_08]] R8 note).

## Execution status (2026-06-08, slot:alpha — same session)
- **#1 COMPLETE** — `dedupedContext()` helper (`scripts/lib/injection-dedup-emit.mjs`, 7/7 tests, commit `1f295f51e6`) adopted across ALL 8 per-prompt injectors (psn-leg `eefef0359a`; foxtrot/delta/xray `8d2b6cf8e0`; whiskey/charlie-awareness/echo-post `87e96fa485`; charlie-knowledge `afe169ab0e`) + slot-soul/slot-domain earlier. Live cuts 82–95%.
- **#2 COMPLETE** — MEMORY_SEED reader wired into `session-start-auto-resume.mjs` (`extractMemorySeed`, both compact + boot paths, commit `2c006fec7c`, 51/51 tests). Closed the producer-with-zero-consumers orphan.
- **#3 ALREADY DONE / discovery was WRONG** — `mcp-server/data/state/ollama-route-config.json` is already `mode:"auto"` (since 2026-05-22, resident model since 2026-06-04). The agent read the wrong path. "592 kept" = the intentional conservative `isGistSafe` allowlist, NOT suggest-mode. NO config change made. Real (risky) lever = widening the allowlist per-extension, which the author deliberately avoided. Spec corrected.
- **Remaining:** #6 (compact-resume `--terminal`→`--slot`), #7 (batch `/api/embed`), #8 (extend F3 semantic recall to prompt turns — converge onto A6 int8 sidecar first), #9/#10/#11.

This discovery VALIDATES the session's shipped work (#1 = the dedup pattern shipped; #8 = extends F3) and is the next-fire build queue. Related: [[reference_slot_domain_dedup_2026_06_08]] · [[reference_memo_semantic_recall_f3_2026_06_08]] · [[reference_autoresume_stale_window_f5_2026_06_08]] · [[reference_alpha_hybrid_memory_retrieval_a6_2026_05_29]].
