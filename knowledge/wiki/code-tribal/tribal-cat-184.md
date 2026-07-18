---
name: tribal-cat-184
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["catia", "multi-setup", "probing", "alignment", "wcs-update"]
confidence: 0
source: "web:catia-docs"
promoted_from: knowledge/tribal/catia-cam-tips-cat-184.md
promoted_at: 2026-06-09T22:31:16.074Z
---

# In-Process Probing Between Setups for Alignment Verification

CATIA supports in-process probing operations between machining setups to verify part alignment after re-fixturing. Insert a 'Probing' operation at the start of OP20 that touches off on datum surfaces machined in OP10. CATIA generates the probing routine (Renishaw or Blum compatible) with: (1) probe point locations on datum features, (2) expected nominal values from the design model, (3) tolerance bands from the GD&T specification. The probing results feed back to the CNC controller for Work Coordinate System (WCS) update, correcting any re-fixturing misalignment before OP20 cutting begins. This closed-loop approach achieves ±0.01mm setup accuracy.

**Category:** cam_strategy
**Confidence:** 0.87
**Source:** web:catia-docs
**Operations:** probing

## Related
- [[fusion360-cam-tips-ext-f360-125|Part Alignment Probing for Multi-Setup Work]]
- [[hypermill-cam-tips-ext-hm-186|Multi-Setup Alignment Verification]]
- [[powermill-cam-tips-pm-071|Multi-Setup Coordinate System Alignment]]
- [[powermill-cam-tips-pm-139|Multi-Setup Alignment with Probing]]
- [[sprutcam-cam-tips-spr-155|Multi-Setup Alignment with Probing]]
