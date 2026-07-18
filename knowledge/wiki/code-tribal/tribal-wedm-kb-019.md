---
name: tribal-wedm-kb-019
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["wire-edm", "taper", "accuracy", "skim-pass", "offset", "compensation"]
confidence: 86
source: "handbook:klocke_2013_ch8"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-kb-019.md
promoted_at: 2026-06-09T22:31:16.791Z
---

# Taper accuracy: skim passes are critical

Taper dimensional accuracy is WORSE than straight cuts by a factor of 1.5-2×. The wire deflects differently at angles, and the offset compensation must account for the angled kerf geometry. Always run at least 2 skim passes on taper cuts (vs 1 that might suffice for straight cuts). On the skim passes, disable taper offset compensation (H=0.0000) as shown in the NOZE TEST program — the skim passes follow the same UV path as the rough cut.

**Category:** quality
**Confidence:** 86
**Source:** handbook:klocke_2013_ch8
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-jmd-005|UV taper programs: set all H-register offsets to zero]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[bobcad-cam-tips-bc-062|4-Axis Wire EDM Taper with Independent UV Guides]]
