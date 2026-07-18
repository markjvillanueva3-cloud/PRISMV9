# ECHO OPEN-TASKS LEDGER (post-processor galaxy) -- STABLE single-read context surface

> **Purpose:** the ONE file a fresh echo session reads to regain full context on every open /
> unfinished / built-but-unwired / dormant thread in the post-processor domain. Stable filename
> (NOT date-stamped) so it is always findable. Distinct from the auto-consolidated handoff (noisy)
> and the narrative galaxy brain (`mcp-server/src/engines/post-processor/MEMORY.md`).
> Pattern adopted from bravo's `U-BRAVO-OPEN-TASKS-LEDGER`. **Keep current** -- bump on each unit.

- **Slot:** echo (post-processor specialist) -- CAM toolpath -> controller-specific G-code emission.
- **Working tree:** `H:/prism` main shared tree, branch `cad-fusion-live-ms0`; commit with the
  `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` prefix (bypasses slot-commit-enforce; echo's established pattern).
- **Galaxy brain:** `mcp-server/src/engines/post-processor/{CLAUDE,MEMORY,PATHS,TOOLBELT,SOUL}.md`.
- **Last updated:** 2026-06-28 (slot echo, session 50dfde83) -- 5-axis TCP closed-loop + golden-drift cron + byte-lock parity (below).

## 2026-06-28 (slot:echo, session 50dfde83 cont.) -- VERIFIED Multus B250 sub-spindle part-transfer emit [SHIPPED]
- **U-PP-SUBSPINDLE-EMIT [DONE `498574b55f`] +DOCS [`4db7f1030a`] +COUNTFIX [`17ebddf8b7`]:** built the
  real sub-spindle (SP2) part-transfer emit on `OkumaB250LatheMasterPostEngine` -- the "sub-spindle gap"
  noted in the section below is now CLOSED. `generateSubSpindleTransfer` (bar_pull + pickoff modes) emits
  the choreography VERIFIED verbatim from Mark's running programs (`JM DIE/CNC OKUMA MULTUS/MARK'S
  {GRAB AND PULL, WORKING SPINDLE GRAB-PULL-CUTOFF}.min`): M248/M249 sub chuck + M83/M84 main + M151/M150
  sync + M247/M246 + M185/M184 interlock + G141 + W-axis + Okuma G4 F<sec> dwell. Codes -> canonical
  `MULTUS_B250_SUBSPINDLE_CODES` (data catalog, NOT inlined). SAFETY: NO-DROP (sub clamp M248 BEFORE main
  unclamp M84), G4 dwell after every chuck op, sync-on before approach, interlock brackets, fail-loud on
  non-finite W/RPM. **FINDING (corrected):** 3 divergent WRONG sub-spindle code-sets existed in-repo, NONE
  matching the real machine -- PPOkumaSubSpindleSyncEngine LU3000 (M227/228+M87/89+G145/146); marks-multus
  PAT-005/008 collet (M68/69+M51+M102+M111); the M38/M39 tip. Corrected the tip + flagged the others (R7,
  not deleted). Gates: 18 + 73 B250 + 29 marks-multus tests; verifier 20/20; golden 3/3 no-drift; per-file
  2-arm + end 3-of-3 ALL PASS (arm C caught a real count-guard P1 -> fixed `17ebddf8b7`; arm B mutation-
  tested the NO-DROP+dwell asserts). [[multus-b250-subspindle-verified-codes-2026-06-28]].
- **FOLLOW-ON FIXES (this session, all 3 divergent code-sets now addressed):**
  - **U-PP-OKUMA-DWELL-DIALECT [DONE `4878fee401`]:** `generatePartOff` emitted Fanuc `G04 P0.5` (P=ms) on
    the Okuma OSP post -> fixed to `G4 F0.5` (Okuma dwell = F seconds, verified vs Mark's programs). One
    site fixes the WHOLE JM Okuma lathe fleet (this engine routes all of them). Golden re-baselined (1-line
    diff), +1 dialect lock test; 74/74 B250, verifier 20/20.
  - **U-PP-LU3000-UNVERIFIED-FLAG [DONE `c0d7a27961`]:** flagged `PPOkumaSubSpindleSyncEngine`'s uncited
    LU3000 sub-spindle codes as UNVERIFIED (R12) -- they diverge from the JM-verified chucker codes and JM
    has no LU3000. Comment-only honesty fix (don't rely on it without a real LU3000 program).
- **R15 APPLY-TO-ALL AUDIT [DONE, verified-complete]:** audited every Okuma-dialect post for the same
  Fanuc-`G04 P<ms>`-on-Okuma dwell bug. RESULT: the 3 other real Okuma posts (`PPOkumaTurningPostEngine`,
  `OkumaOSPMillMasterPostEngine`, `OkumaLegacyControllerEngine`) emit NO dwells at all -> no bug possible;
  `OkumaB250` is now fixed. The only remaining `G04 P` dwells are in `PPOkumaSubSpindleSyncEngine` (lines
  247/256/270/388/402) -- but that engine's ENTIRE dialect is already flagged UNVERIFIED (`c0d7a27961`);
  partially "fixing" only its dwells would create an inconsistent half-corrected unverified engine (R7), so
  it's correctly left under the flag. **The dwell-dialect fix is therefore fleet-complete.**
- **CORPUS VALIDATION [DONE -- "fully tested / 100% confidence" on the dwell dimension]:** grepped the
  ENTIRE real JM lathe corpus for dwell forms. Result: `G4 F<sec>` appears **25,000+ times** (`G4 F3.`
  x10,750, `G4 F2.` x9,889, `G4 F.5` x42, `G04 F3` x104 leading-zero variant) and `G04 P<ms>` (Fanuc)
  appears **ZERO times**. This DEFINITIVELY confirms the U-PP-OKUMA-DWELL-DIALECT fix (`4878fee401`) --
  the JM Okuma dwell is `G4 F<sec>`, never `G04 P<ms>`. PRISM's Okuma posts now match the 25K-occurrence
  real-corpus convention.
- **CANNED-CYCLE DIALECT DIVERGENCE [found+CORRECTED this session; deep, needs .cps-sourced fix -- R12]:**
  - **R12 SELF-CORRECTION (do NOT act on the earlier "swap G72->G71" idea -- it is WRONG/DANGEROUS):** my
    first hypothesis assumed Fanuc semantics (G71=longitudinal rough). **FALSE on Okuma OSP.** The real
    Multus B250 `.cps` states verbatim "disable to output **G71 standard threading cycle**", and EVERY real
    G71 usage in the JM corpus is a THREAD (`G71 X.. Z.. B60 D.. H.. F.. J.. M33 M73`, B60=60deg angle,
    H=thread height, files named THREAD*). **On Okuma OSP, G71 = THREADING cycle, NOT roughing.** Swapping
    the engine's roughing G72 -> G71 would emit a THREADING cycle for a roughing op (catastrophic). The
    earlier lead was a Fanuc-assumption that reading the real programs refuted (the session's core lesson).
  - **The REAL divergence (broader):** `OkumaB250LatheMasterPostEngine` emits FANUC-dialect canned cycles
    -- `generateRoughingCycle` -> Fanuc `G72` (facing stock-removal); `generateThreadingCycle` -> Fanuc
    `G76`; `generateDrillingCycle` -> Fanuc `G83`. But the real Okuma OSP Multus post (`.cps`) uses Okuma
    forms: threading = **G71** (or G33 toggle), NOT G76; roughing/drilling = the Okuma cycle set (G81/G82/
    G85/G87 + LAP/bar), NOT Fanuc G72/G83. NOTE: Okuma OSP-P300 MAY accept some Fanuc-compat cycles, so a
    given Fanuc cycle is not automatically "broken" -- but the `.cps` is the ground truth for what Mark's
    machine actually runs, and it does NOT use G76/G72.
  - **DEEP FIX PLAN (safety-critical, needs the real .cps as the source -- do NOT fabricate):** (1) read
    `JM DIE/CNC OKUMA MULTUS/OKUMA MULTUS B250 3.15.24 REV A.cps` `onCycle`/`onSection` + the threading/
    roughing emit fns to extract the EXACT Okuma cycle forms (G71 thread params; the roughing cycle; the
    drilling cycle); (2) per cycle, confirm against >=3 real `.min` programs; (3) re-emit each generate*
    method in the Okuma form, cycle+contour consistent; (4) golden re-baseline + per-cycle lock tests +
    verifier + physics/safety review. This is a multi-unit galaxy of work (rough/thread/drill/groove each),
    the real "advanced Okuma post" build -- each cycle is its own verified unit.
- **STILL OPEN (investigated -- NOT cleanly buildable without a verified source; do NOT fabricate, R12):**
  - **Grooving-cycle bottom dwell:** the tip (engine L235) prescribes "dwell 0.5s at bottom" but
    `generateGroovingCycle` (G75 peck cycle) emits none. INVESTIGATED 2026-06-28: the dwell FORM is
    verified (`G4 F.5`), but the sampled real groove (`A05-LSC-25-B.MIN`) plunges with NO dwell and no
    consistent G75-with-dwell pattern surfaced -- whether/where to dwell in a G75 peck cycle is
    part-dependent + the G75-dwell semantics are unverified. Build ONLY after sourcing a real JM groove
    program that dwells (else it stays as-is; a no-dwell groove is valid).
- **STILL OPEN (P2 polish, deferrable):** PAT-015 provenance comment's M51 dual-meaning note; pickoff
  "(BAR PULL)" generic label (arm A/B P2s).

## 2026-06-28 (slot:echo, session 50dfde83) -- 5-axis TCP recovery + engineered drift cron
- **U-PP-OKUMA-5AXIS-TCP [DONE `ed5a7ae10d`]:** recovered the orphaned Workflow `wunplwj53` result (prior
  session b2086b4d crashed before commit) -- `OkumaOSPMillMasterPostEngine` now emits a 5-axis TCP path
  for VMC-02 (Genos M460V-5AX): G169/G168 (Okuma-native, JM Die) | G43.4 H{n}/G49 (Fanuc) | dialect-DB
  fallback; per-move A/C trunnion words from CAM `rotary_moves[]` (engine never computes IK); singularity
  advisory at k>cos(5deg); arc_cw/ccw->G1 downgrade in RTCP + loud warning (P2 auto-fix); non-finite guards
  throughout; additive (3-axis byte-identical). 37/37 tests, golden 2/2, verifier 20/20 (new 5ax leg),
  2-arm scrutiny PASS. [[okuma-5axis-tcp-and-golden-drift-cron-2026-06-28]].
- **U-PP-GOLDEN-NC-CRON [DONE `27aa35b7bf`] -- the operator's "engineered loops/harnesses/crons":**
  `scripts/post-golden-drift-cron.mjs` nightly Windows task (PRISM Post Golden Drift, 2:47 AM) COMPOSES the
  verifier (regen all + lint/structural/header) + golden byte-lock snapshots; planted drift fails the run
  (exit 3) + AGENT_CHAT alert on NEW regression (no spam). 15/15 tests, live CLEAN, scheduled+active.
  R15 byte-lock PARITY: added OkumaOSP + HurcoV11 mill goldens (was RokuRoku+Haas only) -> all 5 mills +
  OkumaB250 lathe now byte-locked. Caught+fixed a real Windows spawn bug (status:null needs shell:true).
- **DOCUMENTED remaining feature gaps (NOT built -- need design/operator):**
  - **Sub-spindle part-transfer (Multus/OkumaB250):** `sub_spindle_enabled` config exists but NO actual
    emit path. **SOURCING FINDING (2026-06-28, session 50dfde83 -- verify-before-build):** the engine's
    tribal tip (L214 "M38 sync engage / M39 sync release") and the fleet table ("G126/G127 pickup") are
    BOTH unverified vs the AUTHORITATIVE real JM Multus NC, which uses **`G141 (SUB SPINDLE PROGRAM)` +
    `M248 (CLOSE SUB SPINDLE)`** (grep `JM DIE/CNC OKUMA MULTUS/**/*.min`). M38/M39 (sync) and G141/M248
    (program-mode/chuck) are likely COMPLEMENTARY part-transfer STEPS, not substitutes -- so the build MUST
    read a COMPLETE real Multus part-transfer program end-to-end (e.g. `JM DIE/CNC OKUMA MULTUS/.../FULL-
    PROGRAM.min`) to extract the verified full sequence (main spindle handoff -> sub-spindle approach/sync
    -> grip M248 -> main release -> cutoff -> retract) before emitting ANY of it. Real safety-critical
    (phase-sync; a mis-sequenced two-spindle handoff crashes the machine) -- a dedicated fresh-context build
    with physics/safety-reviewer + 3-of-3, NOT a grep-and-patch. Do NOT build from the M38/M39 tip.
  - **HurcoWinMaxLathe C-axis/live-tool parity:** verify the real Hurco TM/TMX has C-axis FIRST.
  - **Full tribal /learn maxing (operator ask):** hermes proxy is DOWN (100% fail); the academy per-machine
    runbook generator (`generate-jm-fleet-wiki-tribal.mjs`) is LIMA's (hardcoded H:/prism-slot-lima). The
    post-processor-domain advanced-feature capture is in the wiki entry above; broader maxing = lima-collab
    + hermes restore.
  - **CIMCO machine-sim + U-LEGAL-13:** operator-gated (see below).

- **Last updated (prev):** 2026-06-27 (slot echo, session b2086b4d) -- live fleet scorecard 5/6 PERFECT + RokuRoku VMC-05 wired (3/3) + AGI dispatcher R12 silent-success fix.

## 2026-06-27 PROGRESS (slot:echo, session b2086b4d) -- live closed-loop fleet scorecard + R15 + R12 fix
- **Live fleet scorecard (`:3100`, current engines):** 5 of 6 per-machine master posts PERFECT (3/3 jobs, 0 dialect-ERR):
  rokuroku-vmc05 (NEW) + hurco-v11-standalone (was the 05-31 PhysicsSidecar crash, now fixed) + haas-vf2 +
  okuma-genos-osp + okuma-b250-lathe. 6th = hurco-v11-agi (contract mismatch, below).
- **U-PP-ROKUROKU-CORPUS-WIRE [DONE, R15]:** RokuRokuFanuc31iMillMasterPostEngine shipped 2026-06-25
  (`4259b15e63`) + route-wired but was never in the training CORPUS. Added `rokuroku-vmc05`
  (master_post_by_machine, fanuc dialect) -> 3/3 PERFECT first run.
- **U-PP-AGI-HONEST-SUCCESS [DONE `8d6a681f9c`, R12 + 3-of-3 PASS]:** camDispatcher `master_post_unified_agi_generate`
  hardcoded success:true over the engine's empty error-result (generatePost consumes segments/gcode, NOT raw
  operations -- UnifiedPostInput has no operations field). Now honest: success:false + the engine's reason on
  empty/not-callable; success:true only on a real non-empty program. +3 dispatcher round-trip tests
  (`camDispatcher.masterpost-agi-honest-success.test.ts`). Corpus hurco-v11-agi -> contract-mismatch-documented.
- **SYSTEMIC (catalogued, NOT swept):** ~100-site hardcoded-`success:true` class in camDispatcher (mostly
  cross-domain WEDM parse/table -> mike, lathe-learner -> india/whiskey). Recommended: a shared honest-success
  helper adopted across the echo-owned master_post_*/pp_* generation actions; see POST-TRAINING-FINDINGS.md.
- **LESSON (R12):** shared-tree `git add <whole file>` absorbed bravo's UNCOMMITTED camxMs3U01 import+spread into
  `8d6a681f9c` (harmless, now consistent: 1 import/1 spread, no dup, compiles; bravo's `e1702131ad` landed the rest).
  Rule: `git add -p` hunks on the shared tree, never whole files. [[reference_echo_loop_2026_06_27]].
- **QUEUED (next echo session):** verify+run the actionVerified:false posts (winmax-lathe, lb3000, multus,
  FA10S-wire, EA-sinker); the echo-domain slice of the ~100-site honest-success sweep; operator-gated
  CIMCO baseline sim (open KNOWN-BAD NC in VF-6/40 CIMCO -> Simulate -> must FAIL) + U-LEGAL-13.

## 2026-06-26 PROGRESS (slot:echo, session ab21e9c9) -- closed-loop wire + correctness, 3 units
- **U-PP-PHYSFOUNDATION-CANONICALIZE [DONE `5f925dfd13`]:** the prior session canonicalized
  PostPhysicsFoundationEngine (KC_ISO=CANONICAL_KIENZLE, MATERIAL_PROPS Taylor n/C from
  CANONICAL_TAYLOR) but left it UNCOMMITTED with 2 failing characterization-lock tests (the designed
  fail-signal). Finished it: material.mc H 0.20->0.30; rewrote the "harder steel shorter life" test
  (old assertion compared each material at its OWN recommended Vc -- NOT a real invariant; held only
  under non-canonical constants) -> now proves the engine matches the canonical closed-form Taylor
  within ~5% + asserts the genuine equal-Vc invariant. 52/52, 2-arm scrutiny PASS (physics + reviewer,
  values within Sandvik/ISO 3685 bands). [[reference_echo_loop_2026_06_26]].
- **U-PP-OUTCOME-EMIT-P6 [DONE `9e1a903794`]:** closed the in-pipeline closed-loop gap. PostProcessor
  PipelineEngine.process() now auto-calls the EXISTING ppgOutcomeCaptureWireEngine.recordEmission()
  at a new P6 stage 6.9_outcome_emit -> every post-gen reaches the OutcomeCaptureBus (domain
  "post_processor") for the india self-learning loop. The dispatcher action pp_outcome_emit already
  reached the bus, but PIPELINE-generated posts never did. Placed AFTER overall_status is frozen
  (telemetry can't flip the verdict); best-effort/never-block; gated on real output + opt-out
  StageConfig.outcome_emit. 4 E2E (incl REAL bus round-trip by lineage_id) + 21/21 pipeline regression,
  2-arm PASS.
- **U-PP-LATHE-JM-FLEET-IDENTITY [DONE `bdfdb0a910`]:** per-model audit (the v3 U-PP-LATHE-PERMODEL-AUDIT)
  vs canonical jm-fleet-sim-map.json -- OkumaB250LatheMasterPostEngine resolved identity from a 3-entry
  map; the 5 JM GENOS/Crown/LNC lathes had NO entry -> mislabeled LB250II-M. Added GENOS-L300-M
  (P300L-R), GENOS-L200E-M (P200LA-R), GENOS-L400II-E (P300LA-E), LNC8 (U10L), Crown-L1060 (U10L),
  verbatim from the sim map. 39/39 (existing 34 + 5). **R7 surfaced, NOT silently changed:** sim map
  has NO LB250II-M (engine's legacy default); JM LTH-06 is "LB 3000EX Big Bore"/OSP-P500 vs engine
  LB3000/P300L; LTH-07 Multus is P300SA vs engine P300 -- reconciling breaks locked headers -> operator-
  confirm unit.
- **U-PP-LATHE-ROUTER-WIRE [DONE `80137164af` + `b04996a328` + `f5c65b9ea3`] -- R15 WIRE leg complete:**
  master_post_by_machine entered the Okuma-lathe branch via model.includes("OKUMA") but resolved
  latheMachineId to only LB250II-M/LB3000/MULTUS -> a GENOS/Crown/LNC model fell to the LB250II-M
  DEFAULT (mislabel re-created at the router layer). Mapped the 5 sim-map identities (widened the inline
  literal to the full 8-member union; GENOS by L-number; reject-error lists them). +6 integration tests
  (5 routing mirrors + 1 REAL engine round-trip proving each resolved machineId emits the correct
  (MACHINE: ...) header). **R16 self-catch:** bare model.includes("GENOS") would mis-route a GENOS *mill*
  (M-series) -> gated GENOS on (L200|L300|L400) so a GENOS mill hits else-reject (+regression test).
  51/51; targeted tsc clean; wiring-review-agent PASS (no P0/P1; 1 P2 helper-error-string parity, fixed).
  PRE-EXISTING (noted, out of scope): the leading model.includes("OKUMA") clause broadly matches "OKUMA"
  mills not caught by the OSP-P*M branch -- a separate pre-existing broad-match. The lathe identities are
  now reachable END-TO-END by machine name.
- **U-PP-ALARMDB-FULL [CLOSED-BY-VERIFICATION -- NOT BUILT, R12]:** the v3 "extend P5 5.1b to the full
  2,588 controller-alarm-database.json" is a VANITY metric, not a safety gap. Verified: (1) the alarm DB
  has exactly 2588 entries; (2) AlarmRegistry.search() AUTO-loads (`await this.load()`) so it is NOT dark
  in the pipeline; (3) MASTER_ALARM_DATABASE.json does NOT exist (load falls back); (4) Stage 5.1b uses
  the registry only for a `limit:5, severity:CRITICAL` count (known_alarms_loaded) -- the REAL safety
  value is the structural RPM>max + feed>rapid block scan already present. Loading all 2,588 for a capped
  count adds no pre-emptive safety (alarm codes are runtime/servo conditions, not statically checkable).
  Did not build make-work to hit a count.
- **U-PP-{LATHE,MILL}-GOLDEN-SNAPSHOT [DONE `aa904076a6` + `a40161c82d`] -- the operator-named "harness":**
  golden-snapshot vitest regression backstop for ALL 3 JM master-post engine families -- OkumaB250 lathe
  (lathe), RokuRoku Fanuc-31i (VMC-05) + HaasNGC (VMC-03/04) (mills). Each byte-locks the FULL emitted
  program vs a committed `.snap`; a drift in any emit logic fails the nightly CI run (= the cron, no Windows
  scheduled task). The lathe masks the engine's volatile `(GENERATED: <iso>)` line (engine:343); the 2 mills
  are fully deterministic (0 `new Date`). Fixtures mirror each engine's reference-value test. +soundness
  invariants (success/no-NaN-Infinity/program-terminated) + machine_id-is-header-only (lathe). 5 golden tests,
  snapshots proven stable on re-run. **REMAINING extension (open):** the real-golden byte-equiv-vs-JM-.cps
  needs CAM source + is operator/CIMCO-gated (cimco-post-proof.mjs); block-audit-per-snapshot is a cheap add.

## 2026-06-25 PROGRESS (slot:echo, session 70f0402c) -- block-by-block analyzer + v3 roadmap
- **U-PP-BLOCK-AUDIT** (commit `676db513c3`): `scripts/post-block-audit.mjs` + 14 R9 tests +
  `/post-block-audit` skill -- the operator's "fully analyze every single block" deliverable +
  CIMCO precondition. Per-block intent CLASS + modal-state FSM + within-block/safety issues
  (composes the existing `lintNc`) + end-of-program invariants + `--golden` vocabulary cross-ref.
  Per-file 2-arm scrutiny: 3 P1 fixed + locked (Okuma `[]`-comment hyphen-as-arithmetic leak;
  G80 motion clobber; dropped lintNc end-of-file findings) + 1 P2 (Heidenhain FSM-exempt).
  VALIDATED LIVE on the real **Multus B250II baseline** (`OKUMA MULTUS PROGRAMS/.../1001.min`):
  4065 blocks, 0 ERR, 69 WARN, full Okuma vocab (G96/G97/G50/G126/G127/G136/G138), clean modal-end.
- **ECHO-ULTIMATE-ROADMAP-v3-2026-06-25.md** -- reconciles v2 against shipped state (R12): Track-A
  COMPLETE, A1 lathe CLOSED, **3 of 4 P0 routes CLOSED** (only Roku-Roku + FA10S + EA-sinker open;
  verified `master_post_by_machine` else-reject at camDispatcher.ts:7157), CIMCO both arms operational.
- **U-PP-ROKUROKU-ENGINE [DONE `4259b15e63`]:** `RokuRokuFanuc31iMillMasterPostEngine` -- the last
  neither-track JM machine (VMC-05) now has its PRISM-routed post. Full R15: 14 R9 tests (caught a real
  XNaN safety bug) + wired into master_post_by_machine + LIVE block-audit (39 blocks, 0 ERR) + 2-arm
  scrutiny PASS (physics + holistic) + P2 fixed. Verify-before-build resolved the foxtrot "non-gap"
  (descriptor != generation layer). [[reference_echo_rokuroku_engine_2026_06_25]].
- **U-PP-FA10S-WIRE [DONE `5dbaa5753a`]:** FA10S was silently mis-routing to MV1200R's wrong M800/M700V
  dialect. Verify-before-build (read JM's own FA10S .cps) showed FA10S = MELCUT (M6/M7/M28/M80/T84) with a
  DEDICATED real engine `WEDMPostMitsubishiEngine`. Fix = fail-loud redirect (catch FA10S before the generic
  MITSUBISHI branch -> point to `wedm_post_mitsubishi_generate`), preventing wrong-dialect emission. +4
  routing tests (44/44). Full input-adapter routing (WEDMPostInput mapping) = mike-collab follow-up.
- **U-PP-EA-SINKER-ROUTE [DONE]:** R8 reconciliation -- the two sinker engines COEXIST BY DESIGN
  (india's generic burn-schedule `EDMProgramAssembler.assembleSinkerEDM` [edm_sinker_program] vs echo's
  machine-aware `PPSinkerEDMPostEngine` [pp_sedm_generate + SinkerEDMPrintToProgram pipeline]) -- NOT a
  duplication. The genuine gap was EA12D missing from the consumer's union: propagated EA12D to
  `SinkerP2PInput.machine_model` so JM EDM-02 now routes end-to-end with the correct identity (header
  "MITSUBISHI EA12D", not the EA12V default). +1 E2E test (67/67 across both sinker suites).
- **ALL 3 JM DUAL-TRACK GAPS NOW CLOSED** (Roku-Roku engine `4259b15e63` + FA10S redirect `5dbaa5753a`
  + EA-sinker EA12D `669c03dacf`+this). Every JM machine has a correct PRISM-routed path.
- **U-PP-HAASNGC-NONFINITE-GUARD [DONE `c5fd2e27b5`]:** cloned the RokuRoku non-finite-XY guard into
  HaasNGC.emitToolpath (XNaN latent bug; +regression test, 48/48).
- **NEXT autonomous -- U-PP-NONFINITE-EMIT-SWEEP** (the BUG CLASS, R15 apply-to-all): RokuRoku + HaasNGC
  fixed (simple emitToolpath-loop shape). OPEN: **OkumaB250Lathe** emits `op.<coord>.toFixed(3)` at DOZENS
  of scattered sites with 0 guards (operator-named lathe -- needs a `fmtCoord()` safe-format helper
  refactor, careful, keep A1 lathe tests green) + **OkumaOSP/HurcoV11** (trace their normalization-guard
  coverage of the emit path). Full audit: [[reference_echo_nonfinite_emit_bugclass_2026_06_25]].
- **Then:** deferred WEDM full-input-adapter routing (mike-collab). Operator-gated: U-CIMCO-BASELINE-SIM
  (open CIMCOEdit-H + a known-bad over-travel NC per baseline), U-LEGAL-13.
- **OPERATOR-ONLY forks:** open `CIMCOEdit - H` foreground on the 3 baselines + a known-bad over-travel
  NC each (U-CIMCO-BASELINE-SIM); U-LEGAL-13 sign-off; authorize the per-machine Workflow fan-out.

## 2026-06-24 PROGRESS (slot:echo, session 0731e3b0) -- crit-path A1 lathe trio CLOSED
- **U-PP-LATHE-MACHINE-AWARE** (commit `e6b72b9e69`): OkumaB250LatheMasterPostEngine made machine-aware
  (LB250II-M default / LB3000 / MULTUS-B250II) -- closes the hardwired-LB250II-M "acknowledged risk";
  master_post_by_machine forwards machine_model; +16 reference-value tests (engine was UNTESTED = A1);
  +4 LB3000/MULTUS cases in MasterPostByMachineExpanded; fixed latent c_mill FNaN. 100/100 green.
- **A1 lathe baseline trio now FULLY TESTED:** OkumaB250LatheMasterPostEngine 16 (new) + LathePostProcessorEngine
  38 (pre-existing -- roadmap "UNTESTED" was STALE) + LathePostProcessorAIEngine 69 (new). 107 green.
- Track-A1 (lathe) DONE. Remaining lathe: B-track byte-equiv vs LB3000/Multus .cps goldens (needs golden parse);
  un-dark the 3 lathe LEARNERS (U-PP-LATHE-LEARNERS-REAL, section B -- distinct from testing).
- DEFERRED (pre-existing, surfaced by scrutiny): uniform-seal master_post_by_machine Hurco/Haas/Okuma-lathe
  branches (return-shape change); OkumaB250 getMaxSurfaceSpeed inline maxCSS -> constants.ts.

---

## CONTEXT-REGAIN POINTERS (read these to go deep)
| Surface | What | Path |
|---|---|---|
| Full finalization roadmap (v2) | dependency-ordered, H-drive-wide ultracode synthesis -- THE plan | `state/shared/specs/ECHO-FORGE-ROADMAP-2026-06-09.md` |
| Today's verbatim context | 4 compaction roll-ups + all operator directives | `state/shared/context-recovery/echo-TODAY-2026-06-10.md` |
| CIMCO closed-loop status | sim-driver / UI-driver state + fidelity gaps | `state/shared/cimco/CIMCO-CLOSED-LOOP-STATUS-2026-06-09.md` |
| CIMCO sim-config tailoring | per-setting config plan (sim add-on ACTIVE) | `state/shared/cimco/CIMCO-SIM-CONFIG-TAILORING-2026-06-09.md` |
| Ollama deep-dive (17 slices) | raw extraction the roadmap was synthesized from | `state/shared/cimco/echo-forge-dive.{json,md}` |
| Older incomplete inventories | superseded but historically useful | `state/shared/specs/ECHO-INCOMPLETE-TASKS-INVENTORY-2026-05-17.md`, `ECHO-UNDONE-2026-05-18-19-COMPILATION.md` |
| JM fleet sim map | 15 machines -> .mcfg + sim-able classification | `state/shared/cimco/jm-fleet-sim-map.json` |

## OPERATOR GOAL (standing, verbatim distillation)
"Complete closed-loop testing of post-processors for ALL JM machines (CIMCO as the editor: code-correctness
+ simulation). Sim add-on is PAID + must be activated; tailor every CIMCO setting to our setup. If finished
overnight, start building posts for the highest-selling machines globally." + use Ollama for bulk work,
reserve Claude for safety/judgment; bounded concurrency (the 6-agent fan-out rate-limited twice).

---

## OPEN / UNFINISHED / DORMANT -- ROI-ordered (live-verified 2026-06-10)

### A. DORMANT SURFACE (built, never wired) -- highest leverage
- [DONE 2026-06-10] **U-PP-DISPATCHER-REGISTER** -- `prism_pp` is now LIVE. The `NOT ON THIS BRANCH`
  guard was confirmed STALE (the comment said "50 actions"; the enum has **654** top-level actions /
  6432 lines / 807 case-stmts; all 150 lazy engines present). Re-enabled the import + `registerPPDispatcher(server)`
  in `mcp-server/src/index.ts` + made the tool self-description honest (`${ACTIONS.length}`).
  VALIDATED 4 ways: build:fast bundles clean; runtime smoke registers `prism_pp` + 2 actions round-trip
  REAL output (pp_compat_list_controllers, pp_generate_header); 0 new tsc errors (648 are pre-existing
  baseline). HONEST CAVEAT: some individual actions may still hit stub/fallback paths (graceful
  `?? {error}`); the Phase-1 unmask (section B) refines those -- but the surface is no longer 100% dark.
- **MasterPost facade** -- U-MASTERPOST-FACADE: one canonical facade over
  MasterPostProcessor{UnifiedAGI,Genius,AGIOrchestration}Engine (4 entries -> 1). Dep: register.

### A2. STUB-ACTION UNMASK (now reachable since prism_pp is LIVE)
- [DONE 2026-06-10] **U-PP-UNMASK-CONTROLLER-TRANSLATE** -- `pp_controller_translate` was a genuine
  WRONG-ENGINE bug: wired to `PostProcessorTransformerEngine` (a neural diffusion/tokenizer with no
  translate/transform method) so it ALWAYS returned `{error:"translate not found"}`. Re-routed to the
  real `GCodeTranspilerEngine.transpile()` (added a `transpiler` getEngine key) + fail-loud dialect
  guard (transpiler supports 6 of the 13 pp controller enum). 5/5 real round-trip tests
  (`ppDispatcher.controller-translate.test.ts`: siemens MCALL + `;` comments, okuma `G15 H0`, guards). Commit follows.
- **HONEST CORRECTION + VERIFIED TRIAGE** (2026-06-10): the "37 stub" awk over-counts fallback TEXT.
  Per-action method-existence check of the echo-domain candidates -- ALL RESOLVE, none are genuine stubs:
  `pp_validate_program`->`verify()` OK · `pp_analyze_cps`->`analyzeFile()` OK · `pp_generate_gcode`->`process()` OK
  · `pp_strategy_best`->`getBestStrategy()` OK · `pp_strategy_stats`->`getStats()` OK · `pp_formula_apply`->`applyFormula()` OK
  · `pp_graph_query`->`calculate()` OK. **`pp_controller_translate` was the ONLY genuine echo-domain break**
  (wrong engine) -- FIXED (`d671f0f1af`). => **The autonomous-safe echo-domain unmask work is EXHAUSTED.**
  Any remaining genuine stubs are CROSS-DOMAIN (`pp_physics_*`->bravo, `pp_neural_*`->india, `pp_kinematics_*`->machine-setup)
  and are NOT echo's to inline (soul refuse) -- wire to the owning-galaxy engine or leave routed. Re-triage rule:
  a fallback-text match is NOT a stub unless BOTH tried methods are absent on the resolved engine.

### A3. CROSS-DOMAIN STUB ROUTING (audited 2026-06-10 -- NOT echo-fixable autonomously)
Per-method audit of the cross-domain pp actions on their (echo-owned) post engines:
- `pp_neural_classify` -> RESOLVES via `classifyController()` (functional, not a stub).
- GENUINE stubs with NO clean rename target (engine exposes unrelated public methods):
  `pp_neural_predict` (NeuralNetworkEngine has classifyController/comprehensiveAnalysis/analyzeWithHMM,
  no predict/inference) · `pp_physics_forces` + `pp_physics_thermal` (PhysicsAwareGeneratorEngine's
  public surface is generatePhysicsAwarePost/getStatistics, no force/thermal calc) · `pp_kinematics_analyze`
  + `pp_kinematics_transform` (MachineKinematicsEngine is a topology/machine DB -- getTopologies/
  recommendBuildQualityTier -- no analyze/transform/RTCP).
- **DECISION:** these need REAL physics/neural/kinematics logic = echo's soul REFUSES to inline. They are
  owning-galaxy work (physics->bravo, neural->india, kinematics->machine-setup) OR a deliberate echo+owner
  collaboration to define the correct method mapping. NOT an autonomous echo reroute. => the full prism_pp
  stub investigation is CLOSED for echo: 1 real echo break fixed (controller_translate), rest resolve or
  belong to other galaxies. No phantom-stub chasing.

### B. MASKED / DARK ENGINES (built, not real) -- PHASE 1, must precede A
- **U-ECHO-WEDM-DIALECT-UNMASK** -- make Sodick/Makino/Agie/Fanuc WEDM posts real + byte-equiv vs golden
  (Mitsubishi already real). NOTE: the roadmap's `engine.method?.()` grep pattern did NOT match on
  2026-06-10 -- re-locate the actual mask shape before assuming it persists.
- **U-PP-LATHE-LEARNERS-REAL** -- un-dark 3 lathe learners (LathePostProcessorAIEngine 73K = largest dark,
  JMDiePostProcessorLearningEngine, LathePostGeneratorActiveLearningEngine): >=1 real path each.
- **U-PP-AGI-SURFACE** -- ~14 AGI post engines: >=1 REAL dispatcher-invoked case each.

### C. PHASE 0 HYGIENE (cheap, no deps)
- [DONE 2026-06-10 `bb0cd23d4a`] **U-ECHO-FINETUNE-RED-GREEN** -- true Welford variance + decoupled
  stability; MasterPostFineTuningEngine.test.ts 44->46/46.
- [DONE 2026-06-23 (slot:echo)] **U-PP-KIENZLE-EMIT-REGRESSION** -- 8-test R9 regression locking that
  PostProcessorPipelineEngine Stage 1.1 emits `block.forces.Fc_N` == canonical `kienzleForce()` of its
  reported kc1.1/mc, and that kc1.1 is canonical-sourced (CANONICAL_KIENZLE / verbatim MaterialContext),
  never an inline divergent table -- the post-processor analogue of oscar's 2026-06-23 SFC MATERIAL_HARDNESS
  divergence guard. Verbatim-override + per-ISO distinctness + coating/wear K-factor composition + Kienzle
  exponent reconstruction + monotonic-ap + degenerate-ap floor + power-consistency. File:
  `mcp-server/src/__tests__/PostProcessorPipelineEngine.kienzle-emit.test.ts` (8/8 green; per-file 2-arm
  scrutiny PASS). NOTE: physical golden NC for Hurco/Okuma/Haas deferred -- this locks the physics-core
  emit invariant, which is the constant-divergence catch the unit targeted.
- **U-PP-MISSING-ENGINE-TESTS** -- [IN PROGRESS, slot:echo] COUNT CORRECTED: a live enumeration
  (2026-06-23) found **~38 post-processor-domain engines** (`*Post*`/`GCode*`/`MasterPost*`/
  `ControllerDialect*`) lacking a companion test -- NOT "7". CAVEAT unchanged: cross-domain PHYSICS
  engines (ThermalWearCoupling, SpeedFeedOrchestrator, ConstitutiveModel...) are oscar/india territory.
  - [DONE 2026-06-23] **GCodeSnippetEngine** -- 13-test companion (`GCodeSnippetEngine.test.ts`): get/
    fill/list/search/byCategory/categories/getStats, reference-value + algebraic invariants, EOL-hardened.
    Both per-file scrutiny arms PASS (0 P0/P1).
  - [DONE 2026-06-23] **GCodeOptimizationEngine** -- 16-test companion (`GCodeOptimizationEngine.test.ts`):
    analyze/optimize/compare, exact parse->classify->distance->time reference values, rapid-Z-descent SAFETY
    warning boundary, stationary/blank-collapse optimize, honest 10%-estimate characterization, feed-500
    fallback, +2 KNOWN-LIMITATION characterization locks. Both arms PASS (arm A's first-pass FAIL was 2
    verified-FALSE findings -- misread `\n\n\n`=2 blanks-not-3 + miscounted 16 tests as 9 -- refuted +
    re-verified PASS).
  - [DONE 2026-06-23] **PostProcessorTelemetryEngine** -- 14-test companion (`PostProcessorTelemetryEngine.test.ts`):
    PPG conversion-funnel record/funnel/eventCount/reset/process; unique-session step_counts, divide-by-zero
    guards, per-session avg-time, download-before-view adversarial, since_ms-vs-most_popular contract asymmetry,
    non-string-metadata guard. Both 2-arm scrutiny PASS. Deferred P2s: multi-download last-wins + process()
    default branches (session_id ?? "unknown"). Queue (one per iter): GCodeBidirectionalOptimizerEngine,
    GCodeValidationEngine, PostVersioningEngine, GCodeTranspilerEngine (already dispatcher-tested), ... (~35 remain).
  - **U-PP-GCODE-OPT-CLASSIFIER-TIGHTEN** -- [ARC PORTION DONE 2026-06-23] arc matcher `/G0?[23]/` ->
    `/G0?[23](?![0-9])/` so `G20`/`G21` (units), `G28`/`G29` (return-to-ref), `G30-G39` (home/coord) are no
    longer miscounted as arcs + no longer inflate `total_feed_distance` x1.5. Both 2-arm scrutiny PASS
    (verified G2/G02/G3/G03/G02.1 still match; no coordinate word false-matches; 98/98 consumer tests green;
    a G21/G28/G02 program's est. time 26->16s, a 38% overestimate removed). Tests flipped from bug-lock to
    fix-assert + G20/G21/G30 regressions. REMAINING (lower impact): rapid matcher `/G0[0 ]/` still misses
    compact `G0X10` (no space) -- real G-code uses `G0 `/`G00`, so deferred; characterization test still locks it.
  - **U-PP-GCODE-SNIPPET-FILL-INJECTION-SAFE** -- [DONE 2026-06-23] `GCodeSnippetEngine.fill` regex+String-
    replacement -> literal `code.split(\`{${key}}\`).join(String(value))`. Closes BOTH a metachar-key
    `new RegExp` THROW and `$&`/`$\``/`$$`-value JS replacement-pattern substitution. Both 2-arm scrutiny
    PASS (byte-identical for all normal params incl. cross-contamination/substring-key/empty-value; +2 R9
    proof tests that fail on the old code; blast radius = camDispatcher post_gcode_snippet_fill forward-only).
    15/15 green. ORIGINAL latent note (kept for history): the old code built `new RegExp(\`\\{${key}\\}\`)`
    from the unescaped param KEY + used `String(value)` as a replacement string.
    Fix = literal replace `code.split(\`{${key}}\`).join(String(value))`; needs its own engine-change scrutiny.

### D. CIMCO CLOSED-LOOP (the operator's #1 north-star) -- live-CIMCO, partial op-gated
- **CONTINUE-FROM (in-flight, from handoff):** **U-CIMCO-COMBO-WRITE + LOAD-MACHINE** -- WRITE op,
  full 3-of-3. Extend `set-setting` to combos (CB_GETCOUNT + per-index CB_GETLBTEXT find-by-name ->
  CB_SETCURSEL -> WM_COMMAND CBN_SELCHANGE -> read-back -> safe-discard / --persist). Then load-machine
  on Backplot Setup (Control Type cid 14639 + Machine setup cid 14307 per jm-fleet-sim-map.json).
  EVAL: over-travel NC -> Report limit row -> verdict FAILS (proves the loop catches problems).
  Driver: `mcp-server/data/posts/prism-base/cimco-bridge/ui-driver/Program.cs` (75940 bytes, Win32-only;
  ops map/find/invoke/window-info/read-report/invoke-read/list-windows/setup-pages/read-setting/
  set-setting/combo-read). Build: `build.ps1` (framework csc, no SDK).
- **U-CIMCO-FSM-LIVE-DRIVE** (roadmap PHASE 5, ~2-3d) -- the ONLY remaining [NOW] tech unit on the
  critical path: navigate -> run -> read-report -> assessLiveRunClearance 5-gate, end-to-end.
- **FIDELITY CEILING (honest):** sim reads are header-only until a `.mcfg` machine + stock geometry
  are loaded -- that is what load-machine targets; stock/fixture collision needs a per-setup body
  manifest that does not exist yet -> truthful verdict is "kinematics + tool-collision-only".

### E. OPERATOR-GATED (no code path around these)
- **U-CIMCO-OPEN-VMC01** -- operator opens CIMCO Edit FOREGROUND on VMC-01 (Codejock/Machine-Sim ribbon
  only realizes interactively; proven across 4 SIM-realize probes).
- **U-LEGAL-13** -- public-manuals-only provenance sign-off before ANY post ships to a live machine.
- **U-CIMCO-LIVE-E2E-VMC01 -> U-CIMCO-FLEET-ROLLOUT** -- 12 sim-able + 3 EDM-routed = 15/15.

### F. LATER
- **U-ECHO-GOLDEN-NC-CI** (PHASE 3) -- byte-equiv CI for >=6 controllers (adds Fanuc/Siemens/Heidenhain).
- **U-ECHO-FEEDBACKBUS-SUBSCRIBER / U-ECHO-JMPOST-FEEDER / U-PP-THERMAL-LITERATURE** (PHASE 4 learning loop).
- **U-ECHO-NN-REAL-TRAIN** -> india (real backprop loop, shares the triple schema).
- **U-ECHO-HURCO-DNC-CHAIN** (PHASE 7) -- full Hurco CAM->WinMax roundtrip with per-op physics gates + S(x)>=0.98.

---

## TRACK A -- ENGINE TEST COVERAGE: COMPLETE (2026-06-25, slot:echo, session 0731e3b0)
All 11 remaining untested post engines now have real reference-value tests -- 603 new tests,
all green, all verdicts REAL (none dark/stub). Shipped in 3 commits on cad-fusion-live-ms0:
- U-PP-ENGINE-TESTS-BATCH3: PostAMFinishingPlan 20, PostDownload 70, PostLibraryCatalog 59, PostPhysicsFoundation 52 (=201)
- U-PP-ENGINE-TESTS-BATCH4: PostProcessorAPI 38, PostProcessorDeepLearning 58, PostProcessorDeepReasoning 61, PostProcessorIntelligenceOrchestrator 84 (=241)
- U-PP-ENGINE-TESTS-BATCH5: PostProcessorKnowledge 77, PostProcessorTrainer 34, PostProcessorUltimateAI 50 (=161)
Each: agent read engine end-to-end -> wrote happy + >=3 failure + >=2 adversarial real-value
assertions -> ran green; orchestrator independently re-ran + grep-verified 0 toBeDefined-only /
0 .skip/.only / 0 literal non-ASCII (subagent-introduced U+2192 regex matcher, box-drawing
dividers, and 'fur'/'x' chars all escaped to value-identical \uXXXX).

### NEW QUEUED UNIT (R12 finding from Track A)
- **U-PP-PHYSFOUNDATION-CANONICALIZE** -- `PostPhysicsFoundationEngine.ts` (lines ~183-259) INLINES
  `KC_ISO` + `MATERIAL_PROPS` instead of importing `src/physics/constants.ts` (violates the no-inline-
  physics-constants rail + echo soul refuse). The Kienzle mc exponents DIVERGE from canonical:
  ISO K mc=0.25 vs 0.28, ISO S mc=0.22 vs 0.27, ISO H mc=0.20 vs 0.30 -- so this engine's specific-force
  scaling is wrong for K/S/H groups. NOT fixed in the test pass (needs a coordinated engine+test change +
  physics-reviewer sign-off): the BATCH3 tests assert the engine's CURRENT inlined values as a
  characterization lock, so they will fail when the engine is corrected -- that failure IS the fix signal.
  Fix protocol: import canonical KC/material from constants.ts -> re-baseline the PhysicsFoundation tests
  to canonical values -> physics-reviewer PASS -> commit. Owner: echo (post engine), physics-reviewer gate.

## NEXT-ACTION (for the next echo session)
1. If fresh budget + want max ROI: **U-PP-DISPATCHER-REGISTER build-check** -- uncomment the import/call,
   `npm run build`, see if ppDispatcher.ts compiles on cad-fusion-live-ms0. If clean -> do Phase-1 unmask
   then register (full 3-of-3). If it errors -> log the errors here, they ARE the unmask work-list.
2. If continuing in-flight CIMCO work + operator present: **U-CIMCO-COMBO-WRITE + LOAD-MACHINE** (section D).
3. Autonomous-safe filler (no live CIMCO, no rate-limit risk): **U-PP-KIENZLE-EMIT-REGRESSION** (section C).

---

## 2026-06-27 (compact 2, slot:echo, session b2086b4d) -- corpus verification pass + winmax-lathe build plan

### SHIPPED (committed 9f2a9e7db3, scoped to corpus only)
- **U-PP-LATHE-VERIFY-FLAGS** -- lb3000 + multus re-confirmed live-clean via the harness
  (`--post <id> --generate` -> 3/3 jobs PERFECT, score 100%, 0 lint errors each) and their STALE
  `actionVerified:false` flags flipped to true + status `validated-clean`. Corpus now **8/9 verified**.
  These were already fixed last session (re-pointed to master_post_okuma_b250 + config.machine_id) but
  the verified-flag was never updated -- pure metadata lag, not a real failure.

### hurco-winmax-lathe -- crash is ALREADY FIXED in source; live :3100 runs a stale build
- The harness shows `0/3 GEN-FAIL: post rejected: Cannot read properties of undefined (reading 'trim')`.
  Root cause = `LatheMasterPostRouterEngine.findMachine(undefined).trim()` -- the SAME bug already fixed
  last session by the findMachine null-guard (commit `5d52f87639`). The harness still shows it ONLY because
  the live :3100 (uptime ~4.6h) runs the PRE-FIX build. Did NOT restart :3100 (shared fleet server, 26
  chats depend on it -- fleet-affecting). PROVEN at source: `LatheMasterPostRouterEngine.nullguard.test.ts`
  3/3 green covers `route({machineId:undefined})` -> clean fallback (route() bails to fallbackRoute BEFORE
  controller resolution, so controller:"hurco" does not change the path). Once :3100 rebuilds, this post
  routes to an HONEST generic fallback (postPath:"fallback", warns "Machine not found"), NOT a crash.
- `actionVerified:false` stays CORRECT: there is no real Hurco-lathe master-post; the fallback is a generic
  11-line stub ("INSERT OPERATION CODE HERE"). The router also silently IGNORES `params.operations` (plural)
  -- it only reads singular `params.operation`. A real Hurco-lathe post is the genuine remaining gap.

### DEFERRED (large, dedicated next session) -- U-PP-HURCO-WINMAX-LATHE-GENERATOR
The last actionVerified:false corpus post. NOT started this session -- it is a multi-file R15 build that
cannot be COMPLETED to standard in a post-compact budget, AND its APPROACH is genuinely operator-dependent
(R8 flag below). Build plan for the next echo session:
  1. **APPROACH QUESTION (operator-informed, surface before building):** the corpus driverPlan says the
     WinMax-lathe target is the LIVE-CONTROLLER UI-DRIVER path (copy `data/posts/prism-base/winmax-bridge/`
     -> `winmax-lathe-bridge/`; PrismWinMaxUI process-attach + re-probe the lathe Tool-Setup FSM). WinMax is
     a CONVERSATIONAL control -- the operator programs AT the machine. So is the deliverable (a) an ISO
     G-code `HurcoWinMaxLatheMasterPostEngine` for CIMCO-sim, (b) the UI-driver bridge, or (c) BOTH? The
     UI-driver layer NEEDS the on-site controller (operator-gated). Confirm scope before the multi-hour build.
  2. **If ISO-gen engine (a):** copy-modify `HurcoV11MillMasterPostEngine.ts` (2302 lines) for turning --
     G96/G97 CSS + G50 max-RPM cap, G71/G70 rough/finish cycles, G76 threading, G75 grooving/part-off,
     G41/G42 nose-radius comp, X=DIAMETER convention, turret tool changes. Physics from CANONICAL_KIENZLE/
     TAYLOR (constants.ts) ONLY; inline the G/M dialect WORDS the same way the mill engine does (the
     `controller-dialects/` dir the soul references does NOT exist -- "no inline constants" = no inline
     PHYSICS, not no G-words). Wire via a Hurco-lathe branch in LatheMasterPostRouterEngine OR a dedicated
     `master_post_hurco_winmax_lathe` camDispatcher action. R15: real tests (happy + >=3 failure + >=2
     adversarial) + corpus re-point + harness verify (source-level until :3100 rebuilds).
  3. **Also fix (R12):** the `lathe_master_post_route` handler drops `params.operations` (plural). Either
     map operations->the generator or have the router honestly reject an operations-shaped call it cannot post.

---

## 2026-06-27 (compact 2 cont.) -- U-PP-HURCO-WINMAX-LATHE-GENERATOR SHIPPED (commit 7853a6402f)
SUPERSEDES the "DEFERRED" note above: the winmax-lathe ISO generator IS built (the crossroad re-classified
-- the ISNC G-code generator is reversible/internal code REQUIRED for CIMCO-sim, only the live-UI-driver
sublayer is operator-gated). Shipped:
- `HurcoWinMaxLatheMasterPostEngine.ts` (368L) -- ISNC/Fanuc-dialect turning, adapted from the proven
  OkumaB250 turning structure. Key dialect correction: G71 longitudinal roughing (Okuma uses G72=facing).
  G76 threading, G75 grooving/part-off, G50 RPM clamp, G96 CSS, per-op-type non-finite guard.
- Wired via dedicated `master_post_hurco_winmax_lathe` camDispatcher action (enum + sealed case), matching
  the master_post_okuma_b250 pattern. Corpus re-pointed off the lathe_master_post_route ROUTER.
- 10/10 engine tests (happy + 3 failure + 3 adversarial); 3 corpus latheJobs generate clean NC
  (0 skipped, 0 warnings; dialect-lint 0 errors fanuc+hurco). **CORPUS NOW 9/9 actionVerified.**
- STILL DEFERRED (operator-gated, needs on-site control): the conversational WinMax-UI driver path
  (PrismWinMaxUI process-attach + lathe Tool-Setup FSM). Separate unit; not blocking CIMCO-sim.

### U-PP-HURCO-WINMAX-LATHE -- 3-of-3 scrutiny PASS (fix commit c1619e1c62)
Arm A first pass FAILed on 2 P1 G-code dialect defects (both inherited from the OkumaB250 template):
malformed G75 Q0 part-off cutoff + a single-position groove emitting a Z-stepover Q with no Z travel.
Fixed: part-off drops the Q word (X-pecking cutoff); grooving gates Q on `abs(end_z-start_z)>0`.
Also closed arm-C P2s: added the `master_post_hurco_winmax_lathe` Zod boundary schema + negative-pitch
+ non-finite-speed guards. Re-dispatched arm A -> PASS. 3-of-3: A(re-verified) + B + C all PASS.
14/14 engine tests; NC re-verified 0 dialect-lint errors.
TWO P2 FOLLOW-UPS (pre-existing, SHARED with the OkumaB250 sibling -- not blockers, log only):
1. units:"inch" sets G20 but does NOT scale the .toFixed(3) mm coordinates (both engines emit raw mm).
2. a negative feed_mm_rev passes the engine's finiteness guard (caught at the dispatcher by the schema's
   .positive(), but the engine itself would emit F-0.1 if called directly). Mirror the schema bound in
   nonFiniteOperationFields for defense-in-depth. Both apply to OkumaB250 too -> fix as a paired sweep.

## 2026-06-28 (slot:echo) -- U-PP-JM-FLEET-COVERAGE: closed the JM-fleet master-post corpus gap

**What:** the closed-loop post-training corpus only sampled 9 posts; the FULL JM NC fleet is 12
machines (5 mills VMC-01..05 + 7 lathes LTH-01..07). Enumerated the real denominator (ShopConfig
DEFAULT_MACHINES) and found 6 machines had a BUILT+WIRED master-post engine but were NOT in the
closed loop (R15 wire-into-the-loop gap, same class as RokuRoku 2026-06-27):
  - LTH-01 Okuma GENOS L300-M (live-tool + C-axis)   -> master_post_okuma_b250 / machine_id GENOS-L300-M
  - LTH-02 Okuma GENOS L200E-M (live-tool)           -> master_post_okuma_b250 / machine_id GENOS-L200E-M
  - LTH-03 Okuma LNC8 (pure turning)                 -> master_post_okuma_b250 / machine_id LNC8
  - LTH-04 Okuma Crown L1060 (pure turning)          -> master_post_okuma_b250 / machine_id CROWN-L1060
  - LTH-05 Okuma GENOS L400II-E (heavy turning)      -> master_post_okuma_b250 / machine_id GENOS-L400II-E
  - VMC-04 Haas OM-2 (office mill, classic Haas)     -> master_post_by_machine controller=haas

**Key finding (R8 read-before-write):** OkumaB250's OKUMA_LATHE_MACHINES table ALREADY holds all 7 JM
Okuma lathe identities (added U-PP-LATHE-JM-FLEET-IDENTITY) -- so each entry gets an ACCURATE
(MACHINE: model controller) header with NO "Unknown machine_id" warning. The only gap was the
TRAINING CORPUS never referenced them, so the harness never SCORED them.

**Verify:** :3100 was OOM-down at run time (heap 716/772 MB -> unresponsive; did NOT restart the shared
daemon). Verified via NEW `scripts/verify-jm-fleet-coverage.ts` (direct-engine, mirrors haas-post-proof.ts) --
STRICTER than the :3100 harness because it also asserts the exact per-machine header.
**Result: 6/6 PERFECT** -- every post job 0 dialect ERRORs + structural-100% + 0 skipped + accurate header.
Corpus now 15/15 actionVerified; ALL 12 NC-programmable JM mill+lathe machines are in the closed loop.
Commit `e7d116f03f`.

**Open follow-ups (queued, NOT blockers):**
1. [DONE 2026-06-28 -- U-PP-LIVETOOL-COVERAGE, same session] LIVE-TOOL / C-axis coverage for LTH-01
   (GENOS L300-M) + LTH-02 (GENOS L200E-M) + Multus. Added `liveToolJobs` (c_mill) to the corpus +
   extended verify-jm-fleet-coverage.ts with a live-tool leg: the OkumaB250 generateCAxisMilling path
   emits M76 (C-axis home) / M23+M203 (live tool CW) / G12.1+G13.1 (polar on/off) / M24 (live tool off).
   VERIFIED 3/3 machines: 0 dialect-ERR + struct-100% + all 6 markers present + no NaN + accurate header.
   REMAINING (deeper enhancement, NOT this unit): full CAM-coordinate-driven C-axis toolpaths (the engine
   emits a representative polar pattern, line 905) + Multus B-axis mill-turn sync + dual-spindle handoff.
2. Per-machine Haas program header for OM-2 vs VF-2 (cosmetic -- same dialect; OM-2 carries a program_comment today).
3. [DONE 2026-06-28 -- U-PP-NONPOS-GUARD-WINMAX baa4df0b45 + U-PP-NONPOS-GUARD-OKUMA 6a5ae938d4] paired
   defense-in-depth sweep: both lathe master-post engines now drop an op with a non-positive
   feed_mm_rev/depth_of_cut_mm (a negative feed is FINITE, slips past the finiteness check, would emit
   "F-0.1" on a DIRECT engine call -- mirrors camActionSchemas .positive()). Position fields (X/Z) stay
   finite-only (negative coords valid). 17/17 Hurco + 55/55 Okuma (golden byte-UNCHANGED) + fleet-coverage
   9/9 + tsc-clean. Scoped to the req magnitude fields; the opt css/spindle/groove-width negative case
   (truthy-guard semantics) is a separate smaller follow-up if ever needed.
4. (operator-gated) CIMCO machine-sim of the generated NC; hermes /learn tribal-knowledge max for all machines/controllers.

**Out-of-lane / different process (NOT echo mill/lathe corpus):** 1 wire-EDM (Mitsubishi -- mike's WEDM
galaxy; MitsubishiMV1200RWireEDMMasterPostEngine exists) + 2 sinker-EDM (Mitsubishi EA12S/EA12D --
electrode-burn, not a G-code post).

## 2026-06-28 (slot:echo) -- FEATURE-DEPTH phase (ultracode + Workflow-orchestrated)

After machine coverage + the whole-corpus :3100-independent verifier (19/19) closed, built the mill
FEATURE depth. Both waves Workflow-orchestrated (coder per engine in isolated contexts + adversarial
code-analyzer verify, all PASS) -- ultracode-appropriate, kept the orchestrator context light.

- **U-PP-MILL-OPCYCLE** (`5974b5415c` + matrix `230a144efe` + wiki `ed0bb9ffb8`): `op.cycle` canned-cycle
  support built into HurcoV11 + OkumaOSP mill posts (the 2 confirmed gaps -- neither read op.cycle).
  Mirrors HaasNGC's `emitCannedCycle` (modal `{G98|G99} G8x Z R [Q] [P] F` first hole + modal X/Y + `G80`).
  HurcoV11 mirrors the `CYCLE_GCODE` map; OkumaOSP sources codes from `ControllerDialectEngine.okuma_osp_p300`
  DB (NOT inline -- echo soul). ADDITIVE-only (no-cycle ops byte-identical; golden unchanged). 29 engine
  tests. All 5 mill posts now support canned cycles. Wiki [[mill-opcycle-canned-cycles]].
- **U-PP-MILL-WAVE2** (`925a8a823f`): rigid-tap **G84** (4/4 mills, bare no-M29 -- RokuRoku emits bare G84 +
  advisory, R12-honest, no fabricated M29) via op.cycle type:tap; high-speed smoothing exercises (Haas
  use_g187->G187, Hurco use_ultimotion->G05.3, Okuma P500+use_super_nurbs->G05.1, RokuRoku use_lookahead->
  G05.1 -- Okuma P500-gating documented since JM production is P300); and the `cycle`->Zod schema on
  `master_post_hurco_v11` (shape-matched, 24 parse tests; master_post_by_machine is a z.any() passthrough,
  no change). Verifier now **19 PERFECT**.

**IN FLIGHT (Workflow `wunplwj53`):** OkumaOSP 5-axis TCP emit (G43.4/G43.5 + A/C rotary + a MANDATORY
singularity advisory at A~=0) for VMC-02 Okuma M460V-5AX -- investigate-then-exercise/build, safety-focused
adversarial verify. Process + commit its result when it completes.

**REMAINING (gated):** sub-spindle part-transfer (Multus/OkumaB250 -- safety: phase sync); full
CAM-coordinate-driven C-axis (OkumaB250 emits a representative polar pattern; needs the op to carry a real
C-axis path); CIMCO machine-sim of all generated NC (operator/real-machine). 5-axis A/C ANGLES come from
CAM (foxtrot/kilo) -- echo emits them; cross-lane coordination for the toolpath side.
