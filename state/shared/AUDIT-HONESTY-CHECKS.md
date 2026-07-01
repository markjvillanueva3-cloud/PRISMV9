# AUDIT-HONESTY-CHECKS — Where the chain is broken

**Generated:** 2026-05-02
**Method:** for each Master Post differentiator + each "production"-claimed pillar, trace (engine + dispatcher action + ≥1 named test). Where any link missing → DOWNGRADE.

## §1 Engine overlap scan (consolidation candidates)

`prism_dev:engine_overlap_scan` returned `{"total_engines":0,"duplicate_count":0,"verdict":"CLEAN"}` — telemetry empty, scanner not loaded engines. **Manual evidence from manifest:**

| Apparent duplicate cluster | Engines | Recommendation |
|---|---|---|
| Adhesive bonding | AdhesiveBondEngine, AdhesiveBondingEngine | CONSOLIDATE — same domain, near-identical names |
| BatchCAMStrategy | BatchCAMStrategyEngines, BatchCAMStrategyEngines2 | CONSOLIDATE — `Engines2` suffix is a forge-batch artifact |
| CAM Tribal | CAMTribalKnowledgeEngine, CAMTribalKnowledgeInjectionEngine, CAMTribalTipLinkerEngine | KEEP-3 — different verbs (lookup/inject/link) |
| Adaptive Feed | AdaptiveFeedControlEngine, AdaptiveFeedModulationEngine, EngagementAdaptiveFeedEngine | KEEP — verbs differ but should share a base class (refactor) |
| Calibration | AdaptiveCalibrationEngine, CalibrationEngine, MultiControllerCalibrationEngine, PhysicsAutoCalibrationEngine, PredictionCalibrationEngine | CONSOLIDATE TO 2 — physics vs prediction |
| Drift detectors | CAMMLDriftMonitorEngine, LatheLoRADriftDetectorEngine, LoRADriftCoordinatorEngine, PPGDriftCanaryEngine, ProbeDriftEngine | KEEP — domain-specific drift |

`engine_overlap_scan` itself is broken — that's the more important finding.

---

## §2 Auto-wiring scan (orphan engines)

`prism_dev:auto_wiring_scan` returned no output. **Workaround evidence:**

Telemetry for `prism_dev:capability_census`:
```
{"total_engines":0,"total_dispatchers":0,"total_actions":0,"total_skills":0,
 "wiring_summary":{"full":0,"partial":0,"dark":0,"internal":0},"utilization_pct":0}
```

This is a **canonical telemetry rot**: 3,046 engines exist on disk, 95 dispatchers, 6,800 enum actions per inventory, but the live capability census returns zero. Either:
- (a) The census engine isn't loaded at MCP boot, OR
- (b) Telemetry data file is empty/stale.

Either way, **the system cannot self-report its own utilization**. Mark cannot trust any "X% wired" claim until this is fixed. **Top honesty downgrade #1.**

---

## §3 Master Post chain integrity

For each of the 12 differentiators in §1.7 of the work order:

| # | Differentiator | Engine✓ | Disp action✓ | Named test✓ | Verdict |
|---|---|---|---|---|---|
| 1 | Per-block adaptive S/F | AutoSpeedFeedEngine ✓ | cam.auto_speed_feed_optimize ✓ | NO dedicated `AutoSpeedFeedEngine.test.ts` (only embedded in batch tests) | **DOWNGRADE production → beta** |
| 2 | Depth-aware WOC (3D adaptive) | AdaptiveEngagementEngine ✓ | calc.adaptive_engagement_calc ✓ | partial (no `DepthWOC.test.ts`) | **beta** |
| 3 | Kinematic-aware rapids / air-cut | RapidRepositionOptEngine ✓, AirCutDetectionEngine ✓ | ppg.rapid_optimize ✓, ppg.air_cut_detect ✓ | recent commit pin `01b44110d`, integrated in PPG suite | **production** ✓ |
| 4 | Lead-in/lead-out optimization | NO ENGINE ✗ | only 6 generic lead* string hits in ppDispatcher | NO test ✗ | **DOWNGRADE → stub. HONESTY HIT #2.** |
| 5 | Sub-spindle / mill-turn sync | LatheSubSpindleTransferPurgeEngine ✓ | turning.mill_turn_sub_spindle ✓ | covered indirectly in millturn tests | **beta** |
| 6 | Controller-dialect injection | ControllerDialectEngine ✓ | cam.dialect_translate, cam.gcode_transpile ✓ | gcode-transpiler-engine.test.ts ✓ | **production** ✓ |
| 7 | Probe / setup-sheet auto-gen | ProbeRoutineGeneratorEngine ✓, SetupSheetEngine ✓ | cam.probe_wcs_setup ✓, cam.setup_sheet_generate ✓ | NO `ProbeRoutineGeneratorEngine.test.ts` surfaced | **DOWNGRADE → beta** |
| 8 | Collision sweep per block | CollisionPreventionEngine ✓ | cam.collision_check_full ✓ | engine harness | **production** ✓ |
| 9 | Process-specific dialect | per-process bridges (WEDMPostFanucEngine, PPSinkerEDMPostEngine, etc.) ✓ | pp.lathe_post_process ✓ | WEDMPostFanucEngine.test.ts, WEDMPostMakinoEngine.test.ts, WEDMPostSodickEngine.test.ts ✓ | **production** ✓ |
| 10 | 35-stage post pipeline orchestration | PostProcessorPipelineEngine ✓ | pp.pp_run_full ✓ | NO test asserts "35 stages"; **internal docs disagree** — project CLAUDE.md says "38 stages" — vision document says "35" | **DOWNGRADE → beta. HONESTY HIT #3 — even internal documents contradict.** |
| 11 | Holder/insert capability awareness | ToolHolderCatalogEngine ✓ | data.holder_get ✓ | partial | **beta** |
| 12 | Build-quality-aware feed-rate ceiling | NO `BuildQualityAware*Engine` exists ✗ | (relies on calc.surface_integrity_predict + calc.feed_optimize) — no integration action | NO E2E test of "Cpk → feed ceiling" backsolve ✗ | **DOWNGRADE → stub** |

**Master Post differentiator score after honesty checks:** 4 production / 6 beta / 2 stub (matches §1.3 of coverage matrix)

---

## §4 Pillar telemetry contradiction

`prism_dev:pillar_summary` reports:

```
total_pillars: 8
ready: 0
partial: 0
stub: 8
avg_completeness_pct: 0
```

For each of the 8 pillars (Calculator, Toolpath, PostProcessor, Quote, Quality, EDM, Knowledge, Automation), `wired_engines:0` and `entry_points_active:0`. But the manifest contains every named engine in the `missing[]` list:
- `KienzleForceModelEngine` is in the manifest at `src/engines/KienzleForceModelEngine.ts` AND has 5 dispatcher actions AND has a passing test — yet the pillar says it's "missing".

**This means the pillar wiring registry (`PillarMonitorEngine` or equivalent) has not been populated**. It is not that the engines are missing — it's that the registry layer that knows which engine fulfills which pillar is empty.

**Honesty downgrade implication:** any external dashboard or vision claim citing pillar status will report 0% even when capability is 100%. **Critical telemetry hole — top honesty downgrade #4.**

---

## §5 Vision claims that don't survive honesty checks

| Vision claim | Reality |
|---|---|
| "109 hooks distribution" | UNDERESTIMATE — actual: 414 Claude hooks + 54 source hooks (under-reported by 4×) |
| "24 safety rules + 296 playbook rules + 3,700 tribal tips active in pipeline" | safety rules: 30 actions in safetyDispatcher (slightly exceeds 24); playbook 296: API exists, count not asserted in inventory; tribal tips: 3,700 referenced in CLAUDE.md, but live manifest reports `tribalTipCount=0` — **not active in live telemetry** |
| "8 AI tiers wired" | 4 production (Mill/Lathe/WEDM/CAM), 3 beta (SFC/Post/CAD), 1 fragmented (System Coordinator) — see AUDIT-AI-WIRING.md |
| "35-stage post pipeline" | Vision says 35; project CLAUDE.md says 38; no test asserts the count |
| "Esprit tier-1 priority 4" | Esprit has 2 engines + no in-host runner; falls behind tier-2 leaders NX/CATIA/SolidCAM |
| "Frontend learning components built but unwired" (per memory) | Components exist with passing tests (`LearningPath.test.tsx`, `academy-storage-hardening.test.tsx`); "unwired" semantics need clarification — pages are routed |
| "WEDM 62 engines" | live engine grep matches 62+ WEDM-prefixed engines + EDM-prefixed; reasonable accuracy |
| "Process backbone production-ready" | 9 of 9 backbone elements have engines; 8/9 have tests; 7/9 have integrated dispatcher actions — CLOSE TO TRUTH but no consolidated E2E |

---

## §6 Self-awareness query failures

These MCP self-introspection actions returned empty/no-op when called fresh:

| Action | Output | Implication |
|---|---|---|
| `prism_dev:capability_census` | `{total_engines:0,total_dispatchers:0,total_actions:0...utilization_pct:0}` | telemetry rot |
| `prism_dev:capability_census_report` | identical zero-output | same |
| `prism_dev:self_awareness_gaps` | `{query:"",hasCapability:false,confidence:0,missingCapabilities:[""]}` | empty query expected — but no documented default |
| `prism_dev:roadmap_dag_stats` | (no output) | tool returned no data |
| `prism_dev:critical_units` | (not invoked due to time) | unverified |
| `prism_dev:engine_overlap_scan` | `{total_engines:0,duplicate_count:0,verdict:"CLEAN"}` | scanner not engaged |
| `prism_dev:auto_wiring_scan` | (no output) | tool returned no data |
| `prism_dev:discover_what_can_i_do` | `{query:"",total:0}` | empty query default |
| `prism_dev:pillar_summary` | 8/8 stubs with all engines listed in `missing[]` despite existing | pillar registry empty |
| `prism_infra:search_stats` | `mode:"disabled"` | semantic search OFFLINE |

**Critical finding:** PRISM's self-awareness telemetry layer is largely **not running** in the active MCP server. The system cannot honestly answer "what do I have wired?" right now. This is the #1 hidden gap.

---

## §7 Scrutiny ledger summary

**Top 3 honesty downgrades:**

1. **Pillar telemetry rot** — `prism_dev:pillar_summary` reports 0% completeness for all 8 pillars while 3,046 engines exist and 6,800 dispatcher actions are live. The pillar-monitoring engine is not synchronizing against the live tree. Any "X% pillar wired" claim is unsupported until this is repaired.

2. **Lead-in/lead-out + Build-quality-aware ceiling claimed as Master Post differentiators are stubs** — no engines, no integration actions, no tests. Vision claims 12 Master Post differentiators; only 4 are production-ready end-to-end (rapids/air-cut, controller dialect, collision sweep, process-specific dialect).

3. **Capability census + auto-wiring + semantic search are OFFLINE** — `capability_census` returns 0 engines, `auto_wiring_scan` returns no output, `search_stats` returns `mode:"disabled"`. PRISM's own self-introspection layer is not operational. Future Claude sessions will be unable to programmatically verify what is wired.

**Additional but significant:**
- 35 vs 38 stage post-pipeline number disagreement between vision and project CLAUDE.md
- Esprit tier-1 priority 4 status does not match current code (would be tier-2 if ranked by maturity)
- Tribal tip count `tribalTipCount=0` in live manifest vs 3,700 claimed in CLAUDE.md
- 109 hooks claimed in vision vs 414 actually deployed (under-report, not over-report — but means vision is stale)

---

## §8 What "downgrade aggressively" means in practice

After applying the rubric:
- 23 vision elements remain **production**
- 28 demoted/maintained as **beta** (engine + dispatcher exist, but no integration test asserting end-to-end behaviour)
- 6 are **stub** (named in vision but engine class missing or dispatcher action absent)
- 3 are **planned** (vision aspirations with no current code)

The system is real and powerful — 3,046 engines is not vapor — but the **claim density** is too high. The vision document promises "everything works"; the chain audit shows ~38% has full provable end-to-end integrity, ~47% works in pieces but lacks integration tests, ~15% is partial-or-missing.
