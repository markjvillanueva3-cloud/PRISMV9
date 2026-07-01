---
name: tribal-ec-193
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["multi-pallet", "probing", "datum-setting", "automation"]
confidence: 0
source: "web:edgecam-docs"
promoted_from: knowledge/tribal/edgecam-cam-tips-ec-193.md
promoted_at: 2026-06-09T22:31:16.206Z
---

# Pallet Probing and Datum Setting Automation

Automate pallet datum setting by programming probe routines that run after each pallet load. Probe 3 points on a reference surface to establish the pallet work coordinate system. Store offsets in G54.1 extended work coordinates. For repeated production, probe the first cycle to establish offsets and reuse for subsequent cycles — only re-probe if part or fixture changes. The probe routine compensates for pallet repeatability error (typically ±0.005-0.01mm on quality pallet systems).

**Category:** cam_strategy
**Confidence:** 0.84
**Source:** web:edgecam-docs
**Operations:** probing

## Related
- [[camworks-cam-tips-cw-115|Setup Probing — Automatic Work Coordinate Establishment]]
- [[camworks-cam-tips-cw-196|Automated Probing Cycles — First-Part Verification Before Production]]
- [[controller-knowledge-tips-ctrl-056|Fanuc G10 programmatic offset setting for automation]]
- [[controller-knowledge-tips-ctrl-065|Fanuc Macro B tool breakage detection pattern]]
- [[fusion360-cam-tips-ext-f360-091|WCS Probing to Establish Part Zero Automatically]]
