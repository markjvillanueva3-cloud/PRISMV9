<!--
  DELTA (CAD) CONTEXT LEDGER — the single-read context-regain surface for slot delta.
  Pattern cloned from bravo's U-BRAVO-OPEN-TASKS-LEDGER (46fd12f4f7): one curated,
  ROI-ordered, reconciled doc that supersedes stitching together handoff + 39KB
  goal-roadmap + 14KB task-queue + synthesis + git-log + 45KB context-recovery.
  READ THIS FIRST on /startup-delta. Reconciled against git reality, not envelopes.
  Maintainer: slot delta. Last reconcile: 2026-06-10 (loop 0e708167 iter1).
-->

# 🔑 DELTA (CAD) CONTEXT LEDGER — read this first

**Domain:** delta = CAD specialist (geometry / BRep / feature-recognition / GD&T / STEP·IGES / closed-loop CAD generation).
**Goal (across all sessions):** closed-loop testing + template generation + a **highly-efficient, fully-optimized, 100%-accurate-to-print** complex CAD model (turbine / blisk / engine) **validated against a real `resources/CAD FILES/` reference**.
**Operating model:** ultracode-plan · **Ollama-grunt** (searches/reads/summaries/explain — `node scripts/ask-ollama.mjs <mode> <file>`) · Claude-build (judgment + safety). Offload easy steps to Sonnet/Haiku.
**Last reconcile:** 2026-07-01 (session claude-b9e50f6b, 2-week full reorientation: 9 handoffs + 154 commits mined). **Trunk:** `cad-fusion-live-ms0`. **Slot branch:** `slot/delta` (merge resolved at `3f44771b3b` but NOT landed — see §1).

---

## 0. Where context lives (4-surface regain map)
| Surface | Path | Use |
|---|---|---|
| **THIS ledger** | `state/shared/DELTA-CONTEXT-LEDGER.md` | single-read regain (ROI-ordered open threads) |
| ⭐ **Completion roadmap** | `state/shared/specs/CAD-COMPLETION-ROADMAP-2026-06-26.md` | **the consolidated remaining-units plan → train+test CAD model + print-gen** (terminal loss-function + critical path + Part-A harness). Built from this ledger + git reconcile (2026-06-26, slot delta /goal). |
| Goal roadmap (deep) | `state/shared/delta-goal-roadmap-2026-06-09.md` (39 KB) | full P0-P10 acceptance criteria — Ollama-summarize it |
| Task queue (narrative) | `state/shared/delta-task-queue-2026-06-10.md` (14 KB) | the PROVEN-loop narration (loops 1-8) — superseded by §2/§3 here |
| Galaxy brain | `mcp-server/src/engines/cad/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md` | doctrine + file map + dispatcher/skill belt |
| Obsidian recall | `prism_memory:semantic_search query="cad" topK=20` | cross-session brain (auto-fed every Stop) |
| Day context-recovery | `state/shared/context-recovery/delta-TODAY-*.md` | verbatim per-day compaction recovery |

---

## 1. ⭐ STRUCTURAL STATE #1 — the 410-commit unmerged `slot/delta` branch
`slot/delta` is **410 commits / ~3970 files ahead** of trunk `cad-fusion-live-ms0`. This is the bulk of delta's CAD work — **finished but not on trunk** (the real CAD CLIs `cad-generate-stepped-trilobe-cli.mjs` + `cad-analyze-step.mjs` live ONLY in worktree `H:/prism-slot-delta`, not trunk). What's locked up (commit-scope histogram):

| commits | scope |
|---|---|
| 135 | `CAD-PIPELINE-WIRE-MS0` |
| 72 | `CAD-ASSEMBLY-GEN-MS0` |
| 58 | `MS-CAM-MASTERY` |
| 34+17 | `MS-CAD-TRAINING-PIPELINE` + `CAD-TRAINING-PIPELINE` |
| 29 | `CAD-ELECTRODE-GEN-MS0` |
| 19 | `DELTA-CAD-GALAXY-SYNERGY` |
| 14 | `CAD-FULL-COVERAGE-MS0` |
| 5 | `CAD-AP242-EMITTER-MS0` |
| 1 ea | CAD-STEP-{EMIT,PARSE,ROUNDTRIP-TEST}-MS0, CAD-REPLICATE-FROM-TEMPLATE, CAD-ANALYZE-STEP, CAD-VERIFY-ELECTRODE, KEC-MS0(6) … |

**`U-MERGE-SLOT-DELTA` (P1) is the #1 structural unblock** — but it is **operator-gated / coordinated-session only**, NOT a mid-loop action. Merge scope: 19 conflict files, and they are the dangerous ones — `.claude/settings.json` (fleet hook wiring, slot +5 / trunk +20), `CLAUDE.md` (trunk +527/-600), `cadDispatcher.ts` (564-action core, trunk +1502 / slot +119 — highest-effort union), `wiki/index+log`. Needs per-conflict union-resolution + full build/test + a fleet-quiet window. (25,677 untracked files in shared trunk → never `git add .`.)

> 📋 **Merge-readiness playbook (iter3): `state/shared/specs/DELTA-P1-MERGE-PLAYBOOK-2026-06-10.md`** — all 19 conflicts bucketed with per-file resolution strategy + safe execution sequence + backup/abort/rollback + risk register. Makes the eventual coordinated session fast + safe. **This is the recommended next-window action toward the north-star (it unblocks P6/P7).**

---

## 2a. ✅ DONE — the 2026-06-17→07-01 arc (154 commits, DELTA-CAD-COMPLETION; reconciled 2026-07-01)
Delta built an **end-to-end self-validating text→CAD manufacturing pipeline** in 4 phases:
1. **Gen loop + engines** (06-19..26): feature-completeness ledger (`37e5d383f0`) · resumable $0 overnight gen loop + cron (`a610037855`/`721f695758`) · first-class engines: subtract/pattern/datum/die-design/boolean/mate/weldment/sheetmetal (`37a5109863`..`9b5fc962ed`) · **`cad_drawing_generate`** orthographic 2D drawing gen, ASME/ISO (`adabdcf5cc`, 22/22).
2. **Rigor layer** (06-27..28): leak-guard + stratified holdout **geom-50/ocr-150** (`315bb33358`, found 13 real leaks `79b157f4fd`) · `cad_holdout_check` MCP action (`5f83dc0b00`) · honest validation-50 driver (`e724240d7c`) · eval harness dim+geom modality (`f6053042db`/`b0bb7847c9`) · DIMTOL KS-drift gate (`50d4afc5ac`).
3. **Kernel-GT pivot** (06-28..29): point-cloud bbox only 33% agree, 99.5% of 2378-STEP corpus curved (`77b822e162`) → **Fusion kernel-bbox = authoritative GT** (`f94e623480`, proven live `bb7d2fcb29`) · kernel-accuracy wired INLINE into generator + overnight loop + learning signal (`fae67ccdd2`/`0026404de8`/`6f5d40cae6`) · CANONICAL_SUITE 3/3 parts 0.0% err (`b0bf6ac2ac`) · prior-binding 5× tighter dims (`7de9beab82`) · radii prior from 68,512 corpus radii (`acff9d24b4`) · 3 units bugs fixed: **25.4× mm-undersize** (`67ea872037`, 0%→100% on affected part), **inverse-units backstop** (`2899640389`), **spark-gap undersizing ~16% of GEN parts** (`c3e0ba1590`, tokenizer root cause `a4f85b6ce6`).
4. **Fusion-FREE self-check + decipher** (06-30..07-01): "decipher the print" parser (`35b78295ab`, sweep unparseable 18→2) · offline self-check wired INTO generator + learning loop (`700459258e`/`48a580e2d9`) · sweep graded accuracy **79.2%→81.3%** (`4553b713d7`; all 21 remaining inaccurate parts trace to the 3 FIXED bug classes — regen pending) · Stage-2 mfg-logic stock+workholding (`ef20ccc4b6`, 115/115) · **2217-part corpus decipher 92.6% deterministic $0** (`b99cd8cc77`) + Hermes residual + cron + flush · **968 LoRA pairs wired into fleet corpus** (`a054457122`).
Cross-slot: india fixed `feature_recognize` silent-empty via delta-cad agent (`8ebce48c16`, 7/7).

## 2. ✅ DONE — 2026-06-10 session (CAD-CLOSED-LOOP-MS0; superseded by §2a, kept for lineage)
The closed-loop measure→correct→converge cycle is **PROVEN against the REAL `blisk.stp`**:
- `cb1ec539a3` **U-CAD-FIDELITY-E2E-VALIDATE** — surface-fidelity E2E on real blisk-vs-replica: **0.000% dims / 1.551% mean / 5.087% worst** (of 1734.7 mm diag). Literal 0% surface = re-import the NURBS net, not regeneration.
- `afdce4386a` **U-CAD-CORPUS-CLASS-COVERAGE** — 3 geometry classes + inch→mm units-first lock. FINDING: stale `mcp-server/dist` returns RAW inch (mis-measures inch parts **25.4×** until rebuilt).
- `400e165bd8` **U-CAD-SECOND-REFERENCE-PART** — Impeller turbine.stp (405 B-spline vanes) 2nd-part regression.
- `dfe6ac41e5` **U-CAD-HAUSDORFF** — surface-Hausdorff metric (**= roadmap P8, now DONE**): blisk-vs-replica 152 mm/8.76% Hausdorff, 21.37 mm/1.23% mean Chamfer.
- `c265300bec` U-CAD-TOPOLOGY-QUANTIFY · `2b27b7acb6` U-CAD-VOLUME-METRIC (bbox-proxy tag) · `76005e8402` U-CAD-PORT-NONDEFECT · `a38a9ce0b7` U-CAD-REGEN-LIVE-PROOF · `be05cc0642` U-CAD-REGEN-CORRECT · `4a166e0dde` U-CAD-COMPARE-UNIT-NORMALIZE.
- `c91fde85d1` **U-BLISK-6SERIES-PARSE** — 6-series airfoil parse + fail-loud validate (closed the named next-unit).
- Earlier today: DELTA-CONTEXT-RECON loops (real-reference characterized, closed-loop proven on blisk).

**Net:** the closed-loop training/measure/correct methodology is proven headless on trilobe (bbox) AND turbine blisk (volume + surface-Hausdorff) vs real references. The remaining frontier is **faceted-vs-NURBS generation fidelity** (P7), not "no reference / loop doesn't converge."

---

## 3. 🎯 OPEN THREADS — ROI-ordered (reconciled w/ today; ⚙=autonomous-buildable now, 🔒=fresh-window/coordinated, 🌐=env-dependent)
| ROI | item | state | route |
|---|---|---|---|
| ~~A1~~ ❌ | ~~`U-BRIDGE-CAD-CAM-ENROLL`~~ — **SKIP, mis-specced** (iter2 finding) | `CadCamHandoffEngine` is ALREADY wired (cad+cam dispatchers, 331 LOC). Enrolling a *wired* engine into a *gap* audit (units track gaps/work-to-do) would be a tracking falsehood (R8/R12). Correct home = the DEEP_INTEGRATION_BRIDGES registry (roadmap-consolidation), not FEATURE-GAP-AUDIT-MS0. Re-home if tracked at all; do NOT add as a gap unit. | — (don't build) |
| **A2** ⚙ | **U-AI-14 `PerCustomerOmegaTargetEngine`** (CAD-COMPLETE-MS0 PHASE-51) | GENUINELY NOVEL — zero on-disk equivalent. The only confirmed real build of the 9 "U-AI not_started" (the other ~7 are satisfiable by wired equivalents — enroll, don't rebuild). **S-build; needs a fresh window** for /dedup → whole build → per-file 2-arm + 3-of-3 gate. | fresh window, CLAUDE-BUILD (S) |
| **A3** 🔒 | **P9 close the learn loop** (fix-ledger → retrain consumer → `xproc_outcome_publish` to india) | iter2 finding: this is an **L-build, NOT a wiring** — `cad-fix-training-ledger` does NOT exist as a file (roadmap-aspirational); `xproc_outcome_publish` lives only in galaxy docs (not wired). Real CAD trainers exist (`CADSequenceTrainerEngine`, `CADTrainingPipelineOrchestratorEngine`) to build ONTO. | fresh window, CLAUDE-BUILD (L) |
| **A4** ⚙ | **P3 Ollama offload wiring** (pre-warm + queue) | raise offload **9%→30%**; aligns w/ standing Ollama directive. The A1/U-A1B abort cause was GPU-contention cold-load. | CLAUDE-BUILD (M) |
| **B1** 🔒 | **P6 ⭐ `CAD-FEATURE-RECOGNITION-MS0`** (BREP→authoring-feature tree) — the crux; breaks STEP-no-history ceiling | `CADFeatureRecognitionEngine.ts` **shell EXISTS on trunk** (3 FeatureRecognition* files) — verify capability DEPTH before treating as net-new. HARD. | fresh window, CLAUDE-BUILD (L) |
| ~~B2~~ → **merge** | **P7 smooth-solid gen** — **VERIFIED ALREADY BUILT in the unmerged `slot/delta` branch (iter4 finding), NOT a fresh build** | `U-CEEF-FUSION-BUILD-SCRIPT` (iter158) emits "ONE smooth solid" via Fusion loft; `U-CEEF-TANGENT-LOFT` (iter161) tangency; `U-CEEF-LOFT-WITH-RAIL` (iter159) print-radius rail; `U-WAVE-I-SURFACE` 10 surface ops (loft/sweep/revolve/thicken/stitch) × 11 platforms. → **the merge (C1) UNLOCKS this on trunk** — building it here would duplicate (R8). Residual gap = HEADLESS-NURBS-STEP-emit (today's emit is still faceted PLANE-only); that piece IS net-new but should land AFTER the merge on the unified emitter base. | → do the **merge**, not a rebuild |
| **C1** 🔒 | **P1 `U-MERGE-SLOT-DELTA`** (410 commits → trunk) | §1. Operator-gated coordinated session, NOT mid-loop. | ULTRACODE-PLAN + coordinated |
| **C2** 🌐 | **P4 live Fusion bridge LIVE proof** (`:18365` revolute-assembly) | first real live round-trip — never executed; needs live Fusion app. | env-dependent |
| **C3** 🌐 | **P5 corpus throughput (Blackwell)** — multi-VLM OCR 7,794 prints · GPU re-embed · STEP catalog 33%→100% | top GPU lever; feeds the closed loop. | OLLAMA-GRUNT + CLAUDE |
| **D1** ⚙ | **P10** scale to complex (multi-feature trees, datums, patterns, assemblies) | the final clear: 10-50 interdependent features gen/corrected/learned. | CLAUDE-BUILD (L) |

---

## 4. 🩺 DORMANT / UNWIRED / TEST-DEBT (verified 2026-06-10)
- ✅ **CADArchiveJoinAugmenterEngine** — exists AND wired (1 dispatcher ref). **NOT dormant** (corrects a stale synthesis "needs integration" claim).
- ⚠ **transcript-digest.mjs** — ships WITHOUT a hermetic unit test (session utility, proven live on 122 MB transcript). Test-debt follow-up.
- ⚠ **CADClassFea** — geometry-evidence corpus holds **662/665** STEP files; 3 classes lack evidence (advisory, from synthesis — verify before sourcing).

## 5. ⚠ GOTCHAS — do NOT repeat (R12)
1. **Units are INCH** in JM STEP (`CONVERSION_BASED_UNIT 25.4 mm`), NOT mm — units-first or 25.4× scale error. [[reference_delta_step_inch_unit_convention]]
2. **Stale `mcp-server/dist`** returns RAW inch (un-normalized) → live MCP mis-measures inch parts 25.4× until `npm run build`.
3. **Faceted ≠ NURBS**: PRISM headless emit is PLANE-only (0 B-spline); real refs are NURBS-smooth (blisk.stp 328 B_SPLINE_SURFACE). Volume-match ≠ shape-match. Needs P7 / Fusion kernel.
4. **archetype MATCH before SCALE** — scaling a single-section ref to a two-section target = wrong topology. [[reference_delta_archetype_match_before_scale]]
5. **NEVER emit malformed periodic B-spline** (silent Fusion blank doc) — use the proven multi-prism emitter. [[reference_delta_proven_step_emitter]]
6. **topology BEFORE tolerance; NEVER inline ISO286 fits.** [[feedback_delta_topology_before_tolerance]] · [[feedback_delta_no_inline_iso286]]
7. **sinker-EDM spark gap = −.003in total (−.0015/side)** — bake into geometry. [[reference_delta_jm_spark_gap_convention]]

## 5b. ⚠ NEW GOTCHAS from the 06-17→07-01 arc (additive to §5)
8. **LoRA assembler reads the SNAPSHOT** `fleet-training-corpus-inventory.json`, not fresh sources — regen the snapshot or train on stale data. [[reference_lora_inventory_snapshot_regen]]
9. **Eval denominator keys by UNIQUE FULL PATH, never stem** — stem collisions inflate coverage (dangerous direction). [[reference_delta_eval_harness_2026_06_28]]
10. **Point-cloud bbox is NOT ground truth** (33% agreement, 29% degenerate on curved parts) — kernel-bbox via Fusion `/import` is authoritative; self-check restricts headline to determinism-passing parts.
11. **Leak-guard proof must use the part-aware enforcer** (`heldSurvived===0`), not path-only. [[reference_delta_ocr_holdout_2026_06_27]]

## 6b. ▶ NEXT ACTIONS (ROI order — reconciled 2026-07-02, session claude-b9e50f6b, post U-DELTA-NIGHT-CHAIN `19468b4497`)
> **Night-chain state (2026-07-02):** `PRISM CAD Closed Loop Night` (daily 22:11, 9h) now chains corpus-harvest → Fusion kernel-drain (:18362 gated) → part-decipher → decipher-hermes → kernel-dimprior → cnc-ground-truth (full JM DIE) → decipher-lora. Kernel worklist DRAINED (2,199/2,199 attempted; 13 body-less freeform fail nightly, ~$0). Hermes residual DRAINED 70/70 (proxy back UP). `PRISM CAD Decipher Hermes` registered daily 07:15. Prints lane expanded: +26,954 ambiguous-bucket docs (34,097 worklist; xray notified). Morning check: `tail state/shared/cad-closed-loop-night/night-summary.jsonl` (chain-start without chain-complete = killed).
1. **Morning-verify the first full night** — night-summary.jsonl all-stages exit 0; cnc-ground-truth per-class GT in `state/shared/ocr-ground-truth-cnc/`; gen-loop re-roll of s1dvtfzn + s10dig0p → re-run self-check sweep, expect 99/99 reliable-bbox.
2. **B-Rep coverage gap** — harvest walks STEP-only in 3 roots (2,378 files); canonical brep manifest counts 3,359 (+.igs/.x_t/.x_b ~160, + STEPs outside roots). Extend `--roots`/extensions or document exclusion rationale per file class.
3. **GEOM eval dispatcher action** (`prism_cad`) — dim/geom parity gap, [SCOPED] deferral from U-DELTA-GEOMEVAL-RUNNER.
4. **Deferred P2s:** kernel-dimprior truncating write → tmp+rename (torn-read vs gen-loop reader); LoRA builder doesn't dedup duplicate Hermes rows (07:15-task overlap case); assembler per-row provenance overwrite; writeFeed clobber guard.
5. **Next master-plan units (miners):** U-DELTA-PDF-CLASS (ambiguous 26,973 → classified), U-DELTA-CNC-BACKINFER (367,522 programs), U-DELTA-MCAD-FEATURES (12,572 ipt/iam/sldprt) — MCAD/2D/f3d modalities have NO training lane yet (honest gap; enumerated in `state/shared/cad-closed-loop-night/canonical-counts.json`).
6. 👤 **Operator gates unchanged:** pip `trl qwen-vl-utils pillow pymupdf` → T1 train · hyperCAD-S seat → T2 live-run · Fusion add-in reload → `/drawing` endpoint / print-regen Stage-1 · fleet-quiet window → land `3f44771b3b` (U-MERGE-SLOT-DELTA, resolved NOT landed — verified 07-01).

## 6. ▶ NEXT ACTIONS (ROI order — reconciled iter4 2026-06-10; superseded by §6b, kept for lineage)
> **iter4 verified finding re-ranks everything: the P1 merge is now unambiguously #1.** It doesn't just unblock the CAD *pipeline* — it **UNLOCKS already-built smooth-solid capability** (P7 loft/sweep/tangency/rail + 10 surface ops × 11 platforms, U-CEEF iter158-161 + U-WAVE-I/J). Building P7/P6 on trunk pre-merge would duplicate (R8). So the highest-ROI path toward the north-star is: **merge → then the small residual headless-NURBS-STEP-emit piece on the unified base.**
1. **C1 → P1 `U-MERGE-SLOT-DELTA`** (operator-gated coordinated session, §1) — playbook ready. Unlocks 410 commits incl. the built smooth-solid emitter. **THE highest-leverage action.**
2. **(post-merge) headless-NURBS-STEP-emit** — the one genuinely net-new emitter piece (today's headless emit is faceted PLANE-only); build on the merged emitter base, validate vs `blisk.stp` B_SPLINE_SURFACE.
3. **A2** U-AI-14 `PerCustomerOmegaTargetEngine` — the only non-merge-blocked genuine new build (fresh window; `/dedup` → whole build → 3-of-3). Out-of-pure-CAD-lane (Ω/safety config — defer threshold values to physics-reviewer per soul); buildable WITHOUT the merge if an autonomous unit is wanted before the merge window.
4. **A4** P3 Ollama offload wiring (9%→30%) — fresh window; dedup-check existing `ollama-task-offloader`/`ollama-pipeline-injector` FIRST (R8).
5. **OPERATOR ACTION (env):** rebuild `mcp-server/dist` (`npm run build`) — live MCP mis-measures inch parts 25.4× on stale dist (§5 gotcha #2).

_Reconcile cadence: refresh §2 (done) + §3 (open) on each /handoff-delta. Keep ≤1 page of signal._
