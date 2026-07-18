---
namespace: code-tribal
type: lesson
title: Okuma Multus B250 sub-spindle part-transfer — verified codes vs 3 divergent wrong code-sets
domain: post-processor
slot: echo
source: U-PP-SUBSPINDLE-EMIT (498574b55f)
last_verified: 2026-06-28
related:
  - "[[okuma-5axis-tcp-and-golden-drift-cron-2026-06-28]]"
  - "[[post-processor-knowledge-base]]"
  - "[[feedback_read_full_content_not_titles]]"
  - "[[feedback_never_assume_data_file_contents]]"
---

# Okuma Multus B250 sub-spindle (SP2) part-transfer — verified codes

The JM Multus B250IIW (OSP-P300) sub-spindle part-transfer is now emitted by
`OkumaB250LatheMasterPostEngine.generateSubSpindleTransfer` (slot:echo, 2026-06-28),
sourced **verbatim from Mark's own running JM programs**, not a manual or a CAM default:

- `JM DIE/CNC OKUMA MULTUS/MARK'S GRAB AND PULL PROGRAM (SP2-Z=1.17).min` (L16-47, bar-pull)
- `JM DIE/CNC OKUMA MULTUS/MARK'S WORKING SPINDLE GRAB-PULL-CUTOFF (SP2-Z=1.17).min` (L21-67, cutoff-transfer)

## Verified codes (canonical: `MULTUS_B250_SUBSPINDLE_CODES` in `src/data/marks-multus-patterns.ts`)

| Function | Code | Function | Code |
|---|---|---|---|
| Sub chuck clamp / unclamp | `M248` / `M249` | Main chuck clamp / unclamp | `M83` / `M84` |
| Sub interlock release on/off | `M247` / `M246` | Main interlock release on/off | `M185` / `M184` |
| Synchronized rotation on/off | `M151` / `M150` | Chip blast (aux, NOT coolant) on/off | `M51` / `M50` |
| Sub-spindle coord/program | `G141` | Sub-spindle longitudinal axis | `W` |
| Dwell (Okuma OSP) | `G4 F<sec>` | Sub mode pair (purpose unconfirmed, reproduced verbatim) | `M289` / `M288` |

## The verified choreography (bar-pull, parameterized)

```
M41 / G50 S<max> / G18                       (range, speed clamp, ZX plane)
M247 / M185 (interlock release ON, sub+main)
M249 (unclamp sub) / G4 F1.
G97 S<rpm> M4 / M151 (sync ON) / M51 / M289 / G4 F3. / M50 / M288
G0 W0. / G1 W<grab> F25. (approach+grab) / G4 F1.
M248 (CLAMP SUB) / G4 F1.                     <-- NO-DROP: sub clamps + dwells
M84  (UNCLAMP MAIN) / G4 F1.                  <-- ...BEFORE main releases
G1 W<pull> F25. (BAR PULL) / M83 (clamp main) / G4 F1.
M249 (unclamp sub) / G4 F1. / G0 W<return> (sub retract)
M184 / M246 (interlock release OFF) / M150 (sync OFF)
```

**Safety invariants (enforced + tested):** (1) **NO-DROP** — the sub chuck clamps
(M248) and dwells *before* the main unclamps (M84); the part is never held by zero
chucks. (2) A `G4` dwell follows **every** chuck clamp/unclamp so the chuck physically
actuates before the next move. (3) Sync rotation (M151) is ON before the sub approaches
a rotating part. (4) Interlock release brackets the whole transfer. Dwell is Okuma OSP
`G4 F<sec>` — **not** the Fanuc `G04 P<ms>`.

## THE LESSON — three divergent wrong code-sets, zero matching the real machine

Before this unit the codebase carried **three** different, unverified, conflicting
sub-spindle code sets and **none** matched the actual fleet machine:

1. `PPOkumaSubSpindleSyncEngine` (claims "LU3000/LT OSP-P300L", no cited source):
   `M227`/`M228` sub chuck, `M87`/`M89` main chuck, `G145`/`G146` sync, `B` axis,
   `G04 P<ms>` dwell.
2. `marks-multus-patterns.ts` PAT-005 / PAT-008: collet codes `M68`/`M69`, `M51`,
   `M102`, `M111` — a **collet**-fed sub-spindle dialect, not the B250 **chucker**.
3. `OkumaB250LatheMasterPostEngine` sub_spindle tribal tip + header doc-comment:
   `M38`/`M39` — flatly wrong, and there was **no emit path** at all.

The verified machine uses none of these. The fix sourced the codes from the running
programs, kept the divergent entries (they may serve collet machines) but **flagged**
them (R7 surface, don't silently delete), and corrected the M38/M39 tip + header.

**This is the sibling of the 2026-06-28 5-axis TCP fabricated-cite bug**
([[okuma-5axis-tcp-and-golden-drift-cron-2026-06-28]]): a dialect code asserted in a
comment/tip/data-file is NOT proof. Open the machine's **own running program** and read
the actual M/G codes before trusting any of them. The per-file scrutiny here PASSED
*because* both reviewers were told to read the raw `.min` source and confirm every code
line-for-line — exactly the check that catches a fabricated cite.

## Modes

- `bar_pull` — complete self-contained cycle (part stays on MAIN, stock advanced; sub
  releases + retracts). Warns in-NC if `return_w_in` is omitted (defaulted W0. is not a
  real clearance).
- `pickoff` — sub grabs + HOLDS the finished part (main released, sync still ON) for a
  following cutoff/back-op; the sync+interlock teardown (`M150`/`M184`/`M246`) and the
  `G141` sub-side machining are emitted after that op (faithful to the real cutoff program).

## Follow-on fixes (same session — all 3 divergent code-sets now addressed)

- **`OkumaB250LatheMasterPostEngine.generatePartOff` dwell — FIXED (`4878fee401`):** was
  `G04 P0.5` (Fanuc `P`=ms) on an Okuma OSP post; now `G4 F0.5` (Okuma `F`=seconds, verified
  vs Mark's programs + the `lathe-real-program-validation` note "Okuma G4 F2., NOT Fanuc G04
  P2000"). One site fixes the whole JM Okuma lathe fleet (this engine routes all of them).
  Golden re-baselined (1-line diff) + a dialect lock test; verifier 20/20. NOT touched:
  `HurcoWinMaxLathe`'s `G04 P0.5` — Hurco WinMax `P` is *seconds*, a different dialect (R7).
- **`PPOkumaSubSpindleSyncEngine` LU3000 codes — FLAGGED UNVERIFIED (`c0d7a27961`):** R12
  header warning that its uncited LU3000 codes diverge from the JM-verified chucker codes and
  the JM fleet has no LU3000. Flagged (not "corrected") because there is no verified source to
  correct them *to* — honesty over false authority.
