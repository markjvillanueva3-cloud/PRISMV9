# CHEAP-NODE-ACCESS-MS0/U-SV-NODE-VAULT-PATHS-SIBLINGS — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-SV-NODE-VAULT-PATHS-SIBLINGS (slot:sierra): node->vault paths in pre-grep + pre-write exact-match banners

**Commit:** `6264feacd930` · **By:** markjvillanueva3-cloud · **At:** 2026-06-06T11:18:41-05:00
**Tags:** cheap-node-access-ms0, u-sv-node-vault-paths-siblings, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-SV-NODE-VAULT-PATHS-SIBLINGS (slot:sierra): node->vault paths in pre-grep + pre-write exact-match banners

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [CHEAP-NODE-ACCESS-MS0]/U-SV-NODE-VAULT-PATHS-SIBLINGS (slot:sierra): node->vault paths in pre-grep + pre-write exact-match banners

Extends the shared exactMatchBanner (graph-exact-match.mjs) with a seekDocs-backed
vaultPathsLine helper (DRY — one helper, both hooks) so the pre-grep and pre-write
exact-match collapses ALSO surface the node's Obsidian wiki/memory paths inline,
matching pre-bash (U-SV-NODE-VAULT-PATHS). Especially apt on pre-write: the
'this asset already exists' dedup warning now points at the node's existing docs.
seekCard is hook-safe (seek-only, never 644MB graph, never throws); non-resolving
id => banner byte-identical to before (proven by a no-regression test).
pre-read has no exact-match collapse, so all 3 applicable injectors are covered.

Tests: graph-exact-match 18/18 (+5: vaultPathsLine render/cap/null/throw/no-regression),
pre-grep 14/14, pre-write 14/14 (E2E subprocess paths exercise the new wiring).
```

## Files touched (5)
- .claude/hooks/pre-grep-graph-inject.mjs  | 24 +++++++++++++++++++++---
- .claude/hooks/pre-write-graph-inject.mjs | 24 +++++++++++++++++++++---
- scripts/lib/graph-exact-match.mjs        | 36 ++++++++++++++++++++++++++++++++----
- scripts/lib/graph-exact-match.test.mjs   | 48 +++++++++++++++++++++++++++++++++++++++++++++++-
- 4 files changed, 121 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 6264feacd930`
- Milestone envelope: `mcp-server/data/milestones/CHEAP-NODE-ACCESS-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._