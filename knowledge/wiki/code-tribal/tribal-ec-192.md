---
name: tribal-ec-192
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-pallet", "mixed-parts", "job-shop", "optimization"]
confidence: 0
source: "web:edgecam-forum"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-192.md
promoted_at: 2026-06-09T22:31:16.206Z
---

# Mixed-Part Pallet Programming for Job Shop Flexibility

Load different parts on different pallets within the same program. In Edgecam, create separate part instances per pallet, each with its own toolpath sequence. Use the Sequence Manager to optimize tool usage across dissimilar parts — if Pallet 1 (housing) and Pallet 2 (bracket) both use a 20mm end mill, sequence those operations together. The post generates a single program with pallet-conditional branching using macro variables to identify which part is on which pallet.

**Category:** cam_strategy
**Confidence:** 0.81
**Source:** web:edgecam-forum
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-191|Pallet Change Time Optimization with Pre-Staging]]
- [[edgecam-cam-tips-ec-190|Multi-Pallet Pool Programming for HMC Machines]]
- [[edgecam-cam-tips-ec-193|Pallet Probing and Datum Setting Automation]]
- [[controller-knowledge-tips-ctrl-033|Hurco WinMax conversational is production-ready]]
- [[bobcad-cam-tips-bc-096|Automatic Tool Selection from Feature Geometry]]
