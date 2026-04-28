---
id: "teb-010"
title: "Automatic Core/Cavity Split Separates Mold Halves"
source: "web:tebis-docs"
confidence: 85
category: "mold_die"
tags: ["core-cavity", "split", "draft-analysis", "undercut"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.228Z
---

# Automatic Core/Cavity Split Separates Mold Halves

Tebis auto-split function separates a plastic part into core and cavity sides using draft analysis. Set the pull direction and the system identifies surfaces belonging to each half. Undercut surfaces are flagged for slide or lifter mechanisms. After splitting, each half gets its own machining setup with appropriate stock. Verify the split result by checking that no surfaces have zero-draft angles relative to the pull direction.

**Category:** mold_die
**Confidence:** 85
**Source:** web:tebis-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-191|Core/Cavity Split Surface Machining Strategy in CATIA]]
- [[cimatron-cam-tips-cim-069|Core/Cavity Parting Surface Generation]]
- [[tebis-cam-tips-teb-068|Core/Cavity Split Surface Management]]
- [[cimatron-cam-tips-cim-007|Multi-Setup Mold Core/Cavity Coordination]]
- [[mastercam-cam-tips-mc-141|Core/cavity split machining uses separate machine groups for each mold half]]
