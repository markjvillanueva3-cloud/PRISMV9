---
name: tribal-gc-094
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "tool-management", "holder", "collision-check", "step-import"]
confidence: 87
source: "web:gibbscam-docs"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-094.md
promoted_at: 2026-06-09T22:31:16.336Z
---

# Tool holder definitions enable accurate collision checking in simulation

Define each tool holder in GibbsCAM with its actual physical dimensions: taper type (BT, CAT, HSK), body diameter, body length, collet nut protrusion, and any flange or keyway features. Associate holders with tools in the tool library so every tool has a complete assembly profile for collision checking. For shrink-fit and hydraulic holders with slim profiles, accurate holder definitions allow the simulation to verify that the holder clears tight features. Import holder geometry from manufacturer STEP files for maximum accuracy—GibbsCAM supports STEP/IGES holder import.

**Category:** cam_strategy
**Confidence:** 87
**Source:** web:gibbscam-docs

## Related
- [[gibbscam-cam-tips-gc-072|Fixture design in TMS includes clamp bodies for collision verification]]
- [[gibbscam-cam-tips-gc-093|Tool library centralizes cutting data for company-wide consistency]]
- [[gibbscam-cam-tips-gc-095|Material-specific cutting data tables eliminate manual speed/feed calculation]]
- [[gibbscam-cam-tips-gc-096|Tool string assemblies model the complete tool-holder-extension stack]]
- [[gibbscam-cam-tips-gc-097|Automatic tool selection picks optimal tool from library based on feature geometry]]
