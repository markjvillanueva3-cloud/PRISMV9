---
schema_version: 1.0.0
kind: tribal_tip
id: TK-DL-post-009
title: G10 automates work offset setup — eliminates manual data entry errors on fixture plates
category: setup
subcategory: probing
domain: document_learned
knowledge_type: setup_lesson
confidence: 90
source: document:cnccookbook-g10@syntax
created_at: 2026-03-06
usage_count: 0
tags: ["g10", "work-offset", "fixture-plate", "automation", "setup-reduction", "multi-part", "controller:generic"]
material_groups: []
operation_types: []
content_hash: b2fcf4dde1d80b03cbc29211dcc56436fae5bedb9b0e5b93110f810a3b81cb09
mirror_ts: 2026-05-05T13:36:01.478Z
mirror_engine: TribalVaultPopulatorEngine
---

# G10 automates work offset setup — eliminates manual data entry errors on fixture plates

**Category:** `setup` · **Subcategory:** `probing` · **Domain:** `document_learned`

**Confidence:** `90` · **Source:** `document:cnccookbook-g10@syntax`

## Tip

G10 L2 P# X Y Z sets work offsets programmatically: P1=G54, P2=G55, through P6=G59. G10 L20 P# accesses extended offsets G54.1 P1 through P48. In G90 mode, XYZ values replace the offset; in G91 mode they add to it. Use G10 at program start to automatically configure all work offsets for a fixture plate — operator just loads the fixture and presses start. Combined with probing, G10 enables fully automated multi-part setups. LinuxCNC extends to P7=G59.1, P8=G59.2, P9=G59.3.

## Related tips

- [[tk-dl-hm-112|Automatic surface extension eliminates Z-level wraparound]] _(category+tag:1)_
- [[sc2-111|WCS (Work Coordinate System) Setup for Multi-Fixture Parts]] _(category+tag:1)_
- [[tk-dl-hm-025|hyperMILL Python API job type codes for CAM automation]] _(category+tag:1)_
- [[tk-dl-workholding-001|Workholding selection: vise, vacuum (14.7 psi limit), mandrel, fixture plate + ball locks]] _(category+tag:1)_
- [[f360-013|3+2 Positioning Reduces Setup Count]] _(category+tag:1)_

## Tags

#g10 #work-offset #fixture-plate #automation #setup-reduction #multi-part #controller-generic
