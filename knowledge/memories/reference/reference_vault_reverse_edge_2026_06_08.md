---
name: reference_vault_reverse_edge_2026_06_08
description: "U-VAULT-REVERSE-EDGE (sierra 2026-06-08) — vault doc → graph node(s) cheap reverse index, closing the system-viz↔Obsidian synergy loop. `doc-nodes` CLI. The inverse of node_card."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.250Z
aliases: reference_vault_reverse_edge_2026_06_08
---


**U-VAULT-REVERSE-EDGE** + **-STALE** (slot:sierra, 2026-06-08, commits `96ed5222e2` + `d856173b86`). Closes the REVERSE direction of the system-viz↔Obsidian synergy (CHEAP-NODE-ACCESS-MS0).

## What it is
The forward edge `graph node → vault docs` already lives in `node_card.wikiEntries`/`memoryEntries` (51,540 cards carry wiki, 48,950 memory). The REVERSE `vault doc → graph node(s)` was unmapped — an agent reading a wiki/memory doc had no cheap way to find the live graph node(s) it documents (grepping the 644MB graph = ~186K tokens was the only path). This builds the inverse.

## Use it
```
node scripts/system-viz-query.mjs doc-nodes <wikiPath|memorySlug>
# e.g. doc-nodes architecture/cheap-node-access-ms0   (or the full knowledge/wiki/...md path, or a bare memory slug)
# → lists the graph node id(s) that doc documents, + a `node-card <id>` next-step for live state
```
Pairs with `node-card <id>` (forward): `doc-nodes` D → node N → `node-card` N. Round-trip-proven consistent (N's wikiEntries lists D back).

## How (no 644MB graph read)
- `scripts/build-vault-backlink-index.mjs` STREAMS the existing `node-cards.jsonl` (inverts data already projected) → `state/shared/system-viz/vault-backlinks.json` (gitignored). Live: **29,479 vault keys ← 1,520,813 edges from 301,216 cards**, 2,657 capped at NODE_CAP=50 (honest `total`), 19.8MB.
- `scripts/lib/vault-backlink-schema.mjs` (pure: `normalizeVaultKey` canonicalizes a wiki path OR memory slug to ONE key so build+query agree; key spaces disjoint — wiki keys keep a `/`, memory slugs don't).
- `scripts/lib/vault-backlink-read.mjs` `backlinksFor(query)` — load-once cache, **fail-SOFT** (never throws — may be called from a hook; the builder is the fail-loud half). Carries a `stale` flag (compares index `builtFromMtimeMs` vs live source mtime, mirrors node-card-read) so a drifted index says so loudly. `backlinksWithCards()` hydrates ids → node-cards in one call.
- The agent pays only the small answer (~tens of tokens), NEVER the 19.8MB index.

## Tests / scrutiny
35 tests (17 schema + 18 reader incl 3 staleness + real-data smoke). Per-file 2-arm BATCHED under YELLOW budget (honest-disclosed). End-of-session 3-of-3 PASS/PASS/PASS 0 P0/P1; reviewer B verified key-space disjointness vs full corpus (0 collisions) + mutation-tested cap/total honesty; reviewers B+C converged on the silent-drift gap → fixed by the -STALE follow-up.

## Milestone completion (2026-06-09, slot:sierra — VAULT-REVERSE-EDGE-COMPLETE)
Gave the reverse edge the SAME full treatment node_card has. A blueprint Workflow (wf_b5aa5735, 4 parallel code-analyzers) mapped the 3 sibling patterns + an ROI assessment that PRUNED 2 of 4 candidate units:
- **U-VBL-REGEN-WIRE** (commit `0e2724871a`) — auto-refresh: a fail-soft spawnSync stage in `regen-viz.mjs` right after build-graph-index (writes node-cards.jsonl), before node-adjacency, inside the held graph-write lock. Closes the rot (the staleness flag was firing `⚠STALE 631min` — proven). Clone of the 3 sibling sidecar stages; does NOT increment `failed`.
- **U-VBL-DISPATCHER** (commits `14aba14e3a` wrapper+test, enum/case in HEAD, `4a44b5393c` schema) — `prism_session:doc_nodes` MCP action. `sessionDocNodesAction.ts` (dep-injected runDocNodesAction, fail-soft: miss=success+suggestions, only unavailable/throw/non-JSON=error; resolveDocKey resolves doc+query/q/key/path/slug) delegates to CLI `doc-nodes <key> --json` via the same execFileSync argv-no-shell runner as node_card. 14/14 vitest. **LATENT until next MCP daemon restart** (migration freeze) — the CLI serves it live today. node_card precedent: works via passthrough fallback even without the schema.
- **DEFERRED with evidence (ROI assessment):** (1) per-prompt `vault-doc-prefetch-inject` hook — low firing rate (raw user prompts rarely contain vault keys; the injected context the hook would key on is invisible to it), low payoff (pre-empts an already-cheap graph-short-circuiting CLI, not a 186K-token graph Read), HIGH false-positive risk (180 bareword keys like `memory`/`prints` + 6,403 snake_case slugs colliding with ordinary code tokens). (2) offset-seek variant — its only consumer was that deferred hook; the dispatcher load-once-caches the 19.8MB in the long-lived MCP process, so seek isn't needed.

3-of-3 scrutiny PASS/PASS/PASS 0 blockers (session claude-51a18b50). SHARED-TREE: sessionDispatcher.ts + sessionActionSchemas.ts carried romeo's interleaved `slot_session_history_read`; staged ONLY my doc_nodes hunks (marker-filtered git apply + clean-HEAD checkout-reinsert for the schema) — verified 0 contamination, romeo's work preserved uncommitted.

## Open follow-up (none blocking)
The milestone is complete. Only remaining ideas are the two DEFERRED units above (revive the prefetch hook only with measured firing-rate evidence + a strict trigger guard; build offset-seek only if a hot per-prompt consumer appears).

Registered in the cheap-access map: `knowledge/wiki/architecture/obsidian-vault-node-access-map.md`. Related: [[reference_mcp_fleet_capacity_ms0_2026_06_08]].
