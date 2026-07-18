---
title: SFC vs JM-program accuracy -- methodology + the corrections live data forced
tags: [sfc, speed-feed, jm-die, taylor, accuracy, oscar, validation]
created: 2026-06-24
slot: oscar
---

# Testing SFC against ALL JM Die programs -- and the four corrections live data forced

**Context.** Operator goal (2026-06-24): "utilize ALL JM die parts and programs first to run full live tests of parameters ... programs are mostly written by amateurs so don't trust the speeds/feeds, use them as the GUIDELINE to test against." Built a pipeline (`scripts/sfc-jm-program-corpus.mjs` -> `sfc-jm-corpus-analyze.mjs` -> `sfc-jm-physics-compare.mjs`, libs under `scripts/lib/sfc-*`) that extracts as-programmed S/F/T from all **154,414** JM programs (**~1.17M** cutting ops) and compares programmed lathe surface speed to the canonical Taylor recommendation (`Vc=C/T^n`, `C` from `src/physics/constants.ts`).

**The headline lesson: every intermediate conclusion was WRONG until live data corrected it.** A first-pass "JM runs 88% conservative vs PRISM" was an artifact of four compounding mistakes, each caught only by validating against the real corpus -- never by unit tests alone.

## The four corrections (each a reusable rule)

1. **Gate collision-prone numeric grade tokens behind material WORDS.** A material-from-comments heuristic classified **5,076** ops as superalloy (ISO S) because bare `625`/`718` matched part/program *numbers* (e.g. `A210356HK`), not Inconel. Bare common numbers (`625`,`718`,`303`,`304`,`2024`=a year) must require an adjacent material word; only distinctive tokens (lettered tool-steel grades, `6061`) stand alone. A false match that moves AWAY from the default group is the harmful kind.

2. **A CSS-target comparison MUST be G50-clamp-aware.** The most dramatic catch ("D2 at 1500 sfm = 5.7x too hot") was a `G96 S1500` *target* preceded by `G50 S1500` (max-rpm clamp). The effective surface speed is `rpm*pi*D`, capped far below the programmed CSS. Of 16,942 "aggressive" flags, only **~169 were UNCLAMPED** (genuine over-speeds); the rest were clamp-capped upper bounds. Segment clamped vs unclamped and rank unclamped first.

3. **Default the material from the shop's actual stock, not a generic P.** Defaulting unknown-material programs to P (carbon steel) is wrong for a tool-and-die shop. JM's QuickBooks purchase record (`jm-die-stock-material-catalog.json`, 2,212 stock lines) is **93.7% TOOL STEEL (ISO H)** -- H13/M2/D2/S7/A2/O1... `scripts/lib/sfc-jm-stock-prior.mjs` derives the modal ISO from purchase frequency.

4. **For a die shop, the Taylor band is HARDNESS-STATE-dependent -- report the range, not a point.** Tool steel is rough-TURNED in the ANNEALED state (soft, P-like machinability) and only hardened LATER for grinding/hard-turning. Programs do not record hardness state. So the band is a P<->H sensitivity range: annealed/soft reading = 88% conservative + 3% aggressive (operative for lathe roughing); hardened reading = 45% conservative + 30% in-band + 24% aggressive. Publishing a single number would be falsely precise (the SFC soul refuses `publishing-a-speed-feed-without-uncertainty`).

## Honest final conclusion

JM lathe programs run **conservative-to-in-band**; the true band is hardness-state-dependent; **at most ~169 unclamped over-speeds** warrant review across 509,381 lathe CSS ops. A definitive per-program band needs **per-op hardness state** captured in the data (the documented next unit). The SFC's value to JM is mostly the *upside* (where they can safely run faster), not catching dangerous programs.

## Meta-lesson

Unit tests proved each component correct; only running over the FULL live corpus surfaced the four conceptual errors (false superalloy, clamp-blindness, wrong default material, hardness-state collapse). **Validate aggregate findings on the complete population, with the domain's metallurgy in hand, before publishing a conclusion.** Memory: [[reference_oscar_sfc_jm_accuracy_harness_2026_06_24]].
