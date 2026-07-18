---
name: tribal-wedm-mcam-005
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "mitsubishi", "fa-s", "acu", "accuracy-priority", "7-pass", "e952", "e5601", "surface-finish", "ra"]
confidence: 93
source: "mastercam:mitsubishi_fa_s_tech_file_acu_method"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-mcam-005.md
promoted_at: 2026-05-26T16:07:21.319Z
---

# Mitsubishi FA-S ACU 7-pass: use only when Ra < 0.18µm (7 µin) is required

The Mastercam X8 Mitsubishi FA-S tech file defines an Accuracy Priority (ACU) 7-pass method for 0.010" brass wire on steel. This uses E-code families 952/5601-5607 (thin stock, 0.5") or 5611-5617 (1.00" thick). 7 passes achieves Ra 7 µin (0.18µm) — the finest surface achievable with wire EDM. However: the 7th pass adds Ra 0.025µm improvement over 6 passes at roughly 2× the skim time. Use the ACU 7-pass family only when: (a) customer specifies Ra < 8 µin (0.2µm), or (b) the feature mates with a precision-ground punch and a lapping step is not viable. For standard die work (Ra 0.4–0.8µm), stop at 5 passes — the ACU family's passes 6 and 7 are rarely cost-justified in die production.

**Category:** machining
**Confidence:** 93
**Source:** mastercam:mitsubishi_fa_s_tech_file_acu_method
**Operations:** wire_edm

## Related
- [[mastercam-cam-tips-mc-126|No-core wire EDM cutting eliminates slug handling for large openings]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-002-2|Reverse cutting method eliminates re-threading between passes]]
- [[bobcad-cam-tips-bc-064|No-Core Wire EDM for Non-Droppable Slugs]]
