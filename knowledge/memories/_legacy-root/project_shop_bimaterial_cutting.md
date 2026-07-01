---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_shop_bimaterial_cutting.md
source_filename: project_shop_bimaterial_cutting.md
content_hash: 766fbb9b72a10c04551dc4fca858dbde321c5e8369985581c35596a96d2ced24
mirror_ts: 2026-05-05T13:00:09.529Z
mirror_engine: ObsidianMemorySyncEngine
---

Many shop wire EDM programs cut brazed carbide inserts in hardened tool steels (up to HRC 65). The wire toolpath runs right at the braze joint where carbide meets hardened steel.

**Why this matters:**
- Bi-material cutting (carbide + hardened steel at braze interface) is legitimately slower than single-material
- Wire break risk is elevated at material transitions (different electrical/thermal properties)
- Conservative feed rates for these parts may be CORRECT, not "amateur"
- The ITW SHAKEPROOF F0.12 ipm might actually be appropriate for carbide-brazed work

**How to apply:**
- Don't blindly flag bi-material cutting programs as "suboptimal"
- The WEDMCalibrationReportEngine should detect bi-material scenarios and adjust published ranges downward
- EDMBiMaterialCompensationEngine already exists for this — use its zone-specific parameters
- When material is "carbide" or "brazed", reduce published speed ranges by 40-60%
- The K-group (carbide) published rates assume pure carbide, not carbide-at-braze-joint
