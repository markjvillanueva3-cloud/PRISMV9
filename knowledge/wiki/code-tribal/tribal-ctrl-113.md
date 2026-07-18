---
name: tribal-ctrl-113
category: code-tribal
subdomain: programming
domain: tribal-knowledge
tags: ["controller", "fadal", "Format-1", "Format-2", "E-offsets", "legacy"]
confidence: 80
source: "controller:web_research"
promoted_from: knowledge/tribal/controller-knowledge-tips-ctrl-113.md
promoted_at: 2026-06-09T22:31:16.159Z
---

# Fadal CNC Format 1 vs Format 2 critical differences

Fadal VMCs support two programming formats: Format 1 (Fadal native) and Format 2 (Fanuc compatible). Critical differences: Format 1 auto-resets control state, uses E1-E48 work offsets, and only needs D or H (assumes both from same offset). Format 2 requires explicit resets in program, accepts G54-G59 or E-type offsets, and REQUIRES both D and H words — omitting either will crash. Format 1 was designed for finger-cam style automation and does things automatically that may be undesirable. Format 2 is recommended for shops running mixed Fadal/Fanuc machines. Both formats support Fadal-specific canned cycles: bolt hole circle (L93NN), mill boring (L95NN), rectangular/circular pocket cycles, and engraving with serialization. The G68 axis rotation works well in both formats. Rigid tapping uses G84.2 (prepare) + G84.1 (execute) which differs from standard Fanuc G84 rigid tap.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-085|iTNC 530 limitations vs TNC 640 — migration awareness]]
- [[controller-knowledge-tips-ctrl-047|Fadal CNC legacy controller compatibility notes]]
- [[camworks-cam-tips-cw-085|Post Customization — Modify Output Format for Your Controller]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[catia-cam-tips-cat-070|Post-Processor Table Customization for Controller Compatibility]]
