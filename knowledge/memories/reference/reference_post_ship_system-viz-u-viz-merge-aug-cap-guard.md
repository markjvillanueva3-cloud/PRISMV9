---
name: reference_post_ship_system-viz-u-viz-merge-aug-cap-guard
description: Auto-distilled learnings from shipping SYSTEM-VIZ/U-VIZ-MERGE-AUG-CAP-GUARD (commit 628aaa51f). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.067Z
aliases: reference_post_ship_system-viz-u-viz-merge-aug-cap-guard
---


# SYSTEM-VIZ/U-VIZ-MERGE-AUG-CAP-GUARD

[MAIN] [SYSTEM-VIZ]/U-VIZ-MERGE-AUG-CAP-GUARD (slot:sierra): merge-augmentations loadOptional() loud-degrades on >512MiB augmentations instead of silently dropping them. obsidian-augmentation.json is 416MB and climbing; at >512MiB the old JSON.parse(readFileSync utf8) threw -> caught -> null -> 139K nodes would silently lose wiki/memory linkage (silent master-index rot, R12). Now reads off-heap Buffer, records+logs LOUD on oversize, string-parses only under cap. +exceedsStringParseCap/V8_MAX_STRING_BYTES shared cap-check in graph-io.mjs (centralizes the cap that the tribal-index + obsidian bugs both hit un-checked). 28/28 tests; merge verified exit 0 + obsidian:yes at 416MB no regression. (golf merge-bug investigation: distinct from golf's 630MB exit-1 which was likely the already-fixed truncation cascade.)

**Shipped:** 2026-06-09T23:44:10-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[system-viz-u-viz-merge-aug-cap-guard]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._