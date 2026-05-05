---
schema_version: 1.0.0
kind: tribal_tip
id: ctrl-161
title: Siemens 840D CYCLE800 swivel data record — setup and common pitfalls
category: programming
subcategory: post_processor
domain: controller_specific
knowledge_type: rule
confidence: 93
source: controller:siemens_840d_cps_rev44207
created_at: 2026-04-15
usage_count: 0
tags: ["siemens", "840d", "cycle800", "swivel-data-record", "tilted-workplane", "3+2", "kinematics", "sd42940", "alarm-61102", "controller:siemens"]
material_groups: []
operation_types: []
content_hash: bb8e522c6a0a84e680002977411ff85ccc350c202fcb97f1e5124d4ce7e98af4
mirror_ts: 2026-05-05T13:36:00.977Z
mirror_engine: TribalVaultPopulatorEngine
---

# Siemens 840D CYCLE800 swivel data record — setup and common pitfalls

**Category:** `programming` · **Subcategory:** `post_processor` · **Domain:** `controller_specific`

**Confidence:** `93` · **Source:** `controller:siemens_840d_cps_rev44207`

## Tip

CYCLE800 (tilted working plane) requires a Swivel Data Record (SDR) pre-configured in the machine. The SDR is stored in machine data SD 42940 through SD 42970 and defines the kinematic geometry of the rotary axes. In the post, cycle800SwivelDataRecord property sets the TC parameter (e.g., TC="SWIVEL1"). The TC string MUST exactly match the SDR name on the machine including case. If TC does not match, the control throws alarm '61102 Swivel data block not available'. MODE parameter (default 27=CBA/ZYX Euler) controls the rotation sequence. For a standard A/C table: MODE=27, A=tilt angle, C=rotation angle. Retract mode FR: 0=no retract, 1=retract Z only (standard), 2=retract Z then XY (safest for tombstones). Cancel CYCLE800 with CYCLE800() at program end to ensure the machine returns to flat G54 for the next job.

## Related tips

- [[ctrl-167|Siemens 840D SUPA — super retract that overrides all active coordinate frames]] _(category+tag:4)_
- [[ctrl-162|Siemens 840D CYCLE832 smoothing levels and 6-digit technology code]] _(category+tag:3)_
- [[ctrl-159|Siemens 840D TRAORI — enabling 5-axis simultaneous TCP and tool vector output]] _(category+tag:3)_
- [[ctrl-160|Siemens 840D TRAFOOF — safely cancelling 5-axis TCP transformation]] _(category+tag:3)_
- [[ctrl-166|Siemens 840D extended work offsets G505-G599 and TRANS/ATRANS frame programming]] _(category+tag:3)_

## Tags

#siemens #840d #cycle800 #swivel-data-record #tilted-workplane #3-2 #kinematics #sd42940 #alarm-61102 #controller-siemens
