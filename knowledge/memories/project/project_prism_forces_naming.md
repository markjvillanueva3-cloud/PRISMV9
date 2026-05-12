---
name: PRISM Forces naming convention
description: iMachining-style adaptive clearing renamed to PRISM Forces throughout codebase including future post processors
type: project
originSessionId: 21336b59-d854-43fa-88c4-6366dce7f1d8
---
PRISM Forces is the patent-clean replacement for iMachining-style adaptive clearing.

**Why:** SolidCAM's iMachining is patented (US 8,489,224 — morphed spiral toolpath). PRISM Forces uses physics-based Kienzle force prediction + engagement dynamics to achieve similar results without the patented algorithm.

**How to apply:**
- All post processor engines and generators must output "PRISM Forces" (not iMachining) for adaptive clearing strategies
- The `AdaptiveFeedModulationEngine` and `EngagementDynamicsEngine` implement the physics-based approach
- When translating SolidCAM iMachining toolpaths, map to PRISM Forces in post output
- G-code comments should reference "PRISM Forces Adaptive" not any SolidCAM terminology

**Files updated (2026-04-22):**
- `AdaptiveFeedModulationEngine.ts` — header renamed
- `EngagementDynamicsEngine.ts` — comment updated
- `LegalGateEngine.ts` — patent block now recommends PRISM Forces
- `cutting-ontology.json` — strategy mappings include `"prism": "PRISM Forces"`
- `CAM_VENDOR_REGISTRY.json` — SolidCAM patent_note updated
