---
id: "nx-159"
title: "Feature-Based Machining Process Planning"
source: "web:siemens-nx-docs"
confidence: 0.86
category: "cam_strategy"
tags: ["fbm", "feature-recognition", "rules", "knowledge-editor"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.450Z
---

# Feature-Based Machining Process Planning

NX's FBM automatically recognizes manufacturing features and assigns machining processes. Customize the 'Machining Knowledge Editor' to define rules: IF hole_diameter > 20mm AND depth/diameter > 3 THEN use helical_milling ELSE use drilling. FBM rules capture shop-specific best practices. After recognition, review the feature list — FBM occasionally misclassifies filleted pockets as holes or merges adjacent features.

**Category:** cam_strategy
**Confidence:** 0.86
**Source:** web:siemens-nx-docs
**Operations:** setup

## Related
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[cimatron-cam-tips-cim-008|Automatic Feature Recognition for Drilling]]
- [[nx-cam-tips-ext-nx-088|Shop-Floor Feedback Integration for FBM Refinement]]
- [[nx-cam-tips-nx-017|FBM Automatic Feature Recognition on Imported Files]]
- [[nx-cam-tips-nx-034|NX Turning with FBM for Lathe Features]]
