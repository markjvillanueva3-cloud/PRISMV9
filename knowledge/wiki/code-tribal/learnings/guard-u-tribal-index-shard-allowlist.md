# GUARD/U-TRIBAL-INDEX-SHARD-ALLOWLIST — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GUARD]/U-TRIBAL-INDEX-SHARD-ALLOWLIST (slot:india): allowlist the tribal-embed monolith (superseded by shards) -- leave-a-copy Stop unblock

**Commit:** `1d43fbcbc45a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T10:26:07-05:00
**Tags:** guard, u-tribal-index-shard-allowlist, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GUARD]/U-TRIBAL-INDEX-SHARD-ALLOWLIST (slot:india): allowlist the tribal-embed monolith (superseded by shards) -- leave-a-copy Stop unblock

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [GUARD]/U-TRIBAL-INDEX-SHARD-ALLOWLIST (slot:india): allowlist the tribal-embed monolith (superseded by shards) -- leave-a-copy Stop unblock

state/shared/tribal-embed-index.json is git-tracked but DELETED in the working tree
by a concurrent BRAIN-ACCEL shard transition (sierra): retireSupersededArtifacts
retired the monolith once it crossed ~480MB, in favor of tribal-embed-index.manifest.json
+ shard-000.json (503MB) + shard-001.json (30MB) -- fresh, populated, ~534MB content
PRESERVED in shards (verified on disk). NOT a clobber (the 2026-06-08 clobber stub is
separately quarantined as .CLOBBERED-2026-06-08-stub.json). The shards ARE the copy;
monolith removal is the designed shard-transition terminal state. Exact-path entry (not
a pattern) keeps other state/shared deletions guarded. india only allowlisted the
false-positive; did not touch the index (sierra domain). Follow-up (sierra): gitignore
the monolith -- a 500MB+ derived artifact should not be git-tracked now that shards are
canonical. Deduped a concurrent peer's identical entry.
```

## Files touched (2)
- state/shared/file-relocation-allowlist.json | 3 +--
- 1 file changed, 1 insertion(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1d43fbcbc45a`
- Milestone envelope: `mcp-server/data/milestones/GUARD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._