---
name: reference_oscar_sfc_jm_divergence_2026_06_25
description: "PRISM-vs-JM-proven turning-speed divergence report (slot:oscar, 2026-06-25) + two lessons the physics-reviewer forced: (1) a material-GROUP label does not encode TEMPER -- tool_steel is machined annealed (P), not hardened (H); (2) an implausibly-high extracted CSS is an SFM->m/min units artifact, not a real aggressive cut. U-SFC-JM-PROVEN-DIVERGENCE."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.707Z
aliases: reference_oscar_sfc_jm_divergence_2026_06_25
---


**PRISM-vs-JM-proven turning-speed divergence report (slot:oscar, 2026-06-25).** Built
`scripts/sfc-jm-proven-divergence.mjs` (10/10 tests): compares each JM-proven CSS (from the activated
proven-store, [[reference_oscar_sfc_jm_proven_extracted_2026_06_25]]) vs PRISM's `CANONICAL_TURNING_SPEEDS`
band (imported from constants.ts, never inlined) per ISO group x op -> conservative / in-band / aggressive
/ suspect-units. **CORRECTED RESULT (iter 12, after the units fix below):** 14 comparable / 36 excluded ->
**CONSERVATIVE 14 / IN-BAND 0 / AGGRESSIVE 0** (JM runs slow, 61-213 m/min). The iter-11 pre-fix numbers
(3 cons / 6 in-band / 3 aggr / 2 suspect) were UNITS-WRONG -- see LESSON 3.

**LESSON 1 (physics-reviewer caught this as a FAIL before it shipped -- a fabricated verdict).** The first
cut mapped `tool_steel`/`tungsten_carbide` -> ISO **H** (hardened), mirroring the private
`_MATERIAL_KEYWORD_TO_ISO` in constants.ts. That inflated EVERY JM tool-steel cut to a fabricated "+246%
aggressive" verdict that dominated the sort-by-magnitude headline. **A material-GROUP label does not encode
TEMPER STATE.** Tool steel is supplied + machined ANNEALED (~200-250 HB = P-band, Vc ~220-320), then
hardened to HRC58-64 AFTER -- by which point it is ground/EDM'd, not turned. So mapping the GROUP to the
HARDENED ISO group is a category error for a comparison of WHAT WAS ACTUALLY CUT. Tell: a JM cut at 450
m/min is itself PROOF the stock was soft (you cannot turn HRC62 with carbide at 450 -- the tool fails in
seconds). Fix: `tool_steel -> P` (annealed default); only EXPLICIT `hardened`/`hardened_steel` -> H. Also
EXCLUDE `tungsten_carbide`/`carbide`/`ceramic`/`cbn`/`diamond` (not conventionally turned -- a "turning CSS"
for them is a mislabel). The `_MATERIAL_KEYWORD_TO_ISO` map's H choice is defensible for a FORCE model
(worst-case/known-temper), but NOT for a speed-comparison of observed cuts -- same label, different correct
ISO depending on the question. A 4-line prose caveat does NOT fix a wrong number in the headline.

**LESSON 2 (UNITS-FIRST -- the new suspect-units lane).** After the L1 fix, the remaining extreme rows were
carbon_steel od_finishing 700 + facing 640 m/min (+119% / +100% over P[220,320]). These are almost
certainly an **SFM->m/min extraction artifact**: 700 SFM = 213 m/min (in-band!), 640 SFM = 195 m/min
(in-band) -- the ~3.28 SFM-per-m/min factor lands a mislabel at ~2x the band edge. Added a `suspect-units`
verdict (`SUSPECT_UNITS_FACTOR=1.8`: css > 1.8x the finish edge) that flags these DISTINCT from a real
"aggressive" cut, so the report separates "JM ran hot" from "we extracted the number wrong." A units
mismatch is the 25.4x/3.28x-class bug the SAFETY-RAILS flag -- an implausibly-high value is a units smell,
not a data point. **OPEN FOLLOW-UP (high value):** chase the 700/640 back to `extract-jm-proven-speedfeed.mjs`
/ `OkumaOSPParserEngine` -- does it read a G96 CSS in SFM (or a programmed max-CSS clamp) and store it as
m/min? Fix at the SOURCE + re-run; the suspect-units flag is the downstream symptom, not the cure.

**LESSON 3 (iter 12 -- the systematic UNITS bug the suspect-units lane only hinted at).** Chasing the 2
suspect-units rows back to the source revealed the WHOLE proven-store css is in **SFM, not m/min**:
OkumaOSPParserEngine's G96 field is documented "(SFM)", the ProvenSpeedFeedAggregatorEngine copies it RAW
(no conversion), and JM is a US/inch shop. Empirical proof: max G96 S = 3000 (= 914 m/min as SFM, IMPOSSIBLE
as m/min turning), 0 of 16,558 programs use G21(metric). So iter-11 compared SFM values to an m/min band --
units-wrong for EVERY row, which INVERTED the conclusion (falsely "aggressive"). Fix (`U-SFC-JM-PROVEN-SFM-UNITS`):
`SFM_TO_M_PER_MIN=0.3048` (exact ft->m, a unit conversion NOT a physics constant) + convert css SFM->m/min
before the band compare (default `--css-unit sfm`). CORRECTED: all 14 conservative (61-213 m/min vs 220-320
P band) -- JM amateurs run slow legacy-SFM speeds. **CRITICAL SOURCE FOLLOW-UP (higher severity, queued):**
the aggregator stores SFM as UNLABELED css -> if the orchestrator proven-blend is ever enabled it would
recommend **3.28x too FAST** (the DANGEROUS direction -- a UNITS-FIRST 25.4x/3.28x-class safety bug). Fix at
ProvenSpeedFeedAggregatorEngine/OkumaOSPParserEngine (label or normalize units to m/min) + re-extract; this
script-level conversion only corrects the REPORT. Lesson: an extracted numeric without a UNIT LABEL is a
latent scale bomb -- the proven store should carry `css_unit`, and any consumer comparing to a metric band
must convert. The suspect-units lane (iter 11) flagged the symptom (2 extreme rows); the disease was the
whole dataset.

**Meta-lesson:** the per-file physics-reviewer arm caught a wrong-but-green report (all tests passed, math
was correct GIVEN the wrong band) -- the error was in the MODELING CHOICE (material->ISO), not the code.
A green test suite does not validate a modeling assumption; a domain reviewer does. Sibling:
[[reference_oscar_sfc_jm_proven_extracted_2026_06_25]] (the data), [[reference_oscar_sfc_optimize_for_2026_06_25]].
