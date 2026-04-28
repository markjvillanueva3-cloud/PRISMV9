---
id: "ctrl-055"
title: "Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets"
source: "controller:web_research"
confidence: 80
category: "programming"
tags: ["controller", "fanuc", "work-offsets", "G54", "G54.1", "fixtures", "coordinates"]
_source: "controller-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:42.195Z
---

# Fanuc work coordinate systems: G54-G59 and G54.1 extended offsets

Standard work offsets: G54-G59 (6 offsets, always available). Extended offsets: G54.1 P1 through G54.1 P48 (48 additional offsets, optional on some models). Total: up to 54 work coordinate systems. Setting offsets programmatically: G10 L2 P1 X__ Y__ Z__ (set G54, P2=G55...P6=G59). G10 L20 P1 X__ Y__ Z__ (set G54.1 P1 through P48). In G90 mode, G10 replaces values; in G91 mode, G10 adds to existing values. G54.1 is NOT the same as G54 — G54.1 is the header for extended offsets, G54.1 P1 is the first extended offset. Use extended offsets for tombstone fixtures, pallet systems, and multi-part setups. G53 (machine coordinate) overrides all work offsets for that block only — use for safe tool change positions.

**Category:** programming
**Confidence:** 80
**Source:** controller:web_research

## Related
- [[controller-knowledge-tips-ctrl-003|Fanuc extended work offsets G54.1 P1-P300]]
- [[camworks-cam-tips-cw-088|Machine-Specific Post Output — Optimize for Controller Capabilities]]
- [[controller-knowledge-tips-ctrl-051|Fanuc look-ahead buffer sizes by controller model]]
- [[controller-knowledge-tips-ctrl-052|Fanuc Macro B variable ranges and persistence]]
- [[controller-knowledge-tips-ctrl-053|Fanuc probing with G31 skip signal]]
