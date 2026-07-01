# PLAYBOOK-CAPABILITY/U-PB-WIKI-TRIO — [MAIN] [PLAYBOOK-CAPABILITY]/U-PB-WIKI-TRIO (slot:foxtrot): wiki entry for the playbook-capability trio

**Commit:** `c7a50fe9c140` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T17:21:00-05:00
**Tags:** playbook-capability, u-pb-wiki-trio, auto-distilled

## Subject
[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-WIKI-TRIO (slot:foxtrot): wiki entry for the playbook-capability trio

## Body
```
[MAIN] [PLAYBOOK-CAPABILITY]/U-PB-WIKI-TRIO (slot:foxtrot): wiki entry for the playbook-capability trio

knowledge/wiki/architecture/playbook-capability-extensions.md — durable
documentation for the U-PB-EXPAND / U-PB-INTEGRITY-AUDIT / U-PB-CONFLICT-DETECT
trio shipped today.

Covers: the 11-action playbook surface (up from 2 actions); the structural-
vs-semantic complementarity of auditIntegrity() and detectConflicts(); the
nearest-parameter lexicon-cooccurrence directive-extraction algorithm
including the frozen CONFLICT_* lexicons, negation handling, and
internal-ambiguity exclusion; what the detectors will and will NOT catch
(honest limits including the conditions_all P2 recall gap); the test
invariant+fixture pattern reused across all three units; and a durable
P2/P3 follow-up table for future iterations.

Closes the doc-reflection follow-up logged in
reference_playbook_conflict_detect_2026_05_22 — the wiki is the
detail surface; the always-loaded MEMORY.md index pointer was skipped
because the index is at its 22 KB target ceiling and the H7 BM25
memory-index (build-memory-index-sidecar.mjs) covers free-floating
memory files transparently (591-record sidecar regenerated this
session).
```

## Files touched (2)
- .../architecture/playbook-capability-extensions.md | 182 +++++++++++++++++++++
- 1 file changed, 182 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c7a50fe9c140`
- Milestone envelope: `mcp-server/data/milestones/PLAYBOOK-CAPABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._