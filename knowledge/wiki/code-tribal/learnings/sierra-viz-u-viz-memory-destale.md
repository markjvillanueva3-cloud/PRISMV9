# SIERRA-VIZ/U-VIZ-MEMORY-DESTALE — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-MEMORY-DESTALE (slot:sierra): de-stale 2 system-viz galaxy MEMORY threads (merge-OOM + FAST[] gap are resolved)

**Commit:** `4865dba93dae` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:01:28-05:00
**Tags:** sierra-viz, u-viz-memory-destale, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-MEMORY-DESTALE (slot:sierra): de-stale 2 system-viz galaxy MEMORY threads (merge-OOM + FAST[] gap are resolved)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-MEMORY-DESTALE (slot:sierra): de-stale 2 system-viz galaxy MEMORY threads (merge-OOM + FAST[] gap are resolved)

Two entries in mcp-server/src/engines/system-viz/MEMORY.md presented RESOLVED issues as still-active --
the stale-memory class that misleads future sierra chats (verified this session: a stale COPY of the
merge-augmentations fix sent an earlier investigation chasing a phantom merge-OOM).
- Merge OOM / exit 134: corrected to "merge path RESOLVED" -- merge-augmentations.mjs now uses
  readGraphStreaming + writeGraphStreamingAtomic (scripts/lib/graph-io.mjs:140/110), so it no longer
  string-parses the ~770MB graph. PRESERVED the OOM CLASS as a hard rail for new graph code (CLAUDE.md
  §6: never raw JSON.parse/stringify the merged graph).
- FAST[] registration gap (U-VIZ-FAST-REGISTER-9): "2/9 wired; 7 blocked on merge-OOM" -> "5+/9 wired
  (quoting/hotel/milling-tribal/svi/vendor); the blocked-on-merge-OOM reason is OBSOLETE (OOM resolved)".
Doc-only (galaxy MEMORY); no code/tsc change.
```

## Files touched (2)
- mcp-server/src/engines/system-viz/MEMORY.md | 4 ++--
- 1 file changed, 2 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till-active --

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4865dba93dae`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._