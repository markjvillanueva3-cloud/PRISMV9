# WEDM PRINT → PROGRAM PIPELINE — canonical order of operations + punch list

**Built:** 2026-05-27 by slot:mike (post iters 1-22 closed-loop substrate ship).
**Source:** wire-domain atlas + blueprint/OCR/CAD atlas + ITW SHAKEPROOF 500-30540-24000-04.NC tail readback + WEDMLoRADatasetBuilderEngine instruction families + WireEdmWizardPage.tsx current consumption surface + `edmDispatcher` ACTIONS enum.

Audience: kilo, delta, echo, foxtrot, oscar, whiskey, mike — any slot building toward print-to-program automation.

---

## 1. PRINT-TO-PROGRAM PIPELINE (11 stages — canonical operator workflow)

Derived from JM Die / Mitsubishi FA-10S tribal corpus + the canonical .NC opening sequence below.

| # | Stage | Operator decision | Input artifact | Output artifact | Engines covering this stage | Wired into wizard? |
|---|---|---|---|---|---|---|
| 1 | **PRINT INTAKE** | Scan/upload PDF or photograph of the print | PDF/JPG/PNG | Structured: dims, GD&T, material, finish, title block | `BlueprintVisionOCREngine` (Claude Vision), `PDFBlueprintDimensionExtractorEngine`, `PDFBlueprintPatternRescueEngine`, `BlueprintExtractionRAGEngine` | ❌ NO — wizard currently DXF-only |
| 2 | **CAD GEOMETRY EXTRACT** | Pick contour(s) to cut | DXF / STEP from CAD or print-derived | `WireEDMContour[]` (arc-preserving, G02/G03-ready) | `DXFGeometryParserEngine`, `WEDMDwgImportEngine`, `DXFParserEngine` | ✅ via `wireEdmParseGeometry` |
| 3 | **MATERIAL + FAMILY RESOLUTION** | Confirm material → ISO group → conductivity/thermal/density | Material name + thickness | Material constants payload (rho, conductivity, melt-pt, kerf, recast) | `WEDMMaterialAIEngine` (and material table in `WireEdmWizardPage.MATERIAL_OPTIONS`) | 🟡 partial — wizard has hardcoded 20-material table; engine call NOT wired |
| 4 | **FEATURE CLASSIFICATION** | Closed-vs-open contour, taper Y/N, corner-radii, slug retention | Contour set + material | Feature payload (corner radii, taper angle, accessibility, slug tabs) | `WEDMCornerPhysicsEngine.calculateMinCornerRadius`, `WEDMAccessibilityEngine.analyze`, `WEDMSlugTabRetentionEngine.calculate`, `WEDMTaperErrorBudgetEngine.calculate` | ❌ NO — all 4 engines have actions but NOT called by wizard |
| 5 | **TEMPLATE SELECTION** | Pick E-code family (E12xx 4-pass / E28xx UV taper / E952 + E56xx acu 7-pass / E5xxx custom) | Feature payload + material | `TemplateMatch` w/ template id, cascade, confidence, reason | `WEDMTemplateExtractorEngine` (iter18), `WEDMPartFamilyTemplateExtractorEngine`, `WEDMPartFamilyMatcherEngine` | ❌ NO — actions `wedm_template_parse / _extract / _select` exist + `wedm_part_family_match` exist; wizard does not call them |
| 6 | **CASCADE DESIGN** | Skim-pass count + per-pass H-offsets (H1..Hn) + per-pass feed (F.12, F.24, …) | Template + material + Ra target | Pass cascade: `{H1,H2,...,Hn}`, `{F1,F2,...,Fn}`, `{E1,E2,...,En}` | `WEDMAdaptivePassEngine.calculatePassCount` + `.calculateOffsets` | ❌ NO — both actions exist (`wedm_adaptive_pass_count`, `wedm_adaptive_offsets`); wizard does not call them |
| 7 | **PHYSICS GATES** | Corner-min-radius OK? Current-density OK? Kerf width OK? Power density OK? Dielectric flush adequate? | Cascade + geometry + material | Per-gate PASS/FAIL with violations | `WEDMPowerDensityGuardEngine`, `WEDMCurrentDensityGuardEngine`, `WEDMDielectricFlushAdjustEngine`, `WEDMCornerPhysicsEngine`, `WEDMPreFlightCheckEngine`, `WEDMDXFClosureValidatorEngine` | 🟡 partial — some called inside `solveWireEdmWizard`; the explicit per-gate actions are NOT surfaced as visible operator gates |
| 8 | **SAFETY ENVELOPE** | Shop-floor S(x) ≥ 0.98, Ω ≥ 0.95 | Full plan from stages 1-7 | S(x) + Ω scores + violation list | `WEDMSafetyEnvelopeEngine` (+ `WEDMLoRASafetyEvaluatorEngine` from iter15 for AI-generated outputs) | ✅ via `wedmSafetyEnvelope` |
| 9 | **POST EMIT** | Pick controller dialect (Mitsubishi FA-10S 99% of JM Die jobs) | Plan + cascade + gates | Final .NC text with canonical opening + per-pass M-code group + canonical shutdown | `WEDMControllerDialectVerifierEngine`, post-router engines (`wedmPostRouter`), and `wedmCodePreview` orchestration | ✅ via `wedmCodePreview` |
| 10 | **APPROVAL + ERP** | Operator review → estimate/quantity-break → job-create | Final .NC + estimate | Approved job ticket | `wedmApprovalStatus`, `wedmRequestApproval`, `wedmErpApi.{estimate,quantityBreaks,jobCreate}` | ✅ |
| 11 | **EXECUTE + OUTCOME LEDGER** | Run on FA-10S → capture actual Ra/Recast/MRR/wire-break/dwell | Approved .NC + machine output | Outcome record → retrain checkpoint when N=500 | `training_ingest_wedm_outcome`, `wedm_feedback_submit`, `wedm_retrain_status` (iter19), `WEDMRetrainTriggerEngine` | ❌ NO — actions exist; wizard does not surface outcome capture |

**Score:** **5 of 11 stages fully wired into wizard, 2 partial, 4 fully unwired.**

---

## 2. WIZARD CURRENT SURFACE (what's actually called today)

`WireEdmWizardPage.tsx` consumes exactly **10 API client methods**:
- `wireEdmParseGeometry` — Stage 2
- `tribalSearch` — adjunct (not in canonical pipeline; tribal lookup)
- `solveWireEdmWizard` — the **master orchestrator** wrapping stages 3-7 internally
- `wedmSafetyEnvelope` — Stage 8
- `wedmAutonomyStatus` — autonomy gate (not in canonical pipeline)
- `wedmRulStatus` — consumable life (not in canonical pipeline)
- `wedmMaintenanceStatus` — maintenance gate (not in canonical pipeline)
- `wedmCodePreview` — Stage 9
- `wedmApprovalStatus` / `wedmRequestApproval` — Stage 10
- `wedmErpApi.{estimate,quantityBreaks,jobCreate}` — Stage 10

Note: `solveWireEdmWizard` is a black-box backend orchestrator — the wizard does NOT individually call template-select / cascade-design / corner-physics / accessibility / pre-flight; those run *inside* `solveWireEdmWizard` (if at all) without operator visibility. **Operators cannot see, override, or reason about the per-stage decision today.**

---

## 3. BUILT-BUT-UNWIRED PUNCH LIST (top 25 by leverage)

Highest-leverage 25 wedm_* actions that exist in `edmDispatcher` but the wizard does NOT call. Wiring any of these adds operator visibility + AI input surfaces.

### Stage-1 (intake) gap — PDF/print upload missing entirely:
- `cad_pdf_blueprint_extract` (cadDispatcher) — PDF dims extractor
- `cad_pdf_pattern_rescue_extract` — US-convention fractional/limit-pair fallback
- `blueprint_rag_extract` — Claude Vision + RAG
- `blueprint_lora_prepare_set` — anonymized LoRA training pairs (iter23 prerequisite)

### Stage-4 (feature classification) — 4 engines built, 0 wired:
- `wedm_corner_min_radius`
- `wedm_accessibility_analyze`
- `wedm_taper_error_budget`
- `wedm_slug_tab_retention`

### Stage-5 (template selection) — fully unwired despite iter18 ship:
- `wedm_template_parse`
- `wedm_template_extract`
- `wedm_template_select` ← single most leveraged call for AI-style print-to-program
- `wedm_part_family_match`
- `wedm_training_template_match`

### Stage-6 (cascade design) — fully unwired despite EXISTS:
- `wedm_adaptive_pass_count`
- `wedm_adaptive_offsets`

### Stage-7 (physics gates) — make individual gates visible:
- `wedm_pre_flight_check` ← master pre-flight pipeline
- `wedm_power_density_check`
- `wedm_current_density_validate`
- `wedm_dielectric_flush_calc`
- `wedm_dxf_validate`

### Stage-11 (outcome + retrain) — closes the closed-loop on the operator side:
- `training_ingest_wedm_outcome`
- `wedm_feedback_submit`
- `wedm_retrain_status` (iter19)
- `wedm_retrain_record_checkpoint`

### Iter 1-22 AI/LoRA stack (the whole closed-loop training surface) — 0 wired into wizard:
- `wedm_lora_dataset_build` / `_stats` / `_schema`
- `wedm_lora_train_script` / `_reward` / `_safety` / `_reason` / `_curriculum`
- `wedm_academy_bridge`
- `wedm_inference_status` / `_register_adapter` / `_generate` (iter21)
- `wedm_ollama_build_modelfile` / `_attach_handler` (iter22)

---

## 4. CANONICAL .NC OPENING + SHUTDOWN (from ITW SHAKEPROOF 500-30540-24000-04.NC)

### Header (lines 1-12) — variables + offsets:
```
%
L001
(date comment)
H175 = 0.0000      ← base offset variable
H1 =.0085 + H175   ← pass-1 cumulative offset
H2 =.0064 + H175   ← pass-2 (skim)
H3 =.0058 + H175   ← pass-3 (skim)
H4 =.0053 + H175   ← pass-4 (skim)
```

### Opening sequence (N5–N50) — exact canonical setup:
```
N5  G90                       ← absolute mode
N10 M91 (Adaptive Control Off)
N15 G92 X0.0 Y0.0             ← zero set
N20 G1 X0. Y0. F25.0
N25 M20 (Thread Wire)
N30 M78 M78 (Fill Tank)       ← M78 emitted twice — flush prime
N35 M80 (Water On)
N40 M82 (Wire On)
N45 M84 (Power On)
N50 E1221 H1 F.12 (PASS=1)    ← E-code + H-offset + feed for pass 1
N55 M90 (Adaptive Control On)
```

### Per-pass group (repeats N50→N155 per pass with E-code+H+F change):
```
N## E12xx H<n> F<feed> (PASS=n)
G42|G40 + contour G01/G02/G03 sequence
N## M01 (Glue Stop)           ← optional at glue/break-out point
N## M78 M78 (Fill Tank)       ← re-prime after stop
N## M80/M82/M84               ← re-engage water/wire/power
```

### Canonical SHUTDOWN (from same file, N635-N650):
```
N635 M85 M83 M81 (Power/Wire/Fluid - Off)
N640 M21 (Cut Wire)
N645 M58 (Drain Tank)
N650 M02
```
**Ordering rule:** `M85 → M83 → M81 → M21 → M58 → M02` is canonical (Power off → Wire off → Fluid off → Cut wire → Drain tank → End). Resolved 2026-05-27 iter20 via direct readback. Anything emitting `M82` (Wire On) without a preceding `M78` (Fill Tank) is a hard-veto safety violation (iter15 dry-fire detection).

### M-code dictionary (from this file):
- M01 — Glue Stop (optional pause for slug stabilization)
- M20 — Thread Wire (auto-thread)
- M21 — Cut Wire (terminal)
- M58 — Drain Tank
- M78 — Fill Tank (often emitted twice for flush priming)
- M80 — Water On
- M81 — Fluid Off
- M82 — Wire On
- M83 — Wire Off
- M84 — Power On
- M85 — Power Off
- M90 — Adaptive Control On
- M91 — Adaptive Control Off

---

## 5. ORDER OF OPERATIONS — RECOMMENDED BUILD SEQUENCE

To get from "we have the substrate" → "wizard generates programs from prints end-to-end" requires the following iters, in this exact order (highest-leverage first):

### **iter23 — `WEDMPrintProgramAlpacaAugmenter`** (CRITICAL FOR TRAINING)
Pair every JM Die wire .NC to its matching blueprint via `BlueprintProgramJoinEngine`, then augment the Alpaca example with `print_context` (OCR'd dims + GD&T from `BlueprintVisionOCREngine` or `PDFBlueprintDimensionExtractorEngine`). **Closes the gap between iter1-22 substrate and a print-aware training dataset.** Operator's specific ask.

### **iter24 — BUILD THE ACTUAL ALPACA DATASET** (NO NEW CODE — single MCP call)
`prism_edm wedm_lora_dataset_build { source: "H:/PRISM/JM DIE/WIRE EDM", augment_with_prints: true, output: "mcp-server/data/training/wedm-alpaca-train.jsonl" }`. Produces ~4,058-pair Alpaca-JSONL using iter23's augmenter. Validation split (stratified) included.

### **iter25 — `WEDMPrintToProgramOrchestratorEngine`** (BACKEND CHAIN)
Single backend chain walking stages 1-9 of §1 above, calling existing engines in canonical order. Replaces black-box `solveWireEdmWizard` with stage-by-stage visibility. Input: `{print_url | dxf_url, material, thickness, ra_target}`. Output: `{plan, gates, code, audit_trail}` where every stage's input + output is captured for operator review. **Each stage emits a discrete event the wizard can render.**

### **iter26 — wizard UI surfacing** (FRONTEND)
Add to `WireEdmWizardPage.tsx`:
- PDF/print upload tab (calls Stage 1)
- Template-select panel (calls Stage 5, lets operator override)
- Cascade-design panel showing H1..Hn + F.12..F.xx (Stage 6 visible)
- Pre-flight gates panel (Stage 7, per-gate PASS/FAIL with red/green pills)
- Outcome submission button after run (Stage 11)

### **iter27 — INFERENCE RUNTIME WIRING** (CLOSES THE AI LOOP)
After operator runs Stage 9, optionally call `wedm_inference_generate` to have the trained model PROPOSE the cascade + emit code; route through `WEDMLoRASafetyEvaluatorEngine` + `WEDMLoRAReasoningEvaluatorEngine` (iter15-16) before showing operator. Hybrid: deterministic engines as floor, AI as accelerator + override-checker.

### **iter28 — OPERATOR-FACING OUTCOME LEDGER** (LIVE TRAINING)
After each shipped job, operator clicks "Submit Outcome" → `training_ingest_wedm_outcome` writes to ledger → `wedm_retrain_status` polls → when N ≥ 500 new outcomes, the wizard surfaces a "Retrain Available" banner → operator triggers iter1-22 retrain pipeline → new adapter registered via `wedm_inference_register_adapter` → loop runs forever.

---

## 6. WHAT THE OPERATOR HAS TO DO TO TRAIN TODAY

If we ship just iter23 + iter24 (no UI work), the operator can:

1. Wait ~5-15 min for iter24's MCP call to finish (single command).
2. Copy the generated `train_wedm_lora.py` + the `wedm-alpaca-train.jsonl` to a GPU machine.
3. Run `python train_wedm_lora.py` (Unsloth + Qwen2.5-Coder-7B-bnb-4bit — ~2-8 hours depending on GPU).
4. Copy the resulting adapter back; `wedm_inference_register_adapter { adapter_version, adapter_path }`.
5. `wedm_ollama_attach_handler { model_name }` to wire the Ollama backend.
6. **Training closed loop is live.** Operators can ask the model anything in the 7 instruction families.

The wizard-level integration (iter25-28) is what makes it ergonomic for the SHOP FLOOR. Without it, the model is usable but only via direct MCP calls.

---

## 7. KNOWN GAPS / RISKS

- **Blueprint→program pairing precision** — `BlueprintProgramJoinEngine` matches by part-number normalization (exact / loose / miss). The "loose" tier may pair prints to the wrong customer's program; iter23 must surface confidence and emit ONLY high-confidence pairs to the Alpaca corpus.
- **Print OCR quality** — JM Die archive contains photographed PDFs with skew/glare. `BlueprintVisionOCREngine` (Claude Vision) handles most; the regex extractors fail more often. Fallback chain: Vision → text-PDF regex → page-by-page lima script → manual operator entry.
- **Tribal-tip pipeline NOT in canonical pipeline** — operator may want tribal-tip lookup INTERLEAVED between stages (e.g. "what skim cascade does the shop use for D2 Tool Steel @ 0.250" thick?" before Stage 6). Wire `tribalSearch` between Stages 3-6 as an advisory channel.
- **Mitsubishi FA-10S is the only target today** — the post-router (`wedmPostRouter`) supports 5 vendors but JM Die is FA-10S only. Generalize post-emit ONLY when a second customer ships a non-Mitsubishi machine.
- **Ollama daemon currently dead in this session** — `/api/chat` 100% timeouts. iter22's bridge is built but cannot be live-tested until the daemon is restarted. The bridge engine is unit-tested with a fake `fetchImpl`; production traffic is gated on Ollama recovery.

---

**Decision point:** which iter to build first.
- A) iter23 (print augmenter) → iter24 (build dataset) — gets to training-ready FAST
- B) iter25 (backend orchestrator) first — gets the wizard surfacing infrastructure FIRST
- C) Both A and B in parallel — split work between mike (iter23) + a second slot picking up iter25

Pipeline doc canonical; refresh by re-running this slot's deep-dive against future code drift.
