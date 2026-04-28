---
id: "teb-026"
title: "Roughing Overlap Between Adjacent Levels Prevents Material Steps"
source: "web:tebis-tutorials"
confidence: 86
category: "roughing"
tags: ["overlap", "z-step", "level-transition", "scallop"]
_source: "tebis-cam-tips.ts"
indexed_at: 2026-04-28T01:00:44.240Z
---

# Roughing Overlap Between Adjacent Levels Prevents Material Steps

Set a vertical overlap of 5-10% of the Z step between adjacent roughing levels. Without overlap, material ridges remain at level transitions that stress semi-finishing tools. The overlap ensures each level cuts slightly into the previous level boundary. For ball endmill roughing, increase overlap to 15-20% because the ball geometry leaves more scallop material at level transitions.

**Category:** roughing
**Confidence:** 86
**Source:** web:tebis-tutorials
**Operations:** roughing

## Related
- [[surfcam-cam-tips-sc2-150|SURFCAM Barrel Cutter Tilt Strategy for Wall Finishing]]
- [[bobcad-cam-tips-bc-058|Synchronized Operations for Reduced Cycle Time]]
- [[catia-cam-tips-cat-002|Facing Operation Overlap Percentage for Full Coverage]]
- [[edgecam-cam-tips-ec-013|Face Milling with Optimized Cutter Overlap]]
- [[edgecam-cam-tips-ec-043|Profiling with Controlled Overlap for Accuracy]]
