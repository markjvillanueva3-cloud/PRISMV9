---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-203
title: Brother through-tool coolant M494/M495 and extended WCS G54.1 P1-P300
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 90
source: controller:brother_speedio_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["brother", "speedio", "cnc-c00", "m494", "m495", "through-tool-coolant", "g54.1", "work-offsets", "pallet", "tombstone", "operation:tapping", "machine:Brother", "tool:tap"]
material_groups: []
operation_types: ["tapping"]
content_hash: 0f1bca8e91d9d5f065436e5ecee18cf6499611e6ef8feb0bfa2046e1c4f3dc58
mirror_ts: 2026-05-05T13:36:01.539Z
mirror_engine: TribalVaultPopulatorEngine
---

# Brother through-tool coolant M494/M495 and extended WCS G54.1 P1-P300

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `90` · **Source:** `controller:brother_speedio_cps_rev44207`

## Tip

Brother Speedio uses two through-tool coolant code sets: M88/M89 for basic through-spindle coolant, and M494/M495 for the higher-pressure Speedio spindle-coolant option (available on machines with the optional through-spindle coolant package — verify machine spec). For flood+through-tool combined: output M08 and M494 in sequence; cancel with M09 and M495. Always use through-tool coolant when tapping deeper than 2× diameter — dramatically reduces tap wear and breakage. For WCS: Brother CNC-C00 supports G54-G59 (6 standard offsets) plus G54.1 P1 through G54.1 P300 (300 extended offsets). Extended offsets are essential for pallet fixtures and tombstone setups. The Fusion Speedio post defines both ranges in its wcsDefinitions. When programming multi-part tombstones, assign G54.1 P1-Pn for each fixture face — allows one program to machine all faces without operator intervention between setups.

## Applies to

- Operation types: `tapping`
- Machine IDs: `brother-speedio`

## Related tips

- [[ctrl-199|Brother G77/G78 pitch-based tapping — 30+ taps per minute]] _(category+op:1+tag:6)_
- [[ctrl-202|Brother Machining Load Monitor M341/M342/M343 — automatic tool breakage detection]] _(category+op:1+tag:6)_
- [[ctrl-201|Brother High Accuracy Mode A/B/M298 — 6 smoothing levels for contour vs drilling]] _(category+op:1+tag:5)_
- [[ctrl-036|Brother CNC-C00 high-speed tapping advantage]] _(category+op:1+tag:5)_
- [[ctrl-158|Fanuc through-tool coolant M88/M89 and combined flood+through]] _(category+op:1+tag:3)_

## Tags

#brother #speedio #cnc-c00 #m494 #m495 #through-tool-coolant #g54-1 #work-offsets #pallet #tombstone #operation-tapping #machine-brother #tool-tap
