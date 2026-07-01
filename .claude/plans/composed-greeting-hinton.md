# MCAT-MS0 — Machine Catalog Convergence (10-Agent Scrutinized)

## Context
Unify 920 enriched machines into a canonical machine-package model powering calculator, Print to CNC, Program Release, and 20+ downstream consumers. Currently fragmented across 3 parallel machine models with contradictory controller/spindle/coolant combinations.

**Status:** In progress. Partial convergence exists (Program Release search surface, some dedup), but core package model, calculator adoption, user profiles, and safety hooks are not yet wired.

---

## 10-AGENT SCRUTINY FINDINGS

### CRITICAL Issues (must address before execution)

**1. DATA QUALITY CRISIS (Agent 7)** — Severity: CRITICAL
- Only **0.5%** (5/920) machines have complete controller + spindle + coolant data
- 65.9% have zero/null spindle RPM; 79.2% have empty coolant objects
- 0/920 machines have confidence or provenance metadata
- **Action:** Insert **Phase P-1 (Data Remediation Sprint)** before P0. Inject confidence scores, build ambiguity backlog, fix schema mismatches in Mazak/DN Solutions/Chiron files

**2. EXECUTION ORDER BUG (Agent 6)** — Severity: CRITICAL
- Roadmap "immediate execution order" skips P0-U04, but P1-U01 depends on it
- **Action:** Fix ordering. Also exploit ~40% parallelization savings identified

**3. MISSING SAFETY HOOKS (Agent 10)** — Severity: HIGH
- No blocking hook prevents bad machine data (zero RPM, null power) from flowing into speed/feed calculations → G-code
- Post-convergence: one corrupt package cascades across 5+ product surfaces
- **Action:** Create 5 new blocking hooks before P3 downstream reuse begins:
  - `pre-machine-recommendation` (validate RPM/power/torque ranges)
  - `post-machine-selection-confidence` (block if confidence < 0.7)
  - `pre-speed-feed-orchestrate` (require complete spindle specs)
  - `post-parameter-clamping-recheck` (validate clamped params still safe)
  - `pre-user-overlay-accept` (prevent unsafe user combinations)

### HIGH Issues

**4. SCHEMA GAPS (Agent 1)** — Need new `CanonicalMachinePackage` wrapper
- Missing: provenance tracking, confidence breakdown, ambiguity queue, allowed-option matrix
- Existing `MachineCapabilitySnapshot` is a good base but incomplete
- **Action:** Create `src/contracts/machinePackageContract.ts` with wrapper type; bridge `AmbiguityResolutionEngine`

**5. CALCULATOR MIGRATION RISK (Agent 3)** — 15 integration tests will break
- 7 UI components depend on machine selection (2 high-risk)
- `buildMachineConfigurationOptions()` (~90 LOC) needs rewrite
- **Action:** Use dual-path transition — packages first, heuristic fallback. Migrate one machine at a time (start with Okuma M460V-5AX)

**6. REGISTRY ENGINE DOESN'T EXIST (Agent 2)** — MachinePackageGeneratorEngine is ~2,000-3,000 LOC new code
- Existing normalization utilities only dedupe/filter; no generation logic
- 39 duplicate IDs found (naming inconsistency: `HAAS_UMC_750` vs `HAAS_UMC750`)
- Plan underestimates effort by 2-3x
- **Action:** Budget 4-5 sprints not 2-3

**7. 20+ DOWNSTREAM CONSUMERS (Agent 4)** — Plan only lists ~6
- Three parallel machine models in flight that will collide
- Feasibility engine needs kinematics data that doesn't exist in MachineRegistry yet
- ShopConfigurationEngine contract is unclear
- **Action:** Sequence P3-U03 consumer wiring explicitly. Add kinematics registry extension before feasibility wiring

**8. FRONTEND BLAST RADIUS (Agent 9)** — 31 pages reference machines, not ~4
- Shared components missed: `MachinePickerPanel`, `MachineWizard`, `useMachineSelect` hook
- `liveProvider.ts` affects 20+ components
- 8+ API endpoints, 13 test files at risk
- **Action:** Expand "Key Files" list; account for shared components and API layer

### MEDIUM Issues

**9. TEST GAPS (Agent 5)** — ~270 LOC of tests missing across 6 files
- No regression harness for calculator dropdown impossible-combo suppression
- No brand audit wave test template
- **Action:** Create test files gating each phase (see test plan below)

**10. PRISM MODE FEASIBLE (Agent 8)** — 165 effort pts is realistic (85-95% confidence)
- Massive reusable infrastructure: `SmartToolSelectorEngine`, `ToolROIEngine`, `ROIAdvisorEngine`, `MachineSelectionEngine`, `PurchasingDirectoryEngine`
- Gaps: need `PrismModeOrchestratorEngine` (~60 LOC) and `CoolantSelectionEngine` (~120 LOC)
- Scope to HyperMILL-only for software selection initially

---

## REVISED EXECUTION PLAN

### Phase P-1 — Data Remediation Sprint (NEW, ~3 days)
**Must complete before P0 begins.**
- Inject `_confidence` scores into all 920 machines (per-field: controller, spindle, coolant)
- Build ambiguity backlog JSON (~500+ entries)
- Fix schema mismatches (Mazak `controller.brand` → `controller.manufacturer`)
- Canonicalize 39 duplicate IDs
- Validate: no zeros in critical fields for top-7 brands

### Phase P0 — Truth Hierarchy + Taxonomy (245 pts)
1. **P0-U01** — Inventory all machine sources + all 20+ consuming engines
2. **P0-U02 + P0-U03** — Run **in parallel** (both depend only on P0-U01)
   - U02: Define canonical machine taxonomy
   - U03: Create `src/contracts/machinePackageContract.ts` with `CanonicalMachinePackage` wrapper (includes provenance, confidence breakdown, ambiguity queue, allowed-option matrix)
3. **P0-U04** — Generate brand/family gap matrix (**NOT skippable** — P1-U01 depends on it)

### Phase P1 — Registry Convergence + Safety Hooks (300 pts + safety)
4. **P1-U01** — Build `MachinePackageGeneratorEngine` (~2,000-3,000 LOC)
   - Canonicalize IDs, dedup by (mfr, model), merge specs, generate `configurationOptions[]`, score confidence
5. **P1-U02 + P2-U01** — Run **in parallel** (independent paths)
   - U02: Normalize vocabularies
   - P2-U01: Begin calculator package-driven filtering (dual-path: package first, heuristic fallback)
6. **P1-U03 + P1-U04** — Run **in parallel** with P2-U02/U03
   - U03: Build allowed-option matrices
   - U04: Wire provenance/confidence/ambiguity queues
7. **Safety hooks** (create during P1, enforce from P2 onward):
   - `pre-machine-recommendation` BLOCKING
   - `post-machine-selection-confidence` BLOCKING
   - `machine-data-source-hierarchy` BLOCKING

### Phase P2 — Calculator Convergence (295 pts)
8. **P2-U01** — Package-driven filtering with dual-path (heuristic fallback)
9. **P2-U02 + P2-U03** — Run **in parallel** (both depend only on P2-U01)
   - U02: Surface controller/spindle/coolant from package truth
   - U03: Persist user-owned shop machine profiles as overlays
10. **P2-U04** — Contract tests + regression suite
    - Machine packages with confidence < 0.7 must fail
    - Impossible combos cannot render in dropdowns
    - Snapshot restore compatibility

### Phase P3 — Downstream Reuse + PRISM Mode (390 pts)
**After P3-U01, two chains run in parallel:**
- Chain A: P3-U02 → P3-U03 (APIs → consumer propagation)
- Chain B: P3-U04 → P3-U05 (PRISM mode → purchase recommendations)

11. **P3-U01** — Bind Program Release / Print to CNC to canonical package
12. **Safety hooks** (create before downstream wiring):
    - `pre-speed-feed-orchestrate` BLOCKING
    - `post-parameter-clamping-recheck` BLOCKING
    - `pre-user-overlay-accept` BLOCKING
13. **P3-U02 → P3-U03** — APIs + consumer wiring in priority order:
    1. What-if (easy — just validate string input)
    2. Quoting (medium — JobCostingEngine refactor)
    3. Scheduling (medium-high — consolidate 3 machine representations)
    4. Feasibility (hard — needs kinematics registry extension first)
14. **P3-U04** — PRISM mode orchestrator (reuse SmartToolSelector + ToolROI + MachineSelection + FeatureToStrategy)
15. **P3-U05** — Ranked purchase recommendations (reuse ROIAdvisor + PurchasingDirectory)

### Phase P4 — Validation & Hardening (280 pts)
- **P4-U03 starts early** (depends only on P3-U02, not P3-U03)
- **P4-U01** — Brand audit waves
- **P4-U02 + P4-U03** — Run in parallel (QA + admin remediation)
- **P4-U04** — Coverage dashboards + ambiguity backlog

---

## KEY FILES

### Create
| File | Purpose |
|------|---------|
| `src/contracts/machinePackageContract.ts` | CanonicalMachinePackage wrapper with provenance, confidence, ambiguity, allowed-options |
| `src/engines/MachinePackageGeneratorEngine.ts` | Core convergence engine (~2,000-3,000 LOC) |
| `src/engines/PrismModeOrchestratorEngine.ts` | PRISM mode auto-setup (~60 LOC) |
| `src/engines/CoolantSelectionEngine.ts` | Centralized coolant recommendation (~120 LOC) |
| `src/engines/PurchaseRecommendationRankerEngine.ts` | Ranked purchase tiers (~80 LOC) |

### Modify
| File | Change |
|------|--------|
| `src/contracts/userMachineProfile.ts` | Import/embed CanonicalMachinePackage |
| `src/registries/MachineRegistry.ts` | Package-aware queries, post-load convergence |
| `src/hooks/EnforcementHooks.ts` | 5 new blocking safety hooks |
| `web/src/api/calculatorData.ts` | Package-driven fetch (dual-path) |
| `web/src/utils/machineConfigurationOptions.ts` | Package generation + merge |
| `web/src/pages/CalculatorPage.tsx` | Package-aware selection |
| `web/src/components/ppg/MachinePickerPanel.tsx` | Consume canonical packages |
| `web/src/components/learning/MachineWizard.tsx` | Consume canonical packages |
| `web/src/hooks/useLearning.ts` | useMachineSelect → canonical packages |
| `web/src/features/operating-system/liveProvider.ts` | Machine state from packages |
| `web/src/api/client.ts` | 8+ machine API endpoints |
| `web/src/api/speedfeed.ts` | sfResolveMachine validation |

### Reuse (no changes needed)
- `SmartToolSelectorEngine` (548 LOC) — tool auto-selection
- `ToolROIEngine` (593 LOC) — ROI/payback analysis
- `ROIAdvisorEngine` (175 LOC) — multi-category ranking
- `MachineSelectionEngine` (~150 LOC) — machine recommendation
- `PurchasingDirectoryEngine` (186 LOC) — supplier database
- `FeatureToStrategyBridgeEngine` (150+ LOC) — strategy mapping
- `resolveMachineSelectionOptions()` — already format-agnostic

## Required Test Files (~270 LOC new)
| File | Gates Phase | Purpose |
|------|-------------|---------|
| `machine-package-generation.test.ts` | P1 | Merge → legal package + impossible combo rejection |
| `calculator-dropdown-regression.test.ts` | P2 | Controller locks → spindle narrows → coolant filters |
| `machine-package-contract.test.ts` | P2 | UserMachineProfileService ↔ MachineRegistry contract |
| `downstream-reuse-contract.test.ts` | P3 | Calculator saves → Program Release reads same ID |
| `brand-audit-template.test.ts` | P4 | Per-brand combo audit template |
| `impossible-combo-matrix.test.ts` | P1 | Enumerate all legal/illegal combos per machine |

## Verification
1. `npm run build` — zero tsc errors
2. `rtk npx vitest run` — all tests pass (including 6 new test files)
3. Safety hooks: bad spindle data (RPM=0, power=null) blocked before speed/feed
4. Contract tests: impossible combos cannot render; confidence < 0.7 blocked
5. Calculator UI: dual-path works (package first, heuristic fallback)
6. Program Release: consumes same machine package as calculator
7. User profiles: save/load persists legal options only; overlay can't bypass source rules
8. Snapshot restore: old saves load correctly in new system

## Revised Timeline
Original estimate: 2-3 sprints → **Revised: 5-6 sprints** (per Agent 2 finding of 2-3x underestimate + data remediation sprint)

## Start Point
Begin with **Phase P-1 (Data Remediation)** — inject confidence metadata into all 920 machines, build ambiguity backlog, fix schema mismatches. Without this, everything downstream builds on unreliable data.
