---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-063
title: Fanuc G08 Advanced Preview Control for high-speed machining
category: programming
subcategory: cam_strategy
domain: controller_specific
knowledge_type: rule
confidence: 80
source: controller:web_research
created_at: 2026-03-07
usage_count: 0
tags: ["controller", "fanuc", "G08", "hsm", "advanced-preview", "high-speed-machining", "operation:hsm", "controller:fanuc"]
material_groups: []
operation_types: ["hsm"]
content_hash: 3af3d7ee195f8b938eb97cec1e491ce72482c49a76e85737e4031246b79aee5d
mirror_ts: 2026-05-05T13:36:03.942Z
mirror_engine: TribalVaultPopulatorEngine
---

# Fanuc G08 Advanced Preview Control for high-speed machining

**Category:** `programming` · **Subcategory:** `cam_strategy` · **Domain:** `controller_specific`

**Confidence:** `80` · **Source:** `controller:web_research`

## Tip

G08 P1 activates Advanced Preview Control (APC) on Fanuc controls. G08 P0 cancels. APC pre-reads upcoming blocks and optimizes feedrate based on the upcoming geometry, automatically decelerating for corners and accelerating on straights. Difference from AICC (G05.1): G08 is the simpler/older version, G05.1 is the AI-enhanced version with more parameters. On 0i-MF: G08 may be the only HSM option available (AICC is an option). On 31i-B5: both G08 and G05.1 are available, prefer G05.1 Q1 Rx for finer control. G05, G05.1, and G08 all serve similar purposes but evolved across controller generations. Some machine tool builders remap these — always verify. For CAM post-processors: output G05.1 Q1 R5 at program start and G05.1 Q0 at program end for a safe default HSM configuration.

## Applies to

- Operation types: `hsm`

## Related tips

- [[ctrl-051|Fanuc look-ahead buffer sizes by controller model]] _(category+op:1+tag:5)_
- [[ctrl-057|Fanuc coolant M-codes including through-spindle]] _(category+op:1+tag:4)_
- [[ctrl-061|Fanuc milling-specific canned cycles (0i-MF / 31i-B5)]] _(category+op:1+tag:4)_
- [[ctrl-064|Fanuc turning vs milling controller G-code conflicts]] _(category+op:1+tag:4)_
- [[ctrl-005|Fanuc high-speed peck drilling G73 vs G83]] _(category+op:1+tag:3)_

## Tags

#controller #fanuc #g08 #hsm #advanced-preview #high-speed-machining #operation-hsm #controller-fanuc
