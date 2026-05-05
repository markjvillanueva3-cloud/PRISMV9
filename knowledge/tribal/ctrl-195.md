---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-195
title: Haas G84.2 peck rigid tapping — software version requirement and deep tap strategy
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 93
source: controller:haas_ngc_release_notes_100.23
created_at: 2026-04-15
usage_count: 0
tags: ["haas", "ngc", "g84.2", "peck-tapping", "deep-tapping", "chip-breaking", "sw-100.23", "tool-steel", "d2", "m2", "material:P", "material:Steel", "material:D2 Tool Steel", "operation:drilling", "operation:tapping", "machine:Haas", "tool:tap", "controller:haas"]
material_groups: ["P"]
operation_types: ["drilling", "tapping"]
content_hash: 49b3ca4943461cc9177f2faf12b4252df3e57df1b94e63485fe193ed5a2a3dd7
mirror_ts: 2026-05-05T13:36:00.975Z
mirror_engine: TribalVaultPopulatorEngine
---

# Haas G84.2 peck rigid tapping — software version requirement and deep tap strategy

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:haas_ngc_release_notes_100.23`

## Tip

G84.2 (peck rigid tapping with chip breaking) was introduced in Haas NGC software version 100.23.000.1201. Before this version, peck tapping required manual macro programming with G84 + M97 recursive calls. G84.2 syntax: G84.2 X<x> Y<y> Z<depth> R<retract> Q<peck_increment> F<pitch>. Q is the peck depth in current units — the cycle drills Q deep, retracts partially to break chips, then continues. This is distinct from G83 full-retract peck drilling. Use case at JM Die: deep tapped holes in D2 and M2 tool steel (L/D > 3) prone to tap breakage from chip packing. Recommended Q = 0.5x tap diameter for most materials; use Q = 0.3x for tough materials. Always verify SW version before using G84.2: check Settings > Software Versions; SW version must be 100.23.000.1201 or higher. Post-processor note: the Fusion haas next generation.cps property usePeckTapping=true enables G84.2 output when the SW version requirement is met.

## Applies to

- Material groups: `P`
- Operation types: `drilling`, `tapping`

## Related tips

- [[ctrl-228|JM Die Okuma CSS G96/G97 usage — constant surface speed for die turning]] _(category+material:1+op:1+tag:5)_
- [[ctrl-227|JM Die Okuma G74 peck drilling on lathe — deep hole drilling cycle]] _(category+material:1+op:1+tag:5)_
- [[ctrl-197|Haas M138/M139 Spindle Speed Variation — chatter suppression without hardware]] _(category+material:1+tag:7)_
- [[ctrl-190|Haas NGC Setting 130 — tapping feed mode and G95 IPR best practice]] _(category+op:1+tag:5)_
- [[ctrl-199|Brother G77/G78 pitch-based tapping — 30+ taps per minute]] _(category+op:2+tag:3)_

## Tags

#haas #ngc #g84-2 #peck-tapping #deep-tapping #chip-breaking #sw-100-23 #tool-steel #d2 #m2 #material-p #material-steel #material-d2-tool-steel #operation-drilling #operation-tapping #machine-haas #tool-tap #controller-haas
