---
schema: ideablock-v1
title: "Datum sequencing — A/B/C primary/secondary/tertiary + when to re-datum"
domain: "Operation ordering"
category: operation-ordering
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-20-hotel
sources:
  - ASME Y14.5-2018 §4 Datums and Datum Features
  - Machinery's Handbook 31e §Geometric Dimensioning and Tolerancing
  - Schmid & Kalpakjian — Manufacturing Engineering & Technology, ch. on workholding
  - 4245-tribal corpus operation-ordering subset (n=353)
extracted_via: human-authored
extracted_at: 2026-05-20T20:55:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-OPORDER-DATUMS)
---

## Question

Which datum face do I cut first, and when am I allowed to re-datum during a job?

## Answer (canonical — applies to every multi-op part)

**Cut the datum frame in the order the print declares it: primary (A) → secondary (B) → tertiary (C).** This is not a suggestion — it's how the part's geometry is *defined* by the drawing, and the GD&T tolerance zones are interpreted from that order. Reversing it does not "still hit tolerance" — it reassigns which feature the tolerance is measured FROM, which is a different part.

### The 3-2-1 rule (the load-bearing invariant)

```
Primary   datum (A) = constrains 3 DOF — Z translation + 2 rotations  → cut FIRST, FLAT
Secondary datum (B) = constrains 2 DOF — X translation + 1 rotation   → cut SECOND, square to A
Tertiary  datum (C) = constrains 1 DOF — Y translation                 → cut THIRD, square to A AND B
```

3 + 2 + 1 = 6 degrees of freedom — the part is now fully located. Every subsequent op references this frame.

### Why cut-order matters (mechanics, not bureaucracy)

| If you cut… | …before this datum | The error mode |
|---|---|---|
| A hole's position | A (the face the hole is dimensioned FROM) | The hole's "true position" is now measured from a face you haven't cut — it floats with your stock's as-received face. |
| Datum B | Datum A | B is supposed to be perpendicular to A. Cutting B against a rough stock face means B inherits whatever non-flatness/non-squareness was on the raw stock. Once A is cut, your fixture has a real reference; B will be square to it. |
| A finish surface | All three datums | Surface finish callouts are measured ON the part with the part datumed correctly. If you finish before the datum frame exists, the finish is geometrically correct but referentially homeless. |
| A reamed hole | Tighter-tolerance bore that locates from the same datum | The looser reference moves on the next setup; the tighter feature now misses position by the stack-up between datums. |

## When to re-datum (the canonical exceptions)

Re-datuming = picking up the part on a freshly-cut surface so the fixture talks to the new geometry, not the raw stock. **Re-datum is REQUIRED**, not optional, in these cases:

1. **Flip operation** (op 10 → op 20). The far side of the part can't reference the near side's WCS through the spindle — pick up the cut datums (parallel block, fixed jaw, hard stop) and re-zero. Re-datum here uses **the cut datum frame**, not a re-indicated as-machined face that wasn't called out as a datum.
2. **Post heat-treat**. Steel growth/shrink is 0.1-0.3 % depending on alloy + carbon level (W1 = 0.001/in, A2 = 0.0005/in, D2 ≈ 0). The pre-HT datum frame is no longer flat or square. **Re-grind A and B**, then re-datum off the ground surfaces.
3. **Removed-stiffness change**. Roughing 80 % of stock off relieves residual stress; the part moves. If your roughing took >0.5 mm of total nominal stock from any single side and the part is < L/D 5, **bump the part** (loose-clamp, gentle re-tighten) and re-indicate datum A *before finishing*. Don't just finish on top of the now-shifted part.
4. **Soft-jaw transfer**. Going from a vice to soft jaws (or soft jaws to a fixture plate) **must** re-datum — the new holder is not in the same coordinate frame, even if the same WCS number is set.
5. **Probe-verified setup with > 0.05 mm deviation from CAM zero**. Don't override the probe and run the program — fix the setup or apply a real work-offset to bring the probed zero into spec. A 0.1 mm shift baked into G54 will be wrong on every feature.

## When NOT to re-datum (anti-patterns from the floor)

- **"The vise jaw moved between part 3 and part 4."** Don't re-datum every part — fix the workholding (chip evac, jaw torque, clamp force). Re-datuming each part hides the real defect.
- **"The first part was 0.02 over, so I shifted G54."** That's offset compensation, not re-datuming. Keep them distinct in your head — offsets fix repeatable shifts; re-datum fixes geometry changes.
- **"Re-indicate the part on the spindle face."** The spindle face is a CMM-grade reference only if the machine was leveled and the spindle thermal-stable. Most production machines have 0.005-0.020 mm runout that bakes into anything indicated against the spindle. Use a ground parallel + datum-A face whenever you can.

## Datum selection for parts WITHOUT GD&T (legacy / sketchy prints)

When the drawing has no datum feature symbols but the engineer says "use the bottom as datum A," the canonical fallback:
1. **Primary** = the *largest, flattest, most-perpendicular-to-toleranced-features* surface. Cut it first.
2. **Secondary** = the *longest edge* (or hole pair for a hole-based system), reachable while primary is held against the table.
3. **Tertiary** = the *shortest unambiguous reference* — often a pin in a hole, a flat on a boss, or a corner.

This is the implicit ordering ASME Y14.5 §4.10.3 describes as "feature precedence." Capture it in a setup sheet so the next operator doesn't guess.

## Common compound errors this prevents

- **Stack-up explosion**: cutting datum B before A causes downstream features to inherit BOTH the stock's irregularity AND B's mis-orientation. Tolerance budget is consumed by setup error before any cutting starts.
- **GD&T re-interpretation**: cutting C before A redefines C's tolerance zone from "1 DOF relative to A,B" to "free in 3 DOF" — every dimension referencing C is now measuring against a different geometric meaning than the print intended.
- **CMM rejection of in-spec parts**: a part can measure in-spec relative to the wrong datums and out-of-spec relative to the right datums. The CMM-program's datum-build sequence MUST match the cut sequence; otherwise the inspection becomes a probabilistic disagreement with the toolroom.

## Provenance

- Distilled from the 353 operation-ordering tips in the 4245-tribal corpus + ASME Y14.5-2018 §4.
- Authored 2026-05-20 by slot:hotel under U-WIKI-OPORDER-DATUMS — second canonical entry in the wiki+tribal high-ROI pivot, building on [[operation-ordering-hole-sequence]] (the canonical hole-making sequence).
- System injection: `tribal-by-domain-inject` (UserPromptSubmit hook) auto-surfaces this entry as a top-3 hit when chats reference "datum", "setup", "fixture", "WCS", "GD&T", "primary", "secondary", or "re-datum" — no further wiring required.

## Cross-references

- [[operation-ordering-hole-sequence]] — sibling canonical entry; hole-making sequence is the most common downstream consumer of correctly-cut datum frames
- [[reference_tribal_coverage_audit_2026_05_18]] — coverage audit that flagged operation-ordering as 4 % weakest
- [[reference_u_bridge_erp_sched_2026_05_20]] — same-session prior unit; close-out triggered this pivot
- [[feedback_do_optional_high_roi_work]] — standing rule honored: always do high-ROI in-scope
