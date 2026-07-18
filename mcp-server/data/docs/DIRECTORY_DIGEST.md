# PRISM Directory Digest

**Purpose**: Token-efficient reference for the entire mcp-server file system.
Load this file (~800 tokens) instead of running Glob/Grep to find things.

**Generated**: 2026-06-27 | **Directories**: 135 | **Files**: 10791

## Quick Lookup

| What you need | Where to look | Shortcode |
|--------------|---------------|-----------|
| Engine code | `src/engines/` | E0001-E1300+ |
| Action routing | `src/tools/dispatchers/` | D01-D79 |
| Algorithms | `src/algorithms/` | A01-A51 |
| Tests | `src/__tests__/` | T0001-T0900+ |
| Tool catalogs | `src/data/` | C01-C67 |
| Action schemas | `src/schemas/` | — |
| API routes | `src/routes/` | — |
| Type definitions | `src/types/` | — |
| Milestones | `data/milestones/` | -- |
| Documentation | `data/docs/` | DOC01-DOC36 |
| Hooks | `src/hooks/` | H01-H21 |
| Registries | `src/registries/` | RG01-RG22 |
| Utils | `src/utils/` | U01-U16 |
| Web pages | `web/src/pages/` | — |
| Material data | `data/materials/` | — |
| Roadmap | `data/docs/roadmap/` | — |

## Domain Routing

When a query mentions these topics, look here:

- **cutting/machining/force/speed/feed** -> `src/engines/ (E*), src/algorithms/, src/data/`
- **tool selection/catalog/holder** -> `src/data/ (tool catalogs), src/registries/ToolCatalogRegistry`
- **G-code/post-processor/CAM** -> `src/engines/*GCode*, *Cam*, *PostProcess*, *Toolpath*`
- **machine profiles/kinematics** -> `src/data/machine-*-catalog*.ts`
- **material properties/database** -> `src/registries/MaterialDatabase*, data/materials/`
- **quoting/costing/economics** -> `src/engines/*Cost*, *Quote*, *Economic*, *Price*`
- **quality/SPC/capability** -> `src/engines/*Quality*, *Statistical*, *Process*, *Capability*`
- **safety/risk/OSHA** -> `src/engines/*Safety*, src/hooks/SafetyChain*`
- **welding/joining** -> `src/engines/*Weld*, *Solder*, *Braz*, *FSW*`
- **casting/molding** -> `src/engines/*Cast*, *Mold*, *Injection*, *Rotational*`
- **coating/plating/surface** -> `src/engines/*Coat*, *Plat*, *Spray*, *PVD*, *CVD*`
- **forming/stamping/bending** -> `src/engines/*Form*, *Stamp*, *Bend*, *Roll*, *Press*`
- **thermal/heat treatment** -> `src/engines/*Thermal*, *Heat*, *Quench*, *Anneal*`
- **monitoring/sensor/vibration** -> `src/engines/*Monitor*, *Sensor*, *Vibrat*, *Acoustic*`
- **statistics/Monte Carlo/DOE** -> `src/engines/*Statistic*, *MonteCarlo*, *DOE*, *Bayesian*`
- **chatter/stability/damping** -> `src/engines/*Chatter*, *Stability*, *Damp*, *Vibrat*`
- **deflection/stiffness** -> `src/engines/*Deflect*, *Stiff*, *Compliance*`
- **wear/tool life** -> `src/engines/*Wear*, *Life*, *Usui*, *Taylor*`
- **surface finish/roughness** -> `src/engines/*Surface*, *Finish*, *Roughness*, *Integrity*`
- **token optimization** -> `src/engines/*Token*, *Context*, *Session*, *Compact*, *Output*`
- **playbook/best practices** -> `src/engines/MachiningPlaybookEngine.ts`
- **tribal knowledge/tips** -> `src/registries/TribalKnowledgeEngine*, data/*.json (tips)`
- **EDM/wire/sinker** -> `src/engines/*EDM*, *Wire*, *Sinker*`
- **grinding** -> `src/engines/*Grind*`
- **laser/waterjet** -> `src/engines/*Laser*, *Waterjet*, *AWJ*`
- **turning/lathe** -> `src/engines/*Turn*, *Lathe*, *Bore*`
- **multi-axis/5-axis** -> `src/engines/*FiveAxis*, *MultiAxis*, *RTCP*`

## Top-Level Directory Sizes

- `src/__tests__/` — 4893 files
- `src/engines/` — 3875 files
- `src/schemas/` — 292 files
- `src/data/` — 278 files
- `src/algorithms/` — 174 files
- `src/__tests__/engines/` — 165 files
- `src/tools/dispatchers/` — 122 files
- `src/routes/` — 84 files
- `src/__tests__/fixtures/reference-programs/` — 70 files
- `src/hooks/` — 55 files
- `src/utils/` — 53 files
- `src/__tests__/wedm/` — 52 files
- `src/data/academy/` — 29 files
- `src/registries/` — 29 files
- `src/mcp/` — 23 files
- `src/types/` — 19 files
- `src/db/migrations/` — 18 files
- `src/engines/hypermill/` — 17 files
- `src/schemas/hypermill/cam/` — 15 files
- `src/engines/blueprint-vision/` — 13 files
- `src/tools/` — 13 files
- `src/middleware/` — 12 files
- `src/services/` — 12 files
- `src/engines/business/` — 11 files
- `src/__tests__/dispatchers/` — 11 files
- `src/__tests__/fixtures/okuma-programs/` — 11 files
- `src/__tests__/helpers/` — 11 files
- `src/__tests__/integration/` — 11 files
- `src/__tests__/fixtures/` — 10 files
- `src/schemas/hypermill/settings/` — 9 files
