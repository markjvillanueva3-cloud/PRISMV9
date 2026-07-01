---
name: tribal-jm-die-004
category: code-tribal
subdomain: machining
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "e28xx", "5-pass", "taper", "uv-axis", "4-axis", "e2821", "e2822", "e2823", "e2824", "e2825", "mitsubishi", "fa-20s"]
confidence: 91
source: "jm_die_production_analysis:NOZE_TEST"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-004.md
promoted_at: 2026-05-26T16:07:21.201Z
---

# JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825

When cutting tapered profiles (common in extrusion die inserts and heading punches), JM Die uses the E28xx taper sequence with UV axis engagement. The E2821-E2825 family is optimized for Mitsubishi FA-20S 4-axis mode where upper and lower profiles differ. Key difference from E12xx: the E28xx roughing pass uses adaptive power compensation (M90 activated) to maintain consistent spark gap as wire angle varies. For tapers >3°, always use E28xx over E12xx. Taper capability: FA-20S supports ±15° in 3" thickness. For complex 3D profiles (different top/bottom shapes), program UV moves explicitly — do not rely on automatic taper compensation for shape differences.

**Category:** machining
**Confidence:** 91
**Source:** jm_die_production_analysis:NOZE_TEST
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-018|JM Die NOZE TEST pattern — 4-axis UV taper benchmark program]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[esprit-cam-tips-esp-154|Wire EDM 4-Axis Taper Cutting with Independent UV Motion]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-wedm-jmd-005|UV taper programs: set all H-register offsets to zero]]
