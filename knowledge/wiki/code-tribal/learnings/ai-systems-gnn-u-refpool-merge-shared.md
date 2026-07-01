# AI-SYSTEMS-GNN/U-REFPOOL-MERGE-SHARED — [MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-MERGE-SHARED (slot:india): build-once idempotent ref-pool merge (shared lib) -- outcome feeder gains skip-write-when-unchanged

**Commit:** `64a05d976404` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T08:36:42-05:00
**Tags:** ai-systems-gnn, u-refpool-merge-shared, auto-distilled

## Subject
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-MERGE-SHARED (slot:india): build-once idempotent ref-pool merge (shared lib) -- outcome feeder gains skip-write-when-unchanged

## Body
```
[MAIN-FORCE] [AI-SYSTEMS-GNN]/U-REFPOOL-MERGE-SHARED (slot:india): build-once idempotent ref-pool merge (shared lib) -- outcome feeder gains skip-write-when-unchanged

R15 build-once: extract the GNN reference-pool ADD/UPDATE merge into a single
scripts/lib/refpool-merge.mjs that BOTH feeders import, instead of two divergent
copies. The vault feeder was already idempotent (e804997662); the sibling
ghost-wire-outcomes-to-refpool.mjs still REPLACED a node on every id-match
(re-stamping volatile proposed_at) and ALWAYS wrote the ~542MB system-graph.json --
that churn is now gone (skip-write when !changed).

- scripts/lib/refpool-merge.mjs: ghostContentEqual(a,b,fields) + mergeGhostsIntoGraph
  (graph,ghosts,contentEqual) -> {nodesAdded,nodesUpdated,edgesAdded,changed}; edges
  ADD-only + OPTIONAL; PURE. 9 tests incl the NO-OP-when-only-proposed_at-differs +
  ADD-only-missing-edge invariants (both fail on revert to always-replace/always-write).
- vault-to-gnn-refpool.mjs: nodeContentEqual/mergeVaultGhosts are now thin wrappers over
  the lib (VAULT_CONTENT_FIELDS) -- byte-identical, 28/28 back-compat tests pass.
- ghost-wire-outcomes-to-refpool.mjs: --apply uses the shared merge + skip-write
  (OUTCOME_CONTENT_FIELDS, note sourceLedger not sourceMemory). 11/11 tests pass.

Each feeder owns its significant-field list (node shapes differ); the merge is shared.
Dry-runs: vault=14, outcome=139, 0 conflicts. Per-file 2-arm scrutiny (code-analyzer +
reviewer) both PASS.

SCOPE (R12, scrutiny arm-B P2): the outcome feeder GAINS the idempotency CAPABILITY (no
churn on re-apply), but its durable lifecycle re-apply is NOT yet wired -- the retrain
lifecycle pre-fingerprint stage (6d962b37d3) re-applies only the vault feeder. Wiring a
defaultApplyOutcomeRefpool() stage (the BIGGER pool: 139 outcome refs vs 14 vault) is the
immediate follow-on. The 3rd graph-writer seed-ghost-from-unwired.mjs is intentionally
out-of-scope (regen-viz full-rebuild path, not a periodic re-apply).
```

## Files touched (5)
- scripts/ghost-wire-outcomes-to-refpool.mjs | 27 ++++++++++++++++-----------
- scripts/lib/refpool-merge.mjs              | 49 +++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/refpool-merge.test.mjs         | 77 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/vault-to-gnn-refpool.mjs           | 46 +++++++++++-----------------------------------
- 4 files changed, 153 insertions(+), 46 deletions(-)

## Lessons surfaced in commit body
- till REPLACED a node on every id-match
- tile proposed_at) and ALWAYS wrote the ~542MB system-graph.json --

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 64a05d976404`
- Milestone envelope: `mcp-server/data/milestones/AI-SYSTEMS-GNN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._