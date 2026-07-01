# PAPA-JM-VAULT/U-JMVAULT04 — [MAIN] [PAPA-JM-VAULT]/U-JMVAULT04 (slot:papa): staleness-aware refresh (--if-stale) -> living shop-profile, not one-shot

**Commit:** `94736d5aca6a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-12T13:44:36-05:00
**Tags:** papa-jm-vault, u-jmvault04, auto-distilled

## Subject
[MAIN] [PAPA-JM-VAULT]/U-JMVAULT04 (slot:papa): staleness-aware refresh (--if-stale) -> living shop-profile, not one-shot

## Body
```
[MAIN] [PAPA-JM-VAULT]/U-JMVAULT04 (slot:papa): staleness-aware refresh (--if-stale) -> living shop-profile, not one-shot

isStale(profilePath, sources): profile is stale iff absent OR any source
(files.jsonl/documents.jsonl) mtime is newer. CLI `--if-stale` short-circuits the full
re-aggregation when sources are unchanged -> cheap to call from ANY cadence (cron / Stop /
pre-quote) without wasteful reruns. Makes the shop-profile living infrastructure instead of
a one-shot artifact. 10/10 tests (+1 isStale: absent/newer-source/older/missing-source).

Companion /shop-profile skill (.claude/commands, gitignored/local) documents the read +
refresh + consumers surface for the whole fleet.
```

## Files touched (3)
- scripts/jm-shop-knowledge-to-vault.mjs      | 20 +++++++++++++++++++-
- scripts/jm-shop-knowledge-to-vault.test.mjs | 26 +++++++++++++++++++++++++-
- 2 files changed, 44 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 94736d5aca6a`
- Milestone envelope: `mcp-server/data/milestones/PAPA-JM-VAULT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._