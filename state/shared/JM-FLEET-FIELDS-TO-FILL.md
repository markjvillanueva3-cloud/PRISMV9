# JM Die Fleet — Fields Truly Unmeasured (Mark's Input Needed)

**Generated:** 2026-05-02
**Scope:** Fields where NO source (A/B/C) yielded a value. Excludes inferred-with-confidence fields.

---

## CRITICAL (blocks physics-accurate planning) — 1 hour effort

### Spindle envelope (per machine, all 15)
- `physics_envelope.spindle.rated_power_kw` — currently A-defaulted only for Multus (22 kW assumed)
- `physics_envelope.spindle.max_torque_nm`
- `physics_envelope.spindle.torque_curve_data_available` — needs spindle dynamometer or OEM curve scan
- `physics_envelope.spindle.last_balance_check`

### Travels (per machine, all 15)
- `physics_envelope.travels.{x,y,z,a,b,c}_mm` — populated only for Multus B250II (factory spec). Others ALL unmeasured.
- `physics_envelope.rapids_mm_per_min`
- `physics_envelope.max_feed_mm_per_min`
- `physics_envelope.accel_limits_g`

### Accuracy capability (per machine, all 15)
- `accuracy_capability.iso230_positioning_um` — needs laser interferometer
- `accuracy_capability.volumetric_error_um` — needs ballbar
- `accuracy_capability.last_ballbar`

---

## HIGH (production scheduling + tribal capture) — 30 min effort

### Production state (per machine, all 15)
- `production.shift_schedule` — e.g., "M-F 6am-6pm, day shift only"
- `production.primary_operator` — name
- `production.secondary_operators` — list
- `production.last_maintenance` — date
- `production.next_pm_due` — date

### Identification (per machine, all 15)
- `year` — manufacture year (asset depreciation, parts availability)
- `serial` — only if Mark wants asset-tracking; otherwise null

### Calibration (per machine, all 15)
- `calibration.warmup_duration_min` — currently text-only ("safe start sequence")
- `calibration.characteristic_chatter_freq_hz` — needs accelerometer tap test
- `calibration.thermal_drift_um_per_hour` — needs warm-up logging
- `calibration.last_full_calibration` — date

---

## MEDIUM (workholding + probing capability)

### Workholding inventory (per machine, all 15)
- `attached_hardware.workholding.standard_chucks` — only LTH-01 inferred ("3-jaw hydraulic")
- `attached_hardware.workholding.standard_jaws`
- `attached_hardware.workholding.fixture_plates`
- `attached_hardware.workholding.vises`

### Probing (per machine, mostly unknown)
- `attached_hardware.probing.spindle_probe` — model (e.g., Renishaw OMP-40)
- `attached_hardware.probing.tool_setter` — model (e.g., Renishaw NC4)

### Coolant capability (per machine, partial)
- `attached_hardware.coolant.tsc_pressure_bar` — through-spindle coolant pressure
- `attached_hardware.coolant.mql_capable` — minimum-quantity-lubrication capability

### Lathe-specific (per LTH-01..07 + Multus)
- `attached_hardware.lathe_specific.steady_rest` — model list
- `attached_hardware.lathe_specific.bar_feeder` — model

---

## LOW (post-processor configuration gap)

### VMC-05 Roku-Roku HC 658-II — no post wired
- `software.preferred_post` = null (currently)
- Need: existing Mastercam/Fusion/HyperMILL post for Fanuc 31i-B5 controller
- Current programs (1,108 NC files) point to Mastercam (most likely) — need post file path

### LTH-07 Multus B250II — two post versions exist
- `software.preferred_post` = "POSTS/OKUMA_MULTUS_B250IIW-Ai-Enhanced-Fixed.cps" (PRISM-modified)
- In-shop alternate = "CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps" (163 KB, 2024-03 production)
- Mark — which is current production-of-record?

---

## INFORMATIONAL (nice-to-have for full traceability)

### Calibration warmup macros
- Inline G-code or external file reference for each machine (currently only "JM Die Okuma safe start" pattern captured)

### Quirks (per-machine tribal knowledge)
- LTH-07 Multus has 5 quirks captured. Other 14 machines have 0–1 each.
- `/shop-knowledge` skill should be run against each operator to extract more.

### Linkages
- `linkages.programs_in_jm_die` — per-machine breakdown unmeasured (only top-folder counts: Lathe=19,839 / Haas=533 / Multus=18 / WEDM=4,058 / Roku-Roku=1,108)
- `linkages.recent_jobs_30d` — needs ERP integration
- `linkages.preferred_for_processes` / `avoid_for_processes` — partial (only LTH-01, LTH-07 captured)

### Billing
- `billing.shop_rate_per_hour` — global memory says $55 labor + $30 OH; per-machine premium for multitasking inferred ($95 for Multus)
- `billing.setup_rate_per_hour` — global $65; per-machine variation unmeasured

---

## SUMMARY OF GAPS

| Priority | Field-machines combos | Effort to close |
|----------|----------------------:|-----------------|
| Critical (physics) | ~12 fields × 15 machines = 180 cells | 1 hour interview + factory spec lookup |
| High (production) | ~7 fields × 15 = 105 cells | 30 min walking floor with Mark |
| Medium (hardware) | ~10 fields × 15 = 150 cells | 1 hour shop tour with photos |
| Low (posts) | 2 specific items | 5 min file lookup |
| **Total auto-populated cells** | ~120 / 270+ schema cells | **44% complete from A+B+C alone** |

**Recommendation:** Run a single 60-minute walk-through with Mark, photographing each machine's nameplate, tool-changer label, probe model, and current operator's clipboard. That collapses the Critical+High+Medium gaps to near-zero in one session.
