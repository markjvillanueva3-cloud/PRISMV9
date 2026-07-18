---
name: reference_echo_lathe_g76_pword_fix_2026_06_24
description: LathePostProcessorEngine Fanuc/Mazak G76 first-block P-word packed passes+ANGLE+chamfer (wrong order); fixed to Fanuc P(m)(r)(a)=passes+chamfer+angle with 2-digit clamp; surfaced by writing the engine's first companion test
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.561Z
aliases: reference_echo_lathe_g76_pword_fix_2026_06_24
---


**U-PP-LATHE-POST-CORE-TEST (slot:echo, 2026-06-24, commit `e0b0d93ba5`)** -- writing the FIRST companion test for `LathePostProcessorEngine` (the base multi-dialect lathe post, 6 controllers, previously test-less) surfaced a dialect bug.

**Root cause:** the Fanuc G76 threading cycle's first block packs a 6-digit P-word as three 2-digit fields **P(m)(r)(a)**: m=repeat/finish passes, r=chamfer (in 0.1x-lead units), a=tool-nose angle (Fanuc 0i/30i lathe manual). The `fanuc_turning` AND `mazak_qt` dialects (the two that share the packed P-word) emitted `passes + ANGLE + chamfer` -- angle and chamfer SWAPPED. For passes=4, chamfer=1.0, angle=60 the output was `P046010`, which a real control reads as **chamfer 6.0x-lead + a 10deg tool angle** (both invalid -> bad/rejected thread cycle). Second latent defect: the chamfer field used `Math.round(chamfer*10).toString()` with no zero-pad/clamp, so a sub-1.0 chamfer (e.g. 0.5 -> "5") made a 5-digit P-word and chamfer >= 10 leads made a malformed 7-digit P-word.

**Fix:** reorder to `passes + chamfer(2-digit, clamped Math.min(.,99)) + angle` in both dialects -> correct `P041060`. Okuma (threads via G71, NOT G76), Siemens/DMG (CYCLE97), and Haas (explicit `A` angle word, different single-block format) threading were untouched -- only the two packed-P-word dialects had the bug.

**Blast radius (verified before changing post output, per echo soul "byte-equiv vs golden"):** no golden NC archive and no consumer test asserts the exact P-word -- the 22 importers + 4 sibling threading suites (lathe-dialect-validation / lathe-real-program-validation / LatheP1P12CrossDialect / post-processor-engines) assert only `toContain("G76")` / `canned_cycles_used`, which stay green. `camDispatcher.lathePostgen` golden `G76 P010060...` feeds a PARSER, not the generator. 262/262 (38 new + 4 sibling suites).

**Process notes / lessons:**
1. Same class as the G0NORM dead-safety find ([[reference_echo_backplot_g0norm_dead_safety_2026_06_24]]): writing a REAL R9 test that encodes the INTENDED dialect output (not the engine's current output) is what exposed the swap. A test that merely matched current output would have locked in the bug.
2. The roadmap's "untested lathe baseline trio" label was WRONG for `OkumaB250LatheMasterPostEngine` -- it already has a 928-line integration test + 269-line sidecar test. Verify actual coverage (read the test bodies) before trusting a roadmap "untested" claim (existence != verified; READ the content). The genuine gaps were `LathePostProcessorEngine` (now done) and `LathePostProcessorAIEngine` (2102 lines, still untested -- next).
3. Per-file 2-arm scrutiny earned its keep: arm caught the chamfer-overflow (>=10 leads -> 7-digit P) + a stale code comment documenting the old order -> both fixed + 2 coverage tests added before commit.

Part of ECHO-ULTIMATE-ROADMAP Track A1. Galaxy: `LathePostProcessorEngine`. Related: [[reference_echo_post_processor_domain_map_2026_05_27]] · [[reference_whiskey_lathe_soul_designation_2026_05_27]].
