---
id: "nx-024"
title: "Post Builder Feed Rate Limiting via Word Definition"
source: "web:siemens-community"
confidence: 83
category: "post_processor"
tags: ["nx", "post-builder", "feed-rate", "safety", "word-definition"]
_source: "nx-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.512Z
---

# Post Builder Feed Rate Limiting via Word Definition

To enforce machine-specific feed limits in the post, go to N/C Data Definitions > WORD, find the F word, and set the maximum value with violation handling set to 'Truncate Value'. This silently caps any feed rate that exceeds the machine's capability. Document the limit in the post header comment so programmers know the cap is active.

**Category:** post_processor
**Confidence:** 83
**Source:** web:siemens-community
**Operations:** post-processing

## Related
- [[nx-cam-tips-nx-022|Post Builder Template Selection]]
- [[nx-cam-tips-nx-023|Post Builder Custom Commands for Shop Enforcement]]
- [[nx-cam-tips-nx-025|Exporting and Reusing Custom Post Features]]
- [[nx-cam-tips-nx-030|Toolpath Analysis for Cut Validation]]
- [[nx-cam-tips-nx-001|VBM Face Selection for Prismatic Volumes]]
