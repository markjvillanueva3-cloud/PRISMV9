---
name: tribal-nx-035
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["nx", "templates", "best-practice", "cam-setup", "version-control"]
confidence: 88
source: "web:siemens-community"
promoted_from: knowledge/tribal/nx-cam-tips-nx-035.md
promoted_at: 2026-06-09T22:31:16.526Z
---

# Never Modify Shipped CAM Templates

Never edit the original NX CAM operation templates in the MACH/resource/template_part directory. Always copy the template file to a custom location, modify the copy, and point NX to your custom template folder via the CAM preferences. This protects your customizations from being overwritten during NX updates and lets you version-control your templates separately.

**Category:** setup
**Confidence:** 88
**Source:** web:siemens-community
**Operations:** setup

## Related
- [[nx-cam-tips-nx-037|Use as Template Flag for Reusable Operations]]
- [[topsolid-cam-tips-ts-079|Machining Templates Capture Best-Practice Processes]]
- [[nx-cam-tips-nx-001|VBM Face Selection for Prismatic Volumes]]
- [[nx-cam-tips-nx-002|VBM Volume Sequencing for Multi-Step Roughing]]
- [[nx-cam-tips-nx-003|VBM Associativity with CAD Changes]]
