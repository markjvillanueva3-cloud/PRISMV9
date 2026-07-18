---
name: tribal-sc2-087
category: code-tribal
subdomain: optimization
domain: tribal-knowledge
tags: ["linking", "retract", "traverse", "stay-down", "non-cutting-time"]
confidence: 90
source: "web:surfcam-linking"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-087.md
promoted_at: 2026-05-26T16:07:20.574Z
---

# Linking Optimization Minimizes Non-Cutting Time

SURFCAM linking controls how the tool moves between cutting passes (retracts, traverses, and approaches). Optimize linking by setting: retract height to minimum safe clearance above stock (not a fixed high plane), traverse feed to machine rapid rate, and approach distance to 2mm before the cut starts. Enable 'Stay down' linking for adjacent passes at the same Z-level to skip the retract/traverse/approach sequence entirely, reducing cycle time by 15-30% on complex parts.

**Category:** optimization
**Confidence:** 90
**Source:** web:surfcam-linking
**Operations:** roughing, finishing

## Related
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
