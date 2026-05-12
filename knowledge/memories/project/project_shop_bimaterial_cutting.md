---
name: Shop wire EDM cuts carbide-brazed inserts in hardened steel
description: Many wire programs cut at carbide/hardened steel braze interfaces (HRC 58-65) — explains slow feeds, justifies conservative parameters
type: project
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
