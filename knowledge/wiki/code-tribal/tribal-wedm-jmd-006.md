---
name: tribal-wedm-jmd-006
category: code-tribal
subdomain: speeds_feeds
domain: tribal-knowledge
tags: ["wire-edm", "feed-rate", "skim-pass", "e12xx", "e28xx", "mitsubishi", "fa-10s", "pass-sequence"]
confidence: 93
source: "jm_die_programs"
promoted_from: knowledge/tribal/wedm-knowledge-tips-wedm-jmd-006.md
promoted_at: 2026-05-26T16:07:21.242Z
---

# Skim pass feed rate does NOT monotonically decrease — peak at pass 3

Common intuition says each successive WEDM skim pass should be slower (finer cut = slower). JM Die's actual production programs contradict this. In the E28xx taper 5-pass family (NOZE TEST.NC): Pass1=F0.16, Pass2=F0.23, Pass3=F0.26, Pass4=F0.30, Pass5=no feed specified. In the E12xx standard 4-pass family: Pass1=F0.12, Pass2=F0.24, Pass3=F0.21, Pass4=F0.20. The pattern is clear: Pass 2 is significantly faster than Pass 1, Pass 3 is sometimes faster than Pass 2, and final passes slow slightly. Explanation: Pass 1 (rough) is feed-rate limited by debris clearing; Pass 2 removes the bulk of recast and runs fast because discharge craters are still relatively large; later passes slow as crater size shrinks and spark energy must be reduced. Never slow all skim passes uniformly — use the E-code family's calibrated feed sequence.

**Category:** speeds_feeds
**Confidence:** 93
**Source:** jm_die_programs
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-jmd-001|H175 master offset: global trim variable for JM Die Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-wedm-jmd-002|Always use double M78 M78 for tank fill on Mitsubishi FA-10S]]
- [[wedm-knowledge-tips-wedm-jmd-003|Adaptive control M90 only on rough pass — disable M91 for skims]]
- [[wedm-knowledge-tips-wedm-mcam-005-2|No Core toolpath removes material without slugs — zigzag or spiral cutting]]
- [[wedm-knowledge-tips-wedm-sp-002|Makino SP43/SP64 vs Mitsubishi FA-10S: E-pack numbering is incompatible — never cross-apply codes]]
