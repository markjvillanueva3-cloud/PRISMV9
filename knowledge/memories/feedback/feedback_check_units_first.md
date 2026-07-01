---
name: feedback_check_units_first
description: "FLEET-WIDE RULE: before ANY geometry/tool/holder/feed/stock/program work, determine the part's units (inch vs mm) from the SOURCE — never assume. A units mismatch is a 25.4x scale error (kilo built a part in metric numbers while it was in inches → tool + holder 25.4x too big). Resolve units FIRST, carry them explicitly, STOP if unknown."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.420Z
aliases: feedback_check_units_first
---


**Operator directive (2026-05-30, slot echo):** *"first check if a part is in metric or inches before we do anything. kilo just made the mistake of making everything in metric numbers not realizing we were in inches so the tool and holder was way bigger than it should have been."*

**THE RULE (every slot, every domain, before anything):** Determine whether the part/job is in **inch** or **mm** from the AUTHORITATIVE SOURCE *before* computing any geometry, tool, holder, offset, feed, stepover/stepdown, stock, or program value. **Never assume. Never default silently.**

**Why it matters:** inch ↔ mm differ by **25.4×**. Treating an inch value as mm (or vice-versa) silently produces a part/tool/holder/stock that is 25.4× too big or too small → gouges, crashes, scrapped stock, impossible toolpaths. It is one of the most expensive and easiest-to-miss CNC errors, and an inexperienced operator won't catch it ([[feedback_prism_for_inexperienced_machinists]]).

**The kilo incident:** kilo (CAM) generated everything in metric numbers without realizing the part was in inches → the tool and holder came out 25.4× oversized. Root cause: units were assumed, not resolved from the source.

**How to apply:**
1. **Resolve units from the source FIRST.** Authoritative sources by domain:
   - NC / G-code: `G20` = inch, `G21` = mm (also `G70`/`G71` on some controls). It's in the program header.
   - STEP/CAD: `CONVERSION_BASED_UNIT … 0.0254` = inch; `SI_UNIT(.MILLI., .METRE.)` = mm ([[reference_delta_step_inch_unit_convention]] — JM STEP is INCH).
   - Fusion/CAM: the setup's unit; a tool library's `"unit"` field ("inches"/"millimeters").
   - Print/blueprint: the title-block units.
2. **If units are unknown or ambiguous → STOP and verify.** Do NOT proceed on a guess. Ask, or read the source again.
3. **JM Die convention is INCH** — but still verify per part; don't blanket-assume.
4. **Carry units explicitly** through every structure (declare the job's units once and make everything conform, or tag each dimension). Never mix.
5. **Sanity-check magnitudes:** a 1/2" end mill is 0.5 (inch) or 12.7 (mm) — if a "0.5" tool suddenly implies a 12.7-unit holder in an inch job, that's the 25.4× tell.
6. **Use the executable guard:** `scripts/lib/units-guard.mjs` — `detectUnits(source)` / `requireUnits(source)` (throws if unknown) / `assertUnitsMatch(expected, actual)` (throws on mismatch with the 25.4× warning) / `convert(v, from, to)`. Call it before geometry/tool/feed math.

Pairs with [[feedback_build_comprehensive_route]] (verify, don't shortcut) + the global CLAUDE.md §SAFETY RAILS units-first rule.
