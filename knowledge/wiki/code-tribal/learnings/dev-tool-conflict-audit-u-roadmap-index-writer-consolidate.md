# DEV-TOOL-CONFLICT-AUDIT/U-ROADMAP-INDEX-WRITER-CONSOLIDATE — [MAIN] [DEV-TOOL-CONFLICT-AUDIT]/U-ROADMAP-INDEX-WRITER-CONSOLIDATE: unify 5 roadmap-index.json writers onto scripts/lib/atomic-json.mjs

**Commit:** `d877d1c970ea` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T21:23:54-05:00
**Tags:** dev-tool-conflict-audit, u-roadmap-index-writer-consolidate, auto-distilled

## Subject
[MAIN] [DEV-TOOL-CONFLICT-AUDIT]/U-ROADMAP-INDEX-WRITER-CONSOLIDATE: unify 5 roadmap-index.json writers onto scripts/lib/atomic-json.mjs

## Body
```
[MAIN] [DEV-TOOL-CONFLICT-AUDIT]/U-ROADMAP-INDEX-WRITER-CONSOLIDATE: unify 5 roadmap-index.json writers onto scripts/lib/atomic-json.mjs

5 writer scripts each carried a private copy of the JSON write primitive; 4
used a FIXED `.tmp` suffix, so two concurrent runs targeting the same
roadmap-index.json clobbered each other's temp file (loser's content could
survive the rename; the second renameSync threw ENOENT on the consumed tmp).

New shared helper scripts/lib/atomic-json.mjs atomicWriteJson(): per-PID temp
sibling (kills the collision), intra-fs atomic rename, best-effort orphan-temp
unlink + rethrow on rename failure (R12), throws-before-write on a
non-serializable input. All 5 writers (reconcile-milestones,
register-devtools/revenue-roadmap-envelopes, reconcile-roadmap-drift,
close-out-milestone) now import it; close-out dropped its private copy and
re-exports the import. 3 writers converge onto a trailing newline (the file's
trailing byte previously flip-flopped with whichever writer ran last).

Verify: node --test scripts/lib/atomic-json.test.mjs (15/15);
node scripts/close-out-milestone.mjs --self-test (25/25); node --check clean.
Per-file scrutiny: 2 arms x 2 file-sets, all PASS, 0 P0/P1.
CLAUDE.md update is a patch-sibling (CLAUDE.md was peer-dirty).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (10)
- .../roadmap-index-writer-consolidate.md            |  72 +++++++++
- scripts/close-out-milestone.mjs                    |  10 +-
- scripts/lib/atomic-json.mjs                        |  65 ++++++++
- scripts/lib/atomic-json.test.mjs                   | 171 +++++++++++++++++++++
- scripts/reconcile-milestones.mjs                   |  15 +-
- scripts/reconcile-roadmap-drift.mjs                |   9 +-
- scripts/register-devtools-roadmap-envelopes.mjs    |  10 +-
- scripts/register-revenue-roadmap-envelopes.mjs     |  10 +-
- ...-MD-PATCH-U-ROADMAP-INDEX-WRITER-CONSOLIDATE.md |  39 +++++
- 9 files changed, 374 insertions(+), 27 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d877d1c970ea`
- Milestone envelope: `mcp-server/data/milestones/DEV-TOOL-CONFLICT-AUDIT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._