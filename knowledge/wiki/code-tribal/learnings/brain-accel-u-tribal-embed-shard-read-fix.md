# BRAIN-ACCEL/U-TRIBAL-EMBED-SHARD-READ-FIX — [MAIN] [BRAIN-ACCEL]/U-TRIBAL-EMBED-SHARD-READ-FIX (slot:sierra): readIndex + clobber-guard were monolith-only -> a shard transition CLOBBERED the brain (incident + root-cause fix)

**Commit:** `8bf187357780` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T05:20:48-05:00
**Tags:** brain-accel, u-tribal-embed-shard-read-fix, auto-distilled

## Subject
[MAIN] [BRAIN-ACCEL]/U-TRIBAL-EMBED-SHARD-READ-FIX (slot:sierra): readIndex + clobber-guard were monolith-only -> a shard transition CLOBBERED the brain (incident + root-cause fix)

## Body
```
[MAIN] [BRAIN-ACCEL]/U-TRIBAL-EMBED-SHARD-READ-FIX (slot:sierra): readIndex + clobber-guard were monolith-only -> a shard transition CLOBBERED the brain (incident + root-cause fix)

INCIDENT (live, this session): running the coverage batch grew tribal-embed-index.json
past ~480 MiB, which triggered its FIRST-EVER shard transition (write-tribal-index.mjs
writes a .manifest.json + shard files and REMOVES the monolith .json). The very next
checkpoint's readIndex() did `if (!fs.existsSync(INDEX_PATH))` -- checking ONLY the
monolith .json, which the shard writer had just removed -> it returned an EMPTY base.
buildOrUpdate then merged staged-only onto that empty base and writeIndex() wrote a
sub-threshold monolith, whose removeShardLayout DELETED the shards. Net: the
~29,723-entry brain dropped to staged-only (caught at ~11,500 and killed). The
clobber-guard had the SAME monolith-only blind spot (its existsSync(INDEX_PATH) was
false once sharded), so it silently did NOT run and could not catch the shrink.

This is a latent vector: the shard writer (U-TRIBAL-SHARD-WRITER) shipped AFTER the
2026-06-08 readIndex/writeIndex fail-loud fixes, introducing a sharded on-disk shape
those checks never accounted for. It was dormant until the index first crossed 480 MiB
-- which the streaming-rerank work (removing the heap ceiling so the index could grow)
first made happen.

FIX (root cause): make BOTH readIndex and the writeIndex clobber-guard MANIFEST-AWARE.
 - readIndex: return the empty bootstrap base ONLY when NEITHER the monolith .json NOR
   the sibling .manifest.json exists; otherwise loadTribalIndex (which is manifest-aware)
   reads the shards. So a sharded index never reads as empty.
 - writeIndex clobber-guard: run when monolith OR manifest exists, loading prevCount via
   the (shard-aware) loadTribalIndex -> the >50% shrink guard now fires on a sharded
   prior index too (defense-in-depth backstop the incident proved was missing).

Verified: node --check clean; tribal-embed-index.test.mjs 14/14 incl 2 NEW regression
tests that force a sharded layout (manifest + shards, no monolith) and assert (a)
readIndex reads the shards NOT an empty base, (b) the clobber-guard refuses a >50%
shrink over the sharded index. These fail against the pre-fix code.

RECOVERY: the lost entries are re-embeddable from the intact wiki/mem source; the brain
(now 11,500, functional) restores via a re-run of --update WITH this fix (the shard
transition is now handled). LESSON: the shard writer + monolith-only readers = a brain
clobber; any new on-disk layout must be reflected in EVERY existence/guard check, not
just the happy-path reader.
```

## Files touched (3)
- .claude/scripts/tribal-embed-index.mjs      | 55 +++++++++++++++++++++++++++++++++++--------------------
- .claude/scripts/tribal-embed-index.test.mjs | 27 +++++++++++++++++++++++++++
- 2 files changed, 62 insertions(+), 20 deletions(-)

## Lessons surfaced in commit body
- til the index first crossed 480 MiB
- LESSON: the shard writer + monolith-only readers = a brain

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8bf187357780`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._