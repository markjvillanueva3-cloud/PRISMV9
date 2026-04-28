---
id: "gc-075"
title: "Pallet management extends TMS concept to horizontal machining centers"
source: "web:gibbscam-docs"
confidence: 85
category: "cam_strategy"
tags: ["gibbscam", "pallet", "hmc", "tms", "pallet-changer", "utilization"]
_source: "gibbscam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.890Z
---

# Pallet management extends TMS concept to horizontal machining centers

GibbsCAM's TMS extends to pallet-based horizontal machining center (HMC) programming. Define multiple pallets, each with its own fixture and part layout. The post processor outputs pallet call codes (M-codes or pallet changer commands) between pallet operations. Program the pallet change sequence to allow the operator to load/unload one pallet while the machine cuts the other. For twin-pallet HMCs, this achieves near-100% spindle utilization. Set the pallet home position and clearance plane to prevent collision during pallet exchange.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
- [[gibbscam-cam-tips-gc-072|Fixture design in TMS includes clamp bodies for collision verification]]
- [[gibbscam-cam-tips-gc-137|MTM sync chart superimposition detects idle time wasted on one channel]]
- [[gibbscam-cam-tips-gc-001|Use Solid Face Selection for profiling to avoid manual geometry creation]]
- [[gibbscam-cam-tips-gc-002|Set pocket corner radius larger than cutter radius for smoother engagement]]
