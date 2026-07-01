# FLEET-HYGIENE/U-DIGEST-ATOMIC-WRITE — [MAIN-FORCE] [FLEET-HYGIENE]/U-DIGEST-ATOMIC-WRITE: harden regen-digests.mjs to atomic temp+rename writes

**Commit:** `297c04132ef8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T13:34:09-05:00
**Tags:** fleet-hygiene, u-digest-atomic-write, auto-distilled

## Subject
[MAIN-FORCE] [FLEET-HYGIENE]/U-DIGEST-ATOMIC-WRITE: harden regen-digests.mjs to atomic temp+rename writes

## Body
```
[MAIN-FORCE] [FLEET-HYGIENE]/U-DIGEST-ATOMIC-WRITE: harden regen-digests.mjs to atomic temp+rename writes

Closes the P2 write-race the 3-of-3 scrutiny flagged on U-DIGEST-REGEN-HOOK
(bd7d03e98e): the 5 fs.writeFile(target,content) calls were non-atomic, and
now that the wired PreCompact hook fires regen on every /compact across 26
slots, simultaneous compacts opened a torn/empty-read window for any digest
consumer. Swap all 5 -> the shared .claude/helpers/atomic-write.mjs writeAtomic
(unique-hex temp + rename; atomic on NTFS) so a reader always sees a complete
prior-or-new file, never a torn one. fsync:false -- the rename gives the
atomicity (the race fix); crash-durability is needless latency for regenerable
digests on a per-compact hot path. PRISM's #1 regression class is non-atomic-
write clobber; this removes it from the digest hot path.

Validated: node --check OK; 0 fs.writeFile / 5 writeAtomic; regen exit 0 0.3s,
valid output (3833 engines). R16 fit-the-whole on the gap the hook widened.
```

## Files touched (2)
- .claude/helpers/regen-digests.mjs | 11 ++++++-----
- 1 file changed, 6 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 297c04132ef8`
- Milestone envelope: `mcp-server/data/milestones/FLEET-HYGIENE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._