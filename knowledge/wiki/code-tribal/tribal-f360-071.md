---
name: tribal-f360-071
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fusion360", "thread-milling", "climb", "conventional", "direction"]
confidence: 86
source: "web:fusion360-docs"
promoted_from: knowledge/tribal/fusion360-cam-tips-ext-f360-071.md
promoted_at: 2026-06-09T22:31:16.269Z
---

# Thread Milling with Correct Climb/Conventional Direction

In the Thread operation, select Climb milling for external threads and Conventional for internal threads when using single-point thread mills. This ensures the cutting forces push the tool into the material consistently. For multi-tooth thread mills, reverse the convention — use Conventional for external and Climb for internal. Always verify thread direction (right-hand vs left-hand) matches your G-code output; a reversed helix direction produces unusable threads.

**Category:** cam_strategy
**Confidence:** 86
**Source:** web:fusion360-docs
**Operations:** thread_milling

## Related
- [[solidcam-cam-tips-sc-167-2|Chance-Constrained with iMachining Advantage]]
- [[fusion360-cam-tips-ext-f360-050|Parallel Finishing Direction Relative to Feed Marks]]
- [[fusion360-cam-tips-ext-f360-145|Thread Milling vs Tapping Decision Criteria]]
- [[fusion360-cam-tips-ext-f360-147|Thread Milling Climb Direction and Compensation]]
- [[fusion360-cam-tips-ext-f360-148|Thread Milling Entry and Exit Strategy]]
