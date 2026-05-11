# REVENUE-MS-TRAIN — Training Cadence Layer (Orthogonal to MS0-MS5)

> **Status:** NEW milestone, Round-4 spec revision.
> **Theme:** Per-shop / per-machine / per-tool calibration + LoRA adapter pipeline + Master-Post training overlays + tribal-knowledge continuous capture.
> **Orthogonality:** Touches every revenue product (SFC / Master Post / WEDM / Lathe / Mill / Quote-to-Ship). MS0-MS5 deliver envelope-baseline behavior; MS-TRAIN converts envelope -> per-customer fit (the value-add that justifies premium SaaS pricing).
> **Customer-readable promise:** "Day 1 you get ISO-baseline physics + envelope safety margins. Day 30 you get your machines' actual Kienzle kc11, your operators' actual style, your tool-life curves. Day 90 you get conformal-validated autonomy."

---

## 0. Why MS-TRAIN exists separate from MS0-MS5

Round-3.5 agent-3 forensics confirmed: **the canonical physics envelope (`constants.ts` kc11 P=1800 / M=2100 / K=1100 / N=700 / S=2800 / H=3200 + Taylor C/n table) is shop-AVERAGE not shop-SPECIFIC**. Without per-shop fit:
- Gilbert economic speed `v = (C / ((n/(1-n))*(t_ch + t_c*K)))^(1/n)` runs on shop-AVERAGE C/n -> 12-18% real cost penalty vs fitted.
- Stability Lobe Diagrams (SLD) fall back to MachineToolEnvelopeEngine conservative envelope -> 20-30% productivity left on the table.
- LoRA adapter weights are absent (0 .safetensors files) -> dispatchers silently return base-model output.

MS-TRAIN is the **only milestone that creates the supervision pipeline + the calibration cadence + the validation gates that lift the SaaS tier from envelope-pricing to fit-pricing.**

---

## 1. The 11 SFC Training Nodes (Round-3.5 agent-3)

| # | Node | Data Source | Cadence | Fit Method | Validation Gate | Fallback |
|---|------|-------------|---------|------------|-----------------|----------|
| 1 | Kienzle kc11 per-shop per-material | Spindle power kW via MTConnect/FOCAS/THINC, 8 test cuts per material, h in [0.05, 0.4] mm | **One-shot at onboarding** + on-trigger when new supplier/material lot (>5% deviation) | Linear regression in log-log: `ln(Fc) = ln(kc11) + (1-mc)*ln(h)`. Weighted least-squares 1/sigma_F^2. Bootstrap n=500 CI. Per-shop multiplicative offset vs ISO baseline. | R^2 > 0.92 on holdout + bootstrap CI half-width <8% of mean kc11 + Bayesian prior penalty if deviation >30% from ISO baseline | <3 valid cuts: emit `kienzle.fallback.baseline_only`, stack with 12% conformal margin |
| 2 | Taylor C, n per-machine per-tool-class | Tool-life log per (machine, tool-class): (Vc, T-to-Vb=0.3mm). 21 machines x 6 tool-classes = 126 tuples; need >=5 trials each = 630 trials | **Continuous accumulation** + weekly regression refit + monthly cross-validation | Log-linear: `ln(T) = ln(C) - (1/n)*ln(Vc)`. Hierarchical Bayesian prior centered on constants.ts. Posterior shrinkage weighted by sample count. | Posterior CI on n excludes n=0 and n>0.6. R^2 > 0.80. Cross-validate on held-out 20%. | Machine-specific -> shop-average -> ISO baseline. Confidence tier `envelope|shop-avg|machine-specific` in every Gilbert call. |
| 3 | SLD per-machine per-toolholder-stack | Hammer-impulse FRF (PCB 086C03 + PCB 356A16). 21 machines x ~8 stacks = 168 measurements. RCSA per Schmitz Ch.4 extrapolates to all stack combos. | **One-shot at shop install** (1 day/machine) + on-trigger after spindle service + monthly 3-stack spot-check | FFT -> rational fraction polynomial modal extraction -> Altintas-Budak `Re[Lambda(omega)]` eigenvalues -> 2D (RPM, ap) stability map | Predicted chatter onset RPM within +/-8% of 3 verification cuts/machine. Mode count >=3 within 0-4000Hz. | Class-default conservative SLD from MachineToolEnvelopeEngine, telemetry tier `sld-class-default` |
| 4 | Thermal growth per-machine per-axis | Touch-probe Z at artifact every 5 min for 2h warmup. Spindle temp + ambient. 21 machines x 4-5 axes = ~90 curves. | **One-shot at onboarding** (2h/machine) + monthly 30-min spot + seasonal full re-cal | 1st-order linear: `dpos(t,Tsp) = alpha*(Tsp - Tref) + beta*(Tamb - Tref_amb)`. OLS. Real-time G10 L20 work-offset compensation. | RMSE <5um (tight-tol) or <15um (general). alpha plausible (1-3 um/C cast-iron, 5-12 um/C spindle). | Worst-case 25um drift over 2h baked into tolerance stack. Block IT5/IT6 parts until fit complete. |
| 5 | Conformal recalibration (drift detection) | Predicted-vs-actual log per (op, machine, material, tool). MTConnect part-program-complete event. | **Continuous** + on-trigger when rolling-window deviation > 3sigma over 50 samples OR 5-sample run all >1sigma same direction | Adaptive Conformal Prediction (Romano 2020 APS — already shipped via `AdaptiveConformalAlphaEngine` commit 03586e2fa). CUSUM drift detector on `\|pred - actual\| / sigma_pred`. | Empirical coverage >= 1-alpha (target 90%). Brier <0.15 binary outcomes. | On drift: widen alpha 0.10->0.15, block dispatcher action until 20-sample recalibration completes, operator alert. |
| 6 | mill_lora rank-16 (qwen2.5-coder:7b base) | JM Die mill .NC/.PRG/.MIN ~8K + SpeedFeedOrchestrator synthetic 1000 combos + MTConnect public ~2K + XPROC-NEURAL-CONNECT outcome-bridge reward signal (commit 3b21228f7) | **At-onboarding** initial train (8-12h A100) + **monthly fine-tune** incremental (1-2h) | QLoRA r=16, alpha=32, dropout 0.1, attention only (q_proj, v_proj). 3 epochs, lr=2e-4 cosine. CE on S/F/strategy + KL-penalty vs base. | Token-level S/F accuracy >75% (+/-5% band). Strategy F1 >0.82. Must show >8% absolute lift vs no-adapter baseline. | `lora-weights-presence-check.mjs` blocks when adapter missing. Returns `{adapter_loaded: false}`. Routes to base qwen2.5-coder unfine-tuned + `lora.fallback.weights_missing` telemetry. |
| 7 | lathe_lora rank-8 | JM Die Mazak/Okuma .MIN with `$<INTERNAL>%` header (~3-5K). `LatheLoRADatasetBuilderEngine` exists. | At-onboarding + monthly fine-tune | QLoRA r=8, alpha=16, same schedule as mill_lora. Narrower surface (turning + threading + grooving + chip-control). | Chip-control regime F1 >0.85 (ISO 3685 favorable/unfavorable/unacceptable). S/F accuracy >75%. | Base model + `lora.fallback.weights_missing` telemetry. |
| 8 | wedm_lora rank-4 | 26 JM Die WEDM programs + 46 tribal tips + 14 MIT-cited formulas + synthetic pulse-energy sweeps across 5 dialects | At-onboarding only initially; **quarterly refit** once corpus >100 programs | QLoRA r=4, alpha=8 (rank-4 minimizes overfit on small corpus per LoRA-FA low-shot findings) | Cycle-time MAPE <15% on held-out 5-program test. Surface-finish Ra within +/-0.4um. | Defer to physics-only WEDMOrchestrator + tribal-tip retrieval. |
| 9 | cam_lora ensemble (op_classify + strategy_recommend + tool_select, each rank-8) | Mastercam 45 ops + hyperMILL 25 ops + CamStrategyEngine recommendations as weak supervision | At-onboarding + **quarterly refit** | Per-task adapters, ensemble at inference via Bayesian model averaging weighted by per-task held-out accuracy | Op classify top-1 >0.88. Strategy top-3 recall >0.90. Tool-select top-5 >0.85 within library. | CamStrategyEngine rule-based path. |
| 10 | Tribal continuous capture | Operator text notes + Whisper voice-to-text (@xenova/transformers local), post-op triggered on CAM-default override or unusual outcome | **Continuous** + nightly batch ingestion into `wiki/code-tribal/` + Qdrant `prism_kg_nodes` | No model fit; embedding-only. Xenova all-MiniLM-L6-v2 384-dim. Tag extraction via Ollama qwen2.5-coder:7b zero-shot. Promote to playbook rules at >=3 citations. | `/wiki-lint` (existing). Anti-dup via cosine >0.85 flag-for-merge. Tag-extraction FP rate <10% monthly human audit. | Manual text-only operator form (no Whisper). |
| 11 | Unified telemetry-ingestion fabric | 5-protocol adapter: MTConnect / OPC-UA / Fanuc-FOCAS / Okuma-THINC / Heidenhain DNC | **Continuous** | Stream consolidation -> Qdrant (vector) + DuckDB (time-series) + Stop-hook calibration triggers | <2s end-to-end latency (extend MTConnectRoundTripLatencyBenchEngine to all 5 protocols). Zero dropped events over 24h. | Per-protocol degrade: when one adapter down, mark per-machine telemetry tier `degraded-{protocol}`, continue with surviving channels. |

---

## 2. Master Post Per-Controller Training (Round-3.5 agent-5)

### 2.1 Rule-based dialect translation (5 controllers — published specs)

| Controller | Engine | Training Method | JM Die Examples | Priority |
|------------|--------|-----------------|-----------------|----------|
| Hurco WinMAX v10 | E0182 `HurcoV11MillMasterPostEngine` | rule + prompt overlay | 4,200 | P0 |
| Okuma OSP family (P200/P300/P500/U10) | E0355 `OkumaB250LatheMasterPostEngine` + `PPOkumaTurningPostEngine` | rule + LoRA | 11,900 | P0 |
| Mitsubishi W31MV-2 (Wire EDM) | E0337 `MitsubishiMV1200RWireEDMMasterPostEngine` + E0529 `WEDMPostMitsubishi` | rule | 2,300 | P0 |
| Haas PRE-NGC | **MISSING — build in MS-TRAIN** | rule | 2,500 | P1 |
| Fanuc 31i-B5 | **MISSING — build in MS-TRAIN** | rule | 400 | P0-external |
| Mitsubishi FP80S / C30EA-2 (Sinker) | **MISSING** | rule + LoRA | 3,100 | P1 |

**Rule-based training**: each engine's `emit()` method is parameterized by a controller-dialect manifest JSON (modal-state machine + canonical-syntax table + safety-block templates). Training = curating the manifest, not gradient-descent.

### 2.2 LoRA fine-tune for operator-style preferences

| Controller | Adapter | Style Signal |
|------------|---------|--------------|
| Okuma OSP | `okuma_operator_lora` rank-4 | `$<INTERNAL>%` header convention, edit-on-controller patterns (operator hand-edits in JM archive), G10 L2 work-offset placement style |
| Mitsubishi sinker FP80S/C30EA-2 | `mitsubishi_sinker_lora` rank-4 | Pulse-table preset selection, jump-flush trigger thresholds, electrode-wear compensation cadence |

### 2.3 Tribal prompt overlays (3 known quirks)

| Overlay | Rule | Test |
|---------|------|------|
| `hurco_m30_rapid_home` | After M30, Hurco WinMAX leaves spindle at last position. JM Die convention: emit `G0 X0 Y0 Z0` immediately after M30 to return to safe park. | Roundtrip test: `M30\n` in our output triggers automatic park insertion. |
| `okuma_min_internal_header` | Okuma .MIN files MUST have `$<INTERNAL>%` as line 1 or controller refuses to load. Reference: `reference_jm_die_program_save_practice` memory. | First-line regex `^\$<INTERNAL>%$` on every Okuma emit. |
| `haas_proven_naming` | Haas operators rename `PROVEN PRG/` folder when a program is validated for production. Distinguish draft vs proven in our archive ingestion + downstream confidence-tier in dispatcher output. | Archive ingest tags `prg_status: draft|proven` based on parent folder name. |

---

## 3. Onboarding-Day Plan (~10h wall-clock)

| Step | Time | Activity | Engine(s) | Deliverable |
|------|------|----------|-----------|-------------|
| 1 | 08:00-08:30 | Pre-flight: MTConnect agents on 21 machines (Mazak Smooth native, Okuma THINC needs adapter, Fanuc FOCAS-2-MTConnect bridge, Haas NGC native). Verify spindle-kW channel. | `MTConnectRoundTripLatencyBenchEngine` + **new `SpindlePowerSensorIngestEngine`** | 21 machines emitting SHDR stream at <2s latency |
| 2 | 08:30-11:30 | FRF measurement sweep: hammer + accelerometer at tool tip for 3 representative toolholder stacks per machine (CAT40 ER32 short, CAT40 shrink-fit long, CAT40 facemill). 21 x 3 = 63 measurements @ ~8 min each, 2 technicians in parallel = 4.5h wall-clock. | **new `FRFMeasurementEngine`** + **new `RCSAStabilityPredictorEngine`** | 63 FRF curves stored, 63 SLD maps via Altintas-Budak solver, RCSA extrapolation to all (machine, stack) combos |
| 3 | 11:30-13:00 | Lunch + thermal warmup probe routines started in background (each machine autonomous 2h warmup-G-code with touch-probe Z every 5 min) | **new `ThermalGrowthCalibrationEngine`** | 21 thermal curves alpha/beta per (machine, axis) stored to shop-config |
| 4 | 13:00-15:30 | Kienzle test cuts on 8-10 unique supplier-material combinations. Operator performs 8 cuts per material at varying h, spindle-power telemetry auto-captured. | **new `KienzleKc11FitEngine`** | 8-10 per-shop kc11 values + multiplicative offsets vs ISO baseline + bootstrap CIs |
| 5 | 15:30-17:00 | Bulk ingest JM Die archive (24,545 files) for LoRA pre-training. mill_lora + lathe_lora datasets built via existing `LatheLoRADatasetBuilderEngine` + **new `MillLoRADatasetBuilderEngine`**. Synthetic augmentation via SpeedFeedOrchestrator sweep. | **new `LoRATrainerOrchestratorEngine`** + existing dataset builders | Datasets prepared, training jobs queued |
| 6 | 17:00-18:00 | Operator onboarding: 1h training on shop-floor UI for tribal-knowledge capture (text + voice). Demo predicted-vs-actual feedback loop. Set first-month soft-launch expectations (advisory mode only — no autonomous parameter override until conformal coverage validated). | **new `TribalKnowledgeCaptureEngine`** + existing wiki infrastructure | Operators able to submit tribal tips, voice-to-text working |
| 7 | overnight 18:00-08:00 | LoRA training jobs run (8-12h on customer GPU or PRISM cloud). Conformal baseline established from first day of production data (replay at dawn). | `LoRATrainerOrchestratorEngine` + `AdaptiveConformalAlphaEngine` | mill_lora r=16, lathe_lora r=8 adapter_model.safetensors checkpoints in `mcp-server/data/models/<domain>-lora/<YYYY-MM-DD>/`. Conformal alpha=0.10 (90% coverage). |

**Total wall-clock: ~10h on-site + overnight automated training. Pre-flight (MTConnect agents) MUST be completed week-prior.**

---

## 4. Monthly Maintenance (~2h operator overhead + 4-6 automated jobs)

| Task | Cadence | Duration | Engine |
|------|---------|----------|--------|
| LoRA fine-tune incremental | 1st Monday/month | 1-2h single-GPU | `LoRATrainerOrchestratorEngine`. Gate: must show >8% lift vs prior month or rollback. |
| Taylor C/n refit per (machine, tool-class) | weekly auto when new data points | <5 min compute | `TaylorConstantFitEngine`. Alert on >20% shift (tool brand change or spindle wear). |
| Kienzle drift check | monthly 3-lot spot | 30 min cut-test | `KienzleKc11FitEngine` + `ConformalDriftDetectorEngine`. >10% deviation -> full re-fit. |
| Thermal model spot-verify | monthly single-axis + seasonal full | 30 min spot, 2h full | `ThermalGrowthCalibrationEngine`. RMSE >150% baseline -> full re-cal. |
| SLD 3-stack spot-check | monthly | 45 min (3 x 15 min) | `FRFMeasurementEngine` + `RCSAStabilityPredictorEngine`. >15% modal drift -> full re-FRF. |
| Conformal coverage audit | weekly automated | automated | `AdaptiveConformalAlphaEngine` + `ConformalDriftDetectorEngine`. Cells with <85% empirical coverage flagged. |
| Tribal wiki nightly sync | nightly | automated (Ollama >=70%) | `TribalKnowledgeCaptureEngine` + `/wiki-ingest /wiki-lint /wiki-morning`. |
| Cross-validation health report | 1st of month | automated overnight | **new `CalibrationHealthReportEngine`** + `HookTelemetryEngine`. Health dashboard: R^2/RMSE/coverage/F1 per node + MoM delta + regression alerts. |

**Operator overhead breakdown:** 30 min Kienzle + 30 min thermal + 45 min SLD + ad-hoc tribal capture (background) = **~1h45m/month direct + ~15m ambient = ~2h/month**.

---

## 5. Three Critical Data Gaps (Round-3.5 agent-3)

1. **Spindle-power telemetry availability.** JM Die does not currently log spindle kW. First-day onboarding MUST install MTConnect agents + verify kW channel on all 21 machines BEFORE Kienzle fit can run. Risk: 2-3 older Fanuc machines may need clamp-on CT retrofit (~$400/machine, ~1 day install). **Without this gap closed, node #1 (Kienzle) is blocked entirely** -> envelope-only physics with 12% conformal margin (still ships but no per-shop fit -> no premium tier justification).

2. **Tool-life log cold-start.** No machine currently logs (Vc, T_failure) trials. Taylor C/n fit requires >=5 data points per (machine, tool-class) tuple = 630 trials at JM Die for full coverage. **Cold-start 6-month accumulation period; in interim rely on hierarchical Bayesian posterior shrunk toward ISO baseline.** Gilbert economic speed formula (Round-3 agent-5) operates on baseline-only for first 6 months -> 60-70% of premium value-add unrealized until corpus matures. **Mitigation:** initial 30-day operator-incentive program to log tool-change reasons + chip-color observations -> bootstraps the corpus.

3. **FRF measurement requires shop-floor downtime + skilled technician.** JM Die may not have either in-house. Onboarding-day 4.5h sweep is critical-path and customer must commit. **Without FRF, SLD falls back to class-default conservative envelope leaving 20-30% productivity on the table.** Mitigation options: (a) PRISM technician travels on-site (billable as onboarding-day premium), (b) train one JM machinist on FRF protocol (3-day cert course, one-time), (c) accept class-default SLD and re-visit FRF in month 3 once revenue justifies the downtime cost.

---

## 6. Telemetry Pipeline (Sensors + Protocols + Ingestion)

### Sensors required
| Sensor | Purpose | Native / Retrofit |
|--------|---------|-------------------|
| Spindle power meter (kW) | Kienzle fit primary channel | Native on Mazak Smooth / Okuma OSP / Haas NGC. Clamp-on CT (~$400) for older Fanuc. |
| Impact hammer PCB 086C03 + tri-axial accelerometer PCB 356A16 | FRF at tool tip | Retrofit (one set per shop, mobile cart) |
| Touch probe Renishaw OMP60 (or equivalent) | Thermal-warmup probe + workpiece alignment | Usually present; verify per machine |
| Spindle temperature thermocouple | Thermal model T_spindle | Internal on most controllers; expose via FOCAS/THINC parameter |
| Ambient temperature DS18B20 1-wire | Thermal model T_ambient | $5 retrofit per machine column |
| Shop-floor UI + microphone | Tribal capture (text + Whisper voice) | Existing `mcp-server/web/` frontend + commodity USB mic |
| Operator tool-life logger | Vb=0.3mm or chip-color shift trigger | UI-driven, no hardware sensor needed |

### Protocols (5)
1. **MTConnect** — preferred (Mazak Smooth, Haas NGC, modern controllers)
2. **OPC-UA** — Siemens 840D and modern installations
3. **Fanuc-FOCAS** — legacy Fanuc 0i / 16i / 18i / 21i / 30i / 31i
4. **Okuma-THINC** — Okuma OSP P200 / P300
5. **Heidenhain DNC** — Heidenhain TNC 530 / 640

### Ingestion engine
**`TelemetryIngestionOrchestratorEngine`** (new) — consolidates the 5 protocol adapters into a unified event stream:
- Output sinks: Qdrant (vector embeddings for retrieval) + DuckDB (time-series for fit/regression) + Stop-hook triggers (calibration cadence).
- Wires to `prism_intelligence:telemetry_ingest` + `prism_session:sensor_status_poll`.
- Existing `MTConnectRoundTripLatencyBenchEngine` (E0341) measures one protocol's RTT; this new engine is the ingestion fabric across all 5.

---

## 7. Acceptance Gates (Per Training Cycle)

Every calibration cycle MUST emit a validation report consumed by `CalibrationHealthReportEngine`:

```json
{
  "cycle_id": "<uuid>",
  "node": "kienzle | taylor | sld | thermal | conformal | mill_lora | lathe_lora | wedm_lora | cam_lora | tribal | telemetry",
  "fitted_at": "<iso8601>",
  "sample_count": <int>,
  "metrics": {
    "r_squared": <number>,
    "rmse": <number>,
    "bootstrap_ci_half_width_pct": <number>,
    "empirical_coverage_pct": <number>,
    "f1_score": <number>,
    "month_over_month_delta_pct": <number>
  },
  "validation_gate_passed": <boolean>,
  "fallback_engaged": <boolean>,
  "confidence_tier": "envelope | shop-avg | machine-specific | conformal-validated",
  "regression_alert": <boolean>
}
```

**Top-level gate:** every dispatcher action that consumes a calibrated value attaches its `confidence_tier` to the response. Customer-facing UI displays the tier badge ("envelope" gray / "shop-avg" amber / "machine-specific" green / "conformal-validated" gold). This is the **value-perception driver** for the premium SaaS upgrade.

**Conformal coverage gate:** for each (op, machine, material) cell, empirical coverage MUST be >=85% over rolling 200-sample window. Cells failing this are auto-flagged for either re-fit or downgrade to advisory-only mode (no autonomous parameter override).

---

## 8. Units Enumeration (~20)

| Unit ID | Title | Engine(s) | Cadence |
|---------|-------|-----------|---------|
| U-TRAIN-01 | `KienzleKc11FitEngine` build + wire | new | one-shot |
| U-TRAIN-02 | `TaylorConstantFitEngine` build + wire (hierarchical Bayesian) | new | continuous |
| U-TRAIN-03 | `FRFMeasurementEngine` build (PCB hammer + accelerometer ingestion) | new | one-shot |
| U-TRAIN-04 | `RCSAStabilityPredictorEngine` build (Schmitz Ch.4 RCSA + Altintas-Budak solver) | new | derived from U-TRAIN-03 |
| U-TRAIN-05 | `ThermalGrowthCalibrationEngine` build (alpha/beta OLS, G10 L20 compensation hook) | new | one-shot + monthly |
| U-TRAIN-06 | `ConformalDriftDetectorEngine` build (CUSUM, integrates with shipped `AdaptiveConformalAlphaEngine`) | new | continuous |
| U-TRAIN-07 | `SpindlePowerSensorIngestEngine` + clamp-on CT retrofit protocol | new | continuous |
| U-TRAIN-08 | `TelemetryIngestionOrchestratorEngine` — 5-protocol fabric (MTConnect/OPC-UA/FOCAS/THINC/Heidenhain) | new | continuous |
| U-TRAIN-09 | `LoRATrainerOrchestratorEngine` — QLoRA pipeline (4 adapter classes), GPU job queue, weight versioning | new | onboarding + monthly |
| U-TRAIN-10 | `MillLoRADatasetBuilderEngine` — JM Die mill .NC/.PRG/.MIN -> supervision pairs + synthetic + outcome-bridge | new | onboarding |
| U-TRAIN-11 | mill_lora r=16 first training run + acceptance validation (>8% lift gate) | uses U-TRAIN-09/10 | one-shot |
| U-TRAIN-12 | lathe_lora r=8 first training run (.MIN `$<INTERNAL>%` corpus) | uses U-TRAIN-09 + existing LatheLoRADatasetBuilderEngine | one-shot |
| U-TRAIN-13 | wedm_lora r=4 first training run (26 programs + 46 tips + 14 formulas) | uses U-TRAIN-09 | one-shot |
| U-TRAIN-14 | cam_lora ensemble r=8 (op_classify + strategy_recommend + tool_select) | uses U-TRAIN-09 | one-shot |
| U-TRAIN-15 | `TribalKnowledgeCaptureEngine` — text + Whisper voice + Qdrant embed + Ollama tag-extraction + playbook promotion | new | continuous |
| U-TRAIN-16 | `lora-weights-presence-check.mjs` Stop hook — block dispatcher with `lora.fallback.weights_missing` telemetry | new | continuous |
| U-TRAIN-17 | `CalibrationHealthReportEngine` — monthly cross-validation dashboard, MoM delta, regression alerts | new | monthly |
| U-TRAIN-18 | Master Post LoRA — `okuma_operator_lora` r=4 (Okuma OSP edit-style) + `mitsubishi_sinker_lora` r=4 | uses U-TRAIN-09 | onboarding + quarterly |
| U-TRAIN-19 | Master Post tribal overlays — `hurco_m30_rapid_home` + `okuma_min_internal_header` + `haas_proven_naming` rule packs | new | one-shot config |
| U-TRAIN-20 | Confidence-tier UI badges (envelope / shop-avg / machine-specific / conformal-validated) — dispatcher response decoration + web frontend | new | one-shot |

**Total: 20 units. ~10 new engines + 4 new dataset builders + 1 new Stop hook + 1 reporting engine + 1 telemetry fabric + 2 LoRA operator-style adapters + 3 tribal-overlay rule packs + 1 UI badge layer.**

---

## 9. Wiring (per CLAUDE.md "WIRE TO ALL SOURCES")

| Engine | Dispatchers it must wire to |
|--------|------------------------------|
| KienzleKc11FitEngine | `prism_calc` + `prism_intelligence` (calibration) |
| TaylorConstantFitEngine | `prism_calc` + `prism_intelligence` |
| FRFMeasurementEngine | `prism_calc` + `prism_safety` (stability-relevant) |
| RCSAStabilityPredictorEngine | `prism_calc` + `prism_safety` + `prism_cam` |
| ThermalGrowthCalibrationEngine | `prism_calc` + `prism_safety` |
| ConformalDriftDetectorEngine | `prism_intelligence` + `prism_safety` |
| SpindlePowerSensorIngestEngine | `prism_intelligence` + `prism_session` |
| TelemetryIngestionOrchestratorEngine | `prism_intelligence` + `prism_session` + `prism_memory` |
| LoRATrainerOrchestratorEngine | `prism_ai` + `prism_dev` (build/quality) |
| TribalKnowledgeCaptureEngine | `prism_memory` + `prism_intelligence` |
| CalibrationHealthReportEngine | `prism_dev` + `prism_session` |

`stop-auto-wire.mjs` warns on missing dispatcher refs; `stop_on_unwired_assets.mjs` HARD BLOCKS Stop on zero-dispatcher orphans.

---

## 10. SVI / Omega impact

MS-TRAIN delivers the supervision pipeline that lifts the active milestone bundle from envelope-Omega (~0.75) to fit-Omega (target 1.0 per MEMORY.md). Conformal coverage gate is the binding constraint: any (op, machine, material) cell <85% empirical coverage cannot claim Omega 1.0.
