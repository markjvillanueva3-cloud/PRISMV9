---
name: tribal-sc2-136
category: code-tribal
subdomain: setup
domain: tribal-knowledge
tags: ["tool-library", "migration", "tdb", "holder-assembly", "traditional"]
confidence: 0
source: "web:surfcam-docs"
promoted_from: knowledge/tribal/surfcam-cam-tips-sc2-136.md
promoted_at: 2026-06-09T22:31:16.689Z
---

# Migrating Tool Libraries from Traditional to SURFCAM 2023

SURFCAM Traditional stores tool data in .tdb files with a flat structure. SURFCAM 2023 uses a hierarchical tool library with holder assemblies, insert definitions, and cutting condition tables. Use the Tool Library Migration wizard (File > Import > Traditional Tool Library) to convert .tdb files. After migration, manually verify holder dimensions and add assembly information — Traditional .tdb files lack holder geometry data. Build holder assemblies in 2023 for accurate collision checking.

**Category:** setup
**Confidence:** 0.85
**Source:** web:surfcam-docs
**Operations:** roughing, finishing, drilling

## Related
- [[cimatron-cam-tips-cim-088|Tool Library Management with Presetter Integration]]
- [[cimatron-cam-tips-cim-167|Cloud Tool Library for Multi-Site Shops]]
- [[cimatron-cam-tips-cim-192|Tool Library Presetter Integration]]
- [[edgecam-cam-tips-ec-080|Centralized Tool Library with Assemblies]]
- [[esprit-cam-tips-esp-092|Centralized Tool Library with Assembly Management]]
