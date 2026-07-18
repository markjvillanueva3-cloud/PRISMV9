# ALPHA-CONTEXT-RETENTION/U-ALPHA-REFPOOL-HEAP-GUARD — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-CONTEXT-RETENTION]/U-ALPHA-REFPOOL-HEAP-GUARD (slot:alpha): vault-to-gnn-refpool --apply self-reexecs with a heap bump (was OOM on default heap)

**Commit:** `f327bfcbd2a0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T09:21:18-05:00
**Tags:** alpha-context-retention, u-alpha-refpool-heap-guard, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-CONTEXT-RETENTION]/U-ALPHA-REFPOOL-HEAP-GUARD (slot:alpha): vault-to-gnn-refpool --apply self-reexecs with a heap bump (was OOM on default heap)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-CONTEXT-RETENTION]/U-ALPHA-REFPOOL-HEAP-GUARD (slot:alpha): vault-to-gnn-refpool --apply self-reexecs with a heap bump (was OOM on default heap)

Hit live this session: running the vault->GNN ref-pool feeder --apply (to grow the NN/GNN reference pool the PSN-leg names as the GNN full-coverage blocker) crashed with a JS heap OOM -- the --apply/--revert modes stream-load the 542MB system-graph.json in-process at the DEFAULT heap ceiling. Manual --max-old-space-size=12288 worked; the script needs it built in so the fleet (tango/india/anyone) can run the feeder without knowing the flag.

FIX (clone-don't-fork of nn-graph-retrain-lifecycle's proven self-reexec, 2026-06-11): pure shouldReexecForHeap(argv,env,execArgv) + hasHeapFlag + nodeArgsWithHeap; a __isMain guard re-execs node ONCE with --max-old-space-size (PRISM_VAULT_REFPOOL_HEAP_MB, default 12288) ONLY for the graph-writing modes (--apply/--revert) -- the dry-run (default/--json) never loads the graph so it stays fast. Child sets PRISM_VAULT_REFPOOL_REEXEC=1 (loop-break); _NO_REEXEC=1 opt-out; execArgv-already-bumped not double-wrapped. VALIDATED LIVE: --apply now completes (nodes updated=8, 0 OOM) with NO manual flag; dry-run unaffected. 15 tests (10 inline + 5 file: graph-writer-reexec, child/optout/bumped-suppress, hasHeapFlag, argv-order, adversarial empty/garbage).

R12 HONEST: the ref-pool 'growth' itself was already done by tango 2026-06-10 ([[reference_gnn_refpool_vault_grow_2026_06_10]]); my --apply reported nodes added=0 updated=8 (idempotent re-apply of the same 8 labels, NOT new growth). The heap guard is the genuine non-redundant contribution -- the feeder was silently broken on default heap. GNN full-coverage still needs substantial ref-pool growth + H2GCN/GPU retrain (india lane).
```

## Files touched (3)
- scripts/vault-to-gnn-refpool.heap.test.mjs |  37 +++++++++++
- scripts/vault-to-gnn-refpool.mjs           | 290 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 327 insertions(+)

## Lessons surfaced in commit body
- till needs substantial ref-pool growth + H2GCN/GPU retrain (india lane).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f327bfcbd2a0`
- Milestone envelope: `mcp-server/data/milestones/ALPHA-CONTEXT-RETENTION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._