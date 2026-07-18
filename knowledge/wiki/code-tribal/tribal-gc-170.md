---
name: tribal-gc-170
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "post-processor", "verification", "backplot", "g-code-comparison"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-170.md
promoted_at: 2026-06-09T22:31:16.357Z
---

# Post processor verification compares G-code back to CAM toolpath for drift detection

After posting, use GibbsCAM's backplot feature to read the generated G-code and overlay it on the original CAM toolpath. Discrepancies indicate post processor errors — common issues include arc direction reversal (G02/G03 swap), incorrect decimal point formatting, missing feedrate on first move, or axis letter substitution errors. Compare the backplotted toolpath node-by-node against the original. For critical aerospace parts, perform a full volumetric comparison: simulate the G-code stock removal and compare the resulting solid against the CAM simulation solid. Differences exceeding 0.01 mm indicate a post error that must be resolved before running the part.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-076|Post processor customization through Compost enables machine-specific G-code]]
- [[gibbscam-cam-tips-gc-077|Multi-axis post processors handle rotary axis output and RTCP compensation]]
- [[gibbscam-cam-tips-gc-078|Canned cycle output from post maps GibbsCAM operations to G81/G83/G84]]
- [[gibbscam-cam-tips-gc-079|Machine-specific posts must match exact control firmware for safety codes]]
- [[gibbscam-cam-tips-gc-080|Sub-program output reduces file size for repeated operations and patterns]]
