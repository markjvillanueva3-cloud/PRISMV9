---
id: "ec-192"
title: "Mixed-Part Pallet Programming for Job Shop Flexibility"
source: "web:edgecam-forum"
confidence: 0.81
category: "cam_strategy"
tags: ["multi-pallet", "mixed-parts", "job-shop", "optimization"]
_source: "edgecam-cam-tips.ts"
indexed_at: 2026-04-28T01:00:42.416Z
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
