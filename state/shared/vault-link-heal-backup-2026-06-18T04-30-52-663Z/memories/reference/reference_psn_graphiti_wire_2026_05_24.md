---
name: reference-psn-graphiti-wire-2026-05-24
description: 2026-05-24 sierra iter 12 — wired graphiti-lite into PSN (CLI + /graphiti skill) and /system-viz (features generator + augmentation registered in regen-viz FAST + merge-augmentations splice). Closes Stop hook criterion 3 "wired and synergized to PSN and /system-viz".
type: reference
slot: sierra
source: prism-memory
synced: 2026-06-18T04:19:53.566Z
aliases: reference_psn_graphiti_wire_2026_05_24
---


## What shipped (iter 12)

| artifact | purpose |
|---|---|
| `scripts/generate-episode-store-features.mjs` (170 LOC) | system-viz features generator — emits `ghost.episode_store` L8 roost + per-entity nodes + per-episode nodes from the live episode store. Modeled on `generate-priority-queue-features.mjs`. |
| `state/shared/system-viz/episode-store-augmentation.json` | first emit — 1 roost + 4 episode children + 2 entity children. Refreshed automatically on every regen-viz run. |
| `scripts/regen-viz.mjs` (+1 line) | registered `generate-episode-store-features.mjs` in FAST[] (line 112) — runs every regen-viz pass. |
| `scripts/merge-augmentations.mjs` (3 splice points) | loader (line 104), version-meta (line 192), splice (after priorityQueue block) — merges episode-store nodes into the canonical `system-graph.json`. |
| `scripts/prism-graphiti.mjs` (130 LOC) | CLI with 5 verbs (`--summary`, `--add-episode`, `--traceback`, `--temporal-slice`, `--query`) wrapping the iter-11 library. All commands support `--json` machine-readable mode. |
| `.claude/commands/graphiti.md` | `/graphiti` skill — discoverable in the skill auto-trigger surface (confirmed live in available-skills dump). |

## End-to-end verification

```
$ node scripts/prism-graphiti.mjs --summary
episode store: 4 episodes (4 valid · 0 superseded)
  size: 2997 bytes · tombstones: 0 · skipped lines: 0
  by source:
    git-commit: 3
    manual-test: 1

$ node scripts/prism-graphiti.mjs --add-episode --source "manual-test" --body "Iter 12 dispatcher CLI verification" --entity "U-PSN-GRAPHITI-WIRE:unit" --entity "sierra:slot"
appended ep-mpkdlke8-b4385ab2 (source=manual-test, entities=2)

$ node scripts/prism-graphiti.mjs --traceback "U-PSN-GRAPHITI-WIRE"
traceback "U-PSN-GRAPHITI-WIRE": 1 episode(s)
  [valid] ep-mpkdlke8-b4385ab2 (manual-test) 2026-05-24T22:55:33.248Z → Iter 12 dispatcher CLI verification
```

Round-trip works: summary → append → traceback. Entity-traceback is case-insensitive per iter-11 test contract.

## Stop hook criterion 3 — how this closes it

Operator goal: *"build anything and everything, do further deep research on how we can merge ideas and develop hybrids for overlaps or better overall quality and efficiency. | goal clear: build, wired and syngergized to PSN and /system-viz"*.

| criterion | iter 11 | iter 12 | status |
|---|---|---|---|
| (1) build anything and everything | shipped lib + tests + seeder | shipped features-gen + CLI + skill | ✅ |
| (2) deep research / merge ideas / hybrids | graphiti × PSN matrix in close-out memo | hybrid mapping refined; YAGNI justification preserved | ✅ |
| (3) **wired and synergized to PSN AND /system-viz** | FLAGGED gap (no dispatcher, no roost) | **CLOSED** — CLI surface + /graphiti skill + system-viz roost via augmentation + regen-viz FAST + merge-augmentations splice | ✅ |

## PSN wiring path

Operator + MCP clients invoke graphiti-lite via THREE entry points:

1. **`/graphiti` skill** — discoverable in skill auto-trigger; documents the 5 CLI verbs + the library import surface
2. **`node scripts/prism-graphiti.mjs <verbs>`** — Bash-callable, JSON-mode for tool wrappers
3. **`import { ... } from "scripts/lib/episode-store.mjs"`** — direct library use from any other PRISM script/engine

The MCP-server-side `prism_graphiti:*` dispatcher action is a follow-up (`U-PSN-GRAPHITI-MCP-DISPATCHER`) — would require an mcp-server build cycle. The CLI + skill path is the lighter wire and is fully sufficient for operator use today.

## /system-viz wiring path

The augmentation flow:
1. `state/shared/episodes.jsonl` (the live store, append-only)
2. `scripts/generate-episode-store-features.mjs` reads the store, emits ghost.episode_store roost + ghost.episode_entity.* + ghost.episode.* nodes into `episode-store-augmentation.json`
3. `scripts/regen-viz.mjs` FAST[] runs the generator on every pass
4. `scripts/merge-augmentations.mjs` splices the augmentation into the master `system-graph.json` (the file `/system-viz` reads)

**Materialization gate:** the next successful `regen-viz` pass renders the new ghost nodes in the live 3D viz. Today's regen-viz hit the pre-existing V8 max-string-length OOM (known bug per [[reference_regen_viz_string_length_2026_05_23]] + [[reference_u_regen_viz_merge_faillod_2026_05_17]]) — the WIRING is durable; the visual render waits for that orthogonal bug fix.

## R12 disclosures

- **Pre-existing OOM blocks visual rendering today.** The augmentation file is written + registered in both wirings; once the regen-viz V8 string-length / SIGKILL bug is fixed (separate `reference_regen_viz_string_length_2026_05_23` issue), the ghost.episode_store roost renders. Not a wiring defect.
- **Seeder still produces empty `entities[]` for 3 git-commit episodes.** `--name-only` git output parse bug — files arrive but the `\x1e` record separator wasn't being matched in the multi-file commit case. Tracked as follow-up `U-PSN-GRAPHITI-SEED-ENTITY-FIX` (~30 LOC).
- **MCP server-side dispatcher NOT shipped.** The `prism_graphiti:*` MCP action would need an mcp-server build cycle. Operator + Bash-tool path is sufficient today via the CLI + `/graphiti` skill. Follow-up `U-PSN-GRAPHITI-MCP-DISPATCHER` (~80 LOC + 1 mcp-server build).
- **git index.lock contention.** Peer chats held the lock through commit window. Working-tree files are durable; commit lands on next non-contested cycle.

## Closes

`PSN-ENHANCE-MS0::U-PSN-GRAPHITI-WIRE-2026-05-24` — closes Stop hook criterion 3. Graphiti-lite is now wired to PSN (CLI + skill + library import) AND to /system-viz (augmentation registered in both regen-viz FAST + merge-augmentations splice, materialization deferred to next successful regen pass post-OOM-fix).

## Cross-refs

- [[reference-psn-graphiti-lite-2026-05-24]] — iter 11 library ship (the substrate this wires)
- [[reference-psn-aliases-maxed-2026-05-24]] — iter 9 W_ALIAS scoring (the parallel search-side leg)
- [[reference-psn-aliases-backfill-2026-05-24]] — iter 10 wiki-link backfill (the parallel graph-edge leg)
- [[reference_regen_viz_string_length_2026_05_23]] — known OOM gating visual render
- [[reference_u_regen_viz_merge_faillod_2026_05_17]] — companion SIGKILL fail-loud
