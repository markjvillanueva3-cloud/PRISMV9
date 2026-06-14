---
name: reference_cam_corpus_programming_notes_2026_06_01
description: "16,558-program JM Okuma corpus analysis (how they programmed lathe parts) — caught a Fanuc-G75-grooving dialect bug in kilo's own matrix/rules; confirms OSP feed-per-rev default; 8->14 matrix-expansion blueprint"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.047Z
aliases: reference_cam_corpus_programming_notes_2026_06_01
---


# JM Okuma lathe corpus — programming-practice analysis (U-CAM-CORPUS-DEEP-STRUCTURE, slot:kilo, 2026-06-01)

Operator /goal: *"use workflow to go over how all previous cad cam programs were written … learn to optimize."* Background workflow `wf_d7b59a1b-54f` (8 profiler shards + synthesis) analyzed **ALL 16,558 JM Okuma `.MIN` lathe programs**. Commit `1e66d2166d`. Output: `state/shared/cam-drive/CAM-CORPUS-PROGRAMMING-NOTES.md` + 8 `corpus-notes/batch-*.md`.

## The bug it caught (R12 — my own prior work was wrong)
Okuma OSP dialect is **INVERTED vs Fanuc**. My earlier `CAM-OP-TEMPLATE-MATRIX.json` + `CAM-OPTIMIZATION-RULES.json` prescribed **"Okuma G75 auto-depth grooving"** — that's Fanuc; **G75 is ABSENT in all 16,558 programs**. Corrected (commit `1e66d2166d`): grooving → **G74 peck-and-shift / G81-G82 LAP**; legend fixed (G85/G87=LAP rough/finish, G81/G82=shape-def, G80=LAP end, G71/G72=threading, G74=peck, G76=in-shape chamfer). Lesson: synthesizing a dialect from domain memory ≠ the real corpus — **validate canned-cycle semantics against the actual programs**. Pairs with [[reference_cam_optimization_verified_2026_06_01]] (the adversarial-audit pass that did NOT catch this — it checked physics/guards, not dialect).

## Confirms #43 (units-first)
OSP default = **feed-per-rev (G95)**; ~91% of files omit G94/G95 and rely on the implicit per-rev modal. Feeds are IPR (.001–.016). Misreading as in/min = 12–60× feed error. Task #43 resolved.

## Headline findings
- **Strong habits to PRESERVE (positive training signal, R11):** 97–98% G50 cap under G96, ~92% G96 CSS, ~73%/69% G85/G87 LAP define+replay, A-angle/G76 chamfer idiom, near-universal NAT11 cutoff.
- **Top inefficiencies (ranked):** (1) ~27% hand-code longhand where a LAP fits (extremes 1120–2516 lines); (2) conservative non-material-matched feeds/speeds/DOC fleet-wide (F.005/S100-cutoff on steel AND aluminum alike); (3) CSS confined to cutoff, OD turns on fixed G97; (4) 2–4 redundant face skims before LAP; (5) full `G0 X20 Z20` retract every op (10–14 air rapids/part); (6) only ~23–26% peck-drill; (7) finish re-coded by hand vs G87 replay; (8) TNR comp only ~21%; (9) highest-SEVERITY ~1.9% G96 with no G50 cap.
- **Highest-severity safety:** enforce **G50-before-every-G96** as a hard prism_safety invariant (closes the ~1.9% uncapped + cap==target + modal-reliance gap).

## Matrix expansion SHIPPED (U-CAM-MATRIX-EXPAND-14, commit `a04a2cb646`)
Matrix expanded **8 → 15 families**: added `profile` (largest unrepresented class → G85/G81-G82/G80 LAP + G87 replay), `face_grooving` (G82, split from radial `grooving`), `chamfer` (G76/A-angle), `bore_finish` (single-line bore-to-size + mandatory TNR comp), `live_tool_milling` (C/Y-axis; **G94↔G95 feed-mode revert is a HARD safety gate** — leaked G94 = 12-60× feed error), `peck_drill` (G74 depth/dia trigger), `tap` (honest stub). Each: full 10-field contract + matching optimization rules + `FAMILY_PHYSICS` delegate + `LATHE_OP_ORDER` rank. 49/49 tests. Per-file scrutiny caught a P0 (surviving Fanuc `G75` in `global_safety_invariants`) — fixed; the dialect-regression test now scans the matrix too.

## Readiness (assessment workflow wf_45c55842-218 → CLOSED-LOOP-CAM-READINESS.md)
Fusion nav-map ~55-60% (op-AUTHORING is the gap), offline chain ~70%, training harness ~75% wired but **never ran live**, 5-axis/multi-turn ~5%. **Verdict: NOT ready for a live self-improving revolution; matrix expansion + offline-loop arming are buildable now.** Top external gate = **operator must RESTART Fusion** (still old add-in, `fusion_strategy_verified=false` on all 15). 5-axis + multi-turn 100+op is a large, mostly-unbuilt extension beyond single-setup turning. Next buildable-now: arm the offline loop (#4 U-CAM-LOOP-ARM) + retrain trigger (#6/#7) — not externally gated.
