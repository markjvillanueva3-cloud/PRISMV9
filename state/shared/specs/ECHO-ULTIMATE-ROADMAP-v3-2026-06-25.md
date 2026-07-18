# ECHO ULTIMATE POST-PROCESSOR ROADMAP v3 -- shipped-state reconciliation

> **Operator /goal (2026-06-25, slot:echo):** read all echo/post-processor chats+sessions+
> plans+roadmaps, compare to what is BUILT, plan the ultimate roadmap to build all remaining
> units, generate/modify BOTH tracks of every JM post (.cps + PRISM-routed), continue the JM
> fleet master posts, then fine-tune + validate via CIMCO block-by-block + simulator.
>
> v3 supersedes v2 (`ECHO-ULTIMATE-ROADMAP-v2-2026-06-24.md`) by RECONCILING it against state
> shipped since 2026-06-24. v1/v2 enumerated the tracks + the 15-machine matrix; v3 marks what
> is now DONE (so the loop does not rebuild it -- R12) and narrows the remaining set to the
> genuine gaps. **No re-mining** -- the 35 echo sessions are already synthesized
> (`galaxy-transcript-mining/post-processor/_SYNTHESIS.md`); re-running the miners adds nothing.

---

## 0. WHAT CHANGED SINCE v2 (the reconciliation -- verified live 2026-06-25)

| v2 item | v2 status | VERIFIED state today | Evidence |
|---|---|---|---|
| Track-A engine test coverage | IN PROGRESS | **COMPLETE** -- 603 tests in batches 3/4/5 + 515 earlier; all 11 remaining untested post engines now tested | ECHO-OPEN-TASKS-LEDGER "TRACK A COMPLETE 2026-06-25" |
| A1 lathe baseline trio (LB3000/Multus) | CRITICAL PATH | **CLOSED** -- `OkumaB250LatheMasterPostEngine` machine-aware (LB250II-M/LB3000/MULTUS-B250II) + 16 tests; `LathePostProcessor` 38 + `LathePostProcessorAI` 69 | commit `e6b72b9e69` · `reference_echo_lathe_machine_aware_2026_06_24` |
| 4 P0 machine-route gaps | OPEN | **3 of 4 CLOSED** in `master_post_by_machine` (camDispatcher.ts:7034): Haas (`HAAS/VF-/VF2`->HaasNGC), Okuma mill (OSP-P300M/P500M->OkumaOSPMill), Okuma lathe (LB3000/MULTUS machine-aware). **Only Roku-Roku + FA10S mis-route + EA sinker still open.** | camDispatcher.ts:7144-7162 (else-reject) |
| CIMCO closed-loop | operator-gated | **BOTH ARMS OPERATIONAL** -- Arm A static byte-equiv (`cimco-post-proof.mjs`, 9191 goldens compared, 240 drift); Arm B live sim all-15 sweep ran to completion (12 sim + 3 EDM); blockers 1+2 CLOSED. Remaining = FIDELITY wires (.mcfg load + known-bad NC + per-machine NC). | `CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md` |

**NEW this session (v3 enabler):** `scripts/post-block-audit.mjs` (+ 14 tests, + `/post-block-audit`
skill) -- the per-block annotated analyzer + modal-state FSM + golden-vocabulary cross-ref. The
operator's "fully analyze every single block" surface and the CIMCO precondition. Composes the
existing `lintNc`; validated on `JM DIE/CNC LATHE/9007405.MIN` (27 blocks, full lathe vocabulary).

---

## 1. CURRENT FLEET DUAL-TRACK STATE (15 JM machines, deduped)

Legend: CPS = registered `.cps` golden exists / PRISM = machine-specific MasterPost engine /
TESTED = R9 companion test / ROUTE = resolves in `master_post_by_machine` / CIMCO = byte-equiv +
sim validated (operator-gated).

| machine | controller | CPS | PRISM engine | TESTED | ROUTE | CIMCO |
|---|---|---|---|---|---|---|
| VMC-01 Hurco VM30i | WinMAX v10 | yes (`HURCO_VM30i_PRISM_v11`) | HurcoV11Mill | yes | yes | **NO <- "completed not tested" baseline** |
| VMC-02 Okuma M460V-5AX | OSP-P300MA | yes | OkumaOSPMill | yes | yes | NO |
| VMC-03 Haas VF-2 | **PRE-NGC** | yes | HaasNGCMill (**NGC**) | yes | yes (NGC) | NO -- **G3 dialect mismatch** |
| VMC-04 Haas OM-2 | **PRE-NGC** | yes | HaasNGCMill (**NGC**) | yes | yes (NGC) | NO -- **G3 dialect mismatch** |
| VMC-05 Roku-Roku HC 658-II | Fanuc 31i-B5 | yes | **NONE** | -- | **NO (else-reject)** | -- **G2 neither track** |
| LTH-06 Okuma LB3000 | OSP-P500 | yes | OkumaB250Lathe (P500 variant?) | yes (route) | yes | **NO -- lathe baseline** |
| LTH-07 Okuma Multus B250II | OSP-P300SA | yes | OkumaB250Lathe | yes | yes | **NO -- lathe baseline** |
| LTH-01..05 Okuma | OSP variants | yes | OkumaB250Lathe (per-model audit) | partial | yes (alias) | NO |
| EDM-01/02 Mitsubishi EA12S/D | sinker FP80S/C30EA | yes | **gap** (PPSinkerEDM generic) | -- | **NO** | -- **G2 sinker** |
| WEDM-01 Mitsubishi FA10S | W31MV-2 | yes | **MV1200R = WRONG MODEL** | (MV1200R) | mis-route | -- **G2 FA10S** |

---

## 2. THE GENUINE REMAINING SET (dependency-ordered, deterministic loss functions)

### AUTONOMOUS (buildable now -- no operator, no CIMCO GUI)

- **U-PP-BLOCK-AUDIT [DONE 2026-06-25]** -- `post-block-audit.mjs` + 14 tests + `/post-block-audit`.
  Loss: `node scripts/post-block-audit.test.mjs` green (14/14). DONE.
- **U-PP-ROKUROKU-ENGINE (G2) [DONE 2026-06-25 `4259b15e63`]** -- VMC-05 was the ONLY neither-track
  machine. Shipped `RokuRokuFanuc31iMillMasterPostEngine` (clone of HaasNGC + 5 Fanuc-31i deltas) +
  14 R9 tests (caught an XNaN safety bug) + wired into `master_post_by_machine` (ROKU/HC 658 branch) +
  LIVE block-audit (39 blocks, 0 ERR, clean Fanuc-31i vocab) + 2-arm scrutiny PASS. The verify-before-
  build check resolved the foxtrot "non-gap" (PP-FANUC-5AX-001 is a registry DESCRIPTOR, not a
  generation engine). [[reference_echo_rokuroku_engine_2026_06_25]].
- **U-PP-FA10S-WIRE (G2)** -- FA10S routes to MV1200R (wrong dialect, W31MV-2 != M700/M800). Build
  `MitsubishiFA10SWireEDMMasterPostEngine` OR add a W31MV-2 dialect profile to the existing WEDM
  engine; route `FA10S`/`W31MV` before the generic MITSUBISHI branch. Loss: FA10S model resolves to
  the FA10S profile (not MV1200R) + emit block-audit vs `PRISM-Master-Mitsubishi-FA10S-WEDM.cps`.
- **U-PP-EA-SINKER (G2)** -- EA12S/EA12D have no machine-route. Add an EA-family branch ->
  `PPSinkerEDMPostEngine` (FP80S + C30EA-2 profiles). Loss: EA model resolves + tested.
- **U-PP-HAAS-PRENGC (G3) [CLOSED-BY-VERIFICATION 2026-06-25]** -- read the engine body (not its
  "NGC" name): `HaasNGCMillMasterPostEngine` covers "Next-Gen-Control + classic" and emits **NO G187
  by default** (`use_g187` opt-in, NGC-only -- header line 19-21: "real older JM programs emit no
  G187"). No other NGC-only codes (G234/G253/G254/M130) appear; canned cycles are universal ISO. So
  VMC-03/04 (PRE-NGC) routed with DEFAULT config already emit correct PRE-NGC G-code -- the v2 "G3
  mismatch" was a title-based false alarm ([[feedback_read_full_content_not_titles]]). RESIDUAL
  (optional hardening, NOT a defect): a caller passing `use_g187:true` to a PRE-NGC machine would
  emit G187 -- a caller responsibility. Defense-in-depth = force `use_g187:false` only when the model
  string explicitly carries "PRE-NGC" (do NOT blanket-force on "VF-2" -- an NGC VF-2 exists elsewhere).
- **U-PP-LATHE-PERMODEL-AUDIT** -- audit `LatheMasterPostRouterEngine` per-model routing for the 5
  uncovered OSP variants (P200LA, U10L, P500 big-bore, P300LA-E). Loss: each emits its correct OSP
  header + the right canned-cycle set; fork/adapt ONLY where divergence is proven (R8 -- audit first).
- **U-PP-OUTCOME-EMIT-P6 (G5)** -- auto-call `pp_outcome_emit` in `PostProcessorPipelineEngine` P6
  (dispatcher action wired `0777fda9d2`; in-pipeline auto-call still missing). Loss: round-trip E2E
  (post-gen -> OutcomeCaptureBus, domain:"post_processor").
- **U-PP-ALARMDB-FULL (G5)** -- extend P5 Stage-5.1b coverage to the full 2,588-entry
  `controller-alarm-database.json` (not just AlarmRegistry's master set). Loss: coverage count == 2,588.
- **U-PP-GOLDEN-NC-CRON (D/harness)** -- nightly harness: regen each JM machine's Track-PRISM emit,
  block-audit + byte-equiv vs golden, flag drift (mirrors `quoting-train-cycle`). Loss: cron registered;
  a planted drift fails the run.
- **U-PP-BACKPLOT-3OF3 (D4)** -- 3-of-3 scrutiny on the `U-PP-BACKPLOT-G0NORM` safety fix (deferred).

### OPERATOR-GATED (no autonomous path)

- **U-CIMCO-BASELINE-SIM** -- open `CIMCOEdit - H` (`H:/CIMCO 2026/CIMCOEdit/CIMCOEdit.exe`) on the 3
  baselines (Hurco VM30i, LB3000, Multus B250II), load the `.mcfg` machine, run the sim against a
  known production NC + a known-BAD over-travel NC. Loss: CIMCO report verdict (clean on good NC,
  FAILS on over-travel NC -- proves the loop catches problems) + byte-equiv ratio.
- **U-LEGAL-13** -- public-manuals-only provenance sign-off before any post ships to a PHYSICAL
  machine and before MS-MASTERPOST (saleable) un-darks the ~14 AGI-tier engines.

---

## 3. ORCHESTRATION (use the stack where it adds value -- not re-mining)

- **Workflow fan-out (ultracode):** the 4 per-machine engine gaps (Roku-Roku / FA10S / EA-sinker /
  Haas-PRE-NGC) are independent and PARALLELIZABLE -- a Workflow that builds each + a reviewer arm
  per engine is the right use of parallel agents. CAVEAT: dialect codes are safety-critical and the
  echo soul REFUSES inline dialect constants -- the builder agents must source from
  `controller-knowledge.json`, and a physics/dialect reviewer arm must verify each emit. Block-audit
  (this session) is the cross-track parity gate every fan-out arm runs.
- **Ollama / Hermes (mechanical):** `.cps` structure summaries, dialect diffs, test-scaffold -> local
  lane (`ask-ollama.mjs` / `ask-hermes.mjs`). NEVER route canonical dialect/feed-speed values to Ollama.
- **Cron:** the nightly golden-NC drift harness (U-PP-GOLDEN-NC-CRON) once Track-C engines land.
- **PSN:** each pass writes `reference_echo_*.md` -> Obsidian -> master-index (each-pass-feeds-next).

## 4. CRITICAL PATH
1. **[DONE]** block-audit (the per-block + parity gate that validates everything downstream).
2. **U-PP-ROKUROKU-ENGINE** -- closes the last neither-track machine (highest single-machine value).
3. **U-PP-FA10S-WIRE + U-PP-EA-SINKER + U-PP-HAAS-PRENGC** -- close the 3 remaining route/dialect gaps
   (Workflow fan-out). After this, all 15 machines have both tracks routed.
4. **U-CIMCO-BASELINE-SIM** (operator) -- the 3 baselines block-by-block + simulator.
5. **U-PP-GOLDEN-NC-CRON + U-PP-OUTCOME-EMIT-P6 + U-PP-ALARMDB-FULL** -- closed-loop hardening.
6. **U-LEGAL-13 -> MS-MASTERPOST** (saleable, last).

## 5. OPERATOR DECISIONS REQUIRED (operator-only forks)
- (a) Open `CIMCOEdit - H` foreground on the 3 baseline machines for U-CIMCO-BASELINE-SIM (and
  provide one known-BAD over-travel NC per machine so the sim arm proves it catches collisions).
- (b) U-LEGAL-13 provenance sign-off before any post reaches a physical machine / MS-MASTERPOST publish.
- (c) Authorize the per-machine Workflow fan-out (4 new safety-critical dialect engines) -- or have
  echo build them serially with per-engine dialect-reviewer scrutiny.

---
_Authored 2026-06-25 by slot:echo (claude-70f0402c). Companion to ECHO-OPEN-TASKS-LEDGER.md (ROI-ordered)
+ v2 (15-machine matrix) + CIMCO-CLOSED-LOOP-STATUS. Supersedes v2's gap set with verified shipped-state._
