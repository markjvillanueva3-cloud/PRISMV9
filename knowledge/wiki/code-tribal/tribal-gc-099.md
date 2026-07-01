---
name: tribal-gc-099
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "optimization", "linking", "retract", "clearance-plane", "non-cutting"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-099.md
promoted_at: 2026-06-09T22:31:16.337Z
---

# Linking optimization reduces non-cutting travel between operations

GibbsCAM's linking parameters control how the tool moves between cutting passes: retract height, clearance plane, transfer method, and rapid vs. feed transitions. Set the retract height to just above the tallest obstruction (not the default machine Z-home). Use 'Direct' transfer between adjacent passes when the tool can safely traverse at the part surface level. Set clearance planes per operation rather than a global value—operations in deep pockets need a different clearance than those on the top surface. Optimized linking can reduce non-cutting time by 20-40% on multi-feature parts.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[worknc-cam-tips-wnc-100|Linking Optimization Minimizes Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-101|Rapid optimization uses shortest-path calculation between retract points]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
