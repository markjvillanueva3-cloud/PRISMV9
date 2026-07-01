export const meta = {
  name: 'db-coverage-assess',
  description: 'Assess coverage/completeness of PRISM CAM tooling DBs (fusion/hypermill/mastercam/cimco), collision/tool-creator models, machine/fixture/material DBs, and ERP front-end DB catalog; synthesize a dependency-ordered gap-fill plan',
  phases: [
    { title: 'Assess', detail: 'one read-only agent per database domain reads real files/engines' },
    { title: 'Synthesize', detail: 'merge findings into a prioritized, dependency-ordered gap-fill plan' },
  ],
}

const REQUIRED_FORMAT = `
Return a markdown report with EXACTLY these sections:
## DOMAIN: <name>
### Artifacts found
- <abs path> — <record count or "engine"> — <1-line role>
### Completeness
- <store/file/group>: <N filled> / <M total or expected> = <pct>% — <which fields are populated vs empty/null/missing>
### Gaps (what is missing or unfilled)
- [P0|P1|P2] <gap> — <evidence: file+field+count> — <what "filled out" would require>
### Recommended fills (concrete, buildable)
- <action> — <target file/engine> — <data source if known (existing corpus path, vendor catalog, physics constants)>
### Overall verdict: <COMPLETE | MOSTLY (xx%) | PARTIAL (xx%) | SKELETON (xx%) | MISSING>
Be quantitative. Open files and COUNT. Do not guess. Flag empty-string/null/0/placeholder fields as unfilled.`

const REPO = 'H:/prism'

const DOMAINS = [
  {
    key: 'master-tool-db',
    label: 'master tool DB (reference)',
    prompt: `Assess the MASTER tool database (the single source most CAM exports derive from).
Read: ${REPO}/mcp-server/data/prism-reference-db/tools.json (structure is {category,count,stores} — enumerate every store and count tools in each).
Also: ${REPO}/mcp-server/data/tool-catalog-inventory.json , ${REPO}/mcp-server/data/jm-die-database/jm-die-tooling-catalog.json , engines ${REPO}/mcp-server/src/engines/ToolCatalogEngine.ts , ToolCribEngine.ts , ToolDatabaseBridgeEngine.ts , ShopToolLibraryEngine.ts , UserToolLibraryEngine.ts .
For a representative sample of tools across stores, list which FIELDS exist and which are EMPTY/null/0/missing: diameter, flutes, flute_length, overall_length, shank_dia, corner_radius, helix, coating, material(carbide/HSS), holder, gauge_length, stickout, max_rpm, max_doc, cutting_data (speeds/feeds per material), collision geometry (holder profile / neck / shank for clearance). The work order requires "all input data filled out" — quantify how filled the master DB is.`,
  },
  {
    key: 'fusion',
    label: 'Fusion 360 tooling DB',
    prompt: `Assess the FUSION 360 tooling database.
Read engines: ${REPO}/mcp-server/src/engines/FusionToolLibraryEngine.ts , FusionToolLibraryExtractorEngine.ts .
Data: ${REPO}/mcp-server/data/fusion360/FUSION360_CAM_COMPLETE_CATALOG.json , ${REPO}/mcp-server/data/fusion-programs/fusion-tool-holders.json , ${REPO}/mcp-server/data/cam-functions/fusion360/ (ls all), milestone ${REPO}/mcp-server/data/milestones/JM-FUSION-TOOLS-MS0.json .
Determine: is there a Fusion-format tool library (.json / Fusion tool library export) with tools fully specified — geometry + HOLDER assignment + speeds/feeds presets + the fields Fusion's Tool Library needs? Does it carry collision/holder geometry? How many tools, how complete? Is it exportable to a real Fusion .json tool library?`,
  },
  {
    key: 'hypermill',
    label: 'hyperMILL tooling DB',
    prompt: `Assess the hyperMILL tooling database.
Data: ${REPO}/mcp-server/data/training/hypermill-tool-db-extracted.json (count + fields).
Engines: search ${REPO}/mcp-server/src/engines for any HyperMill tool library engine; read MonolithHyperMillFixtureDatabaseEngine.ts (fixtures, but note hyperMILL tool DB relevance).
hyperMILL tool DB needs: tool geometry, holder DB (HyperMILL has a separate holder database), tool+holder collision geometry, technology/feeds. Is there a hyperMILL-format tool library (db / xml / json) that could load into hyperMILL v31? Quantify completeness and what is missing for "all input data filled out + collision models in the tool creator".`,
  },
  {
    key: 'mastercam',
    label: 'Mastercam tooling DB',
    prompt: `Assess the MASTERCAM tooling database.
Data: ${REPO}/mcp-server/data/mastercam/ (ls; note MastercamX8ParameterCatalog*.json are PARAMETER catalogs, NOT tool libraries — verify), ${REPO}/mcp-server/data/cam-functions/mastercam/ .
Engines: search ${REPO}/mcp-server/src/engines and dispatchers for Mastercam tool library handling; read CAMToolLibraryEngine.ts .
Mastercam tool libraries are .tooldb (SQLite) or legacy .tools / .TL9 with tool+holder geometry + feeds. KEY QUESTION: does PRISM have an actual Mastercam TOOL LIBRARY (not just toolpath parameter catalogs)? If absent that is a P0 gap. Quantify what exists vs the holder/geometry/feeds/collision fields needed.`,
  },
  {
    key: 'cimco',
    label: 'CIMCO tooling DB',
    prompt: `Assess the CIMCO tooling database.
Data: ${REPO}/mcp-server/data/cimco-export/toollibs/ (PRISM Mills Inch.tmlib + manifest — 620 of 720 exported, 100 skipped no-diameter).
Script: ${REPO}/scripts/export-tools-to-cimco-tmlib.mjs (read — what fields it emits per tool, what it skips, units handling).
Milestones: ${REPO}/mcp-server/data/milestones/CIMCO-TOOLDB-FILL-MS0.json , TOOL-CATALOG-INGEST-MS0.json .
Determine: tmlib completeness — are the 100 no-diameter tools recoverable? Are there CIMCO formats missing (lathe/turning tools, drills/taps separate from EndMill, holders)? Does the .tmlib carry holder + collision geometry CIMCO needs? Quantify and list gaps.`,
  },
  {
    key: 'collision-toolcreator',
    label: 'collision avoidance + tool creator models',
    prompt: `Assess COLLISION-AVOIDANCE models inside the tool creator (the work order: "collision avoidance models within the tool creator filled out").
Engines: ${REPO}/mcp-server/src/engines/CollisionDetectionEngine.ts , CollisionPreventionEngine.ts , ContinuousCollisionDetectionEngine.ts , MillKinematicsCollisionEngine.ts , CollisionHazardDetectorEngine.ts , CollisionIntegrationEngine.ts , LatheCollisionZoneEngine.ts , SwissTypeCollisionEngine.ts , CollisionEngine.ts .
KEY: collision detection needs per-tool GEOMETRY: holder profile (stepped cylinders), shank dia, neck, flute length, gauge/stickout length, and a HOLDER database. Do the tool DBs carry this collision geometry, or do collision engines run on synthetic/default geometry? Is the tool-creator collision model actually populated per tool, or empty? Quantify: of the tool records, how many have the holder+clearance geometry needed for real collision checks?`,
  },
  {
    key: 'machine-db',
    label: 'machine databases',
    prompt: `Assess MACHINE databases.
Data: ${REPO}/mcp-server/data/machine-handbooks/ (ls — 8 handbooks + wire-edm present).
Engines/profile: ${REPO}/mcp-server/src/engines/ShopConfigurationEngine.ts (JM has 21 machines) , ${REPO}/mcp-server/src/data/jm-die-profile.ts .
JM fleet includes VMC-01 Hurco VM30i, VMC-02 Okuma M460V-5AX, VMC-03/04 Haas VF-2/OM-2, VMC-05 Roku-Roku + lathes + wire-EDMs. KEY: is there a machine DB with per-machine kinematics (travels XYZ, rotary limits), spindle (max RPM, HP/torque curve), tool capacity (ATC pockets, max tool dia/length/weight), controller/post for ALL 21 machines? Cross-check handbooks present vs the 21-machine fleet. List which machines lack a handbook/DB entry and which fields are unfilled.`,
  },
  {
    key: 'fixture-db',
    label: 'fixture databases',
    prompt: `Assess FIXTURE databases.
Engines: ${REPO}/mcp-server/src/engines/MonolithFixtureDatabaseEngine.ts , MonolithHyperMillFixtureDatabaseEngine.ts .
Data: ${REPO}/mcp-server/data/fixtures/ (ls -R).
Fixtures (vises, chucks, jaws, clamps, tombstones, sub-plates) need geometry for collision + capacity/grip data. KEY: how many fixture records exist, what fields are filled (geometry, jaw travel, clamp force, collision envelope), and what is missing for "fixture databases filled out"? Quantify completeness.`,
  },
  {
    key: 'material-db',
    label: 'material databases',
    prompt: `Assess MATERIAL databases.
Engine: ${REPO}/mcp-server/src/engines/MaterialDatabaseEngine.ts (read loadMaterials() — materials are largely IN-CODE; enumerate every material + which ISO group P/M/K/N/S/H each belongs to + which carry Kienzle kc1.1/mc + Taylor C/n + hardness + thermal).
Files: ${REPO}/mcp-server/data/materials/ (only K_CAST_IRON, M_STAINLESS_R3, S_SUPERALLOYS_R3 present — P-steel, N-nonferrous, H-hardened FILES appear MISSING).
Also: ${REPO}/mcp-server/src/physics/constants.ts (canonical kc1.1 per ISO group: P=1800,M=2100,K=1100,N=700,S=2800,H=3200), ${REPO}/mcp-server/src/engines/MaterialDatabaseBridgeEngine.ts .
KEY: which of the 6 ISO groups are FULLY covered with named grades + machining constants, and which are skeleton/missing? This is a strong candidate P0 gap (P and N are the most common shop materials). Quantify per ISO group.`,
  },
  {
    key: 'erp-frontend-db',
    label: 'ERP front-end DB catalog',
    prompt: `CATALOG the front-end ERP databases (work order: "databases for front end erp should be cataloged").
Engines: ${REPO}/mcp-server/src/engines/ERPToolInventoryEngine.ts , ERPImportEngine.ts , ERPIntegrationEngine.ts , ERPCostFeedbackEngine.ts , ERPQualityEngine.ts , ERPWorkOrderEngine.ts , CustomerPortalEngine.ts , ContextInventoryEngine.ts .
Front-end: ls ${REPO}/mcp-server/web/app (find every route/page.tsx), and ${REPO}/mcp-server/web/lib/api.ts (which prism_* dispatcher actions the ERP UI calls).
Produce a CATALOG: every data store/table the front-end ERP reads or writes (customers, vendors, work-orders, inventory/tool-inventory, quotes, invoices, materials-stock, employees/HR, accounting). For each: backing file/engine/dispatcher, record count if a data file exists, and whether the front end has a page that surfaces it. Flag stores with NO front-end page and front-end pages with NO backing data store.`,
  },
]

phase('Assess')
const findings = await parallel(
  DOMAINS.map((d) => () =>
    agent(
      `You are a read-only coverage auditor for PRISM database domain "${d.label}". Repo root: ${REPO} (use Bash with cd ${REPO}, plus Read/Grep/Glob; node is available for counting JSON records). ${d.prompt}\n\n${REQUIRED_FORMAT}`,
      { label: `assess:${d.key}`, phase: 'Assess', agentType: 'Explore' },
    ).then((report) => ({ key: d.key, label: d.label, report })),
  ),
)

const valid = findings.filter(Boolean)
log(`Assess complete: ${valid.length}/${DOMAINS.length} domain reports`)

phase('Synthesize')
const bundle = valid
  .map((f) => `===== ${f.key} (${f.label}) =====\n${f.report}`)
  .join('\n\n')

const plan = await agent(
  `You are the synthesis lead. Below are ${valid.length} per-domain coverage reports for PRISM's CAM tooling / collision / machine / fixture / material / ERP databases. Produce a SINGLE consolidated gap-fill plan.\n\n${bundle}\n\nProduce markdown:\n## Coverage scorecard\n| domain | verdict | completeness% | top gap |\n(one row per domain)\n\n## Prioritized gap-fill plan (dependency-ordered, R13 logical order)\nBuild the verifiable CORE before integrations. For each unit:\n- **U-<id>: <title>** [P0|P1|P2] — depends on: <unit ids or none>\n  - what to build/fill, target file(s)/engine(s), data source, acceptance check (how to verify "filled out")\nOrder so foundational data (master tool DB fields, material constants, machine kinematics, holder/collision geometry) comes BEFORE per-CAM-system exports (fusion/hypermill/mastercam/cimco) that consume it.\n\n## Quick wins (can fill THIS session, <30min each)\n- <unit id> — why fast\n\n## Missing functionality (not just data — engines/dispatchers/exports that don't exist yet)\n- <gap> — evidence`,
  { label: 'synthesize:plan', phase: 'Synthesize', agentType: 'general-purpose' },
)

return { findings: valid.map((f) => ({ key: f.key, label: f.label, report: f.report })), plan }
