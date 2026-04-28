---
id: "nx-083"
title: "FBM Automatic Feature Recognition with PMI-Driven Tolerances"
source: "web:siemens-nx-docs"
confidence: 87
category: "automation"
tags: ["siemens-nx", "fbm", "pmi", "tolerance-driven", "automation"]
_source: "nx-cam-tips-ext.ts"
indexed_at: 2026-04-28T01:00:43.386Z
---

# FBM Automatic Feature Recognition with PMI-Driven Tolerances

NX FBM reads Product and Manufacturing Information (PMI) directly from 3D models to select appropriate machining strategies based on dimensional tolerances. A hole with H7 tolerance automatically triggers a drill-ream sequence instead of just drilling. Surface finish callouts below Ra 1.6 add a finishing pass. Ensure PMI is applied to the solid model before running FBM recognition — features without PMI receive default shop-standard parameters which may not meet print requirements.

**Category:** automation
**Confidence:** 87
**Source:** web:siemens-nx-docs
**Operations:** drilling, milling, 2.5-axis

## Related
- [[nx-cam-tips-ext-nx-078|Thread Cutting with Automatic Pitch Extraction from PMI]]
- [[nx-cam-tips-ext-nx-084|Custom Feature Templates for Part Family Programming]]
- [[nx-cam-tips-ext-nx-088|Shop-Floor Feedback Integration for FBM Refinement]]
- [[catia-cam-tips-cat-169|Feature-Based Machining Automatic Process Assignment]]
- [[cimatron-cam-tips-cim-008|Automatic Feature Recognition for Drilling]]
