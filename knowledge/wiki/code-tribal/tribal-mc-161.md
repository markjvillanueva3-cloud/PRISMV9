---
name: tribal-mc-161
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["mastercam", "back-spotface", "back-counterbore", "through-hole", "custom-cycle", "blind-side"]
confidence: 82
source: "web:community"
promoted_from: knowledge/tribal/mastercam-cam-tips-mc-161.md
promoted_at: 2026-06-09T22:31:16.434Z
---

# Back-spotfacing creates flat-bottom recesses on the blind side of through-holes

Back-spotfacing (or back-counterboring) creates a flat seating surface on the exit side of a through-hole where direct access from above is impossible. In Mastercam, program this using a specialized back-spotface tool that passes through the existing hole, then deploys a cutting blade radially. The programming sequence is: (1) rapid to the hole centerline, (2) feed through the hole at reduced speed, (3) deploy the blade (M-code specific to the tool), (4) feed up to cut the spotface at slow feed (0.02–0.05 mm/rev), (5) retract blade, (6) rapid out. Use Mastercam's Custom Drill cycle to define these steps. The pre-existing through-hole must be at least 1 mm larger than the back-spotface tool body diameter. Always simulate this operation to verify the tool clears the hole walls during insertion and extraction.

**Category:** cam_strategy
**Confidence:** 82
**Source:** web:community
**Operations:** drilling, hole_making

## Related
- [[wedm-knowledge-tips-wedm-mcam-001-2|Wire overburn decreases progressively per pass — 0.035→0.02→0.01→0]]
- [[wedm-knowledge-tips-wedm-mcam-003-2|Lead-in/lead-out with arcs reduces burrs — Line+Arc in, Arc+Line out]]
- [[mastercam-cam-tips-mc-040|Dynamic Mill micro lifts eliminate full retracts between slices]]
- [[mastercam-cam-tips-mc-041|Dynamic Mill approach distance controls initial engagement ramp length]]
- [[mastercam-cam-tips-mc-042|Dynamic Mill slot width controls minimum feature size for engagement]]
