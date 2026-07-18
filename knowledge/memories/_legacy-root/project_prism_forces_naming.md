---
schema_version: 1.0.0
kind: mirrored_memory
source_path: C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory/project_prism_forces_naming.md
source_filename: project_prism_forces_naming.md
content_hash: 4b9e7d452596654f41f2b8c7cc95510b3746f2e3385919857c351c8e6b9a8a66
mirror_ts: 2026-05-05T13:00:09.522Z
mirror_engine: ObsidianMemorySyncEngine
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
