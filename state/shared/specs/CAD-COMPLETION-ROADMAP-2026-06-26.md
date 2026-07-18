<!--
  CAD-COMPLETION-ROADMAP — the consolidated, git-reconciled remaining-units plan for delta/CAD
  to reach the operator's terminal milestone: a TRAINED + TESTED CAD-generation model with
  PRINT GENERATION validated dimension-by-dimension.
  Authored: slot:delta, 2026-06-26, in response to operator /goal ("plan out remaining units...
  so we can finally train and test cad model and print generation").
  Method: reconciled the DELTA-CONTEXT-LEDGER (2026-06-10) + git log (all branches) + on-disk
  engine/artifact verification + CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19 + DELTA-CAD-GALAXY-
  MAX-BUILDOUT-2026-06-12 + CAD-GEN-COVERAGE-METER + DELTA-CAD-LEARN-LOOP-CLOSURE-PLAN-2026-06-11.
  Supersedes the planning sections of those for "what's left"; they remain the design detail.
  Maintainer: slot delta. Reconcile §1/§3 on each /handoff-delta.
-->

# CAD-COMPLETION-ROADMAP — print/text → trained+tested CAD model + validated print generation

> **🔄 2026-06-27 RECONCILE (slot:delta) → see [`DELTA-CAD-TRAIN-TEST-READINESS-2026-06-27.md`](DELTA-CAD-TRAIN-TEST-READINESS-2026-06-27.md).**
> Re-verified this roadmap against the live repo via a 4-agent ultracode Workflow + live Hermes octopus. Three corrections to the framing below: **(1)** Hermes/octopus is **LIVE again** (OAuth restored — it was dark for the prior 4 runs of this goal; the orchestration half is now executable, dedup don't-rebuild). **(2)** The training target is **AMBIGUOUS** — "train the CAD model" = (A) the blueprint-OCR dimension LoRA (the live gate T1; corpus is **594 rows, 52 short of 646**, not "646 ready") vs (B) print→CAD-geometry generation (**zero corpus**). **OPERATOR must decide D0.** **(3)** GPU is **GREEN/liftable today** (torch 2.11.0+cu128 verified 6/06); the T1 deploy gate's real blocker is a missing **operator_verified eval split** (can't promote on pseudo-label Brier). The 3 hard blockers are all operator: D0 target, Fusion add-in manual activation, operator_verified split.

> **Operator goal (verbatim):** "read all chats, sessions, transcripts, plans, roadmaps and units left
> for delta domain and cad drawing. plan out remaining units to fully complete the features we planned
> for so that we can **finally train and test cad model and print generation**."

> **Headline (R12 honesty):** the goal is **far closer than greenfield**. The closed-loop measure→correct→converge
> methodology is **PROVEN against the real `blisk.stp`** (0.00% dim / 1.55% mean / 5.09% worst-surface error;
> 8.76% Hausdorff). The drawing pipeline (ledger→sketch-gate→tribal→stock→route→print-regen-validate) is
> **shipped**. The training corpus + tokenization + QLoRA **dry-run** are built. The two real blockers are
> **(1) a 410-commit unmerged `slot/delta` branch** holding the smooth-solid generator, and **(2) no real
> (non-dry-run) trained adapter + no recorded validation-50 numbers yet.** Everything else is integration.

---

## 0. RECONCILE STAMP — 2026-06-26 (slot:delta, re-checked vs git+disk this session)

> Auto-generated truth: **`CAD-COMPLETION-STATUS.json/.md` = 10/20 units shipped** (regenerated this
> session by `scripts/cad-completion-reconcile.mjs`; that file is AUTHORITATIVE for shipped/pending).
> This session fixed **TWO reconcile-detector defects** (both surfaced by the 3-of-3 scrutiny gate — the
> same root cause: a status/roadmap commit MENTIONS every unit id, and the detector counted the mention):
> - ✅ **`U-CAD-BOOLEAN`** was a **FALSE-NEGATIVE** — detector probed a never-built
>   `CADBooleanFeatureEngine.ts`; the gap was actually closed by `CADBooleanEngine` composing
>   `GeometryEngine.boolean` + `BooleanKernelEngine`, wired at `cad_boolean` `03e270285f`. Now correctly SHIPPED.
> - ⚠️ **`U-CAD-NURBS-STEP-EMIT`** was a **FALSE-POSITIVE** — `git --grep` matched `9ed946a7b4` (the
>   reconcile commit itself, whose body says `next=U-CAD-NURBS-STEP-EMIT`). There is **no real NURBS
>   STEP-emit deliverable**; it is genuinely **PENDING**. Detector hardened to require the unit id in the
>   commit **subject** (`[SCOPE]/U-ID:`), which also corrected `U-CAD-LEARN-LOOP-CLOSE`'s cited evidence
>   from the cad_mate body-mention `1c788cf7a2` → the real deliverable `19e9c0af6b`.
> - ✅ **`U-CAD-LEARN-LOOP-CLOSE`** genuinely SHIPPED (`19e9c0af6b`) — cad fix-ledger → outcome-publish wired.
>
> **Critical-path next PENDING = `U-CAD-NURBS-STEP-EMIT` (Phase A, post-merge).** The terminal milestone is
> gated by OPERATOR/GPU decisions, not autonomous units (see §6): **(1)** schedule `U-MERGE-SLOT-DELTA`
> (slot/delta now **432 commits** ahead) — unblocks the smooth-solid emitter that NURBS-STEP-EMIT builds on;
> **(2)** open a Blackwell GPU window for the real QLoRA run (`U-CAD-REAL-TRAIN-RUN`, T1). The PA1 fanout-gate
> is **NOT** a gate (§4 correction — it is advisory). Progress this session (STATUS.json now authoritative):
> `PA4-VIZ-CAD-GRAPH-UPDATE` SHIPPED (system-viz `ghost.cad_completion` roost) + `U-CAD-OLLAMA-OFFLOAD`
> verified **SATISFIED-BY-EXISTING** (35.8% live offload > 30% target; `cad_drawing` already Ollama-first).
> Remaining autonomous-buildable: `PA3` (hermes CAD-builder harness — now unblocked) + `U-CAD-SCALE-COMPLEX`
> (depends on the merged smooth-solid emitter). Everything else on the critical path is merge/GPU-gated.

---

## 1. Current state — what is SHIPPED (verified on disk / git, 2026-06-26)

### Drawing pipeline (CAD-DRAWING-PIPELINE-MS0 — all 7 units shipped)
- `U-CADDRAW-FEATURE-LEDGER` ✅ `37e5d383f0` — `CADFeatureCompletenessLedgerEngine.ts` (keystone: enumerate every print feature, fail-loud on downstream miss).
- `U-CADDRAW-SKETCH-DIM-GATE` ✅ `aa11b794db` — sketch-dim capture + diff-vs-ledger (first line of defense).
- `U-CADDRAW-TRIBAL-INJECT` ✅ `781a7131ba` + `U-CADDRAW-TRIBAL-CATALOG` `b3ef9f69dc` — `CADTribalDrawInjectionEngine.ts` (per-feature RAG during drawing).
- `U-CADDRAW-STOCK-OFFSET` ✅ `11aa5eea9b` — `CADStockAllowanceEngine.ts` (secondary-op grind/hone/spark-gap stock, datum-aware).
- `U-CADDRAW-ROUTE-CLASS` ✅ `cfbce95394` — `cad_drawing` task class + Ollama-first/Claude-failsafe in `AISystemRouterEngine`.
- `U-CADDRAW-PRINT-REGEN-VALIDATE` ✅ landed under **CAD-DRAW-MAX-MS1** (`U-PRINT-REGEN-LIVE 86bc7b3f82`, `U-CAD-DIM-EXTRACT 538ca13eb4`, `U-VALIDATION-ROUNDTRIP e566ee0c00`) — engines on disk: `CADPrintRegeneratorEngine`, `CADRoundTripValidationEngine`, `CADValidationRubricEngine`, `CADRegenCorrectionEngine`, `CADRegenerationTestEngine`, `CADDrawAnyPartValidationHarnessEngine`.
- `U-CADDRAW-STEPPED-BORE-FEATURE` ✅ root-cause fixed at extraction (`U-XRAY-STEPPED-BORE-PROMPT 84a78522f8` — multi-diameter bore + transition chamfer).

### Geometry + fidelity core (CAD-CLOSED-LOOP-MS0 — proven on real references)
- Closed-loop on **real `blisk.stp`**: `U-CAD-FIDELITY-E2E-VALIDATE cb1ec539a3` → 0.00% dim / 1.55% mean / 5.09% worst.
- Surface-Hausdorff metric (roadmap P8) `dfe6ac41e5` → 152 mm/8.76% Hausdorff, 21.37 mm/1.23% mean Chamfer.
- 2nd reference part (Impeller turbine.stp, 405 B-spline vanes) regression `400e165bd8`. Inch→mm units-first lock `afdce4386a`.
- `CADGeometryComparisonEngine` (Hausdorff/Chamfer/volume/Jaccard, unit-aware) shipped.

### Training tokenization + corpus (CAD-DRAW-MAX-MS0 + CAD-CLOSED-LOOP-TRAIN)
- Tokenization engines: `CADArgEncoderEngine`, `CADOperationDecoderEngine`, `CADSequencePoolEngine`, `CADUnifiedFeatureBridgeEngine`, `CADToleranceSignalEngine`, `CADRegenFeedbackAdapterEngine`, `HyperCADSCodeGeneratorEngine`, `HyperCADSOutcomePublisherEngine`.
- Corpus artifacts (`H:/prism-slot-delta/state/shared/cad-ai-training/`): `lora-pairs.jsonl` (64 KB), `nn-features.jsonl` (2.6 MB), `gnn-edges.jsonl` (4.2 MB), `rag-chunks.jsonl`. Knowledge-templater `7a0984dee5`, corpus grown to **646 pairs** `85a9f56bee`, **QLoRA dry-run OK** `8279b3d14d`. Print corpus: `cad-print-corpus/abc-dataset/` (STEP→print.json).
- Baseline "models" (`cad-ai-models/`, JSON, 2026-05-25): `knn-baseline`, `lora-adapter.model.json`, `pagerank`, `rag-index` — **baseline/demo level, NOT a trained safetensors adapter.**

### Smooth-solid generation — **BUILT but locked in the unmerged branch**
- `slot/delta` (410 commits ahead) holds: loft/sweep/tangency/print-radius-rail emitter (`U-CEEF-FUSION-BUILD-SCRIPT/-TANGENT-LOFT/-LOFT-WITH-RAIL`, iter158-161), 10 surface ops (loft/sweep/revolve/thicken/stitch) × 11 platforms (`U-WAVE-I-SURFACE`), and the real CLIs `cad-generate-stepped-trilobe-cli.mjs` + `cad-analyze-step.mjs`. **Not on trunk.**

---

## 2. Terminal milestone + LOSS FUNCTION (deterministic done-test)

"Train and test cad model and print generation" is **DONE** when all three hold, each recorded with NUMBERS
in a `CAD-TRAIN-TEST-RESULT-<date>.json` artifact (never "looks fine" — R12/R15-VALIDATE):

| # | Gate | Deterministic done-test |
|---|------|--------------------------|
| **T1 TRAIN** | a real (non-dry-run) CAD-generation adapter | `*.safetensors` adapter exists, trained on ≥646-pair corpus, **eval loss < the U-G4 baseline**, loss curve recorded. |
| **T2 TEST (model)** | held-out accuracy | `validation-50` harness RUN on 50 held-out parts → **dim-pass-rate ≥ 90%** AND surface-fidelity within the proven blisk band (**mean ≤ 2%, worst ≤ 6%**). |
| **T3 PRINT-GEN** | print→CAD→regen-print round-trip | S5 print-regen-validate on **N ≥ 10 JM parts** → **≥ 95% callouts PASS** dimension-by-dimension, same-layout, stock-reconciled. |

> Thresholds 90%/2%/6%/95% are operator-tunable; the 2%/6% surface band is grounded in the proven `cb1ec539a3` blisk result. If the real training run can't clear T1 this cycle, BOUND it (≤2 retrain iters) and report covered-vs-target (R12) — do not loop forever.

---

## 3. Remaining units — dependency-ordered (✅=done, ⚙=autonomous-buildable, 🔒=fresh-window/coordinated, 🌐=env/GPU-dependent, 👤=operator-gated)

### Phase A — UNBLOCK (the structural gate; everything smooth-solid depends on it)
| U-ID | title | done-test | dep | scope | how |
|------|-------|-----------|-----|-------|-----|
| 👤 **U-MERGE-SLOT-DELTA** (C1/P1) | merge 410 commits `slot/delta`→trunk | `git merge` clean + full `npm run build` + vitest green; smooth-solid emitter + real CLIs present on trunk | — | DOMAIN | **OPERATOR-GATED coordinated session** — playbook `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md` (19 conflict files: settings.json, CLAUDE.md, cadDispatcher.ts +1502/+119 union, wiki). NOT a mid-loop action. |
| 🔒 **U-CAD-NURBS-STEP-EMIT** (post-merge) | headless NURBS STEP emit | emit a `B_SPLINE_SURFACE` STEP (today's headless = faceted PLANE-only) + validate vs `blisk.stp` (≤2% mean surface) | merge | DOMAIN | the one genuinely net-new emitter piece; build on the merged unified emitter base. |

### Phase B — TRAIN + TEST the model (the named goal)
| U-ID | title | done-test | dep | scope | how |
|------|-------|-----------|-----|-------|-----|
| 🔒 **U-CAD-LEARN-LOOP-CLOSE** (A3/P9) | cad-correction loop → `xproc_outcome_publish` emit → india retrain | a finalized cad correction EMITS an outcome to india's cross-process graph (verify the retrain trigger fires) | merge-soft | cad→ai-training(india) | **PREMISE CORRECTED 2026-06-26 (slot:delta, verified):** `xproc_outcome_publish` is NOT doc-only — it IS wired (`aiReasoningDispatcher.ts:760` → `OutcomePublishAdapterEngine`, the canonical domain-engine publish entry point; the galaxy CLAUDE.md "do not cite" notes are STALE). The cad-fix-ledger producer/consumer arc is also BUILT (`scripts/lib/cad-correction-to-fix-ledger.mjs` pure converter + `cad-fix-ledger-to-training.mjs`). REAL GAP: nothing in the cad correction loop CALLS the publish — so cad fixes land in the ledger but never EMIT an outcome to india's graph. UNIT = wire delta's correction-loop harvest point to `outcomePublishAdapterEngine.publish()` with a valid `RecordEventInput` (`{domain:'cad', slot:'delta', kind ∈ OUTCOME_KINDS, ...}`) -- a CONSUMER call into india's already-wired adapter (do NOT modify india's dispatcher). Contract-sensitive (validate against `OUTCOME_KINDS`); build the pure payload-builder (testable) + the emit call-site; needs india's loop running to validate end-to-end. NOT a from-scratch wire of a doc-only action. |
| 🌐 **U-CAD-REAL-TRAIN-RUN** | real (non-dry-run) QLoRA train on ≥646 pairs | **T1** gate: adapter `*.safetensors` + eval-loss < baseline (recorded) | corpus(✅)+learn-loop | cad↔ai-training(india)/Blackwell GPU | promote the U-G4 dry-run to a real run on Blackwell; india LoRA arm. Corpus may grow first via Phase D. |
| ⚙ **U-CAD-VALIDATION-50-RUN** | execute validation-50 harness, record numbers | **T2** gate: dim-pass-rate ≥90% + surface mean≤2%/worst≤6% on 50 held-out | trained adapter | DOMAIN | harness `CADDrawAnyPartValidationHarnessEngine` exists — RUN it, persist `CAD-TRAIN-TEST-RESULT.json`. |
| ⚙ **U-CAD-PRINTGEN-E2E** | print→CAD→regen-print on ≥10 JM parts | **T3** gate: ≥95% callouts PASS dim-by-dim | print-regen(✅)+ledger(✅) | DOMAIN | S5 pipeline is built; run on real JM prints (`prismSelfAwarenessEngine.getJMDieCustomerPath`), record per-callout table. |

### Phase C — CAPABILITY BREADTH ("generate ANY part" — coverage meter 16%→target)
> 11 essential generation-op gaps (CAD-GEN-COVERAGE-METER). Some are satisfied by the unmerged surface-ops branch — **dedup against the merge first (R8).** Ordered by ROI; sketch-subtractive + boolean + patterns are foundational, die-design is JM-critical.
| U-ID | gap | engine + wiring | scope |
|------|-----|------------------|-------|
| ⚙ **U-CAD-SKETCH-SUBTRACT** | cut/pocket/groove | `CADSubtractiveFeatureEngine` → `cadDispatcher:feature_cut` | DOMAIN (foundational) |
| ⚙ **U-CAD-BOOLEAN** | combine/intersect/subtract solids | extend `GeometryEngine` boolean → `cad_boolean` | DOMAIN (foundational) |
| ⚙ **U-CAD-PATTERNS** | linear/circular/mirror replication | `CADPatternEngine` → `cad_pattern` | DOMAIN |
| ⚙ **U-CAD-REF-GEOM** | datum planes/axes/coord-systems | `CADReferenceGeometryEngine` → `cad_ref_geom` | DOMAIN |
| 🔒 **U-CAD-SURFACE-GEN** | ruled/lofted/swept/boundary surfaces | likely satisfied by merge (U-WAVE-I) — verify, then wire `cad_surface_*` | DOMAIN |
| ⚙ **U-CAD-DIE-DESIGN** | strip/blank/draw/springback | `CADDieDesignEngine` → `cad_die_*` | DOMAIN (**JM-Die-critical**) |
| ⚙ **U-CAD-ASSEMBLY-MATES** | joints/mates/constraints | extend `CADAssemblyGraphEngine` → `cad_mate` | DOMAIN |
| ⚙ **U-CAD-SHEET-METAL** | flange/bend/hem/flat-pattern | `CADSheetMetalEngine` → `cad_sheetmetal_*` | DOMAIN |
| ⚙ **U-CAD-2D-DRAWING-GEN** | model→orthographic 2D drawing | feeds T3 print-gen; `CAD2DDrawingEngine` → `cad_drawing_generate` | DOMAIN |
| ⚙ **U-CAD-IMPORT-REPAIR** | import-repair + feature-recognition depth | B1/P6 `CAD-FEATURE-RECOGNITION-MS0` — `CADFeatureRecognitionEngine` is a **flagged stub (U-EFF25)**; verify depth before treating net-new | DOMAIN |
| ⚙ **U-CAD-WELDMENTS** | members/gusset/weld-bead/cut-list | `CADWeldmentEngine` → `cad_weldment_*` | DOMAIN (lower ROI for JM) |

### Phase D — THROUGHPUT + SCALE (enablers; raise corpus quality + size)
| U-ID | title | done-test | scope |
|------|-------|-----------|-------|
| ✅ **U-CAD-OLLAMA-OFFLOAD** (A4/P3) -- **SATISFIED-BY-EXISTING (verified 2026-06-26, no build)** | the "dedup-first" check resolved it: CAD generative work is already **Ollama-first** routed (`AISystemRouterEngine.ts:211` `cad_drawing` -> `local-mcp` primary, Claude failsafe), `OllamaTaskOffloaderEngine` covers the mechanical categories (explanation/summary/format_convert/documentation/calculation), and the **live fleet offload ratio is 35.8% (67/187), already > the 30% target** + 552 true off-Claude bridge execs (~974K tok, `ollama-offload-dashboard.mjs`). A new CAD offloader would duplicate working infra (duplicationGuard would block). | DOMAIN |
| 🌐 **U-CAD-CORPUS-THROUGHPUT** (C3/P5) | Blackwell GPU lever | multi-VLM OCR 7,794 prints + GPU re-embed + STEP catalog **33%→100%** → grows the train corpus | cad↔xray↔india |
| 🌐 **U-CAD-FUSION-LIVE-PROOF** (C2/P4) | live `:18365` revolute-assembly round-trip | first real live Fusion round-trip executed | env-dependent |
| 🔒 **U-AI-14 PerCustomerOmegaTargetEngine** (A2) | per-customer Ω target | genuinely novel; `/dedup`→build→3-of-3; defer threshold values to physics-reviewer | out-of-pure-CAD-lane |
| ⚙ **U-CAD-SCALE-COMPLEX** (D1/P10) | 10-50 interdependent features/datums/patterns/assemblies gen+correct+learn | a multi-feature part round-trips through the full loop ≥90% | DOMAIN (final clear) |

---

## 4. Part-A acceleration harness — the operator's "how" (hermes/octopus parallel agents, crons, auto-invoke, graphs)

> **✅ CORRECTION 2026-06-26 (R12 — the prior "BLOCKER" claim was MISFRAMED):** verified `PRISM_AGENT_FANOUT_GATE = "warn"` (C: `settings.json:115`) — the PRISM fanout gate is **ADVISORY by default: it emits a systemMessage, it does NOT block, and it fail-opens on every error path** (`agent-fanout-pressure-gate.mjs:22-28`). The 429s a prior session hit were **Anthropic-side concurrency limits from bursting *Claude* agents**, NOT this hook. **The operator's "parallel hermes / multiple models" vision IS executable today** — and the infra is **already built**: `scripts/hermes-graph-improvement-driver.mts` (`U-ALPHA-HERMES-GRAPH-IMPROVE`) is the engineered loop that plans PARALLEL OPUS-FAST-MAX hermes fan-out over the live graph-gap queue (pure core `GraphImprovementFanoutEngine` + `OpusFastMaxAgentSpecEngine`, dispatcher `hermes_graph_improve_plan`). Its own R12 note: a headless cron **PLANS + PERSISTS** the opus fan-out; **EXECUTION is consumer-gated** — a live chat or `Workflow` consumes the plan and fires the batch. The real "drastically increase" lever = run it with higher `--count/--budget` + consume via the **Hermes (Grok, `mcp__hermes__*` / `ask-hermes.mjs`) + Ollama lanes that run OUTSIDE Anthropic limits** (what "max subscription / multiple models" buys), NOT a PRISM gate flip. Optional: `PRISM_AGENT_FANOUT_GATE=off` silences the advisory during an intended large burst.

| U-ID | title | trigger / auto-invocation | owner |
|------|-------|---------------------------|-------|
| ~~**PA1 U-FANOUT-GATE-MAX**~~ **(NO-OP — gate already advisory)** | gate is `"warn"` (verified) → no flip needed. If a burst should silence even the advisory: `PRISM_AGENT_FANOUT_GATE=off`. The actual scale lever is the Hermes/Ollama lanes + higher driver `--count`, not this knob. | settings.json env (optional) | — |
| **PA2 U-CAD-RECON-CRON** | durable cron re-runs this shipped-vs-pending reconciliation → updates `DELTA-CONTEXT-LEDGER` + this roadmap | cron nightly (off-:00 minute) | delta |
| **PA3 U-HERMES-CAD-BUILDER** | hermes/octopus harness: pick next PENDING CAD unit → fan out parallel builder + physics/test/code reviewers → per-file 2-arm scrutiny | invoked by `/loop` on delta; gated by PA1 | zebra (hermes fleet) + delta (CAD units) |
| **PA4 U-VIZ-CAD-GRAPH-UPDATE** | feed reconciled CAD-completion state into alpha's system-viz graphs (ghost roosts for each PENDING unit) | on each reconcile (PA2) | sierra (system-viz) + delta (CAD nodes) |

These engage the full stack the operator named: **Ollama** (mining/offload, $0), **Obsidian/PSN** (this roadmap + memory feed-up, tribal inject during drawing — already wired via `CADTribalDrawInjectionEngine`), **/system-viz** (PA4 graph update), **hermes/octopus** (PA3 builder harness once PA1 unblocks).

---

## 5. CRITICAL PATH — shortest ordered sequence of PENDING units to the terminal milestone

```
[👤 OPERATOR DECISION] U-MERGE-SLOT-DELTA   ── unlocks smooth-solid emitter + real CLIs on trunk (Phase A)
        │
        ▼
U-CAD-NURBS-STEP-EMIT  ── headless NURBS STEP (post-merge, on unified base)
        │
        ▼
U-CAD-LEARN-LOOP-CLOSE ── wire fix-ledger→retrain→xproc_outcome_publish(india)   [A3/P9]
        │
        ▼
[🌐 GPU] U-CAD-REAL-TRAIN-RUN ── real QLoRA on 646+ pairs → adapter.safetensors   ⟶ GATE T1
        │
        ▼
U-CAD-VALIDATION-50-RUN ── 50 held-out parts, record dim-pass-rate              ⟶ GATE T2
        │
        ▼
U-CAD-PRINTGEN-E2E ── ≥10 JM prints, dim-by-dim ≥95%                            ⟶ GATE T3  ✅ DONE
```

**≈ 6 critical-path units** (1 operator-gated merge + 1 post-merge emit + 4 train/test/print). Phase C breadth (11 capability gaps) + Phase D throughput run **in parallel** off the merge and feed corpus quality, but are not on the minimal critical path to the named "train+test+print-gen" gate.

**THE single highest-leverage action is the operator-gated `U-MERGE-SLOT-DELTA`** (playbook ready). Until that coordinated window happens, autonomous progress is limited to: PA2 recon-cron, the merge-independent Phase-C capability engines (sketch-subtract / boolean / patterns / die-design — all ⚙), A2 PerCustomerOmega, and A4 Ollama offload.

---

## 6. Operator decisions required
1. **Schedule the `U-MERGE-SLOT-DELTA` coordinated window** (fleet-quiet, ~19 conflict-file union resolve per the playbook). It is the #1 unblock and is explicitly NOT a mid-loop action.
2. ~~**PA1 fanout-gate cap**~~ — **RESOLVED, no decision needed.** The gate is already advisory (`warn`); it does not block. The parallel-hermes infra (`hermes-graph-improvement-driver.mts`) is built and the scale lever is the Hermes/Ollama lanes (outside Anthropic limits) + a live-chat/Workflow consumer of the driver's plan — not a gate flip.
3. **GPU window for U-CAD-REAL-TRAIN-RUN** (Blackwell) — the dry-run is validated; the real run needs a scheduled GPU slot.

_Reconcile cadence: refresh §1 (shipped) + §3 (open) on each /handoff-delta and via PA2 cron. Companion sources: `DELTA-CONTEXT-LEDGER.md` (open-threads), `CAD-DRAWING-PIPELINE-COMPREHENSIVE-2026-06-19.md` (S0-S6 design), `CAD-GEN-COVERAGE-METER.md` (capability %)._
