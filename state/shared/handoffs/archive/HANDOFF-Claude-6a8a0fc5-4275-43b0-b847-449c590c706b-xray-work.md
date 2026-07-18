---
session: Claude-6a8a0fc5-4275-43b0-b847-449c590c706b
topic: xray-work
written_at: 2026-06-23T01:58:09.161Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: 6a8a0fc5-4275-43b0-b847-449c590c706b
status: active
---

# HANDOFF: Claude-6a8a0fc5-4275-43b0-b847-449c590c706b
Updated: 2026-06-23T01:58:09.161Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: 6a8a0fc5-4275-43b0-b847-449c590c706b

## STATE
## P1.5 COMPLETE + comparison decided (2026-06-22, iters 10-15, slot:xray)

Arc shipped end-to-end + both consumers wired + decided by the number. Commits d13211934f / f93c14d6b1 / 7c8ca636ba / ca91dcb5d5.

## Decision (measured)
Region routing NOT safe to default-on: 05850 full-page 0.4286 (3/3pp) vs region 0 (1/3pp). Stays opt-in/rescue-only as shipped.

## Due-diligence (don't re-derive)
- R8: buildTrainsetRow dimensions-only -> gd&t/notes merge moot.
- DEDUP: P2.8 normalizers already built.

## NEXT = GPU-heavy + multi-seed (healthy host, fresh context)
(1) multi-seed investigate the region 2/3-page-drop on 05850; (2) broaden comparison (high skip rate caveat); (3) P1.4 GD&T prompting; (4) P2.7 triangulation.

## Rails learned this session
- COMMIT each unit immediately (shared-tree clobber).
- Verify consumer reads a field before a merge (R8).
- validate-perfect-parts exit 2 = no-pass (not a crash); region runs resumable.

## RESUME
P1.5 region-routing arc COMPLETE + COMPARISON DECIDED (slot:xray, this session iters 10-15). Commits: d13211934f (dense-rescue-trainable), f93c14d6b1 (cron --region-route wire = last consumer), 7c8ca636ba (arc-complete doc), ca91dcb5d5 (comparison finding). Both consumers wired, opt-in default-off. region-glue-lib 22/22 + region-classify 11/11, 2-arm PASS every unit. KEY DECISION (measured, not assumed): region routing is NOT safe to default-on -- first same-session validate-perfect-parts --limit 3 comparison on 05850 (3-page lathe scan): full-page recall 0.4286 (35 dims, 3/3pp) vs --region-route recall 0 (10 dims, 1/3pp) -- region UNDERPERFORMED (dropped 2/3 pages, matched 0/7 GT), contradicting the prior single-run 0.4286. So region routing stays OPT-IN / dense-rescue-only as shipped. DUE-DILIGENCE (don't re-derive): R8 buildTrainsetRow is dimensions-only (gd&t/notes merge MOOT for cron); DEDUP P2.8 normalizers already built (normalizeSurfaceFinish/Thread/GDT in ollama-vision-extract-lib.mjs). NEXT (all GPU-heavy + multi-seed -> run on a HEALTHY host, fresh context; this host was degraded + reaper-prone): (1) INVESTIGATE the region-route 2/3-page-drop on 05850 -- run --region-route on 05850 with >=3 seeds to separate VLM variance from a systematic bug (per-page timeout under the heavier segment+floor+crops path? floor not matching standalone full-page? units/parse drop?); compare each seed's pages-with-dims. (2) broaden the comparison across more scoreable parts (note: perfect-parts has a HIGH skip rate -- many parts are program_not_nc/program_contour_gt with no callout answer-key). (3) P1.4 GD&T structured prompting (Y14.5 FCF -> FCFSyntaxValidatorEngine). (4) P2.7 print<->CAD<->program triangulation. RAILS: commit each unit immediately (shared-tree peer git-sync clobbers uncommitted multi-file edits during long agent dispatches); verify the consumer reads a field before building a merge (R8); validate-perfect-parts exit 2 = normal no-pass (not a crash); region runs are resumable (processed-cursor). [[reference_xray_p15_region_routing_arc_complete_2026_06_22]] [[reference_shared_tree_uncommitted_clobber_2026_06_22]]

## CONTEXT

## RESUME_LOOP

**GOAL CLEARED → auto-advance to next queued unit** (advance 1/1000000000 by stop-goal-clear-advance.mjs).

Next unit: P1.5 region-routing arc COMPLETE + COMPARISON DECIDED (slot:xray, this session iters 10-15). Commits: d13211934f (dense-rescue-trainable), f93c14d6b1 (cron --region-route wire = last consumer), 7c8ca636ba (arc-complete doc), ca91dcb5d5 (comparison finding). Both consumers wired, opt-in default-off. region-glue-lib 22/22 + region-classify 11/11, 2-arm PASS every unit. KEY DECISION (measured, not assumed): region routing is NOT safe to default-on -- first same-session validate-perfect-parts --limit 3 comparison on 05850 (3-page lathe scan): full-page recall 0.4286 (35 dims, 3/3pp) vs --region-route recall 0 (10 dims, 1/3pp) -- region UNDERPERFORMED (dropped 2/3 pages, matched 0/7 GT), contradicting the prior single-run 0.4286. So region routing stays OPT-IN / dense-rescue-only as shipped. DUE-DILIGENCE (don't re-derive): R8 buildTrainsetRow is dimensions-only (gd&t/notes merge MOOT for cron); DEDUP P2.8 normalizers already built (normalizeSurfaceFinish/Thread/GDT in ollama-vision-extract-lib.mjs). NEXT (all GPU-heavy + multi-seed -> run on a HEALTHY host, fresh context; this host was degraded + reaper-prone): (1) INVESTIGATE the region-route 2/3-page-drop on 05850 -- run --region-route on 05850 with >=3 seeds to separate VLM variance from a systematic bug (per-page timeout under the heavier segment+floor+crops path? floor not matching standalone full-page? units/parse drop?); compare each seed's pages-with-dims. (2) broaden the comparison across more scoreable parts (note: perfect-parts has a HIGH skip rate -- many parts are program_not_nc/program_contour_gt with no callout answer-key). (3) P1.4 GD&T structured prompting (Y14.5 FCF -> FCFSyntaxValidatorEngine). (4) P2.7 print<->CAD<->program triangulation. RAILS: commit each unit immediately (shared-tree peer git-sync clobbers uncommitted multi-file edits during long agent dispatches); verify the consumer reads a field before building a merge (R8); validate-perfect-parts exit 2 = normal no-pass (not a crash); region runs are resumable (processed-cursor). [[reference_xray_p15_region_routing_arc_complete_2026_06_22]] [[reference_shared_tree_uncommitted_clobber_2026_06_22]]
Source: handoff-resume
Claimed: no (already-claimed or freeform directive)

▶ NEXT ACTION (auto-continue — do NOT stop to wait for a prompt): re-invoke `/loop` to build the next unit above. The loop record has already been rolled onto it. To abandon instead: `node H:/prism/.claude/helpers/loop-state.mjs end --session <sid> --reason "manual-abort"`.

(Injected by the goal-clear-advance Stop hook; cap = 1000000000 advances/session. Disable: PRISM_GOAL_CLEAR_ADVANCE_DISABLE=1.)
