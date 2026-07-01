---
name: tribal-ctrl-029
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["okuma", "osp", "g-code", "dialect", "non-fanuc", "programming"]
confidence: 93
source: "controller:okuma_osp_manual"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-029.md
promoted_at: 2026-05-26T16:07:20.136Z
---

# Okuma OSP unique G-code dialect

Okuma OSP is NOT Fanuc-compatible — it uses a proprietary G-code dialect. Key differences: G15 H1 (machining coordinate system, vs Fanuc G54), CALL OO_ (subroutine call, vs Fanuc M98), GOTO N_ (branch, vs Fanuc conditional GO TO), no decimal point programming (G1 X10000 = 10.000mm). OSP also uses IF/THEN/ELSE and WHILE/DO loops natively — more readable than Fanuc Macro B. CAM post-processors MUST use Okuma-specific posts.

**Category:** programming
**Confidence:** 93
**Source:** controller:okuma_osp_manual

## Related
- [[controller-knowledge-tips-ctrl-031|Okuma OSP Super-NURBS for smooth 5-axis]]
- [[controller-knowledge-tips-ctrl-075|SINUMERIK Unique G-Codes Beyond ISO Standard]]
- [[controller-knowledge-tips-ctrl-030|Okuma Thermo-Friendly Concept for thermal stability]]
- [[controller-knowledge-tips-ctrl-095|Okuma OSP Thermo-Friendly Concept — skip warm-up cycles]]
- [[controller-knowledge-tips-ctrl-096|Okuma Collision Avoidance System (CAS) — real-time 3D protection]]
