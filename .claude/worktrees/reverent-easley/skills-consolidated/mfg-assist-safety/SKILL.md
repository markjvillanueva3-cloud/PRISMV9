---
name: mfg-assist-safety
description: Get safety guidance and warnings for manufacturing operations
---

# Manufacturing Safety Guidance

## When To Use
- Need a safety checklist or PPE requirements before starting an operation
- Working with hazardous materials (beryllium, hexavalent chromium, magnesium, etc.)
- Performing a hazard assessment for a new setup or unfamiliar process
- Reviewing emergency procedures for a specific material or operation combination

## How To Use
```
prism_intelligence action=assist_safety params={
  operation: "grinding",
  material: "beryllium_copper",
  context: { wet_or_dry: "dry", ventilation: "local_exhaust" }
}
```

**Parameters:**
- `operation` (required): The machining or manufacturing operation
- `material` (required): Workpiece material, especially important for hazardous alloys
- `context` (optional): Coolant type, ventilation, enclosure, operator proximity

## What It Returns
- `hazard_level`: "routine" | "elevated" | "high" | "critical" — overall risk classification
- `hazards`: Array of specific hazards with descriptions and risk ratings
- `required_ppe`: Personal protective equipment list with specification details
- `safety_precautions`: Ordered steps to set up and run the operation safely
- `emergency_procedures`: What to do if exposure, fire, or injury occurs
- `regulatory_references`: Applicable OSHA, NIOSH, or EPA standards with section numbers
- `material_sds_notes`: Key Safety Data Sheet points for the specific material

## Examples
- **BeCu Grinding**: `material: "beryllium_copper", operation: "grinding"` → CRITICAL hazard level, full-face PAPR with P100 filters, HEPA vacuum mandatory, wet grinding strongly preferred, OSHA 29 CFR 1910.1024 beryllium standard, 0.2 ug/m3 TWA PEL
- **Magnesium Milling**: `material: "AZ31B", operation: "milling"` → HIGH hazard, fire risk from fine chips, Class D extinguisher required at machine, no water-based coolant, dedicated chip collection
- **Steel Turning**: `material: "4140", operation: "turning"` → ROUTINE hazard, safety glasses, chip guards, standard coolant handling, hearing protection if above 85 dBA
- **Titanium Drilling**: `material: "Ti-6Al-4V", operation: "drilling"` → ELEVATED hazard, fine chip fire risk, ensure continuous coolant flow, do not allow chip accumulation
