# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-05-13T17:19:49.332Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **2324** engines built and wired (of 3203)
- **1073** wiki entries indexed
- **879** engines awaiting dispatcher wiring
- **3715** units pending across 81 active milestones
- **2** codex frontend builds awaiting merge
- **172** milestones with envelope-status drift

## BUILT

2324/3203 engines wired (73%); 1073 wiki entries indexed.

```json
{
  "totalEngines": 3203,
  "unwired": 879,
  "wiredDirect": 2161,
  "wireExempt": 81,
  "wiredViaHook": 10,
  "wiredViaOrch": 56,
  "wiredViaRoute": 15,
  "wiredViaSingleton": 1
}
```

## NEEDS_WIRING

879 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Other | 143 |
| Lathe | 89 |
| Machine | 17 |
| Multi | 11 |
| Turning | 11 |
| Tool | 10 |
| Five | 9 |
| Shop | 9 |
| Outcome | 8 |
| Hyper | 7 |
| Milling | 7 |
| Fusion | 7 |
| Wet | 7 |
| Session | 6 |
| Process | 6 |
| Print | 6 |
| Swiss | 6 |
| Wire | 6 |
| Cross | 6 |
| Consensus | 6 |
| Tribal | 5 |
| Mobile | 5 |
| Mastercam | 5 |
| Master | 4 |
| Mill | 4 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.

## NEEDS_BUILDING

3715 units across 670 milestones not yet in git.

### Envelope-status drift

| Milestone | Envelope says | Git says | Drift |
|-----------|---------------|----------|-------|
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
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
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
| TC-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
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
| ACP-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| APP-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| BP-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS12 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS13 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CCM-MS14 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS15 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS16 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS17 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS8 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CCM-MS9 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CLEANUP-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CLI-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
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
| INFRA-AGI-ROUTER-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| INTEL-OLLAMA-OBSIDIAN-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| INTEL-OLLAMA-OBSIDIAN-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L6-BACKPROP-REGISTRY-MS25 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MULTI-CLI-SYNC-HOOK-MS28 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCHEMA-MIGRATION-RUNNER-MS27 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| HITL-OPERATOR-UI-MS24 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| RT-ADAPTIVE-MS22 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| RT-ADAPTIVE-MS22a | not_started | completed_real | claims_not_started_but_has_shipped_units |
| OT-IT-SECURITY-MS20 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TENANT-ONBOARD-MS29 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| LATHE-P2P-CONSENSUS-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
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
| PIPE-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| PPG-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| PROD-GATE-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| TWIN-SIM-GATE-MS23 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SIM-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TOOLS-AUDIT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| WEDM-ERP-MS0 | completed | not_started_real | claims_completed_but_units_pending |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| TRAINING-LEARNING-MS0 | lathe | U-TL-U1-LATHE-TEMPLATE-EXTRACTOR | LathePartFamilyTemplateExtractorEngine + corpus scanner |
| TRAINING-LEARNING-MS0 | wedm | U-TL-U4-WEDM-TEMPLATE-EXTRACTOR-AND-BRIDGE | WEDMPartFamilyTemplateExtractorEngine + TaptiteElectrodeMacroBridgeEngine (parsed-snapshot path) |
| TRAINING-LEARNING-MS0 | matchers | U-TL-U5-DOMAIN-MATCHERS | LathePartFamilyMatcherEngine + MillPartFamilyMatcherEngine + WEDMPartFamilyMatcherEngine |
| TRAINING-LEARNING-MS0 | closed-loop | U-TL-U6-CONTINUOUS-LEARNING | TrainingTemplateContinuousLearningEngine (ingestLatheOutcome / ingestMillOutcome / ingestWEDMOutcome) |
| CLEANUP-MS0 | bootstrap-tier-0 | U-CLEANUP-A1 | A1 — extend SLOT_NAMES in chat-slots.mjs to add 'golf' (NATO phonetic continuity) |
| CLEANUP-MS0 | bootstrap-tier-0 | U-CLEANUP-A2 | A2 — fleet-status.mjs renderer + title-comment for 7-slot table |
| CLEANUP-MS0 | bootstrap-tier-0 | U-CLEANUP-A3 | A3 — /checkin --golf docs in commands/checkin.md; remove fleet_full 7th-chat fallback wording |
| CLEANUP-MS0 | bootstrap-tier-0 | U-CLEANUP-A4 | A4 — per-agent-handoff.mjs accepts slot=golf with HANDOFF-golf-<task>.md topic prefix |
| COORD-MS0 |  | U-COORD01 | Create AGENT_COORDINATION_SUMMARY.json (<5KB) |
| COORD-MS0 |  | U-COORD02 | Add Optimistic Locking with Version Field |
| COORD-MS0 |  | U-COORD04 | CrossSessionOrchestratorEngine — Unified Facade |
| COORD-MS0 |  | U-COORD05 | Wire Orchestrator to Hook System |
| AUTO-LEARNING-LOOP-MS0 | P0 | U-ALL02 | Build `NoveltyDetectionEngine` (diff vs catalog) |
| AUTO-LEARNING-LOOP-MS0 | P0 | U-ALL03 | Build `AutoResearchOrchestratorEngine` (rate-limited dispatch) |
| AUTO-LEARNING-LOOP-MS0 | P0 | U-ALL04 | Build `SynergyClassifierEngine` (high/med/low/none decision) |
| AUTO-LEARNING-LOOP-MS0 | P0 | U-ALL05 | Build `VizAutoAugmentationEngine` (emit augmentation file) |
| AI-MAX-MS0 | session-1 | U-AIMAX01 | hyperMILL Python Script Pattern Extractor |
| AI-MAX-MS0 | session-1 | U-AIMAX02 | JM DIE Program Pattern Analyzer |
| AI-MAX-MS0 | session-1 | U-AIMAX03 | Pattern Database & Search Engine |
| AI-MAX-MS0 | session-2 | U-AIMAX04 | Tree-of-Thought Reasoning Engine |
| BP-MS0 | BP-P1 | U-ROUTEFIX1 | Fix speed/feed route split-brain + CAM contract mismatch |
| BP-MS0 | BP-P1 | U-ROUTEFIX2 | Fix PPG route/action drift + ERP analytics wiring |
| BP-MS0 | BP-P1 | U-ROUTEFIX3 | Context catalog fix + 24 integration tests |
| BP-MS0 | BP-P2 | U-BLOB2 | PartsLibraryEngine with revisions + CAD metadata extraction |

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

Per-domain wired/unwired breakdown across 928 domain prefixes.

| Domain | Total | Wired | Unwired | Coverage % |
|--------|-------|-------|---------|-----------|
| Other | 596 | 453 | 143 | 76% |
| Lathe | 187 | 98 | 89 | 52% |
| Machine | 45 | 28 | 17 | 62% |
| Multi | 28 | 17 | 11 | 61% |
| Turning | 24 | 13 | 11 | 54% |
| Tool | 57 | 47 | 10 | 82% |
| Shop | 16 | 7 | 9 | 44% |
| Five | 12 | 3 | 9 | 25% |
| Outcome | 8 | 0 | 8 | 0% |
| Hyper | 68 | 61 | 7 | 90% |
| Fusion | 36 | 29 | 7 | 81% |
| Milling | 34 | 27 | 7 | 79% |
| Wet | 15 | 8 | 7 | 53% |
| Cross | 67 | 61 | 6 | 91% |
| Print | 21 | 15 | 6 | 71% |
| Wire | 20 | 14 | 6 | 70% |
| Session | 12 | 6 | 6 | 50% |
| Process | 9 | 3 | 6 | 33% |
| Consensus | 7 | 1 | 6 | 14% |
| Swiss | 6 | 0 | 6 | 0% |
| Mastercam | 28 | 23 | 5 | 82% |
| Tribal | 12 | 7 | 5 | 58% |
| Mobile | 6 | 1 | 5 | 17% |
| Mill | 22 | 18 | 4 | 82% |
| Inventor | 12 | 8 | 4 | 67% |
| Okuma | 12 | 8 | 4 | 67% |
| Master | 10 | 6 | 4 | 60% |
| Agent | 7 | 3 | 4 | 43% |
| Speed | 7 | 3 | 4 | 43% |
| Electrode | 6 | 2 | 4 | 33% |

## STALE_MILESTONES

230 milestones flagged as stale (pending > 0 AND last shipped > 30d ago, OR never started).

| Milestone | Track | Reason | Pending | Shipped/Total | Last shipped |
|-----------|-------|--------|---------|---------------|--------------|
| LATHE-MASTER | LATHE | never_started | 136 | 0/136 | never |
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
| MS-PRINT-PROGRAM-LOOP | revenue | never_started | 23 | 0/23 | never |
| MS-PILOT | revenue | never_started | 20 | 0/20 | never |
| CAMX-V17-P1 | — | never_started | 18 | 0/18 | never |
| MS-DESKTOP | revenue | never_started | 18 | 0/18 | never |
| CAMX-MS0.5 | — | never_started | 16 | 0/16 | never |
| CAMX-MS1 | — | never_started | 16 | 0/16 | never |
| CAMX-MS8 | — | never_started | 16 | 0/16 | never |
| CADCAM-DAGI-MS1 | CAD-CAM-DEEPAGI | never_started | 16 | 0/16 | never |
| CADCAM-DAGI-MS4 | CAD-CAM-DEEPAGI | never_started | 16 | 0/16 | never |
| MS-CRITWIRE | revenue | never_started | 16 | 0/16 | never |
| MS-GTM | revenue | never_started | 16 | 0/16 | never |
| CAMX-V17-P11 | — | never_started | 15 | 0/15 | never |
| CAM-ML-CLOSEDLOOP-MS0 | CAM-ML | never_started | 15 | 0/15 | never |
| CADCAM-DAGI-MS2 | CAD-CAM-DEEPAGI | never_started | 14 | 0/14 | never |
| MS-FRONTEND | revenue | never_started | 14 | 0/14 | never |
| MS-LEGAL | revenue | never_started | 13 | 0/13 | never |
| CAMX-MS3 | — | never_started | 12 | 0/12 | never |
| CAMX-MS4 | — | never_started | 12 | 0/12 | never |
| CAMX-V17-P3 | — | never_started | 12 | 0/12 | never |

**Next action:** Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
