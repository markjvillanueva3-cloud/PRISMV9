---
name: reference-sierra-node-vault-paths-2026-06-06
description: "U-SV-NODE-VAULT-PATHS (sierra 2026-06-06): wired node→Obsidian-vault/wiki/memory paths into the pre-bash/pre-grep/pre-write exact-match banners via a shared seekCard-backed vaultPathsLine — token savings on graph-hit tool calls. 3-of-3 scrutiny PASS."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.197Z
aliases: reference_sierra_node_vault_paths_2026_06_06
---


# Node→vault-paths hook wiring — slot:sierra, 2026-06-06 (U-SV-NODE-VAULT-PATHS)

Operator directive: *"wire all nodes, their paths to the obsidian vault, /system-viz, master graph, master index — to skills, scripts and hooks for tool calls that should save on efficiency and token savings."* This is the CHEAP-NODE-ACCESS-MS0 continuation; resolved to **EXTEND + WIRE** (the backbone already existed), not build-new.

## What shipped (branch cad-fusion-live-ms0, 3 commits, 3-of-3 scrutiny PASS)
The graph-inject hooks' exact-match banner already surfaced a node's **source** path (`→ Read <file>`, U-SV-NODE-PATH-TEMPLATE). It now ALSO surfaces the node's **Obsidian wiki/memory paths** inline, so on an exact graph hit the model gets node→vault doc pointers with **zero follow-up node-card/wiki-query/Read** (~100-200 tok/fire saved).
- **`scripts/lib/graph-exact-match.mjs`** — new shared `vaultPathsLine(seekDocs, h0)` + `seekDocs` opt threaded into `exactMatchBanner` (DRY: one helper serves pre-grep + pre-write).
- **`pre-bash-graph-inject.mjs`** (U-SV-NODE-VAULT-PATHS) — inline seekDocs (its own renderInject); **pre-grep + pre-write** (`-SIBLINGS`) delegate to the shared helper.
- Each `main()` builds a `seekCard`-backed `seekDocs` wrapper (lazy-import, fail-open).
- **pre-read** has NO exact-match collapse (`renderInject(keys,hits)`, no resolver) → nothing to wire; all 3 applicable injectors covered (R15-complete, not scoped).

## Why it's safe (hot hooks — fire on every Bash/Grep/Write × 26 slots)
4 fail-soft layers: `seekCard` is seek-only (never the 193MB sidecar nor 644MB graph — proven by arm C; never throws → null) · wrapper null-guards · `vaultPathsLine` try/catch → "" · import fail-open. **Non-resolving id → banner byte-identical** (no-regression test). seekDocs runs ONLY on exact-match (0 calls on the common multi-hit path). Byte-cap applies after the doc line.

## Validation
- Tests: graph-exact-match 18/18, pre-bash 27/27, pre-grep 14/14, pre-write 14/14 (E2E subprocess paths exercise the wiring). Arm B mutation-proved the asserts real + inline-pre-bash == shared-helper (0/11 mismatch).
- Live: `seekCard('eng.mill')` → 8 wiki + 8 mem real Obsidian paths (`knowledge/wiki/architecture/.../ai-mill-adaptive-strategy.md`); `ghost.galaxy.wedm` likewise.

## Open follow-ups (handed off)
- **P1 latency (non-gating):** cold `seekCard` ~380ms/exact-fire — hook processes are short-lived so `_offsetsCacheByPath` never warms. A `node-card-offsets-mini.json` (id→[off,len] only, no meta) would cut it to single-digit ms. Worth building next.
- Recon wiring plan (workflow wuk20ji8b) remaining: #4/#5 master_index_query `_suggestion` on exact match + node_card in dispatcher_map_compact (sessionDispatcher.ts), #7 nav.md graphNodeId. Plus vault #4/#7(MOC gen)/#8(cron).

Related: [[reference_sierra_node_path_template_2026_06_03]] · [[reference_cheap_node_access_ms0_2026_06_04]] · [[reference_obsidian_vault_ops_2026_06_06]]
