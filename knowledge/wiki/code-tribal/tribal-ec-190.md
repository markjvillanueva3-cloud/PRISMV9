---
name: tribal-ec-190
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-pallet", "hmc", "pallet-pool", "sequencing"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-190.md
promoted_at: 2026-06-09T22:31:16.206Z
---

# Multi-Pallet Pool Programming for HMC Machines

Program multi-pallet pool operations for horizontal machining centers by defining each pallet as a separate setup in Edgecam. Assign pallet numbers (P1-P6 typical) with unique work coordinate systems. Sequence operations pallet-by-pallet or tool-by-tool across pallets. The post outputs pallet change codes (M60 or manufacturer-specific) between pallet groups. For tool-based sequencing across pallets, the machine loads a tool once and machines all pallets requiring it before changing tools.

**Category:** cam_strategy
**Confidence:** 0.85
**Source:** web:edgecam-docs
**Operations:** all

## Related
- [[edgecam-cam-tips-ec-191|Pallet Change Time Optimization with Pre-Staging]]
- [[edgecam-cam-tips-ec-192|Mixed-Part Pallet Programming for Job Shop Flexibility]]
- [[edgecam-cam-tips-ec-193|Pallet Probing and Datum Setting Automation]]
- [[gibbscam-cam-tips-gc-075|Pallet management extends TMS concept to horizontal machining centers]]
- [[bobcad-cam-tips-bc-158|BobCAD Wire EDM Multi-Cavity Optimization with Common Start Holes]]
