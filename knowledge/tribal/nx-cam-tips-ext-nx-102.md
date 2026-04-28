---
id: "nx-102"
title: "Cut Parameter Database with Material-Based Lookup"
source: "web:siemens-nx-docs"
confidence: 86
category: "speeds_feeds"
tags: ["siemens-nx", "cut-parameters", "mdl", "material-lookup", "speeds-feeds"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.401Z
---

# Cut Parameter Database with Material-Based Lookup

Configure NX's Machining Data Library (MDL) with material-based feed/speed lookup tables using the Speeds and Feeds editor. Define entries by material class (P/M/K/N/S/H per ISO 513), tool type, and operation type. NX automatically retrieves recommended cutting parameters when you assign a tool and workpiece material. Override the library values at the operation level for special cases without modifying the master database. Export the MDL as an ASCII file for version control and backup.

**Category:** speeds_feeds
**Confidence:** 86
**Source:** web:siemens-nx-docs
**Operations:** setup

## Related
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
- [[nx-cam-tips-ext-nx-046|VBM Adaptive Step-Over for Non-Uniform Pockets]]
- [[nx-cam-tips-ext-nx-047|VBM Multiple Cut Level Strategies for Stepped Features]]
