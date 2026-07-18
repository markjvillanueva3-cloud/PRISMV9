# JM Die Wire-EDM — TRUE Print→Program Pipeline (inventory-driven, closed-loop)

> **Owner:** slot:mike (Wire Wizard) · **Date:** 2026-05-31 · **Status:** executable build plan, all paths verified by recon
> **Goal (operator):** train for *every* possibility to generate a wire part; templates for every toolpath type with variable params + cutting conditions; **true print→program for any JM wire part**; auto-generate programs from **JM inventory** (charlie quoting + hotel ERP); **fully closed-loop testing**. Primary focus: **JM fleet machines**.

---

## 0. The closed-loop vision (one diagram)

```
  PRINT (DXF/DWG/PDF, _PART LIBRARY)                JM INVENTORY (hotel ERP + charlie quoting)
        │                                                   │
        ▼                                                   ▼
  [S1] FEATURE EXTRACT ──► [S2] TOOLPATH-TYPE CLASSIFY ──► [S3] INVENTORY GATE  ◄── "can JM cut this TODAY?"
  (delta/xray + EDMDrawingInterp)   (toolpath-type registry)   (wire-Ø on-hand? raw stock? machine free?)
        │                                   │                          │ (no → PO suggest via PurchaseOrderEngine)
        ▼                                   ▼                          ▼ (yes)
  [S4] TEMPLATE SELECT ──► [S5] PARAMS + CUTTING CONDITIONS ──► [S6] PROGRAM EMIT ──► [S7] POST (FA10S .cps)
  (per-type template,        (E-code/H-offset cascade oracle,    (wedm_generate_       (5-vendor PRISM posts)
   variable params)           feed/flush/wire from tech-tables)   complete_program)
        │                                                                              │
        └──────────────────────────► [S8] CLOSED-LOOP TEST GATES ◄─────────────────────┘
              cascade-correctness (Regimen #3 harness) + feasibility + dimensional-vs-print
              + discharge-safety S(x) + post-dialect lint  →  PASS/FAIL → outcome ledger → retrain
```

**Thesis:** the compute chain (`wedm_print_to_program`/`wedm_run_pipeline`) already traverses DXF→feature→feasibility→multipass→params→G-code→post for the FA-10S. This pipeline ADDS the three missing rails the operator's goal needs — **inventory gate (S3), toolpath-type template registry (S2/S4), and closed-loop test harness (S8)** — and trains a template per toolpath type so *any* JM wire part can be programmed.

---

## 1. JM fleet focus (the envelope every template respects)

**1 wire-EDM machine** — `WEDM-01` Mitsubishi **FA10S** / W31MV-2 (`jm-die-profile.ts` JM_DIE_CONTROLLER_MAP, `ShopConfigurationEngine` DEFAULT_MACHINES):
- max workpiece height **215 mm**, max taper **30°**, UV travel **80 mm**, submerged + auto-threading, $85/hr, 70% eff.
- on-hand wire: **MD+ Pro II 0.25 mm** (10 kg) + **MV1200S 0.20 mm** (5 kg) (`ShopConfigurationEngine.wedm_wire_inventory`).
- post: `PRISM-Master-Mitsubishi-FA10S-WEDM.cps` (+ 4 other vendor posts for transfer).
Every template + program MUST be feasibility-gated against this envelope (height ≤215, taper ≤30°, wire-Ø ∈ on-hand set).

---

## 2. Toolpath-type registry (template per type — GAP, build first)

Today the cut types are scattered (`WEDMPassType` rough/semi/finish/precision · `ECodePass.type` rough/skim · `EDMToolpathStrategyEngine` open/closed/island). **Build a single queryable registry** `mcp-server/src/data/wedm-toolpath-types.ts` — one entry per type with: id, geometry signature, owning engine, E-code family, variable-param schema, cutting-condition ranges, feasibility constraints, JM-data provenance. Coverage target (every possibility):

| Toolpath type | Owning engine | Variable params | Status |
|---|---|---|---|
| straight profile multipass (closed) | EDMMultiPassStrategy + E12xx_4PASS | thickness, tol, Ra, wire-Ø, pass-count | ✅ wired |
| heavy/thick multipass (5-pass) | E12xx_HEAVY_5PASS | thickness>50, cannelure | ✅ wired |
| taper / UV (4-axis) | EDMToolpathStrategy U05 + E28xx_TAPER | taper°, UV travel, H=0 | ✅ wired |
| open profile (edge start, no start-hole) | EDMToolpathStrategy | entry edge, lead-in | ⚠ strategy exists, not a selectable type |
| island / multi-body | EDMToolpathStrategy (island) | slug count, tab plan | ⚠ partial |
| no-core / slug-retention (tab) | EDMWireSlugCornerTaper | tab width/pos, drop-control | ⚠ engine exists, not a template |
| closely-spaced / cannelure (halve-feed) | program-patterns + tribal | pitch, debris-short guard, 30TPI | ❌ tribal only — BUILD |
| corner strategy (sharp/blend/over-travel) | EDMToolpathStrategy U03 | R, Toff bump, feed 60% | ⚠ wired in strategy |
| start-hole placement | EDMStartHoleSetup | hole-Ø, position, threadability | ✅ wired |
| micro / fine-wire (0.10mm) | WEDMThinWireDerate | derate, fine-wire standoff | ❌ no MicroEDM engine — BUILD |
| bi-material (WC-in-steel) | EDMBiMaterialCompensation | per-zone params | ✅ wired |

Each registry entry feeds a TRAINING TEMPLATE (Regimen-#3-style oracle augmentation) so the model learns the type's parameter mapping across the JM material/thickness grid.

---

## 3. Inventory-driven auto-programming (charlie + hotel — GAP)

**The "can JM cut this today?" gate (S3)** + **stock-aware program selection**. Wire to:
- **hotel/ERP:** `MaterialStockEngine` (raw D2/A2/S7 bar/blank on-hand, supplier, unit_cost, status) · `ShopConfigurationEngine.wedm_wire_inventory` (wire spool remaining_pct) · `PurchaseOrderEngine` (auto-PO when short, `purchase_order_receive` to replenish) · `prism_business` actions `erp_tool_reorder_alerts`, `stock_size_optimize`, `costing_material`.
- **charlie/quoting:** `WEDMQuoteBridgeEngine` + `EDMCostDocumentationEngine` (wire/machine/consumable cost line) · `prism_business` `wedm_estimate_cost`, `quote_to_order`, `costing_material`.

**GAPS to build:**
1. **JM inventory seed** `mcp-server/src/data/jm-die-material-stock.ts` (+ wire-spool records) — analogous to `jm-die-wedm-tech-tables.ts`; MaterialStockEngine is empty for JM today. Hooked to a live-update path (`purchase_order_receive` / scan / ERP import).
2. **`wedm_inventory_gate` dispatcher action** — input: part feature card + selected toolpath type → checks (a) required wire-Ø ∈ on-hand spools with enough length, (b) raw stock blank ≥ part envelope, (c) machine availability → returns `{can_cut, blockers[], suggested_PO}`. Inserts between S2 and S4.
3. **stock-aware program variant** — when the exact wire-Ø is out but a substitute is on-hand, re-select the E-code family for the available wire (re-run `selectECodeFamily` with the on-hand wire constraint) rather than failing. Auto-generate the program for what JM *has*.

---

## 4. Closed-loop testing architecture (S8 — the "fully closed loop testing" ask)

Every generated program runs the gate stack before it's accepted; results → outcome ledger → retrain signal:
1. **cascade-correctness** (Regimen #3 harness `scripts/lib/wedm-cascade-correctness.mjs`) — H-offset strictly-decreasing / taper-zero / oracle-match. **Load-bearing, code-checkable.**
2. **feasibility** — `wedm_pre_flight_check` against the FA10S envelope (height/taper/UV/wire).
3. **dimensional-vs-print** — emitted contour back-checked against the print feature card (kerf/overburn compensated).
4. **discharge-safety S(x) ≥ 0.98** — `WEDMLoRASafetyEvaluatorEngine` + recast/HAZ AMS cap.
5. **post-dialect lint** — `scripts/post-nc-dialect-lint.mjs` (echo's gate) on the emitted .cps output.
6. **outcome publish** — `xproc_outcome_publish {slot:mike, domain:wedm}` + `emitWEDMToIndiaLoop()` → india master loop → retrain trigger when drift detected.

This closes the loop: print → program → test → outcome → (re)train → better program.

---

## 5. Build sequence (R13 logical order — the /loop units)

```
PHASE A — REGISTRY + ORACLE (foundation; print→program selects from these)
  A1. wedm-toolpath-types.ts registry (§2) + queryable dispatcher action wedm_toolpath_type_list/get.
  A2. Per-type oracle-augmented training templates (clone build-wedm-passschedule-corpus.ts per type;
      cascade-harness self-validation). Fills "templates for every toolpath type".
  A3. Build the 2 missing types: cannelure/closely-spaced strategy + micro/fine-wire path.

PHASE B — INVENTORY RAIL (charlie + hotel)
  B1. jm-die-material-stock.ts seed (raw + wire) + MaterialStockEngine JM hookup (§3 gap 1).
  B2. wedm_inventory_gate dispatcher action (§3 gap 2) — can-JM-cut-today + suggested PO.
  B3. stock-aware E-code re-selection (§3 gap 3) — program for what JM HAS.

PHASE C — CLOSED-LOOP TEST HARNESS
  C1. wedm_program_test_gates runner — composes §4 gates 1-5 into one PASS/FAIL on any emitted program.
  C2. outcome-ledger wire (gate 6) → india loop + retrain trigger.

PHASE D — TRUE PRINT→PROGRAM TRAIN (the crux, consumes A+B+C)
  D1. Assemble print→program corpus from DocuStrata join + the 3 real .NC + per-type templates
      (structured-features: print feature card → toolpath-type → params → program).
  D2. Warm-start train (continue the pass-schedule adapter) → models/wedm-print2program-lora.
  D3. Grade generations through the C1 closed-loop gates → ≥ targets → deploy.

PARALLEL (operator-gated): .mcx-8 operator-export batch (Mastercam X8 → FA10S post → .NC) = 30× real corpus.
```

**Already shipped (this session, the foundation):** the warm-start trainer (doctrine D2), the Regimen #3 cascade harness + oracle-augmented generator + eval gate #1 + trained adapter, the knowledge corpus + eval, the lathe-decontaminated archive. Phase A/B/C/D build on these.

---

## 6. Data sources (all verified by recon 2026-05-31)
Programs/prints: `H:/PRISM/JM DIE/WIRE EDM` (3 .NC + cannelure .txt + 3970 .mcx + 28 .esp) · prints in `_PART LIBRARY` (separate tree) · DocuStrata join `mcp-server/data/jm-die-database/`. Oracle: `jm-die-wedm-tech-tables.ts` + `jm-die-wedm-program-patterns.ts` + `edm-material-db.ts` + `wire-spec-sheets.ts` + `wedm-constants.ts`. Engines: EDMMultiPassStrategy · EDMToolpathStrategy · EDMStartHoleSetup · EDMCuttingParamFlush · EDMDrawingInterpretation · WEDMPrintToProgram · EDMPostProcessGCode + 5 vendor posts. Inventory: MaterialStockEngine · ERPIntegrationEngine · PurchaseOrderEngine · ShopConfigurationEngine.wedm_wire_inventory. Quoting: WEDMQuoteBridgeEngine · EDMCostDocumentationEngine. Machines: `jm-die-profile.ts` (1 FA10S). Test: `scripts/lib/wedm-cascade-correctness.mjs` + `wedm_pre_flight_check` + `WEDMLoRASafetyEvaluatorEngine` + `post-nc-dialect-lint.mjs`.

> Cross-galaxy coordination: hotel (ERP inventory) + charlie (quoting) + delta/xray (print feature extract) + echo (post lint) + india (master retrain loop). Broadcast on every AI upgrade per [[feedback_ai_upgrade_broadcast_protocol]].
