# SIERRA-VIZ/U-XSUB-ATOMIC-WRITE — [MAIN-FORCE] [SIERRA-VIZ]/U-XSUB-ATOMIC-WRITE (slot:sierra): atomic temp+rename augmentation write (scrutiny P2 hermeticity, partial)

**Commit:** `96cf1f19dac9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T16:51:00-05:00
**Tags:** sierra-viz, u-xsub-atomic-write, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-XSUB-ATOMIC-WRITE (slot:sierra): atomic temp+rename augmentation write (scrutiny P2 hermeticity, partial)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-XSUB-ATOMIC-WRITE (slot:sierra): atomic temp+rename augmentation write (scrutiny P2 hermeticity, partial)

3-of-3 arms B+C flagged that generate-cross-substrate-edges.test.mjs reads the
gitignored, fleet-live-regenerated cross-substrate-edges-augmentation.json at module
load and FLAPPED (transient 8/10) on a torn read while a concurrent regen rewrote it.
Root cause (augmentation side): the generator wrote it non-atomically via
fs.writeFileSync(OUT, JSON.stringify(out)) -- a reader could observe a half-written
file. Swapped to the shared, tested atomicWriteText() (scripts/lib/atomic-json.mjs --
temp sibling + rename; reused, not forked). Byte-identical CONTENT (still compact
JSON.stringify, no pretty-print per size discipline); only the write becomes atomic.
Benefits every reader of this artifact (the test suite + merge-augmentations).

Verified: regen still emits consensus-of 13/13 linked 0 skipped; test 10/10.

REMAINDER of the P2 hermeticity gap (logged to handoff, NOT this commit): the test
also reads the ORACLE node-card-offsets.json (written by a different script) and 4
other live augmentations -- a full fix makes those writers atomic too AND/OR snapshots
the source files once at suite start. This commit closes the augmentation-write leg.
```

## Files touched (2)
- scripts/generate-cross-substrate-edges.mjs | 8 ++++++--
- 1 file changed, 6 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till compact
- till emits consensus-of 13/13 linked 0 skipped; test 10/10.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 96cf1f19dac9`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._