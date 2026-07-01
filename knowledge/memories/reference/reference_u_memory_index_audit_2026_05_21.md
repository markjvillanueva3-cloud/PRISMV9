---
name: reference_u_memory_index_audit_2026_05_21
description: 2026-05-21 echo /loop iter 19. Memory-vault index-integrity audit producer. Finding — 0 broken pointers but 516/597 memory files orphan (13.6% index coverage); _index/MEMORY.md blind to 86% of vault. Commit d69fc1460e.
aliases: reference_u_memory_index_audit_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.238Z
---


# U-GOAL-SYNERGY-MEMORY-INDEX-AUDIT — memories-substrate hygiene (iter 19)

**Commit:** `d69fc1460e` (clean, my banner)
**Loop state:** iter 19/20 status=ok

## What shipped

`scripts/memory-index-integrity-audit.mjs` (~165 LOC) + test (18/18 PASS incl real-data E2E). A producer audit of the **"memories" substrate's discoverability** — two silent-rot failure modes:

- **BROKEN POINTER** — a `_index/MEMORY.md` `[Title](basename.md)` link whose basename resolves to no file in the vault (memory renamed/removed; index entry now a dead link).
- **ORPHAN MEMORY** — a memory `.md` file that NO index pointer references (exists but undiscoverable from the human-readable index).

Output: `state/shared/.memory-index-integrity-audit.json` (schema mirrors iter-7/13 producers — stats + broken/orphan lists, MAX_LIST=50 cap).

## First-run finding

```
79 index links · 597 memory files (unique basenames)
broken pointers: 0
orphan memories: 516 (13.6% index coverage)
```

**0 broken pointers** — every `_index/MEMORY.md` pointer resolves; the index doesn't point at dead files. Good.

**516 of 597 memory files (86%) are orphans** — the `_index/MEMORY.md` catalogs only **13.6%** of the vault. The BM25 `memory-index-search` (H7) still finds them, but the human-readable index is blind to 86%. Same silent-substrate-rot class as the iter-4 broken-link finding (4,136) and the iter-7 wiki-tribal gap (23,802). The /goal synergy loop's recurring lesson: **every substrate, audited for the first time, reveals a large hidden gap.**

## Note: two MEMORY.md files

The audit targets H:'s `knowledge/memories/_index/MEMORY.md` (79 links — the in-repo index). This is distinct from C:'s `~/.claude/projects/H--prism/memory/MEMORY.md` (the live auto-memory index this chat edits each iter, ~80+ pointers). The two have drifted — the C: auto-memory is the actively-maintained one; the H: `_index/` copy lags. A deeper reconciliation (sync the two, or make one canonical) is a follow-up beyond iter-19 scope — logged here.

597 unique basenames vs the raw `find` count of 876 `.md` files → ~279 duplicate basenames across subdirs (`_legacy-root` copies etc). `collectMemoryFiles` dedupes by basename because the index resolves by basename. The duplication is a separate hygiene item, not this audit's focus.

## Design

- Pure core: `parseIndexLinks` (markdown `[t](x.md)` extraction, skips URLs/non-md) + `audit` (broken/orphan aggregate). IO shell: `collectMemoryFiles` (recursive basename walk) + `main`.
- Index uses **bare basenames**; resolution is by-basename across typed subdirs (`feedback/`, `reference/`, …). A link `../reference/foo.md` resolves via its basename `foo.md`.
- `NON_ORPHAN_BASENAMES` (MEMORY.md, MEMORY-ARCHIVE.md, README.md) — the index files themselves are never orphan-eligible.

## Loop status

iter 19/20 — one iter left. The /goal's 8 substrates now have observability surfaces: link-audit, wiki-tribal, prism-ai-memo (3 triplets) + meta-roost (compounds 3) + nn/gnn (iter 18) + memories index-integrity (iter 19) + swarm-launcher (iter 15 spec).

## Next-iter pickup

- **Iter 20** — roll-up close-out + integration sweep: verify all substrate surfaces wired, regen `/system-viz`, final loop close, write the loop's roll-up memo. The /goal loop's last iteration.
- **SWARM-LAUNCHER-MS0** — U-SWARM-01..06 pickable once roadmap-registered.
- **Deferred follow-ups:** memory-index consumer + viz roost (iter-19 was producer-only); C:↔H: MEMORY.md reconciliation; the ~279 duplicate-basename hygiene item.
