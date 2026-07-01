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
**Last reconcile:** 2026-06-10. **Trunk:** `cad-fusion-live-ms0`. **Slot branch:** `slot/delta` (410 commits ahead — see §1).

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

## 2. ✅ DONE — today's 18 commits (CAD-CLOSED-LOOP-MS0, 2026-06-10)
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

## 6. ▶ NEXT ACTIONS (ROI order — reconciled iter4 2026-06-10)
> **iter4 verified finding re-ranks everything: the P1 merge is now unambiguously #1.** It doesn't just unblock the CAD *pipeline* — it **UNLOCKS already-built smooth-solid capability** (P7 loft/sweep/tangency/rail + 10 surface ops × 11 platforms, U-CEEF iter158-161 + U-WAVE-I/J). Building P7/P6 on trunk pre-merge would duplicate (R8). So the highest-ROI path toward the north-star is: **merge → then the small residual headless-NURBS-STEP-emit piece on the unified base.**
1. **C1 → P1 `U-MERGE-SLOT-DELTA`** (operator-gated coordinated session, §1) — playbook ready. Unlocks 410 commits incl. the built smooth-solid emitter. **THE highest-leverage action.**
2. **(post-merge) headless-NURBS-STEP-emit** — the one genuinely net-new emitter piece (today's headless emit is faceted PLANE-only); build on the merged emitter base, validate vs `blisk.stp` B_SPLINE_SURFACE.
3. **A2** U-AI-14 `PerCustomerOmegaTargetEngine` — the only non-merge-blocked genuine new build (fresh window; `/dedup` → whole build → 3-of-3). Out-of-pure-CAD-lane (Ω/safety config — defer threshold values to physics-reviewer per soul); buildable WITHOUT the merge if an autonomous unit is wanted before the merge window.
4. **A4** P3 Ollama offload wiring (9%→30%) — fresh window; dedup-check existing `ollama-task-offloader`/`ollama-pipeline-injector` FIRST (R8).
5. **OPERATOR ACTION (env):** rebuild `mcp-server/dist` (`npm run build`) — live MCP mis-measures inch parts 25.4× on stale dist (§5 gotcha #2).

_Reconcile cadence: refresh §2 (done) + §3 (open) on each /handoff-delta. Keep ≤1 page of signal._
