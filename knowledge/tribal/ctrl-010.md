---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-010
title: Fanuc rigid tapping G84 with synchronization
category: programming
domain: controller_specific
knowledge_type: heuristic
confidence: 92
source: controller:fanuc_tapping_guide
created_at: 2026-03-07
usage_count: 0
tags: ["fanuc", "rigid-tapping", "g84", "m29", "synchronization", "operation:tapping", "tool:tap", "controller:fanuc"]
material_groups: []
operation_types: ["tapping"]
content_hash: d6d2b77ecdd28c22e5ebdb6826c6dd79bdb04fcd3de1a6b62425682438295fe7
mirror_ts: 2026-05-05T13:36:01.084Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc rigid tapping G84 with synchronization

**Category:** `programming` · **Domain:** `controller_specific`

**Confidence:** `92` · **Source:** `controller:fanuc_tapping_guide`

## Tip

Fanuc rigid tapping (G84 with M29 or G84.2/G84.3) synchronizes spindle and Z-axis for tap-without-tension-compression holders. Key: set parameter #5200 bit 2 = 1 for rigid tap mode. Retract override is parameter #5211. For blind holes, use G84 with G80 cancel, and ensure bottom dwell (P parameter in ms). Max rigid tap speed depends on servo loop — typically 3000-5000 RPM on 0i-MF, 6000+ on 31i.

## Applies to

- Operation types: `tapping`

## Related tips

- [[ctrl-208|Mitsubishi rigid tapping ,R1 syntax and program number reservation ranges]] _(category+op:1+tag:5)_
- [[ctrl-062|Fanuc M19 spindle orientation and rigid tapping]] _(category+op:1+tag:5)_
- [[ctrl-181|Okuma G284 — OSP-native rigid tapping cycle, no M29 synchronization required]] _(category+op:1+tag:4)_
- [[ctrl-158|Fanuc through-tool coolant M88/M89 and combined flood+through]] _(category+op:1+tag:4)_
- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+op:1+tag:3)_

## Tags

#fanuc #rigid-tapping #g84 #m29 #synchronization #operation-tapping #tool-tap #controller-fanuc
