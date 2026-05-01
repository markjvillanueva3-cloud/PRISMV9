---
description: Resolve any hyperMILL material name to ISO group and Kienzle physics parameters
model: sonnet
effort: HIGH
---

# /hypermill-material-lookup

## Args: $ARGUMENTS

Resolve a hyperMILL material name, Werkstoff number, or trade name to PRISM physics parameters.

## Steps

1. Call `prism_cam` → `cam_hypermill_material_to_physics` with `material = $ARGUMENTS`
   - Returns: `iso_group`, `kc1_1`, `mc`, `confidence`, `found`
2. Call `prism_cam` → `cam_hypermill_material_to_orchestrator` with `quality_id_or_name = $ARGUMENTS`
   - Returns: SpeedFeedOrchestrator-compatible input fragment

## Present to User

Show:
- ISO group (P/M/K/N/S/H) with material family name
- kc1.1 [N/mm²] and mc exponent (from CANONICAL_KIENZLE)
- Confidence score (0–1)
- Orchestrator input params (Vc_m_min, fz_mm, ap_mm suggested ranges)

If `found=false`, suggest the closest match and ask for clarification.
