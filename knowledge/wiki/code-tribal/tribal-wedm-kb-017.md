---
name: tribal-wedm-kb-017
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["wire-edm", "taper", "uv-axis", "alignment", "calibration"]
confidence: 90
source: "handbook:mitsubishi_fa_app_notes"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-017.md
promoted_at: 2026-05-26T16:07:21.284Z
---

# Taper cutting: verify UV zero offset before every job

Before any taper cut, verify U=0 V=0 produces a straight cut. A UV offset error of even 0.01mm translates to a taper error across the full workpiece thickness. Run a 25mm test cut in scrap material and measure top vs bottom — they should match within 0.005mm. If they don't, the UV guides need alignment. Most Mitsubishi machines have a UV alignment macro in the maintenance menu.

**Category:** setup
**Confidence:** 90
**Source:** handbook:mitsubishi_fa_app_notes
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[camworks-cam-tips-cw-161|Wire EDM Taper Cutting — Die Clearance and Draft Angles]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-wedm-kb-018|Maximum taper angle depends on workpiece thickness]]
