---
name: tribal-ctrl-063
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fanuc", "G08", "hsm", "advanced-preview", "high-speed-machining"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-063.md
promoted_at: 2026-06-09T22:31:16.146Z
---

# Fanuc G08 Advanced Preview Control for high-speed machining

G08 P1 activates Advanced Preview Control (APC) on Fanuc controls. G08 P0 cancels. APC pre-reads upcoming blocks and optimizes feedrate based on the upcoming geometry, automatically decelerating for corners and accelerating on straights. Difference from AICC (G05.1): G08 is the simpler/older version, G05.1 is the AI-enhanced version with more parameters. On 0i-MF: G08 may be the only HSM option available (AICC is an option). On 31i-B5: both G08 and G05.1 are available, prefer G05.1 Q1 Rx for finer control. G05, G05.1, and G08 all serve similar purposes but evolved across controller generations. Some machine tool builders remap these — always verify. For CAM post-processors: output G05.1 Q1 R5 at program start and G05.1 Q0 at program end for a safe default HSM configuration.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
- [[controller-knowledge-tips-ctrl-054|Fanuc G37 automatic tool length measurement]]
