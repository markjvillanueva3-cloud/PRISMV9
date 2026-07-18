# SYSTEM-VIZ-OBSIDIAN/U-VIZ-OBSIDIAN-STREAM — [MAIN] [SYSTEM-VIZ-OBSIDIAN]/U-VIZ-OBSIDIAN-STREAM: stream-write obsidian-augmentation.json (root fix — supersedes compact-only)

**Commit:** `c1ba2688a330` · **By:** markjvillanueva3-cloud · **At:** 2026-05-31T18:54:26-05:00
**Tags:** system-viz-obsidian, u-viz-obsidian-stream, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ-OBSIDIAN]/U-VIZ-OBSIDIAN-STREAM: stream-write obsidian-augmentation.json (root fix — supersedes compact-only)

## Body
```
[MAIN] [SYSTEM-VIZ-OBSIDIAN]/U-VIZ-OBSIDIAN-STREAM: stream-write obsidian-augmentation.json (root fix — supersedes compact-only)

ROOT CAUSE found: the augmentation outgrew V8's ~512MB max-string-length cap, so even compact JSON.stringify(out) throws RangeError: Invalid string length — the bridge had been SILENTLY FAILING to regenerate node.knowledge (the real reason obsidian-augmentation.json was 8 days stale; the prior compact-only fix U-VIZ-OBSIDIAN-COMPACT was necessary but insufficient). New writeAugmentationStreaming() emits the same compact JSON in bounded ~16MB chunks, never building the full string; main() now isMain-guarded for import-safety. 5 tests: byte-identical round-trip + multi-flush + empty + escaped-keys + source-guard. Verified the 280MB file was intact (stringify throws before writeFile).
```

## Files touched (3)
- scripts/system-viz-obsidian-bridge-v2.mjs      | 63 ++++++++++++++++++++++++++++++++++++++++++++++++++++-----------
- scripts/system-viz-obsidian-bridge-v2.test.mjs | 84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----------------
- 2 files changed, 120 insertions(+), 27 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c1ba2688a330`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ-OBSIDIAN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._