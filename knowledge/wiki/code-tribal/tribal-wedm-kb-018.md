---
name: tribal-wedm-kb-018
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "taper", "uv-axis", "maximum-angle", "guide-gap"]
confidence: 87
source: "handbook:mitsubishi_fa_app_notes"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-018.md
promoted_at: 2026-06-09T22:31:16.790Z
---

# Maximum taper angle depends on workpiece thickness

WEDM taper is limited by the machine's UV travel and the distance between upper and lower guides. Maximum taper angle = atan(UV_max_travel / guide_gap). For a typical Mitsubishi FA20S with ±30mm UV travel and 350mm guide gap: max taper ≈ ±5°. For larger tapers, reduce the guide gap by raising the lower guide. WARNING: reducing guide gap below 100mm + workpiece thickness risks collision. Always verify clearance with dry run (G0 only, no wire).

**Category:** machining
**Confidence:** 87
**Source:** handbook:mitsubishi_fa_app_notes
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[camworks-cam-tips-cw-161|Wire EDM Taper Cutting — Die Clearance and Draft Angles]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-wedm-kb-017|Taper cutting: verify UV zero offset before every job]]
