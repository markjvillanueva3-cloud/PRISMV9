---
name: reference_foxtrot_mill_juliett_db_edge_2026_05_29
description: mill ← juliett (databases) cross-galaxy edge — mill consumes the tool/material/machine/coolant/coating registries + jm-die-profile + jm-die-database; juliett owns DB schema/expansion. Validated via scripts/mill-path-index.mjs §databases-juliett.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.580Z
aliases: reference_foxtrot_mill_juliett_db_edge_2026_05_29
---


# mill ← juliett database edge (wired 2026-05-29)

Operator directive: "wire to juliett galaxy for the databases." Mill is the **primary consumer** of PRISM's data registries; **juliett** (database expansion slot) owns their schema + expansion. The edge is now wired in the mill galaxy doctrine + the validated path index.

**Database surfaces mill depends on (the edge):**
- `mcp-server/src/registries/ToolRegistry.ts` — tool catalog DB
- `mcp-server/src/registries/MaterialRegistry.ts` — material props (density/hardness/specific cutting energy; feeds Kienzle kc)
- `mcp-server/src/registries/MachineRegistry.ts` — machine catalog
- `mcp-server/src/registries/{ToolGeometryDefaults,CoolantRegistry,CoatingRegistry}.ts` — geometry/coolant/coating DBs
- `mcp-server/src/data/jm-die-profile.ts` — VMC-01..05 machine specs DB
- `mcp-server/data/jm-die-database/` — JM Die customer/program database (built by `scripts/build-jm-die-database.mjs`)

**Wired where:**
- `mcp-server/src/engines/mill/CLAUDE.md` §Related galaxies — added the `mill ← juliett (databases)` row.
- `mcp-server/src/engines/mill/PATHS.md` §Cross-galaxy entry points + the `databases-juliett` category of `scripts/mill-path-index.mjs` → `PATH-INDEX.json` (existence-validated: 8/9 present on slot tree; `jm-die-database/` lives on the main/cad-fusion tree).

**Discipline:** NEVER re-derive material kc/density or tool geometry in a mill engine — read the registry (matches the never-inline-constants rule). 

**Symmetry TODO (R7 / galaxy doctrine):** juliett's galaxy should add the reciprocal `juliett → mill (consumer)` edge. Ping juliett via chat-bus; until then this edge is asymmetric. Related: [[reference_mill_domain_atlas_for_foxtrot_2026_05_27]], [[project_foxtrot_mill_galaxy_ownership_2026_05_28]], [[reference_foxtrot_mill_awareness_2026_05_28]].

## All 10 milling DB categories mapped (2026-05-29) — see `mill/DATABASES.md`
Operator: "wire in all databases for milling: machines, materials, controllers, tooling, tool holders, fixturing, tool paths, sfc, post processors, alarms." Built `mcp-server/src/engines/mill/DATABASES.md` + expanded `mill-path-index.mjs` §databases-juliett (28/29 surfaces validated present after correction; the 1 absent = `jm-die-database`, lives on main tree). Coverage: **6 fully-wired-with-registry** (machines=MachineRegistry+MachineSpindleDefaults+6 machine catalogs, materials=physics/constants.ts CANONICAL_MATERIAL_DB, tooling=ToolRegistry+ToolGeometryDefaults+22 vendor catalogs, toolpaths=ToolpathStrategyRegistry, posts=PostProcessorRegistry+data/posts, alarms=AlarmRegistry+controller-alarm-database.json+alarm-fix-procedures.json) · **4 catalog-present-no-unifying-registry** (controllers=controller-knowledge.json, tool-holders=**6 vendor catalogs**, sfc=guhring-iscar/helical/hypermill speed-feed data, fixturing=workholding-catalog.ts+calculatorWorkholdingCatalog.ts).

**CORRECTION 2026-05-29 (operator caught it: "you're missing a bunch of tool holders theres more than just 2 brands"):** the first DATABASES.md pass was SHALLOW-DISCOVERY (globbed only `*holder*`/`*fixtur*` loosely). Reality verified via Glob `mcp-server/src/data/*holder*.ts`: **6 holder catalogs** — big-daishowa-holders.ts, haimer-holder-catalog.ts (+haimer-holders-extracted.json), tungaloy-holder-catalog.ts, regofix-holder-catalog.ts, seco-toolholders-catalog.ts, guhring-holder-catalog.ts (+guhring-holders-extracted.json) — NOT 2. And **fixturing is NOT a GAP**: `workholding-catalog.ts` (ViseSpec/ZeroPointSpec) + `calculatorWorkholdingCatalog.ts` (WorkholdingMachineMode) exist and the Fixture*Engine family consumes them. Both the "2 brands" undercount and the "🔴 fixturing GAP" overclaim were R12 honesty failures, corrected in DATABASES.md + mill-path-index.mjs §databases-juliett. Lesson: enumerate the FULL data/ dir before claiming brand counts or gaps — [[feedback_enumerate_before_read]].

**juliett database-expansion QUEUE (pinged via chat-bus 2026-05-29):**
1. 🔴 Fixture/Workholding catalog DB (clamps/vises/chucks + clamp-force specs — the Fixture*Engine family has no data source).
2. ⚠ ToolHolderRegistry (promote big-daishowa/guhring vendor files → typed registry).
3. ⚠ ControllerRegistry (promote controller-knowledge.json → typed registry).
4. ⚠ SpeedFeedRegistry (unify vendor feed/speed catalogs — coordinate with oscar).
juliett galaxy lives at `mcp-server/src/engines/database-expansion/` (per [[reference_kilo_cam_juliett_edge_2026_05_29]]).
