# PPG (Print-to-Program) Flagship Deep Audit — Consolidated Report

**Verdict:** 62/100 — **MID-TIER** · Strong safety and engine coverage, weak telemetry and input format breadth
**Date:** 2026-05-08
**Method:** 10 parallel Explore agents
**Comparison:** WEDM 82, Lathe 75, Mill 68, **PPG 62**, SFC 53

---

## EXECUTIVE SUMMARY

PPG (Print-to-Program) is the universal pipeline that ingests a 2D drawing and produces CNC G-code — every flagship downstream consumes its output. The audit found **61 PPG engines (16K LOC)**, **45+ dispatcher actions across 4 dispatchers**, **231 test cases**, **all 14 ASME GD&T symbols extracted**, and **29 wired safety gates with S(x) integration**. The system is structurally complete for the **PDF→OCR→G-code happy path** with real JM Die customer parts validated end-to-end (ALCOA, OPTIMAS, ITW).

**Three structural gaps drag the score down:**
1. **No STEP / STL / native CAD parsers** — 2D-only despite 3D being industry-standard input
2. **Dual orphan lathe pipelines** — `lathe_p2p_*` (45 actions, legacy) parallel to `turning_print_to_program` (canonical)
3. **No PPG reasoning ledger** — vision/LLM/RL all running but no production telemetry to learn from operator overrides

**Highest-leverage commits:**
1. **Consolidate dual lathe P2P pipelines** — deprecate one, redirect callers (16h)
2. **Add STEP parser** (Open CASCADE bindings or commercial library) (40h)
3. **Wire PPG_REASONING_TRACE_LEDGER.jsonl** — copy Mill telemetry pattern (1 day)
4. **Add GD&T → machine selection logic** — Position 0.005 should route to 5-axis Okuma, not Haas OM-2 (16h)
5. **Add PDF format adversarials** to test suite (corrupt header, multi-page, scanned-low-res) (8h)

---

## AGENT SCORECARD

| # | Agent | Domain | Score | Status |
|---|---|---|---:|---|
| 1 | Engines | 61 engines / 16K LOC | 72 | ✓ No inline constants |
| 2 | Dispatcher | 45+ actions / 4 dispatchers | 69 | ⚠ Dual pipelines |
| 3 | Frontend | 8 pages / 21 components | 62 | ⚠ No GD&T overlay |
| 4 | Drawing Parsing | Vision OCR + DXF | 68 | ✗ No STEP/native CAD |
| 5 | Tests | 231 it() blocks | 68 | ⚠ No GD&T tests |
| 6 | GD&T | 14 symbols extracted | 62 | ⚠ 1D stack only |
| 7 | JM Die Fleet | 11 of 12 machines | 68 | ⚠ No archive corpus check |
| 8 | ML/AI | Vision+LLM+RL wired | 45 | ✗ No ledger |
| 9 | Safety | 29 gates / S(x) wired | 82 | ✓ Strongest area |
| 10 | Roadmap | 258 units / 0.4% complete | 18 | ✗ Not started |
| | **Composite** | | **62** | **Mid-tier** |

---

## PART A — ENGINES (Agent 1) · 72/100

- **61 PPG-related engines** across 8 categories
- **16,059 LOC** total (core: 8,842 LOC in 5 machine-specific engines; parsers: 2,359 LOC; tool selection: 1,937 LOC)
- **Orchestrator**: `PrintToProgramPipelineEngine` (2,042 LOC, 5-stage: intake→parse→plan→generate→validate)
- **Constants hygiene**: `constants.ts` (802 LOC) properly isolated; no inline Kienzle/Taylor leaked
- **Strengths**: Modular, 22 feature types, multi-process, tolerance-aware
- **Gaps**: STEP/3D parsers absent; operation sequencing implicit; integration tests missing

---

## PART B — DISPATCHER (Agent 2) · 69/100

- **5 dispatchers** carry PPG actions: prism_cam, prism_mill, prism_turning, prism_multiaxis, prism_edm
- **All actions wired with case statements + engine calls (100%)**
- **Lazy import consistency**: 95/100 (factory pattern across all)
- **Schema coverage**: 65/100 — `lathe_p2p_*` falls back to camActionSchemas
- **Test coverage**: 50/100 — strong E2E (LatheP2PPipelineE2E with 12 stages), weak per-action units

### CRITICAL: Dual Orphan Pipelines
- `prism_cam.lathe_p2p_*` (45 legacy actions)
- `prism_turning.turning_print_to_program` (2 canonical actions)
- Both invoke same engines via different entry points
- Inconsistent signoff/costing/reporting downstream
- Same orphan flagged in Lathe audit

---

## PART C — FRONTEND (Agent 3) · 62/100

- **8 pages**: PPG editor + 3 upload (milling/lathe/wire EDM) + 3 results + Print classifier
- **21 PPG components**: G-code editor, validators, AI panel, previews
- **Architecture**: Flagship-specific pipelines (lathe/milling/EDM) + unified PPG editor for all controllers
- **Strengths**: 7-stage lathe workflow visible, AI integration, OCR-based machine classification
- **Critical gaps**:
  - No PDF drawing viewer
  - No GD&T overlay component
  - LathePrintToProgramPage not routed
  - Feature recognition results panel missing visual representation

---

## PART D — DRAWING PARSING (Agent 4) · 68/100

### Format Support Matrix
| Format | Status | Engine |
|---|:-:|---|
| PDF (searchable) | ✓ | PDFBlueprintDimensionExtractorEngine |
| PDF (scanned/hand-marked) | ✓ | BlueprintVisionOCREngine (Claude Vision API) |
| DXF / SVG | ✓ | DXFParserEngine, DXFGeometryParserEngine |
| STEP / IGES | ✗ MISSING | — |
| STL / 3D mesh | ✗ MISSING | — |
| Native CAD (SW/Inventor/Fusion) | ✗ MISSING | (only via export) |

### GD&T Detection
- **14+ symbols** via Vision + Unicode regex
- Datum references parsed
- Confidence: 0.85–0.95

### OCR Provider
- **Anthropic Claude Vision** (NOT Tesseract or Google Cloud Vision)
- Token cost: per drawing scan inflates per-job cost — no caching layer

---

## PART E — TESTS (Agent 5) · 68/100

- **231 it() blocks** across 10 test files
- **1,364+ LOC** in core tests
- **Happy path**: 95% coverage with real aerospace/industrial parts
- **Format variability**: Only PDF tested; **DXF/STEP imports lack coverage**
- **GD&T**: 0% test coverage of Position/Profile/Flatness/datum parsing
- **Adversarial battery**: 54 tests strong; missing PDF corruption edge cases
- **Reference data**: JM Die production programs linked; 80% validation coverage

---

## PART F — GD&T (Agent 6) · 62/100

- **All 14 ASME Y14.5-2018 symbols** fully extracted (form, orientation, location, profile, runout)
- **Both Unicode and ASCII shorthand** supported
- **Datum references** captured with material modifiers (M/L/F/RFS)
- **Composite FCF** supported

### Critical Gaps
- **No DRF precedence hierarchy validation** (A→B→C standard)
- **Tolerance stack-up: 1D only** — no 2D/3D propagation for positional/profile
- **No GD&T → machine selection mapping** (weakest link — Position 0.005" requires manual reasoning, no automation)
- **No bonus tolerance automation** (Position MMC recognized but not applied)

---

## PART G — JM DIE FLEET (Agent 7) · 68/100

### Coverage: 11 of 12 (91.7%)
- **5 mills**: Haas VF-2, Hurco VM30i, Okuma M460V-5AX, Haas OM-2 wired ✓ — **Roku-Roku HC-658 II unwired** ✗
- **7 lathes**: All Okuma OSP controllers wired via `OkumaB250LatheMasterPostEngine`
- **3 EDM**: Sinker + wire EDM post-processors present, under-tested

### E2E Tests
- **5 suites / ~150 test cases**
- LatheP2PPipelineE2E: 3 real JM Die customer parts (ALCOA, OPTIMAS, ITW)
- MILLING-PRINT-TO-PROGRAM: 50+ cases
- Dialect detection (Haas, Okuma, Hurco, Mazak, Siemens) functional

### Archive Integration: Weak (70% confidence)
- Real programs exist in JM DIE folders
- **PPG output never compared to human-written NC** at corpus level
- No 80%+ match validation across the archive

---

## PART H — ML / AI (Agent 8) · 45/100

### Wired
- **Vision**: BlueprintVisionOCREngine (Claude Vision)
- **LLM Tier-1**: LLMEngine (Claude orchestrator, T=0.3, context-grounded)
- **RL**: RLPostProcessorEngine (ε-greedy Q-learning for adaptive G-code formatting)
- **Feedback**: MachineLearningFeedbackEngine (measurement residuals → coefficient updates per machine/material/op)
- **Federated**: FederatedLearningEngine (shop-local correction factors, privacy-preserving)

### Critical Gaps
- ✗ **No PPG_REASONING_TRACE_LEDGER.jsonl** — pipeline stages not logged
- ✗ Operator override capture missing (no explicit flag for user machine/op selection overrides)
- ✗ Tier hierarchy undocumented
- ⚠ LoRA/cadence adapters scaffolded but sparse (~12 active factors, no shop-specific training loop)

**Pattern**: Same as SFC and Lathe — capture infrastructure half-built, analysis layer missing.

---

## PART I — SAFETY (Agent 9) · 82/100 ★ STRONGEST AREA

- **29 safety dispatcher actions**:
  - Collision: 8
  - Coolant: 5
  - Spindle: 6
  - Breakage: 5
  - Workholding: 5
- **PipelineSafetyOrchestratorEngine**: 6 dimensions active (collision, overload, chatter, thermal, breakage, workholding)
- **S(x) integration**: `OmegaSafetyScoreEngine` computes geometric mean; gate blocks at S(x) < 0.70
- **Hard veto logic** functional
- **Download gate**: LATHE_DOWNLOAD_GATE active in HookRegistry; safety verdict displayed pre-export
- **SafetyBlockError** propagates — prevents silent bypass

### Gaps
- Per-dimension transparency in UI weak
- Aggregate gate documentation for Mill/Lathe/WEDM not unified

---

## PART J — ROADMAP (Agent 10) · 18/100

- **Authoritative**: `PPG-ROADMAP-INDEX.md` (39 milestones, 258 units, generated 2026-04-30)
- **No superseded drafts** (cleanest among multi-flagship roadmaps)
- **Phase status**: 9 sequenced sprints (foundation → WEDM → pilot → novel features); 10th equipment-dependent
- **Completion**: **1 of 258 units done (0.4%)** — only PostPhysicsSidecarSchema schema complete
- **Risk**: Aggressive 6–8-week critical path; MS18 legal review risk

---

## CRITICAL BLOCKERS (Severity Order)

### TIER 1 — Production blockers
1. **Dual lathe P2P pipelines** — risk of inconsistent signoff/costing in production
2. **No STEP / native CAD parsing** — 2D-only is industry-limiting (most JM Die customers send PDFs but trend is shifting to STEP)
3. **PPG reasoning ledger empty** — operator overrides not captured for learning

### TIER 2 — Quality gaps
4. **No GD&T → machine selection automation** — manual reasoning required for tight tolerances
5. **0% GD&T test coverage** despite extraction working
6. **DXF/STEP test coverage missing**
7. **Roku-Roku HC-658-II unwired** (1 of 12 fleet machines)

### TIER 3 — Architecture
8. Frontend: no PDF viewer + GD&T overlay
9. 1D tolerance stack only (no 2D/3D)
10. JM Die archive corpus comparison missing

---

## RECOMMENDATIONS (priority order)

### IMMEDIATE (this sprint, 32h)
1. Consolidate dual lathe pipelines — deprecate `lathe_p2p_*`, redirect callers (16h)
2. Wire `PPG_REASONING_TRACE_LEDGER.jsonl` (8h)
3. Add operator override capture for machine/op selection (8h)

### NEXT SPRINT — M1 (40h)
4. STEP parser integration (Open CASCADE) — 40h
5. Roku-Roku HC-658-II PPG wiring + tests (8h, parallel)

### M2 (48h)
6. GD&T → machine selection mapping engine (16h)
7. GD&T test suite (16h)
8. JM Die archive corpus comparison harness (16h)

### M3 (40h)
9. Frontend PDF viewer + GD&T overlay (24h)
10. 2D/3D tolerance stack-up engines (16h)

---

## TIME-TO-PRODUCTION ESTIMATE

| Phase | Hours | Score Impact |
|---|---:|---|
| Pipeline consolidation + ledger | 32 | 62→70 |
| STEP parser + fleet wiring | 48 | 70→78 |
| GD&T + tests + corpus | 48 | 78→84 |
| Frontend overlay + 2D/3D stack | 40 | 84→88 |
| Roadmap unit execution (50 units) | 200 | 88→94 |
| Roadmap unit execution (rest) | 800 | 94→97 |
| **Total to four-sigma** | **1,168** | **62→97** |

PPG roadmap is the **largest in PRISM** (258 units) — most of the path is roadmap execution, not blocker resolution.

---

## SUMMARY

PPG is the **architectural backbone** of every CNC flagship — mill, lathe, WEDM all consume its output. It has the strongest safety integration of any flagship audited (82/100), all 14 GD&T symbols extracted, and real JM Die customer-part validation. **Its weak spots are predictable**: telemetry ledger empty (same pattern as SFC and Lathe), no STEP parser (2D-only is constraining), and the dual-pipeline orphan that the Lathe audit also flagged. The roadmap is the largest in PRISM (258 units, 0.4% done) but well-structured with no superseded drafts.

**Composite Verdict: 62/100 — Mid-tier, structurally complete for 2D PDF→G-code, 1,168h to four-sigma production.**
