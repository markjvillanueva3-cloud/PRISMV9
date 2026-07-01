---
name: reference_echo_loop_2026_06_27
description: "Echo post-processor /loop 2026-06-27 -- live closed-loop fleet scorecard (5/6 per-machine master posts PERFECT), RokuRoku VMC-05 wired into the training corpus (3/3), AGI dispatcher R12 silent-success fix + the ~100-site class, + a shared-tree git-add-whole-file absorption lesson."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.561Z
aliases: reference_echo_loop_2026_06_27
---


# Echo post-processor /loop -- 2026-06-27 (session b2086b4d)

Operator `/checkin-echo /loop /goal`: compile remaining echo/post-processor work, build, closed-loop
train toward 100% confidence + CIMCO-tested master posts. **Did NOT re-mine** -- the 35 echo sessions
are already synthesized; read the live compiled plans ([[reference_echo_loop_2026_06_26]] +
ECHO-ULTIMATE-ROADMAP-v3 + ECHO-OPEN-TASKS-LEDGER). The project is ~85-90% done, NOT the stale
2026-05-29 "22%" audit (golden-NC harness, outcome-emit P6, lathe identities, CIMCO machine-load all
shipped since).

## The keystone ALREADY EXISTS (dup-guard + R8 caught it)
The closed-loop TRAINING harness is built: `scripts/post-training-harness.mjs` (corpus x post:
generate NC via :3100 -> dialect-lint -> structural-conformance -> score -> deviation punch-list) +
`scripts/post-gen-reward.mjs` (non-circular loss fn). My initial plan to build `post-gen-confidence-cycle.mjs`
would have DUPLICATED it. Pivoted to RUN + EXTEND. (The v3 roadmap never listed these scripts -- read
the scripts dir, not just the roadmap. [[feedback_read_full_content_not_titles]].)

## Live closed-loop fleet scorecard (today, :3100 UP, current engines)
5 of 6 per-machine master posts **PERFECT** (3/3 jobs, 0 dialect-ERRORs):
- **rokuroku-vmc05** (NEW) 3/3 PERFECT -- R15 gap: RokuRokuFanuc31iMillMasterPostEngine shipped
  2026-06-25 (`4259b15e63`) + route-wired but was never in the training CORPUS; added it
  (`master_post_by_machine`, fanuc dialect, route via model.includes ROKU/HC 658) -> PERFECT first run.
- hurco-v11-standalone 3/3 PERFECT (was the 2026-05-31 FINDING-2 PhysicsSidecar `undefined` crash -- fixed since).
- haas-vf2 3/3 · okuma-genos-osp 3/3 (19W) · okuma-b250-lathe 3/3 (22W).
- hurco-v11-agi 0/3 -- the ONE defect (next).

The 5 PERFECT posts ARE "100% confidence in the posts we generate" for the JM mill+lathe fleet. NOT
re-run (actionVerified:false, queued): winmax-lathe, lb3000, multus, FA10S-wire, EA-sinker.

## FINDING -- AGI dispatcher silent-success FIXED (U-PP-AGI-HONEST-SUCCESS `8d6a681f9c`)
`master_post_unified_agi_generate`'s engine (`MasterPostProcessorUnifiedAGIEngine.generatePost`) consumes
`segments`/`gcode` -- **`UnifiedPostInput` has NO `operations` field** -- it is a CAM-segment/gcode
OPTIMIZER, not an operations->NC generator. Fed operations-only jobs it correctly returns the empty
error-result `{gcode:"", line_count:0, warnings:["No segments or G-code provided"]}` (createErrorResult,
engine ~1632). The BUG was `camDispatcher.ts:20378` hardcoding `result = { success:true, data:<that empty
error-result> }` -- the R12 "success:true is a lie if it emitted nothing" class. **Fixed:** report
success:false + the engine's reason on empty/not-callable; success:true only on a real non-empty program.
+3 round-trip tests through the REAL dispatcher (`camDispatcher.masterpost-agi-honest-success.test.ts`:
operations->false, empty->false, real-gcode->true 11 lines). Corpus `hurco-v11-agi` reclassified
`contract-mismatch-documented`.

## SYSTEMIC -- ~100-site hardcoded-`success:true` class (catalogued, scoped follow-up)
`result = { success:true, data: (engine as any).method?.(params) ?? {note:"not callable"} }` occurs
**~100 times** in camDispatcher -- each can report success:true over an engine error-result OR a stub note.
Most are CROSS-DOMAIN (WEDM parse/table->mike, lathe-learner->india/whiskey) -> NOT echo's to rewrite blind.
Recommended: a shared `postActionResult(label,value)` honest-success helper adopted across the echo-owned
`master_post_*`/`pp_*` generation actions; coordinate the rest. The AGI fix is the first adopter + proof.

## LESSON (R12) -- shared-tree `git add <whole file>` absorbs peer uncommitted work
My `git add mcp-server/src/tools/dispatchers/camDispatcher.ts` on the shared `cad-fusion-live-ms0` tree
ABSORBED bravo's UNCOMMITTED `camxMs3U01ActionSchemas` import+spread (dormant-schema registration) into my
commit `8d6a681f9c` (parent had ZERO refs). bravo's own `e1702131ad` landed AFTER mine with the rest of his
work; current HEAD has exactly 1 import + 1 spread (no dup), compiles clean -- so it is harmless + now
consistent, but attribution blurred. **Rule: on the shared tree, stage HUNKS (`git add -p`), never whole
files, so a peer's in-flight working-tree edits are never swept into your commit.** Sibling of
[[feedback_commit_to_slot_worktree]] (the real fix is the slot worktree). Posted to bravo on the chat bus.

## Operator-gated ceiling (honest, R12) -- the last ~5% to "100% confidence + CIMCO-tested"
The final CIMCO machine-simulation verification is OPERATOR-GATED: the report-grid MSAA pane realizes only
on the operator's own foreground sim run (verified across 4+ sessions). The `.mcfg` machine-load wire is
BUILT + proven ([[reference_echo_cimco_baseline_live_2026_06_26]]). One operator action closes it: open the
committed `state/shared/cimco/KNOWN-BAD-OVERTRAVEL-VMC03-HaasVF6.nc` in the (VF-6/40-configured) CIMCO ->
Simulate -> the sim must FAIL on over-travel. + U-LEGAL-13 sign-off before MS-MASTERPOST ships.

Related: [[reference_echo_loop_2026_06_26]] · [[reference_echo_post_gen_reward]] · [[reference_echo_closed_loop_training_readiness]] · [[reference_echo_post_processor_domain_map_2026_05_27]]
