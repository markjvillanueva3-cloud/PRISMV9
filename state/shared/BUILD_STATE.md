# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-05-28T19:07:46.855Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **3604** engines built and wired (of 3722)
- **1101** wiki entries indexed
- **118** engines awaiting dispatcher wiring
- **3029** units pending across 110 active milestones
- **2** codex frontend builds awaiting merge
- **191** milestones with envelope-status drift

## BUILT

3604/3722 engines wired (97%); 1101 wiki entries indexed.

```json
{
  "totalEngines": 3722,
  "unwired": 118,
  "wiredDirect": 3434,
  "wireExempt": 104,
  "wiredViaHook": 9,
  "wiredViaOrch": 41,
  "wiredViaRoute": 12,
  "wiredViaSingleton": 4
}
```

## NEEDS_WIRING

118 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Other | 22 |
| Speed | 5 |
| Monolith | 5 |
| Wet | 3 |
| Creo | 3 |
| Hyper | 3 |
| Shop | 2 |
| Tool | 2 |
| Embedding | 2 |
| Swiss | 2 |
| Onshape | 2 |
| Grok | 2 |
| Mill | 2 |
| Quoting | 2 |
| Playwright | 1 |
| Opus | 1 |
| Code | 1 |
| Model | 1 |
| Local | 1 |
| Formal | 1 |
| Expanding | 1 |
| Semantic | 1 |
| Feedback | 1 |
| Qdrant | 1 |
| Counterfactual | 1 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.

## NEEDS_BUILDING

3029 units across 729 milestones not yet in git.

### Envelope-status drift

| Milestone | Envelope says | Git says | Drift |
|-----------|---------------|----------|-------|
| CAMK-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CAMX-MS0.5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS0.7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS8 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P0B | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS10 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS11 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS8 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS9 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-NEW-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P0-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P1-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P3-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P3-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P4-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L3-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L3-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L4-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L4-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L5-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L5-P0-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L5-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L6-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L6-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L7-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P0-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L8-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P1-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L8-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P2-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L8-P3-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L9-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L9-P1-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L9-P2-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS12 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS13 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS14 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| QA-MS9 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| S0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| S1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| S1-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| S2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| S2-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| S3-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| S3-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| S3-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| S4-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCI-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TC-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ULT-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ULT-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ULT-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ULT-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ULT-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS0A | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS2B | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| APP-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| BP-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CADCAM-DAGI-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS12 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS13 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CCM-MS14 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS15 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS16 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CCM-MS17 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CCM-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS8 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS9 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CK-MS12 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CLI-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| COMBO-EFFICIENCY-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SYSTEM-VIZ-BRAIN-MS0 | completed | in_progress_real | claims_completed_but_units_pending |
| EIGC-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS0A | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| EIGC-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| EIGC-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS8 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| EIGC-MS9 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| DEA-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L6-BACKPROP-REGISTRY-MS25 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| KNOWLEDGE-VAULT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MULTI-CLI-SYNC-HOOK-MS28 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCHEMA-MIGRATION-RUNNER-MS27 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| HITL-OPERATOR-UI-MS24 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| RT-ADAPTIVE-MS22 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| RT-ADAPTIVE-MS22a | not_started | completed_real | claims_not_started_but_has_shipped_units |
| OT-IT-SECURITY-MS20 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TENANT-ONBOARD-MS29 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| LATHE-MASTER | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MXU-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS0A | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS10 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS8 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MXU-MS9 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| PCCA-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| PCCA-MS0A | not_started | completed_real | claims_not_started_but_has_shipped_units |
| PCCA-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| PPG-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| PROD-GATE-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MS-CRITWIRE | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MS-DOCU-FINISH | completed | not_started_real | claims_completed_but_units_pending |
| MS-VIZ-ROADMAP-BIND | completed | not_started_real | claims_completed_but_units_pending |
| TWIN-SIM-GATE-MS23 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SF-PSN-WIRE-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SIM-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TOOL-INVENTORY-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| TOOLS-AUDIT-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| S1-MS2 | P2 | P2-U05 | Port Thermal Partition + Power/Torque |
| SCIMATH-MS1 | P2 | P2-U05 | FEMThermalCoupledEngine — sequential/staggered coupling |
| SCIMATH-MS5 | P2 | P2-U05 | AcceptanceSamplingEngine — configurable AQL + switching rules |
| WIRE-MS0 |  | P2-U05 | Welding & Joining Page — CREATE NEW |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P11 | P11-U07 | Wire 14 critical-gap awareness/goal/continuity hooks (Agent 3 finding) |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P12 | P12-U01 | Split securityDispatcher (1055 actions) into 5 sub-dispatchers |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P16 | P16-U03 | Merge top 5 candidates into canonical PRISM (each with dedup check) |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P20 | P20-U02 | Optional: ollama pull llama3.3:70b for high-complexity tasks (disk-conditional) |
| CCM-MS0 | P0 | P0-U06 | WorktreeCreate hook |
| CCM-MS0 | P0 | P0-U07 | WorktreeRemove hook |
| CCM-MS0 | P0 | P0-U08 | PostCompact hook |
| CCM-MS0 | P0 | P0-U09 | SessionEnd hook |
| L8-P1-MS2 | P0 | P0-U06 | Knowledge Search |
| L8-P1-MS2 | P0 | P0-U07 | Material Selection Wizard |
| L8-P1-MS2 | P0 | P0-U08 | Tool Selection Wizard |
| L8-P1-MS2 | P0 | P0-U09 | Machine Selection Wizard |
| L8-P2-MS2 | P0 | P0-U06 | Capacity Analytics Dashboard |
| L8-P2-MS2 | P0 | P0-U07 | Predictive Maintenance Panel |
| L8-P2-MS2 | P0 | P0-U08 | ERP Overview Page |
| L8-P2-MS2 | P0 | P0-U09 | ERP Layout & Navigation |
| CCM-MS14 | P0 | P0-U06 | Cache hit rate monitor |
| CCM-MS14 | P0 | P0-U07 | Cascade failure detector |
| CCM-MS14 | P0 | P0-U08 | Monte Carlo convergence monitor |
| CCM-MS14 | P0 | P0-U09 | silentCatch fire rate monitor |

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

Per-domain wired/unwired breakdown across 999 domain prefixes.

| Domain | Total | Wired | Unwired | Coverage % |
|--------|-------|-------|---------|-----------|
| Other | 699 | 677 | 22 | 97% |
| Speed | 19 | 14 | 5 | 74% |
| Monolith | 17 | 12 | 5 | 71% |
| Hyper | 73 | 70 | 3 | 96% |
| Wet | 15 | 12 | 3 | 80% |
| Creo | 4 | 1 | 3 | 25% |
| Mill | 70 | 68 | 2 | 97% |
| Tool | 63 | 61 | 2 | 97% |
| Shop | 20 | 18 | 2 | 90% |
| Quoting | 13 | 11 | 2 | 85% |
| Swiss | 6 | 4 | 2 | 67% |
| Embedding | 4 | 2 | 2 | 50% |
| Grok | 2 | 0 | 2 | 0% |
| Onshape | 2 | 0 | 2 | 0% |
| Post | 63 | 62 | 1 | 98% |
| Fusion | 36 | 35 | 1 | 97% |
| Mastercam | 28 | 27 | 1 | 96% |
| Blueprint | 11 | 10 | 1 | 91% |
| Coolant | 10 | 9 | 1 | 90% |
| Unified | 10 | 9 | 1 | 90% |
| Consensus | 9 | 8 | 1 | 89% |
| Pipeline | 9 | 8 | 1 | 89% |
| Local | 8 | 7 | 1 | 88% |
| Bar | 7 | 6 | 1 | 86% |
| Bayesian | 7 | 6 | 1 | 86% |
| Model | 6 | 5 | 1 | 83% |
| Qdrant | 6 | 5 | 1 | 83% |
| Deep | 5 | 4 | 1 | 80% |
| Operator | 5 | 4 | 1 | 80% |
| Catalog | 4 | 3 | 1 | 75% |

## STALE_MILESTONES

199 milestones flagged as stale (pending > 0 AND last shipped > 30d ago, OR never started).

| Milestone | Track | Reason | Pending | Shipped/Total | Last shipped |
|-----------|-------|--------|---------|---------------|--------------|
| MS-WIRE-FRONTEND | revenue | never_started | 90 | 0/90 | never |
| MS-WIRE-BACKEND | revenue | never_started | 60 | 0/60 | never |
| MS-MASTERPOST | revenue | never_started | 44 | 0/44 | never |
| MS1 | revenue | never_started | 39 | 0/39 | never |
| MS-CAM-MASTERY | revenue | never_started | 34 | 0/34 | never |
| MS-AUDIT-DERIVED-2026-05-10 | audit-derived | never_started | 30 | 0/30 | never |
| MS2 | revenue | never_started | 30 | 0/30 | never |
| MS-TRAIN-DEEP | revenue | never_started | 26 | 0/26 | never |
| CADCAM-AGI-MS0 | CAD-CAM-AGI | never_started | 24 | 0/24 | never |
| MS-SFC-CALIBRATE | revenue | never_started | 24 | 0/24 | never |
| MS-PILOT | revenue | never_started | 20 | 0/20 | never |
| MS-DESKTOP | revenue | never_started | 18 | 0/18 | never |
| CADCAM-DAGI-MS1 | CAD-CAM-DEEPAGI | never_started | 16 | 0/16 | never |
| MS-GTM | revenue | never_started | 16 | 0/16 | never |
| CAM-ML-CLOSEDLOOP-MS0 | CAM-ML | never_started | 15 | 0/15 | never |
| CADCAM-DAGI-MS2 | CAD-CAM-DEEPAGI | never_started | 14 | 0/14 | never |
| MS-FRONTEND | revenue | never_started | 14 | 0/14 | never |
| MS-LEGAL | revenue | never_started | 13 | 0/13 | never |
| MS-INFRA | revenue | never_started | 12 | 0/12 | never |
| MS-MONOLITH-HARVEST | revenue | never_started | 11 | 0/11 | never |
| CPL-MS2 | — | never_started | 10 | 0/10 | never |
| CADCAM-DAGI-MS3 | CAD-CAM-DEEPAGI | never_started | 10 | 0/10 | never |
| CADCAM-DAGI-MS5 | CAD-CAM-DEEPAGI | never_started | 10 | 0/10 | never |
| PPG-MS1 | PPG | never_started | 10 | 0/10 | never |
| PPG-MS17 | PPG | never_started | 10 | 0/10 | never |
| PPG-MS21 | PPG | never_started | 10 | 0/10 | never |
| PPG-MS3 | PPG | never_started | 10 | 0/10 | never |
| PPG-MS4 | PPG | never_started | 10 | 0/10 | never |
| PPG-MS9 | PPG | never_started | 10 | 0/10 | never |
| SCENARIO-TEST-MS0 | QA | never_started | 10 | 0/10 | never |

**Next action:** Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
