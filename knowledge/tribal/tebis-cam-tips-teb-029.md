---
id: "teb-029"
title: "Rapid Retract Height Optimization Reduces Non-Cutting Time"
source: "web:tebis-docs"
confidence: 88
category: "roughing"
tags: ["retract", "rapid", "non-cutting-time", "optimization"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.242Z
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
