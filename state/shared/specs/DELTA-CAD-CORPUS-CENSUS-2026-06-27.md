<!--
  DELTA CAD CLOSED-LOOP TRAINING CORPUS CENSUS -- 2026-06-27, slot:delta (CAD galaxy).
  Deterministic enumeration (Glob/find, not a model) of every CAD/Fusion/Mastercam/print/CNC
  file on H:/prism, per the operator goal "utilize ALL existing cad files, fusion files,
  mastercam files, prints and cnc programs in the h drive". ALL-MEANS-ALL: full population,
  not a sample. Companion to DELTA-CAD-CLOSED-LOOP-TRAINSUITE-MASTER-PLAN-2026-06-27.md.
  Regenerate: see "How this was counted" below.
-->

# DELTA CAD Closed-Loop Training -- Corpus Census (2026-06-27)

> ALL-MEANS-ALL enumeration (operator totality directive). This is the COMPLETE population of
> training-relevant files under `H:/prism`, by extension, node_modules/.git/dist/.next pruned.
> **Grand total: 677,175 training-relevant files.** Numbers are exact `find | uniq -c` counts.

## Category totals

| Category | Count | Extensions (count each) | What it can train |
|---|---:|---|---|
| **Prints (PDF, MIXED)** | 344,600 | pdf 344,600 | dimension/GD&T extraction, feature enumeration -- BUT mixed business+drawing; a print-vs-business classifier is a required first unit (the drawing-only subset is unknown until classified) |
| **CNC programs** | 302,662 | min 172,464 · nc 128,757 · mpf 1,006 · sub 220 · cnc 210 · eia 4 · ngc 1 | back-inference: program -> feature set -> implied geometry; toolpath/feature priors; verify control dialect per post-processor galaxy (.min dominates -- likely Okuma/Heidenhain archive) |
| **Native MCAD** | 12,575 | ipt 10,720 (Inventor part) · iam 1,252 (Inventor asm) · sldprt 506 · sldasm 94 (SolidWorks) · catpart 3 (CATIA) | parametric feature trees, archetype/template mining, assembly graphs (10,720 Inventor parts + 1,346 assemblies = the richest parametric-history source) |
| **2D drawings** | 9,506 | dxf 9,258 · dwg 248 | 2D-profile -> sketch templates, title-block/dim parsing, view-layout priors |
| **Neutral CAD exchange** | 3,328 | step 2,895 · stp 271 · x_b 108 · igs 27 · x_t 25 · iges 2 | BRep geometry ground truth, regen fidelity (Hausdorff) reference set, feature recognition labels |
| **Mastercam** | 2,764 | mcx 2,749 · mcam 15 | CAD+toolpath pairs (geometry with proven machining intent) |
| **Fusion** | 1,740 | f3d 1,740 | Fusion-native parametric timelines, the live-bridge replication target |
| **GRAND TOTAL** | **677,175** | -- | -- |

## Verified honesty caveats (R12 -- do not over-claim coverage)

1. **PDF is mixed.** 344,600 .pdf includes business docs, manuals, certs, AND drawings. The
   drawing-only count is NOT yet known -- classifying it is unit `U-CADTRAIN-PRINT-CLASSIFY`
   (see master plan). Do NOT claim "344K prints to train on" until classified.
2. **.h excluded on purpose.** Heidenhain conversational programs use `.h`, but `.h` collides
   massively with C/C++ headers in `mcp-server`/tooling. A targeted Heidenhain recount (path-scoped
   to JM DIE + resources) is queued; the 302,662 CNC count is a FLOOR, not a ceiling.
3. **Scope = H:/prism.** The operator said "h drive". Every known CAD corpus root lives under
   `H:/prism` (`JM DIE/`, `resources/`, `Docustrata/` per CRITICAL-RESOURCE-ROOTS). A full `H:\`
   root scan (outside the repo) is a queued verification (`U-CADTRAIN-HROOT-VERIFY`); if it surfaces
   material outside H:/prism this census is a floor.
4. **Counts are file counts, not unique parts.** A part may appear as .ipt + .step + .pdf + .nc
   (4 files, 1 part). Cross-modal de-duplication into a part-keyed registry is unit
   `U-CADTRAIN-PART-KEY-REGISTRY` -- the join key that makes the multi-modal corpus a coherent
   training set (one part's print + CAD + program become one labelled example).

## Highest-value training pairs (already co-located, no acquisition needed)

- **Mastercam (.mcx, 2,749)** = geometry + verified toolpath in one file -> CAD-with-machining-intent labels.
- **Inventor (.ipt 10,720 / .iam 1,252)** = full parametric feature history -> the archetype/template
  library + design-pipeline-sequence source (how a real part was built, step by step).
- **STEP/STP (3,166) <-> PDF print** of the same part = the supervised (print -> geometry) pair that
  directly trains/evaluates the print->CAD pipeline; needs the part-key registry to join.
- **.nc/.min (301,221) <-> CAD** = program -> feature back-inference (what geometry produces this code).

## How this was counted (reproducible)

```
find /h/PRISM -type d \( -name node_modules -o -name .git -o -name dist -o -name .next \) -prune \
  -o -type f -print 2>/dev/null \
  | grep -iE '\.(step|stp|stpz|iges|igs|sat|x_t|x_b|3dm|sldprt|sldasm|ipt|iam|prt|asm|catpart|f3d|f3z|mcam|mcx|emcam|nc|tap|eia|min|mpf|pgm|cnc|gcode|ngc|ncf|anc|sub|dxf|dwg|pdf)$' \
  | sed -E 's/.*\.([^.]+)$/\1/' | tr 'A-Z' 'a-z' | sort | uniq -c | sort -rn
```

Raw output preserved at `state/shared/cad-corpus-census-2026-06-27.txt`. Re-run to refresh as the
corpus grows (the operator's "as our system adds more data" cadence).

## Next

This census GROUNDS the closed-loop training plan -- see
`DELTA-CAD-CLOSED-LOOP-TRAINSUITE-MASTER-PLAN-2026-06-27.md` (corpus -> mine -> learned assets ->
faster generation -> validate -> compound). Related: [[reference_delta_cad_traintest_readiness_2026_06_27]].
