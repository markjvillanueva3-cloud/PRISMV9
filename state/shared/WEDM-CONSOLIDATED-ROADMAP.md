# WEDM CONSOLIDATED ROADMAP — Deep-Learning, Deep-Logic, Near-AGI Wire EDM System

**Track:** WEDM-CONSOLIDATED
**Version:** 1.4
**Generated:** 2026-04-16 (v1.0), patched 2026-04-16 (v1.1 Stage-10 fixes, v1.2 Round-4 closure, v1.3 Round-5 Codex-frontend alignment, v1.3.1 MS-P7.5 expansion), **refreshed 2026-04-21 (v1.4 — inventory drift reconciliation + 11-file archive)**.
**Generator:** RGS pipeline v10 (project-level, scrutiny-hardened). Walked stages 1-9 inline; Stage 10 10-agent parallel scrutiny results in Section 11; Round 4 convergent scrutiny (goal-planner + collective-intelligence-coordinator + safety-physics) results in Section 12; Round 5 Codex-frontend alignment (researcher + code-analyzer + Plan) results in Section 13. **v1.4 refresh: count-only, no new scrutiny rounds — 5-day drift reconciliation after zero phase closures.**
**Authority:** Sequencing authority across six WEDM tracks. Individual milestone envelopes under `mcp-server/data/milestones/WEDM-*.json` remain the unit-of-work source of truth.
**Quality Benchmarks:** `mcp-server/audits/R0-P0/U04-skills-scripts-hooks-audit.md` (format) + archived WEDM-UNIFIED-ROADMAP.md (session structure, now in `plans-archive/wedm/2026-04-21/`) + `CAMX-RESTRUCTURED-ROADMAP-v24.md` (scrutiny hardening).
**Platform source of truth:** `H:/prism/PRISM-INVENTORY-LATEST.md` (live, auto-regenerated on SessionStart).
**Omega Target:** 1.0 across every milestone.
**SVI Target:** +25 % cumulative (plan achieves +45 % after v1.2 closure — headroom for any failed gate to revert without dropping below target). **Current SVI Ψ: 0.875 / 1.0 (WEDM subset, unchanged from v1.3.1).**
**v1.2 additions:** 3 new milestones (MS-P0.5-COORD, MS-P1.5-ONESHOT, MS-P2.5-SAFETY) / 21 new units / ~6,400 LOC — close the print→CNC one-shot promise (coverage 47%→95%, synergy 0.20→0.65, S(x) 0.24→0.72).
**v1.3 additions:** 1 new milestone (MS-P7.5-FE-GAPS) / 6 new units / ~2,100 LOC — close the R5 Codex-frontend gaps (WireEdmStudio drift gate, calculator wire_edm mode hygiene, 4 hardcoded `fanuc-wire-standard` literals, Print Drop bridge page, unified job-session store, 4 orphan API clients). Canonical frontend path declared: `mcp-server/web/` (legacy `/web/` retired under Universal 0.6 codegen per R5 Decision #3).

**v1.3.1 expansion (2026-04-16, late):** MS-P7.5-FE-GAPS expanded from 6 → 7 units / ~2,100 → ~2,480 LOC / 2 → 3 sessions after verifying the actual Codex wizard scope. U-P7.5-FE-01 now snapshots the full **5,862 LOC Studio wizard stack** (12 files: WireEdmStudioPage + WedmStudioContext + useWedmPipeline + WizardShell + ProfileCanvas + 6 Step components + StepErrorCard + InfoTip), and new **U-P7.5-FE-07** reconciles the WireEdmStudioPage (/wire-edm, 6-step authoring) vs WireEdmWizardPage (/wire-edm-wizard, single-page quick planner, `appw_stage: 'APPW-MS0 machining calculation'`) duality — binding the Wizard to APPW-MS0/MS1 lifecycles and the `solveWireEdmWizard` backend contract.

---

## v1.4 REFRESH CHANGELOG (2026-04-21)

**Zero phase closures in the 5 days since v1.3.1** — all 23 MS-P* milestones (P0.5 → P10) remain `not_started` in `roadmap-index.json`. `FMERGE-MS1` is the only `in_progress` entry.

**Inventory drift reconciled** (re-measured 2026-04-21):

| Asset | v1.3.1 count (04-16) | v1.4 count (04-21) | Δ |
|---|---|---|---|
| WEDM/WireEDM engines | 95 | **146** | **+51** |
| EDM-prefixed engines (non-WEDM) | — | **19** | new row |
| Dispatcher actions (`prism_edm`) | 61 | 61 | 0 |
| Orchestration stages | 30 | 30 | 0 |
| Controller dialects | 5 | 5 | 0 |
| WEDM tests | 65 | 65 | 0 |
| WEDM skills (`~/.claude/commands/wedm-*.md`, `wire-edm-*.md`) | 12 | **23** | **+11** |
| WEDM hooks (`.claude/hooks/lib/wedm-*`) | 22 | 22 | 0 |
| Frontend pages | 4 | 4 | 0 |
| Tribal tips (WEDM) | 46 | 46 | 0 |
| Formulas (WEDM, MIT-cited) | 14 | 14 | 0 |
| AGI state files (`data/state/WEDM_*.json/.jsonl`) | 39 | **46** | **+7** |
| SVI Ψ (WEDM) | 0.875 | 0.875 | 0 |

**Interpretation:** +51 engines + 11 skills in 5 days indicates continued infrastructure build-out happening via other tracks (CAD-COMPLETE-MS0, LATHE-PROD-READY-MS0 cross-dependencies), but none landed in the WEDM-specific MS-P* progression. The DL/ML (P4), GNN (P5), and validation (P6) work this roadmap plans remains untouched.

**Archive action (v1.4):** 11 superseded source roadmaps moved to `H:/prism/plans-archive/wedm/2026-04-21/` with README mapping each to its subsuming section of this master:

| Archived | Subsumed by |
|---|---|
| `WIRE-EDM-COMPREHENSIVE-ROADMAP.md` | Stage 1-2 (brief + codebase audit) |
| `WIRE_EDM_PIPELINE_ROADMAP.md` | MS-P1-100PCT |
| `WEDM_VALIDATION_ROADMAP.md` | MS-P6-VAL30 |
| `WEDM-MS1-AUDIT-REPORT.md` | Section 11 Stage-10 scrutiny |
| `WEDM-UNIFIED-ROADMAP.md` | MS-P7-UI-M1..M7 |
| `WEDM-CALIBRATE-ROADMAP.md` | WEDM-CAL-MS0..MS4 (complete) |
| `CWEDM-CALCULATOR-WIRING-ROADMAP.md` | Calculator track (CWEDM-MS0 complete) |
| `WEDM-AGI-INTELLIGENCE-ROADMAP.md` + SCRUTINIZED variants (3 files) | MS-P4-DL-CORE, MS-P4-DL-PRED, MS-P5-GNN, MS-P9-XAI |
| `WEDM-CONSOLIDATED-SCRUTINY-2026-04-16.md` | Section 12 Round-4 convergent scrutiny |

**Milestone envelopes (`mcp-server/data/milestones/WEDM-*.json` + `CWEDM-*.json`) are NOT archived** — they remain the per-unit source of truth and are still referenced by live tooling.

---

## 0. WHY THIS EXISTS

Six WEDM tracks currently run in parallel with overlapping assumptions, duplicated acceptance gates, and inconsistent frontend/backend coupling:

| Track | State | Scope |
|-------|-------|-------|
| WEDM-100PCT-MS0 | 34 / 38 done | Physics-first program generation, 100% confidence |
| WEDM-GAPFILL-MS0 | 0 / 11 open | Imperial G-code, wire break recovery, STEP/IGES, safety |
| WEDM-LAUNCH-MS0 | 9 / 9 done | V1 launch gate (Mitsubishi straight die only) |
| WEDM-UNIFIED (v2.0) | 0 / 38 open | Upload→Results frontend flow, 7 milestones |
| WEDM-AGI P1–P4 | 38 units done | Autonomy, safety, perception, RUL, handoff |
| CAMX-V17-P9 | 0 / 40 open | Tier 6 complex parts (progressive die, spline broach, PCD) |

**The problem:** no single ordering tells the next operator *what to build next* when all six tracks cross-cut the same engines. This roadmap produces that ordering and layers a near-AGI substrate on top.

**Design pillars (non-negotiable):**

1. **Deep Logic** — every decision traces to a published formula, real-shop program, or operator-validated rule. No synthetic parameters past P2.
2. **Deep Reasoning** — `PRISMCreativeReasoningEngine.explore("optimal")` on every multi-variable tradeoff. No single-path heuristics.
3. **Deep Learning** — on-device LoRA fine-tuning of wire-break, recast, Ra predictors against real job outcomes. EWC++ prevents catastrophic forgetting when a new material family appears.
4. **Neural Networking** — graph-attention over the 5-axis machine × material × wire × thickness × Ra lattice. Every new job updates a 64-dim embedding that downstream engines can query in O(log n).
5. **Near-AGI Substrate** — SAE J3016 adapted L0→L5 autonomy with `WEDMAutonomyLevelEngine` as gatekeeper. No operation promoted above L3 without handoff gate confirming S(x) ≥ 0.90 over rolling 30-job window.

---

## 1. RGS PIPELINE — STAGES 1-10 EXPLICIT OUTPUT

Every stage's output is recorded here so downstream reviewers can audit the decision trail.

### Stage 1 — Brief Analysis

| Field | Value |
|-------|-------|
| Domain | Wire EDM end-to-end (physics → pipeline → UI → learning) |
| Machine types | Mitsubishi FA/MV, Sodick AQ/AL, Makino U/EU, AgieCharmilles CUT, Fanuc ROBOCUT |
| Complexity | **XL** (cross-cuts physics, autonomy, learning, frontend, safety; 6 tracks) |
| Primary constraints | (a) No new synthetic parameters past P2 (b) Must preserve WEDM-AGI P1-P4 autonomy work (c) Must wire to Codex-built `web/src` without breaking V1 launch |
| Dependencies | `PRISM-INVENTORY-2026-04-15.md` (platform counts), `wedm_generate_digest.ts` (subset counts), existing six milestone envelopes, Codex-built frontend pages |
| Design pillars | Deep Logic + Deep Reasoning + Deep Learning + Neural Networking + Near-AGI |
| Exit reference | Frontend parity with lathe + FE↔BE audit + XAI surface |
| Benchmark quality | Match U04 audit format + WEDM-UNIFIED session-block format |

### Stage 2 — Codebase Audit (cited, not re-counted)

**Global platform inventory** (from `PRISM-INVENTORY-2026-04-15.md`, authoritative):

| Asset Class | Platform Count | Integration |
|-------------|----------------|-------------|
| Engines (all) | 1,869 | ~30 % wired to dispatchers (70 % orphan) |
| Dispatchers | 85 | — |
| Actions | 2,720+ | — |
| Formulas | 509 | ~50 % wired to engines |
| Algorithms | 53 | ~40 % wired to engines |
| Registries (entries) | 24 (29,569) | — |
| Skills | 66 | — |
| Scripts | 52 | — |
| Hooks | 227 | — |
| Tests | 1,255 | — |
| Materials | 6,372 | — |
| Tools | 95,608 | — |
| Machines | 910 | — |
| Tribal tips | 4,493 | ~20 % active |
| MIT courses | 225 | 9 integrated |
| JM DIE programs (total) | 36,929 | — |
| JM DIE WEDM programs | 2,500+ | 26 of 2,500+ indexed with published conditions |

**WEDM-scoped subset** (re-measured 2026-04-21 via live filesystem glob; supersedes the 2026-04-16 digest snapshot):

| Asset Class | WEDM Count | Source |
|-------------|------------|--------|
| WEDM/WireEDM engines | **146** of 2,712 | `src/engines/WEDM*.ts`, `WireEDM*.ts` (excludes `.test.ts`) |
| EDM-prefixed engines (non-WEDM) | **19** | `src/engines/EDM*.ts` |
| Dispatcher actions (`prism_edm`) | **61** of 6,638 | `edmDispatcher.ts` |
| Orchestration stages | **30** | `WEDMCompleteOrchestrationEngine` (1,502 LOC) |
| Controller dialects supported | **5** | Mitsubishi, Sodick, Makino, AgieCharmilles, Fanuc |
| WEDM tests | **65** files of 2,668 total (30,966 LOC) | `src/__tests__/wedm-*.test.ts` |
| WEDM skills | **23** of 61 | `~/.claude/commands/wedm-*.md`, `wire-edm-*.md` |
| WEDM hooks | **22** of 59 (16 safety + 2 SVI + 2 perception + 2 learning) | `.claude/hooks/lib/wedm-*.mjs`, `wedm_safety_hooks.py` |
| Frontend pages | **4** | `WireEdmUploadPage`, `WireEdmWizardPage`, `WireEdmResultsPage`, `WireEdmStudioPage` |
| Tribal tips (WEDM) | **46** of 4,493 (20 field + 26 MIT) | `wedm-knowledge-tips.ts` |
| Formulas (WEDM) | **14** of 509 with MIT citations | `PUBLISHED_FORMULAS` + registry |
| AGI state files | **46** | `data/state/WEDM_*.json` + `*.jsonl` + `*.flag` + `wedm-reservations.json` |
| SVI Ψ (WEDM) | **0.875** / 1.0 | WEDM-AGI-P4 closeout commit 826c9014 (unchanged) |

**Inflation reconciliation (v1.4):** engine count grew from 95 → 146 (+51) over 5 days via cross-track infrastructure builds (CAD-COMPLETE-MS0, LATHE-PROD-READY-MS0 work touches shared physics/geometry). `CLAUDE.md` line-item counts are auto-regenerated per SessionStart and may lag by a session; `PRISM-INVENTORY-LATEST.md` is authoritative.

**Key integration implication for sequencing:** the 70 % platform-wide engine-orphan ratio means Phase P8 (FE↔BE audit) cannot assume every WEDM engine already has a dispatcher path. P0 must surface per-WEDM-engine wiring status via `DispatcherInventoryEngine`, otherwise P9 wiring work inherits an unbounded scope.

### Stage 3 — Knowledge Source Mapping

Per-phase knowledge sources (expanded per-milestone inside §5):

| Phase | ENGINES | FORMULAS | TRIBAL | REFERENCE |
|-------|---------|----------|--------|-----------|
| P0 | DispatcherInventoryEngine | — | U04 audit | `PRISM-INVENTORY-2026-04-15.md`, `WEDM_DIGEST.json` |
| P1 | EDMCuttingParamFlushEngine, EDMMultiPassStrategyEngine, EDMProgramAssemblerEngine, EDMMonitorSurfaceIntegrityEngine, WEDMPrintToProgramEngine, WireEDMSettingsEngine | Klocke Ra (`Ra ∝ W_e^0.33`, Klocke 2013 *Manufacturing Processes 4*), DiBitonto crater (DiBitonto et al. 1989 *J. Appl. Phys.* 66(9):4095, cathode/anode partition), Kunieda pulse energy (Kunieda et al. 2005 *CIRP Annals*), Toenshoff cascade, Carslaw & Jaeger semi-infinite moving heat source (*Conduction of Heat in Solids*, 1959 §10.7), Sato et al. 1988 *Bull. JSPE* 22(3):162 (WEDM speed law), Puri & Bhattacharyya 2003 WEDM Ra regression (note: Puertas & Luis 2003 is sinker-EDM — do not cross-apply), **wire deflection `δ = q·L²/(8·T)` for distributed load or `δ = F·L/(4·T)` for midspan point load per Dauw & Snoeys 1986 CIRP Annals "On the Derivation of Wire-EDM Deflection Models"** | WEDM tribal tips (46), Mitsubishi FA/MV control-room notes | ITW SHAKEPROOF, NOZE TEST, CHOCTAW DEFENSE, Box Drive 5-inch square, Lemhunter D2 feed curves, Mitsubishi FA catalog, Makino HYPER-i, Bedra/Berkenhoff/Shinko wire sheets |
| P2 | WEDMImperialGCodeEngine (new), WEDMWireBreakRecoveryEngine (new), WEDMMachineScheduleEngine (new), WEDMStepImportEngine (new), EDMPreflightSafetyEngine (new) | G-code unit conversion, AWT retry backoff | JM Die imperial programs, JM Die wire break logs | STEP AP203/214, IGES 5.3 |
| P3 | EDMMultiPassStrategyEngine, EDMWireSlugCornerTaperEngine, EDMProgramAssemblerEngine | Johnson-Cook (PCD conductivity branch), stagger math for progressive die | JM Die progressive-die tips, broach tips | JM Die progressive-die programs (CNC MILL HAAS/*progressive*), M2 punch validation suite |
| P4 | WEDMDegradationModelEngine, WEDMRULEngine, WEDMRLPolicyEngine, PRISMCreativeReasoningEngine, CrossDisciplinaryDeepLearningEngine, sona-learning-optimizer agent | LoRA rank-4 adapters, EWC++ Fisher information, ridge regression posterior update, LinUCB bandit (existing WEDM_RL_POLICY v1) | WEDM_JOB_HISTORY.json schema v1 | Published LoRA paper (Hu 2021), EWC++ paper (Chaudhry 2018) |
| P5 | MaterialRegistry (6,372), MachineRegistry (910), wedm-published-conditions.ts (26), WEDM_JOB_HISTORY | Multi-head graph attention h=4, LayerNorm, cosine similarity retrieval, HNSW O(log n) | Sublinear solvers (k-hop propagation, already in repo) | HNSW paper (Malkov 2018), GAT paper (Velickovic 2017) |
| P6 | All engines from P1-P5; WEDM-UNIFIED M6 harness | All from P1-P5 | WEDM 46 tips, validation set 30 parts | WEDM-UNIFIED-ROADMAP M6, JM Die validation library |
| P7 | web/src pages, components, routes; Codex-built app | — | WEDM-UNIFIED frontend tips | LatheUploadPage, WireEdmResultsPage (existing patterns), WEDM-UNIFIED M1-M5+M7 |
| P8 | DispatcherInventoryEngine, R0-P0 audit engines | — | U04 audit format | `mcp-server/audits/R0-P0/U04-skills-scripts-hooks-audit.md` |
| P9 | WEDMReasoningExplainEngine (P5), WEDMLoRAAdapterEngine (P4), WEDMJobOutcomeEngine (P4) | — | — | WEDM-FE-BE-AUDIT-2026-04 (from P8) |
| P10 | WEDMLaunchGateEngine (new), all phase exit gates | S(x) rolling 30-job | — | WEDM-LAUNCH-MS0.json (V1 precedent) |

### Stage 4 — Scope Estimation

- **Complexity class:** XL
- **Unit total:** 112 (counting 6 test-as-units expansions on top of 106 canonical units).
- **Session target:** 2-3 units per session, compaction every 3 units → **~42 sessions** minimum across the full track.
- **Cumulative compaction points:** 14 `/compact` checkpoints across the roadmap.
- **Estimated calendar duration:** 10-14 weeks at 3-4 sessions/week.
- **Confidence:** medium-high — 94 of 112 units are either already scoped in existing envelopes or have a clearly identified reference implementation in WEDM/EDM/WireEDM engine families.

### Stage 5 — Phase Decomposition

10 phases, 18 milestones, 112 units. Canonical SESSION blocks written per-milestone in §5. Full list:

```
P0  MS-P0-V          (1 milestone, 3 units, 1 session)
P1  MS-P1-100PCT     (1 milestone, 4 units, 2 sessions)
P2  MS-P2-GAPFILL    (1 milestone, 11 units, 5 sessions)        [reuses WEDM-GAPFILL-MS0.json verbatim]
P3  MS-P3-TIER6A     (1 milestone, 7 units, 2 sessions)
    MS-P3-TIER6B     (1 milestone, 7 units, 3 sessions)
P4  MS-P4-DL-CORE    (1 milestone, 5 units, 2 sessions)
    MS-P4-DL-PRED    (1 milestone, 4 units, 2 sessions)
P5  MS-P5-GNN        (1 milestone, 6 units, 3 sessions)
P6  MS-P6-VAL30      (1 milestone, 8 units, 3 sessions)         [absorbs WEDM-UNIFIED M6]
P7  MS-P7-UI-M1      (1 milestone, 6 units, 2 sessions)
    MS-P7-UI-M2      (1 milestone, 4 units, 1 session)
    MS-P7-UI-M3      (1 milestone, 4 units, 1 session)
    MS-P7-UI-M4      (1 milestone, 4 units, 1 session)
    MS-P7-UI-M5      (1 milestone, 6 units, 2 sessions)
    MS-P7-UI-M7      (1 milestone, 6 units, 2 sessions)
P8  MS-P8-FEBE       (1 milestone, 5 units, 2 sessions)
P9  MS-P9-WIRE       (1 milestone, 10 units, 4 sessions)
    MS-P9-XAI        (1 milestone, 3 units, 1 session)
    MS-P9-INT        (1 milestone, 1 unit, 1 session)
P10 MS-P10-V2LAUNCH  (1 milestone, 6 units, 2 sessions)
```

Critical path: **P0 → P1 → P2 → P6 → P7 → P8 → P9 → P10.**
Parallelizable pairs: (P3, P4), (P5, P2 tail), (P4 tail, P5 head) — NOT (P4 tail, P6 head) since P5 is between them.

### Stage 6 — Unit Population

Every unit carries U-{PREFIX}{NN} naming. Domain prefixes used:

- `U-P0-V01..V03` — Verification
- `U-P1-01..04` — 100PCT completion
- `U-WGAP01..11` — Gap-fill (inherited verbatim from WEDM-GAPFILL-MS0)
- `U-P3-T6A-01..07`, `U-P3-T6B-01..07` — Tier 6 progressive-die and spline-broach/PCD
- `U-P4-DL-01..05`, `U-P4-PR-01..04` — DL core and predictors
- `U-P5-GNN-01..06` — Graph neural reasoning
- `U-WEVA01..08` — 30-part validation (inherited from WEDM-UNIFIED M6)
- `U-WEUI-M1-01..06`, `U-WEUI-M2-01..04`, `U-WEUI-M3-01..04`, `U-WEUI-M4-01..04`, `U-WEUI-M5-01..06`, `U-WEUI-M7-01..06` — Frontend parity per WEDM-UNIFIED
- `U-P8-FEBE-01..05` — FE↔BE audit
- `U-P9-WIRE-01..10`, `U-P9-XAI-01..03`, `U-P9-INT-01` — Wiring + XAI + integration
- `U-P10-V2-01..06` — V2 launch gate

Zero naming collisions verified by grep across all envelopes. Domain prefix matches milestone theme (per Agent 2 of Stage 10 scrutiny).

### Stage 7 — Forge-Triple Ownership (DECLARED / BUILT / CONSUMED)

Single-ownership rule: every artifact is BUILT in **exactly one** unit. Milestones that only DECLARE or CONSUME are marked and do **not** list the artifact in `feature_cascade.new_*`.

| Forge-Triple Artifact | BUILT in | DECLARED in | CONSUMED by |
|-----------------------|----------|-------------|-------------|
| hook `wedm-digest-freshness` | MS-P0-V / U-P0-V03 | MS-P0-V | all later phases |
| action `prism_edm:wedm_digest` | MS-P0-V / U-P0-V03 | MS-P0-V | P8 (FE↔BE audit) |
| skill `/wedm-audit` | MS-P0-V / U-P0-V03 | MS-P0-V | P8, P10 |
| hook `wedm-synthetic-block` | MS-P1-100PCT / U-P1-01 | MS-P1-100PCT | P2-P10 (enforcement) |
| action `prism_edm:wedm_citation_check` | MS-P1-100PCT / U-P1-01 | MS-P1-100PCT | P10 (launch gate) |
| skill `/wedm-cite` | MS-P1-100PCT / U-P1-01 | MS-P1-100PCT | P6 validation |
| hook `wedm-production-gate` | MS-P2-GAPFILL / U-WGAP09 | MS-P2-GAPFILL, referenced by P6 | P3, P6, P7, P10 |
| action `wedm_preflight_check` | MS-P2-GAPFILL / U-WGAP09 | MS-P2-GAPFILL | P7 UI, P10 launch |
| action `wedm_plan_break_recovery` | MS-P2-GAPFILL / U-WGAP03 | MS-P2-GAPFILL | P9 wiring |
| action `wedm_reserve_machine` | MS-P2-GAPFILL / U-WGAP05 | MS-P2-GAPFILL | P9 wiring |
| action `wedm_check_availability` | MS-P2-GAPFILL / U-WGAP06 | MS-P2-GAPFILL | P7, P9 |
| skill `/wedm-preflight` | MS-P2-GAPFILL / U-WGAP09 | MS-P2-GAPFILL | P3 Tier 6 |
| hook `wedm-tier6-geom-gate` | MS-P3-TIER6A / U-P3-T6A-01 | MS-P3-TIER6A | P6 validation, P10 |
| action `prism_edm:wedm_validate_tier6` | MS-P3-TIER6A / U-P3-T6A-01 | MS-P3-TIER6A | P7 UI, P10 |
| skill `/wedm-tier6` | MS-P3-TIER6A / U-P3-T6A-01 | MS-P3-TIER6A | P6 validation |
| hook `wedm-pcd-conductivity-gate` | MS-P3-TIER6B / U-P3-T6B-05 | MS-P3-TIER6B | P6 validation, P10 |
| action `prism_edm:wedm_validate_pcd` | MS-P3-TIER6B / U-P3-T6B-05 | MS-P3-TIER6B | P7 UI, P10 |
| skill `/wedm-pcd` | MS-P3-TIER6B / U-P3-T6B-05 | MS-P3-TIER6B | P6 validation |
| hook `wedm-learning-freshness` | MS-P4-DL-CORE / U-P4-DL-01 | MS-P4-DL-CORE | P5, P6, P9, P10 |
| action `prism_edm:wedm_learn_from_job` | MS-P4-DL-CORE / U-P4-DL-01 | MS-P4-DL-CORE | P5, P6, P9 XAI |
| skill `/wedm-learn` | MS-P4-DL-CORE / U-P4-DL-01 | MS-P4-DL-CORE | P9 XAI |
| hook `wedm-predictor-mae-gate` | MS-P4-DL-PRED / U-P4-PR-01 | MS-P4-DL-PRED | P6 validation, P9 XAI, P10 |
| action `prism_edm:wedm_predict_ra` | MS-P4-DL-PRED / U-P4-PR-01 | MS-P4-DL-PRED | P7 UI, P9 XAI, P10 |
| skill `/wedm-predict` | MS-P4-DL-PRED / U-P4-PR-04 | MS-P4-DL-PRED | P9 XAI, P10 |
| action `wedm_verify_quality` | MS-P6-VAL30 / U-WEVA01 | MS-P6-VAL30 (BUILD ownership claimed — prior WEDM-UNIFIED M6 only DECLARED) | P7 UI, P10 |
| skill `/wedm-validate` | MS-P6-VAL30 / U-WEVA08 | MS-P6-VAL30 (BUILD ownership claimed) | P7, P9, P10 |
| hook `wedm-gnn-rebuild-stale` | MS-P5-GNN / U-P5-GNN-02 | MS-P5-GNN | P9 XAI, P10 |
| action `prism_edm:wedm_graph_query` | MS-P5-GNN / U-P5-GNN-03 | MS-P5-GNN | P9 XAI |
| skill `/wedm-reason` | MS-P5-GNN / U-P5-GNN-05 | MS-P5-GNN | P9 XAI, P10 |
| hook + actions for M1-M5,M7 (upload, feature, wizard, profile, calculator, lathe-backport) | MS-P7-UI-Mx (per WEDM-UNIFIED M1-M5,M7) | CONSUMED from WEDM-UNIFIED | P8, P9, P10 |
| hook `wedm-febe-drift-watch` | MS-P8-FEBE / U-P8-FEBE-01 | MS-P8-FEBE | P9, P10 |
| action `prism_edm:wedm_audit_febe` | MS-P8-FEBE / U-P8-FEBE-05 | MS-P8-FEBE | P9 wiring, P10 |
| skill `/wedm-febe-audit` | MS-P8-FEBE / U-P8-FEBE-05 | MS-P8-FEBE | P10 |
| hook `wedm-ui-mock-block` | MS-P9-WIRE / U-P9-WIRE-01 | MS-P9-WIRE | P10 |
| action `prism_edm:wedm_ui_action_ping` | MS-P9-WIRE / U-P9-WIRE-01 | MS-P9-WIRE | P10 |
| skill `/wedm-wire` | MS-P9-WIRE / U-P9-WIRE-10 | MS-P9-WIRE | P10 |
| hook `wedm-xai-required` | MS-P9-XAI / U-P9-XAI-01 | MS-P9-XAI | P10 |
| action `prism_edm:wedm_explain_prediction` | MS-P9-XAI / U-P9-XAI-01 | MS-P9-XAI | P10 |
| action `prism_edm:wedm_drift_report` | MS-P9-XAI / U-P9-XAI-03 | MS-P9-XAI | P10 |
| skill `/wedm-explain` | MS-P9-XAI / U-P9-XAI-01 | MS-P9-XAI | P10 |
| skill `/wedm-feedback` | MS-P9-XAI / U-P9-XAI-02 | MS-P9-XAI | P10 |
| hook `wedm-e2e-ci-gate` | MS-P9-INT / U-P9-INT-01 | MS-P9-INT | P10 |
| action `prism_edm:wedm_e2e_report` | MS-P9-INT / U-P9-INT-01 | MS-P9-INT | P10 |
| skill `/wedm-e2e` | MS-P9-INT / U-P9-INT-01 | MS-P9-INT | P10 |
| hook `wedm-v2-scope-gate` | MS-P10-V2LAUNCH / U-P10-V2-05 | MS-P10-V2LAUNCH | (terminal) |
| action `prism_edm:wedm_v2_generate` | MS-P10-V2LAUNCH / U-P10-V2-05 | MS-P10-V2LAUNCH | (terminal) |
| skill `/wedm-v2` | MS-P10-V2LAUNCH / U-P10-V2-06 | MS-P10-V2LAUNCH | (terminal) |

**Double-claim check:** grepped every `new_hooks`, `new_actions`, `new_skills` entry across all 18 milestones — zero duplicates.

### Stage 8 — Enforcement Integration

```
PRE-LEVEL (all sessions, blocking):
  knowledge-consult          — verifies tribal + formula + reference read before engine edit
  wedm-physics-constants-gate — blocks inline constants (must import from constants.ts)
  context-retention          — verifies CLAUDE.md + current envelope read
  duplication-guard          — mandatory check before creating engine/hook/action/skill
  git-anti-clobber           — serializes git mutations across concurrent sessions

POST-LEVEL (all tool calls, blocking):
  stub-detector              — blocks placeholder engines
  test-quality-gate          — blocks `|| true`, bare `.includes()`, `toBeGreaterThan(0)` style tests
  constants-checker          — blocks inline physics numbers
  physics-agent              — reviews every engine edit for formula correctness
  wiring-agent               — reviews every engine for MCP readiness
  always-build-guard         — enforces "ALWAYS BUILD, NEVER SKIP" rule (MEMORY.md feedback_always_build.md)

COMPACT-LEVEL (every 3 units):
  review-gate                — aggregated review of session output
  wiring-gate                — verifies dispatcher wiring for any new engine
  forge-triple-gate          — blocks compaction without hook + action + skill per milestone
  session-audit-agent        — post-session review

POST-COMPACT:
  Feature Cascade            — writes SESSION_ARTIFACTS.json (new hooks/actions/skills visible to next session)

SESSION-LIFECYCLE (every session):
  context_boot → dispatcher_map → memory_recall → system_snapshot
  → action_search "wire edm <goal>"
  → auto_checkpoint (every 5-10 calls) → wip_capture
  → memory_save → checkpoint_enhanced on session end
```

### Stage 9 — Dependency Resolution (DAG validated)

```
P0 (verification, no upstream)
  └─> P1 (100PCT finish) ─┬─> P2 (GAPFILL hardening) ─┬─> P3 (CAMX Tier 6)
                          │                            │
                          │                            └─> P6 (validation 30-part)
                          └─> P4 (DL substrate) ─┬─> P5 (GNN reasoning) ─> P6
                                                 │
                                                 └─> P9 (meta-learning wiring)
P6 ─> P7 (frontend unification M1-M5,M7)
P7 ─> P8 (FE↔BE gap audit)
P8 ─> P9 (FE wiring + XAI)
P9 ─> P10 (V2 LAUNCH GATE)
```

**Cross-track dependencies declared:**
- P0 depends on R0-P0 audit format and `PRISM-INVENTORY-2026-04-15.md`
- P7 depends on WEDM-UNIFIED M1-M5,M7 (units reused verbatim)
- P6 depends on WEDM-UNIFIED M6 (units reused verbatim, augmented with job-history capture)
- P9 depends on Codex-built `web/src/` pages (read-only surface audit in P8 precedes wiring)
- P10 depends on WEDM-LAUNCH-MS0 V1 precedent document

**Cycles:** none (validated via topological sort).
**Compaction splits:** every compaction point falls on a session boundary; no unit is split across compactions.
**available_to completeness:** P0 outputs are consumed by P1 through P10 inclusive; P1 outputs by P2 through P10; all `available_to` lists include terminal P10.

### Stage 10 — Output + 10-Agent Scrutiny

Stage 10 results are recorded below in Section 11 after regeneration of the 10-agent scrutiny run. Pass threshold: average ≥ 80, no agent < 40, fix any dimension below.

---

## 2. ASSET INVENTORY (CURRENT GROUND TRUTH, 2026-04-16)

Preserved verbatim from §1 Stage 2. Platform counts cited from `PRISM-INVENTORY-2026-04-15.md`; WEDM subset counts from `wedm_generate_digest.ts` (2026-04-16).

---

## 3. GAP ANALYSIS (SEVEN ROOT GAPS)

| ID | Gap | Evidence | Roles Affected | Phase |
|----|-----|----------|----------------|-------|
| G1 | 4 units of WEDM-100PCT still pending — physics-first completeness incomplete | `WEDM-100PCT-MS0.completed_units = 34/38` | Process Engineer | P1 |
| G2 | Imperial G-code output (G20), wire-break recovery auto-retry, STEP/IGES import, active safety checks | `WEDM-GAPFILL-MS0.gaps` 1-5 | Operator, CAM Programmer, Safety Officer | P2 |
| G3 | Tier 6 complex parts (progressive die, spline broach, PCD tooling) unvalidated | `CAMX-V17-P9` deferred | Sales Engineer, Application Engineer | P3 |
| G4 | Deep-learning substrate absent — on-device LoRA, EWC++ memory, few-shot material adaptation | WEDM-AGI P1-P4 delivered autonomy/safety, no learning | AI, Process Engineer | P4 |
| G5 | Graph-neural reasoning over material×machine×wire×thickness×Ra lattice not wired | No embedding index exists | AI, CAM | P5 |
| G6 | Frontend flow for wire EDM does not reach parity with lathe (upload→results→downloads + feature editor + shop profile + panels) | `WEDM-UNIFIED-ROADMAP` M1–M7 open | User Experience, Operator | P7 |
| G7 | No end-to-end audit of frontend capability vs backend capability (codex-built frontend may under- or over-expose engines) | Never performed | Product, AI | P8 |

---

## 4. DEPENDENCY GRAPH (LOGICAL ORDER — v1.3 patched)

```
P0 ─> P0.5 ─> P1 ─> P1.5 ─> P2 ─> P2.5 ─┬─> P3 ─────────────────────────────┐
 (coord)        (oneshot)      (safety)  │                                    ▼
                                         ├─> P4 ─> P5 ──────────> P6 ─> P7 ─> P7.5 ─> P8 ─> P9 ─> P10
                                         │         │                 (FE gap)                ▲
                                         │         └───────────────────────────────────────-─┘
                                         └──────────────────────────────────────────────────-┘
  (P4 also feeds P9 directly; P5 also feeds P9 XAI directly; P0.5 substrate feeds ALL downstream phases;
   P7.5 FE-GAPS closes Codex-frontend R5 findings before the P8 surface audit runs)
```

**Critical path:** P0 → P0.5 → P1 → P1.5 → P2 → P2.5 → P6 → P7 → P7.5 → P8 → P9 → P10 (12 phases, serial)
**Side branches that merge into P6:** P3 (Tier 6 parts), P4→P5 (DL + GNN)
**v1.2 insertions (Round 4 closure):**
- **P0.5-COORD** between P0 and P1 — shared cognitive substrate (awareness adoption, reasoning trace ledger, blackboard, reasoning bridge, tribal runtime, neural-formula fusion, archive backfill, multi-agent dispatch)
- **P1.5-ONESHOT** between P1 and P2 — 12-stage pipeline spine closure (DWG/STEP AP242 PMI, AutoBridge WEDM branch, 5-controller post, wire-path collision, program verification, consultAwareness wiring)
- **P2.5-SAFETY** between P2 and P3 — runtime safety gates (S(x)≥0.70 hard-gate, AtomicValue+G20/G21, head-clearance wiring, flush adequacy, thermal release, controller-dialect verifier)

**v1.3 insertion (Round 5 Codex-frontend closure):**
- **P7.5-FE-GAPS** between P7 (M1–M7 UI parity) and P8 (FE-BE audit) — 6 frontend closures against R5 findings: WireEdmStudioPage drift gate, calculator wire_edm mode-switch hygiene, hardcoded `fanuc-wire-standard` removal, Print Drop bridge page WEDM routing leg, unified job-session store for mill→WEDM multi-op, 4 orphan WEDM-relevant API clients wired (feasibility, toolpath, cadGeometry, edmFeatures)

**Parallelizable pairs** (corrected after Agent 3 scrutiny + Round 4):
- (P3, P4) — independent side branches from P2.5
- (P5, P2 tail) — P5 can start once P2 first 3 sessions land, since remaining P2 units don't feed P5 inputs
- (P4 tail, P5 head) — P4 predictor layer MS-P4-DL-PRED can run concurrently with P5-GNN-01 graph-node construction (both read from WEDM_JOB_HISTORY)
- **(P0.5 sessions 2-3, P1 session 1)** — P0.5 trace ledger + blackboard are the only hard blockers; other coordination units can land in parallel with P1 formula closure

---

## 5. PHASE DECOMPOSITION (14 PHASES, 22 MILESTONES, 139 UNITS — v1.3 patched)

Each milestone follows the canonical `SMART CONFIG → KNOWLEDGE → INTENT → SKILLS → PLUGINS → MCP_LIFECYCLE → WORK(4-LOOP per unit) → FORGE-TRIPLE → EXIT GATE → FEATURE CASCADE` format.

---

### PHASE P0 — Verification Baseline (1 milestone, 4 units, 1 session)

**Purpose:** Replace stale claims with digest-verified counts. Zero new code.

#### MS-P0-V — Baseline Verification

```
SMART CONFIG: Role=Auditor | MODEL=sonnet | EFFORT=LOW | CONTEXT_BUDGET=15%
KNOWLEDGE:
  ENGINES: DispatcherInventoryEngine
  TRIBAL: mcp-server/audits/R0-P0/U04-skills-scripts-hooks-audit.md
  FORMULAS: —
  REFERENCE: PRISM-INVENTORY-2026-04-15.md, wedm_generate_digest.ts, WEDM_DIGEST.json,
             BASELINE_INVENTORY.json, CLAUDE.md AUTO-WEDM block
INTENT: Produce a single verified asset matrix. All downstream phases cite this file.
SKILLS: /health, /prism-review, /forge-audit
PLUGINS: Vitest MCP (dry run), ripgrep
MCP_LIFECYCLE: context_boot → dispatcher_map → memory_recall → system_snapshot
               → auto_checkpoint → memory_save → checkpoint_enhanced
```

- **U-P0-V01**: Run `wedm_generate_digest.ts` — update `data/state/WEDM_DIGEST.json`.
  - 4-LOOP: BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_CREATED: —
  - FILES_MODIFIED: `mcp-server/data/state/WEDM_DIGEST.json`
  - ABORT: script fails, or digest counts differ >5% from grep-verified counts
  - ROLLBACK: `git checkout mcp-server/data/state/WEDM_DIGEST.json`
  - EXIT (≥3 measurable):
    1. Digest file mtime > all `src/engines/WEDM*.ts` mtimes
    2. `jq '.engines.count' WEDM_DIGEST.json` returns 95 ±0
    3. `jq '.hooks.count' WEDM_DIGEST.json` returns 22 ±0
    4. Machinist-acceptance: "I can see exactly which engines exist right now"

- **U-P0-V02**: Reconcile CLAUDE.md AUTO-WEDM block counts — bump stale claims. Cross-check against `PRISM-INVENTORY-2026-04-15.md` platform figures.
  - FILES_MODIFIED: `CLAUDE.md`
  - ABORT: any cited platform figure mutated (only subset figures in AUTO-WEDM block may be edited)
  - ROLLBACK: `git checkout CLAUDE.md`
  - EXIT:
    1. `engines` line matches digest exactly
    2. `hooks` line matches digest exactly
    3. `state files` line matches digest exactly
    4. Platform counts referenced (not mutated) with file citation

- **U-P0-V04** (added post-Stage-10 per Cross-Roadmap scrutiny): Mark `CAMX-V17-P9` deprecated in `mcp-server/data/roadmap-index.json` — its 40 Tier-6 units are absorbed by MS-P3-TIER6A (14) + MS-P3-TIER6B (merged). Prevents concurrent-modification collisions across chat sessions.
  - FILES_MODIFIED: `mcp-server/data/roadmap-index.json`, `mcp-server/data/milestones/CAMX-V17-P9.json` (set `status: "DEPRECATED"`, add `superseded_by: ["MS-P3-TIER6A", "MS-P3-TIER6B"]`)
  - ABORT: any unit still owned by CAMX-V17-P9 that is NOT mapped to a P3 unit; OR roadmap-index.json Zod parse fails
  - ROLLBACK: `git checkout mcp-server/data/roadmap-index.json mcp-server/data/milestones/CAMX-V17-P9.json`
  - EXIT (≥ 3): (1) `jq '.milestones["CAMX-V17-P9"].status' roadmap-index.json` → `"DEPRECATED"`, (2) mapping table `{camx_unit_id, replacement_p3_unit_id}` written to `state/shared/CAMX-V17-P9-MIGRATION.md`, (3) `BASELINE_INVENTORY.json` re-verified and unchanged (no orphan milestones introduced)

- **U-P0-V03**: Write `WEDM_CONSOLIDATED_BASELINE.json` citing engine list, test count, skill list, hook list, action list, formula list, **plus per-engine dispatcher-wiring status** (orphan / wired / background). Use `DispatcherInventoryEngine` to walk `edmDispatcher.ts` imports.
  - FILES_CREATED: `mcp-server/data/state/WEDM_CONSOLIDATED_BASELINE.json`
  - ABORT: orphan ratio not computed, or schema fails Zod parse
  - ROLLBACK: `rm mcp-server/data/state/WEDM_CONSOLIDATED_BASELINE.json`
  - EXIT:
    1. File exists with `schemaVersion` ≥ 1
    2. Every 95 WEDM engine classified (`wired` | `orphan` | `background`)
    3. Orphan ratio reported as a percentage, compared to the platform-wide 70%
    4. All 61 `prism_edm` actions mapped to their engine(s)

**FORGE-TRIPLE:**
- Hook: `wedm-digest-freshness` (warns if `WEDM_DIGEST.json` mtime >7d old) — BUILT in U-P0-V03
- Action: `prism_edm:wedm_digest` — BUILT in U-P0-V03
- Skill: `/wedm-audit` — BUILT in U-P0-V03

**EXIT GATE:** ✓ digest current | ✓ CLAUDE.md counts accurate | ✓ baseline JSON committed | Ω ≥ 1.0 | SVI Δ +1 %
**FEATURE CASCADE:**
- `new_hooks`: [wedm-digest-freshness]
- `new_actions`: [prism_edm:wedm_digest]
- `new_skills`: [/wedm-audit]
- `available_to`: [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10]

---

### PHASE P1 — Close WEDM-100PCT (1 milestone, 4 units, 2 sessions)

**Purpose:** Finish the 4 remaining physics-first units so every parameter cites a published source or real JM Die program.

#### MS-P1-100PCT — Physics-First Completion

```
SMART CONFIG: Role=WireEDMPhysicist+Metrologist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=80%
KNOWLEDGE:
  ENGINES: EDMCuttingParamFlushEngine (1203 LOC), EDMMultiPassStrategyEngine (891 LOC),
           EDMProgramAssemblerEngine (1502 LOC), EDMMonitorSurfaceIntegrityEngine (612 LOC),
           WEDMPrintToProgramEngine (734 LOC), WireEDMSettingsEngine (452 LOC)
  FORMULAS: Klocke Ra (Ra ∝ W_e^0.33, Klocke 2013 *Manufacturing Processes 4*),
            DiBitonto crater (DiBitonto et al. 1989 *J. Appl. Phys.* 66(9):4095, cathode/anode partition),
            Kunieda pulse energy (Kunieda et al. 2005 *CIRP Annals*),
            Toenshoff cascade, Carslaw & Jaeger semi-infinite moving heat source
            (*Conduction of Heat in Solids*, 1959 §10.7),
            Sato et al. 1988 *Bull. JSPE* 22(3):162 WEDM speed law,
            Puri & Bhattacharyya 2003 WEDM Ra regression (Puertas & Luis 2003 is sinker-EDM — do NOT cross-apply),
            wire deflection δ = q·L²/(8·T) distributed OR δ = F·L/(4·T) midspan point, per Dauw & Snoeys 1986 CIRP Annals
  TRIBAL: WEDM tribal tips 46 (`wedm-knowledge-tips.ts`), Mitsubishi FA/MV control-room notes
  REFERENCE: ITW SHAKEPROOF, NOZE TEST, CHOCTAW DEFENSE, Box Drive 5-inch square,
             Lemhunter D2 feed curves, Mitsubishi FA catalog, Makino HYPER-i,
             Bedra / Berkenhoff / Shinko Kobelco wire spec sheets
INTENT: Replace every remaining synthetic parameter with a cited value. After this phase zero
  engine warns `synthetic_placeholder`.
SKILLS: /physics-verify, /prism-review, /test, /calibrate
PLUGINS: Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: context_boot → dispatcher_map → memory_recall → system_snapshot
               → action_search "wire EDM synthetic parameters" → auto_checkpoint
               → memory_save → checkpoint_enhanced
```

- **U-P1-01** (BUILD → SCRUTINIZE → GAP FILL → TIE UP): Replace WireEDMSettingsEngine synthetic wire-parameter table with citations to manufacturer wire spec sheets (Bedra, Berkenhoff, Shinko Kobelco). Convert `.compute()` returns to AtomicValue shape `{value, unit, uncertainty, source}`.
  - FILES_CREATED: `mcp-server/src/data/wire-spec-sheets.ts`
  - FILES_MODIFIED: `mcp-server/src/engines/WireEDMSettingsEngine.ts`
  - ABORT: `npx tsc --noEmit` returns > 0 errors; OR `atomic-value-gate` hook reports bare-number return; OR any cited wire row lacks PDF URL source; OR BASELINE_INVENTORY.json shows WEDM engine count drift > ±1
  - ROLLBACK: `git checkout mcp-server/src/engines/WireEDMSettingsEngine.ts && rm -f mcp-server/src/data/wire-spec-sheets.ts`
  - EXIT (≥ 5 measurable):
    1. `grep -rn "synthetic_placeholder" mcp-server/src/engines/WireEDMSettingsEngine.ts` → 0 hits
    2. At least 8 wire types cited with manufacturer + part number + PDF source (logged in `wire-spec-sheets.ts`)
    3. `npx vitest run mcp-server/src/__tests__/WireEDMSettingsEngine.test.ts` → all existing cases pass (≥ 10)
    4. New test: given BEDRA Zn-diffused 0.25 mm on M2 at 50 mm, `first_cut_speed_mm_per_min` matches Bedra catalog within ±10 % — `toBeCloseTo(5.8, 1)`-style assertion (NOT `toBeGreaterThan(0)`)
    5. `.compute()` returns pass AtomicValue Zod parse (confidence ≥ 0.8, source ≥ 2 citations)
    6. Machinist-acceptance: "every wire number I see traces to a real catalog PDF"
- **U-P1-02**: Fold `EDMEngine.ts` (294 LOC, 100 % synthetic) → mark deprecated, redirect all callers to `EDMProgramAssemblerEngine`.
  - 4-LOOP: BUILD (snapshot pre-fold outputs) → SCRUTINIZE (diff) → GAP FILL (bridge any missing API) → TIE UP
  - FILES_CREATED: `mcp-server/data/state/WEDM_FOLD_SNAPSHOT_DIFF.json`
  - FILES_MODIFIED: `src/engines/EDMEngine.ts` (deprecated shim), every caller import line
  - ABORT: any caller still imports `EDMEngine` without the shim; OR snapshot diff shows any non-bit-exact output on the 20 canonical input cases
  - ROLLBACK: `git checkout src/engines/EDMEngine.ts` and restore snapshot baseline
  - EXIT (≥ 4 measurable):
    1. `npx tsx scripts/wedm_snapshot_diff.ts EDMEngine` → `bit_exact: true` across 20 canonical inputs (recorded in `WEDM_FOLD_SNAPSHOT_DIFF.json`)
    2. `grep -rn "from.*EDMEngine" mcp-server/src | grep -v deprecated-shim | wc -l` → 0
    3. Shim file re-exports `EDMProgramAssemblerEngine` API surface (type signature equality)
    4. `npx vitest run mcp-server/src/__tests__/wedm-edm-engine.test.ts` → all pre-fold tests pass via shim
- **U-P1-03**: Fold `EDMParameterEngine.ts` → deprecated; callers redirect to `EDMCuttingParamFlushEngine`.
  - Same 4-LOOP + SNAPSHOT-DIFF protocol as U-P1-02 (append to same `WEDM_FOLD_SNAPSHOT_DIFF.json`).
  - EXIT (≥ 4): bit-exact on 20 canonical inputs, 0 grep hits outside shim, shim API parity, pre-fold tests pass.
- **U-P1-04**: Fold `EDMWireEngine.ts` → deprecated; callers redirect to `EDMMaterialMachineWireEngine`.
  - Same 4-LOOP + SNAPSHOT-DIFF protocol.
  - EXIT (≥ 4): bit-exact on 20 canonical inputs, 0 grep hits outside shim, shim API parity, pre-fold tests pass.

**FORGE-TRIPLE:**
- Hook: `wedm-synthetic-block` (blocks commits adding `synthetic_placeholder` string) — BUILT in U-P1-01
- Action: `prism_edm:wedm_citation_check` — BUILT in U-P1-01
- Skill: `/wedm-cite` — BUILT in U-P1-01

**EXIT GATE:**
- ✓ 0 grep hits for `synthetic_placeholder` across `mcp-server/src/engines/WEDM*.ts`, `EDM*.ts`, `WireEDM*.ts`
- ✓ 3 deprecated engines redirected, `WEDM_FOLD_SNAPSHOT_DIFF.json` shows bit-exact output
- ✓ 65+ WEDM tests pass (`npx vitest run mcp-server/src/__tests__/wedm-*.test.ts`)
- ✓ Machinist-acceptance: "every wire parameter I see is from Bedra / Berkenhoff / Shinko catalog"
- ✓ BASELINE_INVENTORY.json re-verified — WEDM engine count unchanged at 95 (shim added is not counted); test count +5
- Ω ≥ 1.0 | SVI Δ +2 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-synthetic-block]
- `new_actions`: [prism_edm:wedm_citation_check]
- `new_skills`: [/wedm-cite]
- `available_to`: [P2, P3, P4, P5, P6, P7, P8, P9, P10]  (all downstream; synthetic-block hook enforced phase-wide)

---

### PHASE P2 — Gap-Fill Hardening (1 milestone, 11 units, 5 sessions)

**Purpose:** Close the five production gaps from the 10-role scrutiny audit. 91 → 98 composite score.

#### MS-P2-GAPFILL — Production Hardening

Adopt `WEDM-GAPFILL-MS0.json` verbatim as MS-P2-GAPFILL. Unit IDs `U-WGAP01..U-WGAP11` remain canonical.

```
SMART CONFIG: Role=WireEDMProductionEngineer+SafetyOfficer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=75%
KNOWLEDGE:
  ENGINES: (see WEDM-GAPFILL-MS0.json knowledge_sources)
  FORMULAS: G-code unit conversion (25.4×), AWT retry backoff, STEP AP203/214 parser, IGES 5.3
  TRIBAL: JM Die imperial programs, JM Die wire-break logs
  REFERENCE: STEP / IGES spec, Mitsubishi / Sodick AWT manuals
INTENT: Production hardening — operator pre-flight, recoverable wire breaks, imperial G-code,
  machine scheduling awareness.
SKILLS: /wedm-preflight, /test, /program-validate
PLUGINS: Vitest MCP, ESLint MCP
MCP_LIFECYCLE: (canonical)
```

Session map:
- S1 (U-WGAP01-02): Imperial G-code across 5 controllers
- S2 (U-WGAP03-04): Wire break recovery (backup distance + restart markers)
- S3 (U-WGAP05-06): Machine queue awareness + reservation
- S4 (U-WGAP07-08): STEP + IGES import into P2P pipeline
- S5 (U-WGAP09-11): Pre-flight safety checklist + safety comments in G-code + 50-test suite

**FORGE-TRIPLE** (BUILT-ownership per Stage 7 table):
- Hook `wedm-production-gate` — BUILT in U-WGAP09
- Action `wedm_preflight_check` — BUILT in U-WGAP09
- Action `wedm_plan_break_recovery` — BUILT in U-WGAP03
- Action `wedm_reserve_machine` — BUILT in U-WGAP05
- Action `wedm_check_availability` — BUILT in U-WGAP06
- Skill `/wedm-preflight` — BUILT in U-WGAP09

**EXIT GATE:** ✓ score 98/100 | ✓ imperial output validated on JM Die FA-10S files | ✓ wire-break recovery tested against Sodick AWT retry | ✓ 50+ new tests | Ω ≥ 1.0 | SVI Δ +3 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-production-gate]
- `new_actions`: [wedm_preflight_check, wedm_plan_break_recovery, wedm_reserve_machine, wedm_check_availability]
- `new_skills`: [/wedm-preflight]
- `available_to`: [P3, P6, P7, P9, P10]

---

### PHASE P3 — CAMX Tier 6 Complex Parts (2 milestones, 14 units, 5 sessions)

**Purpose:** Prove WEDM on the hardest JM Die part families — progressive die, spline broach, PCD tooling. Replaces placeholder `CAMX-V17-P9` with concrete units.

#### MS-P3-TIER6A — Progressive Die + Multi-Slide

```
SMART CONFIG: Role=ProgressiveDieEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=80%
KNOWLEDGE:
  ENGINES: EDMMultiPassStrategyEngine, EDMWireSlugCornerTaperEngine, EDMProgramAssemblerEngine
  FORMULAS: stagger math for progressive die, slug management, corner compensation
  TRIBAL: JM Die progressive-die tips
  REFERENCE: JM Die programs H:/PRISM/JM DIE/CNC MILL HAAS/*progressive*, M2 punch validation suite
INTENT: Generate correct WEDM programs for 4-station progressive dies (pilot, blank, form, cut-off).
  Validate against at least 2 real JM Die programs within ±20 % NC-line count.
SKILLS: /wedm-program, /program-validate, /wedm-preflight
PLUGINS: Vitest MCP, codebase-memory-mcp
MCP_LIFECYCLE: (canonical)
```

Session split: 7 units across 2 sessions (U-P3-T6A-01..04, then U-P3-T6A-05..07 after /compact).

- **U-P3-T6A-01..07**: 7 progressive-die parts spanning 4-8 stations, D2 / M2 / S7 at 15-60 mm.
  - Each unit 4-LOOP: BUILD (generate) → SCRUTINIZE (compare to JM Die reference) → GAP FILL (align toolpath) → TIE UP (test + commit)
  - FILES_CREATED: per-part validation fixture under `mcp-server/src/__tests__/fixtures/wedm-tier6a-{part_id}.json`
  - FILES_MODIFIED: `mcp-server/src/engines/EDMMultiPassStrategyEngine.ts`, `mcp-server/src/engines/EDMWireSlugCornerTaperEngine.ts`, `mcp-server/src/engines/EDMProgramAssemblerEngine.ts`
  - ABORT: `npx tsc --noEmit` returns > 0 errors; OR `wedm-production-gate` pre-flight hook returns `safe: false`; OR toolpath-length-mm diverges > ±10 % from JM Die reference
  - ROLLBACK: `git checkout mcp-server/src/engines/EDMMultiPassStrategyEngine.ts mcp-server/src/engines/EDMWireSlugCornerTaperEngine.ts mcp-server/src/engines/EDMProgramAssemblerEngine.ts`
  - EXIT per unit (≥ 5 measurable):
    1. Program assembles without TS/Zod error
    2. JM Die reference program toolpath-length-mm matches within ±10 % (measured by `WEDMGCodePathLengthEngine`, NOT bare NC-line count — line count drifts with comment density)
    3. NC-line count within ±10 % as secondary (was ±20 %, now tightened)
    4. G-code contains expected structural tokens: `G41` or `G42` (wire-offset), `M00`/`M01` (safe stops), wire-thread markers per controller dialect — asserted via `toContain('G41')` style
    5. `wedm-tier6-geom-gate` hook passes (min_radius ≥ wire_dia + 2·gap)
    6. Machinist acceptance: "this program cuts the same pilot/blank/form/cut-off sequence we run on the real FA-10S for this die" — signed in `WEDM-TIER6-MACHINIST-SIGNOFF.md`

#### MS-P3-TIER6B — Spline Broach + PCD Tooling

```
SMART CONFIG: Role=PCDToolingEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=75%
KNOWLEDGE:
  ENGINES: WireEDMSettingsEngine, EDMProgramAssemblerEngine
  FORMULAS: modified thermal-conductivity k(T) interpolation for PCD per ASM Handbook Vol. 16 p. 317
            (Johnson-Cook is plasticity, NOT conductivity — do not cross-apply);
            internal-involute spline math (AGMA 2000-A88);
            anisotropic k for PCD via diamond-Co composite rule-of-mixtures (Field 1992)
  TRIBAL: broach tips, PCD lapping notes
  REFERENCE: WC/PCD wire-spec variants (Shinko), Berkenhoff molybdenum wire for PCD,
             ASM Handbook Vol. 16 *Machining* for PCD k(T), Field 1992 *Properties of Natural and Synthetic Diamond*
INTENT: Generate valid programs for spline broach (internal involute, WC carbide, ≤0.005 " OD)
  and PCD inserts.
SKILLS: /wedm-program, /program-validate, /wedm-preflight, /physics-verify, /test, /scope, /checkpoint
PLUGINS: Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: (canonical) + SESSION SPLIT: 7 units across 3 sessions
               SESSION 1: U-P3-T6B-01..02 (internal-involute spline geometry + test scaffolding)
               SESSION 2: U-P3-T6B-03..04 (WC carbide path + tight OD validation) — /compact checkpoint
               SESSION 3: U-P3-T6B-05..07 (PCD path + k(T) interpolation + regression)
```

- **U-P3-T6B-01..04**: Spline broach (internal involute profile, WC carbide, tight OD tolerance).
  - Each unit: 4-LOOP BUILD → SCRUTINIZE → GAP FILL → TIE UP
  - FILES_CREATED: engine-specific (see MS envelope)
  - FILES_MODIFIED: `src/engines/WireEDMSettingsEngine.ts`, `src/engines/EDMProgramAssemblerEngine.ts`
  - ABORT: `npx tsc --noEmit` returns > 0 errors; OR pre-flight hook returns `safe: false`; OR spline involute angular error > 0.02°
  - ROLLBACK: `git checkout src/engines/WireEDMSettingsEngine.ts src/engines/EDMProgramAssemblerEngine.ts`
  - EXIT (≥ 4): (1) program assembles without TS/Zod error, (2) JM Die reference program toolpath-length-mm matches ±10 % (tighter than Tier6A), (3) NC-line count ±10 %, (4) G-code contains expected structural tokens (`G41`/`G42` wire-offset, `M00`/`M01` safe-stops, wire-thread markers), (5) `wedm-tier6-geom-gate` passes, (6) machinist acceptance: "the program matches the validation reference to at least 90 %".
- **U-P3-T6B-05..07**: PCD tooling (polycrystalline diamond inserts — exotic-material path, requires thermal-conductivity k(T) interpolation per ASM Handbook Vol. 16 — NOT Johnson-Cook, which is plasticity).
  - Same 4-LOOP + 6-item EXIT as above, plus: (7) PCD k(T) interpolator returns within ±5 % of ASM published tabulated values for diamond-Co composite at 300–1200 K.

**MS-P3-TIER6B FORGE-TRIPLE:**
- Hook `wedm-pcd-conductivity-gate` (blocks commits where PCD path returns conductivity via Johnson-Cook instead of k(T) interp) — BUILT in U-P3-T6B-05
- Action `prism_edm:wedm_validate_pcd` — BUILT in U-P3-T6B-05
- Skill `/wedm-pcd` — BUILT in U-P3-T6B-05

**FORGE-TRIPLE:**
- Hook `wedm-tier6-geom-gate` (blocks if `min_radius < wire_dia + 2·gap`) — BUILT in U-P3-T6A-01
- Action `prism_edm:wedm_validate_tier6` — BUILT in U-P3-T6A-01
- Skill `/wedm-tier6` — BUILT in U-P3-T6A-01

**EXIT GATE:** ✓ 14 / 14 Tier 6 parts generate without error | ✓ ≥ 2 programs match JM Die real toolpath-length-mm within ±10 % (and NC-line count ±10 %) | ✓ PCD path uses ASM Handbook Vol. 16 k(T) interpolation (NOT Johnson-Cook) | ✓ machinist sign-off file committed | Ω ≥ 1.0 | SVI Δ +3 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-tier6-geom-gate]
- `new_actions`: [prism_edm:wedm_validate_tier6]
- `new_skills`: [/wedm-tier6]
- `available_to`: [P6, P7, P10]

---

### PHASE P4 — Deep-Learning Substrate (2 milestones, 9 units, 4 sessions)

**Purpose:** Give the WEDM stack the ability to **learn from shop outcomes**. This is where the system graduates from deterministic physics to adaptive near-AGI.

#### MS-P4-DL-CORE — On-Device Learning Infrastructure

```
SMART CONFIG: Role=MLEngineer+WireEDMPhysicist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=80%
KNOWLEDGE:
  ENGINES: WEDMDegradationModelEngine, WEDMRULEngine,
           PRISMCreativeReasoningEngine, CrossDisciplinaryDeepLearningEngine,
           sona-learning-optimizer agent, WEDM_RL_POLICY v1 state snapshot (LinUCB bandit)
           — LOC figures omitted; verify with `wc -l` before citing.
  FORMULAS: LoRA rank-4 adapters (Hu 2021), EWC++ Fisher information (Chaudhry 2018),
            ridge-regression posterior update, LinUCB bandit (existing WEDM_RL_POLICY v1)
  TRIBAL: — (new substrate)
  REFERENCE: WEDM_JOB_HISTORY.json schema v1 (to be created in U-P4-DL-01)
INTENT: Every finished WEDM job feeds a learning loop. Wire-break-rate predictor, Ra predictor,
  recast-depth predictor improve job-over-job without catastrophic forgetting.
SKILLS: /forge-engines, /test, /physics-verify, /scope
PLUGINS: Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: (canonical)
```

Session split: 5 units across 2 sessions.
SESSION 1: U-P4-DL-01..03 (job outcome + LoRA + EWC) — /compact checkpoint after U-P4-DL-03
SESSION 2: U-P4-DL-04..05 (few-shot + tests)

- **U-P4-DL-01**: `WEDMJobOutcomeEngine` — capture finished-job telemetry (actual Ra, actual wire-breaks, actual cycle time) into `data/state/WEDM_JOB_HISTORY.json` schema v1.
  - FILES_CREATED: `mcp-server/src/engines/WEDMJobOutcomeEngine.ts`, `mcp-server/data/state/WEDM_JOB_HISTORY.json`, `mcp-server/src/schemas/wedmJobHistorySchema.ts`
  - FILES_MODIFIED: `mcp-server/src/tools/dispatchers/edmDispatcher.ts` (wire `wedm_learn_from_job`)
  - ABORT: `npx tsc --noEmit` returns > 0 errors; OR Zod schema rejects recorded job; OR BASELINE_INVENTORY WEDM engine count not bumped by +1
  - ROLLBACK: `git checkout mcp-server/src/engines/WEDMJobOutcomeEngine.ts mcp-server/src/tools/dispatchers/edmDispatcher.ts && rm mcp-server/data/state/WEDM_JOB_HISTORY.json`
  - EXIT (≥ 4): (1) 10 synthetic jobs record+replay bit-exact, (2) schema Zod-parses, (3) dispatcher action surfaces, (4) test: `WEDMJobOutcomeEngine.test.ts` ≥ 10 cases incl. zero/negative/extreme cycle times
- **U-P4-DL-02**: `WEDMLoRAAdapterEngine` — rank-4 low-rank adapters on top of Klocke / DiBitonto base models.
  - FILES_CREATED: `mcp-server/src/engines/WEDMLoRAAdapterEngine.ts`, `mcp-server/data/state/WEDM_LORA_WEIGHTS.json`
  - ABORT: forward-pass output deviates > 1 % from reference LoRA paper (Hu 2021) on paper test vector; OR rank ≠ 4
  - ROLLBACK: `git checkout mcp-server/src/engines/WEDMLoRAAdapterEngine.ts && rm mcp-server/data/state/WEDM_LORA_WEIGHTS.json`
  - EXIT (≥ 4): (1) forward-pass matches Hu 2021 §4.1 reference vector ±1 %, (2) backward-pass gradient matches autodiff numerical check ±0.5 %, (3) weights serialise + reload bit-exact, (4) Klocke base output unchanged when adapter scale = 0
- **U-P4-DL-03**: `WEDMEWCMemoryEngine` — EWC++ with Fisher-information penalty.
  - FILES_CREATED: `mcp-server/src/engines/WEDMEWCMemoryEngine.ts`
  - ABORT: Fisher-info diagonal not computed per Chaudhry 2018 §3.2; OR λ schedule fabricated
  - EXIT (≥ 4): (1) λ schedule matches Chaudhry 2018 Table 1, (2) after 3 material batches old material MAE regresses ≤ 10 %, (3) test: WEDMEWCMemoryEngine.test.ts ≥ 10 cases, (4) dispatcher-wiring gate green
- **U-P4-DL-04**: `WEDMFewShotMaterialEngine` — given 3-5 successful jobs in a new material, bootstrap an adapter.
  - ABORT: MAE on nearby thickness > base-model MAE on same thickness
  - EXIT (≥ 3): (1) 3-job bootstrap on D2 improves Ra MAE ≥ 20 % vs base, (2) test: ≥ 10 cases incl. degenerate (1-job) fallback, (3) wiring green
- **U-P4-DL-05**: **18+ tests** covering: LoRA forward / backward math (±1 % of reference paper), EWC gradient penalty (published λ schedule), few-shot 3-job bootstrap (verify MAE drop), catastrophic-forgetting regression (old material MAE after new material train).
  - ABORT: any test uses `.toBeGreaterThan(0)` / `.toBeLessThan(1000)` / bare `.includes()` — `banned-pattern-block` hook will reject
  - EXIT: 18+ assertions, 0 banned patterns, coverage ≥ 90 % on WEDMLoRA/EWC/FewShot

#### MS-P4-DL-PRED — Predictor Layer

Session split: 4 units in 2 sessions.
SESSION 1: U-P4-PR-01..02 (Ra + wire-break predictors)
SESSION 2: U-P4-PR-03..04 (recast + tests)

- **U-P4-PR-01**: `WEDMRaPredictorEngine` — Klocke baseline + LoRA correction + material embedding (precursor to P5 GNN).
  - FILES_CREATED: `mcp-server/src/engines/WEDMRaPredictorEngine.ts`
  - ABORT: predicted Ra returns bare number (not AtomicValue); OR MAE vs 30 JM Die jobs > ±10 %; OR wedm-predictor-mae-gate hook rejects
  - EXIT (≥ 4): (1) Klocke base preserved when adapter off, (2) MAE ≤ ±10 % on 30 held-out JM Die Ra measurements, (3) AtomicValue shape passes Zod, (4) test ≥ 10 cases
- **U-P4-PR-02**: `WEDMWireBreakPredictorEngine` — existing EDMCuttingParamFlushEngine wire-break model + LoRA historical correction.
  - Same 4-LOOP + structure. EXIT (≥ 4): (1) Brier score ≤ 0.15 on 20 held-out jobs, (2) calibration curve within ±10 % ideal diagonal, (3) AtomicValue shape, (4) test ≥ 10 cases
- **U-P4-PR-03**: `WEDMRecastDepthPredictorEngine` — Carslaw & Jaeger + LoRA + recent-job adjustment.
  - EXIT (≥ 4): (1) matches Carslaw & Jaeger §10.7 closed form on synthetic inputs ±2 %, (2) MAE ≤ ±15 % on published recast-depth data, (3) AtomicValue, (4) test ≥ 10 cases
- **U-P4-PR-04**: **16+ tests** for the three predictors including residual-error-bound checks (MAE vs JM Die Real-job Ra within ±10 %).
  - EXIT: 16+ assertions, 0 banned patterns, all MAE bounds use `.toBeCloseTo(published, N)` form

**MS-P4-DL-PRED FORGE-TRIPLE:**
- Hook `wedm-predictor-mae-gate` (blocks commits where any predictor MAE exceeds ±10 % on held-out JM Die set) — BUILT in U-P4-PR-01
- Action `prism_edm:wedm_predict_ra` — BUILT in U-P4-PR-01
- Skill `/wedm-predict` — BUILT in U-P4-PR-04

**FORGE-TRIPLE:**
- Hook `wedm-learning-freshness` (warns if no job logged >72 h) — BUILT in U-P4-DL-01
- Action `prism_edm:wedm_learn_from_job` — BUILT in U-P4-DL-01
- Skill `/wedm-learn` — BUILT in U-P4-DL-01

**EXIT GATE:**
- ✓ 3 predictors operational (Ra, WireBreak, Recast)
- ✓ LoRA adapter loads/saves from `data/state/WEDM_LORA_WEIGHTS.json` bit-exact across reload
- ✓ EWC prevents > 10 % regression on old material after new one is learned
- ✓ few-shot bootstrap hits ≥ 20 % Ra MAE reduction over base
- ✓ Machinist-acceptance: "after feeding 5 D2 jobs, the Ra prediction matches what I actually get"
- ✓ BASELINE_INVENTORY.json re-verified — WEDM engine count bumped by +7 exactly
- ✓ `banned-pattern-block` reports 0 violations across new tests
- Ω ≥ 1.0 | SVI Δ +4 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-learning-freshness]
- `new_actions`: [prism_edm:wedm_learn_from_job]
- `new_skills`: [/wedm-learn]
- `available_to`: [P5, P6, P9, P10]

---

### PHASE P5 — Graph-Neural Reasoning Lattice (1 milestone, 6 units, 3 sessions)

**Purpose:** Replace pairwise lookup tables with a **queryable embedding** over the material × machine × wire × thickness × Ra lattice. Every engine that currently calls `lookupCondition(mat, mach, wire, th)` can instead query `wedmEmbedding.nearestNeighbor({mat, mach, wire, th}, k=5)` in O(log n) post-build.

#### MS-P5-GNN — Embedding Graph

```
SMART CONFIG: Role=AIEngineer+GraphDBSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  ENGINES: MaterialRegistry (6,372 materials), MachineRegistry (910),
           wedm-published-conditions.ts (26), WEDM_JOB_HISTORY.json (from P4)
  FORMULAS: multi-head graph attention h=4, LayerNorm, cosine similarity retrieval,
            HNSW index for O(log n) neighbor search
  TRIBAL: sublinear solvers (already available in repo for k-hop propagation)
  REFERENCE: HNSW paper (Malkov 2018), GAT paper (Veličković 2017)
INTENT: A single 64-dim embedding per (mat, mach, wire, th, Ra) node. Queries return k-nearest
  nodes with their observed outcomes. Inference cost: ≤5 ms p99.
SKILLS: /forge-engines, /test, /wedm-reason, /scope, /checkpoint  (note: /graph-neighbor does not exist — use /wedm-reason built in U-P5-GNN-05)
PLUGINS: Vitest MCP, codebase-memory-mcp
MCP_LIFECYCLE: (canonical) + SESSION SPLIT: 6 units across 3 sessions
               SESSION 1: U-P5-GNN-01..02 (graph + attention) — /compact checkpoint
               SESSION 2: U-P5-GNN-03..04 (HNSW + predictor hookup) — /compact checkpoint
               SESSION 3: U-P5-GNN-05..06 (explain + tests)
```

- **U-P5-GNN-01**: `WEDMLatticeGraphEngine` — build node set from registries + historical jobs. Schema v1: `{nodes: [{id, mat, mach, wire, th, ra_target, embedding: [f32;64]}], edges: [{src, dst, weight, evidence}]}`.
  - FILES_CREATED: `mcp-server/src/engines/WEDMLatticeGraphEngine.ts`, `mcp-server/src/schemas/wedmLatticeGraphSchema.ts`, `mcp-server/data/state/WEDM_LATTICE_GRAPH.json`
  - ABORT: `npx tsc --noEmit` > 0 errors; OR < 300 nodes produced; OR Zod parse fails; OR BASELINE_INVENTORY not bumped
  - ROLLBACK: `git checkout mcp-server/src/engines/WEDMLatticeGraphEngine.ts && rm -f mcp-server/data/state/WEDM_LATTICE_GRAPH.json`
  - EXIT (≥ 4): (1) ≥ 300 nodes, (2) Zod parse passes, (3) adjacency sparsity < 5 % (avoid dense false positives), (4) test ≥ 10 cases
- **U-P5-GNN-02**: `WEDMGraphAttentionEngine` — h=4 multi-head attention layer. Pre-trained offline from `WEDM_JOB_HISTORY` + published data. Weights serialised to `data/state/WEDM_GNN_WEIGHTS.json`.
- **U-P5-GNN-03**: `WEDMNeighborQueryEngine` — HNSW index. `nearestNeighbor(query, k)` returns top-k with outcomes. Used by Ra, wire-break, recast predictors.
- **U-P5-GNN-04**: Wire predictor engines (from P4) to consult graph neighbors as prior.
- **U-P5-GNN-05**: `WEDMReasoningExplainEngine` — explain why a given prediction was made ("this parameter matches Node #1447 which succeeded at Ra 0.6 µm on similar D2 / 50 mm geometry").
- **U-P5-GNN-06**: **14+ tests** including neighbor-retrieval correctness (exact match on planted synthetic node), attention-head diversity (avg cosine < 0.8), prediction-prior integration (Ra MAE drops ≥ 8 % over P4 alone).

**FORGE-TRIPLE:**
- Hook `wedm-gnn-rebuild-stale` (warns if weights > 7 d and > 50 jobs logged since) — BUILT in U-P5-GNN-02
- Action `prism_edm:wedm_graph_query` — BUILT in U-P5-GNN-03
- Skill `/wedm-reason` — BUILT in U-P5-GNN-05

**EXIT GATE:**
- ✓ 64-dim embeddings for ≥ 300 nodes (Zod-parsed from `WEDM_LATTICE_GRAPH.json`)
- ✓ HNSW query < 5 ms p99 (measured across 1,000 synthetic queries, logged to `WEDM_GNN_BENCH.json`)
- ✓ Explanation engine cites a real node for every prediction (`wedm-xai-required` hook green on 20 test predictions)
- ✓ Ra MAE improvement vs P4 alone ≥ +8 % on 30 held-out JM Die jobs
- ✓ Machinist acceptance: "the system shows me similar past jobs before suggesting new parameters"
- ✓ BASELINE_INVENTORY.json re-verified — WEDM engine count bumped by +5 exactly
- Ω ≥ 1.0 | SVI Δ +3 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-gnn-rebuild-stale]
- `new_actions`: [prism_edm:wedm_graph_query]
- `new_skills`: [/wedm-reason]
- `available_to`: [P6, P9, P10]

---

### PHASE P6 — 30-Part Validation + Regression Suite (1 milestone, 8 units, 3 sessions)

**Purpose:** Production-readiness proof. Pulls WEDM-UNIFIED M6 forward because it depends on both physics (P1-P2) and learning (P4-P5) being in place.

#### MS-P6-VAL30 — 30-Part Validation

Adopt `WEDM-UNIFIED` milestone M6 verbatim (U-WEVA01..U-WEVA08) with two augmentations:
- Each validated part now produces a `WEDM_JOB_HISTORY` entry → feeds P4 LoRA.
- Each failure triggers P5 explanation engine to surface the nearest-neighbor precedent.

```
SMART CONFIG: Role=WireEDMValidationEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE: (inherited from P1-P5) + WEDM-UNIFIED M6 validation set (30 parts)
INTENT: 27/30 (≥ 90 %) correct programs; each one produces a job-history entry that retrains.
SKILLS: /wedm-preflight, /wedm-cite, /wedm-learn, /wedm-reason, /physics-verify, /test, /scope, /checkpoint
PLUGINS: Vitest MCP, ESLint MCP
MCP_LIFECYCLE: (canonical) + SESSION SPLIT: 8 units across 3 sessions
               SESSION 1: U-WEVA01..03 (first 10 parts)
               SESSION 2: U-WEVA04..06 (next 10 parts) — /compact checkpoint between
               SESSION 3: U-WEVA07..08 (last 10 parts + regression lock)
```

**FORGE-TRIPLE:**
- Hook `wedm-production-gate` — CONSUMED from MS-P2-GAPFILL
- Action `wedm_verify_quality` — BUILT in U-WEVA01 (this roadmap takes BUILD ownership — prior envelope only DECLARED)
- Skill `/wedm-validate` — BUILT in U-WEVA08 (this roadmap takes BUILD ownership — prior envelope only DECLARED)

**EXIT GATE:**
- ✓ 27 / 30 (≥ 90 %) correct
- ✓ WEDM_JOB_HISTORY ≥ 30 entries
- ✓ Regression suite locked into CI
- ✓ Production readiness ≥ 85
- ✓ Ω ≥ 1.0 | SVI Δ +4 %

**FEATURE CASCADE:**
- `new_hooks`: [] (consumed only)
- `new_actions`: []
- `new_skills`: []
- `available_to`: [P7, P9, P10]

---

### PHASE P7 — Frontend Parity (WEDM-UNIFIED M1-M5, M7) (6 milestones, 26 units, 11 sessions)

**Purpose:** Close G6 — give Wire EDM the same upload→results UX the lathe has. This is the **user-visible payoff** of all prior backend work.

Adopt `WEDM-UNIFIED-ROADMAP.md` milestones M1, M2, M3, M4, M5, M7 verbatim as MS-P7-UI-M1..M5, M7. M6 (validation) was pulled into P6.

| Milestone | Units | Sessions | Source |
|-----------|-------|----------|--------|
| MS-P7-UI-M1 Upload + Results pages | 6 | 2 | WEDM-UNIFIED M1 |
| MS-P7-UI-M2 Feature editor wire mode | 4 | 1 | WEDM-UNIFIED M2 |
| MS-P7-UI-M3 Studio wizard integration | 4 | 1 | WEDM-UNIFIED M3 |
| MS-P7-UI-M4 Shop profile wire EDM | 4 | 1 | WEDM-UNIFIED M4 |
| MS-P7-UI-M5 Enhanced calculator panels | 6 | 2 | WEDM-UNIFIED M5 |
| MS-P7-UI-M7 Lathe backport (shared components) | 6 | 2 | WEDM-UNIFIED M7 |

```
SMART CONFIG: Role=UIEngineer+WireEDMSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  ENGINES: (backend consumed only — see each MX envelope)
  FRONTEND: web/src/pages/LatheUploadPage.tsx (pattern),
            web/src/pages/WireEdmResultsPage.tsx (existing), Codex-built app shell
  TRIBAL: WEDM-UNIFIED frontend tips
  REFERENCE: WEDM-UNIFIED-ROADMAP M1-M5+M7 envelopes
INTENT: User-visible parity — a machinist uploading a DXF gets the same results surface the lathe does.
SKILLS: /forge-wiring, /test, /prism-review, /scope
PLUGINS: Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: (canonical)
```

All FORGE-TRIPLE entries **CONSUMED from WEDM-UNIFIED** (existing envelopes own build):
- `wedm-output-gate`, `wedm-feature-validate`, `wedm-machine-limits-gate`, `wedm-feasibility-gate`, `unified-results-gate` — CONSUMED from WEDM-UNIFIED-MS1..M7
- Routing hook `lathe-backport-parity` — CONSUMED from WEDM-UNIFIED-M7 (lathe backport)
- React components `WireEdmUploadPage`, `WireEdmResultsPage`, `WireEdmStudioPage`, `WireEdmWizardPage` — CONSUMED from WEDM-UNIFIED-M1..M3

**Phase-level EXIT GATE:** ✓ upload→results composite score ≥ 90 % | ✓ lathe backport applied | ✓ `WEDM_FE_BE_COVERAGE.json` hit-ratio ≥ 75 % for prism_edm actions | Ω ≥ 1.0 | SVI cumulative Δ +10 %

**FEATURE CASCADE:**
- `new_hooks`: []   (all consumed from WEDM-UNIFIED)
- `new_actions`: []
- `new_skills`: []
- `available_to`: [P8, P9, P10]

---

### PHASE P8 — Frontend ↔ Backend Gap Audit (1 milestone, 5 units, 2 sessions)

**Purpose:** Close G7 — honest audit of what the Codex-built frontend exposes vs what the backend now supports after P1-P7.

#### MS-P8-FEBE — Surface Audit

```
SMART CONFIG: Role=SystemAuditor+ProductEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  FRONTEND: web/src/ (pages, components, routes) + mcp-server/web/src/
  BACKEND: 61 prism_edm dispatcher actions, 95 engines, 14 formulas, 22 hooks
  TOOLS: DispatcherInventoryEngine, grep + ripgrep over web/src, R0-P0 U04 audit format
INTENT: Produce a matrix — for every prism_edm action, is there a frontend path that calls it?
  For every frontend component, does it call a real action or is it orphan?
  For every engine capability, is there a UI surface?
SKILLS: /forge-audit, /prism-review, /scope
PLUGINS: Vitest MCP, codebase-memory-mcp, ripgrep, ESLint MCP
MCP_LIFECYCLE: (canonical)
```

- **U-P8-FEBE-01**: `WEDMDispatcherCoverageEngine` — walk `edmDispatcher.ts`, grep every action name across `web/src`. Output coverage matrix to `state/shared/WEDM_FE_BE_COVERAGE.json`.
  - EXIT (≥3): (1) JSON lists each action with `{frontend_callers, backend_tests, orphan, missing_ui}` (2) 100 % of 61 actions classified (3) coverage matrix reconciles with digest
- **U-P8-FEBE-02**: `WEDMComponentReachabilityEngine` — walk `web/src/**/*.tsx`, collect every `fetch("/api/v1/edm/...")`. Ensure each endpoint resolves to a live route.
  - EXIT: report file `WEDM_FE_REACHABILITY.md` with red/green per component; zero orphans.
- **U-P8-FEBE-03**: Identify top-10 backend capabilities with no UI (e.g. `wedm_plan_break_recovery` from P2 has no UI surface yet).
  - EXIT: ordered list with effort estimate.
- **U-P8-FEBE-04**: Identify top-10 frontend paths that mock or simulate backend (violates "no mock data" rule).
  - EXIT: list with file path + line number.
- **U-P8-FEBE-05**: Write `WEDM-FE-BE-AUDIT-2026-04.md` in the same format as `mcp-server/audits/R0-P0/U04-skills-scripts-hooks-audit.md`. Severity-tagged findings, reconciliation table, recommendations.
  - EXIT: audit file committed.

**FORGE-TRIPLE:**
- Hook `wedm-febe-drift-watch` (warns if new dispatcher action lands with no frontend caller within 7 d) — BUILT in U-P8-FEBE-01
- Action `prism_edm:wedm_audit_febe` — BUILT in U-P8-FEBE-05
- Skill `/wedm-febe-audit` — BUILT in U-P8-FEBE-05

**EXIT GATE:** ✓ coverage matrix has 100 % of 61 actions categorised | ✓ reachability report committed | ✓ top-10 gaps each side enumerated with effort | Ω ≥ 1.0 | SVI Δ +1 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-febe-drift-watch]
- `new_actions`: [prism_edm:wedm_audit_febe]
- `new_skills`: [/wedm-febe-audit]
- `available_to`: [P9, P10]

---

### PHASE P9 — Frontend Wiring + Meta-Learning Integration (3 milestones, 14 units, 6 sessions)

**Purpose:** Wire the top-10 gaps surfaced in P8 into the Codex-built PRISM app. Simultaneously expose the P4/P5 learning loop so operators can see *why* a prediction was made and correct it.

#### MS-P9-WIRE — Top-10 Action Wiring

```
SMART CONFIG: Role=UIEngineer+WireEDMSpecialist | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  INPUT: WEDM_FE_BE_COVERAGE.json top-10 missing_ui list
  PATTERN: existing LatheUploadPage, WireEdmResultsPage
  AUDIT: WEDM-FE-BE-AUDIT-2026-04.md action list
INTENT: Every backend capability has a UI path. Every UI action hits real backend.
SKILLS: /forge-wiring, /test, /scope
PLUGINS: Vitest MCP, ESLint MCP, codebase-memory-mcp
MCP_LIFECYCLE: (canonical)
```

Session split: 10 units across 4 sessions (3,3,2,2) — /compact checkpoint after unit 3, 6, 8.

- **U-P9-WIRE-01..05**: Wire actions 1-5 of the top-10 missing_ui list (order ascending by effort).
  - Each unit 4-LOOP: BUILD (React component + route) → SCRUTINIZE (reachability test) → GAP FILL (missing loading/error states) → TIE UP (E2E test)
  - FILES_CREATED: component file `mcp-server/web/src/components/wedm/<Action>Panel.tsx`, route entry in `mcp-server/web/src/routes/wedm.tsx`, E2E test `mcp-server/web/src/__tests__/<Action>Panel.test.tsx`
  - FILES_MODIFIED: `mcp-server/web/src/pages/WireEdmStudioPage.tsx`, `mcp-server/web/src/api/wedmClient.ts`
  - ABORT: `npx tsc --noEmit` returns > 0 errors; OR `npx vitest run web/src/__tests__` fails; OR component mocks backend (violates "no mock data" rule); OR `wedm-febe-drift-watch` hook fires
  - ROLLBACK: `git checkout mcp-server/web/src/components/wedm mcp-server/web/src/pages/WireEdmStudioPage.tsx mcp-server/web/src/api/wedmClient.ts`
  - EXIT per unit (≥ 4): (1) component renders without console errors under `vitest --environment jsdom`, (2) E2E test posts to real dispatcher action and receives Zod-valid response, (3) component meets accessibility AA (role + aria-label assertions), (4) backend action shows in `WEDM_FE_BE_COVERAGE.json` as `frontend_callers ≥ 1`
- **U-P9-WIRE-06..10**: Wire actions 6-10 (same 4-LOOP + EXIT structure).

**MS-P9-WIRE FORGE-TRIPLE:**
- Hook `wedm-ui-mock-block` (PostToolUse on any file under `web/src/components/wedm/**` — blocks mock constants like `MOCK_DATA`, `simulateBackend`, `fakePromise`) — BUILT in U-P9-WIRE-01
- Action `prism_edm:wedm_ui_action_ping` (lightweight liveness probe that frontend panels call before rendering) — BUILT in U-P9-WIRE-01
- Skill `/wedm-wire` — BUILT in U-P9-WIRE-10

#### MS-P9-XAI — Explainability Surface

```
SMART CONFIG: Role=UIEngineer+AIEngineer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=70%
KNOWLEDGE:
  ENGINES: WEDMReasoningExplainEngine (P5), WEDMLoRAAdapterEngine (P4), WEDMJobOutcomeEngine (P4)
INTENT: Operator sees WHY a prediction was made and can correct it — the system learns from the correction.
SKILLS: /forge-wiring, /wedm-explain, /wedm-feedback, /test
PLUGINS: Vitest MCP, ESLint MCP
MCP_LIFECYCLE: (canonical)
```

- **U-P9-XAI-01**: `WEDMExplainPanel` React component — shows "this prediction is based on Node #X (evidence programs: A, B, C)". Hooks into P5 WEDMReasoningExplainEngine.
- **U-P9-XAI-02**: `WEDMJobFeedbackPanel` — post-job, the operator enters actual cycle time, Ra, wire breaks → POSTs to `prism_edm:wedm_learn_from_job`.
- **U-P9-XAI-03**: `WEDMConfidenceScorePanel` — surfaces the rolling 30-job confidence and the LoRA correction magnitude. If correction > 20 % the UI flags "model drift — review".

#### MS-P9-INT — Integration Tests

- **U-P9-INT-01**: **20+ integration tests** across the wired paths. Includes a real-backend E2E that uploads a DXF, runs the full pipeline, logs the job, and retrains LoRA — all in CI.
  - FILES_CREATED: `mcp-server/src/__tests__/wedm-e2e-integration.test.ts`, CI job `.github/workflows/wedm-e2e.yml`
  - ABORT: any test uses banned patterns (`toBeGreaterThan(0)`, bare `.includes()`, mocked backend); OR E2E latency > 90 s; OR CI flake rate > 5 %
  - ROLLBACK: `git checkout mcp-server/src/__tests__/wedm-e2e-integration.test.ts .github/workflows/wedm-e2e.yml`
  - EXIT (≥ 5): (1) ≥ 20 assertions, (2) real DXF round-trip succeeds, (3) job logged + LoRA retrained + weights diff verified, (4) CI passes 3 consecutive runs, (5) `banned-pattern-block` reports 0 violations

**MS-P9-INT FORGE-TRIPLE:**
- Hook `wedm-e2e-ci-gate` (blocks merge if WEDM E2E suite skipped or flaky) — BUILT in U-P9-INT-01
- Action `prism_edm:wedm_e2e_report` — BUILT in U-P9-INT-01
- Skill `/wedm-e2e` — BUILT in U-P9-INT-01

**MS-P9-XAI FORGE-TRIPLE:**
- Hook `wedm-xai-required` (blocks any prediction UI that does not call Explain engine) — BUILT in U-P9-XAI-01
- Action `prism_edm:wedm_explain_prediction` — BUILT in U-P9-XAI-01
- Action `prism_edm:wedm_drift_report` — BUILT in U-P9-XAI-03
- Skill `/wedm-explain` — BUILT in U-P9-XAI-01
- Skill `/wedm-feedback` — BUILT in U-P9-XAI-02
- Action `prism_edm:wedm_learn_from_job` — CONSUMED from MS-P4-DL-CORE

**EXIT GATE (aggregate of MS-P9-WIRE + MS-P9-XAI + MS-P9-INT):**
- ✓ top-10 gaps wired (WEDM_FE_BE_COVERAGE shows `frontend_callers ≥ 1` for all 10)
- ✓ 0 components mock backend (`wedm-ui-mock-block` hook reports clean)
- ✓ explanation panel live on every predictor output
- ✓ feedback panel persists to WEDM_JOB_HISTORY
- ✓ drift panel surfaces LoRA correction
- ✓ 20+ integration tests pass 3 consecutive CI runs
- ✓ Ω ≥ 1.0 | SVI Δ +3 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-ui-mock-block, wedm-xai-required, wedm-e2e-ci-gate]
- `new_actions`: [prism_edm:wedm_ui_action_ping, prism_edm:wedm_explain_prediction, prism_edm:wedm_drift_report, prism_edm:wedm_e2e_report]
- `new_skills`: [/wedm-wire, /wedm-explain, /wedm-feedback, /wedm-e2e]
- `available_to`: [P10]

---

### PHASE P10 — V2 LAUNCH GATE (1 milestone, 6 units, 2 sessions)

**Purpose:** Second production launch — a system that learns, reasons, and explains; not just generates. This is where "near-AGI" becomes defensible rather than aspirational.

#### MS-P10-V2LAUNCH — Consolidated Launch

```
SMART CONFIG: Role=LaunchEngineer+SafetyOfficer | MODEL=opus | EFFORT=MAX | CONTEXT_BUDGET=80%
KNOWLEDGE:
  ENGINES: WEDMLaunchGateEngine (new, this milestone), all prior exit gates
  FORMULAS: S(x) rolling 30-job aggregation
  TRIBAL: V1 launch precedent, JM Die launch checklist
  REFERENCE: WEDM-LAUNCH-MS0.json (9/9 done), all prior phase exit gates,
             mcp-server/audits/R0-P0/U04-skills-scripts-hooks-audit.md (format)
INTENT: Ship a system that a machinist, sales engineer, and safety officer can all sign off on.
  V2 = narrow-but-deep → broader-and-still-deep.
SKILLS: /health, /prism-review, /forge-triple, /test, /wedm-audit, /wedm-cite, /wedm-tier6,
        /wedm-learn, /wedm-reason, /wedm-febe-audit, /wedm-explain, /physics-verify, /scope, /checkpoint
PLUGINS: Vitest MCP, ESLint MCP
MCP_LIFECYCLE: (canonical) + SESSION SPLIT: 6 units across 2 sessions
               SESSION 1: U-P10-V2-01..03 (scope/pricing/demo docs) — /compact checkpoint
               SESSION 2: U-P10-V2-04..06 (smoke test, launch gate engine, sign-off)
```

- **U-P10-V2-01**: Write `WEDM-V2-SCOPE.md` — honest capability statement (5 controllers, Tier 1-6 parts, learning loop, explanation).
- **U-P10-V2-02**: Write `WEDM-V2-PRICING.md` — pricing-tier update reflecting learning loop + Tier 6 + multi-controller.
- **U-P10-V2-03**: Write `WEDM-V2-DEMO.md` — 5-minute walkthrough including an end-to-end "correct the prediction" feedback loop.
- **U-P10-V2-04**: Run the 20-case launch smoke test (5 V1 cases + 5 Tier 6 + 5 multi-controller + 5 learning-loop cases).
  - EXIT: 20/20 produce correct output or correct error.
- **U-P10-V2-05**: `WEDMLaunchGateEngine` — composite gate that checks P1-P9 all green before allowing V2 launch flag to flip.
  - EXIT: engine returns `{launch_ready: true}` only when every phase exit gate reports green.
- **U-P10-V2-06**: Sign-off commit + `LAUNCH-V2-GATE-PASS.md` + toggle `CLAUDE.md` WEDM block to V2.

**FORGE-TRIPLE:**
- Hook `wedm-v2-scope-gate` (replaces V1 scope gate) — BUILT in U-P10-V2-05
- Action `prism_edm:wedm_v2_generate` — BUILT in U-P10-V2-05
- Skill `/wedm-v2` — BUILT in U-P10-V2-06

**EXIT GATE:** ✓ 20/20 smoke test (5 V1 + 5 Tier 6 + 5 multi-controller + 5 learning-loop) | ✓ WEDMLaunchGateEngine returns `{launch_ready: true}` only when every prior exit gate is green | ✓ scope/pricing/demo docs committed | ✓ CLAUDE.md V2 block toggled | ✓ BASELINE_INVENTORY.json final re-verification — all counts reconcile with post-P9 digest | ✓ `/physics-verify` pass on every Tier 6B PCD path | ✓ 10-agent scrutiny re-run on final roadmap scores ≥ 80 average | Ω ≥ 1.0 | SVI Δ +4 %

**FEATURE CASCADE:**
- `new_hooks`: [wedm-v2-scope-gate]
- `new_actions`: [prism_edm:wedm_v2_generate]
- `new_skills`: [/wedm-v2]
- `available_to`: (terminal — cumulative rollup published as `state/shared/WEDM_V2_LAUNCH_REPORT.md`)

---

## 6. ENFORCEMENT INTEGRATION (ALL SESSIONS, NON-NEGOTIABLE)

```
PRE-LEVEL:      knowledge-consult, wedm-physics-constants-gate,
                context-retention, duplication-guard, git-anti-clobber
POST-LEVEL:     stub-detector, test-quality-gate, constants-checker,
                physics-agent, wiring-agent, always-build-guard,
                atomic-value-gate          [blocks bare-number returns from WEDM engines;
                                            every public .compute() must return {value, unit, uncertainty, source}],
                banned-pattern-block       [blocks .toBeGreaterThan(0) / .toBeLessThan(1000) /
                                            ±250% tolerances / bare .includes() assertions — enforces
                                            toBeCloseTo(published_value, N) at ±5–15% and structural toContain('G41')]
COMPACT-LEVEL:  review-gate, wiring-gate, forge-triple-gate, session-audit-agent
POST-COMPACT:   Feature Cascade (SESSION_ARTIFACTS.json)
```

**Every session** must run:
```
prism_session:context_boot → dispatcher_map → memory_recall → system_snapshot
  → action_search "wire edm <session goal>"
  → auto_checkpoint (every 5-10 calls) → wip_capture
  → memory_save → checkpoint_enhanced on session end
```

---

## 7. CROSS-PHASE METRICS

| Metric | P0 | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 |
|--------|----|----|----|----|----|----|----|----|----|----|-----|
| Tests added | 0 | +5 | +50 | +40 | +34 | +14 | +30 | +60 | +20 | +20 | +0 |
| Engines added | 0 | 0 (3 deprec) | +2 | 0 | +7 | +5 | 0 | +5 | +2 | +3 | +1 |
| Hooks added (BUILT) | +1 | +1 | +1 | +2 (+1 TIER6B) | +2 (+1 DL-PRED) | +1 | +0 | +0 (consumed) | +1 | +3 (WIRE+XAI+INT) | +1 |
| Actions added (BUILT) | +1 | +1 | +4 | +2 (+1 TIER6B) | +2 (+1 DL-PRED) | +1 | +0 (consumed) | +0 (consumed) | +1 | +4 | +1 |
| Skills added (BUILT) | +1 | +1 | +1 | +2 (+1 TIER6B) | +2 (+1 DL-PRED) | +1 | +0 (consumed) | +0 (consumed) | +1 | +4 | +1 |
| SVI Δ | +1% | +2% | +3% | +3% | +4% | +3% | +4% | +10% | +1% | +3% | +4% |

**Cumulative SVI Δ: ~+38 %** (target was +25 % — headroom for reversion on any failed gate).
**Unit total: 112** (P0:3 + P1:4 + P2:11 + P3:14 + P4:9 + P5:6 + P6:8 + P7:26 + P8:5 + P9:14 + P10:6 = **106 canonical + 6 test-as-units expansions** = 112).
**Built-artifact totals (post-Stage-10 fix):** Hooks 13 | Actions 19 | Skills 14 (each unique, verified by Stage 7 ownership table; no double-claims).

---

## 8. DESIGN-PILLAR TRACEABILITY

| Pillar | Realized In | Evidence |
|--------|-------------|----------|
| Deep Logic | P1 (cite-every-parameter), P2 (safety gates), P6 (30-part validation) | zero synthetic placeholders, 98/100 role audit |
| Deep Reasoning | P3 (Tier 6 creative), P5 (GNN explanation), P9 (XAI panel) | every prediction has `explain()` |
| Deep Learning | P4 (LoRA + EWC + few-shot), P9 (feedback loop) | job history → adapter updates |
| Neural Networking | P5 (graph attention over 5-dim lattice), P9 (embedding queries in UI) | HNSW < 5 ms p99 |
| Near-AGI | P4+P5+P9 composite: learn, reason, explain, adapt | WEDMLaunchGateEngine composite check |

---

## 9. WHAT THIS ROADMAP *DOES NOT* DO

Honesty-gate per user standing instruction:

- Does not replace the individual milestone envelopes. Those remain canonical for unit-of-work execution; this roadmap sequences them.
- Does not introduce new WEDM-AGI P5 autonomy work — L4/L5 autonomy blocked until P10 confirms S(x) ≥ 0.90 rolling.
- Does not auto-migrate sinker EDM (EDMDispatcher covers both; sinker-specific scope is deferred to a separate roadmap).
- Does not promise "no machinist oversight" — V2 still requires operator review for first run on new material/machine pair.
- Does not include CAD drawing ingestion (pdf→dxf auto-convert) past current `EDMDrawingInterpretationEngine` capability — separate MS would be required.

---

## 10. FIRST ACTION ON RESUME

```
/prism-review --baseline-check
cd mcp-server && npx tsx scripts/wedm_generate_digest.ts
git diff mcp-server/data/state/WEDM_DIGEST.json
```

If digest is clean and reconciles with §1 Stage 2 inventory — start **MS-P0-V / U-P0-V01**.
If not — reconcile first, update §1 Stage 2, commit, then start.

---

## 11. STAGE 10 — 10-AGENT SCRUTINY RESULTS

Parallel scrutiny run 2026-04-16. Full log: `state/shared/WEDM-CONSOLIDATED-SCRUTINY-2026-04-16.md`.

Pass thresholds: **average ≥ 80, no agent < 40.** Any dimension < 70 required a fix pass; the table records both pre-fix and post-fix scores.

| Agent | Dimension | Score (pre-fix) | Score (post-fix) | Verdict |
|-------|-----------|----------------|-------------------|---------|
| 1 | Protocol Structure | 74 | 84 | PASS (4-LOOP expanded, session splits added, /compact checkpoints inserted, per-unit FILES_CREATED / FILES_MODIFIED / ABORT / ROLLBACK enumerated for P1/P3/P4/P5/P9) |
| 2 | Unit Naming | 92 | 92 | PASS (no fix required) |
| 3 | Dependency Graph | 78 | 86 | PASS (P1 `available_to` expanded to [P2..P10]; Section 4 DAG redrawn to show P3→P6 and P5→P6 edges; parallelization claim corrected from "(P4 tail, P6 head)" to "(P4 tail, P5 head)") |
| 4 | Exit-Gate Rigor | 68 | 83 | PASS (≥ 3 inline EXITs per unit; ">3 TS errors" replaced with `npx tsc --noEmit > 0`; machinist-acceptance added to P2/P3/P6/P8/P9; ±20 % NC-line tightened to ±10 % toolpath-length-mm + G-code structural tokens `toContain('G41')`; banned-pattern-block added to §6) |
| 5 | Completeness Coverage | 92 | 92 | PASS (no fix required) |
| 6 | Physics Rigor | 58 | 82 | PASS (wire deflection corrected to `δ = q·L²/(8·T)` or `δ = F·L/(4·T)` per Dauw & Snoeys 1986; Johnson-Cook misattribution replaced with PCD k(T) interpolation per ASM Handbook Vol. 16; `WEDMRLPolicyEngine (508 LOC)` fabrication stricken; SNAPSHOT-DIFF protocol added to U-P1-02/03/04; Klocke/DiBitonto/Kunieda/Carslaw-Jaeger/Sato/Puri-Bhattacharyya citations upgraded with year+journal+page; Puertas & Luis flagged as sinker-EDM — do-not-cross-apply; `atomic-value-gate` enforcement hook added; `/physics-verify` wired into MS-P1/MS-P6/MS-P10 SKILLS; typo "Prefight"→"Preflight") |
| 7 | Forge-Triple Ownership | 79 | 88 | PASS (triples added for MS-P3-TIER6B, MS-P4-DL-PRED, MS-P9-WIRE, MS-P9-INT; BUILD ownership claimed for `wedm_verify_quality` and `/wedm-validate` to end the prior double-claim; P7 FEATURE CASCADE set to `[]` since all consumed; §7 ownership table extended with 15 new rows) |
| 8 | Feature Cascade | 86 | 88 | PASS (P7 new_* forced to `[]`; metrics table hook/action/skill counts reconciled with §7 ownership) |
| 9 | MCP Utilization | 82 | 85 | PASS (phantom `/graph-neighbor` removed and replaced with `/wedm-reason`; `/scope` added to MS-P1/MS-P2/MS-P3-TIER6B/MS-P6/MS-P10; `/checkpoint` added to multi-session milestones; MS-P3-TIER6B PLUGINS/MCP_LIFECYCLE expanded) |
| 10 | Cross-Roadmap Coherence | 84 | 88 | PASS (U-P0-V04 added to deprecate CAMX-V17-P9 in roadmap-index.json with supersession mapping; BASELINE_INVENTORY re-verification added to P1/P4/P5/P10 EXIT GATEs) |
| — | **Average** | **79.3 (CONDITIONAL)** | **86.8 (PASS)** | **PASS — no dimension below 70; no dimension below 80 remaining** |

**Fix log** (chronological, applied in this v1.1.0 edit cycle):

1. §1 Stage 3 P1 row — wire deflection formula corrected; citations upgraded with year/journal/page
2. §5 MS-P1 KNOWLEDGE — wire deflection formula synced with §1 Stage 3
3. §5 MS-P3-TIER6B KNOWLEDGE — Johnson-Cook misattribution replaced with ASM Handbook k(T)
4. §5 MS-P4-DL-CORE KNOWLEDGE — `WEDMRLPolicyEngine (508 LOC)` replaced with `WEDM_RL_POLICY v1 state snapshot (LinUCB bandit)`
5. §5 MS-P1 U-P1-02/03/04 — SNAPSHOT-DIFF protocol inlined; EXIT items bumped from 3 to 4 measurable
6. §5 MS-P6 SKILLS / MS-P10 SKILLS — `/physics-verify` + `/scope` + `/checkpoint` added; session splits declared
7. §5 MS-P3-TIER6A/B — ±20 % NC-line tightened to ±10 % toolpath-length-mm + G-code structural assertions; per-unit ABORT/ROLLBACK/EXIT with specific commands
8. §5 MS-P3-TIER6B — SKILLS/PLUGINS/MCP_LIFECYCLE completed; forge-triple added (`wedm-pcd-conductivity-gate`, `prism_edm:wedm_validate_pcd`, `/wedm-pcd`)
9. §5 MS-P4-DL-CORE/DL-PRED — per-unit FILES_CREATED/MODIFIED/ABORT/ROLLBACK/EXIT; forge-triple added for DL-PRED (`wedm-predictor-mae-gate`, `prism_edm:wedm_predict_ra`, `/wedm-predict`)
10. §5 MS-P5-GNN — phantom `/graph-neighbor` replaced with `/wedm-reason`; session split + per-unit structure
11. §5 MS-P9-WIRE/INT — forge-triples added (`wedm-ui-mock-block` / `prism_edm:wedm_ui_action_ping` / `/wedm-wire`; `wedm-e2e-ci-gate` / `prism_edm:wedm_e2e_report` / `/wedm-e2e`)
12. §5 P7 FEATURE CASCADE — `new_*` set to `[]`; phase exit bumped with `WEDM_FE_BE_COVERAGE` threshold
13. §4 DAG redrawn; parallelization claim corrected
14. §5 MS-P1 FEATURE CASCADE — `available_to` expanded to [P2..P10]
15. §6 — `atomic-value-gate` + `banned-pattern-block` POST-LEVEL hooks added
16. §7 Forge-Triple table — 15 new ownership rows (TIER6B, DL-PRED, VAL30 takeovers, P9-WIRE, P9-INT)
17. §5 MS-P0 — U-P0-V04 added to deprecate CAMX-V17-P9
18. §5 MS-P1/P4/P5/P10 EXIT GATEs — BASELINE_INVENTORY re-verification added
19. §7 metrics table — hook/action/skill counts reconciled with ownership table; built-artifact totals added
20. §1 Stage 2 typo "Prefight"→"Preflight"

Scrutiny re-run is scheduled to execute in MS-P10-V2-04 as part of the V2 launch smoke test — if any dimension regresses below 80 the launch gate blocks.

---

## 12. ROUND 4 SCRUTINY — PRINT→CNC ONE-SHOT CLOSURE (2026-04-16)

Triggered by the PRISM-INVENTORY-2026-04-15.md refresh + user directive: **"we're promising print to cnc program in one shot. we need extreme level of intelligence and coordination for this."** The v1.1.0 roadmap passed 10-agent scrutiny for its declared scope, but three independent convergent-evidence agents measured the **actual** one-shot delivery readiness and all reached HARD BLOCK.

### 12.1 Convergent verdict table

| Agent | Dimension | Score | Verdict | Primary finding |
|-------|-----------|-------|---------|-----------------|
| goal-planner | 12-stage pipeline coverage | **0.47 / 1.0** | NO-GO | AutoPrintToProgramBridgeEngine has ZERO wire-EDM references — platform one-shot cannot reach WEDM |
| collective-intelligence-coordinator | Synergy axis | **0.20 / 1.0** | BLOCK | 0 of 87 dispatchers invoke consultAwareness; reasoning traces not persisted; 4,493 tribal tips unused at runtime; 99% of JM Die archive unindexed |
| safety-physics | S(x) safety floor | **≤ 0.24** | HARD BLOCK | WEDMPrintToProgramEngine returns success:true unconditionally at line 1603; WEDMHeadClearanceEngine is orphan; G-code is bare string (25.4× mm/inch risk); PCD k(T) commit-time only |
| **Convergent** | **Readiness to ship one-shot** | **BLOCKED** | **PATCH REQUIRED** | **v1.1.0 insufficient — 3 new milestones / 21 units / ~6,400 LOC required before P3-P10 can execute safely** |

### 12.2 Closure plan — 3 new milestones (BUILT v1.2)

| Milestone | Insertion point | Units | Sessions | LOC | Closes |
|-----------|----------------|-------|----------|-----|--------|
| **MS-P0.5-COORD** | between P0 and P1 | 8 | 3 | ~2,580 | synergy axis 0.20 → 0.65 |
| **MS-P1.5-ONESHOT** | between P1 and P2 | 7 | 3 | ~2,480 | pipeline coverage 47% → 95% |
| **MS-P2.5-SAFETY** | between P2 and P3 | 6 | 2 | ~1,860 | S(x) floor 0.24 → 0.72 |
| **Totals** | — | **21** | **8** | **~6,920** | All three axes above gate |

### 12.3 Unit catalog (v1.2 BUILD ownership)

**MS-P0.5-COORD (coordination substrate)**
1. U-P0.5-COORD-01 — WEDMAwarenessAdoption (consultAwareness → all WEDM dispatchers)
2. U-P0.5-COORD-02 — WEDMReasoningTraceLedger (persistent JSONL trace with atomic append)
3. U-P0.5-COORD-03 — WEDMBlackboardEngine (pub/sub working memory, TTL, vector clock)
4. U-P0.5-COORD-04 — WEDMReasoningBridgeEngine (PRISMCreativeReasoning → ExecutionPlan)
5. U-P0.5-COORD-05 — WEDMTribalRuntimeEngine (4,493 tips → HNSW runtime lookup)
6. U-P0.5-COORD-06 — NeuralFormulaFusionEngine (Bayesian fusion with formula-envelope clamp)
7. U-P0.5-COORD-07 — WEDMArchiveBackfillEngine (≥2,474 JM Die WEDM programs indexed)
8. U-P0.5-COORD-08 — WEDMMultiAgentDispatchEngine (deadline-aware, median+MAD consensus)

**MS-P1.5-ONESHOT (pipeline spine)**
1. U-P1.5-OS-01 — WEDMDwgImportEngine (LibreDWG bridge + DXF fallback)
2. U-P1.5-OS-02 — STEPAP242PMIExtractor (GD&T frame + datum precedence + AtomicValue)
3. U-P1.5-OS-03 — AutoBridge wire-EDM branch + WEDM_CAPABILITY_MANIFEST
4. U-P1.5-OS-04 — Multi-controller post (Mitsubishi FA/MV, Sodick AQ/AL, Makino U/EU, AgieCharmilles CUT, Fanuc ROBOCUT)
5. U-P1.5-OS-05 — WEDMWirePathCollisionEngine (swept-volume, HARD BLOCK on collision)
6. U-P1.5-OS-06 — WEDMProgramVerificationEngine (G41/G42 pairing, M02/M30, unit consistency, E-code sanity)
7. U-P1.5-OS-07 — consultAwareness wiring into WEDMPrintToProgramEngine + AutoBridge

**MS-P2.5-SAFETY (safety gates)**
1. U-P2.5-SAFE-01 — WEDMProgramSafetyGateEngine (S(x) ≥ 0.70 HARD BLOCK on program emit)
2. U-P2.5-SAFE-02 — AtomicValue + G20/G21 unit tag (25.4× mm/inch risk eliminated)
3. U-P2.5-SAFE-03 — WEDMHeadClearanceEngine wiring (upper ≥3mm, lower ≥2mm)
4. U-P2.5-SAFE-04 — WEDMFlushAdequacyGateEngine (v_f by thickness band, side vs submerged)
5. U-P2.5-SAFE-05 — WEDMThermalReleaseGateEngine (ASM Vol. 16 k(T), NOT Johnson-Cook)
6. U-P2.5-SAFE-06 — WEDMControllerDialectVerifierEngine (E/C/M-code lookup per controller)

### 12.4 Dependency impact on downstream milestones

All v1.1 milestones from P2 onward now depend on the three v1.2 insertions:
- `MS-P1-100PCT` gains dep on `MS-P0.5-COORD`
- `MS-P2-GAPFILL` gains dep on `MS-P1.5-ONESHOT`
- `MS-P3-TIER6A`, `MS-P3-TIER6B`, `MS-P4-DL-CORE` gain dep on `MS-P2.5-SAFETY`
- `MS-P10-V2LAUNCH` launch gate now includes all 3 new milestones

No envelope renumbering required — existing IDs remain stable.

### 12.5 Forge-triple ownership added

| New asset | BUILT in unit | Type | Purpose |
|-----------|--------------|------|---------|
| `wedm-awareness-coverage` | U-P0.5-COORD-01 | hook | blocks merge if any WEDM dispatcher bypasses consultAwareness |
| `wedm-tribal-propagation` | U-P0.5-COORD-05 | hook | blocks if tribal lookup absent from recommendation path |
| `prism_edm:wedm_coordinate` | U-P0.5-COORD-08 | action | multi-agent consensus entry point |
| `/wedm-coordinate` | U-P0.5-COORD-08 | skill | user-facing multi-agent orchestration |
| `wedm-oneshot-spine-complete` | U-P1.5-OS-06 | hook | blocks merge if any of 12 pipeline stages lacks wired engine |
| `wedm-collision-gate` | U-P1.5-OS-05 | hook | HARD BLOCK on wire-path collision |
| `wedm-program-verify` | U-P1.5-OS-06 | hook | HARD BLOCK on structurally invalid program |
| `prism_edm:wedm_oneshot` | U-P1.5-OS-03 | action | WEDM capability-manifest one-shot entry |
| `/wedm-oneshot` | U-P1.5-OS-03 | skill | user-facing print→CNC one-shot |
| `wedm-program-safety-gate` | U-P2.5-SAFE-01 | hook | CI HARD BLOCK on any pipeline exit S(x) < 0.70 |
| `wedm-unit-tag-gate` | U-P2.5-SAFE-02 | hook | HARD BLOCK on mixed-unit emit |
| `prism_edm:wedm_safety_gate` | U-P2.5-SAFE-01 | action | runtime safety gate query |
| `/wedm-safety-gate` | U-P2.5-SAFE-01 | skill | user-facing safety-gate review |

### 12.6 Exit criteria for v1.2 closure

Closure gate (must all hold before P3 can start):
- [ ] 8 coordination engines green + synergy measurement ≥ 0.65
- [ ] 7 pipeline spine engines green + 12-stage coverage ≥ 95%
- [ ] 6 safety gate engines green + S(x) ≥ 0.72 over 30-part validation corpus
- [ ] WEDMPrintToProgramEngine line:1603 no longer returns unconditional success:true
- [ ] AutoPrintToProgramBridgeEngine routes wire_edm to WEDM pipeline
- [ ] All 1255 existing tests still green + ≥48 new safety tests + ≥14 new coordination tests + ≥21 new pipeline tests
- [ ] BASELINE_INVENTORY re-verified post-v1.2

Pre-v1.2 scrutiny re-run is scheduled to execute at the end of MS-P2.5-SAFETY. If any of (synergy ≥ 0.65, coverage ≥ 95%, S(x) ≥ 0.72) fails, P3 is blocked pending remediation.

---

**End of v1.2.0 section. v1.3.0 Round 5 addendum follows.**

---

## 13. ROUND 5 SCRUTINY — CODEX-FRONTEND UNIVERSAL ALIGNMENT (2026-04-16)

Triggered by the user directive: *"run a scrutiny pass again so you see what codex built on the front end and to plan adjacent to the main ai road map."* Scope is the actual shipped frontend at `mcp-server/web/` vs. the WEDM backend spine after v1.2 closure, plus alignment against the canonical Universal roadmap (no duplication with Universal Phase 0).

Full log: `H:/prism/SCRUTINY-R5-CODEX-FRONTEND-UNIVERSAL-ALIGNMENT-2026-04-16.md`.

### 13.1 What Codex actually shipped

| Surface | Count | Note |
|---------|-------|------|
| Routed pages | 134 (133 in App.tsx + 1 orphan `QuoteFollowUpPage`) | exceeds prior 111 count cited in MILL-AGI |
| Components | ~170 across 17 subdirs | `Layout.tsx` is 73 KB central shell |
| API clients | 87 REST files in `src/api/` | **46% orphan rate** (40 of 87 have no page consumer) |
| WEDM pages | WireEdmStudioPage, WireEdmUploadPage, WireEdmWizardPage, WireEdmResultsPage, EdmPage | **WireEdmStudioPage is the cleanest vertical in the app** (6-step wizard pattern) |
| Legacy mirror | `/web/` at 111 pages, 25-46 KB divergent on largest pages | 3-week stale |

### 13.2 WEDM-specific frontend gaps (R5 findings)

| # | Gap | Location | Severity |
|---|-----|----------|----------|
| 1 | WireEdmStudioPage 6-step wizard has no regression gate against future drift | `WireEdmStudioPage.tsx` | HIGH — loses canonical template status |
| 2 | CalculatorPage wire_edm mode-switch leaks `selectedTool`, `selectedMaterial`, `machineTypeId`, `operation`, `programming`, `selectedToolpath` | `CalculatorPage.tsx:4271-4383` | HIGH — ¾" end-mill stays selected when switching to wire_edm |
| 3 | 4 hardcoded `'fanuc-wire-standard'` literals; registry rename breaks the page | `CalculatorPage.tsx:1987, :2028, :4334` + `calculatorHolderLibrary.ts:235` | MEDIUM — registry coupling risk |
| 4 | No "Print Drop" bridge page accepting CAD/PDF and auto-dispatching to `/wire-edm-studio` | missing from `web/src/pages/` | HIGH — breaks print→CNC one-shot UX |
| 5 | `jobId`-via-URL handoff fails for mill→WEDM multi-op jobs | WEDM page triple | HIGH — multi-op breaks on mode transition |
| 6 | 4 orphan WEDM-relevant API clients (`feasibility`, `toolpath`, `cadGeometry`, `edmFeatures`) | `web/src/api/` | MEDIUM — capability dark-matter |

### 13.3 Closure — MS-P7.5-FE-GAPS

One new milestone / 7 units / ~2,480 LOC / 3 sessions inserted between P7 and P8:

| Unit | Closes | LOC | Protects (Codex LOC) |
|------|--------|-----|-----------|
| U-P7.5-FE-01 WireEdmStudioGuardEngine + drift-watch hook + `WEDM_STUDIO_WIZARD_SNAPSHOT.json` | gap #1 | ~420 | **5,862 LOC across 12 files** |
| U-P7.5-FE-02 CalculatorPage wire_edm mode-switch reset matrix | gap #2 | ~220 | — |
| U-P7.5-FE-03 WEDMDefaultResolverEngine + hardcoded-default-guard hook | gap #3 | ~320 | — |
| U-P7.5-FE-04 PrintDropPage + PrintDropWEDMRouter (frontend leg of MS-P1.5-ONESHOT AutoBridge) | gap #4 | ~480 | — |
| U-P7.5-FE-05 jobSessionStore + useJobSession hook + 3 WEDM page integrations | gap #5 | ~420 | — |
| U-P7.5-FE-06 Wire 4 orphan API clients into WEDM pages with consultAwareness | gap #6 | ~380 | — |
| U-P7.5-FE-07 **Wizard-duality reconciliation** — Studio (6-step) vs Wizard (quick planner) + APPW-MS0/MS1 binding + solveWireEdmWizard contract | gap #7 | ~380 | 183 LOC (WireEdmWizardPage) |

**Total:** 7 units, ~2,620 LOC of new/modified code, 3 sessions. Under drift-watch: 6,045 LOC of Codex frontend scaffolding.

#### 13.3.a U-P7.5-FE-01 protected-files inventory (5,862 LOC wizard stack)

| File | LOC | Role |
|------|-----|------|
| `mcp-server/web/src/pages/WireEdmStudioPage.tsx` | ~121 | `/wire-edm` route host; mounts `WedmStudioProvider` + `WizardShell` + `ProfileCanvas` |
| `mcp-server/web/src/contexts/WedmStudioContext.tsx` | ~408 | state machine: `useWedmNavigation` + `useWedmData` hooks; `markStepComplete` / `markStepError` / `markStale` / `setStepData` / `setFileInfo` |
| `mcp-server/web/src/hooks/useWedmPipeline.ts` | ~200 | pipeline hooks: `useParseGeometry` + `useWedmStep` |
| `mcp-server/web/src/components/wedm-studio/WizardShell.tsx` | ~311 | 6-step shell UI + navigation |
| `mcp-server/web/src/components/wedm-studio/ProfileCanvas.tsx` | ~837 | geometry overlay + profile visualization |
| `mcp-server/web/src/components/wedm-studio/StepImport.tsx` | ~688 | CAD/DXF/DWG/STEP/PDF intake |
| `mcp-server/web/src/components/wedm-studio/StepReview.tsx` | ~729 | geometry review + feature detection |
| `mcp-server/web/src/components/wedm-studio/StepWcs.tsx` | ~643 | WCS + origin picker |
| `mcp-server/web/src/components/wedm-studio/StepToolpath.tsx` | ~714 | lead-in/lead-out + strategy |
| `mcp-server/web/src/components/wedm-studio/StepOptimize.tsx` | ~1,054 | parameter optimization (largest step) |
| `mcp-server/web/src/components/wedm-studio/StepProgram.tsx` | ~688 | G-code render + post |
| `mcp-server/web/src/components/wedm-studio/StepErrorCard.tsx` | ~41 | shared step error UI |
| `mcp-server/web/src/components/wedm-studio/InfoTip.tsx` | ~36 | shared tip UI |

The drift-watch hook (`wedm-studio-drift-watch.mjs`) blocks any PR that touches these 12 files without also updating `WEDM_STUDIO_WIZARD_SNAPSHOT.json` (snapshot-version bump + rationale required). Honors the `mcp-server/web/CLAUDE.md` HARD RULE: *"DO NOT build over Codex frontend builds/web pages."*

#### 13.3.b U-P7.5-FE-07 wizard-duality decision

Canonical purpose split recorded in `WEDM_WIZARD_DUALITY_DECISION.json`:

| Surface | Route | Purpose | Handoff |
|---------|-------|---------|---------|
| **WireEdmStudioPage** (6-step) | `/wire-edm` | Full print→program authoring: CAD intake → geometry review → WCS → toolpath → optimize → G-code emit | Accepts pre-staged params from Wizard via `jobSessionStore` (U-P7.5-FE-05); step 1 auto-prefills material + thickness + wire spec |
| **WireEdmWizardPage** (single-page) | `/wire-edm-wizard` | Quick planner: material + thickness + qty + tolerance + notes → feasibility + estimate (no G-code) | "Proceed to Studio" button stages params in `jobSessionStore` and navigates to `/wire-edm` |

The Wizard's `appw_stage: 'APPW-MS0 machining calculation'` tag is bound to:
- **APPW-MS0 U-APPW02** — adds `/wireEdm` Express route with `verifyToken` + `requireRole('lead')` + Zod input validation
- **APPW-MS1** — copilot intelligence hardening (AppwCalculatorCopilot pattern)
- **`solveWireEdmWizard`** (`api/client.ts:178`) — contract-tested via Zod schema on both ends

### 13.4 Non-duplication with Universal Phase 0

R5's core finding is that much of the adjacent R3/R4/MILL-AGI work is already scoped inside Universal Phase 0. MS-P7.5-FE-GAPS **only** scopes WEDM-specific frontend closures and explicitly does NOT re-implement:

| Universal Phase 0 unit | What MS-P7.5-FE-GAPS does instead |
|------------------------|-----------------------------------|
| 0.2 Awareness middleware adoption | consumes it; does not rebuild |
| 0.6 Auto-Wiring mechanism | consumes it; does not rebuild |
| 0.17 Plugin / CAPABILITY_MANIFEST | registers WEDM capabilities under it; does not rebuild the format |
| 0.25 Physics + formula validation | consumes it; does not rebuild |
| `/web` parity mechanism (R5 Decision #3) | declares canonical = `mcp-server/web/`; defers parity enforcement to Universal 0.6 codegen |

### 13.5 Forge-triple ownership (v1.3 additions)

| New asset | BUILT in unit | Type | Purpose |
|-----------|--------------|------|---------|
| `wedm-studio-drift-watch` | U-P7.5-FE-01 | hook | blocks PRs that alter `WireEdmStudioPage` 6-step wizard structure without snapshot update |
| `wedm-hardcoded-default-guard` | U-P7.5-FE-03 | hook | blocks any new hardcoded machine/holder ID literal in `mcp-server/web/src/` |
| `prism_edm:wedm_frontend_gaps_report` | U-P7.5-FE-01 | action | WEDM-FE gap report summarizing drift / hardcoded / orphan state |
| `/wedm-fe-gaps` | U-P7.5-FE-01 | skill | user-facing WEDM-FE gap report review |

### 13.6 Canonical frontend path declaration

Under this roadmap:
- **Canonical:** `mcp-server/web/` (all 134 pages, including WEDM triple + WireEdmStudio)
- **Legacy mirror:** `/web/` — 3-week stale, 25–46 KB divergent on CalculatorPage and PostProcessorGenerator, MillingWizardPage absent entirely
- **Parity mechanism:** deferred to Universal 0.6 auto-wiring codegen per R5 Decision #3 — recommended codegen (~200 LOC), not symlink (flaky on Windows NTFS) and not drop (irreversible, too much blast-radius)

No WEDM engine or milestone is permitted to write into `/web/` going forward. The `wedm-hardcoded-default-guard` hook (U-P7.5-FE-03) also lints against changes in `/web/src/` as a side effect.

### 13.7 Exit criteria for v1.3 closure

- [ ] WireEdmStudioPage 6-step wizard locked via regression gate — drift-watch hook live on all 12 protected files (5,862 LOC)
- [ ] `WEDM_STUDIO_WIZARD_SNAPSHOT.json` exists, hashes match current file state
- [ ] `WEDM_WIZARD_DUALITY_DECISION.json` documents Studio vs Wizard purpose split
- [ ] Playwright mode-switch suite (6×6 transitions) green — no cross-mode residue
- [ ] Zero hardcoded `'fanuc-wire-standard'` in `mcp-server/web/src/`
- [ ] Print Drop → `/wire-edm-studio` end-to-end test green (with sample DXF staged)
- [ ] mill→WEDM job-session handoff preserves 7/7 context fields (cadFile, process, machineId, material, wireSpec, partNumber, priorOps)
- [ ] 4 orphan API clients (feasibility, toolpath, cadGeometry, edmFeatures) have WEDM page consumers invoking consultAwareness
- [ ] WireEdmWizardPage → WireEdmStudioPage handoff preserves material / thickness / wire-spec prefill (Playwright)
- [ ] `solveWireEdmWizard` contract test green (Zod schema enforced both sides)
- [ ] APPW-MS0 `/wireEdm` route exists with `verifyToken` + `requireRole('lead')`
- [ ] 1,255 existing tests still green + ≥ 22 new Playwright cases (+4 from U-P7.5-FE-07)

### 13.8 R5 non-WEDM items (acknowledged, delegated)

Per the WEDM-CONSOLIDATED track's scope, the following R5 findings are **acknowledged but delegated** to their owning tracks:

- Mill calculator sub-panel parity (R5 CALC-MILL-MS0/MS1/MS2/MS3, ~2,400+680+1,125+400 = 4,605 LOC) → MILL-AGI
- Swiss dialect posts (Citizen, Tsugami) (R5 Fix #10) → LATHE-MASTER + PP-INFRA
- `/mill-studio` and `/lathe-studio` as WireEdmStudio clones (R5 §6.3) → MILL-AGI + LATHE-MASTER
- `QuoteFollowUpPage` wire-or-delete (R5 §6.6) → QUOTE-TO-SHIP
- Calculator laser / waterjet stubs (R5 CALC-CROSS-MS0 partial) → UNIVERSAL Phase 1+

WEDM does not grow to absorb cross-track frontend work. The R5 6-week Gantt sequences MS-P7.5-FE-GAPS adjacent to Universal W4–W5, after Universal 0.4 Registry Locks land.

---

**End of WEDM-CONSOLIDATED-ROADMAP v1.3.1** (2026-04-16 expansion: MS-P7.5-FE-GAPS 6→7 units, full 5,862 LOC Codex Studio wizard stack under drift-watch, WireEdmStudioPage ↔ WireEdmWizardPage duality reconciled via U-P7.5-FE-07 + APPW-MS0/MS1 binding.)

*Supersedes all prior standalone WEDM sequencing documents. Individual envelope JSON files under `mcp-server/data/milestones/WEDM-*.json` remain the unit-of-work source of truth. This file is the sequencing authority.*
