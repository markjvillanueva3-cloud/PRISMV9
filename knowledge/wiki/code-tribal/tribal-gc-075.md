---
name: tribal-gc-075
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "pallet", "hmc", "tms", "pallet-changer", "utilization"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-075.md
promoted_at: 2026-06-09T22:31:16.331Z
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
