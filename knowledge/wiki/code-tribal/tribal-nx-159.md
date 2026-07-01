---
name: tribal-nx-159
category: code-tribal
subdomain: cam_strategy
domain: tribal-knowledge
tags: ["fbm", "feature-recognition", "rules", "knowledge-editor"]
confidence: 0
source: "web:siemens-nx-docs"
promoted_from: knowledge/tribal/nx-cam-tips-ext-nx-159.md
promoted_at: 2026-06-09T22:31:16.503Z
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
