---
name: tribal-nx-100
category: code-tribal
subdomain: tooling
domain: tribal-knowledge
tags: ["siemens-nx", "tool-assembly", "3d-holder", "collision-accuracy", "step-import"]
confidence: 88
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-100.md
promoted_at: 2026-06-09T22:31:16.487Z
---

# Tool Assembly Creation with 3D Holder Geometry

Always create complete tool assemblies in NX with 3D holder geometry rather than using simplified cylinder representations. Import holder CAD from manufacturer websites (Sandvik, Kennametal, BIG DAISHOWA provide STEP files) and assemble with the cutting tool in the Tool dialog. 3D holder geometry enables accurate collision checking in both toolpath generation and ISV. A simplified holder can miss interference by 5-15 mm in tight cavity work where the holder nose approaches the part.

**Category:** tooling
**Confidence:** 88
**Source:** web:siemens-nx-docs
**Operations:** setup

## Related
- [[bobcad-cam-tips-bc-094|Tool Assembly Definitions for Collision Accuracy]]
- [[mastercam-cam-tips-mc-097|Tool Assembly definition combines cutter, holder, and extension for accurate collision checking]]
- [[nx-cam-tips-ext-nx-043|VBM Level-Based Roughing with Variable Cut Depths]]
- [[nx-cam-tips-ext-nx-044|VBM IPW Visualization with Section Analysis]]
- [[nx-cam-tips-ext-nx-045|VBM Rest Material Detection with Smaller Tool Reference]]
