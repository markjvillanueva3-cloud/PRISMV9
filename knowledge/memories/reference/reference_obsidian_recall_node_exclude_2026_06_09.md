---
name: reference_obsidian_recall_node_exclude_2026_06_09
description: "Excluded 9571 node_* pointer stubs (72% of the 13229-file recall corpus) from memo recall in memory-index-search-lib.mjs. Live A/B: a query returned 20/20 node stubs + 0 real memos BEFORE, 20 real memos + 0 stubs AFTER. Default-ON, knob PRISM_RECALL_INCLUDE_NODE_POINTERS=1. Compounds with the U-OBS-MEMDIR-HOMEDIR 1602-memo recovery."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.232Z
aliases: reference_obsidian_recall_node_exclude_2026_06_09
---


# node_* pointer-stub exclusion from memo recall (2026-06-09, slot:alpha)

Commit `8da1541c00` ([OBSIDIAN-VAULT-SYNERGY]/U-OBS-RECALL-NODE-EXCLUDE). Discovered
via ultracode Workflow queue item #2; premise re-verified live before building.

## The finding (token-savings + recall-precision, the goal's primary clauses)
`memory-index-search-lib.mjs` (the BM25/hybrid recall lib behind `memory-relevance-inject`
fires-every-edit + `memory-index-precheck-inject` fires-every-prompt) walks the H: vault
`knowledge/memories/{...}`. That corpus is **72.3% auto-generated `node_*` pointer stubs**
(9571 of 13229; the `reference` namespace alone is 12793 files / 9571 stubs). Each stub is
a thin `"Node-indexed pointer — X → wiki <path>"` record, NOT a substantive memo — they
diluted BM25 precision and, in the live-scan fallback, cost 9571 needless stat+read calls
(the very timeout the graceful-degradation path guards). Node lookups have their OWN cheap
surface ([[reference_cheap_node_access_ms0_2026_06_04]] node_card), so they don't belong in
substantive memo recall.

## The fix
Pure `isNodePointerStub(fileName)` (`/^node[-_]/i`) + `nodePointerExclusionEnabled()`
(default-ON; knob `PRISM_RECALL_INCLUDE_NODE_POINTERS=1` / `opts.excludeNodePointers=false`
restore). Applied at BOTH convergence points in `runMemoryIndexSearch`: the sidecar-records
loop (BEFORE `byKey.set` so a stub can't resurface via BM25 OR hybrid-dense hydration) and
the live-scan loop (BEFORE stat+read — an I/O win). `enumerateMemoryFiles` stays general
(filter scoped to recall). Mirrors the in-file `supersededExclusion` convention (R11).

## Validated LIVE (R15 — proof with numbers, on the real hybrid-sidecar path)
Query "adaptive controller model algorithm": BEFORE → 20/20 hits were node_* stubs, 0 real
memos. AFTER (default) → 20 real memos (lathe adaptive pipeline, okuma controller limits…),
0 stubs. The recall hook now injects real content instead of pointer noise. Compounds with
[[reference_obsidian_memdir_homedir_fix_2026_06_09]] — the 1602 recovered memos now rank
instead of being buried under 9571 pointers.

## Scrutiny (3-of-3 PASS)
Reviewer B caught a real R9 P1: the 3 initial tests used makeFakeVault (no sidecar) → only
covered the live-scan skip; the PRODUCTION-default sidecar-loop skip had 0 coverage (deleting
it left 51/51 green). CLOSED in-session: added 2 `source:'sidecar'` fail-on-revert tests
(`hybrid:false` forces deterministic sidecar path). 53/53. All 9573 live node files audited =
0 false positives (every one carries the pointer marker; real memos use `reference_node_*`).

## Follow-up (deferred, non-blocking)
- P2 bake-time optimization: the sidecar still CARRIES 9571 stub records (search-time filter
  is reversible-without-rebuild by design); a builder-side filter would shrink the sidecar.
  Route to whoever owns `build-memory-index-sidecar.mjs`.
- Still queued from last fire: the ~25-script recall-path portability batch
  (route hardcoded wompu paths through `resolveObsidianMemDir()`).
