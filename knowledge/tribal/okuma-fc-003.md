---
schema_version: 1.0.0
kind: tribal_tip
id: okuma-fc-003
title: Okuma G178/G179 synchronized tapping uses D for start position, J for thread count
category: cnc_programming
domain: document_learned
knowledge_type: rule
confidence: 93
source: document:okuma-fixed-cycles-manual
created_at: 2026-04-15
usage_count: 0
tags: ["okuma", "g-code", "tapping", "rigid-tap", "synchronized", "g178", "g179", "operation:tapping", "operation:threading", "machine:Okuma", "tool:tap"]
material_groups: []
operation_types: ["tapping", "threading"]
content_hash: 3f9239058a90a8020ae2702427c703a57f835348f65b510bb3dd9ce171c5187e
mirror_ts: 2026-05-05T13:36:00.953Z
mirror_engine: TribalVaultPopulatorEngine
---

# Okuma G178/G179 synchronized tapping uses D for start position, J for thread count

**Category:** `cnc_programming` · **Domain:** `document_learned`

**Confidence:** `93` · **Source:** `document:okuma-fixed-cycles-manual`

## Tip

G178 (sync tap forward) and G179 (sync tap reverse) enable rigid tapping on Okuma lathes. D specifies M-tool spindle start position, J specifies number of threads. These cycles synchronize spindle rotation with Z-axis feed for accurate threading without a floating tap holder. Use G178 for right-hand threads, G179 for left-hand. Always verify with a thread gauge on first article.

## Applies to

- Operation types: `tapping`, `threading`

## Related tips

- [[okuma-fc-004|Okuma G185-G188 thread cutting cycles use SA= for C-axis rotation speed]] _(category+op:1+tag:4)_
- [[tk-dl-okuma-001|CRITICAL: Okuma G28 = torque limit cancel (NOT home return!), G20 = home return]] _(op:2+tag:5)_
- [[tk-dl-cnc-003|Thread sizing: M6+ recommended, max engagement 3× nominal]] _(op:2+tag:4)_
- [[ctrl-158|Fanuc through-tool coolant M88/M89 and combined flood+through]] _(op:2+tag:4)_
- [[okuma-fc-001|Okuma G181 drilling cycle uses I/K for rapid shift and Q for hole repeat count]] _(category+tag:3)_

## Tags

#okuma #g-code #tapping #rigid-tap #synchronized #g178 #g179 #operation-tapping #operation-threading #machine-okuma #tool-tap
