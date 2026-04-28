---
id: "nx-037"
title: "Use as Template Flag for Reusable Operations"
source: "web:siemens-community"
confidence: 82
category: "setup"
tags: ["nx", "templates", "use-as-template", "reusable-operations", "standardization"]
_source: "nx-cam-tips.ts"
indexed_at: 2026-04-28T01:00:43.523Z
---

# Use as Template Flag for Reusable Operations

When saving operations to a template part, always check the 'Use as Template' flag and enable 'created when parent is created' for child operations. Without these flags, operations won't appear in the template selection dialog and parent-child relationships won't replicate correctly. Test the template on a fresh part before distributing to the shop.

**Category:** setup
**Confidence:** 82
**Source:** web:siemens-community
**Operations:** setup

## Related
- [[nx-cam-tips-nx-018|Machining Knowledge Editor for Shop Standards]]
- [[nx-cam-tips-nx-025|Exporting and Reusing Custom Post Features]]
- [[nx-cam-tips-nx-035|Never Modify Shipped CAM Templates]]
- [[bobcad-cam-tips-bc-069|Operation Templates for Standardized Programming]]
- [[cimatron-cam-tips-cim-013|NC Template Automation for Repeat Jobs]]
