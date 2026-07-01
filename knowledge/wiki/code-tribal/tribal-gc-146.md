---
name: tribal-gc-146
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "swiss", "sub-spindle", "backworking", "second-operation"]
confidence: 86
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-146.md
promoted_at: 2026-06-09T22:31:16.350Z
---

# Swiss-type sub-spindle backworking in GibbsCAM handles second-operation features

After cutoff in Swiss-type machining, the sub-spindle holds the part for backworking (second-operation machining of the cutoff face). In GibbsCAM, define the backworking operations in a separate channel with the sub-spindle coordinate system (Z reversed, origin at sub-spindle face). Common backworking operations: face the cutoff pip, drill/bore the back end, chamfer, thread. The sub-spindle typically has less power than the main spindle, so reduce cutting parameters by 20-30%. Program a Z retract after backworking to the part eject position, then command the chuck open and part ejector to fire the finished part into the collection bin.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-046|Sub-spindle transfer requires precise sync and clamp force control]]
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-138|MTM wait codes synchronize part cutoff with sub-spindle catch for lights-out safety]]
- [[gibbscam-cam-tips-gc-141|MTM C-axis milling on the sub-spindle requires transformed coordinate origin]]
- [[gibbscam-cam-tips-gc-145|Guide bushing clearance in GibbsCAM Swiss mode affects surface finish and roundness]]
