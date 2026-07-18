---
name: tribal-teb-029
category: code-tribal
subdomain: roughing
domain: tribal-knowledge
tags: ["retract", "rapid", "non-cutting-time", "optimization"]
confidence: 88
source: "web:tebis-docs"
promoted_from: knowledge/tribal/tebis-cam-tips-teb-029.md
promoted_at: 2026-06-09T22:31:16.713Z
---

# Rapid Retract Height Optimization Reduces Non-Cutting Time

Set rapid retract height as low as safely possible — typically 2-5mm above the highest stock surface. Avoid retracting to the machine home position between cuts. Tebis offers three retract modes: fixed height, clearance above stock, and optimized (follows stock contour). Use optimized retract for deep cavities where fixed height would require long retract moves. This can save 5-15% of total cycle time on deep mold cavities.

**Category:** roughing
**Confidence:** 88
**Source:** web:tebis-docs
**Operations:** roughing

## Related
- [[gibbscam-cam-tips-gc-101|Rapid optimization uses shortest-path calculation between retract points]]
- [[bobcad-cam-tips-bc-104|Stock-Aware Linking Minimizes Non-Cutting Time]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
