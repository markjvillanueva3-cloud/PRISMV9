---
id: "wnc-100"
title: "Linking Optimization Minimizes Non-Cutting Time"
source: "web:worknc-linking"
confidence: 91
category: "cam_strategy"
tags: ["linking", "retract", "non-cutting", "optimization"]
_source: "worknc-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.699Z
---

# Linking Optimization Minimizes Non-Cutting Time

WorkNC's linking optimization minimizes non-cutting moves between passes. Configure: 'Minimum retract' (fastest, needs collision checking), 'Safe plane' (safest but slowest), or 'Smart retract' (minimum safe height per location). Use arc transitions for smooth motion. Set transfer moves to tangential connections between passes rather than linear rapids. Smart retract typically saves 10-20% compared to safe-plane retract.

**Category:** cam_strategy
**Confidence:** 91
**Source:** web:worknc-linking
**Operations:** general

## Related
- [[esprit-cam-tips-esp-104|Linking Strategy Optimization Reduces Non-Cutting Time]]
- [[gibbscam-cam-tips-gc-099|Linking optimization reduces non-cutting travel between operations]]
- [[camworks-cam-tips-cw-092|Linking Strategy — Optimize Retract and Transition Moves]]
- [[edgecam-cam-tips-ec-092|Linking Strategy Reduces Non-Cutting Travel]]
- [[topsolid-cam-tips-ts-104|Linking Optimization Minimizes Non-Cutting Moves]]
