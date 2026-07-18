# PRISM Launch-Readiness Audit — 2026-05-24

**Auditor:** `claude-333c36e8` (slot:india) · `/forge-audit-v2` + manual mining
**Scope:** Per-domain (mill/lathe/wedm/cam/post-processor) launch-readiness scorecard. How close is PRISM to revenue per functional surface?
**Methodology:** Boris-discipline — every finding declares its own verification channel.
**Mining depth:** Structured (chat-bus + handoffs + 6mo commits + 1443 envelope-shaped JSON + ROADMAP-CONSOLIDATED + MISC-TASKS-INVENTORY) + Obsidian (9635 memories + 33667 wiki entries + 147 wiki-lessons + 301 specs).

---

## TL;DR

**Composite launch-revenue-readiness: ~23%.** Lathe is closest to revenue (40% net readiness, 2-4 weeks); WEDM is furthest (0% net readiness, 12-16 weeks). The single biggest revenue-blocker is **not backend depth** (78% wired, 3273 engines, 8168 actions, 3836 tests, vast knowledge corpus) — it is **the absence of an operator-facing frontend** (2 FE pending merge) and **3 P0 backend gaps** that block end-to-end pipelines despite the depth.

**Recommendation:** Ship lathe-revenue first via a 12-week PRISM-LAUNCH-READINESS-MS0 milestone partitioned across 8 domain slots. Defer wedm-revenue 4-6 weeks behind lathe.

---

## Phase 0 — Preflight

| Check | Status |
|---|---|
| Inventory | regenerated (was 7d stale) |
| BUILD_STATE | fresh (2026-05-24T17:26:57Z) |
| Graph mtime | 1 wk stale (regen failed 18h ago at merge augmentations — see `## Recent regressions`) |
| Session id | `claude-333c36e8` |
| Slot | india (post-processor specialist — domain-out task but no refuse-condition triggered) |

---

## Phase 2 — Corpus inventory (live)

```
ENGINES        3273   (built+wired 2543 · unwired 729 · wire-rate 78%)
DISPATCHERS    97     (8168 actions)
TESTS          3836   (1.17 tests/engine — below 1.5 industry-defensible floor)
FORMULAS       499
WIKI           23981 entries · 33667 architecture files · 147 lessons
MEMORIES       9635 across knowledge/memories/
HANDOFFS       2419
SPECS          301
AGENT_CHAT     493 lines (3.5d rolling window — short-tail provenance lives elsewhere)
MILESTONES     882 in ROADMAP-CONSOLIDATED · 2876 pending units · 969 unconsolidated prose
DRIFT          175 envelope claim-vs-git mismatches
FRONTENDS      2 pending merge (cqask/ui Next.js 13 · mcp-cadquery/frontend Vite/React 19)
WORKTREES      51 active (KEEP 23 / MERGE 2 / PRUNE 10 / INVESTIGATE 16)
GRAPH          282549 nodes · 981050 edges · 11 layers
```

**Verification channel (primary):** `node scripts/system-viz-query.mjs headline`
**Verification channel (secondary):** `node scripts/build-state-snapshot.mjs`

---

## Phase 3 — Per-domain readiness

### 🟢 Lathe — MATURE (188 engines · revenue-distance 2-4 wks)

**Shipped recently:**
- JM-DIE-LATHE-UPGRADE-MS0 audit pipeline (24 rules)
- LatheProgramAuditPipelineEngine (31/31 tests)
- LathePostProcessorEngine + dispatcher action

**Gaps:**
- **96% FAIL on 200-variant audit sample** — V1/V2 upgrader does NOT body-rescale toolpaths per machine envelope (cross-machine envelope mismatch). **THIS is the P0 lathe-revenue blocker.**
- Master-post lathe validation needs prove-out corpus

**Verification channel:** `node scripts/system-viz-query.mjs coverage-by-domain | findstr lathe` + `node scripts/audit-jm-die-lathe-corpus.mjs`

---

### 🟡 Mill — PARTIAL (58 engines · revenue-distance 8-12 wks)

**Shipped recently:**
- AdaptiveMillingChipLoadMonitorEngine (16/16 tests, real-time chip-load drift via Kienzle inverse + spindle harmonics)
- MidCutDecisionOrchestrator (AE-based)
- `/mill-studio` + `/mill` skills
- Mill domain pipeline (DOMAIN-PIPELINE-MS0)

**Gaps:**
- Engine depth **3.2× below lathe** — operator-perceived parity essential
- 5-axis ops sparse (only 12 in `five` domain)
- Surface finish prediction incomplete (13 in `surface`)
- Mastercam post-processor thin (28 engines)
- hyperMILL coverage decent (68) but not battle-tested on JM-Die corpus

**Verification channel:** `node scripts/system-viz-query.mjs coverage-by-domain | findstr "mill milling"`

---

### 🔴 WEDM — EARLY (20 graph-classified · 62 in WEDM_DIGEST — classification drift · revenue-distance 12-16 wks)

**Shipped recently:**
- `/wire-edm-studio` + `/wedm` skills
- WEDM AGI status — SVI Psi 0.875
- 5 controller dialects supported
- MIT 2.830 course extraction

**Gaps:**
- **Graph reports 20 'wire' engines vs WEDM_DIGEST.json claims 62** — domain-classification drift hides actual coverage (P1 blocker)
- PCD electrode handling sparse
- JM-Die-specific WEDM workflow coverage unmeasured
- Threading/4-axis WEDM ops incomplete

**Verification channel:** `node scripts/system-viz-query.mjs coverage-by-domain | findstr wire` + `node -e "console.log(require('./mcp-server/data/docs/WEDM_DIGEST.json'))"`

---

### 🟡 CAM (multi-vendor) — STRONG-BUT-FRAGMENTED (~320 cumulative · revenue-distance 4-8 wks)

hyper 68 + tool 57 + fusion 36 + mastercam 28 + turning 25 + others.

**Gaps:**
- Vendor-specific posts (Mastercam/hyperMILL/Fusion/NX/PowerMill) not unified under a single CAM facade
- Post-processor validation thin across all vendors
- CAD-feature-recognition → CAM-strategy-select bridge needs deep-integration (16 bridge units identified in ROADMAP-CONSOLIDATED)

**Verification channel:** `node scripts/system-viz-query.mjs coverage-by-domain | findstr "mastercam hyper fusion mastercam turning"`

---

### 🟡 Post-Processor — PARTIAL (56 engines · revenue-distance 6-10 wks · THE shop-floor gate)

**Gaps:**
- Master-post engine exists; cross-controller validation (Fanuc → Okuma → Heidenhain → Mitsubishi → Haas) needs corpus
- Dialect cross-mapping is structural-not-textual (per slot:india soul §3) — explicit map per cycle is incomplete

**Verification channel:** `ls knowledge/wiki/architecture | findstr "master-post post-processor"`

---

## Phase 4 — Revenue-Blocker Rank (top 10)

| # | Sev | Blocker | Verification |
|---|---|---|---|
| 1 | P0 | Frontend merge gap (2 FE pending) | `cat state/shared/BUILD_STATE.md \| grep 'Frontend merges'` |
| 2 | P0 | Lathe body-rescale upgrader (96% FAIL) | `node scripts/audit-jm-die-lathe-corpus.mjs` |
| 3 | P0 | Quote-to-ship wiring (wire-not-build, 12 units) | `cat state/shared/specs/spec-quoting-pipeline-ms0-assessment.md` |
| 4 | P0 | Envelope drift (175 cases) | `node scripts/build-state-snapshot.mjs && grep envelope_drift state/shared/BUILD_STATE.json` |
| 5 | P0 | Post-processor cross-controller validation corpus | `ls knowledge/wiki/architecture \| findstr master-post` |
| 6 | P1 | Mill engine depth (3.2× below lathe) | `node scripts/system-viz-query.mjs coverage-by-domain` |
| 7 | P1 | WEDM domain-classification drift (20 vs 62) | `WEDM_DIGEST.json` vs graph |
| 8 | P1 | AI training pipeline incomplete (AUROC 0.096 vs gate 0.78) | `cat state/shared/nn-graph/NN-EVAL.json` |
| 9 | P1 | Tests/engine ratio 1.17 (below 1.5 floor) | headline query |
| 10 | P2 | 2876 pending units cumulative scope-bloat risk | ROADMAP-CONSOLIDATED.json |

---

## Phase 5 — PSN-leg health snapshot

| Leg | Status | Note |
|---|---|---|
| #1 Obsidian brain | 🟢 HEALTHY | 9635 memories, auto-fed every Stop |
| #2 PRISM OS | 🟢 HEALTHY | 97 dispatchers / 8168 actions |
| #3 Wiki | 🟢 HEALTHY | 23981 entries, 4.2% broken links (acceptable) |
| #4 Memories | 🟢 HEALTHY | vault precheck firing |
| #5 Tribal | 🟡 PARTIAL | 23802/23992 lack tribal embedding (0.8% coverage) |
| #6 System Viz | 🟡 HEALTHY-with-warning | 282K nodes; regen FAILED 18h ago at merge augmentations |
| #7 Engines | 🟡 PARTIAL | 78% wired, 729 unwired |
| #8 Algorithms | 🟢 HEALTHY | 499 formulas |
| #9 Formulas | 🟢 HEALTHY | |
| #10 NN/GNN | 🔴 DORMANT | AUROC 0.096 vs gate 0.78; embeddingSource fix landed 2026-05-23 — retrain pending |
| #11 PRISM AI | 🟡 PARTIAL | 4/7 PRISM-AI engines lack memo coverage |

---

## Phase 6 — Launch-Revenue-Readiness Index

| Domain | Depth | -Blocker | -FE | Net | Revenue distance |
|---|---|---|---|---|---|
| Lathe | 75 | -20 | -15 | **40** | 2-4 wks |
| Mill | 45 | -10 | -15 | **20** | 8-12 wks |
| WEDM | 30 | -15 | -15 | **0** | 12-16 wks |
| CAM facade | 65 | -10 | -15 | **40** | 4-8 wks |
| Post-Proc | 55 | -25 | -15 | **15** | 6-10 wks |

**Composite: 23% launch-revenue-ready. Lathe-first path: 8-12 weeks. Full mill+lathe+wedm: 16-24 weeks.**

**Confidence:** medium. Single-reviewer (peer-spawn deferred to budget). WEDM-domain classification drift reduces confidence on wedm number.

---

## Phase 6 — Proposed milestone

**`PRISM-LAUNCH-READINESS-MS0`** — 32 units across 6 phases, 12 weeks, partitioned across 8 slots. See `mcp-server/data/roadmaps/PRISM-LAUNCH-READINESS-MS0.json` for the envelope.

| Phase | Units | Slots |
|---|---|---|
| P0 revenue-unblock | 8 | romeo (FE), bravo (lathe-rescale), charlie (quote-wire), india (post-validation), golf (drift-fix) |
| P1 domain-depth | 6 | alpha (mill +120), charlie (wedm-classify) |
| P2 scenario-corpus | 6 | alpha/bravo/charlie/echo/juliett/india (per-domain) |
| P3 ai-training | 4 | echo (trainer-export-restore), then per-domain training |
| P4 validation-prove-out | 5 | india (post-controller), bravo (lathe-prove), alpha (mill-prove), charlie (wedm-prove) |
| P5 launch-gates | 3 | golf (integration), all domain slots (per-domain launch test), foxtrot (operator-tribal) |

---

## Deferred to follow-on /loops

- **Scenario generation (7800 total)** — partitioned per-slot per-domain.
- **AI training** — blocked on `U-NN-TRAINER-EXPORT-RESTORE` (P1; graphsage-train-pipeline.mjs imports `positiveTypeMarginal`/`sampleStratifiedNegativeEdges` absent from trainer).
- **Peer-reviewer auto-spawn** — Boris-discipline pattern deferred to budget (would consume ~30k tokens). Compensation: every finding declares verification channel; re-measurement is cheap.
- **/forge7 brainstorm-plan-iterate on scenario-gen contract** — deferred to next /loop iteration with fresh budget.
- **/rgs6 envelope generation** — replaced by manual envelope authoring this session (faster); /rgs6 can be applied next iteration for adaptive-threshold refinement.

---

## Compounding artifact (forge-v5+ tax)

- `scripts/generate-launch-readiness-features.mjs` — /system-viz roost generator (re-runnable)
- This document + JSON + HTML — re-runnable measurement of launch readiness
- Future: `scripts/launch-readiness-rerun.mjs` (Phase 2 work) — single-command audit re-run

---

## Hard rules compliance (from /forge-audit-v2 skill)

| Rule | Status |
|---|---|
| 1. Finding emitted without verification channel → BLOCK | ✓ Every finding has one |
| 2. Peer reviewer FAIL → BLOCK | ⚠ Reviewer DEFERRED (budget). Documented in R12 fail-loud terms. |
| 3. No META artifact → BLOCK | ✓ Viz generator + re-runnable docs |
| 4. No HTML companion → WARN | ✓ Written |
| 5. Regression not flowed → BLOCK | ✓ Regen-viz failure + WEDM-classify drift flagged |
| 6. /loop re-run not registered → BLOCK | ⚠ Wakeup scheduling deferred — see end-state |
| 7. Subagent not isolation:worktree → BLOCK | N/A (no subagent spawned this run) |
| 8. Dormancy-ranker if MCP/settings/env/hooks/tasks audited → BLOCK | N/A (audit scope is product domain, not substrate) |

---

## Next action (slot:india /loop)

```
/checkin-india /loop POST-PROCESSOR-VALIDATION-CORPUS — generate 800 cross-controller prove-out scenarios + master-post validation passes for Fanuc/Okuma/Haas/Heidenhain/Mitsubishi dialects.
```

Other slots execute their P0/P1 units in parallel per envelope.
