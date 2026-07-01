# SYSTEM-VIZ/U-VIZ-MERGE-AUG-CAP-GUARD — [MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-AUG-CAP-GUARD (slot:sierra): merge-augmentations loadOptional() loud-degrades on >512MiB augmentations instead of silently dropping them. obsidian-augmentation.json is 416MB and climbing; at >512MiB the old JSON.parse(readFileSync utf8) threw -> caught -> null -> 139K nodes would silently lose wiki/memory linkage (silent master-index rot, R12). Now reads off-heap Buffer, records+logs LOUD on oversize, string-parses only under cap. +exceedsStringParseCap/V8_MAX_STRING_BYTES shared cap-check in graph-io.mjs (centralizes the cap that the tribal-index + obsidian bugs both hit un-checked). 28/28 tests; merge verified exit 0 + obsidian:yes at 416MB no regression. (golf merge-bug investigation: distinct from golf's 630MB exit-1 which was likely the already-fixed truncation cascade.)

**Commit:** `628aaa51f583` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T23:44:10-05:00
**Tags:** system-viz, u-viz-merge-aug-cap-guard, auto-distilled

## Subject
[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-AUG-CAP-GUARD (slot:sierra): merge-augmentations loadOptional() loud-degrades on >512MiB augmentations instead of silently dropping them. obsidian-augmentation.json is 416MB and climbing; at >512MiB the old JSON.parse(readFileSync utf8) threw -> caught -> null -> 139K nodes would silently lose wiki/memory linkage (silent master-index rot, R12). Now reads off-heap Buffer, records+logs LOUD on oversize, string-parses only under cap. +exceedsStringParseCap/V8_MAX_STRING_BYTES shared cap-check in graph-io.mjs (centralizes the cap that the tribal-index + obsidian bugs both hit un-checked). 28/28 tests; merge verified exit 0 + obsidian:yes at 416MB no regression. (golf merge-bug investigation: distinct from golf's 630MB exit-1 which was likely the already-fixed truncation cascade.)

## Body
```
[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-AUG-CAP-GUARD (slot:sierra): merge-augmentations loadOptional() loud-degrades on >512MiB augmentations instead of silently dropping them. obsidian-augmentation.json is 416MB and climbing; at >512MiB the old JSON.parse(readFileSync utf8) threw -> caught -> null -> 139K nodes would silently lose wiki/memory linkage (silent master-index rot, R12). Now reads off-heap Buffer, records+logs LOUD on oversize, string-parses only under cap. +exceedsStringParseCap/V8_MAX_STRING_BYTES shared cap-check in graph-io.mjs (centralizes the cap that the tribal-index + obsidian bugs both hit un-checked). 28/28 tests; merge verified exit 0 + obsidian:yes at 416MB no regression. (golf merge-bug investigation: distinct from golf's 630MB exit-1 which was likely the already-fixed truncation cascade.)
```

## Files touched (4)
- scripts/lib/graph-io.mjs        | 24 ++++++++++++++++++++++++
- scripts/lib/graph-io.test.mjs   | 14 +++++++++++++-
- scripts/merge-augmentations.mjs | 28 +++++++++++++++++++++++++---
- 3 files changed, 62 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 628aaa51f583`
- Milestone envelope: `mcp-server/data/milestones/SYSTEM-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._