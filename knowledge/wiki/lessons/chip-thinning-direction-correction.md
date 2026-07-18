---
title: Chip-thinning direction — the common error corrected (RCTF)
type: lessons
status: verified
slot: bravo
created: 2026-06-12
tags: [chip-thinning, rctf, radial-chip-thinning, milling-physics, feed-correction, R7, R12]
---

# Chip-thinning direction: which way does the feed correction go?

**Finding (slot:bravo, 2026-06-12):** a mill feedback memory
(`feedback_foxtrot_chip_thinning_mandatory`) framed the failure mode BACKWARDS — it said
"skipping the chip-thinning correction → over-feeds → tool snap." The radial-chip-thinning math
proves the opposite direction. Captured: [[reference_bravo_chip_thinning_direction_2026_06_12]].
oscar's SFC memory agrees with the math. This corrects the *direction*; chip-thinning is still
mandatory — the lesson is which way the error actually points.

## The math (Radial Chip-Thinning Factor)

For a radial width of cut `ae` and tool diameter `D`, the maximum chip thickness at the cut is

```
h_max = fz * sin(arccos(1 - 2*ae/D))   = fz * sqrt(1 - (1 - 2*ae/D)^2)
RCTF  = 1 / sqrt(1 - (1 - 2*ae/D)^2)    (the multiplier applied to fz to RESTORE target h_max)
```

At light radial engagement `h_max < fz`. Worked example at `ae/D = 0.10` (10% stepover):

```
1 - 2*ae/D = 0.8
sqrt(1 - 0.8^2) = sqrt(0.36) = 0.6
h_max = 0.6 * fz          -> the actual chip is only 60% of the programmed fz
RCTF  = 1/0.6 = 1.667     -> you must feed 1.667x faster to hit the intended chip load
```

## Which way the error points

- **Commanded `fz` with NO chip-thinning correction at light `ae`** → the *actual* chip thickness
  is only `0.6*fz` (at 10% ae). The tool is **UNDER-fed**: it rubs/burnishes instead of cutting,
  which causes premature flank wear, heat, work-hardening (esp. in S/M groups), and poor tool life.
  It does **NOT** over-feed and snap the tool.
- **Snap/overload risk** comes from the OPPOSITE move: applying (or over-applying) the RCTF boost
  and then ALSO running heavy `ae`, or stacking the boost on top of an already-aggressive feed so the
  true chip load exceeds the edge's limit. The danger is OVER-compensation, not omission.

So: **omitting** chip-thinning → under-feed → rub/wear. **Over-applying** it (or applying at high ae)
→ over-feed → overload. The correction must be gated on `ae/D` (only boost when `ae/D < 0.5`; at
`ae >= D/2` the max chip already equals `fz` and no boost applies — see [[mill-chip-thinning]]).

## Why it matters for the calculations

A speed/feed engine that "protects" against snap by *skipping* the boost does the wrong thing — it
under-feeds and burns the tool by rubbing. The correct protection is: apply RCTF to hit target chip
load, then clamp the *resulting* feed against spindle/edge/deflection limits. Direction matters for
the safety clamp logic, not just the nominal feed.

## Related

- [[mill-chip-thinning]] — the full RCTF reference page (gated boost, ae/D table)
- [[reference_bravo_chip_thinning_direction_2026_06_12]] — the finding memory
- `feedback_foxtrot_chip_thinning_mandatory` — the memory whose *direction* this corrects (flagged
  for cleanup by its owner; not edited cross-slot per R8 courtesy)
