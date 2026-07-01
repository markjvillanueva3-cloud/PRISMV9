---
name: tribal-gc-188
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "pencil-trace", "hsm", "fillets", "edge-cleaning"]
confidence: 85
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-188.md
promoted_at: 2026-06-09T22:31:16.361Z
---

# GibbsCAM pencil tracing cleans fillets and edges missed by area-clearing passes

After constant-Z or 3D-offset finishing in GibbsCAM, run a pencil-trace operation to clean up internal fillets and concave edges where the main finishing tool could not reach. The pencil trace toolpath follows the intersection curves between adjacent surfaces, removing the cusps left at these transitions. Use a ball-nose endmill with radius equal to or smaller than the smallest fillet radius. Set the cutting depth to match the fillet radius. For multi-fillet parts, run pencil trace as the last operation — it typically removes only 0.01-0.05 mm of material but has a dramatic impact on visual quality. In hardened materials, use the same HSM parameters (light DOC, high speed).

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-013|Pencil tracing automatically targets concave fillet intersections]]
- [[gibbscam-cam-tips-gc-103|Acceleration-aware toolpath generation matches machine dynamics for actual speed]]
- [[gibbscam-cam-tips-gc-186|GibbsCAM hardened steel HSM uses light DOC with high speed to stay below thermal threshold]]
- [[gibbscam-cam-tips-gc-187|GibbsCAM die/mold HSM strategies use constant-Z with morphed transitions]]
- [[gibbscam-cam-tips-gc-189|GibbsCAM barrel cutter finishing doubles step-over on hardened die walls]]
