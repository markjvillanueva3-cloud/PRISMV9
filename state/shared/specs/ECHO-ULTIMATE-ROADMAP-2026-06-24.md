# ECHO ULTIMATE ROADMAP — Post-Processor Launch Completion (2026-06-24, slot:echo)

> **Operator /goal (2026-06-24):** read all echo/post-processor chats+sessions+plans+roadmaps, compare to what is built, and plan the ultimate roadmap to (a) build all remaining post-processor units and (b) generate/modify **both tracks** of every JM Die post — the **.cps** version AND the **higher-tier PRISM-routed** version. Baselines: **JM Hurco mill = the "completed-but-not-tested" `HURCO_VM30i_PRISM_v11`**; **JM lathe = Okuma `LB3000` + `MULTUS B250II`**.
>
> Grounding (no re-mining — the existing miners already synthesized all 35 echo sessions): `state/shared/galaxy-transcript-mining/post-processor/_SYNTHESIS.md` · `ECHO-OPEN-TASKS-LEDGER.md` · `ECHO-FORGE-ROADMAP-2026-06-09.md` · `POST-GEN-COVERAGE-AUDIT-2026-05-29-echo.md` · galaxy `post-processor/{CLAUDE,MEMORY,PATHS}.md` · this session's live verification.

---

## 1. CURRENT vs BUILT — verified state (2026-06-24)

| Surface | State | Evidence |
|---|---|---|
| `prism_pp` dispatcher | **LIVE**, 654 actions, ~94% resolve to real methods | commit `ab0c5d5193` |
| Post-processor-domain engine TESTS | **10 of 46 now tested** (515 new tests this session) | commits 607f07b6b1, 11556551bd, 42db397e0d, 8f47872237 |
| Untested post engines remaining | **~36** (incl. the lathe-baseline trio below) | live glob 2026-06-24 |
| Backplot safety detectors | **FIXED** — gouge + rapid-into-material were structurally DEAD (`U-PP-BACKPLOT-G0NORM`, `8f47872237`) | this session |
| AlarmDB → pipeline P5 | **WIRED** (Stage 5.1b via AlarmRegistry); residual = full-2,588 coverage | doc-corrected this session |
| JM `.cps` corpus | **301 total** `.cps`; **~17 curated PRISM-enhanced** in `JM DIE/PRISM MODIFIED POST PROCESSORS/` | live count |
| Higher-tier MasterPost engines | **6**: `MasterPostProcessor{,UnifiedAGI,AGIOrchestration,Genius}Engine`, `MasterPostGeneratorEngine`, `MasterPostFineTuningEngine` (several AGI-tier still dark) | live glob |
| MS-MASTERPOST (saleable product) | 44/44 units **gated on U-LEGAL-13** (public-manuals-only) | ledger |
| CIMCO closed-loop validation | operator-gated (CIMCO foreground on VMC-01); launcher = `CIMCOEdit - H` → `H:/CIMCO 2026/CIMCOEdit/CIMCOEdit.exe` | `reference_cimco_edit_h_launcher_2026_06_24` |

### The two operator-named baselines (verified)
- **MILL baseline — `HURCO_VM30i_PRISM_v11.cps` + `HurcoV11MillMasterPostEngine`** (engine HAS a unit test; the **POST is "completed but not tested"** = no CIMCO sim/code-correctness validation + no byte-equiv vs golden). JM VMC-01 (Hurco VM30i WinMAX-v10). This is the *reference implementation* for the dual-track pattern.
- **LATHE baseline — `OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` + `OKUMA_LATHE_LB3000-Ai-Enhanced.cps` + `OkumaB250LatheMasterPostEngine` (UNTESTED ENGINE — critical-path gap)**, plus `LathePostProcessorEngine` + `LathePostProcessorAIEngine` (both UNTESTED). JM lathe fleet is Okuma OSP (LTH-01..07; whiskey owns lathe physics).

---

## 2. THE DUAL-TRACK DELIVERABLE (operator core ask)

For **every** JM Die machine, ship **both**:
- **Track-CPS:** the Fusion/CAM `.cps` post (operator-runnable today; the ~17 curated enhanced posts are the working set).
- **Track-PRISM:** the higher-tier version that **routes through `PostProcessorPipelineEngine` 7-phase** (P1 physics + P5 safety+tribal NON-NEGOTIABLE) via the per-machine `MasterPost*` engine + `master_post_by_machine` routing, with **byte-equivalence proof vs the golden `.cps`**.

### JM fleet coverage matrix (target — both tracks per row)
| Machine | Controller | .cps (Track-CPS) | PRISM engine (Track-PRISM) | Status |
|---|---|---|---|---|
| VMC-01 Hurco VM30i | WinMAX/MAX5 | `HURCO_VM30i_PRISM_v11.cps` ✓ | `HurcoV11MillMasterPostEngine` (tested) | **BASELINE — needs CIMCO validation + byte-equiv** |
| LTH Okuma Multus B250IIW | OSP-P300 | `OKUMA_MULTUS_B250IIW-…v5_2_7.cps` ✓ | `OkumaB250LatheMasterPostEngine` **UNTESTED** | **LATHE BASELINE — engine test + validate** |
| LTH Okuma LB3000 | OSP | `OKUMA_LATHE_LB3000-Ai-Enhanced.cps` ✓ | (route via Okuma lathe MasterPost) | engine coverage + route |
| VMC-02 Okuma M460V-5AX | OSP-P300MA | `OKUMA-M460V-5AX-…(iMachining).cps` ✓ | Okuma 5-ax MasterPost (verify) | route + validate |
| LTH Okuma Genos L400II | P300LA | `OKUMA_GENOS_L400II_P300LA-…cps` ✓ | lathe MasterPost route | route |
| VMC-03/04 Haas VF-2/OM-2 | PRE-NGC | `HAAS_VF2_-Ai…(iMachining).cps` ✓ | `HaasNGCMillMasterPostEngine` (built 2026-06-01) | **P0 route gap: master_post_by_machine REJECTS Haas PRE-NGC** |
| VMC-05 Roku-Roku | Fanuc-31i | `Roku-Roku-Ai-Enhanced.cps` ✓ | (no registered post) | **P0 route gap** |
| WEDM ×6 (Agie/Fanuc Robocut/Makino U/Mitsubishi FA10S/Sodick AQ + Hurco) | per-vendor | `PRISM-Master-*-WEDM.cps` ✓ | `WEDMPost{Mitsubishi,Sodick,Makino,Agie,Fanuc}` (stub-wired) | un-dark the WEDM post engines |

**4 P0 machine-route gaps** (from POST-GEN-COVERAGE-AUDIT): Haas PRE-NGC, Roku-Roku, EA sinker, FA10S mis-route — `master_post_by_machine` only ~6 of fleet wired.

---

## 3. REMAINING-UNIT TRACKS — dependency-ordered (build the verifiable core first, R13)

### Track A — Engine test coverage (unblocks everything; eval = `vitest` green + per-file scrutiny)
- **A1 [CRITICAL PATH for lathe deliverable]:** test `OkumaB250LatheMasterPostEngine`, `LathePostProcessorEngine`, `LathePostProcessorAIEngine` — the lathe baseline trio. (whiskey co-review for lathe physics.)
- **A2:** the remaining ~33 untested post engines (batches of 4 `coder` agents, `model:'sonnet'`; see §5 orchestration lessons).
- **DONE-WHEN:** 46/46 post-processor-domain engines have real reference-value companion tests; full `vitest` suite green (run FOREGROUND — see §5).

### Track B — Baseline post validation (the "completed but not tested" closure)
- **B1:** CIMCO closed-loop validation of `HURCO_VM30i_PRISM_v11.cps` — code-correctness + simulation (operator opens `CIMCOEdit - H` foreground on VMC-01; ledger §D/E). EVAL: over-travel NC → CIMCO report flags it → verdict FAILS (proves the loop catches problems).
- **B2:** byte-equivalence CI of Track-PRISM Hurco emit vs the golden `HURCO_VM30i_PRISM_v11.cps` (`MasterPostByteEquivalenceCI` + `post-gen-reward.mjs --golden`).
- **B3:** repeat B1+B2 for the lathe baseline (Multus B250IIW + LB3000) once A1 lands.
- **DONE-WHEN:** Hurco + Okuma-lathe baselines pass CIMCO sim + byte-equiv vs golden, with numbers.

### Track C — Dual-track generation/modification for the full JM fleet
- **C1:** close the 4 P0 `master_post_by_machine` routes (Haas PRE-NGC, Roku-Roku, EA sinker, FA10S).
- **C2:** for each JM machine, generate Track-PRISM emit through `PostProcessorPipelineEngine` and diff vs the curated `.cps` (Track-CPS) → reconcile to byte-equiv (modulo intended physics/safety upgrades).
- **C3:** un-dark the 5 `WEDMPost*` stub-wired engines (Mitsubishi already real) → real per-vendor WEDM emit + byte-equiv vs the 6 `PRISM-Master-*-WEDM.cps`.
- **DONE-WHEN:** every JM machine has both tracks, byte-equiv-proven, routed via `master_post_by_machine`.

### Track D — Closed-loop + safety hardening
- **D1:** auto-call `pp_outcome_emit` inside `PostProcessorPipelineEngine` P6 (closes echo→india learning loop; dispatcher action wired `0777fda9d2`, in-pipeline auto-call missing).
- **D2:** AlarmDB Stage-5.1b → confirm/extend to full 2,588-entry `controller-alarm-database.json` coverage.
- **D3:** golden-NC byte-equiv CI for ≥6 controllers (add Fanuc/Siemens/Heidenhain).
- **D4:** 3-of-3 scrutiny on the `U-PP-BACKPLOT-G0NORM` safety fix (deferred this session by the ceiling).

### Track E — MS-MASTERPOST (saleable product) — LEGAL-GATED
- **E1 (operator-gated):** U-LEGAL-13 public-manuals-only provenance sign-off, THEN un-dark the ~14 AGI-tier MasterPost engines (`MasterPostProcessor{AGIOrchestration,Genius,UnifiedAGI}`, `CrossCAMPost`, `PostProcessorTransformer`, …) into the single-canonical-emit + 8-dim scorecard product.

---

## 4. LOSS FUNCTIONS (per track — deterministic done-signals, not prose)
- A: `npx vitest run <engine>.test.ts` green, 46/46 engines, full-suite green (foreground).
- B: CIMCO report verdict + byte-equiv ratio == 1.0 (modulo intended deltas), proven with numbers.
- C: `master_post_by_machine` resolves every JM machine_id; per-machine byte-equiv vs golden `.cps`.
- D: round-trip E2E assertion (post-gen → OutcomeCaptureBus); alarm-coverage count == 2,588; CI green ≥6 controllers.
- E: operator U-LEGAL-13 sign-off recorded; then per-engine real dispatcher case + test.

## 5. ORCHESTRATION — how to execute (with this session's hard-won lessons)
- **Fan-out (operator advisory):** mill→**foxtrot**, lathe→**whiskey**, post→**echo**. Coordinate via chat-bus + slot-task-claims; clone (don't fork) shared assets.
- **Mechanical work → local lane (R5):** test-scaffold/summarize/lint/diff/docstring → Ollama (`ask-ollama.mjs`) / Hermes (`ask-hermes.mjs`, stronger OAuth model, :8645). Reserve Claude for physics/safety judgment.
- **Parallel test-writing:** the **Workflow fanout-gate blocks ≥4 inherit-model agents** — drive the fan-out via the **Agent tool with `model:'sonnet'` in batches of 4**; only-green-files-stay-on-disk; verify all-together before commit. (Proven this session: 515 tests, 10 engines.)
- **⚠ Full `vitest` suite must run FOREGROUND** — the **fleet-reaper kills long background `node`/vitest processes** (3 background refreshes died exit-255/0-byte this session; foreground runs pass). Run the `VITEST_REPORT.json` refresh foreground, or coordinate golf to exempt it.
- **Crons/harnesses:** nightly `quoting-train-cycle`-style replan is the model; an echo post-gen nightly (regenerate + byte-equiv-diff the JM fleet vs golden, flag drift) is a high-value harness once Track-C lands.
- **Octopus/PSN:** feed each pass's outcome to `reference_*.md` → Obsidian → master-index (each-pass-feeds-next).

## 6. CRITICAL PATH (shortest route to a launch-credible JM post fleet)
1. **A1** (lathe baseline trio tests) → **B3** (lathe CIMCO + byte-equiv) — gives a *validated* lathe deliverable beside the Hurco mill.
2. **B1+B2** (Hurco baseline CIMCO + byte-equiv) — closes the "completed but not tested" gap on the named mill baseline.
3. **C1** (4 P0 routes) → **C2** (per-machine dual-track + byte-equiv) — full-fleet dual-track.
4. **A2** (remaining engine tests) in parallel via foxtrot/whiskey/echo fan-out.
5. **D** (closed-loop + safety) → **E** (MS-MASTERPOST, after U-LEGAL-13).

**Operator decisions required (operator-only forks):** (a) open `CIMCOEdit - H` foreground on VMC-01 for B1; (b) U-LEGAL-13 provenance sign-off for Track-E; (c) confirm LB3000 is a distinct JM machine vs the Multus B250II (the `.cps` names suggest two separate Okuma lathes).

---
_Authored by slot:echo (claude-48cc713a), 2026-06-24. Companion to ECHO-OPEN-TASKS-LEDGER.md (ROI-ordered open threads) + ECHO-FORGE-ROADMAP-2026-06-09.md (dependency-ordered finalization). Supersedes neither — this is the launch-framing synthesis with the dual-track JM post deliverable made explicit._
