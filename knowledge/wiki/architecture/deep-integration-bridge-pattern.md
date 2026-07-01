---
schema: ideablock-v1
title: "Deep-integration bridge pattern — 16 SFC/CAM/AI/ERP synergies that connect already-built capability"
domain: "PRISM architecture"
category: architecture
version_state: Current
confidence: 0.96
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - ROADMAP-CONSOLIDATED.{json,md,html} (16 deep-integration + 26 wiring bridges)
  - state/shared/specs/ROADMAP-CONSOLIDATED.md §bridge_units
  - CLAUDE.md §ROADMAP CONSOLIDATION
  - knowledge/wiki/architecture/roadmap-consolidation.md
extracted_via: human-authored
extracted_at: 2026-05-21T09:40:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-DEEP-INTEGRATION-BRIDGE)
---

## Question

PRISM has 2659 wired engines + 96 dispatchers but customer-facing pipelines aren't end-to-end smooth. What are the **16 deep-integration bridges** that compound already-built capability — and how do I close them?

## Answer (canonical — the 16 bridges are the highest-leverage remaining build work in PRISM)

### The 16 deep-integration bridges (from ROADMAP-CONSOLIDATED-2026-05-16)

These aren't new engines — they're **connectors** between systems that already exist. Closing one bridge unlocks a customer-facing workflow that's currently 80 % built but missing the glue.

| # | Bridge | Components connected | Compound effect |
|---|---|---|---|
| 1 | SFC → speed-feed-calculator → physics | SFC + Kienzle + Taylor + chip-thinning | SFC outputs become physics-validated, not heuristic |
| 2 | SFC → CAM Hub | SFC + 6 CAM systems (Mastercam, hyperMILL, Fusion, SolidCAM, NX, hyperCAD) | One SF answer renders in every CAM vendor's units |
| 3 | SFC → Tribal Tips | SFC + 4245 tribal tip corpus | SF recommendations cite the tribal tip that supports them |
| 4 | SFC → Adaptive Engagement | SFC + engagement-controlled toolpath (HSM/trochoidal/adaptive) | Per-segment chip-thinning correction applied to SF output |
| 5 | SFC → AI Layer | SFC + LoRA + drift detection | SF recommendations learn from outcome feedback per-customer |
| 6 | SFC → Stochastic Wrap | SFC + Monte Carlo + uncertainty propagation | SF output ships with confidence intervals, not single point |
| 7 | Master Post → CAM Hub | MasterPost + 6 CAM dialects + 12+ controllers | One G-code source, all controllers handled |
| 8 | CAD ↔ CAM AI bridge | CAD-Drawing-KB + CAM-Strategy-AI + print-to-program | Blueprint → program direct without manual intermediate |
| 9 | 3-tier AI hierarchy | Claude (deep) + Ollama (offload) + per-domain LoRA (specialized) | Right model for right task; 60-70 % token reduction |
| 10 | Closed-loop learning | Outcome bus + LoRA training + drift detection + retraining trigger | System gets smarter every shipped job |
| 11 | ERP bridge | quote → order → schedule → cost-actuals → invoice | End-to-end customer workflow internal |
| 12 | Operator gates | Quality gates (Cpk, S(x), Omega, audit-trail) → live shop-floor view | Operator sees + validates BEFORE the cut |
| 13 | Workflow orchestration | Approval-workflow + traveler + comments + milestone-timeline | Multi-stakeholder job lifecycle |
| 14 | Knowledge ingest | PDF-learn + video-learn + shop-knowledge → wiki + tribal + AI training | Every input becomes durable knowledge |
| 15 | Cross-CAM synergy | Cross-CAM ontology + format translator + strategy-equivalence | Mastercam strategy ↔ hyperMILL strategy ↔ Fusion strategy |
| 16 | Energy + sustainability | Energy-tracker + carbon-footprint + sustainable optimization | ESG-compliant manufacturing output |

### The 26 wiring-bridge units (alongside the 16 deep-integration)

The wiring bridges are simpler — they connect already-built engines to existing dispatchers (covered in detail by [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]]). Each closes ~5-6 engines per batch. Total 26 wiring units × ~5 engines = ~130 engines closeable through wiring-bridge work alone (vs the 639-engine total backlog).

### The bridge-class anatomy

Each of the 16 bridges shares the same anatomy:

```
[ EXISTING ENGINE A ]
      ↓ (already produces output X)
[ NEW BRIDGE ENGINE ] ← this is what's missing
      ↓ (transforms X → Y)
[ EXISTING ENGINE B ]
      ↓ (already consumes input Y)
[ EXISTING SURFACE C ]
```

The bridge engine is small (50-200 LOC typically), focused on transformation/adaptation, and inherits all upstream/downstream test coverage. The cost-to-close is low, but the value is the workflow it unlocks.

### Pattern — bridge build workflow

**Step 1 — read both sides.** Identify the upstream's output schema + the downstream's input schema. The bridge is the schema-mapping layer between them.

**Step 2 — confirm the bridge doesn't exist.** Check `duplicationGuardEngine.checkBeforeCreating()` + grep for `*Bridge*` + `*Adapter*` in `src/engines/`. Some bridges are partially built (engine exists but isn't wired into the deep-integration loop).

**Step 3 — write the bridge engine.** Two patterns:
1. **Pure transformation** (most common): bridge takes upstream output, returns downstream input. Stateless. ~50-100 LOC.
2. **Stateful coordinator**: bridge tracks state across calls (LoRA training accumulator, outcome bus, drift detector). ~100-200 LOC.

**Step 4 — wire to BOTH sides.** Bridge needs to appear in:
- Upstream dispatcher (export the transformed output)
- Downstream dispatcher (accept the transformed input)
- A dedicated dispatcher if the bridge is the integration root (e.g. `prism_intelligence` for AI hierarchy)

**Step 5 — round-trip E2E test.** Real-data E2E from upstream raw → bridge → downstream output. The test should fail if EITHER endpoint changes its contract.

### The 5 highest-ROI bridges (operator picks)

| Priority | Bridge | Why FIRST |
|---|---|---|
| **P0** | #11 ERP (quote→order→schedule→invoice) | Highest revenue impact; end-to-end customer workflow currently broken at multiple seams |
| **P0** | #9 3-tier AI hierarchy | 60-70 % token reduction across all chats; immediate cost win |
| **P0** | #2 SFC → CAM Hub | Customer-facing: SFC answer must render in their CAM vendor |
| **P1** | #8 CAD ↔ CAM AI bridge | Blueprint → program autonomous; removes manual programming bottleneck |
| **P1** | #1 SFC → speed-feed-calculator → physics | Eliminates physics-vs-heuristic divergence in SF output |

### Specific build hints (per top-5)

**ERP bridge (#11):**
- Already shipped: QuoteToOrderBridgeEngine (2026-05-20 hotel iter 4, `0489e701`).
- Remaining: order → schedule (capacity engine wiring) · schedule → cost-actuals (timecard + materials reconcile) · cost-actuals → invoice (margin alerts + AP/AR sync).
- Tribal anchor: [[machining-tactics-material-removal-economics]] for cost-actuals + [[quality-first-article-inspection-and-spc-cadence]] for quality-gate output.

**3-tier AI hierarchy (#9):**
- Already shipped: `aiSystemRouterEngine` (CLAUDE.md §AI SYSTEM ROUTING).
- Remaining: per-domain LoRA registry + drift-detection loop + automatic retrain trigger.
- Tribal anchor: U-LIMA-A7 calibration + U-LIMA-A8 transfer-priors (already shipped this fleet).

**SFC → CAM Hub (#2):**
- Already shipped: `cam_hub_register` / `cam_hub_route` in `prism_cam`.
- Remaining: SFC output → CAM hub `register_endpoint` call + per-vendor unit-conversion layer.

**CAD ↔ CAM AI bridge (#8):**
- Already shipped: `cad_cam_handoff` action in `prism_cad`.
- Remaining: AI synthesis layer in between — `cad_ai_blueprint_extract` → `cad_design_plan` → `cam_strategy_recommend` → `cam_toolpath_generate` chain.

**SFC → physics (#1):**
- Already shipped: SFC engine + Kienzle/Taylor coefficients in `physics/constants.ts`.
- Remaining: SFC `compute()` should call into the Kienzle force + Taylor life as **validation**, not just lookup. The bridge is small (~30 LOC) but the test surface is large.

### Tie-ins (PRISM-side)

- `state/shared/specs/ROADMAP-CONSOLIDATED.{json,md}` — full bridge list with build status
- `state/shared/system-viz/` — `/system-viz` `ghost.bridge_synergy` roost surfaces all 42 (16+26) bridges visually
- `scripts/generate-bridge-synergy-features.mjs` — feeds /system-viz; re-run to refresh
- `scripts/consolidate-roadmaps.mjs` — regenerates ROADMAP-CONSOLIDATED
- `dispatcher-wirer` subagent — for the 26 wiring-bridge sub-class
- `prism_intelligence` dispatcher — root for 3-tier AI bridge

### Tie-ins (tribal canonical)

- [[wiring-pattern-engine-to-dispatcher]] — sibling: 6-step canonical pattern
- [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] — sibling domain bridges
- [[envelope-drift-close-out-pattern]] — sibling close-out pattern
- [[machining-tactics-material-removal-economics]] — anchors ERP cost-actuals
- [[quality-first-article-inspection-and-spc-cadence]] — anchors operator-gates bridge
- [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — anchors SFC→adaptive bridge
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)

## Provenance

Distilled from ROADMAP-CONSOLIDATED-2026-05-16 (16 deep-integration + 26 wiring bridges curated by slot:juliett 2026-05-16) + CLAUDE.md §ROADMAP CONSOLIDATION + knowledge/wiki/architecture/roadmap-consolidation.md. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-DEEP-INTEGRATION-BRIDGE — **31st canonical entry**, **5th bridge-class entry** of the wiki+tribal pivot phase 2C. Provides bridge anatomy + 16-bridge table + 5-pick P0/P1 prioritization + per-bridge build hints.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `deep integration`, `bridge synergy`, `SFC bridge`, `master post bridge`, `CAD CAM AI bridge`, `3-tier AI`, `closed-loop learning`, `ERP bridge`, `operator gates bridge`, `bridge synergy ghost`, `ROADMAP-CONSOLIDATED`, `16 bridges` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] · [[envelope-drift-close-out-pattern]] — sibling architecture bridges
- [[machining-tactics-material-removal-economics]] · [[quality-first-article-inspection-and-spc-cadence]] · [[machining-tactics-toolpath-strategy-hsm-trochoidal-adaptive]] — tribal anchors per bridge
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)
- [[reference_u_bridge_erp_quote_2026_05_20]] — ERP-bridge prior unit close-out
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first picks
- [[feedback_do_optional_high_roi_work]] — standing rule
