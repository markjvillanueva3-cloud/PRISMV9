---
title: An extracted value without a unit label is a latent scale bomb (JM-proven SFM bug)
created: 2026-06-25
slot: oscar
tags: [units, sfc, jm-proven, data-pipeline, scrutiny, physics-review, units-first, lesson]
commits: [U-SFC-JM-PROVEN-DIVERGENCE, U-SFC-JM-PROVEN-SFM-UNITS, U-SFC-JM-PROVEN-DIVERGENCE-CSSUNIT]
related: [[sfc-jm-proven-u-sfc-jm-proven-sfm-units]] [[sfc-jm-program-accuracy-methodology]] [[echo-safety-u-units-guard]] [[cad-closed-loop-ms0-u-cad-compare-unit-normalize]]
---

# An extracted value without a unit label is a latent scale bomb

Distilled from the JM-proven turning-data arc (slot:oscar, 2026-06-25, iters 9-14). Three generalizable
lessons that the per-file scrutiny gate forced out -- valuable to ANY galaxy that extracts/persists physical
quantities (blueprint OCR, CAM mining, proven-data aggregation, the corpus pipelines).

## 1. An extracted/persisted numeric with NO unit label is a latent scale bomb

The JM proven-speedfeed store recorded cutting speed (`css`) with **no `css_unit` field**. The Okuma OSP
parser extracts the G96 S-value in **SFM** (surface feet/min -- inch mode; the parser field is literally
documented `(SFM)`), the aggregator copies it **raw**, and every downstream consumer (the divergence report,
the orchestrator proven-blend) treated it as **m/min**. That is a **3.28x** scale error
(`1 SFM = 0.3048 m/min`). It had INVERTED a whole conclusion: read as m/min, JM looked "aggressive" (10 of 14
configs); converted to m/min, JM is uniformly **CONSERVATIVE** (61-213 m/min vs the 220-320 carbide band) --
the truth (amateur shops run slow legacy-SFM speeds). The dangerous direction: if the orchestrator
proven-blend (`SpeedFeedOrchestratorEngine` blends `provenVc` as m/min) ever reads it, it recommends **3.28x
too FAST**. **Rule:** any extracted/persisted physical quantity MUST carry its unit, and any consumer that
compares to a canonical metric band MUST convert. A bare number is not data -- it is a number plus an
unstated assumption.

## 2. A green test suite validates CODE, not MODELING ASSUMPTIONS -- domain review does

The divergence report passed 100% of its tests while it was (a) comparing SFM to an m/min band and (b)
mapping `tool_steel -> ISO H`. Both are *modeling* errors -- the arithmetic was correct GIVEN the wrong
band/unit, so no unit test could fail. The **per-file physics-reviewer arm caught BOTH** (the temper-state
mapping on the first pass, then the units smell). Tests encode "does the code do what I told it"; a domain
reviewer encodes "is what I told it physically right." On any physics/modeling artifact, the physics-reviewer
is not optional polish -- it is the only thing that catches a wrong-but-green report.

## 3. Material GROUP is not temper STATE; an impossible value is a units smell

- **Group != state:** `tool_steel` is a material GROUP; it is machined ANNEALED (~200-250 HB = ISO P,
  Vc ~220-320), then hardened AFTER. Mapping the group to H (hardened, slow band 80-130) made every normal
  soft cut look 2-3x "aggressive". An observed turning CSS is itself proof of soft stock (you cannot turn
  HRC62 with carbide at all). Map an observed cut to the state it was ACTUALLY machined in.
- **Impossible -> units:** the tell that the data was SFM was a single number -- `max G96 S = 3000`. 3000
  m/min turning is physically impossible; 3000 SFM = 914 m/min (high-speed aluminum) is plausible. When an
  extracted value is physically impossible in the assumed unit, suspect the UNIT before the data. (UNITS-FIRST
  is the highest-severity bug class in the safety rails -- a 25.4x/3.28x scale error.)

## Meta

The whole arc is the loop working: build -> physics-reviewer catches a modeling error -> fix -> chasing the
residual flag uncovers a deeper systematic units bug -> fix the report + honestly correct the prior memory +
commit -> attempt the source fix -> PROVE it is a no-op (the aggregator export shadows fresh aggregation) ->
REVERT cleanly rather than ship a false fix -> locate the real fix precisely. Never ship a no-op that LABELS
the data fixed when it is not -- a false "cssUnit: m_min" stamp on SFM data is worse than the honest bug.

Source fix still OPEN (whiskey's `ProvenSpeedFeedAggregatorEngine`): convert css at `aggregateLatheData`
ingestion + fix the export lazy-load so a fresh aggregation reaches the store, then stamp `cssUnit`. Memory:
[[reference_oscar_sfc_jm_divergence_2026_06_25]] (LESSON 3) · [[reference_oscar_sfc_jm_proven_extracted_2026_06_25]].
