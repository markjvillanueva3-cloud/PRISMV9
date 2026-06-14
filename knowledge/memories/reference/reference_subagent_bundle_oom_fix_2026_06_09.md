---
name: reference_subagent_bundle_oom_fix_2026_06_09
description: "Subagent context hook OOM'd at production heap (unconditional 644MB graph + 160MB tribal readJson) → spawned agents got ZERO context fleet-wide. Fixed with bounded reads (35dc2ec4c3 + d92b9f52f4). Q3 memo recall wired (dormant — PRISM_MASTER_INDEX_INJECT=0 fleet-default). 3rd shared-lib OOM flagged."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.958Z
aliases: reference_subagent_bundle_oom_fix_2026_06_09
---


# Subagent context-bundle OOM — spawned agents got ZERO context (35dc2ec4c3, d92b9f52f4)

**Discovery (verified live, R8).** `.claude/hooks/subagent-start-context.mjs` →
`buildSpawnedAgentAdditionalContext` (`scripts/agents/spawned-agent-context-lib.mjs`)
produced **NO output at production default heap**: it UNCONDITIONALLY `readJson`'d
the **644MB** `system-graph.json` (for a meta-counts summary) + the **160MB**
`tribal-embed-index.json` (for a count summary), OOMing the process. An OOM is a
fatal abort that BYPASSES the try/catch fallback → the hook emitted nothing →
**every spawned subagent (forge/scrutiny/galaxy/review) started with ZERO context
bundle.** Silent fleet-wide.

**Fix (2 commits).**
- `readGraphHeadMeta(p, 256KB)` — bounded head-read; targeted regex on the FLAT
  sub-objects `meta.counts`/`meta.headline`/`meta.totals` (`\{[^}]*\}`, brace-free,
  first ~430 bytes). 644MB→256KB. (First cut brace-matched the whole `meta` — but
  meta is ~933KB > head AND has brace-in-string values → degraded to `{}` →
  reviewer-caught `? nodes`; the targeted-regex cut is correct + string-safe.)
- `readJsonBounded(p, 20MB)` — skip the 160MB tribal index for the cosmetic count
  summary (the valuable per-task tribal RECALL is separate + unaffected).
- Also fixed a PRE-EXISTING `summarizeSystemViz` mapping bug: nodes/edges/layers
  live in `meta.totals`, not `meta.counts` (were `?` even with the full read).

**Validated LIVE (real numbers):** bundle now emits MAIN at default heap →
`System-viz: 20702 nodes / 77622 edges across 11 layers — built 2543 / unwired
729, 175 drift` (matches the graph head exactly). Subagents get
identity/build-state/doctrine/systemViz/handoff again.

**Q3 (HIGHVALUE-DISCOVERY) — wired but DORMANT.** Added `runMemoryIndexSearch`
into `runPerTaskSearches` so the subagent turn gets Obsidian memory-vault recall
(it had master-index + tribal but not memos). Correct standalone (5 hits). BUT
the whole per-task block is gated by **`PRISM_MASTER_INDEX_INJECT: "0"` — a FLEET
DEFAULT in settings.json (line 44)** — so mi/tribal/memo are OFF fleet-wide;
my OOM fix (the un-gated summary path) is the operative win.

**KNOWN-REMAINING (R12, the 3rd OOM).** `runMasterIndexSearch` +
`runTribalSearch` in the SHARED `scripts/lib/master-index-search-lib.mjs`
(`DEFAULT_GRAPH_PATH` line 32) ALSO load the 644MB graph → the per-task block
still OOMs at default heap IF `PRISM_MASTER_INDEX_INJECT` is ever opened. That
shared lib is used by the parent prompt hook too — a cross-cutting next-milestone
(needs the same bounded-read treatment, possibly via the `architecture-graph.json`
fallback at line 39). Until then, opening the gate fleet-wide would re-break the
bundle. Owner: alpha (token/Obsidian) + sierra (graph) coordination.

**Lesson.** A hook that unconditionally `readJson`s a multi-hundred-MB file OOMs
the process BEFORE its try/catch fallback — fail-soft catches DON'T catch an OOM
abort. Read only the bytes you need (bounded head + targeted regex for top-level
summary fields). Pairs with [[reference_obsidian_vault_synergy_queue_2026_06_09]]
(this was Q3's investigation surfacing a bigger bug) + the CHEAP-NODE-ACCESS
doctrine (never load the 644MB graph for a summary).
