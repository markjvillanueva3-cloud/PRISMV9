---
name: tribal-gc-073
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "tombstone", "tool-grouping", "tool-change", "optimization"]
confidence: 88
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-073.md
promoted_at: 2026-06-09T22:31:16.331Z
---

# Tombstone tool grouping minimizes tool changes across all parts

TMS offers tool-based grouping where all operations using the same tool are executed across all parts on all faces before making a tool change. For a tombstone with 24 parts, this means the drill visits all 24 drill locations before changing to the next tool. This reduces tool changes from 24×(tools per part) to just (tools per part), saving 30-60 seconds per eliminated tool change. Enable 'Group by Tool' in TMS and verify the resulting operation sequence does not cause collision issues from the longer rapid traversals between parts on different faces.

**Category:** cam_strategy
**Confidence:** 88
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-052|Gang tooling layout minimizes tool change time on Swiss machines]]
- [[gibbscam-cam-tips-gc-071|TMS duplicates part-fixture combinations across tombstone faces automatically]]
- [[gibbscam-cam-tips-gc-072|Fixture design in TMS includes clamp bodies for collision verification]]
- [[gibbscam-cam-tips-gc-074|Part orientation optimization reduces setups from multiple to single tombstone load]]
- [[gibbscam-cam-tips-gc-097|Automatic tool selection picks optimal tool from library based on feature geometry]]
