# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-06-27T15:35:34.263Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **3842** engines built and wired (of 3848)
- **1293** wiki entries indexed
- **6** engines awaiting dispatcher wiring
- **3862** units pending across 51 active milestones
- **2** codex frontend builds awaiting merge
- **23** milestones with envelope-status drift

## BUILT

3842/3848 engines wired (100%); 1293 wiki entries indexed.

```json
{
  "totalEngines": 3848,
  "unwired": 6,
  "wiredDirect": 3635,
  "wireExempt": 123,
  "wiredViaHook": 6,
  "wiredViaOrch": 33,
  "wiredViaRoute": 14,
  "wiredViaSingleton": 2,
  "dormantBridges": 1
}
```

## NEEDS_WIRING

6 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Auth | 1 |
| Pre | 1 |
| Other | 1 |
| Blueprint | 1 |
| Redis | 1 |
| Search | 1 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.

## NEEDS_BUILDING

3862 units across 730 milestones not yet in git.

### Envelope-status drift

| Milestone | Envelope says | Git says | Drift |
|-----------|---------------|----------|-------|
| CAMK-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CAMX-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CPL-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MF-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MF-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCI-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TC-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| ACP-MS0 | completed | in_progress_real | claims_completed_but_units_pending |
| BP-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CADCAM-DAGI-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CK-MS12 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CLI-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| COMBO-EFFICIENCY-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| EIGC-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| DEA-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| KNOWLEDGE-VAULT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| LATHE-MASTER | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| PPG-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MS-CAM-MASTERY | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MS-CRITWIRE | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SF-PSN-WIRE-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TOOL-INVENTORY-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A2 | [Track A] U-FAMILY-PARAM-EXTRACT — per family, extract the 8-15 driving parameters (ODs/lengths/bore-dia/thread-spec/chamfers) — the turning analogue of the .xlsm's 34 dims |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A3 | [Track A] MS-RES-XLSM-ENGINE core — olevba-decode the .xlsm's vbaProject.bin → reverse the 34-dim→geometry math per the 11 die templates; register the mill die families as PRISM parametric templates (wrap & extend) — see MS-RES-XLSM-ENGINE |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A4 | [Track A] MachineDomainTemplateLibraryEngine (NEW) — registry of parametric program skeletons keyed by (partFamily, machineDomain, controller); each refs a ProvenRecipe + a GCodeTemplate parametrization; wire to prism_proven_pipeline (template_register/get/list/instantiate) + prism_cam |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A6 | [Track A] Wire proven_generate_pipeline → final G-code; add proven_generate_program — bridge adapted-recipe → TurningProgramAssemblerEngine (turning) / MillingPrintToProgramEngine (mill) → emit. New action prism_proven_pipeline:proven_generate_program |
| FEATURE-GAP-AUDIT-MS0 |  | U-WIRE-BACKLOG-MILL | Wire the ~20 unwired mill engines (MillingAIUltraIntelligence, FiveAxisAIUltraIntelligence, MillingUltimateAI, FiveAxisOrchestration) — see BUILD_STATE NEEDS_WIRING |
| FEATURE-GAP-AUDIT-MS0 |  | U-WIRE-BACKLOG-LATHE | Wire the ~77 unwired lathe engines (LatheThermodynamics, LatheUnifiedPhysicsOrchestration, LatheOpusReasoning, LatheMetaLearning, LatheQualityGate) — largest clean unwired gap |
| FEATURE-GAP-AUDIT-MS0 |  | U-WIRE-BACKLOG-WIRE | Wire the ~73 unwired WEDM engines (WEDMNeuralTraining, WireEDMDeepAIHardening, ElectrodeUltimateAI, WEDMProgramOptimizer, WEDMStrategyLibrary) |
| FEATURE-GAP-AUDIT-MS0 |  | U-GAP-WIRE-JMDIE-CORPUS | WEDM program-learning corpus from JM DIE WIRE EDM/ (4058 Mastercam .mcx-8 + Sodick .esp across ~100 customers) |
| KNOWLEDGE-VAULT-MS0 | P0 | U-VAULT01 | Vault-schema doc (CLAUDE.md role definition) |
| KNOWLEDGE-VAULT-MS0 | P0 | U-VAULT04 | Skill ↔ wiki cross-trigger registry |
| KNOWLEDGE-VAULT-MS0 | P0 | U-VAULT05 | Domain MOC generator (Nick Milo pattern) |
| MS-P1-100PCT |  | U-P1-02 | Fold EDMEngine.ts (294 LOC synthetic) → deprecated shim |
| MS-P1-100PCT |  | U-P1-03 | Fold EDMParameterEngine.ts → deprecated |
| MS-P1-100PCT |  | U-P1-04 | Fold EDMWireEngine.ts → deprecated |
| MS-CAM-MASTERY | P0 | U-CAMM-FUS-B | P0 Fusion pillar B — 'how to use Fusion CAM/HSM' (Fusion360FunctionIndexEngine + FusionDeepLearningEngine + every 2D/3D/5-ax/turn/mill-turn/probe strategy + every dialog input → wiki entity pages) |
| MS-CAM-MASTERY | P0 | U-CAMM-FUS-D1 | P0 Fusion pillar D — 'Speed&Feed via PRISM' add-in button (CAMAddInFrameworkEngine → calibrated SFC; requireTier gated) — ships Revenue Day 1 |
| MS-CAM-MASTERY | P0 | U-CAMM-FUS-D2 | P0 Fusion pillar D — 'Auto-program via PRISM' add-in button (→ the auto-programming chain; requireTier gated) — ships Revenue Day 1 |
| MS-CAM-MASTERY | P0 | U-CAMM-FUS-D3 | P1 Fusion pillar D — 'Post via PRISM' add-in button (→ the subscription post-processors; requireTier gated) — ships at Master Post GA |
| COMBO-EFFICIENCY-MS0 | P0 | P0-U01 | Diagnose + revive Ollama /api/chat (currently 100% skip) |
| DEA-MS0 |  | U-DEA-alpha-01 | Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target) |
| DEA-MS0 |  | U-DEA-alpha-02 | Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target) |
| DEA-MS0 |  | U-DEA-alpha-03 | Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target) |
| DEA-MS0 |  | U-DEA-alpha-04 | Wire/triage 6 engines (mixed — review UNKNOWN entries first; see per-engine target) |
| MS-CRITWIRE | P0 | U-CW-07 | Wire GilbertEconomicSpeedEngine (254ln, unwired) → prism_calc (lathe_cost_optimize) |

**Next action:** Cross-reference MILESTONE_PROGRESS.json. Avoid units already in `shipped` arrays — those are committed but envelope status is stale.

## NEEDS_FRONTEND

2 codex frontend build(s) pending merge into mcp-server/web.

| ID | Path | Stack | Status | Notes |
|----|------|-------|--------|-------|
| main-web | `mcp-server/web` | React + Vite | **merged** | Default frontend. CAM/SFC/quote screens live here. |
| cqask-orion-cad | `cqask/ui` | Next.js 13 + Ant Design + Tailwind | **PENDING_MERGE** | CAD-via-LLM UI ('orion-cad'). Generates CadQuery models from natural language. Routes are in pages/ — needs port to mcp-server/web/ App Router or kept as standalone subapp. |
| mcp-cadquery-frontend | `mcp-cadquery/frontend` | Vite + React 19 + Three.js (@react-three/fiber) | **PENDING_MERGE** | 3D CAD viewer for CadQuery output. React 19 (newer than main). Embeds via @react-three/fiber. Needs version-align with main React 18 OR sandbox iframe. |

**Next action:** Decide per build: (a) port to mcp-server/web App Router, (b) keep as standalone subapp under /apps/ with shared auth, or (c) deprecate. Two builds use different React majors (18 vs 19) — version align before merge.

## COVERAGE_BY_DOMAIN

Per-domain wired/unwired breakdown across 1035 domain prefixes.

| Domain | Total | Wired | Unwired | Coverage % |
|--------|-------|-------|---------|-----------|
| Other | 724 | 723 | 1 | 100% |
| Blueprint | 11 | 10 | 1 | 91% |
| Auth | 3 | 2 | 1 | 67% |
| Pre | 3 | 2 | 1 | 67% |
| Redis | 1 | 0 | 1 | 0% |
| Search | 1 | 0 | 1 | 0% |
| Lathe | 194 | 194 | 0 | 100% |
| Cross | 73 | 73 | 0 | 100% |
| Hyper | 73 | 73 | 0 | 100% |
| Mill | 72 | 72 | 0 | 100% |
| Post | 63 | 63 | 0 | 100% |
| Tool | 63 | 63 | 0 | 100% |
| Machine | 49 | 49 | 0 | 100% |
| Fusion | 37 | 37 | 0 | 100% |
| Milling | 34 | 34 | 0 | 100% |
| Multi | 31 | 31 | 0 | 100% |
| Mastercam | 28 | 28 | 0 | 100% |
| Print | 25 | 25 | 0 | 100% |
| Turning | 25 | 25 | 0 | 100% |
| Adaptive | 23 | 23 | 0 | 100% |
| Speed | 22 | 22 | 0 | 100% |
| Wire | 22 | 22 | 0 | 100% |
| Shop | 20 | 20 | 0 | 100% |
| Employee | 19 | 19 | 0 | 100% |
| Advanced | 18 | 18 | 0 | 100% |
| Solid | 18 | 18 | 0 | 100% |
| Batch | 17 | 17 | 0 | 100% |
| Context | 17 | 17 | 0 | 100% |
| Monolith | 17 | 17 | 0 | 100% |
| Quoting | 17 | 17 | 0 | 100% |

## STALE_MILESTONES

387 milestones flagged as stale (pending > 0 AND last shipped > 30d ago, OR never started).

| Milestone | Track | Reason | Pending | Shipped/Total | Last shipped |
|-----------|-------|--------|---------|---------------|--------------|
| MS-WIRE-FRONTEND | revenue | never_started | 90 | 0/90 | never |
| MS-WIRE-BACKEND | revenue | never_started | 60 | 0/60 | never |
| MS-MASTERPOST | revenue | never_started | 44 | 0/44 | never |
| MS1 | revenue | never_started | 39 | 0/39 | never |
| MS-AUDIT-DERIVED-2026-05-10 | audit-derived | never_started | 30 | 0/30 | never |
| MS2 | revenue | never_started | 30 | 0/30 | never |
| MS-TRAIN-DEEP | revenue | never_started | 26 | 0/26 | never |
| CADCAM-AGI-MS0 | CAD-CAM-AGI | never_started | 24 | 0/24 | never |
| MS-SFC-CALIBRATE | revenue | never_started | 24 | 0/24 | never |
| SCIMATH-MS5 | SCIMATH | never_started | 23 | 0/23 | never |
| MS-PILOT | revenue | never_started | 20 | 0/20 | never |
| SCIMATH-MS1 | SCIMATH | never_started | 20 | 0/20 | never |
| CAMX-V17-P1 | — | never_started | 18 | 0/18 | never |
| MS-DESKTOP | revenue | never_started | 18 | 0/18 | never |
| SCIMATH-MS0 | SCIMATH | never_started | 17 | 0/17 | never |
| SCIMATH-MS6 | SCIMATH | never_started | 17 | 0/17 | never |
| CAMX-MS0.5 | — | never_started | 16 | 0/16 | never |
| CAMX-MS1 | — | never_started | 16 | 0/16 | never |
| CAMX-MS8 | — | never_started | 16 | 0/16 | never |
| CADCAM-DAGI-MS1 | CAD-CAM-DEEPAGI | never_started | 16 | 0/16 | never |
| CCM-MS0 | CCM | never_started | 16 | 0/16 | never |
| MS-GTM | revenue | never_started | 16 | 0/16 | never |
| SCIMATH-MS3 | SCIMATH | never_started | 16 | 0/16 | never |
| CAMX-V17-P11 | — | never_started | 15 | 0/15 | never |
| L8-P1-MS2 | — | never_started | 15 | 0/15 | never |
| L8-P2-MS2 | — | never_started | 15 | 0/15 | never |
| CAM-ML-CLOSEDLOOP-MS0 | CAM-ML | never_started | 15 | 0/15 | never |
| SCIMATH-MS2 | SCIMATH | never_started | 15 | 0/15 | never |
| SCIMATH-MS4 | SCIMATH | never_started | 15 | 0/15 | never |
| SCIMATH-MS7 | SCIMATH | never_started | 15 | 0/15 | never |

**Next action:** Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
