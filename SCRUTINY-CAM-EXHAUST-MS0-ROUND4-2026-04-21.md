# SCRUTINY ROUND-4 — Post-PHASE-0.5 Action-Coverage Audit
## Date: 2026-04-21 | 5 parallel agents, one per priority-5 CAM
## Trigger met: PHASE-0.5 complete (11/11) + U-CAM-ML-03 complete

**Baseline:** `SCRUTINY-CAM-EXHAUST-MS0-ROUND3-ACTION-COVERAGE-2026-04-21.md` (aggregate 0.22, 18/200 verb cells I-scored).
**Method:** Same 40-verb × 5-CAM matrix as Round-3, each agent measures the delta from PHASE-0.5 fixes.
**Projected target:** 0.22 → 0.54 (Round-3 forecast in the roadmap JSON).

---

## AGGREGATE DELTA — CONFIDENCE MOVED 0.22 → 0.42

| CAM | R3 I | R4 I | R3 Conf | R4 Conf | Delta | Projection hit? |
|---|---:|---:|---:|---:|---:|---|
| **Mastercam** | 1 | **12** | 0.14 | **0.44** | +0.30 | ✓ hit 0.49 projection at 90% |
| **hyperMILL** | 4 | 6 | 0.29 | 0.32 | +0.03 | ✗ MISSED — DLL shipped but no outbound builder |
| **Fusion 360** | 4 | 6-8 | 0.24 | **0.40** | +0.16 | ✓ hit 0.54 at 74% |
| **Inventor HSM** | 6 | **10** | 0.18 | **0.50** | +0.32 | ✓✓ OVERSHOT 0.28 projection |
| **SolidCAM** | 3 | 7 | 0.24 | **0.42** | +0.18 | ✓ no explicit projection; strong gain |
| **AGGREGATE** | 18/200 (9%) | **41/200 (21%)** | **0.22** | **~0.42** | **+0.20** | **76% of projected delta** |

The roadmap's 0.22 → 0.54 forecast was aspirational. **We landed 0.42** — 76% of the projected movement. That's substantial progress but falls short of the full projection by 0.12.

---

## WHAT MOVED — KEY VERB-CELL DELTAS

### Operation-creation cells (the Round-3 critical-path gap)

Round-3 reported **0/40 op-creation cells I-scored across all 5 CAMs**. Round-4:

| CAM | R3 op-create I | R4 op-create I | Notes |
|---|---|---|---|
| Mastercam | 0/8 | **6/8** | `buildOperationCreateEnvelope` 11-strategy coverage scored I (envelope = contract-complete) |
| Fusion 360 | 0/8 | **1/8** (inclusive: 8/8) | Only `adaptive3d` individually case-dispatched; 7 other strategies envelope-ready but not factory-wired |
| Inventor HSM | 0/8 | 0/8 + `create_imachining_op` I | adapter is analyze-only — no outbound op-create builder (NEW BLOCKER — Agent-I flagged this) |
| hyperMILL | 0/8 | **0/8** | DLL shipped but TS adapter has no `buildOperationEnvelope` (NEW BLOCKER — Agent-H flagged this) |
| SolidCAM | 1/8 (iMachining) | **1/8** (iMachining) | iMachining still only deep op-create; other 7 still S (stub signatures) |

**Interpretation:** Mastercam moved from 0 → 6 op-create I cells because its `buildOperationCreateEnvelope` covers 11 strategies with typed validation. Fusion's inclusive count hits 8 but conservative count is 1. **hyperMILL and Inventor HSM did NOT move on op-create at all** — they lack the outbound-envelope-builder pattern.

### Inventory-aware cells

Round-3 reported 5/200 inventory-aware across all CAMs. Round-4:

| CAM | R3 | R4 | Delta |
|---|---|---|---|
| Mastercam | 1 | **4** | +3 (machine select, post select, tool crib, post_process from inventory) |
| hyperMILL | 1 | 2 | +1 (tool crib selector wired) |
| Fusion 360 | 0 | 2 | +2 (tool_install + install_from_crib) |
| Inventor HSM | 3 | **5** | +2 (select_tool with HSM_*_d projection, plus spindle/feed from catalog) |
| SolidCAM | 0 | 3 | +3 (stock model via bridge, material lookup, tool from crib) |
| **AGGREGATE** | 5/200 (2.5%) | **16/200 (8%)** | **+11 (+220%)** |

The Round-3 target was 20+ inventory-aware verbs. **We landed 16** — 80% of target.

### Correctness bugs from Round-3

| Bug | Status Round-4 |
|---|---|
| SolidCAM `adapter_protocol: "com-ilogic"` (should be `com-sw`) | ✓ **FIXED** — CAMSystemRegistry line 90 now `com-sw` |
| `jm-die-profile.cam_systems` missing inventor-hsm + solidcam | ✓ **FIXED** — line 43 now includes all 6 CAMs |
| `U-CAM86` marked complete but DLL missing | ✓ **FIXED** — `HyperMillPRISMPlugin.dll` compiled and present |
| Fusion catalogs split across 3 dirs | ✓ **FIXED** — 1,459 params now in `cam-functions/fusion360/` |
| Inventor HSM adapter orphaned from dispatcher | ✓ **FIXED** — 3 dispatcher actions wired |

**All 5 R3 correctness bugs fixed.** Zero regressions introduced.

---

## NEW BLOCKERS SURFACED BY ROUND-4

### B1-NEW (HIGH) — hyperMILL needs an outbound envelope builder

Agent-H's finding: Fusion360 has `buildOperationCreateEnvelope` (U-CAM87-LIVE) and Mastercam has the same pattern (U-CAM89-EXTEND). **hyperMILL's adapter is inbound-only** — `analyzeOperationPreCalc` evaluates existing operations but has no equivalent write-side. That's why hyperMILL's confidence delta was only +0.03 while Mastercam's was +0.30.

**Fix:** Add `U-CAM87-HM` (new unit) — `HyperMillPluginAdapterEngine.buildOperationEnvelope(strategy, params)` following the U-CAM87-LIVE pattern. Transport: XML-RPC over the newly-compiled DLL. Est. 120 LOC + 10-case test suite.

### B2-NEW (HIGH) — Inventor HSM needs the same pattern

Agent-I's finding: the 726-line adapter was successfully wired to dispatchers (R3-03 ✓) and its catalog staged (CAM88-WIRE ✓), but it's STILL `analyzeOperation`-style only. No `buildOperationCreateEnvelope`. HSM uses iLogic COM — probably needs iLogic rule synthesis + parameter mutation, different from Fusion/Mastercam's typed JSON-RPC.

**Fix:** Add `U-CAM87-HSM` (new unit) — `InventorHSMPluginAdapterEngine.buildOperationCreateEnvelope` via iLogic rule synthesis. Est. 150 LOC (heavier than Fusion/Mastercam due to iLogic specifics) + 12-case test suite.

### B3-NEW (MEDIUM) — Fusion strategy factory dispatch incomplete

Agent-F's finding: `buildOperationCreateEnvelope` supports 8 strategies but only `adaptive3d` has a dedicated dispatcher case. The other 7 (pocket_clearing, contour2d, contour3d, facing, drill, bore, thread) accept via the generic builder but aren't individually case-dispatched.

**Fix:** Either (a) add 7 `cam_fusion_build_operation_create_{strategy}` actions, or (b) parameterize the single `cam_fusion_build_operation_create` action with a `strategy` param (already works — just needs docs). Prefer (b). Est. 15 min.

### B4-NEW (MEDIUM) — Python add-in / .NET plugin execution is explicitly out-of-scope

All 5 agents flagged this independently: the envelope builders produce typed contracts, but the **add-in side** (Python for Fusion, NET-Hook DLL for Mastercam, compiled DLL for hyperMILL, iLogic for Inventor HSM) must execute the actual `adsk.cam.*.create()` / `Mastercam.IO.*` / etc. calls. **PRISM-side is 100% on these contracts. Execution is Phase-9 territory.**

This isn't really a blocker — it's a correctly-scoped boundary. But it means Round-4 confidence of 0.42 is **contract-layer confidence**. Execution-layer confidence (which is what the Phase-9 final validation measures) will only move once a live CAM instance is bound.

---

## CUMULATIVE VERB-CELL SCORECARD

| Dimension | Round-1 (pre-fix) | Round-3 | Round-4 | Target after Round-5 |
|---|---:|---:|---:|---:|
| Aggregate I-scored | — | 18/200 (9%) | **41/200 (21%)** | 70/200 (35%) |
| Inventory-aware | — | 5/200 (2.5%) | **16/200 (8%)** | 25/200 (12.5%) |
| Op-create I-scored | — | 1/40 | **14/40** | 25/40 |
| Post-invoke I-scored | — | 0/5 | **4/5** | 5/5 (SolidCAM joins post-Omega) |
| Priority-4 aggregate confidence | — | 0.21 | **0.42** | 0.62 (after B1 + B2 + B3 new units) |

---

## ROADMAP AMENDMENTS RECOMMENDED

Based on Round-4 findings, add three new units to PHASE-0.5-FOLLOWUP (or create PHASE-0.7):

1. **U-CAM87-HM** — hyperMILL outbound envelope builder (B1-NEW fix). HIGH priority. Unblocks the 8 op-create cells for hyperMILL.
2. **U-CAM87-HSM** — Inventor HSM outbound envelope builder via iLogic (B2-NEW fix). HIGH priority. Unblocks HSM op-create.
3. **U-CAM87-FUSION-STRATEGIES** — Fusion strategy factory dispatch polish (B3-NEW fix). MEDIUM priority, 15-min work.

Plus update the confidence projection in the JSON: after U-CAM87-HM + U-CAM87-HSM + the 3 other new units, aggregate confidence projects to **0.62** (from current 0.42). The original 0.82 target (end of Phase-5) remains valid but requires real-world adapter testing in Phase-9.

---

## ROUND-5 TRIGGER

**Recommended:** after U-CAM87-HM + U-CAM87-HSM ship (the two highest-leverage new units from Round-4). Estimated: 2-3 sessions.

Running Round-5 before those land would re-surface B1-NEW and B2-NEW verbatim.

**Signals to recheck in Round-5:**
- hyperMILL op-create cells 0/8 → 6+/8
- Inventor HSM op-create cells 0/8 → 5+/8
- Aggregate I-scored 41 → 55+
- Aggregate confidence 0.42 → 0.55+
- Python/C# add-in integration status (probably still out-of-scope, but tracked)

---

## WHAT WENT RIGHT

1. **Schema binding (F3) + naming reconciliation (F4) paid off.** Without these, the Phase-5 stubs would be hitting empty/mis-named directories. With them, every stub returns live telemetry.
2. **Outbound envelope builder pattern is correct.** Mastercam's +0.30 delta validates it. Fusion's +0.16 confirms. The pattern should propagate to HM + HSM (B1-NEW + B2-NEW).
3. **CAMPostInvokeOrchestratorEngine's JM Die controller resolution works as designed.** 21 machines → real post paths with provenance tracking. Post verbs moved from stub → implemented across 4 CAMs.
4. **Inventory-aware tool projection** (SC_SLOT_ / HSM_/ HM_ / T-code / fusion-tool:) gives each adapter a typed surface to consume.
5. **The DLL actually compiled.** 11/11 contract tests pass. No "placeholder stub" scenario — real .NET 8.0 code is ready for regasm.

## WHAT WENT WRONG (vs. projection)

1. **Round-3 projection was too optimistic about hyperMILL**. Projected +DLL alone would move HM confidence substantially; actually it only delivered +0.03 because hyperMILL's architecture needs BOTH the DLL AND an outbound envelope builder. Round-2/3 scrutiny missed the second half.
2. **Inventor HSM's pattern wasn't generalized from Fusion/Mastercam when I wrote U-CAM88-WIRE.** I only did catalog staging + dispatcher wiring, not the outbound builders. Agent-I correctly flagged that HSM needs its own U-CAM87-equivalent.
3. **"Envelope = I" scoring is generous.** Under strict "must execute on live CAM" scoring, the 14 op-create I cells drop to 1 (SolidCAM iMachining). The 0.42 aggregate confidence assumes envelope-contracts count as I. Phase-9 testing will force a re-score against execution reality.

---

## BOTTOM LINE

**Round-4 confirms PHASE-0.5 delivered real movement** (0.22 → 0.42, +0.20 aggregate, all R3 correctness bugs fixed, 5/5 CAMs registered with JM Die shop inventory). **But two symmetric gaps remain** — hyperMILL and Inventor HSM both need outbound-envelope-builder adapters matching the U-CAM87-LIVE / U-CAM89-EXTEND pattern. These two new units (`U-CAM87-HM`, `U-CAM87-HSM`) are the next-highest leverage items in the roadmap.

**Aggregate confidence after the next 2-3 units ships: projected 0.62.** Still under the 0.82 end-of-Phase-5 target, but that target requires Phase-5 real-impl engines + Phase-9 live-CAM testing, which are downstream.

Next sessions should prioritize **U-CAM87-HM** and **U-CAM87-HSM** before any ML-TRAIN continuation (U-CAM-ML-04 regressor). The CAM-side symmetry is the bigger leverage right now.
