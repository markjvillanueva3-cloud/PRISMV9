---
name: tribal-jm-die-013
category: code-tribal
subdomain: quality
domain: tribal-knowledge
tags: ["wire-edm", "jm-die", "h-register", "offset", "cascade", "quality-check", "anti-pattern"]
confidence: 96
source: "jm_die_production_analysis"
promoted_from: knowledge/tribal/wedm-knowledge-tips-jm-die-013.md
promoted_at: 2026-05-26T16:07:21.210Z
---

# JM Die offset cascade verification — H-values must strictly decrease per pass

A critical quality check for any JM Die wire EDM program: H-register offset values must strictly decrease from rough to final skim. Typical cascade: H1=0.0085 > H2=0.0068 > H3=0.0059 > H4=0.0054 (inches). If any H-value equals or exceeds the previous pass, the wire will re-cut the same material or leave stock — both cause quality issues. The neural analysis engine flags 'AP003: Offset increases between passes' as a major anti-pattern. When reviewing programs, verify: H[n+1] < H[n] for all passes. The decrement between passes should be 0.0005-0.0015" — smaller decrements are fine for precision, but larger decrements indicate missing passes.

**Category:** quality
**Confidence:** 96
**Source:** jm_die_production_analysis
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-jm-die-001|JM Die H175 master offset convention — use H175 as the primary offset base]]
- [[wedm-knowledge-tips-wedm-jmd-005|UV taper programs: set all H-register offsets to zero]]
- [[bobcad-cam-tips-bc-063|Skim Cuts for Progressive Surface Finish Improvement]]
- [[camworks-cam-tips-cw-073|2-Axis Wire EDM — Profile Cutting with Automatic Feature Detection]]
- [[surfcam-cam-tips-sc2-164|SURFCAM Wire EDM Multi-Pass Skim Cut Strategies]]
