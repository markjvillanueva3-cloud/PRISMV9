# DOMAIN-KNOWLEDGE/U-PAPA-TRIBAL-CLOBBER-GUARD — [MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CLOBBER-GUARD (slot:papa): R12 loud-warn before a narrower-set truncate clobbers a wider output

**Commit:** `c266744b25fd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T23:18:13-05:00
**Tags:** domain-knowledge, u-papa-tribal-clobber-guard, auto-distilled

## Subject
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CLOBBER-GUARD (slot:papa): R12 loud-warn before a narrower-set truncate clobbers a wider output

## Body
```
[MAIN-FORCE] [DOMAIN-KNOWLEDGE]/U-PAPA-TRIBAL-CLOBBER-GUARD (slot:papa): R12 loud-warn before a narrower-set truncate clobbers a wider output

Closes the residual P2 the arm-A re-review surfaced on the domain-set cursor fix: the shared
outPath is truncated on a fresh-cursor run (so distilled rows REPLACE raw), but a NARROWER set
re-run after a populated wider run (e.g. cad/cam after --domains all) would SILENTLY shrink the
dataset to cad/cam-only (reachable: the cad/cam validation left no cursor). Pure clobberLostDomains
(existingRows, domainsArg) returns the domains the current set would discard ('all' = superset ->
[]); main() warns LOUDLY before truncating. Recoverable (a fresh --domains all rebuilds) but never
silent (R12). +1 R9 test + behavioral proof (live WARN fires on a mill-row reverse truncate). 18/18.
```

## Files touched (3)
- scripts/tribal-corpus-to-lora-dataset.mjs      | 27 ++++++++++++++++++++++++++-
- scripts/tribal-corpus-to-lora-dataset.test.mjs | 23 ++++++++++++++++++++++-
- 2 files changed, 48 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- tilled rows REPLACE raw), but a NARROWER set

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c266744b25fd`
- Milestone envelope: `mcp-server/data/milestones/DOMAIN-KNOWLEDGE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._