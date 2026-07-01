---
name: tribal-gc-096
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["gibbscam", "tool-management", "tool-string", "extension", "assembly"]
confidence: 85
source: "web:community"
promoted_from: knowledge/tribal/gibbscam-cam-tips-gc-096.md
promoted_at: 2026-06-09T22:31:16.336Z
---

# Tool string assemblies model the complete tool-holder-extension stack

For long-reach applications, GibbsCAM's tool string feature models the complete assembly: tool + holder + extension(s) + adapter(s). Define each component in the library and snap them together to form a tool string. The system calculates the total assembly length, minimum bore clearance, and maximum reach. This is critical for deep cavity mold work where multiple extensions are stacked. The collision checking uses the entire string geometry, catching interference between extension bodies and the part that a tool-only check would miss. Store common string configurations as named assemblies for quick reuse.

**Category:** cam_strategy
**Confidence:** 85
**Source:** web:community

## Related
- [[gibbscam-cam-tips-gc-093|Tool library centralizes cutting data for company-wide consistency]]
- [[gibbscam-cam-tips-gc-094|Tool holder definitions enable accurate collision checking in simulation]]
- [[gibbscam-cam-tips-gc-095|Material-specific cutting data tables eliminate manual speed/feed calculation]]
- [[gibbscam-cam-tips-gc-097|Automatic tool selection picks optimal tool from library based on feature geometry]]
- [[catia-cam-tips-cat-059|Tool Holder Definition Enables Accurate Collision Checking]]
