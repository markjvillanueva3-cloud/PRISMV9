# Post-Processor FEATURE-Coverage Matrix (slot:echo, 2026-06-28)

> The machine-coverage gap is CLOSED (all 12 NC-programmable JM machines in the closed-loop corpus,
> 15/15 verified -- see ECHO-OPEN-TASKS-LEDGER 2026-06-28). This matrix is the NEXT layer: per post
> engine, which ADVANCED controller features it EMITS (grounded in source greps) vs which the corpus
> JOBS actually EXERCISE -- so the remaining work is the FEATURE gaps, ROI-ranked. Grounded: every
> "supported" cite is a real emit site; every "gap" is confirmed in generated NC under
> `state/shared/post-training/nc-jm-fleet-coverage/`.

## Method
- Engine feature support: `grep -E "G8x|G73|M29|G187|G05.1|G43.4/5|TCP|M203|G12.1|..."` across the 6 post engines.
- Corpus exercise: the corpus `jobs` (mill: face/pocket/drill) + `latheJobs` (face/od_rough/od_finish/thread/groove/part_off) + `liveToolJobs` (c_mill).
- Gap = engine SUPPORTS the feature OR the machine HAS the capability, but no corpus job drives it (so the closed loop never verifies it).

## MILL posts

| Feature | Haas (NGC) | Hurco (V11) | Okuma (OSP) | RokuRoku (Fanuc31i) | Corpus exercises? |
|---|---|---|---|---|---|
| Canned drill G81-85/G73 (via `op.cycle`) | **SUPPORTED** + tested | **SUPPORTED** (BUILT U-PP-MILL-OPCYCLE: cycle field + emitCannedCycle mirror HaasNGC; +21 tests) | **SUPPORTED** (BUILT U-PP-MILL-OPCYCLE: codes from ControllerDialectEngine okuma_osp_p300 DB; +8 tests) | **SUPPORTED** | **ALL 4 mill posts now EMIT a G8x canned cycle for an op.cycle drill -- VERIFIED end-to-end (verifier: 4/4 "canned G8x OK"). GAP CLOSED 2026-06-28; additive (no-cycle ops byte-unchanged, golden safe)** |
| High-speed smoothing | G187 (L19/130/258) | G05/UltiMotion (L1070/1099) | G05.1 (L120/124) | G05.1/G187 (L17/18) | NO (no high-speed flag in jobs) |
| 5-axis TCP | -- | -- | **G43.4/G43.5/TCP (L127/131/142)** | -- | **NO -- jobs are 3-axis; VMC-02 is 5-axis (M460V-5AX)** |
| Rigid tapping M29/G84 | rigid (L272) + G84 | rigid (L1468) | rigid (L100/1091) | rigid (L232) + G84 | NO (no tap op in corpus) |
| Extended work offsets G54.1 | -- | G54.1 (L1056) | -- | -- | NO |
| Through-spindle coolant M88 | M88 (L268) | M88 (L1147) | -- | -- | NO |

## LATHE posts

| Feature | OkumaB250 | HurcoWinMaxLathe | Corpus exercises? |
|---|---|---|---|
| Turning (face/OD/ID/thread/groove/part-off) | yes | yes | YES (latheJobs) |
| C-axis live-tool (M203/G12.1/G13.1) | L907/911/922 | NOT found | YES for OkumaB250 (liveToolJobs); **GAP: Hurco lathe has no C-axis/live-tool path** |
| Drilling (peck G83) | **G83 peck for depth>30mm, G1 below** (generateDrillingCycle L877-885; VERIFIED 37mm->G83 on all 7 Okuma posts) | **G83 peck for depth>30mm, G1 below** (L321-334, IDENTICAL pattern; +2 tests verify both branches) | **EXERCISED + VERIFIED on BOTH engines. NOT a gap -- the earlier "G1-only" claim was a 27mm test BELOW the 30mm gate (verify-the-emit with TRIGGERING inputs)** |
| Sub-spindle | sub_spindle (L78/213/303) | NOT found | **NO -- Multus/B250 support; no part-transfer job** |

## ROI-ranked feature-build backlog (each = a buildable unit for fresh context)

1. **Exercise canned drilling cycles in the closed loop** -- CORRECTED 2026-06-28 (R8/R12; the prior
   "confirmed gap in all 5 mill posts" was WRONG -- the engines mostly SUPPORT canned cycles, the CORPUS
   just never triggers them): HaasNGC + RokuRoku FULLY emit G81/G82/G83/G73/G84/G85 from `op.cycle`
   (HaasNGC tests L245-275 pass; RokuRoku `if(op.cycle)` L236); OkumaOSP does NOT emit them (L19 is an
   UNIMPLEMENTED doc comment, confirmed move-list in NC). The corpus drill job carries no `cycle` field, so every engine takes the move-list path
   (engine L70). post-nc-conformance.mjs ALREADY validates a canned cycle (L66 regex, L108-113 golden mode).
   WORK (mostly NO engine build): (a) add a `cycle`-carrying drill job (+ a peck job for G83) to the corpus
   so the closed loop EXERCISES + VERIFIES the canned path -- a CORPUS + verifier-assertion change, done
   THIS session as U-PP-CANNED-DRILL-EXERCISE; (b) **[DONE 2026-06-28 -- U-PP-MILL-OPCYCLE, commit
   5974b5415c]** HurcoV11 + OkumaOSP `op.cycle` canned-cycle support BUILT (Workflow-orchestrated, 2-arm
   adversarially verified PASS): each got a `cycle` field on its op interface + an `emitCannedCycle` helper
   mirroring HaasNGC (HurcoV11 mirrors the CYCLE_GCODE map; OkumaOSP sources codes from the
   ControllerDialectEngine okuma_osp_p300 DB -- NOT inline). ADDITIVE-only (a drill without op.cycle is
   byte-identical; golden snapshots unchanged). 21 + 8 new engine tests; the verifier asserts all 4 mill
   posts emit "canned G8x OK". So ALL 5 mill posts now support canned cycles. (c) add `cycle` to the
   dispatcher Zod schema (camActionSchemas) for the :3100 path -- remaining follow-up (direct-engine
   verifier already covers it).
2. **Lathe PECK drilling (G83) -- RE-CORRECTED 2026-06-28 (R12): IT IS EMITTED.** OkumaB250
   generateDrillingCycle (L877-885) emits `G83 Z.. Q2 F.. / G80` for depth > 30mm and a `G01` plunge
   below -- VERIFIED: the deepened lathe-drill-axial job (37mm) -> "G83 peck OK" on all 7 Okuma posts.
   NOT a gap. (My first "G1-only" finding was a 27mm test that fell BELOW the 30mm threshold -- the
   verify-the-emit lesson sharpened: use INPUTS THAT TRIGGER THE PATH.) Convention confirmed from PRISM
   knowledge: Okuma OSP lathe drilling = G83 (LathePostGeneratorDialectEngine dialect tests + the engine's
   own tip L202 "Deep drilling >3xD: G83 Q2.0"). OPTIONAL refinement: the 30mm ABSOLUTE threshold could be
   L/D-based (>3x drill diameter per the tip) -- needs a drill-diameter field the TurningOperation lacks;
   defensible as-is, low priority. **HurcoWinMaxLathe CONFIRMED (L321-334): IDENTICAL G83-peck-for-depth>30mm
   pattern, +2 tests verify both branches.** So lathe peck drilling is fully covered + verified on BOTH
   engines -- this backlog item is CLOSED (no build needed).
3. **5-axis TCP (G43.4) for VMC-02** -- OkumaOSP supports it; the machine is 5-axis but jobs are 3-axis.
   Add a 5-axis mill job (B/C rotary + TCP). PARTLY CROSS-LANE (5-axis strategy = foxtrot/cam; POST emission
   = echo). Coordinate before building.
4. **Rigid tapping (M29/G84)** -- supported by all mills; add a tap op + corpus job.
5. **High-speed smoothing on/off (G187/G05.1/UltiMotion)** -- supported; add a high-speed-flagged job variant.
6. **Sub-spindle part-transfer (Multus)** -- supported; needs a part-transfer job + design (handoff sync).
7. **HurcoWinMaxLathe C-axis/live-tool parity** -- the Hurco lathe lacks the C-axis/live-tool/sub-spindle
   path OkumaB250 has. Lower priority (simpler controller; verify the real Hurco TM/TMX even has C-axis).

## Note
All feature builds touch the post ENGINES (not just the corpus) -- each needs its own per-file scrutiny +
(for HaasNGC) golden-snapshot regen. They are FEATURE-DEPTH work, distinct from the now-complete
machine-coverage + closed-loop-verification thread. Verifier: `scripts/verify-jm-fleet-coverage.ts`
(whole-corpus, :3100-independent) is the regression gate for each.
