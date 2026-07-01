---
name: tribal-wedm-jmd-005
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["wire-edm", "taper", "uv-axis", "h-register", "offset", "e28xx", "mastercam", "post"]
confidence: 96
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-005.md
promoted_at: 2026-05-26T16:07:21.239Z
---

# UV taper programs: set all H-register offsets to zero

In JM Die's Mitsubishi FA-10S UV taper programs (E28xx family), ALL H-register wire compensation offsets are set to zero: H1=0.0+H175, H2=0.0+H175, etc. (and H175=0.0000 as well). This is confirmed in NOZE TEST.NC — a 5-pass UV taper stainless program where all 5 H-registers are 0.0000. The reason: taper wire compensation (kerf offset for an angled wire) cannot be decomposed into a simple 2D offset. The Mastercam Mitsubishi FA post processor handles the geometric taper compensation in the UV coordinates themselves, not via H-register offsets. Using non-zero H-registers in a taper program will double-compensate and produce an incorrect taper angle. Set H=0 for all taper jobs and let the post handle geometry.

**Category:** programming
**Confidence:** 96
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-119|4-axis taper wire EDM requires synchronized upper/lower guide geometry]]
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-004-2|4-axis Wire EDM synchronization methods — match upper/lower chains correctly]]
- [[wedm-knowledge-tips-jm-die-004|JM Die E28xx taper 5-pass for 4-axis UV work — E2821-E2822-E2823-E2824-E2825]]
