---
name: reference_ultracode_highvalue_discovery_2026_06_09
description: "Fresh ultracode multi-domain discovery (Workflow wgypolzah / wf_0bc8c5f8-b50, 5 agents, 1.04M tokens, 564s) over LIVE PRISM telemetry -- 4 lenses (token-savings, context-retention, obsidian-vault-value, local-LLM/Blackwell) -> 1 ranked dependency-ordered ROI queue with slot-lanes. TOP ALPHA-NOW: #1 pre-*-graph-inject dedup (~6-9k tok/session/chat). TOP FLEET: 32,630 dark wiki embeds (BLOCKED on V8-cap sharding -> india/sierra). 7 alpha-now items, 7 DEFER-to-bravo (ollama routing), 3 out-of-lane. The next-fire build queue."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.230Z
aliases: reference_ultracode_highvalue_discovery_2026_06_09
---


# Ultracode high-value discovery -- ranked improvement queue (2026-06-09, slot:alpha)

Ran the goal-directed ultracode Workflow `wgypolzah` (run `wf_0bc8c5f8-b50`): 4 parallel
lens agents over LIVE telemetry + 1 synthesis. The standing /goal's "use ultracode ...
find high value token savings + context retention + vault value" discovery clause.
Plain-text agents (no schema, per [[reference_alpha_explore_agent_schema_incompat]]).

## ALPHA-NOW ships (ranked by ROI; reuse proven libs -- do NOT build new engines)
1. **pre-*-graph-inject self-hit suppression + per-session top-hit gate** (claimed ~6-9k tok/session/chat). S. Wire `scripts/lib/session-once-gate.mjs` + `scripts/lib/injection-dedup-emit.mjs` across the 4 pre-*-graph-inject hooks. Same pattern as [[reference_slotbundle_dedup_2026_06_09]]. **TOP ALPHA-NOW SHIP -- BUT VERIFY THE PREMISE FIRST (R8/R12):** `pre-read-graph-inject` ALREADY has per-path-per-session dedup (observed LIVE this session: `🔁 [pre-read-graph-inject:db273e77:...] dedup -- block unchanged since prior prompt; not re-injected`). So the ~6-9k claim is likely OVERSTATED -- the real remaining waste is (a) self-hit suppression (top graph-hit == the file being Read/Grepped == low-value self-reference) and (b) the pre-grep/pre-write/pre-edit siblings if they lack the gate pre-read has. Re-measure per-hook before building; do NOT trust the agent's headline ROI.
2. **Wire `subagent-stop-verifier.mjs` into SubagentStop** (0 refs today). S, pure settings.json registration. Catches the R12 "I wrote X / X doesn't exist" false-summary class; also unblocks #4.
3. **Embed-progress live denominator** -- the honesty half SHIPPED this session ([[reference_ollama_vision_single_source_2026_06_09]] sibling commit 89146678bf = classifyEmbedProgress). REMAINING: the marker's `toEmbed:6609` baked count vs live audit. VERIFY FIRST (R8): 6609=vector-index-missing vs 32,630=tribal-coverage-missing may be DIFFERENT indexes -- the agent may have conflated them. Confirm before "fixing".
5. **Consolidate the large-Read advisory layer** (R7 conflict: 3 hooks nudge the same large Read). M. Keep route-suggest `isLargeRead`; suppress `read-auto-limit` dup (1175 redundant fires); promote `wiki-read-offload-advisory` advisory->local-extract for >8KB knowledge files.
6. **Append slot-scoped commits + scrutiny verdicts to MEMORY_SEED** (`handoff-memory-seed.mjs:107-134`). S. Git-grounded "DO NOT REBUILD" list -- attacks re-derivation.
7. **Per-slot domain-awareness SessionStart injectors: shared session-once gate** (9 hooks, half lack it; ~1.8k tok/session/slot). M, clone-don't-fork all 9 (R15).
8. **CAG cold-cache anchor reaper** (2,513 files, 58% stale, 1,467 reapable). S, `--reap` on `cag-stats-aggregator.mjs` (golf coordinates cron).
9. **route-suggest rtk-false-positive + footer gate** (`isVerboseBash` nudges rtk on already-rtk cmds, 691 fires; ~2k tok/session). S, `mcp-route-suggest.mjs:429`.
10. **CAG declared-vs-actual size drift warn** (CLAUDE.md +88% over declared cache-boundary -> prompt-cache reuse degraded). S, pairs with #8 (same file).

## Gated / higher-effort (alpha)
- #4 Subagent-findings sink -> 4th MEMORY_SEED source (M, gated on #2). #11 route-pretooluse structured-EXTRACT tier (M-L, ~300-400k tok/24h, HIGH uncertainty -- needs A/B + bravo-adjacency check; extract-not-summarize safety invariant).

## DEFER-to-bravo (ollama-engine-routing -- R7, do NOT build in alpha)
prompt-rewriter re-route (#12, 0/445 takeup) - ollama-task-offloader payload-strip (U5) - ollama-prism-bridge native tool-calling (U5b, biggest single sink) - ModelRoutingEngine FLOOR realign (U3) - AISystemRouter local-first hop (U4) - ask-ollama draft/gen-test modes (U6) - handoff-body local compaction (U5/U6).

## OUT-OF-LANE / route (don't auto-claim)
- **TOP FLEET ITEM: 32,630 missing wiki embeds (83.2% dark vault)** -- highest RAW ROI (~5x largest single recall gain) but L + HARD-BLOCKED on V8 512MiB string-cap index **sharding** (write side throws -- see [[reference_tribal_index_v8_string_cap_2026_06_08]]). Owner: **india/sierra** (GPU embed). Sharding is the prerequisite.
- Hermes->Obsidian bridge dead-source repoint (TIER-4 operator-gated). tribal-distill local-LLM draft (cross-lane).

## Direct surface verification (this turn -- the goal's named-surface clauses, executed not deferred)
- **/system-viz EXECUTED:** `system-viz-query.mjs find` OOMs at ~380MB heap (heap-fragile find path) -- the CHEAP-NODE-ACCESS `node-card` SEEK path is the non-OOM surface ([[reference_cheap_node_access_ms0_2026_06_04]]). Real reliability finding -> owner sierra.
- **PSN analyzed (live numbers):** 477,500 tokens saved cumulative; 1019 hits / 385 nudges / 5301 misses across 6 ledgers (rtk-savings, prompt-rewrites, pre-tool-savings-multi, read-auto-limit, rtk-adoption, nav, injection-dedup-cache). Top rtk (934 hits); injection-dedup-cache only 26 hits + read-auto-limit 24h/1175m -- LIVE corroboration of discovery #1 (more dedup wiring) + #5 (large-Read consolidation, ~1175 wasted fires).
- **Obsidian H-drive wiring VERIFIED:** C: auto-memory 3,262 .md -> H: knowledge/memories 13,832 .md (feed live, H: 4.2x superset). The "fully wired + synergized to the H drive" clause is operational.
- **/hermes-workflow:** the multi-agent orchestration machinery -- exercised THIS session AS the ultracode discovery Workflow (5 agents, 1.04M tok). Fleet orchestration proper is zebra/bravo lane.

**Next fire:** ship #1 AFTER re-measuring its premise (pre-read-graph-inject already dedups -- see #1 caveat). Then #2 (pure registration). Pairs with [[reference_obsidian_vault_synergy_queue_2026_06_09]] (Q3 still open).
