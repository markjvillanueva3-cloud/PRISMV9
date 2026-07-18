# Closed-Loop Lathe CAM Training Regimen (JM fleet)

**Owner:** kilo (CAM operation-generation) · **Date:** 2026-05-31 · **Status:** regimen plotted; analysis workflow running; build in progress
**Operator goal (/goal /loop /yolo):** train for *every possibility* to generate a lathe part — templates for every toolpath type with variable params + cutting conditions, JM-fleet-focused; learn from all prior CAD/CAM programs how they were written (and where they were inefficient) and optimize to **time + efficiency + safety + accuracy**; generate a CAM operation for ALL operations in Fusion; use PSN + Obsidian + system-viz; write programs against JM-purchased tools (hotel/charlie data).

## Cross-slot coordination (this is multi-domain — kilo orchestrates the CAM-op-generation piece)
- **delta (CAD / Fusion):** ONE Fusion application, two PRISM add-ins on distinct ports. **kilo drives via `PRISM_Fusion_Drive` on `:18365` against a dedicated SCRATCH/CAM document only**; **delta owns `:18362` (PRISMBridgeCAD) + the live CAD docs.** kilo never opens/saves delta's CAD docs. (Bus post deferred — live-bus helper erroring 255; this committed note is the durable coordination record golf merges to delta.)
- **whiskey (Lathe Wizard):** owns lathe physics + safety surfaces (`prism_turning` 373, `prism_thread` 22, `lathe_safety_predicate_evaluate`, `lathe_partoff_safety_gate`, G50/CSS, L/D deflection). kilo's templates DELEGATE cutting-condition + safety to these — never inline constants.
- **india (training):** owns the self-improving substrate; kilo's outcome→corpus→train loop (below) plugs into it.
- **echo (post):** Okuma OSP `.cps` post — kilo's generated ops post through echo's surface.
- **hotel (ERP) + charlie (quoting):** JM-purchased-tool inventory — templates write against tools JM actually owns (workflow `worka68bp` inv:jm-tools locating the canonical source).

## The closed loop (each stage maps to a real PRISM surface — most already built this session)
```
prints + part features (blueprint-vision / CAD)
   │
   ▼
TEMPLATE MATRIX  ← workflow worka68bp (per-op Fusion template + variable params + cutting-rule + JM-tool map)
   │
   ▼
CAM-OP GENERATION  ← CAMDriveRecipeEngine (extend for turning ops) + decision-rules.json
   │  (pick op template → bind JM tool → physics cutting conditions via prism_calc/whiskey → safety gate)
   ▼
FUSION DRIVE  ← PRISM_Fusion_Drive :18365 (scratch doc) → real adsk.cam turning operations
   │
   ▼
VERIFY/SIMULATE  ← Fusion sim + safety S(x) gate (Ω≥0.95, S(x)≥0.98 shop_floor)
   │
   ▼
OUTCOME  ← OutcomeCaptureBus → state/outcomes/cam.jsonl  [BUILT: U-CAM-LOOP-DOMAIN-ISOLATE]
   │
   ▼
LEARN  ← cam_outcome_feedback_compute_delta (corpus delta + retrain signal) [BUILT: U-CAM-LOOP-WIRE-CONSUMER]
   │     + CAMFeatureExtractor → split → train  [BUILT: scripts/cam-build-corpus-and-train.mjs]
   ▼
OPTIMIZE TEMPLATES  ← re-tune decision-rules.json + the template matrix from outcomes (closes the loop)
```

## End-goal objective per operation (the optimization target the templates encode)
1. **Time** — minimize cycle (optimal SFM/feed/DOC, no air-cutting, fewest passes that hold tolerance).
2. **Efficiency** — MRR per the physics envelope; CSS (G96) for facing/turning; right tool for the cut.
3. **Safety** — hard invariants NEVER violated: G50 max-RPM cap under G96, L/D boring-bar deflection limits, parting peck >3×width, spindle torque/power within machine, shop_floor S(x)≥0.98.
4. **Accuracy** — tolerance-stack preserved/tightened (kilo soul); finish via nose-radius+feed; rough/finish split.

## Operation families (the template matrix — workflow producing the per-family Fusion template)
facing · OD_roughing · OD_finishing · ID_boring · drilling/centering · grooving · parting/cutoff · threading.
Each → a Fusion `adsk.cam` turning strategy + fixed params + variable params (driven by material/diameter/tool/finish) + cutting-condition rule (physics-delegated) + JM-tool class + safety gates.

## PSN / Obsidian / system-viz utilization (operator directive)
- **Obsidian (brain):** this regimen + every finding writes to memory (`reference_*`), auto-fed to the vault each Stop — the cross-session training record.
- **PSN (11-leg synergy):** wiki (prior CAM analysis entries) + tribal (lathe tips by domain) + engines (prism_turning/calc/cam) + NN/GNN (corpus → tier-5) + AI router — all feed the regimen; the closed loop IS a PSN self-improving instance for the CAM domain.
- **system-viz:** the template matrix + outcomes surface as nodes; `/system-viz` is the canonical tracking surface for the regimen's progress (ghost roosts for pending templates).

## Build sequence (logical order — built ✓ / next)
1. ✓ Outcome loop closed + clean (cam.jsonl, U-CAM-LOOP-DOMAIN-ISOLATE/-WIRE-CONSUMER/-OUTCOME-TMP-LEAK-FIX).
2. ✓ Corpus + first train runner (scripts/cam-build-corpus-and-train.mjs; spindle R²≈0.3 real).
3. ✓ Feed-units fix (U-CAM-FEED-EXTRACT-FIX) → finding: CSS shop ⇒ mm/rev target.
4. ⏳ **Template matrix** (workflow worka68bp) — per-op Fusion template + JM-tool map.
5. ⬜ **CAMDriveRecipeEngine turning extension** — generate any lathe op from a template (the generator).
6. ⬜ **Closed-loop test harness** — generate→Fusion drive→verify→outcome→learn for a real JM part end-to-end.
7. ⬜ JM-tool-aware generation (hotel/charlie tool inventory binding).
8. ⬜ Feed mm/rev target + full-corpus train (#10) for robust models.

Memory: [[reference_cam_learn_loop_gap_fill_2026_05_31]]. Workflow: `worka68bp` (jm-lathe-cam-template-matrix). Pairs with [[reference_kilo_cam_drive_recipe_engine_2026_05_31]] (the generator substrate) + whiskey lathe galaxy.
