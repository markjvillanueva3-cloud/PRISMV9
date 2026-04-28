---
id: "wedm-kb-001"
title: "Wire breakage: reduce power before increasing tension"
source: "handbook:klocke_2013_ch8"
confidence: 92
category: "troubleshooting"
tags: ["wire-edm", "wire-break", "tension", "on-time", "roughing"]
_source: "wedm-knowledge-tips.ts"
indexed_at: 2026-04-28T01:00:44.553Z
---

# Wire breakage: reduce power before increasing tension

When experiencing wire breaks during roughing, reduce ON time (A/t_on) by 10-15% BEFORE increasing wire tension. High tension on a thermally weakened wire accelerates fatigue failure. Klocke (2013) shows that discharge energy is the primary wire heating mechanism — tension only matters once the wire is already near its yield point from thermal cycling. If breaks persist after ON time reduction, then increase tension by 200-300g increments.

**Category:** troubleshooting
**Confidence:** 92
**Source:** handbook:klocke_2013_ch8
**Operations:** wire_edm

## Related
- [[wedm-knowledge-tips-wedm-kb-006|Wire tension monitoring prevents unexpected breaks]]
- [[mastercam-cam-tips-mc-124|Slug management in wire EDM prevents loose slugs from shorting the wire]]
- [[wedm-knowledge-tips-wedm-kb-002|Wire breaks at corners: slow feed + increase OFF time]]
- [[wedm-knowledge-tips-wedm-kb-003|Wire break recovery: re-thread 2mm behind break point]]
- [[wedm-knowledge-tips-wedm-kb-004|Flush pressure prevents wire breaks in deep cuts]]
