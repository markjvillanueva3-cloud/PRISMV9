---
name: tribal-ts-104
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["linking", "retract", "non-cutting", "transfer"]
confidence: 91
source: "web:topsolid-linking"
promoted_from: knowledge/tribal/topsolid-cam-tips-ts-104.md
promoted_at: 2026-05-26T16:07:21.063Z
---

# Linking Optimization Minimizes Non-Cutting Moves

TopSolid's linking (retract/approach/transfer) optimization minimizes the time spent on non-cutting moves between passes. Configure the retract strategy: 'Minimum retract' stays close to the surface (fastest but requires careful collision checking), 'Safe plane' retracts to a fixed Z-height (safest but slowest), 'Smart retract' uses the minimum safe height at each location. Set transfer moves to arc transitions rather than linear rapids for smoother machine motion.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:topsolid-linking
**Operations:** general

## Related
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[worknc-cam-tips-wnc-100|Linking Optimization Minimizes Non-Cutting Time]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
