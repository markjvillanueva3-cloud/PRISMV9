---
name: tribal-wnc-172
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["spc", "mold", "cavity-wear", "injection", "control-charts"]
confidence: 87
source: "web:worknc-docs"
promoted_from: knowledge/tribal/worknc-cam-tips-wnc-172.md
promoted_at: 2026-06-09T22:31:16.824Z
---

# SPC on Mold Dimensions — Tracking Cavity Size Over Production Run

Implement SPC on critical mold dimensions during the injection mold production run (not during mold machining). Track: cavity dimensions (which grow with wear), gate dimensions (which erode from glass-filled materials), and parting line flash (which indicates die wear). Set control limits based on the first 100 shots of stable production. Typical mold life before rework: P20 with glass-filled nylon = 50K-100K shots, H13 = 300K-500K shots. When SPC signals a shift, schedule mold polishing or re-machining using WorkNC programs updated with the measured wear pattern.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:worknc-docs
**Operations:** general

## Related
- [[camworks-cam-tips-cw-176|Statistical Process Control — Xbar-R Charts for CNC Dimensions]]
- [[cimatron-cam-tips-cim-047|SPC Integration for Mold Shop Quality]]
- [[hypermill-cam-tips-ext-hm-165|Mutual Information for SPC Feature Selection]]
- [[nx-cam-tips-ext-nx-145|SPC Integration for Aerospace Production]]
- [[powermill-cam-tips-pm-085|SPC Control Charts for Critical Dimensions]]
