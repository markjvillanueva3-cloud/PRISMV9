export const meta = {
  name: 'romeo-catalog-app-wiring-audit',
  description: 'Audit catalog/tool/holder/insert/machine DB → app wiring across 10 targets, synth dependency-ordered build plan',
  phases: [
    { title: 'Audit', detail: 'one auditor per app/galaxy target — does catalog→app feed exist, wired, cover real corpus?' },
    { title: 'Synthesize', detail: 'dependency-ordered build plan from the gap matrix' },
  ],
}

// ── Shared context every auditor needs ──────────────────────────────────────
const CTX = `
You are auditing the PRISM repo at H:/prism. The operator's goal:
"all tool holder, tooling, inserts and machine databases are added to Fusion, hyperMILL,
Mastercam, HSMAdvisor, G-Wizard, PRISM SFC, mill+lathe wizard apps/galaxies, and CAD+CAM galaxies."

CANONICAL DATA CORPUS (the source that must feed every target):
- mcp-server/data/CATALOG_INDEX.json — 51,336 tool entries across 48 files, ~30 manufacturers (Accupro, ISCAR, Kennametal, Korloy, Guhring, Haimer, Big Daishowa, CAMFIX, Emuge, Flash, Ma Ford...).
- mcp-server/data/tool-catalog-inventory.json — 45 raw catalogs by type (turning/milling/drilling/threading/solid_carbide/tooling_systems/workholding/multi_type).
- mcp-server/data/catalog-extractions/ — monolith extractions: iscar, kennametal, mitsubishi, sandvik, seco, tungaloy, walter, zeni.
- mcp-server/data/vendor-catalog-db/ (manifest.json + tables/, EXTRACTION-ROUTING.json) — juliett's persisted vendor corpus.
- mcp-server/data/machine-handbooks/*.json — 10 machine handbooks (haas-vf-2, hurco-vm30i, okuma-m460v-5ax, makino-a51nx, mazak-integrex-i200, dmg-dmu-50, doosan-dnm-5700, okuma-{lb3000,mu-5000v,multus-b300ii}).
- mcp-server/src/engines/ShopConfigurationEngine.ts — JM Die 21-machine fleet config.
- mcp-server/data/jm-die-complete-catalog.json — 36,939-file JM program corpus by machine type.

KEY ADAPTER/EXPORT ENGINES ALREADY ON DISK (verify each):
- Fusion: Fusion360ToolExportEngine, FusionToolExportEngine, FusionToolLibraryEngine, FusionToolLibraryExtractorEngine
- hyperMILL: HyperMillToolExportEngine
- Mastercam: MastercamToolExportEngine
- Inventor HSM: InventorCAMToolExportEngine
- HSMAdvisor: HSMAdvisorAdapterEngine, HSMAdvisorComparatorBridgeEngine
- G-Wizard: GWizardAdapterEngine, GWizardComparatorBridgeEngine
- Universal/SFC: UniversalToolExportEngine (ISO13399/STEP-NC/MTConnect/CSV), ToolCatalogEngine, ToolCatalogAdaptiveEngine
- Wizards: ShopToolLibraryEngine, UserToolLibraryEngine, UserToolLibraryPersistence, CAMToolLibraryEngine
- Machine: ShopConfigurationEngine

Each export engine is wired to exactly 1 dispatcher (verified). UniversalToolExportEngine takes a tools[] ARGUMENT — it does NOT itself load the 51K corpus. So the suspected gap is the PIPELINE that feeds the real catalog corpus + machine DB into each app-native format, not the adapters themselves.

Tools available: Read, Grep, Glob, Bash (use rtk prefix). Read the actual engine source — do NOT guess. Verify symbols exist before claiming them (R12 honesty rule). "I couldn't verify X" is a valid finding.
`

// ── The 10 targets ──────────────────────────────────────────────────────────
const TARGETS = [
  { key: 'fusion', label: 'Autodesk Fusion 360',
    probe: `Fusion tool library = .json tool libraries (Fusion ToolLibrary JSON / .tools). Audit Fusion360ToolExportEngine.ts + FusionToolExportEngine.ts + FusionToolLibraryEngine.ts + FusionToolLibraryExtractorEngine.ts. Does ANY of them (a) emit Fusion-native tool-library JSON, (b) get FED the 51K catalog corpus or only a caller-supplied tools[]? Find the dispatcher action that exposes it. Is there a path from CATALOG_INDEX.json → Fusion tool library? Also: holders + inserts (not just cutters)?` },
  { key: 'hypermill', label: 'hyperMILL (OPEN MIND, v31 on JM machines)',
    probe: `hyperMILL tool DB = .hmc / TDB / XML tool & holder database. Audit HyperMillToolExportEngine.ts. Native format emitted? Fed the real corpus or a tools[] arg? Dispatcher action? Holder + insert coverage? Note: operator runs hyperMILL v31 not v33.` },
  { key: 'mastercam', label: 'Mastercam (X8 on JM machines)',
    probe: `Mastercam tool library = .tooldb / Tools-*.tooldb / .ToolDb XML. Audit MastercamToolExportEngine.ts. Native format? Corpus-fed or tools[] arg? Dispatcher action? Holder + insert coverage?` },
  { key: 'hsmadvisor', label: 'HSMAdvisor',
    probe: `HSMAdvisor tool DB = .hsmlib / HSMAdvisor SQLite/XML tool library. Audit HSMAdvisorAdapterEngine.ts + HSMAdvisorComparatorBridgeEngine.ts. Does the adapter IMPORT a HSMAdvisor library or EXPORT one, or just compare speeds/feeds? Is there a catalog→HSMAdvisor-library path? Dispatcher action? This is a speed/feed app — does "add tooling DB" mean populate its tool list?` },
  { key: 'gwizard', label: 'G-Wizard (CNCCookbook)',
    probe: `G-Wizard tool crib = G-Wizard tool/material database (CSV/XML import). Audit GWizardAdapterEngine.ts + GWizardComparatorBridgeEngine.ts. Import or export or compare-only? Catalog→G-Wizard-crib path? Dispatcher action? Same question as HSMAdvisor — populate its tool crib from the corpus?` },
  { key: 'sfc', label: 'PRISM SFC (Speed/Feed Calculator — saleable product, oscar galaxy)',
    probe: `PRISM SFC is internal — its "tool database" = ToolCatalogEngine / ToolCatalogAdaptiveEngine / UniversalToolExportEngine + the speed-feed galaxy (mcp-server/src/engines/speed-feed/). Does SFC actually LOAD the 51K CATALOG_INDEX corpus at runtime, or does it have its own smaller tool set? Does the SpeedFeedOrchestrator have access to all 51K tools + holders + inserts? Find where SFC resolves a tool by id/diameter and whether the full corpus backs it.` },
  { key: 'mill-wizard', label: 'Mill Wizard app + mill galaxy (foxtrot)',
    probe: `Mill galaxy = mcp-server/src/engines/mill/ + prism_mill dispatcher (91 actions). Does the mill wizard / prism_mill have an action to load/list the tool catalog + holder + insert DB? ShopToolLibraryEngine + ShopConfigurationEngine wired into mill? Is the 51K corpus reachable from a mill speed/feed or tool-select action? Machine DB (5 VMC fleet) present?` },
  { key: 'lathe-wizard', label: 'Lathe Wizard app + lathe galaxy (whiskey)',
    probe: `Lathe galaxy = mcp-server/src/engines/lathe/ + prism_turning dispatcher (373 actions). Does the lathe wizard have an action to load/list the turning tool catalog + insert (ISO insert) DB + holder DB? Turning inserts are the big one for lathe. Is the corpus reachable from a turning tool-select action? JM Die 7 Okuma LTH machines present in machine DB?` },
  { key: 'cad-galaxy', label: 'CAD galaxy (delta)',
    probe: `CAD galaxy = mcp-server/src/engines/cad/ + prism_cad dispatcher. Does CAD need a tool/holder/insert DB at all, and if so for what (electrode tooling? fixture? DFM tool-access checks?)? Does machine DB feed CAD (machine envelope for reachability)? Is there a real consumer or is this target N/A — say so honestly if CAD has no natural tool-DB consumer.` },
  { key: 'cam-galaxy', label: 'CAM galaxy (kilo)',
    probe: `CAM galaxy = mcp-server/src/engines/cam/ + prism_cam dispatcher. CAMToolLibraryEngine + CAMExportEngine + the 6 tier-1 CAM bridges. Does prism_cam expose a unified tool-library action backed by the 51K corpus? Does CAM strategy/toolpath generation pull tools from the catalog corpus or from a hardcoded/small set? This is the hub that should feed Fusion/hyperMILL/Mastercam exports.` },
  { key: 'machine-db', label: 'Machine databases (cross-cutting)',
    probe: `Machine DB = mcp-server/data/machine-handbooks/*.json (10) + ShopConfigurationEngine (21 machines) + jm-die-complete-catalog by_machine_type. Is there ONE canonical machine registry, or scattered? Which targets above consume it (Fusion machine config, hyperMILL machine, Mastercam machine def, SFC machine power limits, mill/lathe wizard machine select)? What's missing to make all 21 JM machines + their power/envelope/spindle data available to every app?` },
]

phase('Audit')
const audits = await parallel(TARGETS.map(t => () =>
  agent(
    `${CTX}\n\n── YOUR TARGET: ${t.label} ──\n${t.probe}\n\n` +
    `Return a tight markdown report:\n` +
    `### ${t.label}\n` +
    `- **Status**: WIRED-AND-FED | WIRED-BUT-NOT-FED | ENGINE-ONLY (not corpus-fed) | PARTIAL | MISSING | N/A\n` +
    `- **Native format/target**: <what the app actually consumes>\n` +
    `- **Engine(s) verified** (file:line): <list, only ones you actually read>\n` +
    `- **Dispatcher action**: <action name or NONE>\n` +
    `- **Corpus feed**: <does the real 51K catalog + holders + inserts + machine DB reach it? exact entrypoint or "no path found">\n` +
    `- **Gap**: <the precise thing to build to satisfy the goal, or "none — already covered">\n` +
    `- **Effort**: S | M | L  and **Depends-on**: <other target keys or "none">\n` +
    `Be honest per R12 — if you can't verify a claim, say so.`,
    { label: `audit:${t.key}`, phase: 'Audit' }
  )
))

phase('Synthesize')
const synth = await agent(
  `${CTX}\n\nYou are the synthesis agent. Below are ${TARGETS.length} per-target audit reports of catalog/tool/holder/insert/machine-DB → app wiring.\n\n` +
  audits.filter(Boolean).map((a, i) => `═══ ${TARGETS[i].label} ═══\n${a}`).join('\n\n') +
  `\n\n── PRODUCE ──\n` +
  `1. **Gap matrix** — one row per target: Status, the one concrete missing piece, effort, depends-on.\n` +
  `2. **The shared core** — identify the ONE build-once asset that satisfies the most targets at once (likely: a CatalogCorpus loader/normalizer that turns the 51K CATALOG_INDEX + holders + inserts + machine DB into a canonical in-memory PRISMTool[]/Holder[]/Insert[]/Machine[] that every app adapter already consumes). Name it, say which engine should own it, and which adapters already expect that shape.\n` +
  `3. **Dependency-ordered build plan** — numbered units U1..Un in LOGICAL order (R13): build the verifiable corpus-loader CORE first, then per-app feeds on the proven core, machine DB as its own unit. For each: title, the file(s) to touch, the dispatcher action to wire, and the real-data validation (must cite numbers — e.g. "exports N≥51000 tools to Fusion JSON, M holders, K inserts").\n` +
  `4. **Already-done** — explicitly list targets that need NO work (avoid rebuilding).\n` +
  `5. **Quick win** — which single unit, if built first, unblocks the most downstream targets.\n` +
  `Keep it dependency-correct and concrete. This plan drives an autonomous /loop build.`,
  { label: 'synthesize', phase: 'Synthesize' }
)

return { audits, synth }
