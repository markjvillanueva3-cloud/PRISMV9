---
name: reference_delta_xray_feature_presence_roundtrip_2026_06_01
description: "The print↔print axis now runs against xray's REAL OCR output (feature-presence schema), live on the Fusion bridge — and the finding is that the cad-gen BRIDGE (not print-reading) is the bottleneck. Box bridge can't build revolved/drilled features; every gap auto-logs to the dual-training corpus."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.088Z
aliases: reference_delta_xray_feature_presence_roundtrip_2026_06_01
---


xray's BlueprintVision OCR emits a **feature-presence** print, verified live from `state/shared/ocr-ground-truth/cad-prototype-*.json`: `{ part_class, prints:[{ dimensions:[{kind, presence_only, evidence_count, evidence_ratio}] }] }`. Neither `model-to-print`→`comparePrints` (bbox geom-summary) nor `cad-fusion-spec-diff` (nominal+tol) fits it — so a third axis was built.

**Shipped (slot delta, 2026-06-01):**
- `scripts/lib/cad-fusion-xray-print-diff.mjs` (15/15) — `diffXrayPrints(source, candidate)` presence-set diff. `required` = source features ≥ evidence floor 0.3 (matches xray's own `min_evidence_ratio_filter`). A MISSING required feature is the load-bearing signal (the cad-gen build gap). R12: zero-required source → `no-data`, never `match`. `missingFeaturesAsFixes()` → dual-training records. Commit `edde868516`.
- `scripts/lib/cad-fusion-model-to-feature-presence.mjs` (11/11) — derives the CANDIDATE feature-presence from a normalized model. HONEST topology-only: cuboid 6/12/8 → `rectangular_block`, else `non_prismatic_body`; NEVER fabricates xray's functional names (`central_oil_hole` etc.) — geometry alone can't distinguish an oil hole from a relief hole (delta soul: no heuristic-fill). evidence_ratio=1 (deterministic, not a faked OCR confidence).
- `cad-fix-training-ledger.mjs` — +`missing-feature` FIX_KIND (a feature entirely absent from the regen; distinct from a count being off).
- `scripts/cad-fusion-xray-roundtrip.mjs` — the full live runner: load real xray print → build achievable box live on :18365 → derive features → diff → log gaps → reap (try/finally close-enforce). Commit `28d30ea6d0`.

**THE FINDING — CORRECTED 2026-06-01 (R12, I overstated the blocker; the first cut was WRONG):**
- xray's OCR read the die correctly — 5 features (`central_oil_hole`, `bevel_face_chamfer`, `stepped_revolved_axis`, `working_tip_taper`, `cross_drilled_relief_holes`). **Print-reading is fine — no print-reader fixes needed.** (This part holds.)
- First cut ran the box runner (BOX_COURSE only) → built a box → 0/5 → I concluded "the BRIDGE can't revolve/drill/taper." **THAT WAS WRONG.** The deployed `PRISMBridgeCAD.py` already has `_create_revolve` (POST `/revolve`), `_create_hole` (`/hole`), `_create_chamfer` (`/chamfer`), plus fillet/pattern/combine/shell — all first-class endpoints. The course-lib `CANONICAL_COURSES` already defines REVOLVE + HOLE courses. **LIVE-PROVEN this session: POST /new→/sketch(rectangle touching X-axis)→/revolve(X,360°) on :18365 produced a solid cylinder vol=6283.19mm³ = π·100·20 EXACT.** So the bridge CAN build all 5 die features (revolve→stepped/tapered axis, hole→oil/relief holes, chamfer→bevel).
- **The REAL gaps are two, neither is bridge geometry:** (1) my runners (live-cycle + xray-roundtrip) only call BOX_COURSE — no die-building course is wired; (2) **feature-recognition naming** — a revolved body is topologically `non_prismatic_body` (3 faces), NOT `stepped_revolved_axis`. To match xray's FUNCTIONAL names the built topology must be recognized into those names. PRISM already has `CADFeatureRecognitionEngine` / `prism_cad:feature_recognize` — route to it, don't reinvent (the deriver's honest topology-only output is the floor, feature_recognize is the semantic layer).

**Caveat on the running bridge:** the RUNNING Fusion add-in predates the `/close` endpoint ("Unknown endpoint: /close") — but `reapByPrefix` uses `/execute` (present), so close-enforcement is unaffected. To get `/close` + `/documents` the operator must re-Run the add-in in Fusion.

**Build order to flip die fails→matches:** (a) a revolve+hole+chamfer die-building course; (b) wire `feature_recognize` into the round-trip so built topology → functional names; (c) a xray-semantic↔recognized-feature alias map. Evidence-priority for which feature to nail first: central_oil_hole (0.95) > bevel_face_chamfer (0.51) > stepped_revolved_axis (0.47) > working_tip_taper (0.44) > cross_drilled_relief_holes (0.37).

Builds on [[reference_delta_doc_close_enforcement_and_dual_training_2026_06_01]] (the dual-training ledger + close-enforcement) and [[reference_delta_fusion_isolation_flaky_regressed_2026_06_01]] (ran on the shared instance; prefix-scoped reap kept it safe). The freeform geometry (revolve/loft/sweep/hole) is the next bridge unit — it's what flips these 5 fails to matches.
