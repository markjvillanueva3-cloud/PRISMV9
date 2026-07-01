# quality Galaxy — fleet-managed (no dedicated slot; any slot may work; claim via /pick-unit + heartbeat)
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = quality-domain doctrine ONLY; never re-inline universal prose.

---

## §1 Domain scope

**Owns:** Cpk/Cmk calculation, SPC charts (X-bar R, individuals MR, p-chart, EWMA, multivariate),
process-capability studies (Cp/Cpk/Cpm/Clements/CI/gage R&R/sampling plans), CMM parsing + path
planning, surface-finish gates, GD&T stack-up, gauge R&R / MSA, FAI (First Article Inspection),
inspection-plan generation, quality scoring, ERP quality feed.

**EXCLUDES:** real-time shop-floor SPC streaming → shop-floor galaxy. Live alarm management → compliance-safety. G-code emission → echo. Blueprint OCR → xray.

**Fleet-managed** — no dedicated slot. Alpha claimed initial population 2026-06-08; any slot may
continue. Competing edits: claim `mcp-server/src/engines/quality/` files via `prism_context:claim_file`
before editing.

---

## §2 Verified engines

All at `mcp-server/src/engines/<name>.ts` (existence confirmed via git ls-files 2026-06-13).

| Role | Engine |
|------|--------|
| Cpk gate | `CpkPredictionGateEngine.ts` |
| SPC capability | `SPCProcessCapabilityEngine.ts`, `ProcessCapabilityPredictionEngine.ts` |
| Quality formulas (Cp/Cpk/Cpm/Clements/CI/gage R&R/sampling) | `QualityFormulasEngine.ts` |
| SPC charts | `SPCChartingEngine.ts`, `NelsonSPCRulesEngine.ts`, `MultivariateSPCEngine.ts`, `EWMAEngine.ts`, `SPCPreControlEngine.ts`, `SPCFeedbackLoopEngine.ts`, `WEDMOffsetSPCEngine.ts` |
| MSA / Gage R&R | `MeasurementSystemAnalysisEngine.ts`, `GageRRMSAEngine.ts` |
| Capability indices | `CapabilityIndexEngine.ts`, `CapabilityCensusEngine.ts`, `CapabilityEffectivenessEngine.ts` |
| CMM | `CMMImportEngine.ts`, `CMMHistoryEngine.ts`, `CMMPathPlanningEngine.ts` |
| GD&T stack-up | `GDTStackupEngine.ts` |
| FAI / inspection | `FirstArticleInspectionPipelineEngine.ts`, `FAIAutoGenerationEngine.ts`, `InspectionReportEngine.ts`, `TurningInspectionPlanEngine.ts`, `WetRunSampleInspectionPlanEngine.ts` |
| Turning-specific | `TurningCpkSurrogateEngine.ts`, `LatheQualityGateEngine.ts` |
| EDM quality | `EDMQualityOrchestratorEngine.ts`, `SinkerEDMElectrodeInspectionEngine.ts` |
| CAM bridges | `HyperMillSPCBridge.ts`, `HyperMillFAIBridge.ts`, `MastercamSPCBridge.ts`, `MastercamFAIBridge.ts` |
| Surface finish | `SurfaceFinishPredictorEngine.ts`, `StochasticSurfaceFinishEngine.ts`, `SpindleHarmonicsQualityEngine.ts` |
| ERP feed | `ERPQualityEngine.ts` |
| Dashboard / score | `QualityDashboardEngine.ts`, `QualityScoreEngine.ts`, `MachineQualityScoreEngine.ts`, `QualityPredictionEngine.ts` |
| Data quality | `DataQualityEngine.ts` |

> `SurfaceFinishPredictionEngine` and `QualityOrchestratorEngine` — NOT on disk; do not reference.
> `EmployeeMachineDomainAcademyEngine.ts` — verified present; owns role-floor Cpk table (see §4).

---

## §3 Dispatcher quick-ref

Dispatcher: `mcp-server/src/tools/dispatchers/qualityDispatcher.ts` (verified on disk).
MCP tool name: `prism_quality`. MCP-down fallback: `cd mcp-server && npx vitest run -t "Quality|Cpk|SPC"`.

| Action | Use |
|--------|-----|
| `cpk_predict` | Point-estimate Cpk from process σ + tolerances |
| `spc_process_capability_analyze` | Full capability study (Cp/Cpk/Cpm + CI + conservative bound) |
| `quality_formulas_calculate` | Cp/Cpk/Cpm/Clements/gage R&R/sampling plan math |
| `spc_calculate` | X-bar R / individuals-MR / p-chart UCL/LCL |
| `ewma_analyze` | EWMA chart (shift detection) |
| `multivariate_spc_analyze` | Hotelling T² multivariate SPC |
| `western_electric_rules_check` | Nelson / Western Electric rule violations |
| `gage_rr_msa_calculate` | Full %R&R + MSA report |
| `gauge_rr` | Quick gage R&R shortcut |
| `measurement_analyze` | Measurement system analysis |
| `cmm_plan` | CMM probe-path generation |
| `gdt_validate` | GD&T tolerance validation |
| `tolerance_stack` | Worst-case / RSS tolerance stack-up |
| `fai_run` | Full first-article inspection pipeline |
| `fai_evaluate_characteristic` | Per-characteristic FAI evaluation |
| `fai_generate_forms` | AS9102 / PPAP form generation |
| `fai_disposition` | Accept / conditional / reject disposition |
| `finish_target_advise` | Ra grade recommendation (N1–N12 per ISO 1302) — use instead of the absent `surface-finish.ts` registry |
| `hypermill_spc_bridge_run` | hyperMILL → SPC bridge |
| `hypermill_fai_bridge_run` | hyperMILL → FAI bridge |
| `data_quality_validate` | Input data integrity check |
| `bias_correct` | Measurement bias correction |
| `roundness_cylindricity_sampling_plan` | Sampling plan for roundness/cylindricity |
| `change_point_detection_run` | CUSUM/Bayesian change-point detection |
| `iso13485_qms_validate` | ISO 13485 QMS validation |
| `as9100_traceability_create` | AS9100 traceability record |
| `psn_synergy_inspect` | PSN leg coverage health check |

---

## §4 Canonical constants + data paths

**NEVER inline numeric thresholds** — import from the engine:

| Constant | Source (verified) | Value |
|----------|-------------------|-------|
| `MIN_ACCEPTABLE_CPK` | `CpkPredictionGateEngine.ts` lines 24/26 | 1.33 |
| `IDEAL_CPK` | `CpkPredictionGateEngine.ts` lines 24/26 | 2.0 |
| Role-floor Cpk (operator ≥1.0 / setup ≥1.33 / programmer ≥1.67) | `EmployeeMachineDomainAcademyEngine.ts` — import, never inline | see engine |
| Control-chart constants A2/D3/D4 | `SPCProcessCapabilityEngine.getA2/getD3/getD4(subgroupSize)` — computed, NOT a flat file | call the method |

**Data stores (query, never full-read):**

| Store | Access | Size |
|-------|--------|------|
| ToleranceDB (ISO 286, 260 entries) | `prism_data:database_search` | — |
| FormulaDB (499 entries) | `prism_data:database_search` | — |
| PrismReferenceDB (13,920 entries) | `prism_data:database_search` | — |

**Phantom paths — do NOT create or import:**
- `src/data/cpk-thresholds.ts` — does not exist; thresholds are exported consts in `CpkPredictionGateEngine.ts`
- `src/data/spc-constants.ts` — does not exist; chart constants are methods on `SPCProcessCapabilityEngine`
- `src/registries/surface-finish.ts` — does not exist; use `prism_quality:finish_target_advise`

---

## §5 Domain gotchas / safety rails

1. **Cpk ≠ Cp.** Cpk = min((USL−μ)/3σ, (μ−LSL)/3σ) — penalizes off-center processes. Cp ignores bias. Never report Cp as Cpk; the gate rejects on **Cpk**. (`CpkPredictionGateEngine.computeCpk`)
2. **Gate on conservative lower-bound, not point-estimate Cpk.** `SPCProcessCapabilityEngine` returns a Monte-Carlo lower-bound propagating measurement uncertainty per ISO 22514-1. A marginal process passes on gauge noise if you gate on the point estimate.
3. **Control-chart constants are subgroup-size-dependent.** UCL/LCL = `mean ± A2·avgRange`; A2/D3/D4 change with n. Using n=5 constants on n=3 data silently inflates/deflates limits. Always call `getA2/getD3/getD4(actualSubgroupSize)`.
4. **%R&R before trusting any Cpk.** %R&R > 30% = measurement system cannot resolve the tolerance; the Cpk number is noise. Run `prism_quality:gauge_rr` before the capability study, not after.
5. **Cpk gates STRATEGY SELECTION pre-cut** (`strategy_cpk_gate` / `strategy_cpk_filter`). The gate runs at CAM strategy-selection time and rejects candidate strategies below 1.33 before a chip is cut — cross-galaxy edge into mill/lathe/wedm/cam.
6. **Cpk and S(x) co-evaluate independently.** A part can be capable (Cpk≥1.33) yet unsafe (S(x)<0.70) or vice-versa. Both must pass; Cpk never substitutes for the safety gate.

---

## §6 What NOT to do

- **DO NOT** report Cp as Cpk — they measure different things; Cp ignores process bias.
- **DO NOT** inline `1.33` or `2.0` — import from `CpkPredictionGateEngine.ts` (`MIN_ACCEPTABLE_CPK`/`IDEAL_CPK`).
- **DO NOT** gate on the point-estimate Cpk — gate on the conservative lower-bound from `SPCProcessCapabilityEngine`.
- **DO NOT** use fixed n=5 control-chart constants for n≠5 subgroups — call `getA2/getD3/getD4(subgroupSize)`.
- **DO NOT** run a capability study before validating the gauge (%R&R < 30% required first).
- **DO NOT** duplicate SPC chart logic into the shop-floor galaxy — shop-floor owns the live stream; quality owns the offline math.
- **DO NOT** soften the S(x) safety gate to satisfy a Cpk requirement — both gates are unconditional.
- **DO NOT** create `src/data/cpk-thresholds.ts` or `src/data/spc-constants.ts` — confirmed phantom paths.
- **DO NOT** reference `SurfaceFinishPredictionEngine` or `QualityOrchestratorEngine` — not on disk.
- **DO NOT** use OLS directly on CMM probe clouds without outlier rejection (see §7 CMM workflow).
- **DO NOT** re-OCR Docustrata — search `manifest.json` + `.index/` instead.
- **DO NOT** write to `knowledge/tribal/*.md` directly — use `prism_knowledge:tribal_capture slot=<nato>`.

---

## §7 Domain workflow / pipeline contract

### CMM → GD&T workflow
```
CMMImportEngine → parse probe cloud
  → prism_algorithm:spatial_ransac_fit   ← MANDATORY for outlier-robust flatness/straightness/parallelism
  → GDTStackupEngine → tolerance stack-up report
```
RANSAC rejects bad probe touches that wreck ordinary LS fit; reports RMS orthogonal residual as the
form-error metric. Never pipe raw probe cloud to GDTStackupEngine without RANSAC outlier rejection.

### FAI pipeline
```
fai_run → fai_evaluate_characteristic (per feature) → fai_generate_forms → fai_disposition
```
First-article gate runs before recurring SPC. FAI disposition drives `ERPQualityEngine` customer/job records.

### Pre-cut Cpk gate (cross-galaxy)
```
CAM strategy candidates → prism_quality:cpk_predict (predicted σ vs tolerance)
  → reject if Cpk < MIN_ACCEPTABLE_CPK (1.33) → strategy_cpk_gate feeds back to cam/mill/lathe/wedm
```

---

## §8 Tribal + corpus pointers

**Wiki entries (query before re-deriving):**
- `knowledge/wiki/quality/quality-foundations.md` — NIST/SEMATECH-verified Cp/Cpk/control-chart formulas
- `knowledge/wiki/code-tribal/quality-first-article-inspection-and-spc-cadence.md`
- `knowledge/wiki/code-tribal/math-statistical-methods-spc-doe-capability.md`
- `knowledge/wiki/code-tribal/math-metrology-measurement-uncertainty.md`
- `knowledge/wiki/architecture/dispatcher-quality.md` — full dispatcher action schema

**Tribal search:** `prism_memory:semantic_search query="cpk|spc|gauge|capability|fai|control-chart" topK=10`

**JM Die ground-truth paths:**
- Setup sheets with inspection records: `JM DIE/SETUPS/`
- Closed order docs (dimensional/cert records): `Docustrata/JMD Orders Closed` — search `manifest.json` + `.index/`; never re-OCR
- CMM programs: `prism_data:database_search` over `mcp-server/data/jm-die-database/` index with `cmm|inspection|fai`
- Access via `prismSelfAwarenessEngine.getJMDieCustomerPath()` — NEVER Glob the 24K-file tree

**RANSAC algorithm pointer:** `prism_algorithm:spatial_ransac_fit` — detail: `reference_tango_algo_synergy_batch_2026_05_29`

---

## §9 Cross-galaxy edges (PSN)

| Edge | Direction | Bridge action |
|------|-----------|---------------|
| quality ↔ mill/lathe/wedm/cam | bidirectional PRE-cut | `strategy_cpk_gate` / `strategy_cpk_filter` — predicted σ feeds gate; reject feeds back strategy choice |
| quality ↔ shop-floor | split ownership | quality = offline capability math; shop-floor = live SPC stream. Do NOT duplicate chart logic. |
| quality → business/ERP | downstream | `ERPQualityEngine` ingests SPC/FAI → customer + job quality records; drives quoting risk signal |
| quality ↔ compliance-safety | co-evaluation | Cpk + S(x) gates evaluate independently; both must pass; neither substitutes for the other |
| quality ← xray/blueprint-vision | upstream | dimensional tolerances extracted from blueprints feed capability study inputs |

---

## §10 Closed-loop integration (india)

On any quality improvement finding: `xproc_outcome_publish {slot:'<nato>', domain:'quality'}` // UNVERIFIED — grep qualityDispatcher.ts before relying on this action name.
Tribal capture: `prism_knowledge:tribal_capture slot=<nato> domain=quality`. Detail: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## §11 Test commands

```bash
cd mcp-server && rtk npx vitest run -t "Quality|SPC|Cpk|CMM|FAI|GageRR|MSA"
# dispatcher smoke-test (no server needed):
node -e "import('./src/tools/dispatchers/qualityDispatcher.js').then(m => console.log('dispatcher ok'))"
```

---

## §12 Known bugs / open threads

- `surface-finish.ts` registry absent from disk — `prism_quality:finish_target_advise` is the live substitute. If a registry is ever created, verify path in `src/registries/` first.
- `SurfaceFinishPredictionEngine` name does not exist — `SurfaceFinishPredictorEngine.ts` is the real file.
- Pre-2026-06-08 stub cited `src/data/cpk-thresholds.ts` + `src/data/spc-constants.ts` — both confirmed phantom; do not recreate.

---

## §13 AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs quality "<question>"
```

Domain Ollama routing:
- Summarize SPC report / classify defect / draft FAI narrative → `gpt-oss:20b`
- Engine/test/hook code → `qwen2.5-coder:32b`
- Deep domain reasoning (ISO 22514 / RANSAC math / MSA study design) → `gpt-oss:120b`
- Cpk/control-limit numerics stay deterministic — never route to LLM for the arithmetic itself
