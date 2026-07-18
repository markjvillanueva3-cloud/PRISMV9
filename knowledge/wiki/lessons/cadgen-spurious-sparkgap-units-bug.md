---
title: text→CadQuery applied a spurious, units-buggy spark-gap to non-electrode parts (~16% undersized)
type: lesson
tags: [cad, cad-generation, cadquery, units, closed-loop, self-learning, slot-delta]
created: 2026-06-28
slot: delta
commits: [U-DELTA-CADGEN-SPARKGAP-FIX]
related: [step-trailing-dot-real-silent-underextraction, reference_delta_jm_spark_gap_convention, reference_delta_live_cad_loop_map_2026_06_28]
---

# The CAD self-learning loop's first real catch: a spurious + units-buggy spark-gap

**This is the payoff of the closed loop.** The dimensional-correction producer
(`U-DELTA-CADGEN-DIM-CORRECTION`) flagged ~16% of text→CadQuery GEN parts as undersized; root-causing
that flag found a real generation defect and fixed the generator. Producer → root-cause → fix → validate,
end to end — exactly the "self learning" the goal asked for.

## The bug

The text→CadQuery generation prompt (`scripts/cad-text-to-cadquery.mjs::buildPrompt`) carried:
> "If the request implies a sinker-EDM electrode, undersize all burning surfaces by 0.0015 inch per side
> (0.003 total spark gap)."

The LLM (qwen2.5-coder:32b) mis-handled this two ways, observed in real generated `model.py`:
1. **Spurious application** — it applied the spark gap to PLAIN parts (a "rectangular plate"), not just
   electrodes. 45 of 283 generated parts (~16%) had a `SPARK_GAP`, inconsistently (the cube didn't).
2. **Units bug** — when it applied it, the code was:
   ```python
   SPARK_GAP = 0.003 * IN          # 0.0762 mm
   length = (2.0 - SPARK_GAP) * IN # (2.0 - 0.0762) * 25.4 = 48.86 mm  ← WRONG
   ```
   It subtracted a **mm** value (0.0762) from an **inch** value (2.0), then ×25.4 — undersizing the part
   by ~1.94 mm (0.97 mm/side) regardless of the part's size (a constant offset, the tell-tale signature).

Net: a "2.0 × 1.0 × 0.5 inch plate" came out **48.86 × 23.46 × 12.7 mm** instead of 50.8 × 25.4 × 12.7
(Z exact because no allowance touched it). Silent — the STEP is a valid solid, just the wrong size.

## The fix

Tighten the prompt (keep the canonical electrode capability — `reference_delta_jm_spark_gap_convention`
is real): lead with "DIMENSIONAL ACCURACY IS PARAMOUNT … EXACT nominal dimensions"; gate the allowance to
"ONLY when the request EXPLICITLY names a sinker-EDM electrode … a plain plate/block/cube/cylinder gets
NO allowance"; and show the correct units form (`(2.0 - 0.003) * IN`, NEVER `(2.0 - 0.003 * IN) * IN`).

**Validated end-to-end:** the exact failing spec regenerated to a clean `length_in = 2.0;
length_mm = length_in * IN` with NO spark-gap → produced envelope **[50.8, 25.4, 12.7]** (was
[48.86, 23.46, 12.7]). One regen is a strong spot-check on the previously-failing input, not a statistical
proof (LLM nondeterminism) — the deterministic proof is the prompt-content regression test (18/18).

## Meta-lessons

1. **A closed loop earns its keep by catching real defects.** The dimensional-correction producer wasn't
   theoretical — its very first live run surfaced a systematic generation bug corrupting ~16% of the CAD
   corpus. Build the measurement loop; it finds the bugs.
2. **A units bug hides as a constant offset.** Every affected part lost the SAME ~1.94 mm in plan
   regardless of nominal size — a fixed offset, not a percentage, is the fingerprint of a units mismatch
   (mm subtracted from inch). Sibling of the [[step-trailing-dot-real-silent-underextraction]] silent
   class: valid output, wrong value.
3. **A conditional instruction to an LLM needs an explicit negative.** "If electrode, undersize" was read
   as "undersize" ~16% of the time. Adding "a plain part gets NO allowance — use its exact size" gives the
   model the OFF case it needs. Show the correct AND the wrong form when a units trap exists.
