<!--
  DELTA-CAD-TRAIN-TEST-READINESS — 2026-06-27 (slot:delta, session claude-f52932d6)
  In response to operator /checkin-delta /goal: "read all chats/sessions/transcripts/plans/roadmaps +
  units left for delta/CAD; plan remaining units so we can FINALLY train+test cad model + print generation;
  Fusion up for live testing" + the orchestration half (hermes/octopus/parallel-grok agents to improve graphs).

  THIS IS A RECONCILIATION + DECISION BRIEF, NOT A NEW PLAN.
  The comprehensive remaining-units plan already exists: CAD-COMPLETION-ROADMAP-2026-06-26.md (authored
  yesterday for this same /goal). This brief ADDS the new evidence that roadmap lacked — gathered this
  session via 4 parallel code-archaeologist agents (ultracode Workflow) + a live 5-lens hermes/octopus
  consensus + direct on-disk verification — and surfaces the ONE decision that bifurcates the whole goal.
  Method: ultracode Workflow wf_87ab2c05-15a (4 investigators + opus synth, 806K subagent tokens) +
  live Hermes octopus (grok, $0) + spot-verified on disk (R12). Maintainer: slot delta.
-->

# DELTA / CAD — Train+Test+Print-Gen Readiness & Decision Brief (2026-06-27)

> **The plan is not the blocker.** A comprehensive, dependency-ordered remaining-units roadmap already
> exists at [`CAD-COMPLETION-ROADMAP-2026-06-26.md`](CAD-COMPLETION-ROADMAP-2026-06-26.md). This session
> re-verified it against the live repo and found **the goal is closer than it looks, gated by 3 operator
> decisions — not by missing code.** This brief is the reconciliation + the decision the operator must make.

---

## ⓪ NEW FACT this session (ends a 4×-recurring goal): **Hermes/octopus is LIVE again**

The "utilize hermes agents/octopus" half of this `/goal` has been run **4+ times (6/24, 6/25 ×2, 6/26)
and each time the orchestration was DARK** — the proxy listened but served nothing (dead xAI OAuth token).
**Verified live this session (R12):**
- `hermes_status` → `up:true, authenticated:true` ; live `hermes_ask` round-trip → real completion ✓
- A real **5-lens octopus fan-out** (safety / root-cause / fastest-unblock / distributed-ownership /
  adversarial — grok voices through the free proxy, **$0, outside Anthropic limits**) executed this
  session and returned cross-model consensus (recorded below).
- All **9 `PRISM Hermes *` scheduled tasks = Ready**; the graph-improvement ledger + LEVERAGE-WIRING-QUEUE
  **regenerated today (Jun 27 11:47)** → the auto-invoked cron is firing.
- Live dry-run of `hermes-graph-improvement-driver.mts` planned a real **fan-out of 2 opus-fast-max agents
  over 2 graph gaps (6 unwired engines)**, budget verdict `within`.

**Therefore the orchestration half is DEDUP — do NOT rebuild it.** Every facet the `/goal` asks for is
already built (`grok-capability-rank.mjs` default grok-4.3, `MultiModelConsensusEngine` 5-lens panel
default-on, `OpusFastMaxAgentSpecEngine`, `GraphImprovementFanoutEngine` + cron, 9 scheduled tasks). It was
just dark. **It is now executable for the first time** — the lever is running the driver with higher
`--count/--budget` and consuming via the Hermes/Ollama lanes, NOT writing new infra.
(The recurring stale SessionStart "Hermes HUNG" banner is a 3-min cache; the live probe is authoritative.)

---

## ① THE DECISION THAT BIFURCATES THE GOAL (operator, R7 — surfaced, not averaged)

The 4 parallel investigators **disagreed on what "train and test the CAD model" means**, and the two
readings are *different products* with *wildly different effort*:

| | **(A) Blueprint-OCR LoRA** | **(B) Print→CAD geometry generation** |
|---|---|---|
| What it is | Qwen2.5-VL-7B vision LoRA that reads a print and extracts **dimensions** | a model that **generates the CAD solid** from a print |
| Is it the live gate? | **YES** — this is gate **T1** in `CAD-COMPLETION-STATUS.json` (`U-CAD-REAL-TRAIN-RUN`) | No unit exists; not the current T1 |
| Corpus | **594 rows** exist (`ocr-training-loop/corpus-train/trainset.jsonl`) — **52 short** of 646 | **ZERO labeled pairs** (`cad-trilobe-labeled-training-set.json` = 0 rows) |
| Readiness | **near-ready** — autonomously advanceable today | **multi-milestone build from scratch** |
| Dependencies | pip deps + bundle stage (both small) | CAD-GROUND-TRUTH corpus *run* + CAD-TRAINING-EXTRACT (12 units) + likely a new geometry trainer |

**→ D0 — ADOPTED 2026-06-27 (slot:delta, crossroad auto-decide):** `classifyDecision` returns AUTO-DECIDE
for this fork, and the crossroad directive (operator 2026-06-24) mandates *decide + proceed* on auto-decidable
forks rather than idle-wait. **Decision: (A) the blueprint-OCR dimension LoRA FIRST.** Rationale: it is the
*actual* live gate T1 in `CAD-COMPLETION-STATUS.json`; verified-ready this session (GPU green + trainer
self-test 13/13); it feeds the print→regen-validate pipeline that already proved **0.00% dim error on the
real `blisk.stp`**; (B) has **zero corpus** and is a multi-milestone build. **Confidence: high.** (B) remains
available on explicit operator override. Everything below is planned for both; the working track is **A**.

---

## ② READINESS MATRIX (evidence-verified this session)

| Capability | State | Evidence |
|---|---|---|
| **GPU (Blackwell RTX PRO 6000)** | 🟢 **GREEN — RE-VERIFIED LIVE 2026-06-27** | This session ran `gpu_health.py --require-bnb` → `qlora_ready:true, torch_ready:true`, torch 2.11.0+cu128, RTX PRO 6000 Blackwell sm_120, `gpu_matmul_ok:true`, `bnb_4bit_ok:true` (bitsandbytes 0.49.2 NF4), **0 errors**. AND `blueprint_vl_train_lora.py --self-test` → **13/13 logic checks pass** (`failed:[]`). The 6/04 "torch broken" note is STALE (upgrade landed 6/06; re-confirmed today). **T1 is verified-ready behind exactly 2 gates: pip deps + staged bundle.** |
| **T1 trainer (OCR LoRA)** | 🟡 ready w/ 2 small autonomous gates | `mcp-server/scripts/blueprint_vl_train_lora.py` + `scripts/lib/blueprint-vl-train-runner.mjs`. Gates: (1) 4 pip deps `trl qwen-vl-utils pillow pymupdf` in the GPU venv; (2) stage bundle → `state/shared/lora/local-lora/*.jsonl` (via `BlueprintLoRABridgeEngine`). **No dry-run flag.** |
| **T1 corpus** | 🟡 594/646 (52 short), pseudo-labeled | `trainset.jsonl` = 594 rows (verified), all 2-model ensemble pseudo-labels, **0 operator-verified**. Can train at 594 to prove the pipeline; 646 is a threshold not a wall. |
| **T1 deploy gate** | 🔴 **operator-only hard blocker** | Brier ≤0.15 deploy needs an `operator_verified` eval split that **does not exist**. Trainer self-stamps `eval_gate_satisfied:false`. **Do NOT promote an adapter on the pseudo-label Brier (R12).** |
| **T2 validation-50** | 🟡 engine+corpus+dispatcher built; ⚠ gate gameable + seat-gated | Fully scoped this session → **`U-VALIDATION-50-LIVE-RUN-BUILD-SPEC.md`**. Harness `CADDrawAnyPartValidationHarnessEngine` + corpus (`cad-validation-corpus.ts`, **12 cases**) + dispatcher (`cad_draw_any_part_validate`, `cad_validation_corpus_get`) all built. A stub driver exists (`run-hypercad-validation.mjs`, inline stub, markdown-only). **R12 GATE-INTEGRITY BUG:** the T2 detector (`cad-completion-reconcile.mjs:136`) is **existence-only** — any JSON at `cad-validation-50-*.json` flips T2 SHIPPED, content never read → `CAD-DRAW-MAX-MS1` is *falsely* `complete` (shipped 12-case stub, never the 50-print live run). v1 rubric binary-export @0.70; dim-pass scoring deferred (`U-VALIDATION-50-SCORING`). **Real number needs the hyperCAD-S live seat (headless=MOCK)** — seat-gated like Fusion. Dedup=EXTEND (build thin lib + supersede stub), not a new engine. |
| **Print-gen pipeline** | 🟢 shipped + proven | print→CAD→regen-validate (CAD-DRAW-MAX-MS1); proven **0.00% dim / 1.55% mean / 5.09% worst** on real `blisk.stp` (`cb1ec539a3`). |
| **Fusion live-test** | 🟡 **ready except ONE operator step** | bridge `Fusion360LiveBridgeEngine.ts` (1,671 L, 17 routes, `:18360`, dispatcher-wired `f360_live_*`); add-in installable (`resources/FUSION360/prism-api-server/`); **1,163 `.f3d` test parts**. **Blocker:** add-in `runOnStartup:false` → must be **manually activated in Fusion's UI each session** (no automation path). Units: cm internal, **inch ×2.54 (NOT 25.4)**. `:18365` is the *separate* read-only nav add-in, not CAD-gen. |
| **Smooth-solid emitter** | 🔴 locked in unmerged branch | 432-commit `slot/delta` holds the loft/sweep/tangency emitter + real CLIs. `U-MERGE-SLOT-DELTA` is **operator-gated** (~19 conflict files; playbook `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md`). Gates `U-CAD-NURBS-STEP-EMIT` — **NOT** a T1 blocker. |

---

## ③ ENVELOPE-DRIFT CORRECTIONS (class-grep verified; 3/6 spot-confirmed on disk this session)

| Milestone | Envelope says | Reality | Action |
|---|---|---|---|
| **CAD-GROUND-TRUTH-MS0** | 4/10 in_progress | **10/10 engines on disk** (DimensionalSignature 472L, GroundTruthBatchExtractor 739L, GroundTruthRegistry 1191L all verified) | Code-complete. **Caveat (R12): a corpus *production run* has NOT been executed** (`cad-trilobe-labeled-training-set` = 0 rows). "Code done" ≠ "corpus produced" — do not flip to a bald `completed` that would imply the GT corpus exists. |
| CADCAM-DAGI-MS1 | 0/16 not_started | 0/16 | Accurate. **Demote U-DASAL09/U-DASAL10** from `in_progress` (stale claims, no engine class). |
| CAD-TRAINING-EXTRACT-MS0 | 0/12 ready | 0/12 | Accurate. **Demote U-CTE10** (no output artifact; driver self-exits 1 until `cad-engine/knowledge_store/` populated). |
| CADCAM-AGI-MS0 | 0/24 not_started | 0/24 | Accurate — all 24 genuinely unbuilt (orchestration foundation). |

---

## ④ THE THREE TRACKS (dependency-ordered; ⚙=autonomous-today, 👤=operator-gated)

**Track 1 — Fusion live print-generation demo** *(fastest tangible "Fusion up for live testing"; needs NO training)*
1. ⚙ build MCP server, start `:3100`.
2. 👤 install + **manually activate** the Fusion add-in (the one unavoidable human step).
3. ⚙ smoke `:18360/health` → run `new_doc→sketch→extrude→geometry→export(step)` on a JM `.f3d`.
4. ⚙ (recommended) add a `PRISM_FUSION_LIVE=1`-gated round-trip vitest. **Precision (R12, verified this session):** the bridge already has **5 mocked test files** incl units-trap coverage (`Fusion360LiveBridgeEngine.{revolveStepProfile,tapered,sweepLoft,camRead}.test.ts` + `fusion360-bridge.test.ts`) — the Workflow's "no Fusion test" was too broad. The genuine remaining gap is *only* a **live-gated** round-trip harness (mirror the hyperMILL `PRISM_HYPERMILL_LIVE=1` pattern). Build it **under an operator Fusion-active window** — it cannot be validated headless (no live add-in → its round-trip assertions can't be confirmed against the real `:18360` contract; shipping it blind risks a falsely-failing test). **Also note:** `f360_live_sweep`/`f360_live_loft` stay unwired *correctly* — the engine has the methods (`Fusion360LiveBridgeEngine.ts:650/680`) but the `:18360` add-in has no sweep/loft routes, so wiring the dispatcher actions would 404 (host-side add-in routes must come first).

**Track 2 — Trainable+testable OCR adapter** *(D0=A — the live T1/T2 gates)*
1. ⚙ `ensurepip` + `pip install trl qwen-vl-utils pillow pymupdf` into the GPU venv **(run fleet-quiet — big wheels get reaped under load; this is india/juliett GPU-venv territory — coordinate)**.
2. ⚙ stage bundle via `BlueprintLoRABridgeEngine` → verify `state/shared/lora/local-lora/*.jsonl` non-zero.
3. ⚙ (optional) grow corpus 594→646 by re-running the closed-loop daemon (raise the 7.88% yield).
4. ⚙ run T1 trainer → `state/shared/lora/adapters/cad-run-001`.
5. ⚙ run T2 `cadDispatcher: cad_draw_any_part_validate` → write `cad-validation-50-<ts>.json`.
6. 👤 **HARD BLOCKER:** build the `operator_verified` eval split — without it Brier ≤0.15 cannot pass and the adapter must not be promoted (R12). No autonomous substitute (needs human dim verification).

**Track 3 — True print→CAD-geometry generation** *(D0=B — heaviest; zero starting corpus)*
1. ⚙ run CAD-GROUND-TRUTH-MS0 as a **corpus production run** (engines exist; needs a driver + execution over the 92+ STEP / 1,163 `.f3d` corpus) → real GT feature labels.
2. ⚙ populate `cad-engine/knowledge_store/`, ship CAD-TRAINING-EXTRACT-MS0 (U-CTE01–12) → action-seq pairs.
3. ⚙ assemble ≥646 print→CAD pairs from #1+#2.
4. ⚙ Track-2 steps 4–6 with a **CAD-geometry trainer** (current trainer is VL-OCR — a new trainer may be needed; **unverified**).

---

## ⑤ THE THREE HARD BLOCKERS (the real gate — all operator)

1. **D0 — decide the training target** (A OCR-dimension vs B print→geometry). Bifurcates Tracks 2/3.
2. **Fusion add-in manual activation** — `runOnStartup:false` by design; one UI click per session. Gates any live print-gen demo (Track 1 step 2).
3. **operator_verified eval split** — the Brier ≤0.15 deploy gate cannot pass on pseudo-labels; needs human dimension verification (Track 2/3 step 6).
*(Plus the standing `U-MERGE-SLOT-DELTA` operator window — gates the smooth-solid emitter, NOT T1.)*

**Everything else** — pip deps, bundle staging, corpus 594→646, T1/T2 runs, GT corpus production, the Fusion
smoke test — **is autonomously runnable today.** The GPU is green.

---

## ⑥ Live 5-lens octopus consensus (this session, grok via Hermes, $0) — "highest-value autonomous next action?"

- **safety-first:** corpus analytics/quality audit on the pairs (de-risk data, no gated paths).
- **root-cause:** pre-solve the 19-conflict merge → validated merge candidate *(⚠ adversarial + safety flag this: duplicates operator review + un-reviewed-breakage risk — aligns with roadmap §6 "merge is NOT a mid-loop action")*.
- **fastest-unblock:** **short bounded QLoRA subset run (100-pair/1-epoch) on Blackwell now** — measurable training signal without merge/operator window.
- **distributed-ownership:** fork the emitter into parallel slot sub-branches *(adversarial flags as gate-duplication risk)*.
- **adversarial:** corpus is **not** the bottleneck — **GPU+merge are**; make the **validation harness run-ready BEFORE the branch lands**; don't redo dry-runs.
- **Consensus net:** don't touch the operator-gated merge autonomously; GPU being live makes a **bounded train step + run-ready validation** the genuine newly-unblocked move — *once D0 is decided and the deploy-gate caveat is acknowledged*.

---

## ⑦ What this session did NOT do (R12 honesty)
- Did **not** launch the real T1 training run: target is ambiguous (D0 unresolved) **and** the adapter can't
  clear the deploy gate on pseudo-labels — training blind would burn GPU on a possibly-wrong, unpromotable target.
- Did **not** install the 4 GPU-venv pip deps: 5 active fleet slots = not fleet-quiet; big-wheel installs get
  reaped under load and a half-install could break india's shared GPU stack (cf. the hermes aiohttp corruption saga).
  Documented the exact command for a quiet-window / india-coordinated run.
- Did **not** flip the GROUND-TRUTH-MS0 envelope to `completed`: code is done but the corpus run isn't — a bald
  flip would mislead the very training-data question. Documented the precise nuance instead.
- Did **not** author a duplicate plan: extended the existing `CAD-COMPLETION-ROADMAP-2026-06-26.md` (R8 dedup).

---
_Companion: `CAD-COMPLETION-ROADMAP-2026-06-26.md` (the units plan) · `CAD-COMPLETION-STATUS.json` (authoritative gate ledger) · `reference_blackwell_gpu_training_ready_2026_06_06.md` (GPU proof) · `DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md` (merge). Reconcile on next /handoff-delta._

---

## ⑧ 2026-06-29 RECONCILE (slot:delta, session claude-f78235d1) — Fusion is LIVE; corpus closed-loop shipped

**NEW FACT (Track 1 unblocked):** the operator activated the Fusion add-in — **delta :18362 is LIVE**
(`/status` → `connected, version 2704.0.74`). The §④ Track-1 "one operator step" is DONE this session.
The analytic validator (`cad-fusion-live-roundtrip.mjs`) ran live: **5/5 @ 0.000%, add-in LIVE** (Z tracks
depth 10/25mm). 17-route add-in contract verified.

**SHIPPED `U-DELTA-FUSION-CORPUS-ROUNDTRIP`** — the corpus variant that `reference_delta_live_cad_loop_map_2026_06_28`
had DEFERRED (no STEP `/import` → weak GT). Built via the point-extracted bbox as ground truth (R8
extension; reuses `extractBboxMm`+`roundtripOne`): for each real STEP part → extract stock envelope (mm)
→ reproduce as a Fusion box → read back → compare. CLI `--corpus N` (class-balanced over the 665-part
`cad-corpus-manifest.json`). 29/29 hermetic tests. **LIVE `--corpus 14`: 10/10 reproduced @ 0.000%**
across 8 classes (19.63mm→1206.9mm blisk→762.91mm impeller). Ledger → `state/shared/cad-fusion-live/`.

**FINDING (R12 — the suite's real signal):** the envelope round-trip is near-tautological for the bridge
(Hermes/grok octopus confirmed, $0); the value is **coverage + surfacing silent extraction failures**.
**4/14 curved/hollow parts (casing×2, bushing, 1 general) SKIPPED degenerate** — point-cloud bbox
collapses to `[x,y,0]` (sparse coplanar CARTESIAN_POINTs on analytic-surface/NURBS parts). Failed loud,
never fabricated. **~29% of curved parts need a kernel bbox.**

**NEXT UNIT `U-DELTA-FUSION-STEP-IMPORT-KERNELBBOX`** (resolves the §④ Track-1 step-4 + the deferred
weak-GT): add `POST /import` to the add-in so `/geometry` reports Fusion's KERNEL bbox of a real imported
STEP = authoritative GT (no point sampling). ⚠ a new add-in route is only live after an operator
Stop+Run of the add-in (GUI) — do NOT ship blind-validated. The 3 hard blockers (D0 / merge / pip
build123d+cadquery / operator_verified split) are UNCHANGED. Memory: `reference_delta_fusion_corpus_roundtrip_2026_06_29`.

**UPDATE (same session, crossroad-auto-decide — built the reversible/internal half, did NOT idle):
`U-DELTA-FUSION-STEP-IMPORT-KERNELBBOX` is now BUILT.** `POST /import` route added to `prism_api_server.py`
(mirrors `_handle_export`; `py_compile` clean) so `/geometry` reports Fusion's KERNEL bbox of an imported
real STEP = authoritative GT, units resolved natively by Fusion. Validator gains `kernelVsPointVerdict` /
`runCorpusKernelImport` / `kernelCoverage` + `--corpus-kernel N` CLI. **35/35 hermetic tests** (6 new:
clean-agree / degenerate-RESCUE / invalid-kernel / disagreement / coverage / import+read failures). The
LIVE leg (actually calling `/import`) needs ONE operator add-in **Stop+Run** (the new route is
in-memory-loaded) — intentionally NO live-gated test that would falsely fail headless. On reload:
`node scripts/cad-fusion-live-roundtrip.mjs --corpus-kernel 20` gives the ~29% degenerate curved/hollow
parts their true kernel envelope. (Assembly STEPs import as occurrences → sub-component bodies; root-only
`/geometry` is a documented follow-up.) Also added `Fusion360LiveBridgeEngine.importStep()` (R15 — exposes
kernel-import to all of PRISM, not just the validator; 4/4 engine tests, tsc-clean).

**FULL-CORPUS AUDIT (R12 — corrects the 14-sample 29% to the TRUE rate):** point-extraction over **ALL 665
STEP parts** (`state/shared/cad-fusion-live/corpus-extraction-audit.json`) = **585/665 (88.0%) valid point
envelope, 63 (9.5%) degenerate → need kernel-GT, 17 unknown-unit.** The 14-sample 29% was a class-balanced
artifact (over-weighted casing/bushing, both tiny + 100% degenerate). Concentrated: casing 8/8, bushing
2/2, die 21/71 (30%), general 32/574 (5.6%). Units MIXED: 248 inch + 400 mm + 17 unknown. So the kernel-GT
`/import` path rescues ~63 real parts; the point extractor already handles 88% of the corpus today.

**FUSION-FILES DATABASE (U-DELTA-FUSION-F3D-CORPUS — the operator's "fusion files" half):** `--f3d-inventory`
(offline, no live bridge) enumerated **1,738 `.f3d` files → 1,132 distinct JM parts, 23 with multi-OP
setups** (`state/shared/cad-fusion-live/f3d-corpus.json`). Parts are heavily *versioned* (v1–v24 = Fusion
design-iteration history) — a template + pattern-recognition substrate (1,132 part templates). `normalizeF3dStem`
parses `<part> OP<n> v<n>`; cross-MODALITY filename linkage (CAD↔CAM↔CNC↔print) is deliberately NOT attempted
(R12 — those naming systems diverge: CAD descriptive / Mastercam-CNC numeric / print TT·It codes → a filename
join would be sparse + misleading; content/kernel-based linkage is the right tool, not filenames).

**TRAIN-GATE NARROWED (verified):** `cadquery 2.8.0` is ALREADY installed (portable python); only `build123d`
is missing. So the "pip install build123d cadquery" gate is half-met — confirm against the GPU venv, then
only `build123d` remains for the Track-B geometry trainer.

## ⑨ GENERATION-TEST PROVEN AUTONOMOUSLY (2026-06-29) — the literal "test cad model" half works NOW, $0, no gates

Ran the live text→CAD generation closed loop (`scripts/cad-text-to-cadquery.mjs`: Ollama qwen2.5-coder:32b →
CadQuery → executed by the **present cadquery 2.8.0** → exported `model.step` → validated via the STEP extractor):

| prompt | generated | expected | result |
|---|---|---|---|
| 2×1×0.5in plate, 0.25in centered hole | bbox **[50.8, 25.4, 12.7]** mm, hole **r=3.175** | [50.8,25.4,12.7], r=3.175 | **0.0% error (EXACT)** |
| solid cylinder Ø30 × 40 tall | **r=15** ✓, height (bbox[0])=**40** ✓; bbox[1,2] degenerate [_,15,0] | [40,30,30], r=15 | **generation CORRECT; point-cloud bbox FAILS on the curved surface** |

**Three load-bearing findings (R12):**
1. **The autonomous "test cad model + print generation" half WORKS TODAY** — Ollama + cadquery, **no Fusion, no
   operator gate**. A prismatic part round-trips at **0.0% dimensional error**, end-to-end from a text prompt.
2. **`build123d` is NOT a hard gate for generation** — the generator prefers build123d but **falls back to cadquery
   successfully** (build123d absent, `executed=true`). So generation-testing is unblocked NOW; build123d only matters
   for the Track-B trainer variant.
3. **The point-cloud validation reliability MIRRORS the corpus finding** — exact on prismatic (plate 0.0%), degenerate
   on curved (cylinder bbox collapses, though radius+height are correct). This is the SAME root cause as the 9.5%
   corpus-degenerate parts → **curved generated parts need the kernel-GT `/import` validation** (the path built this
   session, pending one add-in reload). Generation accuracy ≠ validation-method accuracy: the cylinder proves the
   model generated correctly while the point-cloud measure could not confirm it. Evidence on disk: `state/shared/cad-text-gen/`.

## ⑩ ADD-IN `/import` DEPLOYED TO THE LIVE :18362 ADD-IN (2026-06-29) — recovery record (AppData-only, NOT in git)

**The live :18362 delta CAD add-in is `PRISMBridgeCAD.py` — installed-ONLY, no repo source exists** (verified:
no `PRISMBridgeCAD*.py` anywhere in the repo). Path:
`C:/Users/wompu/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/PRISMBridgeCAD/PRISMBridgeCAD.py`
(`PORT = os.environ.get("PRISM_BRIDGE_CAD_PORT", "18362")`; 3,480 lines; `_dispatch_post` dict + UI-thread
CustomEvent marshaling — a DIFFERENT architecture from the 718-line `resources/FUSION360/prism-api-server/`).
**`/import` was added there** (additive: `"/import": self._import_step,` in the POST dispatch dict + a
`_import_step` method mirroring `_export_model` exactly: `_get_design()` + path-traversal guard + `app.importManager`
`createSTEPImportOptions`/`importToTarget(opts, root)` -> `{success, format, path, bodies_imported, body_count}`).
`py_compile` clean; diff vs backup = ONLY those 2 additions (3,480 existing lines untouched); backup at
`PRISMBridgeCAD.py.bak-preimport`. **Live only after an operator Stop+Run of the PRISMBridgeCAD add-in** (Python
re-import). RECOVERY if the AppData file is lost/redeployed: re-add the same dict entry + `_import_step` method
(full method source in memory `reference_delta_fusion_corpus_roundtrip_2026_06_29` section 7). DEPLOY-GAP: the route
was first MIS-deployed to the inactive 718-line `prism-api-server` copy; the live one is `PRISMBridgeCAD` (identified
by `PORT=18362` + the `design_type` field in its `/new` response; cf. memory `reference_delta_fusion_backend_map_2026_06_02`
that :18365=PRISM_Fusion_Drive). FOLLOW-UP: establish a tracked repo source for PRISMBridgeCAD + a deploy script
(resources->AppData) so add-in edits are version-controlled (currently AppData-only).
