# JM Die Wire-EDM — Master Training-Regimen Catalog

> Generated 2026-05-31 by the `wedm-training-regimens` workflow (19 agents / 7 discovery + 9 regimen + synthesis, slot:mike). 9 of 11 regimens fully detailed; **taper/UV + feasibility-gating regimens are a documented gap** (their design agents failed the schema call) — backfill in a follow-up pass. All cited paths verified on disk.

**Owner:** Wire-EDM AI Architect (slot:mike / galaxy:wedm) · **Date:** 2026-05-31 · **Status:** Executable build spec, paths verified
**Base model (all regimens):** `Qwen/Qwen2.5-Coder-7B-Instruct`, QLoRA nf4, **warm-started from the single shared adapter** `mcp-server/data/training/wedm-knowledge/lora-bundle/models/wedm-lora/adapter_model.safetensors` (154.1 MB, r16/α32, validated). No cold-starts anywhere.

---

## 1. EXECUTIVE SUMMARY + UNIFYING TRAINING ARCHITECTURE

### 1.1 The one-paragraph thesis

JM Die's wire-EDM domain has a **catastrophic real-program scarcity** (3 unique ISO-G text programs; 3,970 binary `.mcx-8`/`.mcx`/`.esp` files locked without a vendor SDK) but a **rich deterministic-oracle surface**: every capability the fleet wants to train is, at its core, a closed-form function already implemented in `mcp-server/src/data/*.ts` + `mcp-server/src/engines/*.ts`. `selectECodeFamily()` is a decision tree; `getShopFeedForPass()`/`getShopOffsetForPass()` are lookups; `WEDMJobCostEngine.calculateJobCost()`, `WEDMRaPredictorEngine`, `WEDMRecastDepthPredictorEngine`, the 5 `WEDMPost*Engine.ts` post-emitters are all **pure functions**. **This converts "scarce" into "arbitrarily large, label-noise-free" via oracle augmentation.** The unifying architecture is therefore: *deterministic engine/table = the label oracle; OCR/print-join = the realistic input distribution; tribal + 15 gotchas = the reasoning grounding; the existing trained adapter = warm-start equity; RAG = the live-number supplier so nothing rotting/scarce has to be memorized.*

### 1.2 The unifying training architecture (one diagram, all 8 regimens)

```
                       ┌───────────────────────────────────────────────────────────┐
   INPUT DISTRIBUTION  │  REASONING GROUNDING        │  LABEL ORACLE (deterministic)│
 ───────────────────── │ ─────────────────────────── │ ────────────────────────────│
 phase20-verified-     │ wedm-knowledge-tips.ts      │ jm-die-wedm-tech-tables.ts   │
   prints.jsonl (44k)  │   (145 tribal, conf-scored) │   selectECodeFamily()        │
 blueprint-program-    │ wedm/CLAUDE.md §5           │   getShopFeed/OffsetForPass()│
   join-v6.jsonl (76k, │   (15 verified gotchas)     │ WEDMJobCostEngine            │
   WIRE-EDM subset)    │ wedm-published-conditions   │ WEDMRa/Recast/HAZ Predictors │
 EDMDrawingInterp-     │   .ts (63 cited records)    │ WEDMWireBreakPredictor       │
   retationEngine      │ edm-material-db.ts          │ EDMCuttingParamFlush         │
   (feature card)      │ wire-spec-sheets.ts         │ WEDMPost{Mits,Fanuc,Sodick,  │
                       │                             │   Makino,Agie}Engine         │
                       └──────────────┬──────────────┴──────────────┬───────────────┘
                                      ▼                             ▼
                      ┌─────────────────────────────────────────────────────────────┐
   CORPUS ASSEMBLY    │ build-wedm-{capability}-corpus.ts  (clone of                 │
                      │   scripts/build-wedm-knowledge-corpus.ts)                    │
                      │   → Alpaca {instruction,input,output,meta{kind,confidence,   │
                      │     source,provenance}} → grounding-gate → 80/10/10 split    │
                      │     (stratified by kind+material, held-out by record id) →   │
                      │     WEDMCurriculumSchedulerEngine easy→hard order            │
                      └──────────────┬──────────────────────────────────────────────┘
                                     ▼
                      ┌─────────────────────────────────────────────────────────────┐
   TRAIN (shared)     │ warm-start adapter_model.safetensors (DO NOT cold-start)     │
                      │   train_wedm_lora_peft.py (Windows-robust) · r16/α32/        │
                      │   dropout0.05 · lr2e-4 · nf4 · 3-4 ep · max_seq 2048→4096    │
                      │   GPU: RTX 4080 SUPER — STOP OLLAMA FIRST (the one blocker)  │
                      └──────────────┬──────────────────────────────────────────────┘
                                     ▼
                      ┌─────────────────────────────────────────────────────────────┐
   EVAL (3 reused +   │ DETERMINISTIC functional gate (NEW, per regimen, load-       │
     1 new per reg.)  │   bearing — compares emit vs the SAME oracle)                │
                      │ + WEDMLoRARewardShapingEngine (physics bounds)               │
                      │ + WEDMLoRASafetyEvaluatorEngine (hard veto, S(x))            │
                      │ + WEDMLoRAReasoningEvaluatorEngine (5-axis CoT)              │
                      │ + eval-wedm-knowledge-corpus.mjs (grounding axis screen)     │
                      └──────────────┬──────────────────────────────────────────────┘
                                     ▼
   SERVE              RAG-at-inference (live rates/envelope/inventory NEVER in weights)
                      + WEDMLoRACadenceEngine deploy gate (knowledge ≥0.52 + per-reg gate)
                      + ai-upgrade-broadcast.mjs → india master loop + neighbor galaxies
```

### 1.3 Five invariant doctrines every regimen inherits

| # | Doctrine | Why it holds fleet-wide |
|---|----------|------------------------|
| **D1** | **Oracle = label, never the model.** Synthetic labels come from the *shop-calibrated function*, so they are gold, not approximations. (R5: code answers deterministic questions.) | The single fact that makes scarcity tractable. |
| **D2** | **Warm-start the one shared adapter, never cold-start.** Every regimen continues `adapter_model.safetensors`; the 171-pair base + prior WEDM grounding is inherited. | Small-data convergence; physics/safety knowledge is not re-learned. |
| **D3** | **RAG supplies live/rotting numbers; weights learn the *policy*.** Rate cards (2024 wire prices), `remaining_pct` inventory, the 215 mm envelope stay out of weights. (R6/R12.) | A price change or empty spool never forces a retrain. |
| **D4** | **The NEW per-regimen deterministic functional gate is the real success metric** — not the lexical grounding screen. Grounding measures concreteness; the functional gate measures correctness against the oracle (R9: tests verify intent). | Prevents "high grounding, wrong numbers." |
| **D5** | **Circularity is named loud (R12).** Where the oracle both labels AND validates (recast/HAZ, cost, post-dialects-4-of-5), the doc flags "physics-/oracle-validated, NOT measurement-/machine-validated" on every relevant output, and registers the data-acquisition follow-up that breaks circularity. | Honesty about the ceiling. |

### 1.4 The corpus-grounding through-line

The **existing 171-pair corpus's weakest axis is grounding (0.431)** — advisory text under-cites concrete numbers. **Every regimen below directly attacks this** because oracle-augmented pairs are number-dense by construction (they emit E-codes, H-offsets, feeds, $ values, pressures). The fleet-wide target is to lift grounding 0.431 → ≥0.55–0.75 per slice.

---

## 2. REGIMEN #1 — PRINT → WIRE-PROGRAM (THE #1 CRUX DELIVERABLE)

> Blueprint/DXF/PDF → Mitsubishi FA-10S W31MV-2 G-code. **This is the print-to-program deliverable the entire wire-EDM galaxy exists to ship.** It is built in the most depth and depends on regimens #3 and #6 as proven sub-components (see §5 build sequence).

### 2.1 The explicit method choice — STRUCTURED-FEATURES over multimodal

The print→program signal lives in a **small structured feature vector** (geometry primitives + tolerances + taper callout + material + thickness), **not in raw pixels**. The pipeline already extracts that vector deterministically, and the FA-10S program is a deterministic function of it.

**Pipeline:** `PDF/DXF → [deterministic feature extractor: DocuStrata OCR + phase16 normalize_pn + EDMDrawingInterpretationEngine U01–U06] → structured JSON feature card → LoRA emits the FA-10S program conditioned on the card.`

A vision-LM (pixels→program) is rejected for now because: (a) no clean image↔program pairing exists (prints are scanned multi-page PDFs joined only by PN; the program side is binary), (b) it would waste capacity re-learning OCR the pipeline already does, (c) it would be un-auditable against the 15 discharge-physics gotchas. **Multimodal is a deferred Phase-2 vision-encoder bolt-on for the geometry-from-DXF leg ONLY** when raw DXF entity lists are paired (the 2 DXF + 2 DWG in the archive are too few today).

### 2.2 Data sources (verified paths)

| Role | Path |
|------|------|
| **The print↔program JOIN** (459 WIRE-EDM-bearing records: 133 exact + 224 loose + 102 ambiguous; program side `.mcx-8` binary) | `H:/PRISM/Docustrata/.index/blueprint-program-join-full-v6.jsonl` (59 MB, 76,205 records — filter `programs[].machineCategory=='WIRE EDM'`) |
| **OCR ground-truth feature substrate** (44,012 print pages: doc_id, part_numbers[], drawing_number, revision, material, customer, is_drawing_likely) | `H:/PRISM/Docustrata/.index/phase20-verified-prints.jsonl` (17.3 MB) |
| **Raw OCR text per page** (input modality for feature extraction) | `H:/PRISM/Docustrata/.index/documents-text-extracted-v3.jsonl` |
| **Canonical PN normalize / join logic** (preprocessing module) | `H:/prism-slot-mike/scripts/docustrata/phase16-blueprint-program-join-v6.py` |
| **THE feature→params mapper + synthetic-pair generator** (3 E-code families + `selectECodeFamily()` + `getShopFeedForPass`/`getShopOffsetForPass` + `JM_DIE_MCODE_SEQUENCE`) | `mcp-server/src/data/jm-die-wedm-tech-tables.ts` (9.2 KB) |
| **Program skeleton templates** (4 analyzed programs + E-code/H-offset/M-code stats) | `mcp-server/src/data/jm-die-wedm-program-patterns.ts` |
| **Gold real program — 2-axis 4-pass** (E1221–E1224) | `H:/PRISM/JM DIE/WIRE EDM/ITW SHAKEPROOF 500-30540-24000-04.NC` |
| **Gold real program — 4-axis taper 5-pass UV** (E2821–E2825, the ONLY taper exemplar) | `H:/PRISM/JM DIE/WIRE EDM/NOZE TEST.NC` |
| **Gold real program — heavy 5-pass** (E1281–E1285, 1477 lines) | `H:/PRISM/JM DIE/WIRE EDM/FIOCCHI/38 CAL CANNELURE 30TPI.txt` |
| **Print→feature bridge** (U01–U06: classifier, GD&T, ToleranceToPassMapper, MaterialCallout, ThicknessAnalyzer, ProcessSelectionAdvisor) | `mcp-server/src/engines/EDMDrawingInterpretationEngine.ts` |
| **Hard constraints / reward rules** (15 verified gotchas) | `mcp-server/src/engines/wedm/CLAUDE.md` §5 |
| **Ground truth** (wire/material/pulse) | `wire-spec-sheets.ts` + `edm-material-db.ts` + `wedm-published-conditions.ts` |
| **Pass-cascade ground truth FA-S family** | `mcp-server/src/data/mitsubishi-fa-s-extracted.ts` |
| **Knowledge backbone to fold in** (171-pair, 139/17/15) | `mcp-server/data/training/wedm-knowledge/wedm_knowledge_{train,val,test}.jsonl` |
| **Warm-start / merge base** | `…/lora-bundle/models/wedm-lora/adapter_model.safetensors` |
| **Reward/safety/reasoning scorers + curriculum (already built)** | `WEDMLoRA{RewardShaping,SafetyEvaluator,ReasoningEvaluator}Engine.ts` + `WEDMCurriculumSchedulerEngine.ts` |

### 2.3 Training method

Staged QLoRA SFT continuing the existing adapter + structured-feature conditioning + synthetic-augment-dominant corpus + program-level RAG over the 4 gold NC programs + a final reward-shaped pass. **Hyperparams inherit the proven bundle:** r16, α32, dropout 0.05, lr 2e-4, 4-bit nf4, target `q/k/v/o/gate/up/down`, **max_seq 2048→4096 (programs are long)**, 3–4 epochs, curriculum-ordered.

### 2.4 Corpus plan — ~2,400–3,200 pairs, 4 strata, synthetic-augment-dominant

| Stratum | ~Pairs | What | Label provenance (`meta.kind`) |
|---------|--------|------|--------------------------------|
| **(A) FEATURE→PARAMS SYNTHETIC CORE** *(the workhorse)* | **~1,500** | Sweep `selectECodeFamily()`'s input space: material ∈ {D2,A2,S7,M2,H13,4140,4340,O1,W1,316,304,6061,WC-Co,…}, thickness 0.25–6.0 in grid, taper ∈ {0,1,3,5,10,15}°, tol ∈ {±0.0005–±0.002}, target_Ra. For each cell: `selectECodeFamily→family`, `getShopFeed/OffsetForPass→cascade`, `getJMDieMCodeSequence→M-frame`. Output = deterministic cascade + 1-line physics justification pulled from the matching gotcha (H-decreasing, taper→H=0, M78-doubled, M90-rough-only). | `feat_param_synth` — **label-noise-FREE** (labels come from the shop-calibrated function) |
| **(B) SKELETON→FULL PROGRAM SYNTHETIC** | **~600** | Use the 4 gold programs as structural templates (`%`/O-num, G90 G20, T84, per-pass E-code blocks, G41/G42+Hnn, G2/G3 arcs, glue-stop M01, M02 end). Parametrically vary geometry (square/circle/hex/slot/cannelure via profile generator), re-emit syntactically-complete FA-10S programs with the (A) cascade. The seq2seq program-synthesis signal at volume. | `skeleton_synth` |
| **(C) PRINT-GROUNDED REAL PAIRS** *(precious real anchor)* | **~150–300** | For the 133 exact-match WIRE-EDM join records: phase20 feature card (PN, material, drawing_number, customer, OCR hints) → input; output = the cascade `selectECodeFamily` produces for that part. The join says WHICH real part; the tech-table gives the verifiable label. Grounds the synthetic distribution in real PNs/customers (ALLFAST, ITW, OMG, FONTANA). Where a real `.NC` exists (3 parts), use actual program text as gold (oversample 5×). | `print_grounded` |
| **(D) ADVISORY/TRIBAL BACKBONE** | 171 | The existing corpus folded in **unchanged** so the model retains the discharge-physics reasoning that gates programs. De-dup the 3 cannelure copies → 1. | `advisory` |

Stratify 80/10/10 with `WEDMCurriculumSchedulerEngine` ordering easy(2-axis, steel, 4-pass)→hard(4-axis UV taper, WC-Co, 5-pass, tight-tol). Mark `meta.confidence` so eval can slice synthetic-vs-real.

### 2.5 Eval — three gates, reusing built machinery

1. **PROGRAM-PARSES gate (hard, deterministic):** every emit runs through a FA-10S parser asserting — valid `%`/O header, G-code grammar, E-code ∈ known family, H-registers resolve, M-code sequence matches `JM_DIE_MCODE_SEQUENCE` (M78 doubled, M90 rough-only, M02 end), G41/G42↔G40 balanced. Fail = auto-zero.
2. **DIMENSIONS-MATCH-PRINT gate:** reconstruct the profile bounding-feature from the emitted toolpath, assert it matches the input card's nominal dims within tolerance; assert H-offset cascade strictly decreasing (anti-pattern AP003) and taper programs have ALL H=0 (NOZE TEST rule).
3. **DISCHARGE-SAFETY gate** = `WEDMLoRASafetyEvaluatorEngine.evaluate()` (wire/dielectric/thermal/fixation S(x); hard-veto on impossible taper>30°, tension>25 N, missing double-M78, M90-on-skim) + quality scoring via `WEDMLoRARewardShapingEngine` + `WEDMLoRAReasoningEvaluatorEngine` + `eval-wedm-knowledge-corpus.mjs`.

**Held-out integrity:** keep all 3 real `.NC` parts + a disjoint set of exact-match join PNs OUT of train, IN test, to measure real-print generalization not synthetic memorization. Report per-stratum (`feat_param_synth` vs `print_grounded`).

### 2.6 Success criteria (all six + 3-of-3 scrutiny + `WEDMLoRACadenceEngine` gate at knowledge ≥0.52)

1. Program-parses ≥ **98%** on test.
2. Dimensions-match ≥ **95%** synthetic, ≥ **85%** held-out print-grounded real-part split (the honest number — OCR noise).
3. Discharge-safety S(x) ≥ **0.9**, **ZERO** hard-veto escapes (single missing double-M78 or M90-on-skim = fail-the-run per CLAUDE.md §5).
4. `selectECodeFamily`-agreement ≥ **97%** (the crux feature→params accuracy).
5. Knowledge-corpus grounding axis **0.431 → ≥0.55**.
6. On the 3 gold real programs: ≥ **90%** token-level + **100%** structural (correct family, pass count, M-frame).

### 2.7 Scarcity strategy (5-pronged)

1. **Synthetic-augment IS PRIMARY, not a fallback** — `selectECodeFamily()` is a shop-CALIBRATED deterministic function, so feature→params pairs are label-noise-FREE gold. We enumerate a verified decision function's domain → "scarce" becomes "arbitrarily large clean corpus."
2. **Tech-tables + tribal carry the physics** the 3 programs cannot (recast∝Ton, flush∝1/√thickness, H-decreasing, taper-H=0) so the model *reasons*.
3. **Skeleton templating** multiplies the 4 real STRUCTURES across synthetic geometry (keeps T84, glue-stops, arc idioms, M-frame DNA).
4. **171-pair corpus + trained LoRA = warm-start equity** (continue, don't re-learn).
5. **Binary `.mcx-8` unlock path (effort-gated, deferred):** the 133 exact-join records point at real `.mcx-8` projects. An **operator-export batch** (open in Mastercam X8 → run `MITSUBISHI_FA10S` post → `.NC`) for the top-N highest-customer-corroborated parts, OR a Mastercam SDK/headless post. Even **50–100 operator-exported NC posts would 30× the real-text corpus** and let the print-grounded stratum become true seq2seq. Synthetic+tribal is honest and sufficient for the feature→params core without it.

### 2.8 Gaps (priority-ordered)

1. **BINARY PROGRAM LOCK (#1):** 3,970 `.mcx-8`/`.mcx`/`.esp` are the real program corpus but un-parseable without operator-export/SDK. The join points AT them but resolves to binary, so true print→program-TEXT seq2seq is blocked.
2. **OCR feature-card completeness:** phase20 gives PN/material/drawing_number/customer but NOT reliably the geometry primitives, taper callouts, or tight-tol ID/slot dims `selectECodeFamily` needs. The weakest real-data leg — needs a dedicated print→feature-card extractor validated against the 15 gotchas.
3. **Thickness rarely on the join** (drives heavy-5-pass) — print OCR seldom captures it; real-grounded pairs often impute it from material/part-family (label-noise source).
4. **Single taper exemplar** (NOZE TEST only) — taper generalization is the thinnest tier; flag for extra real exemplars from the export batch.
5. **No cycle-time / outcome ledger** — `WEDM_OUTCOME_LEDGER.jsonl` referenced but not found; RL/reward stays offline-heuristic.
6. **Multimodal deferred by necessity** (no clean image↔program pairing; binary program side).
7. **Provenance/dedup discipline** — cannelure exists in 4 locations; oversample exact, down-weight loose, **exclude ambiguous from labels**.

### 2.9 Effort — 3–4 focused sessions

- **S1 (highest ROI):** feature→params synthetic generator over `selectECodeFamily`/`getShopFeed`/`getShopOffset` (~1,500 pairs, noise-free) + fold 171-pair + dedup.
- **S2:** skeleton→full-program templater + profile generator (~600) + FA-10S parser for the parses gate.
- **S3:** print-grounded stratum — join 133 exact records to phase20 cards via `phase16 normalize_pn`, build print→feature-card extractor, emit ~150–300 anchored pairs, hold out real parts (OCR-noise handling is the time sink).
- **S4 (~0.5):** continue-train + 3 eval gates + `WEDMLoRA*Evaluator` scoring + 3-of-3.
- **Parallel, operator-gated, OFF critical path:** the `.mcx-8` operator-export batch (30× the real corpus). The regimen ships without it.

---

## 3. REGIMENS #2–#8 (PRIORITY-ORDERED)

> All inherit D1–D5, the shared adapter, `train_wedm_lora_peft.py`, the 3 evaluator engines, `WEDMCurriculumSchedulerEngine`, and the `eval-wedm-knowledge-corpus.mjs` grounding screen. Each adds **one NEW deterministic functional gate** (D4) that is the actual success metric.

### 3.1 — REGIMEN #2 (priority 2): WIRE + MATERIAL SELECTION (stock-aware)

**Capability.** Given material/thickness/feature-geometry/tolerance + JM Die's **actual on-hand stock** (MD+ Pro II 0.25 mm brass + MV1200S 0.20 mm brass on the FA-10S; coated/moly/tungsten only if catalog-justified), recommend the wire (Ø + material/coating) with cited rationale, an achievability verdict against the wire-deflection thickness limit, and a stock-vs-cost tradeoff — **never recommending a wire the shop cannot load without flagging it as a purchase action** (R12 fail-loud).

**Data sources.** `wire-spec-sheets.ts` (6 SKUs, AtomicValue-cited Bedra/Hitachi/Sumitomo) · `edm-material-db.ts` (12 multipass + 14 bimaterial; `resolveEDMMaterial` aliases) · `wedm-knowledge-tips.ts` keystones (kb-015 deflection law δ=F·L²/8T: 0.20 mm→100 mm, 0.25 brass→200 mm/150 mm practical, 0.25 coated→250 mm; kb-005 coated-mandatory for WC/PCD; kb-002 0.20 mm for <R0.5 mm; kb-030 consumption 8–15 kg/wk) · **`ShopConfigurationEngine.ts`** (WEDM-01 `wedm_wire_inventory` = the ACTUAL stock that makes this "stock-aware"; max height 215 mm) · `wedm-published-conditions.ts` · `jm-die-wedm-tech-tables.ts` · `EDMDrawingInterpretationEngine.ts` U04/U05 · `blueprint-program-join-v6` + phase20 (real material+thickness input distribution) · 171-pair corpus (only 5 wire_spec + 5 family pairs today — the seed) · warm-start adapter.

**Method.** LoRA continuation + heavy synthetic-augmentation + **RAG-at-inference mandatory** (retrieve the 6-SKU catalog, don't memorize 6 SKUs into weights — prevents hallucinated grades). The capability is a deterministic JOIN (wire-spec × material discharge-response) gated by ONE physics law (deflection δ=F·L²/8T) — ideal for oracle augmentation.

**Corpus.** ~450–550 pairs (keep 171, add ~300–380) via new `scripts/build-wedm-wire-selection-corpus.ts`, 7 families: (1) **stock-aware selection** ~120 (material×thickness-bucket×feature → SKU + in-stock-or-PURCHASE flag, labeled by kb-015/002/005); (2) **feasibility/deflection-gate** ~50 (incl. deliberate INFEASIBLE cases like 220 mm/0.20 mm → hard NO → sinker EDM); (3) **stock-vs-cost tradeoff** ~50; (4) **material→wire coupling** ~40; (5) **catalog-fact grounding** ~40 (every output carries a cited number — fixes 0.431); (6) **purchase-action/negative** ~30 (R12 fail-loud: moly/tungsten/gamma-coated → "not in stock — purchase {SKU} from {manufacturer}"); (7) **print-grounded** ~30. Curriculum carbon-steel 0.1→carbide/PCD 1.0; all pairs pass safety+reward gate (wire 0.05–0.36 mm, thickness ≤215 mm) before admission.

**Eval.** (A) corpus-quality screen — gate admission at grounding ≥0.6. (B) **NEW functional gate** `scripts/eval-wire-selection.mjs` — ~40 hand-verified gold cases scoring Ø exact-match, coating correctness (coated⟺WC), feasibility-NO recall, in-stock-vs-purchase accuracy, citation presence. (C) safety-veto regression over 100 generations (zero escapes); base-vs-adapter lift. Wire the gate into `WEDMLoRACadenceEngine` (knowledge ≥0.52 AND Ø accuracy ≥0.90).

**Success.** ≥90% Ø exact-match · ≥95% coating correctness · **100% recall on the deflection-infeasibility hard-NO** (220 mm/0.20 mm NEVER reported feasible) · ≥90% in-stock-vs-purchase flag accuracy · grounding ≥0.6 · zero hard-veto escapes · measurable lift over base Qwen · every recommendation carries a citation token.

**Scarcity.** No real wire-SKU labels exist (the 3 NC programs don't record the spool). DO NOT mine programs for wire labels. SYNTHESIZE from the deterministic source-of-truth (wire-spec × material-db gated by kb-015); ground the INPUT distribution in real (material,thickness) from the join/phase20; tribal tips ARE the rationale text bank; warm-start retains the 171-pair base; RAG removes the burden of memorizing the catalog.

**Gaps.** No outcome-validated labels (operators may deviate from kb-015) · only 2 SKUs actually in stock (richness is in feasibility+purchase+cost reasoning, not selection variety) · **gamma-coated brass has no catalog row to cite** for >30 mm WC (kb-005 recommends it) → emit as purchase-action "Bedra Megacut Plus (gamma-phase), not in PRISM catalog" + flag catalog-completeness follow-up · no ERP SKU↔PN/lead-time mapping (out of scope) · deflection-F treated qualitatively (defer exact-F to program-gen-time engines) · exotic-material distribution mismatch (shop runs D2/A2/S7+WC).

**Effort.** Medium, 2.5–4 days. LOW RISK (full harness + adapter + cited source-of-truth all exist; corpus-extension + continuation). GPU run ~6–10 min for ~500 pairs (prior 182 s for 139). Broadcast to cad/cam/quoting (they consume wire-selection).

---

### 3.2 — REGIMEN #3 (priority 2): MULTI-PASS STRATEGY + H-OFFSET CASCADE SCHEDULING

**Capability.** Given material/thickness/taper/tolerance/Ra/wire-Ø: select the JM Die E-code family, emit the full ordered pass schedule (count, per-pass E-code/feed/H-register, **strictly-decreasing H-offset cascade**, rough/skim type), apply the H175 master-trim convention, respect the **taper-zero-offset rule**. *(This is a proven sub-component of Regimen #1 — build it FIRST per §5.)*

**Data sources.** `jm-die-wedm-tech-tables.ts` (GROUND TRUTH: 3 families with exact cascades, `selectECodeFamily`/`getECodeForPass`/`getShopFeed`/`getShopOffsetForPass`, `JM_DIE_MCODE_SEQUENCE`, `H175_MASTER_OFFSET`) · `jm-die-wedm-program-patterns.ts` (4 programs, `JM_DIE_OFFSET_PATTERNS`, `JM_DIE_ECODE_FAMILY_DISTRIBUTION` 60/25/10/3/2%, `detectECodeFamily`) · `wedm-knowledge-tips.ts` (AP003 H-decreasing, skim-feed-peaks-mid, taper-H=0, halve-feed E12xx-heavy, M90 rough-only) · `wedm/CLAUDE.md` §5 (#1/#2/#8/#9/#12/#14) · `wedm-published-conditions.ts` (cited feeds/Ra) · `edm-material-db.ts` · the 3 real programs (seq2seq targets) · `WEDMLoRADatasetBuilderEngine.ts` (847-line builder, `pass_strategy` family defined) · curriculum/reward/safety engines · warm-start adapter · `build-wedm-knowledge-corpus.ts` + `eval-wedm-knowledge-corpus.mjs`.

**Method.** QLoRA + warm-start continued fine-tune, synthetic-augment dominant.

**Corpus.** ~350 pairs, 5 types: (1) **family-select** ~80 (`tech_select`, enumerate decision grid incl. boundaries thk=50 vs 51, tol=0.005 vs 0.0049, and Al/Inconel fallback); (2) **full-pass-schedule** ~120 (`tech_table`, the densest-grounded — every line a numeric anchor, emitted verbatim from the getters); (3) **per-pass QA** ~70 (`tech_pass`, ties each value to recast-shrinks-per-skim + non-monotone-feed physics); (4) **invariant/anti-pattern** ~50 (mix of VALID + DELIBERATELY-BROKEN cascades — non-decreasing offset=AP003, non-zero-H-taper, M90-on-skim — output pass/fail + corrected schedule; deterministic labels double as the eval set); (5) **H175-trim + seq2seq** ~30 (H1=0.0085+H175 header pattern + real pass-block excerpts from the 3 programs). Stratify 80/10/10 family-balanced; curriculum-sort.

**Eval — FOUR gates** (held-out 10% + frozen 40-case invariant battery): (1) **DETERMINISTIC CASCADE-CORRECTNESS** (primary, code-checkable, the load-bearing piece): parse emitted table, assert offset(n) strictly-decreasing for 2-axis, all-zero for taper, E-code = `getECodeForPass`, feed = `getShopFeedForPass`±tol, family = `selectECodeFamily` → ≥95% exact-match on test, **100% on the battery** (single AP003 = FAIL). (2) Safety hard-veto = 0. (3) Reward physics+syntax ≥ baseline (no tribal-knowledge forgetting). (4) grounding ≥0.75 on slice, overall knowledge ≥0.60.

**Success.** ≥95% exact-match · 100% on 40-case invariant battery (zero AP003) · 0 vetoes · grounding ≥0.75 · no reward regression. "Done" when for any (material,thickness,taper,tol,Ra,wire) in the JM Die envelope it emits the correct family + a fully-ordered, physics-valid, machine-runnable schedule with H175-trim applied.

**Scarcity.** Programmatic synthetic augmentation is the workhorse (the getters are a deterministic GENERATOR → enumerate the grid, emit EXACT cascades); tech-tables+tribal+published-conditions are the value/grounding; the 3 real programs validate synthetic cascades match real output; warm-start; **deterministic labels (monotonicity/taper-zero/family-match all code-checkable) let synthetic pairs double as the eval set** — no human-labeling bottleneck, augmentation cannot drift.

**Gaps.** 6–7-pass E952/E56xx families (3%/2%) have NO extracted per-pass tables → model extrapolates/falls-back · `feed_ipm` null for final taper skim (E2825) + operator-entered → teach "operator-enters-at-machine," don't invent · no outcome ledger → optimizes table-fidelity not real Ra/dimensional outcome · H175 operator-set to 0.0000 in data (no non-zero-trim example) · single dialect (FA-10S W31MV-2, zero transfer to Sodick/Makino/Agie cascades) · **`WEDMCurriculumSchedulerEngine` may be config-only (~60 lines)** — complete the score/sort body (~150 LOC) before curriculum ordering is executable · grounding eval measures concreteness NOT correctness — the cascade-correctness gate is what guarantees H-offsets are right.

**Effort.** ~3–4 days. Net-new = the deterministic grid-augmenter + cascade-correctness eval harness (~1.5 days). Low risk (infra built+validated).

---

### 3.3 — REGIMEN #4 (priority 2): DISCHARGE-PARAMETER OPTIMIZATION

**Capability.** Pulse-on/off, peak current, gap/servo voltage, wire speed + the MRR↔Ra↔recast tradeoff, per material-group/thickness/wire-Ø/pass-type, in W31MV-2 / multi-dialect terms, grounded in JM Die FA-10S E-code families.

**Data sources.** **`wedm-published-conditions.ts`** (PRIMARY REGRESSION GROUND TRUTH — 63 cited `PublishedPulseCondition` records → {Ra, feed, MRR}; Klocke 2013 / Ho&Newman 2003 / Rajurkar 2006 / vendor manuals) · `jm-die-wedm-tech-tables.ts` (ties published points to shop E-codes) · `edm-material-db.ts` (k_ra/α/max-current per ISO group — the closed-form exponents) · `wire-spec-sheets.ts` · `wedm-knowledge-tips.ts` (Ton elasticity 0.85–0.90; recast d=2√(α·t_on); reduce-power-first; flush 1/√(thk/50); skim-feed peaks mid) · `wedm-published-machines.ts` (per-machine envelope clamps) · **`WEDMRaPredictorEngine.ts` + `WEDMMRRPhysicsEngine.ts` + `WEDMRecastDepthPredictorEngine.ts`** (canonical closed-forms — the SYNTHETIC ORACLE and numeric eval oracle) · `WEDMLoRARewardShapingEngine.ts` (`PHYSICS_BOUNDS` pulse_on 0.1–50, peak 1–50 A, MRR 1–300, Ra 0.1–6.3 + a regex extractor for t_on/peak/Ra/MRR — reuse verbatim as the RL/eval gate) · `WEDMLoRASafetyEvaluatorEngine.ts` · warm-start adapter · `mitsubishi-fa-s/makino-duo/agie-power-extracted.ts` (multi-vendor cross-ref).

**Method.** Continue-trained QLoRA SFT on a new `discharge_condition` pair family (real + synthetic). **Phase 2 (optional, gated on Phase-1 eval):** best-of-N reranking / reward-weighted fine-tune using the built reward+safety engines as the scalar reward (RLHF-lite, no new reward model). Inference clamped by the safety veto.

**Corpus.** ~600–900 pairs: (A) **real anchor** ~150–190 (each of 63 records → forward {spec→discharge set + Ra/MRR/feed + citation} + inverse {goal Ra→skim set} + tradeoff {Δt_on/I_p with elasticity}); (B) **JM-Die-grounded** ~60 (E-code family pass → implied discharge regime + M78×2/M90-rough-only); (C) **anchor-tethered synthetic** ~300–450 — sweep {11 materials × {brass0.25,brass0.20,coated0.25} × thickness[5,10,25,50,100,150] × {rough,skim1–4}}, CALL the 3 physics engines, keep only points inside `PHYSICS_BOUNDS` + machine/wire envelope + within ±1σ of the nearest real anchor (anchor-tethered synthesis, never free invention; tag `meta.anchored_to`); (D) **contrastive/negative** ~40 (t_on=60 µs, M90-on-skim, non-decreasing skim energy → correction). Confidence-weighted sampling (down-weight extrapolated records). Stratify by kind+material; merge the 139 advisory (do NOT discard); grounding-gate <0.5 reject.

**Eval — THREE tiers.** (1) **NUMERIC REGRESSION HOLD-OUT** (the real gate): hold out ~10 of 63 real records entirely (never leaked via a synthetic anchor either); parse with the reward-engine regex extractor; **Ra MAPE ≤20%, MRR MAPE ≤25%, t_on within ±1 family step**; 100% structural invariants (decreasing rough→skim energy, non-monotone skim FEED peaking mid P1<P2>P3>P4, recast cascade 15–25→1–3 µm, taper H all zero). (2) physics-consistency/safety — 0 hard-veto escapes, physics_accuracy ≥0.85. (3) lexical/knowledge regression guard — grounding 0.431→≥0.60, overall >0.522, **no regression on the original 15-pair advisory test set**.

**Success.** Ra MAPE ≤20% + MRR MAPE ≤25% · t_on ±1 step + I_p ±15% · 100% structural invariants · 0 veto escapes · physics_accuracy ≥0.85 + reward mean > baseline · grounding ≥0.60 + no advisory regression · reproduces JM Die E12xx/E28xx discharge intent for the 4 ground-truth programs.

**Scarcity (5-layer, dependency-ordered, R13).** (L1) **MINE THE OVERLOOKED REAL DATA FIRST** — the 77.3 KB `wedm-published-conditions.ts` was never converted to training pairs; highest-ROI, turns advisory→numeric-regression at zero new-data cost. (L2) multiply each record ×2–3 (forward/inverse/tradeoff) → 63→~150–190 without inventing numbers. (L3) anchor-tethered synthetic via the existing engines, clamped to bounds+envelope+±1σ. (L4) continue-train the adapter, reuse all infra. (L5) contrastive negatives from gotchas → rules become labeled wrong→right pairs.

**Gaps.** No real MEASURED Ra/MRR off JM Die's FA-10S (literature-calibrated, not shop-validated; no outcome ledger) · 63 points sparse for an 11-material×6-wire surface → fidelity bounded by the closed-form engines, synthetic can over-smooth nonlinearities (slow-ion MRR rolloff) · single real dialect (cross-dialect unverified) · open/servo-voltage coverage thinner than t_on/I_p; no real-time servo/PID tuning · binary archive locked · confidence_level not yet weighting the SFT loss · safety DEFAULT_LIMITS not calibrated to the FA-10S generator tier.

**Effort.** Medium ~3–5 days. ~90% existing infra; net-new = discharge pair family + synthetic generator + numeric-regression eval (~400–600 LOC). GPU ~10–20 min for ~1000 pairs. Broadcast `--kind training` to india + neighbors.

---

### 3.4 — REGIMEN #5 (priority 3): FLUSHING STRATEGY + WIRE-BREAK AVOIDANCE

**Capability.** Given a cut situation: emit a flushing schedule (pressure/pass, mode, nozzle standoff, dielectric conductivity target) AND a wire-break risk verdict with a **ranked, physics-ordered mitigation** (reduce discharge energy FIRST, then tension, then feed, then flush).

**Data sources.** `wedm-knowledge-tips.ts` (74 flush/break/tension lines) · `wedm/CLAUDE.md` §5 gotchas 5,6,7,11,12,14 (causal spine) · `wedm-published-conditions.ts` (numeric anchor grid) · **4 engine oracles** that LABEL synthetic cases: `WEDMWireBreakPredictorEngine.ts` (P(break)=1−exp(−λ·H·DC/FF), TENSION_PENALTY=0.5) · `WEDMWireHeatingEngine.ts` (I²R thermal) · `WEDMDielectricFlushAdjustEngine.ts` (conductivity→pressure) · `EDMCuttingParamFlushEngine.ts` (73 KB; mode select, P_base=0.4+0.08×depth — primary flush oracle) · `wedm-constants.ts` · `wire-spec-sheets.ts` · `jm-die-wedm-tech-tables.ts` · FIOCCHI cannelure (the ONE closely-spaced/halve-feed exemplar) · 171-pair flush/break subset (~20–30 seed) · warm-start adapter · `knowledge/wiki/architecture/actions/cam/wedm-flush-adequacy-*.md` + `wedm-thermal-release-*.md` (CoT scaffolds).

**Method.** Continued-finetune QLoRA (warm-start) + engine-oracle synthetic-augment + curriculum + RAG-at-inference (adapter never replaces the oracle).

**Corpus.** ~350–450 pairs (4 families): (A) **flush-schedule** ~150 (per-pass 8–10 bar rough→3–5 bar skim per gotcha-7, mode, standoff ~0.5 mm, flush-eff=1/√(t/50), LABELED by EDMCuttingParamFlush+DielectricFlushAdjust); (B) **wire-break-risk** ~150 (P(break) bucket + ROOT CAUSE disambiguated by which oracle fires: WireHeating high→thermal, tension>1.0→mechanical, thick+low-flush→starvation; + the RANKED energy-first mitigation, LABELED by WireBreakPredictor); (C) **hard-gotcha** ~50 (halve-feed closely-spaced, >50 mm flush-starvation, coated-for-WC, M90-rough-only, M78-doubled); (D) **tribal-reuse** ~50–80 (existing subset re-grounded with the numeric anchor). **Cell-stratified split (split by material×thickness cell, not row — measures generalization)**; every output passes reward+safety pre-insertion (failed pairs logged, not silently dropped).

**Eval — three gates.** (1) corpus grounding ≥0.70 (headline KPI, reject build if <0.65). (2) **HELD-OUT-ACCURACY** (the real one): flush-pressure ±1 bar of `EDMCuttingParamFlushEngine` ≥85%, break-root-cause F1 ≥0.80, **mitigation-step-1=reduce-energy ≥95%** (safety-critical ordering, near-zero tolerance for tension-first). (3) safety-veto = ZERO violations. Catastrophic-forgetting check on the original 171-corpus (knowledge must not drop >0.03 from 0.522).

**Success.** Grounding ≥0.70 · ±1 bar ≥85% · root-cause F1 ≥0.80 · step-1-reduce-energy ≥95% · zero vetoes · no >0.03 regression · behind-RAG agreement with the deterministic engine ≥90% on a 50-case JM-Die holdout + correctly flags FIOCCHI halve-feed + >100 mm coaxial-8–10-bar from cold prompt. **Caveat-honest:** trains REASONING+FORMAT; the NUMBERS come from the oracle via RAG — success is the adapter never overriding the oracle.

**Scarcity.** 3 real programs are useless for statistical training of this capability → lean on tech-tables/published-conditions grid + tribal/gotcha causal spine + **the decisive move: sample the grid and LABEL each input with a DETERMINISTIC ENGINE-ORACLE** (WireBreak/WireHeating/DielectricFlush/CuttingParamFlush) → 3 programs become 350–450 oracle-verified pairs without hallucination, all physics-bounded by the reward+safety pre-screen + warm-start.

**Gaps.** No real break OUTCOME data (`WEDM_OUTCOME_LEDGER.jsonl` not found) — labels are engine-synthetic, model learns the predictor not the machine · flush-pressure labels model-derived not sensor-PSI · single Mitsubishi controller (M80/M81/M90 semantics; cross-controller untested) · closely-spaced evidence is ONE program · **oracle-circularity risk** (train on engine outputs, eval against same engines = imitation fidelity not real-world correctness — mitigated only by the RAG design, stated loudly per R12) · WireBreakPredictor η-model calibrated to one basis point (extrapolation to thin-wire/thick-WC corners lowest-confidence) · no dielectric-temp/viscosity variation (hot-tank degradation unmodeled).

**Effort.** Medium ~3–4 sessions — **lowest-effort high-priority capability** precisely because the oracles + pipeline already exist (984 test lines). GPU ~8–12 min (warm-start, ~140→~450 pairs). Stop Ollama first.

---

### 3.5 — REGIMEN #6 (priority 3): SURFACE INTEGRITY (recast / HAZ / Ra) PREDICTION

**Capability.** Predict per-pass Ra (µm), recast white-layer depth (µm), HAZ depth (µm), residual-stress band (MPa) with a calibrated uncertainty band and the **AMS-2628 7.5 µm recast cap as a hard gate**. *(A proven sub-component of Regimen #1's eval — build it on the #4 discharge foundation per §5.)*

**Data sources.** `wedm-published-conditions.ts` (69 records — **the Ra regression ground truth, cited**; **NO recast/HAZ column — the scarcity gap**) · **`WEDMRaPredictorEngine.ts`** (Klocke Ra=k_ra·I_p^α·t_on^β + LoRA correction) · **`WEDMRecastDepthPredictorEngine.ts`** (Carslaw-Jaeger z_m(t)=2√(α·t)·√(ln…)) · **`WEDMHeatAffectedZoneEngine.ts`** (HAZ + martensite/bainite/pearlite) · `EDMMonitorSurfaceIntegrityEngine.ts` (recast, HAZ multiplier Ti=2/Ni=4/steel=3, residual 200–800 MPa) · `wedm/CLAUDE.md` §5 #2/#3/#4/#13 (recast 15–25→1–3 µm, AMS cap 7.5, Ton-elasticity, H13/S7 DELAYED cracking 24–48 h) · `wedm-knowledge-tips.ts` (36 recast/HAZ Carslaw-cited) · `edm-material-db.ts` · `jm-die-wedm-tech-tables.ts` (Ra targets 16–20/<16 µin) · 3 real NC programs (witness pairs) · `WEDMLoRARewardShapingEngine.ts` (Ra 0.1–6.3) · curriculum · warm-start adapter.

**Method — two-track.** (A) **GBM / closed-form-plus-LoRA-residual numeric regressor with conformal uncertainty** for Ra/recast/HAZ; (B) continued QLoRA SFT for the structured-output + cited-reasoning wrapper. Augmentation = physics-anchored constraint-filtered synthetic + 171-pair.

**Corpus — 4 families.** (1) **numeric regression set** (~69 anchors → ~2000 augmented): parse 69 records → Ra labels weighted by source confidence; **recast/HAZ labels generated via the engines as the physics oracle, flagged `label_source='physics_oracle'`**, clamped to gotcha #3 envelope (reject out-of-band); constraint-filtered densification keeping only Ton-monotone + recast∝√(t_on) samples. (2) **per-pass witness** ~30–50 high-trust (ITW/FIOCCHI/NOZE → Ra target band + recast-collapse narrative; the ONLY real anchors, weight highest). (3) **LoRA SFT reasoning** ~120–180 (`surface_integrity` family, structured output + CoT citing #3/#4/#13 + Klocke/Carslaw, mining the 36 tribal tips; hard NEGATIVE/edge: H13/S7 delayed-crack, AMS-cap violation → FAIL). (4) **contrast/invariant** ~40 (algebraic invariants per R9: recast(20)>recast(10), Ra(rough)>Ra(skim), recast_skim4≤cap, HAZ(Ni)>HAZ(steel)). Split 80/10/10 stratified by material+pass.

**Eval — three-tier.** (1) **NUMERIC ACCURACY** (primary): leave-one-material-group-out CV on 69 Ra anchors → MAE/MAPE; **recast/HAZ: cannot validate vs measured data — validate the oracle against the 4 cited gotcha envelopes as a CONSISTENCY gate + conformal band coverage ≥90%; FLAG LOUDLY physics-validated-only (R12).** (2) invariant/monotonicity suite — 100% pass. (3) reasoning/safety — `WEDMLoRAReasoningEvaluator` + `SafetyEvaluator` (veto AMS-cap/delayed-crack-ignoring) + grounding rise; witness predictions inside tech-table Ra bands.

**Success.** Ra leave-one-material-out MAE ≤0.3 µm (or MAPE ≤15%), beating Klocke-base-only ≥20% · 100% invariant suite (recast-√(t_on), Ra-elasticity 0.85–0.90, AMS-2628 never silently exceeded) · conformal 90% band covers literature ≥90% · 3-NC witnesses inside Ra bands · SafetyEvaluator vetoes 100% of cap-violation/delayed-crack-ignoring · grounding >0.45 · **every recast/HAZ output carries an explicit 'physics-validated, not measurement-validated' provenance flag (R12)**.

**Scarcity (5 levers).** Treat 69 Ra rows as ONLY measurement-grade anchors (confidence-weighted, no extrapolation past 8 covered groups); generate recast/HAZ via the engines accepting ONLY in-envelope outputs; constraint-filtered densification 69→~2000; tribal/gotchas as reasoning grounding; warm-start. **CRITICAL HONESTY:** recast/HAZ stay physics-validated until a real metrology ledger is captured — registers **"capture profilometer Ra + cross-section recast SEM on next FA-10S run"** as the highest-ROI follow-up that converts consistency→correctness.

**Gaps.** **NO measured recast/HAZ/residual ground truth anywhere** (69 rows are Ra-only) — the single biggest honesty boundary · 69 rows cluster on ~8 groups (carbide/PCD/Inconel thin) · no outcome ledger · 3 real programs FA-10S/D2+SS only · physics-oracle circularity (only 69 Ra + 3 NC break it, Ra-only) · residual-stress + delayed-cracking are qualitative flags not regression-able (model as classification head) · wire-type Ra effect sparse.

**Effort.** Medium 3–5 days. Low compute (~182 s/run precedent); main cost = label-pipeline + invariant-suite engineering.

---

### 3.6 — REGIMEN #7 (priority 3): CONTROLLER-DIALECT POST-PROCESSING (5 vendors)

**Capability.** Mitsubishi W31MV-2/M800, Fanuc α-C, Sodick LN, Makino Hyper-i, AgieCharmilles CUT.

**Data sources — 5 deterministic emitters (the oracle).** `WEDMPostMitsubishiEngine.ts` (T84 anti-electrolysis, M28 submerge, M80/M81 jets, G41/G42 Hnn, M6 AWT) · `WEDMPostFanucEngine.ts` (E-pack, M50 thread, M60 cut, G61.1) · `WEDMPostSodickEngine.ts` (C### conditions, M50/M51 AWT, SF-Liner) · `WEDMPostMakinoEngine.ts` (Hyper-i E-pack, HS wire, HyperCut) · `WEDMPostAgieEngine.ts` (G08/G09 taper, ISPG/IPG, ACO) · `jm-die-wedm-tech-tables.ts` · `mitsubishi-fa-*/makino-duo-*/agie-power-extracted.ts` (vendor tech tables) · **`controller-knowledge-tips.ts`** (117 KB cross-vendor dialect-diff tribal — the translation seed) · `wedm-published-machines.ts` · `wedm-published-conditions.ts` · 3 real Mitsubishi programs (the ONLY real post-outs) · 171-pair (only 7 controller_dialect pairs — the gap) · warm-start adapter · reward/safety/reasoning engines.

**Method.** LoRA (extend the adapter) + synthetic-augment via deterministic-engine oracle + RAG grounding.

**Corpus.** ~1,200–1,800 pairs, **dialect-balanced ~240–360/vendor** (current = 7), 5 families: (1) **neutral-plan→dialect-gcode** ~60% (sweep the 5 engines over material×thickness×{2-axis,taper}×{4-pass,5-pass}×5-vendor grid — labels deterministic and free); (2) **cross-dialect translation** ~15% (Mitsubishi → Fanuc/Sodick/Makino/Agie; teaches G41/G42-Hnn→C###→E-pack→G08/G09); (3) **dialect-diff advisory** ~10% (from `controller-knowledge-tips.ts`); (4) **fill-the-parameter-block** ~10% (RAG grounding against `wedm-published-conditions` + per-vendor tech files — attacks 0.431); (5) **vendor-detect + lint** ~5% (flag M28 on a Fanuc post). **Split by (geometry-family × material) NOT by vendor** so every vendor is in train/val/test.

**Eval — three-tier.** (1) **EXACT-MATCH HARNESS** (the decisive metric, uniquely possible because the engines are deterministic): hold out a pass-plan grid, generate gold via the 5 engines, compare line-by-line; report per-vendor exact-line-match % + critical-code presence (Mitsubishi double-M78+T84? Agie G08/G09 not Hnn?). (2) safety-veto on every program = 100% pass. (3) 3-axis grounding screen → ≥0.65; per-vendor confusion matrix for vendor-detect.

**Success.** Per-vendor exact-line-match ≥90% on neutral-plan→gcode · critical-code presence 100% (no dialect emits another's illegal codes) · safety veto-pass 100% · translation preserves geometry while swapping ALL dialect tokens (lint-pass ≥25 programs) · grounding ≥0.65 · no regression on the 171-pair (≥0.52) · fits r16/α32 + the existing `WEDMLoRAAdapterEngine` load path.

**Scarcity.** Only 3 real Mitsubishi text post-outs; Fanuc/Sodick/Makino/Agie have ZERO real JM Die programs. **(A) DETERMINISTIC ENGINE-AS-ORACLE** — the 5 engines are pure emitters → UNLIMITED exact-labeled synthetic pairs (the labels ARE the production post output, not approximate); biggest lever, uniquely available. (B) tech-table grounding fills every parameter block with real E-codes. (C) `controller-knowledge-tips.ts` anchors translation without real foreign programs. (D) translate the 3 real Mitsubishi programs → synthetic foreign so foreign-vendor data inherits real geometry. (E) warm-start. **Validate synthetic realism by round-tripping** (parse a synthetic program back through the vendor lint, confirm identical re-emit).

**Gaps.** Real Fanuc/Sodick/Makino/Agie programs = ZERO → synthetic gold is exact to the ENGINE but **the engines are PRISM's interpretation of each dialect, never validated against a real non-Mitsubishi machine post** (systematic engine error → learned error; mitigate by spot-validating against vendor programming manuals BEFORE mass-generation) · only Mitsubishi has real ground truth · binary lock · 14 sealed customer ZIPs (may hold real foreign post-outs — extract+inspect prerequisite) · Fanuc/Sodick parameter grounding weaker (prose-heavy) · **verify `WEDMPostMakinoEngine` actually diverges (no HyperCut/E-pack markers in quick scan)** · no outcome ledger (SFT only).

**Effort.** Medium ~3–5 days. Compute is NOT the constraint (deterministic oracle makes data cheap); effort dominated by validating the 4 non-Mitsubishi engines are faithful dialects (Day 5 buffer, the highest-risk gap).

---

### 3.7 — REGIMEN #8a (priority 4): WIRE-EDM JOB COST / QUOTING

**Capability.** Print/feature/material/thickness/quantity → itemized cost (wire + machine-time + operator + overhead + setup + programming + dielectric/consumables → subtotal → margin → price/piece + batch).

**Data sources.** **`wedm-constants.ts`** (canonical: `WEDM_DEFAULT_RATES` machine $85/operator $35/overhead $15/programmer $65/hr, margin 0.25, overhead 0.18; `WEDM_WIRE_COST_USD_PER_M` brass_0_25 $0.024/coated $0.055/moly $0.42/tungsten $0.95; `WEDM_SPOOL_SPEC` 0.25 mm=15000 m, auto_thread 0.5 min, end_buffer 500 m; `WEDM_FLUSHING_FACTORS` dielectric $2.5/hr, filter $180/250 hr, resin $320/500 hr) · **`WEDMJobCostEngine.ts`** (`calculateJobCost` = DETERMINISTIC ORACLE → 7-component breakdown + per_piece/batch + spools_needed + cost_per_mm) · `EDMCostDocumentationEngine.ts` · `WEDMQuoteBridgeEngine.ts` (line-item taxonomy + quantity-break — the output schema) · `wire-spec-sheets.ts` · `ShopConfigurationEngine.ts` (WEDM-01 $85/hr, efficiency 0.70) · `wedm-knowledge-tips.ts` (kb-005 coated economics, kb-030 consumption, ml-012 cost-mode) · `jm-die-wedm-tech-tables.ts` (feeds→cut-time) · `blueprint-program-join-v6` (real perimeter/thickness/material/customer for INPUT realism only — NO prices) · 171-pair (1 cost pair to extend) + warm-start adapter + reward/reasoning engines.

**Method.** LoRA SFT (continue) + oracle corpus + RAG grounding (keeps live rates fresh); reward/reasoning engines as automated eval, not RLHF.

**Corpus.** ~260–320 cost pairs (de-dilutes the current 1/139 to ~40%), 6 families all run through `WEDMJobCostEngine`: (1) **full-quote** ~120 (real perimeter/thickness/material from the join → 7-component breakdown + spools + cost_per_mm + cited rates); (2) **wire-cost-delta** ~40 (brass vs coated net-$); (3) **quantity-break** ~40 (qty 1/5/25/100 amortization); (4) **cost-driver/sensitivity** ~30; (5) **consumable/spool** ~25; (6) **pass-strategy-cost** ~25. Dedup `cost:wedm-quote-*`; curriculum-order; grounding-gate <0.45 drop.

**Eval — two tiers, both INJECTED-reader (no fake-reader per RGS-MS1).** Tier 1 **NUMERIC CORRECTNESS** (the real gate): 40 held-out oracle scenarios, regex-parse $ figures, assert total within **±5%**, each of 7 components ±10%, spools_needed exact, cost_per_mm ±5% — randomized perimeter/thickness/qty means a hardcoded answer cannot pass (R9). Pass bar ≥85% within ±5%. Tier 2 reasoning/safety via the 3 engines. Regression guard: 171-pair knowledge ≥0.52. Write `wedm-cost-eval-report.json`.

**Success.** ≥85% within ±5% total + 7 components ±10% · spools exact 100% · grounding 0.431→≥0.55 · reasoning ≥0.60 · no 171-pair regression · cost-driver inversion ≥8/10 · coated-vs-brass verdict ≥9/10. Deploy gate: `WEDMLoRACadenceEngine` knowledge+cost ≥0.52 AND Tier-1 ≥85%.

**Scarcity.** Binary-locked + NO quote-vs-actual ledger → does NOT depend on scarce programs. (1) **DETERMINISTIC ORACLE AUGMENTATION** — `calculateJobCost()` is a pure function over canonical constants → UNLIMITED exact-label pairs (model-distillation, sidesteps missing price-history). (2) INPUT realism from the 76 k join. (3) tribal rationale wrapping. (4) extend the 171-pair + adapter. RAG keeps rates live so scarce/rotting prices are never memorized.

**Gaps.** **NO real quoted prices anywhere** — oracle defines "correct" by its own model (R12: if the rate model is wrong, the LoRA is confidently wrong; mitigate by RAG-grounding to live rate-card + flag corpus as model-distillation not market-calibration) · cut-time uses flat default 2.5 mm/min unless caller passes material/thickness speed (inject from tech tables or labels unrealistic for thick/carbide) · binary lock (perimeter synthesized → label noise) · no ERP linkage (`mustHumanVerify`) · 2026 prices rot (→ RAG over memorization) · small corpus (ablation needed) · **`calculateJobCost` is perimeter-based, no taper/4-axis time → taper quotes (NOZE TEST class) under-costed** (flag known underestimate until the engine adds taper time).

**Effort.** Medium ~2–3 days. Low infra risk; net-new = oracle generator + the numeric (not lexical) Tier-1 eval.

---

### 3.8 — REGIMEN #8b (priority 4): STOCK + EQUIPMENT-AWARE JOB PLANNING

**Capability.** Given part material/thickness/taper/tolerance + JM Die's real equipment envelope + wire inventory → a planned job (wire selection, E-code family, pass count, feasibility verdict, wire consumption+cost) AND an **infeasibility refusal** when the part exceeds the machine/stock envelope. *(The integration regimen — it composes #2 wire-selection + #3 pass-strategy + envelope/inventory awareness. Build LAST per §5.)*

**Data sources.** `jm-die-wedm-tech-tables.ts` (`selectECodeFamily` planning core) · `wedm-knowledge-tips.ts` (kb-015 thickness limits, kb-005 coated, kb-030 consumption, ml-012 cost-opt) · `wire-spec-sheets.ts` · **`ShopConfigurationEngine.ts`** (WEDM-01 envelope: max height 215 mm, UV ±80 mm, max taper 30°, $85/hr, efficiency 0.70, `wedm_wire_inventory[]` with `remaining_pct` — equipment envelope + LIVE inventory) · `edm-material-db.ts` · `jm-die-wedm-program-patterns.ts` · **`EDMFeasibilityEngine.ts`** (conductivity/geometry/tolerance/start-hole/taper/wire-access/cut-time — feasibility ORACLE+labels) · `wedm-published-conditions.ts` (cycle-time→consumption) · `wedm-published-machines.ts` (cross-machine envelope, taper=atan(UV_max/guide_gap)) · 171-pair + warm-start adapter · the 3 real programs (plan→program anchors) · 3 evaluator engines + curriculum.

**Method.** LoRA continued fine-tune + synthetic-augment + **thin RAG for live envelope/inventory** (the 215 mm number, `remaining_pct`, 2024 prices stay out of weights).

**Corpus.** ~1,800–2,400 pairs, 4 strata: **(A) synthetic plan grid** ~1,400 (cross-product of materials×thickness[6/13/25/50/75/100/150]×taper[0/2/5/15]×tol[IT6–IT12], GROUND-TRUTH via the real getters, wire via kb-015+kb-005, cost via wire-spec×cut-length, envelope-checked, per-decision cited justification); **(B) infeasibility/refusal** ~350 (the safety spine — out-of-envelope cells: 250 mm/0.25 mm brass > 200 mm, taper 20° > 30°, WC with plain brass, `remaining_pct=0` → STRUCTURED REFUSAL naming the violated constraint + cited rule + corrective action — what makes it "equipment-aware"); **(C) real-program anchors** ~30–50 (reverse-build plan→program from ITW/NOZE/FIOCCHI, up-weight 3–5×); **(D) fold-in 171** unchanged. Curriculum-attach + sort; dedup (A) against the 3 real cells (no test leakage).

**Eval — REUSE the 3-engine harness.** (2) **PLAN CORRECTNESS** (new, deterministic, load-bearing): compare chosen (family, pass_count, wire_type) vs ground-truth from `selectECodeFamily`/kb-015 — exact-match the primary number (true intent test, R9). (3) **REFUSAL RECALL/PRECISION** on out-of-envelope cells (feasible-but-refused or infeasible-but-planned = hard fail). (4) `WEDMLoRASafetyEvaluator` veto = 0. (5) reward physics-bounds + reasoning grounding ≥0.60. (6) lexical pre-flight. **Compare warm-started vs 171-only on the same plan-correctness test set to prove the synthetic strata added skill.**

**Success.** Plan-correctness exact-match ≥0.90 · **refusal recall ≥0.95 AND precision ≥0.90** (must refuse 250 mm/0.25 mm brass + 35° taper, must NOT refuse a feasible 150 mm D2 job) · zero vetoes · grounding ≥0.60 + overall ≥0.60 · 3 real-program anchor cells reproduced · **≥+15 pp plan-correctness over the 171-only adapter** (fail loud if no delta — the synthetic strata added nothing).

**Scarcity.** Does NOT depend on programs: tech-tables as oracle (deterministic generators of (input,plan) pairs); tribal+gotchas as refusal/justification spine; synthetic combinatorial augmentation (~1,750 cells, both feasible AND out-of-envelope, balanced via curriculum); 171-pair + adapter warm-start; 3 real programs up-weighted 3–5×. Live-drift numbers (215 mm, `remaining_pct`, 2024 prices) kept OUT of weights, read via RAG.

**Gaps.** No cycle-time ground truth (consumption/cost DERIVED, labeled estimate) · no live inventory feedback loop (`remaining_pct` static default; RAG mitigates but source not live) · wire-cost confidence 80%, single 2024 snapshot · single dialect (cross-machine generalizes by envelope numbers only) · material diversity gap (D2/SS only in real programs; carbide/PCD rule-grounded not program-verified) · start-hole/workholding feasibility has no ground-truth outcomes · thin taper corpus (1 real NOZE) · tolerance→pass IT-class inferred not measured · grounding-density-vs-precision tradeoff (target 0.60, needs adaptive grounding the existing corpus lacked).

**Effort.** ~3–4 days. Low risk (every dependency exists+validated). GPU ~20–40 min (larger corpus). Broadcast `--kind corpus+training --affects india`.

---

## 4. CROSS-CUTTING DATA-ASSEMBLY PLAN

How prints + programs + stock + equipment + tribal combine into one coherent corpus factory.

### 4.1 The shared assembly pipeline (one factory, 8 generators)

```
                       ┌──────────────────────────────────────────────┐
 SHARED PREPROCESS     │ phase16-blueprint-program-join-v6.py          │
 (build ONCE, reuse)   │   normalize_pn / garbage_class / cust_overlap │
                       │   → wire-edm join slice (machineCategory==     │
                       │     'WIRE EDM', match_confidence∈{exact,loose})│
                       │ + phase20 feature cards (material,thickness,   │
                       │   customer,drawing_number)                     │
                       │ → REAL INPUT-DISTRIBUTION SAMPLER (shared by   │
                       │   regimens #1,#2,#8a,#8b)                      │
                       └───────────────────┬──────────────────────────┘
                                           ▼
 PER-REGIMEN          scripts/build-wedm-{print-program,wire-selection,
 GENERATORS            pass-schedule,discharge,flushing,surface-integrity,
 (clone of             dialect-post,job-cost,job-planning}-corpus.ts
  build-wedm-          each: pull real inputs ← sampler
  knowledge-           call the deterministic ORACLE for the label
  corpus.ts)           wrap tribal/gotcha rationale ← reasoning bank
                       emit Alpaca {instruction,input,output,meta}
                       grounding-gate → stratified split → curriculum-sort
                                           ▼
 MERGE POLICY         All regimens FOLD IN the 171-pair corpus UNCHANGED
                       (retain physics/safety breadth; prevent catastrophic
                        forgetting). De-dup the 3 cannelure copies → 1.
                        Exclude 19 misfiled .min lathe files. Exclude
                        ambiguous join tier from LABELS (down-weight loose).
```

### 4.2 How the five data classes interlock

| Data class | Source | Role in EVERY regimen |
|------------|--------|----------------------|
| **PRINTS** | phase20 (44 k) + raw OCR (`documents-text-extracted-v3`) | Realistic INPUT distribution — material/thickness/customer/PN. Feeds the feature card (via `EDMDrawingInterpretationEngine`). NEVER a label source (OCR-noisy). |
| **PROGRAMS** | 3 text NC/TXT + `jm-die-wedm-program-patterns.ts` | Structural DNA (skeleton templates) + the only real seq2seq/witness anchors (oversample 3–5×). The 3,970 binary are a deferred operator-export unlock. |
| **STOCK** | `wire-spec-sheets.ts` + `ShopConfigurationEngine` `wedm_wire_inventory` | The "stock-aware" constraint (regimens #2/#8b). RAG-served live so it never enters weights. |
| **EQUIPMENT** | `ShopConfigurationEngine` envelope + `wedm-published-machines.ts` | Feasibility/refusal gate (#8b) + per-machine clamps (#4) + dialect targets (#7). RAG-served. |
| **TRIBAL** | `wedm-knowledge-tips.ts` (145) + `wedm/CLAUDE.md` §5 (15 gotchas) + `controller-knowledge-tips.ts` | The reasoning/justification text bank + the hard-constraint reward rules + the anti-pattern negatives. The "WHY" that turns pattern-matching into reasoning. |
| **ORACLE** | tech-tables getters + `WEDMJobCost/Ra/Recast/HAZ/WireBreak/Flush/Post*` engines | The LABEL (D1). Every synthetic output is a pure-function evaluation, label-noise-free. Also the numeric eval oracle. |

### 4.3 The join is the keystone

`blueprint-program-join-full-v6.jsonl` is what makes prints+programs+stock+equipment combine **for real JM Die parts**: the WIRE-EDM subset (459 records: 133 exact + 224 loose + 102 ambiguous) tells us WHICH real part has which material/customer; phase20 supplies its feature card; the tech-table oracle supplies the verifiable label. **Confidence discipline (one rule for all regimens):** oversample `exact`, down-weight `loose`, **exclude `ambiguous` from labels** — or the corpus inherits join false-positives.

---

## 5. BUILD SEQUENCE (logical dependency order, R13)

Each unit built on a *proven* foundation — never a consumer atop an unproven dependency.

```
PHASE 0 — SHARED INFRASTRUCTURE (one-time, blocks everything)
  0a. Build the real-input-distribution sampler from phase16 join + phase20
      (shared by #1,#2,#8a,#8b). Verify WIRE-EDM slice counts.
  0b. Complete WEDMCurriculumSchedulerEngine score/sort body if config-only
      (~150 LOC) — #3/#4/#5/#8b all need executable curriculum ordering.
  0c. Confirm GPU free-of-Ollama protocol (the ONE recurring blocker;
      "Free-Gpu to evict Ollama" before every train). Validate
      train_wedm_lora_peft.py warm-start loads adapter_model.safetensors.

PHASE 1 — VERIFIABLE CORES (deterministic, no upstream dependency)
  1. REGIMEN #3 Pass-schedule / H-offset cascade  ← FIRST.
       Pure tech-table oracle. Its cascade-correctness eval + FA-10S
       parser is REUSED by #1's program-parses gate. Build the deterministic
       generator + cascade-correctness harness here ONCE.
  2. REGIMEN #4 Discharge-parameter optimization.
       Mines wedm-published-conditions (63 records) into numeric regression.
       Produces the discharge engines' validated reward extractor that #5/#6 reuse.

PHASE 2 — PHYSICS PREDICTORS (depend on #4's discharge grounding)
  3. REGIMEN #6 Surface integrity (Ra/recast/HAZ).
       Consumes the discharge regime from #4 as input; reuses the
       reward-engine regex extractor. Ships the AMS-cap gate #1 needs.
  4. REGIMEN #5 Flushing + wire-break.
       Engine-oracle labeled; reuses #4's bounds + #6's safety patterns.

PHASE 3 — SELECTION + INTEGRATION
  5. REGIMEN #2 Wire + material selection (stock-aware).
       Standalone JOIN (wire-spec × material-db × kb-015); its
       eval-wire-selection.mjs gold cases feed #8b's plan-correctness.
  6. REGIMEN #7 Controller-dialect post-processing.
       5-engine oracle; exact-match harness. Independent but Phase-3
       because dialect breadth is lower-priority than the FA-10S core.

PHASE 4 — THE #1 DELIVERABLE (consumes #3 cascades + #6 gates as proven)
  7. REGIMEN #1 PRINT → WIRE-PROGRAM.
       Built on the PROVEN #3 pass-schedule (cascade is a sub-step),
       #6 surface-integrity gate, #2 wire-selection, #4 discharge intent.
       Reuses #3's FA-10S parser for the program-parses gate.
       Sessions S1–S4 per §2.9.

PHASE 5 — INTEGRATION CAPABILITIES (compose earlier regimens)
  8a. REGIMEN #8a Job cost / quoting (WEDMJobCostEngine oracle; standalone).
  8b. REGIMEN #8b Stock + equipment-aware planning  ← LAST.
       COMPOSES #2 (wire-selection) + #3 (pass-strategy) + #8a (cost) +
       envelope/refusal. Its plan-correctness eval reuses #2's + #3's gold.

PARALLEL DATA-ACQUISITION TRACK (operator-gated, OFF critical path, any time)
  • .mcx-8 operator-export batch (top-N customer-corroborated parts →
    Mastercam X8 → MITSUBISHI_FA10S post → .NC). 30× the real-text corpus.
    Promotes #1's print-grounded stratum + #7's foreign dialects to real seq2seq.
  • Capture profilometer Ra + cross-section recast SEM on next FA-10S run →
    converts #6 recast/HAZ from physics-validated to measurement-validated.
  • Extract the 14 sealed customer ZIPs → may yield real foreign-vendor post-outs (#7).
```

**Why this order:** #3 ships the deterministic-cascade generator + FA-10S parser that #1 reuses. #4 ships the discharge grounding + reward-extractor that #5/#6 reuse. #6 ships the AMS-cap gate #1's dimensions-gate needs. #2 ships the wire-selection gold #8b reuses. #1 is built ONLY after its sub-components (#3, #6, #2, #4) are proven. #8b is last because it composes everything.

---

## 6. SCARCITY + RISK REGISTER (honest)

### 6.1 The defining constraint, quantified

**Real text programs: 3 unique** (ITW SHAKEPROOF 2-axis-4-pass, NOZE TEST taper-5-pass, FIOCCHI cannelure-heavy-5-pass) vs **3,970 binary `.mcx-8`/`.mcx`/`.esp`**. Yield = **0.075%** of the 4,058-file archive is text-parseable. The cannelure exists in 4 locations (dedup → 1). 19 `.min` are misfiled Okuma lathe (exclude). 14 customer ZIPs sealed. **NO `WEDM_OUTCOME_LEDGER.jsonl` exists** — zero closed-loop machine-run feedback anywhere.

### 6.2 Risk register

| # | Risk | Severity | Likelihood | Affected regimens | Mitigation (in this catalog) |
|---|------|----------|-----------|-------------------|------------------------------|
| **R-1** | **Binary program lock** — true print→program-TEXT seq2seq blocked | HIGH | Certain (present) | #1 (critical), #7, #8a | Synthetic skeleton templating + feature→params oracle; operator-export batch as the 30× unlock (parallel track). |
| **R-2** | **Oracle circularity** — train on engine outputs, eval against same engines = imitation not correctness | HIGH | Certain where it applies | #5, #6 (recast/HAZ), #7 (4-of-5 dialects), #8a | RAG design (adapter never overrides oracle) + named loud per output (R12) + real-anchor escape (63 Ra rows, 3 NC programs, 5 vendor manuals). |
| **R-3** | **No measured shop ground truth** — Ra/MRR literature-calibrated; recast/HAZ has NO column; cost has no quote-vs-actual; breaks engine-synthetic | HIGH | Certain (present) | #4, #5, #6, #8a, #8b | Confidence-weight; provenance flag on every prediction; register profilometer/SEM + outcome-ledger as highest-ROI follow-ups. |
| **R-4** | **OCR feature-card incompleteness** — geometry primitives / taper / tight-tol / thickness seldom captured cleanly | MEDIUM-HIGH | High | #1, #2, #8a, #8b | Dedicated print→feature-card extractor validated vs the 15 gotchas; impute thickness from material/part-family (labeled noise, down-weighted). |
| **R-5** | **Single controller dialect of real data** (Mitsubishi W31MV-2) | MEDIUM | Certain | #3, #4, #5, #6, #7 | Spot-validate the 4 non-Mitsubishi engines vs vendor manuals BEFORE mass-generation; cross-dialect transfer flagged unverified. |
| **R-6** | **Single taper exemplar** (NOZE TEST) | MEDIUM | Certain | #1, #3, #8b | Thinnest curriculum tier flagged; extra taper exemplars are a named export-batch target; under-cost taper quotes flagged (#8a). |
| **R-7** | **GPU contention with Ollama** (the recurring operational blocker; prior runs stalled) | MEDIUM | High per-run | ALL (train step) | "Free-Gpu / stop Ollama first" in Phase-0c; prior runs 182 s/139 pairs prove compute is NOT the constraint once GPU is free. |
| **R-8** | **Grounding-density vs precision tradeoff** — strict gates produced 0.431; loosening risks mis-attachment | MEDIUM | Medium | ALL (corpus) | Oracle pairs are number-dense by construction → grounding lifts without loosening gates; per-regimen grounding target 0.55–0.75. |
| **R-9** | **Rotting/stale data** — 2024 wire prices, static `remaining_pct` inventory, no ERP/lead-times | LOW-MEDIUM | Certain over time | #2, #8a, #8b | RAG-at-inference for all live numbers (D3); `mustHumanVerify` on quotes/plans; ERP integration declared out-of-scope. |
| **R-10** | **Curriculum scheduler may be config-only** (~60 lines; score/sort body unverified) | LOW | Medium | #3, #4, #5, #8b | Phase-0b completes the body (~150 LOC) before any curriculum-dependent regimen. |
| **R-11** | **Join false-positives** — loose/ambiguous tiers | LOW | Medium | #1, #2, #8a | Confidence-weight: oversample exact, down-weight loose, EXCLUDE ambiguous from labels. |

### 6.3 What is honestly shippable WITHOUT the deferred unlocks

- **#3, #4, #5, #8a, #8b, #2** ship fully on synthetic+tribal+oracle — the deterministic functions ARE the shop knowledge; these are not approximations.
- **#1's feature→params core** ships honestly; its **raw program-SYNTHESIS at production fidelity** is the one part that genuinely benefits from the `.mcx-8` unlock (until then it leans on synthetic skeletons — sufficient to ship, 30× better with the export batch).
- **#7's Mitsubishi arm** is real-validated; its **4 foreign arms are engine-faithful but machine-unvalidated** — usable for per-machine fine-tuning, flagged for manual-spot-validation, and convertible to real-anchored via the sealed-ZIP extraction or operator-export.
- **#6's Ra arm** is measurement-grounded (69 cited rows); its **recast/HAZ arm is physics-validated only** and carries that flag on every output until profilometer/SEM data is captured.

### 6.4 The three data-acquisition follow-ups that break every circularity (priority-ordered)

1. **`.mcx-8` operator-export batch** (top-N customer-corroborated parts → Mastercam X8 → `MITSUBISHI_FA10S` post → `.NC`). 50–100 posts = 30× the real-text corpus. Unblocks #1 print-grounded seq2seq + #7 foreign-dialect real anchors. Days of operator time; parallel track.
2. **Profilometer Ra + cross-section recast SEM on the next FA-10S run.** Converts #6 recast/HAZ from consistency→correctness.
3. **Stand up `WEDM_OUTCOME_LEDGER.jsonl`** (execution traces: actual Ra/dimensional/break outcomes). Unblocks closed-loop RL for #4/#5 and quote-vs-actual calibration for #8a; lets `WEDMLoRACadenceEngine` retrigger on real drift.

---

**Doc-reflection note (R, for the build chain):** on shipping any regimen, update all four surfaces (CLAUDE.md §WEDM + MEMORY/galaxy:wedm + wiki + Obsidian) and `ai-upgrade-broadcast.mjs --slot mike --galaxy wedm --kind {corpus|training|eval|bridge} --affects "india,cad,cam,quoting"` so the master india loop + neighbor galaxies compound the win. The india master self-improving loop owns the template, not the training — each AI upgrade is owned end-to-end by galaxy:wedm (slot mike).

**Catalog status:** directly executable. All cited paths verified present on disk (tech-tables 9.2 KB, published-conditions 77.3 KB, wire-spec 16.2 KB, edm-material-db 11.2 KB, join 59 MB, phase20 17.3 MB, adapter 154.1 MB, 171-pair split). The one cross-regimen prerequisite is Phase-0 (sampler + curriculum-body + GPU-free protocol).
