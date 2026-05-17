# BUILD_STATE — what's built / what needs wiring / what's pending / what's awaiting frontend merge

> Generated: 2026-05-17T05:35:11.890Z
> Source: `scripts/build-state-snapshot.mjs` — read `BUILD_STATE.json` for the machine-queryable form.

## At a glance

- **2421** engines built and wired (of 3257)
- **1073** wiki entries indexed
- **836** engines awaiting dispatcher wiring
- **3204** units pending across 83 active milestones
- **2** codex frontend builds awaiting merge
- **175** milestones with envelope-status drift

## BUILT

2421/3257 engines wired (74%); 1073 wiki entries indexed.

```json
{
  "totalEngines": 3257,
  "unwired": 836,
  "wiredDirect": 2245,
  "wireExempt": 93,
  "wiredViaHook": 10,
  "wiredViaOrch": 57,
  "wiredViaRoute": 15,
  "wiredViaSingleton": 1
}
```

## NEEDS_WIRING

836 engines on disk with no dispatcher reference. Top domains by count:

| Domain | Unwired count |
|--------|---------------|
| Other | 144 |
| Lathe | 89 |
| Machine | 17 |
| Turning | 11 |
| Multi | 10 |
| Tool | 9 |
| Five | 9 |
| Shop | 9 |
| Outcome | 8 |
| Hyper | 7 |
| Milling | 7 |
| Fusion | 7 |
| Wet | 7 |
| Process | 6 |
| Print | 6 |
| Swiss | 6 |
| Wire | 6 |
| Consensus | 6 |
| Mobile | 5 |
| Mastercam | 5 |
| Mill | 4 |
| Tribal | 4 |
| Electrode | 4 |
| Speed | 4 |
| Okuma | 4 |

**Next action:** Pick a top-domain bucket; wire to the matching dispatcher in batches of 5–6 engines (see U-WIRE-LATHE-BATCHN pattern). Wiki cross-refs in `wikiTitle` resolve via `/wiki-query <name>`.

## NEEDS_BUILDING

3204 units across 681 milestones not yet in git.

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
| ACP-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| ACP-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| APP-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| COMMAND-KERNEL-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| BP-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
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
| CLI-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| COST-CASCADE-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
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
| HTML-PRIMARY-MS0 | completed | in_progress_real | claims_completed_but_units_pending |
| INFRA-AGI-ROUTER-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L6-BACKPROP-REGISTRY-MS25 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| KNOWLEDGE-VAULT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
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
| MS-DOCU-FINISH | completed | not_started_real | claims_completed_but_units_pending |
| MS-DOCU-INGEST | completed | not_started_real | claims_completed_but_units_pending |
| TWIN-SIM-GATE-MS23 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SCIMATH-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| SIM-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TOOLS-AUDIT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| TRAINING-LEARNING-MS0 | completed | in_progress_real | claims_completed_but_units_pending |

### Top pending units (most-recently-active milestones first)

| Milestone | Phase | Unit | Title |
|-----------|-------|------|-------|
| SYSTEM-VIZ-BRAIN-MS0 | P1-MEMORY | U-P1-QDRANT-EPISODIC-RECALL | Qdrant episodic recall on SessionStart + UserPromptSubmit (xproc_episodic_recall) |
| SYSTEM-VIZ-BRAIN-MS0 | P2-VIZ-BRAIN | U-P2-LIVE-DRIFT-OVERLAY | 5-min auto-regen + drift overlay (red-pulse nodes where envelope-vs-git differ) |
| SYSTEM-VIZ-BRAIN-MS0 | P2-VIZ-BRAIN | U-P2-SLOT-OWNERSHIP-OVERLAY | Color nodes by which of 10 chat slots edited them last; handoff dotted edges |
| SYSTEM-VIZ-BRAIN-MS0 | P2-VIZ-BRAIN | U-P2-GRAPH-SEARCH-MASTERINDEX | Search bar in /system-viz viewer routes to master_index_query (semantic, not regex) |
| CLEANUP-MS0 | bootstrap-tier-0 | U-CLEANUP-A1 | A1 — extend SLOT_NAMES in chat-slots.mjs to add 'golf' (NATO phonetic continuity) |
| CLEANUP-MS0 | bootstrap-tier-0 | U-CLEANUP-A5 | A5 — golf-slot-write-allowlist.mjs PreToolUse T0 hook (path-resolve hardened against ../; allowlist-regex from golf-owned-paths.json; tier frontmatter; bypass env PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1) |
| CLEANUP-MS0 | operator-surfaces-tier-3 | U-CLEANUP-B7 | B7 — /peer-audit skill (READ-ONLY operator query; never mutates ledger; mutations only via prism_dev dispatcher action with audit trail) |
| CLEANUP-MS0 | operator-surfaces-tier-3 | U-CLEANUP-B9 | B9 — model-drift eval suite (10 frozen known-bug commits + expected verdicts in state/shared/golf-reviewer-eval/; weekly cron; agent.model pinned to claude-sonnet-4-6 NOT latest; alerts on slope (-0.20 over 12 weeks) AND absolute floor; R4-P1-8: wraps reviewer-verdict ledger in prism_intelligence:xproc_aps_calibrate + xproc_aps_set for conformal-prediction-set membership check instead of naive slope heuristic; reads prompt-version headers to detect prompt drift) |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A2 | [Track A] U-FAMILY-PARAM-EXTRACT — per family, extract the 8-15 driving parameters (ODs/lengths/bore-dia/thread-spec/chamfers) — the turning analogue of the .xlsm's 34 dims |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A3 | [Track A] MS-RES-XLSM-ENGINE core — olevba-decode the .xlsm's vbaProject.bin → reverse the 34-dim→geometry math per the 11 die templates; register the mill die families as PRISM parametric templates (wrap & extend) — see MS-RES-XLSM-ENGINE |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A4 | [Track A] MachineDomainTemplateLibraryEngine (NEW) — registry of parametric program skeletons keyed by (partFamily, machineDomain, controller); each refs a ProvenRecipe + a GCodeTemplate parametrization; wire to prism_proven_pipeline (template_register/get/list/instantiate) + prism_cam |
| MS-PRINT-PROGRAM-LOOP | P0 | U-PPL-A6 | [Track A] Wire proven_generate_pipeline → final G-code; add proven_generate_program — bridge adapted-recipe → TurningProgramAssemblerEngine (turning) / MillingPrintToProgramEngine (mill) → emit. New action prism_proven_pipeline:proven_generate_program |
| RGS-TOOL-AUTOINVOKE-MS1 | P1 | U-RIE-ADAPTER | RoadmapIntelligenceEngine complexity adapter |
| RGS-TOOL-AUTOINVOKE-MS1 | P1 | U-CALIBRATION | Outcome confidence calibration |
| RGS-TOOL-AUTOINVOKE-MS1 | P1 | U-TRANSFER | Cross-milestone transfer priors |
| COST-CASCADE-MS0 | P0 | U-CASCADE-CALIBRATE | Build `CascadeCalibrationEngine` (probe cost-quality frontier) |
| COST-CASCADE-MS0 | P0 | U-BUILD-MOA-LAYER2 | Build `MoaLayer2Engine` (aggregator across 3-of-3 verdicts) |
| COST-CASCADE-MS0 | P0 | U-DISPATCHER-ACTION-TWO-PASS | `prism_ai:two_pass` dispatcher action (cheap-then-strong) |
| COST-CASCADE-MS0 | P0 | U-CASCADE-FALLBACK-CHAIN | Fallback chain (cheap → mid → strong with circuit-breaker) |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P5 | P5-U05 | Wire prism_intelligence:diagnose_failure → DiagnosticReasoningEngine |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P6 | P6-U02 | Add 4 hooks for unforced CLAUDE.md rules |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P6 | P6-U03 | Awareness hook deduplication — pick 3 canonical, deprecate 10 |
| INTEL-OLLAMA-OBSIDIAN-MS0 | P7 | P7-U02 | Cross-PC handoff test — verify H: drive is sufficient |
| CCM-MS0 | P0 | P0-U06 | WorktreeCreate hook |

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

Per-domain wired/unwired breakdown across 935 domain prefixes.

| Domain | Total | Wired | Unwired | Coverage % |
|--------|-------|-------|---------|-----------|
| Other | 605 | 461 | 144 | 76% |
| Lathe | 188 | 99 | 89 | 53% |
| Machine | 45 | 28 | 17 | 62% |
| Turning | 25 | 14 | 11 | 56% |
| Multi | 29 | 19 | 10 | 66% |
| Tool | 57 | 48 | 9 | 84% |
| Shop | 16 | 7 | 9 | 44% |
| Five | 12 | 3 | 9 | 25% |
| Outcome | 8 | 0 | 8 | 0% |
| Hyper | 68 | 61 | 7 | 90% |
| Fusion | 36 | 29 | 7 | 81% |
| Milling | 34 | 27 | 7 | 79% |
| Wet | 15 | 8 | 7 | 53% |
| Print | 21 | 15 | 6 | 71% |
| Wire | 20 | 14 | 6 | 70% |
| Process | 10 | 4 | 6 | 40% |
| Consensus | 8 | 2 | 6 | 25% |
| Swiss | 6 | 0 | 6 | 0% |
| Mastercam | 28 | 23 | 5 | 82% |
| Mobile | 6 | 1 | 5 | 17% |
| Cross | 67 | 63 | 4 | 94% |
| Mill | 24 | 20 | 4 | 83% |
| Inventor | 12 | 8 | 4 | 67% |
| Okuma | 12 | 8 | 4 | 67% |
| Tribal | 12 | 8 | 4 | 67% |
| Speed | 7 | 3 | 4 | 43% |
| Electrode | 6 | 2 | 4 | 33% |
| Post | 56 | 53 | 3 | 95% |
| Session | 12 | 9 | 3 | 75% |
| Master | 10 | 7 | 3 | 70% |

## STALE_MILESTONES

224 milestones flagged as stale (pending > 0 AND last shipped > 30d ago, OR never started).

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
| AI-WIRE-MS0 | AI-WIRE | never_started | 12 | 0/12 | never |

**Next action:** Review with planner; either pick up the next unit, sunset the milestone, or update its envelope status. /envelope-sync handles status drift.

## How sessions consume this

- The `build-state-inject` UserPromptSubmit hook reads `BUILD_STATE.json` and emits a ≤500-token summary on every prompt.
- The `/build-state` skill prints this MD in full and offers drill-down.
- Audit chats subtract `MILESTONE_PROGRESS.json:milestones[].units[].shipped` from their gap lists before flagging missing.
- Wiki entries answer per-engine "what does it do?" — query `/wiki-query <name>`.
