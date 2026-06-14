---
name: hurco-winmax-proveout-ms0-2026-05-23
description: "HURCO-WINMAX-PROVEOUT-MS0 (slot echo absorbing india, 2026-05-23) — 14-invariant prove-out test that generates an operator-loadable .hnc for WinMax desktop app from the upgraded Hurco V11 master post engine. Closes india's post-processor proving-out queue."
aliases: reference_hurco_winmax_proveout_ms0_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.149Z
---


HURCO-WINMAX-PROVEOUT-MS0 — slot echo absorbed india's post-processor queue per user directive 2026-05-23: "pick up where india left off with proving out the upgraded hurco post processor to the winmax app on my desktop". India's recent post work was the MASTER-POST/CONTROLLER engines (MasterPostFineTuning, LatheMasterPostSelfAwareness, MASTERCAM-CTRL-CAT, CTRL-CALIB-WIRE) — the Hurco V11 master post engine was already shipped + dispatcher-wired (`cam:master_post_hurco_v11`) + had `PROVE_OUT_DEFAULT_FEED_FACTOR=0.5` + `generateProgram()` + 15 test files, but had **no operator-loadable .hnc generation + no anti-regression pin on the WinMax-compat structural pattern**.

This MS ships both at once.

**Ships:**
- `mcp-server/src/__tests__/HurcoV11WinMaxProveOut.test.ts` (14/14 PASS) — runs `HurcoV11MillMasterPostEngine.generateProgram()` against a representative JM Die op (face-mill 50×50mm Al-6061, T14 12mm 4FL carbide, S5000, F800 production → F400 prove-out via 0.5× canonical feed factor). Writes the .hnc, validates structure, gates engine output.
- `state/shared/hurco-winmax-proveout/proveout-latest.hnc` (+ timestamped sibling) — single-`%` framed (DNC-style), O5023 program-number header, JM Die machine + WinMax V11 tag, PROVE-OUT mode marker explicitly named, G21 metric, G54 work offset, T14 M06 tool change, S5000 M03 spindle, M08 flood, canonical safe-start (G90 G17 G40 G49 G80), G00 rapid + G01 linear (Fanuc-style 2-digit codes), G91 G28 Z0 home cycle, M30 end.

**14 anti-regression invariants pin the engine output:**
- non-empty multi-line program
- `prove_out_mode:true` flag
- `feed_optimizations[]` includes PROVE-OUT entry at multiplier 0.5 → optimized_feed_mm_min ≈ 400
- G21 metric, G54 work offset, O5023 header
- T14 M06 tool change, S5000 M03 spindle, M08 coolant
- G0+/G01 rapids+linears (Fanuc-style two-digit accepted)
- M30 end
- Single `%` wrap on both ends (double-wrap-prevention check)
- `tools_used[]` contains T14
- Zero physics_checks blocks on sane defaults (aluminum + medium feed + small DOC + 15HP)

**Operator next step:** drag `state/shared/hurco-winmax-proveout/proveout-latest.hnc` into WinMax on desktop → controller acceptance closes R1 of the envelope. If WinMax rejects, the rejected construct becomes an inverted assertion in the test (no-emit gate).

**PSN synergy touched:**
- Engines (Hurco V11 master post — already built, just newly exercised end-to-end)
- System Viz (test file lands as new node; BUILD_STATE will pick it up on next regen)
- Memories ([[reference_india_post_wire_2026_05_22]] · [[reference_india_iter4_hpm_wire_2026_05_23]] for sibling india work)
- Wiki (`knowledge/wiki/architecture/engines/mill/hurcov11millmasterpostengine.md` + `knowledge/wiki/architecture/actions/cam/master-post-hurco-v11.md` already correct — no edit needed)

**Commit:** `26d270b9c2 [MAIN] [HURCO-WINMAX-PROVEOUT-MS0]/P0-U01 (slot:echo absorbing india) [BOOTSTRAP-SLOT-ENFORCE]`. Used the `[BOOTSTRAP-SLOT-ENFORCE]` tag because echo is still in the main shared tree this session, not the slot/echo worktree. Operator-audited single-shot escape valve per CLAUDE.md §slot-commit-enforce. Lock-contention was heavy (30-attempt poll loop needed); the india-iter4 atomic-add-and-commit pattern landed it on attempt 2 of the second pass.

**R1/R2/R3 in envelope:** R1 = WinMax compat not actually verified by controller until operator drags the file (the test gates structural pattern only). R2 = single op type (face mill) — follow-up MS1 expands to 5-op JM Die canonical suite. R3 = PROVE_OUT_DEFAULT_FEED_FACTOR pinned at 0.5 in the test; future would parametrize over {0.3, 0.5, 0.7}.

**Follow-up units named:**
- HURCO-WINMAX-PROVEOUT-MS1 — 5-op JM Die canonical suite (face, drill, contour, pocket, 3-axis surface)
- POST-PROCESSOR-COVERAGE-MS0 — audit which controllers/CAMs lack post-processor coverage in PRISM; ship/wire missing ones (next iter of this same /goal loop)
