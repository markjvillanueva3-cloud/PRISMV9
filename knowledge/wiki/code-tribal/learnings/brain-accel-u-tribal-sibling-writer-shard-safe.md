# BRAIN-ACCEL/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE (slot:sierra): route the 3 sibling tribal-index embedders (engines/knowledge-store/cited-tips) through a shared shard-safe guarded-IO helper -- closes the monolith-only clobber vector that destroyed the brain 4x (latest 2026-06-10 8bf1873577). New scripts/lib/tribal-index-guarded-io.mjs: readTribalIndexGuarded (manifest-aware, fail-loud on corrupt-exists -- no fail-open empty) + writeTribalIndexGuarded (shrink clobber-guard + writeTribalIndex shard layout), parameterized by indexPath so all writers share ONE impl (R7/R8). embed-knowledge-store gained the cross-process withTribalIndexLock it never had (was lock-less + monolith-only); embed-cited-tips loadIndex no longer fail-OPENs to empty on a sharded layout (the 2026-06-08 clobber 1:1). 70/70 tests: helper 15 (forced-shard read non-empty + shrink-guard over sharded prior + monolith<->shard transition) + cited-tips +2 forced-shard regressions; all 3 sibling suites green (engines 6, knowledge-store 25 incl CLI oracle, cited-tips 16). DO-BEFORE the index grows past 480MiB.

**Commit:** `46c07e9cd7ac` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T08:43:21-05:00
**Tags:** brain-accel, u-tribal-sibling-writer-shard-safe, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE (slot:sierra): route the 3 sibling tribal-index embedders (engines/knowledge-store/cited-tips) through a shared shard-safe guarded-IO helper -- closes the monolith-only clobber vector that destroyed the brain 4x (latest 2026-06-10 8bf1873577). New scripts/lib/tribal-index-guarded-io.mjs: readTribalIndexGuarded (manifest-aware, fail-loud on corrupt-exists -- no fail-open empty) + writeTribalIndexGuarded (shrink clobber-guard + writeTribalIndex shard layout), parameterized by indexPath so all writers share ONE impl (R7/R8). embed-knowledge-store gained the cross-process withTribalIndexLock it never had (was lock-less + monolith-only); embed-cited-tips loadIndex no longer fail-OPENs to empty on a sharded layout (the 2026-06-08 clobber 1:1). 70/70 tests: helper 15 (forced-shard read non-empty + shrink-guard over sharded prior + monolith<->shard transition) + cited-tips +2 forced-shard regressions; all 3 sibling suites green (engines 6, knowledge-store 25 incl CLI oracle, cited-tips 16). DO-BEFORE the index grows past 480MiB.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BRAIN-ACCEL]/U-TRIBAL-SIBLING-WRITER-SHARD-SAFE (slot:sierra): route the 3 sibling tribal-index embedders (engines/knowledge-store/cited-tips) through a shared shard-safe guarded-IO helper -- closes the monolith-only clobber vector that destroyed the brain 4x (latest 2026-06-10 8bf1873577). New scripts/lib/tribal-index-guarded-io.mjs: readTribalIndexGuarded (manifest-aware, fail-loud on corrupt-exists -- no fail-open empty) + writeTribalIndexGuarded (shrink clobber-guard + writeTribalIndex shard layout), parameterized by indexPath so all writers share ONE impl (R7/R8). embed-knowledge-store gained the cross-process withTribalIndexLock it never had (was lock-less + monolith-only); embed-cited-tips loadIndex no longer fail-OPENs to empty on a sharded layout (the 2026-06-08 clobber 1:1). 70/70 tests: helper 15 (forced-shard read non-empty + shrink-guard over sharded prior + monolith<->shard transition) + cited-tips +2 forced-shard regressions; all 3 sibling suites green (engines 6, knowledge-store 25 incl CLI oracle, cited-tips 16). DO-BEFORE the index grows past 480MiB.
```

## Files touched (7)
- scripts/embed-cited-tips-into-tribal-index.mjs      |  34 +++++++++--------
- scripts/embed-cited-tips-into-tribal-index.test.mjs |  62 ++++++++++++++++++++++++++++++
- scripts/embed-engines-into-tribal-index.mjs         |  23 ++++++++---
- scripts/embed-knowledge-store-into-tribal-index.mjs |  96 +++++++++++++++++++++++++++++++++++-----------
- scripts/lib/tribal-index-guarded-io.mjs             | 142 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/tribal-index-guarded-io.test.mjs        | 163 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 6 files changed, 476 insertions(+), 44 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 46c07e9cd7ac`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-ACCEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._